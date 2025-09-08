import { MongoClient } from 'mongodb';
import zlib from 'zlib';
import { promisify } from 'util';
import config from '../config/index.js';
import logger from '../utils/logger.js';
import dbConnection from '../database/connection.js';

const gzip = promisify(zlib.gzip);
const gunzip = promisify(zlib.gunzip);

/**
 * Knowledge Base State Manager
 * Manages current state, short-term history, and long-term compressed history
 */
class KnowledgeBaseStateManager {
  constructor() {
    this.initialized = false;
    this.compressionThreshold = 30; // days before compression
    this.shortTermRetention = 90; // days in short-term
    this.longTermRetention = 365 * 2; // 2 years in long-term
    this._db = null;
    this.client = null;
  }

  get db() {
    if (this._db) {
      return this._db;
    }
    return dbConnection.getDb();
  }

  set db(database) {
    this._db = database;
  }

  async initialize() {
    try {
      logger.info('Initializing Knowledge Base State Manager...');
      
      // Ensure collections exist
      await this.ensureCollections();
      
      // Create indexes for optimal performance
      await this.createIndexes();
      
      this.initialized = true;
      logger.info('Knowledge Base State Manager initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize KB State Manager:', error);
      throw error;
    }
  }

  /**
   * Ensure all required collections exist
   */
  async ensureCollections() {
    const db = this.db;
    if (!db) {
      throw new Error('Database connection not initialized');
    }
    const collections = await db.listCollections().toArray();
    const collectionNames = collections.map(c => c.name);

    // Current state collection
    if (!collectionNames.includes('KnowledgeBaseCurrentState')) {
      await db.createCollection('KnowledgeBaseCurrentState');
      logger.info('Created KnowledgeBaseCurrentState collection');
    }

    // Short-term history (recent changes)
    if (!collectionNames.includes('KnowledgeBaseShortTermHistory')) {
      await db.createCollection('KnowledgeBaseShortTermHistory', {
        timeseries: {
          timeField: 'timestamp',
          metaField: 'metadata',
          granularity: 'minutes'
        }
      });
      logger.info('Created KnowledgeBaseShortTermHistory time-series collection');
    }

    // Long-term compressed history
    if (!collectionNames.includes('KnowledgeBaseLongTermHistory')) {
      await db.createCollection('KnowledgeBaseLongTermHistory');
      logger.info('Created KnowledgeBaseLongTermHistory collection');
    }

    // State snapshots
    if (!collectionNames.includes('KnowledgeBaseSnapshots')) {
      await db.createCollection('KnowledgeBaseSnapshots');
      logger.info('Created KnowledgeBaseSnapshots collection');
    }

    // Search optimization cache
    if (!collectionNames.includes('KnowledgeBaseSearchCache')) {
      await db.createCollection('KnowledgeBaseSearchCache');
      logger.info('Created KnowledgeBaseSearchCache collection');
    }
  }

  /**
   * Create optimized indexes
   */
  async createIndexes() {
    const currentState = dbConnection.getCollection('KnowledgeBaseCurrentState');
    const shortTerm = dbConnection.getCollection('KnowledgeBaseShortTermHistory');
    const longTerm = dbConnection.getCollection('KnowledgeBaseLongTermHistory');
    const snapshots = dbConnection.getCollection('KnowledgeBaseSnapshots');
    const searchCache = dbConnection.getCollection('KnowledgeBaseSearchCache');

    // Current state indexes
    await currentState.createIndex({ entityId: 1 }, { unique: true });
    await currentState.createIndex({ type: 1, status: 1 });
    await currentState.createIndex({ lastModified: -1 });
    await currentState.createIndex({ 
      'content': 'text', 
      'metadata.keywords': 'text' 
    });

    // Long-term history indexes
    await longTerm.createIndex({ periodStart: 1, periodEnd: 1 });
    await longTerm.createIndex({ entityIds: 1 });
    await longTerm.createIndex({ compressionDate: -1 });

    // Snapshots indexes
    await snapshots.createIndex({ snapshotDate: -1 });
    await snapshots.createIndex({ type: 1 });

    // Search cache indexes
    await searchCache.createIndex({ query: 1 }, { unique: true });
    await searchCache.createIndex({ createdAt: 1 }, { expireAfterSeconds: 3600 }); // 1 hour cache

    logger.info('Created indexes for KB State Manager');
  }

  /**
   * Update current state with change tracking
   */
  async updateCurrentState(entity) {
    const session = await MongoClient.startSession();
    
    try {
      await session.withTransaction(async () => {
        const currentState = dbConnection.getCollection('KnowledgeBaseCurrentState');
        const shortTermHistory = dbConnection.getCollection('KnowledgeBaseShortTermHistory');
        
        // Get previous state
        const previousState = await currentState.findOne({ entityId: entity.entityId });
        
        // Calculate changes
        const changes = this.calculateChanges(previousState, entity);
        
        // Update current state
        const updatedEntity = {
          ...entity,
          lastModified: new Date(),
          version: (previousState?.version || 0) + 1,
          changeCount: (previousState?.changeCount || 0) + 1
        };
        
        await currentState.replaceOne(
          { entityId: entity.entityId },
          updatedEntity,
          { upsert: true, session }
        );
        
        // Record in short-term history
        await shortTermHistory.insertOne({
          timestamp: new Date(),
          metadata: {
            entityId: entity.entityId,
            entityType: entity.type,
            action: previousState ? 'update' : 'create',
            version: updatedEntity.version
          },
          changes: changes,
          previousState: previousState ? this.compactState(previousState) : null,
          newState: this.compactState(updatedEntity)
        }, { session });
        
        // Invalidate search cache for this entity
        await this.invalidateSearchCache(entity.entityId);
        
        logger.info(`Updated current state for entity ${entity.entityId} (v${updatedEntity.version})`);
      });
    } finally {
      await session.endSession();
    }
  }

  /**
   * Calculate changes between states
   */
  calculateChanges(oldState, newState) {
    if (!oldState) {
      return { type: 'created', fields: Object.keys(newState) };
    }

    const changes = {
      type: 'modified',
      fields: [],
      added: {},
      removed: {},
      modified: {}
    };

    // Check for modified fields
    for (const key in newState) {
      if (key === 'lastModified' || key === 'version') continue;
      
      if (!(key in oldState)) {
        changes.fields.push(key);
        changes.added[key] = newState[key];
      } else if (JSON.stringify(oldState[key]) !== JSON.stringify(newState[key])) {
        changes.fields.push(key);
        changes.modified[key] = {
          old: oldState[key],
          new: newState[key]
        };
      }
    }

    // Check for removed fields
    for (const key in oldState) {
      if (!(key in newState)) {
        changes.fields.push(key);
        changes.removed[key] = oldState[key];
      }
    }

    return changes;
  }

  /**
   * Compact state for storage
   */
  compactState(state) {
    // Remove large fields that can be reconstructed
    const compact = { ...state };
    
    // Keep only essential fields for history
    const essentialFields = [
      'entityId', 'type', 'name', 'version', 
      'lastModified', 'metadata', 'relationships'
    ];
    
    const compacted = {};
    for (const field of essentialFields) {
      if (compact[field]) {
        compacted[field] = compact[field];
      }
    }
    
    // Add a hash of the full content for verification
    compacted.contentHash = this.hashContent(state);
    
    return compacted;
  }

  /**
   * Hash content for verification
   */
  hashContent(content) {
    const crypto = require('crypto');
    return crypto
      .createHash('sha256')
      .update(JSON.stringify(content))
      .digest('hex');
  }

  /**
   * Archive short-term history to long-term
   */
  async archiveShortTermHistory() {
    logger.info('Starting short-term history archival...');
    
    const shortTerm = dbConnection.getCollection('KnowledgeBaseShortTermHistory');
    const longTerm = dbConnection.getCollection('KnowledgeBaseLongTermHistory');
    
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - this.compressionThreshold);
    
    // Aggregate data by day for compression
    const pipeline = [
      {
        $match: {
          timestamp: { $lt: cutoffDate }
        }
      },
      {
        $group: {
          _id: {
            date: { $dateToString: { format: '%Y-%m-%d', date: '$timestamp' } },
            entityId: '$metadata.entityId'
          },
          changes: { $push: '$changes' },
          states: { $push: '$newState' },
          count: { $sum: 1 },
          firstTimestamp: { $min: '$timestamp' },
          lastTimestamp: { $max: '$timestamp' }
        }
      }
    ];
    
    const toArchive = await shortTerm.aggregate(pipeline).toArray();
    
    for (const group of toArchive) {
      try {
        // Compress the data
        const compressed = await this.compressHistoryData({
          entityId: group._id.entityId,
          date: group._id.date,
          changes: group.changes,
          states: group.states,
          changeCount: group.count
        });
        
        // Store in long-term
        await longTerm.insertOne({
          entityId: group._id.entityId,
          periodStart: group.firstTimestamp,
          periodEnd: group.lastTimestamp,
          date: group._id.date,
          compressedData: compressed,
          changeCount: group.count,
          compressionDate: new Date(),
          compressionRatio: compressed.length / JSON.stringify(group).length
        });
        
        logger.info(`Archived ${group.count} changes for entity ${group._id.entityId} on ${group._id.date}`);
      } catch (error) {
        logger.error(`Failed to archive history for ${group._id.entityId}:`, error);
      }
    }
    
    // Delete archived records from short-term
    await shortTerm.deleteMany({ timestamp: { $lt: cutoffDate } });
    
    logger.info('Short-term history archival completed');
  }

  /**
   * Compress history data
   */
  async compressHistoryData(data) {
    const jsonString = JSON.stringify(data);
    const compressed = await gzip(jsonString);
    return compressed;
  }

  /**
   * Decompress history data
   */
  async decompressHistoryData(compressed) {
    const decompressed = await gunzip(compressed);
    return JSON.parse(decompressed.toString());
  }

  /**
   * Create a snapshot of current state
   */
  async createSnapshot(type = 'scheduled') {
    logger.info(`Creating ${type} snapshot of knowledge base...`);
    
    const currentState = dbConnection.getCollection('KnowledgeBaseCurrentState');
    const snapshots = dbConnection.getCollection('KnowledgeBaseSnapshots');
    
    // Get all current state
    const allEntities = await currentState.find({}).toArray();
    
    // Compress the snapshot
    const compressed = await this.compressHistoryData({
      entities: allEntities,
      count: allEntities.length,
      timestamp: new Date()
    });
    
    // Store snapshot
    const snapshot = {
      snapshotDate: new Date(),
      type: type,
      entityCount: allEntities.length,
      compressedData: compressed,
      sizeBytes: compressed.length,
      metadata: {
        version: '1.0',
        compression: 'gzip',
        retention: this.longTermRetention
      }
    };
    
    await snapshots.insertOne(snapshot);
    
    logger.info(`Created snapshot with ${allEntities.length} entities (${compressed.length} bytes)`);
    
    return snapshot;
  }

  /**
   * Optimized search across all states
   */
  async search(query, options = {}) {
    const {
      includeHistory = false,
      includeLongTerm = false,
      timeRange = null,
      limit = 50
    } = options;
    
    // Check cache first
    const cached = await this.getCachedSearch(query, options);
    if (cached) {
      logger.info('Returning cached search results');
      return cached;
    }
    
    const results = {
      current: [],
      shortTerm: [],
      longTerm: [],
      totalCount: 0,
      searchTime: Date.now()
    };
    
    // Search current state
    const currentState = dbConnection.getCollection('KnowledgeBaseCurrentState');
    results.current = await currentState
      .find({ $text: { $search: query } })
      .limit(limit)
      .toArray();
    
    results.totalCount = results.current.length;
    
    // Search short-term history if requested
    if (includeHistory) {
      const shortTerm = dbConnection.getCollection('KnowledgeBaseShortTermHistory');
      
      let historyQuery = {};
      if (timeRange) {
        historyQuery.timestamp = {
          $gte: timeRange.start,
          $lte: timeRange.end
        };
      }
      
      const historyResults = await shortTerm
        .find(historyQuery)
        .limit(limit)
        .toArray();
      
      results.shortTerm = historyResults;
      results.totalCount += historyResults.length;
    }
    
    // Search long-term if requested
    if (includeLongTerm) {
      results.longTerm = await this.searchLongTermHistory(query, timeRange, limit);
      results.totalCount += results.longTerm.length;
    }
    
    results.searchTime = Date.now() - results.searchTime;
    
    // Cache the results
    await this.cacheSearchResults(query, options, results);
    
    return results;
  }

  /**
   * Search long-term compressed history
   */
  async searchLongTermHistory(query, timeRange, limit) {
    const longTerm = dbConnection.getCollection('KnowledgeBaseLongTermHistory');
    
    let searchQuery = {};
    if (timeRange) {
      searchQuery.periodStart = { $gte: timeRange.start };
      searchQuery.periodEnd = { $lte: timeRange.end };
    }
    
    const compressed = await longTerm
      .find(searchQuery)
      .limit(limit)
      .toArray();
    
    const results = [];
    
    for (const record of compressed) {
      try {
        const decompressed = await this.decompressHistoryData(record.compressedData);
        
        // Search within decompressed data
        if (this.matchesQuery(decompressed, query)) {
          results.push({
            entityId: record.entityId,
            period: { start: record.periodStart, end: record.periodEnd },
            matches: this.extractMatches(decompressed, query)
          });
        }
      } catch (error) {
        logger.error(`Failed to search compressed record:`, error);
      }
    }
    
    return results;
  }

  /**
   * Check if data matches query
   */
  matchesQuery(data, query) {
    const searchString = JSON.stringify(data).toLowerCase();
    return searchString.includes(query.toLowerCase());
  }

  /**
   * Extract matching portions
   */
  extractMatches(data, query) {
    const matches = [];
    const searchString = JSON.stringify(data);
    const queryLower = query.toLowerCase();
    
    // Find context around matches
    let index = searchString.toLowerCase().indexOf(queryLower);
    while (index !== -1) {
      const start = Math.max(0, index - 50);
      const end = Math.min(searchString.length, index + query.length + 50);
      matches.push(searchString.substring(start, end));
      index = searchString.toLowerCase().indexOf(queryLower, index + 1);
    }
    
    return matches;
  }

  /**
   * Cache search results
   */
  async cacheSearchResults(query, options, results) {
    const searchCache = dbConnection.getCollection('KnowledgeBaseSearchCache');
    
    const cacheKey = this.generateCacheKey(query, options);
    
    await searchCache.replaceOne(
      { query: cacheKey },
      {
        query: cacheKey,
        results: results,
        createdAt: new Date(),
        hitCount: 0
      },
      { upsert: true }
    );
  }

  /**
   * Get cached search results
   */
  async getCachedSearch(query, options) {
    const searchCache = dbConnection.getCollection('KnowledgeBaseSearchCache');
    
    const cacheKey = this.generateCacheKey(query, options);
    
    const cached = await searchCache.findOneAndUpdate(
      { query: cacheKey },
      { $inc: { hitCount: 1 } },
      { returnDocument: 'after' }
    );
    
    return cached?.results;
  }

  /**
   * Generate cache key
   */
  generateCacheKey(query, options) {
    return `${query}:${JSON.stringify(options)}`;
  }

  /**
   * Invalidate search cache
   */
  async invalidateSearchCache(entityId = null) {
    const searchCache = dbConnection.getCollection('KnowledgeBaseSearchCache');
    
    if (entityId) {
      // Invalidate specific entity caches
      await searchCache.deleteMany({
        'results.current.entityId': entityId
      });
    } else {
      // Clear all cache
      await searchCache.deleteMany({});
    }
  }

  /**
   * Get state statistics
   */
  async getStatistics() {
    const stats = {
      current: {},
      shortTerm: {},
      longTerm: {},
      snapshots: {},
      cache: {}
    };
    
    // Current state stats
    const currentState = dbConnection.getCollection('KnowledgeBaseCurrentState');
    stats.current = {
      count: await currentState.countDocuments(),
      lastUpdate: await currentState.findOne({}, { sort: { lastModified: -1 } })
    };
    
    // Short-term stats
    const shortTerm = dbConnection.getCollection('KnowledgeBaseShortTermHistory');
    stats.shortTerm = {
      count: await shortTerm.countDocuments(),
      oldestRecord: await shortTerm.findOne({}, { sort: { timestamp: 1 } }),
      newestRecord: await shortTerm.findOne({}, { sort: { timestamp: -1 } })
    };
    
    // Long-term stats
    const longTerm = dbConnection.getCollection('KnowledgeBaseLongTermHistory');
    stats.longTerm = {
      count: await longTerm.countDocuments(),
      totalCompressedSize: await longTerm.aggregate([
        { $group: { _id: null, total: { $sum: '$compressedData.length' } } }
      ]).toArray()
    };
    
    // Snapshot stats
    const snapshots = dbConnection.getCollection('KnowledgeBaseSnapshots');
    stats.snapshots = {
      count: await snapshots.countDocuments(),
      latestSnapshot: await snapshots.findOne({}, { sort: { snapshotDate: -1 } })
    };
    
    // Cache stats
    const searchCache = dbConnection.getCollection('KnowledgeBaseSearchCache');
    stats.cache = {
      entries: await searchCache.countDocuments(),
      totalHits: await searchCache.aggregate([
        { $group: { _id: null, total: { $sum: '$hitCount' } } }
      ]).toArray()
    };
    
    return stats;
  }

  /**
   * Cleanup old data
   */
  async cleanup() {
    logger.info('Starting knowledge base cleanup...');
    
    // Archive short-term to long-term
    await this.archiveShortTermHistory();
    
    // Remove old long-term data
    const longTerm = dbConnection.getCollection('KnowledgeBaseLongTermHistory');
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - this.longTermRetention);
    
    const deleted = await longTerm.deleteMany({
      periodEnd: { $lt: cutoffDate }
    });
    
    logger.info(`Deleted ${deleted.deletedCount} old long-term records`);
    
    // Clean old snapshots
    const snapshots = dbConnection.getCollection('KnowledgeBaseSnapshots');
    const snapshotCutoff = new Date();
    snapshotCutoff.setMonth(snapshotCutoff.getMonth() - 6); // Keep 6 months of snapshots
    
    await snapshots.deleteMany({
      snapshotDate: { $lt: snapshotCutoff },
      type: 'scheduled' // Keep manual snapshots longer
    });
    
    logger.info('Knowledge base cleanup completed');
  }
}

// Create singleton instance
const stateManager = new KnowledgeBaseStateManager();

export default stateManager;