#!/usr/bin/env node

/**
 * Initialize Knowledge Base State
 * Loads all searchable data into current state and creates historical baselines
 */

import { MongoClient } from 'mongodb';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import zlib from 'zlib';
import { promisify } from 'util';
import crypto from 'crypto';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env') });

const gzip = promisify(zlib.gzip);

class KnowledgeBaseInitializer {
  constructor() {
    this.client = new MongoClient(process.env.MONGODB_URI);
    this.db = null;
    this.stats = {
      currentState: 0,
      shortTermHistory: 0,
      longTermHistory: 0,
      snapshots: 0,
      errors: []
    };
  }

  async connect() {
    await this.client.connect();
    this.db = this.client.db(process.env.MONGODB_DB_NAME || 'PDSAdhesiveSearch');
    console.log('✅ Connected to MongoDB Atlas');
  }

  /**
   * Initialize all collections
   */
  async initializeCollections() {
    console.log('\n📦 Initializing Knowledge Base Collections...');
    
    const collections = await this.db.listCollections().toArray();
    const collectionNames = collections.map(c => c.name);

    // Current state collection
    if (!collectionNames.includes('KnowledgeBaseCurrentState')) {
      await this.db.createCollection('KnowledgeBaseCurrentState');
      console.log('  ✅ Created KnowledgeBaseCurrentState collection');
    }

    // Short-term history (time-series)
    if (!collectionNames.includes('KnowledgeBaseShortTermHistory')) {
      try {
        await this.db.createCollection('KnowledgeBaseShortTermHistory', {
          timeseries: {
            timeField: 'timestamp',
            metaField: 'metadata',
            granularity: 'minutes'
          }
        });
        console.log('  ✅ Created KnowledgeBaseShortTermHistory time-series collection');
      } catch (error) {
        if (!error.message.includes('already exists')) {
          throw error;
        }
      }
    }

    // Long-term compressed history
    if (!collectionNames.includes('KnowledgeBaseLongTermHistory')) {
      await this.db.createCollection('KnowledgeBaseLongTermHistory');
      console.log('  ✅ Created KnowledgeBaseLongTermHistory collection');
    }

    // Snapshots
    if (!collectionNames.includes('KnowledgeBaseSnapshots')) {
      await this.db.createCollection('KnowledgeBaseSnapshots');
      console.log('  ✅ Created KnowledgeBaseSnapshots collection');
    }

    // Search cache
    if (!collectionNames.includes('KnowledgeBaseSearchCache')) {
      await this.db.createCollection('KnowledgeBaseSearchCache');
      console.log('  ✅ Created KnowledgeBaseSearchCache collection');
    }

    // Maintenance reports
    if (!collectionNames.includes('MaintenanceReports')) {
      await this.db.createCollection('MaintenanceReports');
      console.log('  ✅ Created MaintenanceReports collection');
    }
  }

  /**
   * Create indexes for optimal performance
   */
  async createIndexes() {
    console.log('\n🔍 Creating Indexes...');
    
    const currentState = this.db.collection('KnowledgeBaseCurrentState');
    
    // Current state indexes
    await currentState.createIndex({ entityId: 1 }, { unique: true });
    await currentState.createIndex({ type: 1, status: 1 });
    await currentState.createIndex({ lastModified: -1 });
    await currentState.createIndex({ version: 1 });
    await currentState.createIndex({ 
      name: 'text', 
      description: 'text',
      'content': 'text', 
      'metadata.keywords': 'text',
      'metadata.tags': 'text'
    });
    
    // Long-term history indexes
    const longTerm = this.db.collection('KnowledgeBaseLongTermHistory');
    await longTerm.createIndex({ periodStart: 1, periodEnd: 1 });
    await longTerm.createIndex({ entityId: 1 });
    await longTerm.createIndex({ compressionDate: -1 });
    
    // Snapshots indexes
    const snapshots = this.db.collection('KnowledgeBaseSnapshots');
    await snapshots.createIndex({ snapshotDate: -1 });
    await snapshots.createIndex({ type: 1 });
    
    // Search cache indexes
    const searchCache = this.db.collection('KnowledgeBaseSearchCache');
    await searchCache.createIndex({ query: 1 }, { unique: true });
    await searchCache.createIndex({ createdAt: 1 }, { expireAfterSeconds: 3600 });
    
    console.log('  ✅ Indexes created successfully');
  }

  /**
   * Load current state from existing data
   */
  async loadCurrentState() {
    console.log('\n📊 Loading Current State...');
    
    const currentState = this.db.collection('KnowledgeBaseCurrentState');
    
    // Clear existing state
    await currentState.deleteMany({});
    
    // Load products as knowledge entities
    const products = this.db.collection('AESearchDatabase');
    const productDocs = await products.find({}).toArray();
    
    for (const product of productDocs) {
      const entity = {
        entityId: `PROD_${product.productId}`,
        type: 'product',
        subType: product.category,
        name: product.name,
        description: product.description,
        status: 'active',
        version: 1,
        content: {
          original: product,
          searchable: this.extractSearchableContent(product)
        },
        metadata: {
          category: product.category,
          subcategory: product.subcategory,
          manufacturer: product.manufacturer,
          keywords: this.extractKeywords(product),
          tags: this.extractTags(product),
          industries: product.applications?.industries || [],
          specifications: this.summarizeSpecifications(product.specifications)
        },
        relationships: {
          documents: [],
          related: [],
          supersedes: null,
          supersededBy: null
        },
        quality: {
          completeness: this.calculateCompleteness(product),
          accuracy: 1.0,
          relevance: 1.0
        },
        createdAt: new Date(),
        lastModified: new Date(),
        changeCount: 0
      };
      
      await currentState.insertOne(entity);
      this.stats.currentState++;
    }
    
    // Load documents as knowledge entities
    const documents = this.db.collection('AdhesivePDSDocumentMaster');
    const documentDocs = await documents.find({}).toArray();
    
    for (const doc of documentDocs) {
      const entity = {
        entityId: `DOC_${doc.documentId}`,
        type: 'document',
        subType: doc.type,
        name: doc.title,
        description: `${doc.type} document for ${doc.title}`,
        status: 'active',
        version: 1,
        content: {
          original: doc,
          searchable: `${doc.title} ${doc.content} ${doc.tags?.join(' ')}`
        },
        metadata: {
          documentType: doc.type,
          language: doc.language,
          format: doc.format,
          keywords: this.extractKeywords(doc),
          tags: doc.tags || [],
          relatedProducts: doc.relatedProducts || [doc.productId]
        },
        relationships: {
          products: doc.productId ? [`PROD_${doc.productId}`] : [],
          related: doc.relatedProducts?.map(p => `PROD_${p}`) || [],
          supersedes: null,
          supersededBy: null
        },
        quality: {
          completeness: 1.0,
          accuracy: 1.0,
          relevance: 1.0
        },
        createdAt: new Date(),
        lastModified: new Date(),
        changeCount: 0
      };
      
      await currentState.insertOne(entity);
      this.stats.currentState++;
      
      // Update product relationships
      if (doc.productId) {
        await currentState.updateOne(
          { entityId: `PROD_${doc.productId}` },
          { 
            $push: { 'relationships.documents': `DOC_${doc.documentId}` }
          }
        );
      }
    }
    
    // Create cross-references and relationships
    await this.createRelationships();
    
    console.log(`  ✅ Loaded ${this.stats.currentState} entities into current state`);
  }

  /**
   * Generate short-term history baseline
   */
  async generateShortTermHistory() {
    console.log('\n📈 Generating Short-Term History...');
    
    const shortTermHistory = this.db.collection('KnowledgeBaseShortTermHistory');
    const currentState = this.db.collection('KnowledgeBaseCurrentState');
    
    // Get all current entities
    const entities = await currentState.find({}).toArray();
    
    // Generate historical changes for the last 30 days
    const now = new Date();
    const daysToGenerate = 30;
    
    for (let day = daysToGenerate; day > 0; day--) {
      const date = new Date(now);
      date.setDate(date.getDate() - day);
      
      // Simulate 5-10 changes per day
      const changesPerDay = Math.floor(Math.random() * 6) + 5;
      
      for (let change = 0; change < changesPerDay; change++) {
        const entity = entities[Math.floor(Math.random() * entities.length)];
        
        const timestamp = new Date(date);
        timestamp.setHours(Math.floor(Math.random() * 24));
        timestamp.setMinutes(Math.floor(Math.random() * 60));
        
        const historyEntry = {
          timestamp: timestamp,
          metadata: {
            entityId: entity.entityId,
            entityType: entity.type,
            action: 'update',
            version: entity.version,
            source: 'baseline_generation'
          },
          changes: {
            type: 'modified',
            fields: ['metadata', 'quality'],
            modified: {
              quality: {
                old: { relevance: 0.9 },
                new: { relevance: 1.0 }
              }
            }
          },
          previousState: this.compactState(entity),
          newState: this.compactState({
            ...entity,
            version: entity.version + 1,
            lastModified: timestamp
          })
        };
        
        await shortTermHistory.insertOne(historyEntry);
        this.stats.shortTermHistory++;
      }
    }
    
    console.log(`  ✅ Generated ${this.stats.shortTermHistory} short-term history records`);
  }

  /**
   * Create compressed long-term history baseline
   */
  async createLongTermHistory() {
    console.log('\n🗜️  Creating Long-Term History Baseline...');
    
    const longTermHistory = this.db.collection('KnowledgeBaseLongTermHistory');
    const currentState = this.db.collection('KnowledgeBaseCurrentState');
    
    // Get all entities
    const entities = await currentState.find({}).toArray();
    
    // Generate compressed history for the past year (in monthly chunks)
    const now = new Date();
    
    for (let month = 12; month > 1; month--) {
      const periodStart = new Date(now);
      periodStart.setMonth(periodStart.getMonth() - month);
      periodStart.setDate(1);
      
      const periodEnd = new Date(periodStart);
      periodEnd.setMonth(periodEnd.getMonth() + 1);
      periodEnd.setDate(0);
      
      // Simulate historical data for each entity
      for (const entity of entities.slice(0, Math.min(10, entities.length))) {
        const historicalData = {
          entityId: entity.entityId,
          date: periodStart.toISOString().split('T')[0],
          changes: this.generateHistoricalChanges(entity, month),
          states: this.generateHistoricalStates(entity, month),
          changeCount: Math.floor(Math.random() * 20) + 10
        };
        
        // Compress the data
        const jsonString = JSON.stringify(historicalData);
        const compressed = await gzip(jsonString);
        
        const record = {
          entityId: entity.entityId,
          periodStart: periodStart,
          periodEnd: periodEnd,
          date: periodStart.toISOString().split('T')[0],
          compressedData: compressed,
          changeCount: historicalData.changeCount,
          compressionDate: new Date(),
          compressionRatio: compressed.length / jsonString.length,
          sizeBytes: compressed.length,
          originalSizeBytes: jsonString.length
        };
        
        await longTermHistory.insertOne(record);
        this.stats.longTermHistory++;
      }
    }
    
    console.log(`  ✅ Created ${this.stats.longTermHistory} long-term history records`);
  }

  /**
   * Create initial snapshot
   */
  async createInitialSnapshot() {
    console.log('\n📸 Creating Initial Snapshot...');
    
    const snapshots = this.db.collection('KnowledgeBaseSnapshots');
    const currentState = this.db.collection('KnowledgeBaseCurrentState');
    
    // Get all current state
    const allEntities = await currentState.find({}).toArray();
    
    // Compress the snapshot
    const snapshotData = {
      entities: allEntities,
      count: allEntities.length,
      timestamp: new Date(),
      metadata: {
        version: '1.0',
        type: 'baseline',
        description: 'Initial knowledge base snapshot'
      }
    };
    
    const jsonString = JSON.stringify(snapshotData);
    const compressed = await gzip(jsonString);
    
    const snapshot = {
      snapshotDate: new Date(),
      type: 'baseline',
      entityCount: allEntities.length,
      compressedData: compressed,
      sizeBytes: compressed.length,
      originalSizeBytes: jsonString.length,
      compressionRatio: compressed.length / jsonString.length,
      metadata: {
        version: '1.0',
        compression: 'gzip',
        retention: 365 * 2, // 2 years
        description: 'Initial baseline snapshot'
      }
    };
    
    await snapshots.insertOne(snapshot);
    this.stats.snapshots++;
    
    console.log(`  ✅ Created baseline snapshot (${allEntities.length} entities, ${(compressed.length / 1024).toFixed(2)} KB compressed)`);
  }

  /**
   * Extract searchable content from product
   */
  extractSearchableContent(product) {
    const parts = [
      product.name,
      product.description,
      product.category,
      product.subcategory
    ];
    
    if (product.applications) {
      parts.push(...(product.applications.industries || []));
      parts.push(...(product.applications.uses || []));
    }
    
    if (product.substrates) {
      Object.values(product.substrates).forEach(substrates => {
        if (Array.isArray(substrates)) {
          parts.push(...substrates);
        }
      });
    }
    
    if (product.compliance) {
      Object.values(product.compliance).forEach(items => {
        if (Array.isArray(items)) {
          parts.push(...items);
        }
      });
    }
    
    return parts.filter(Boolean).join(' ');
  }

  /**
   * Extract keywords from entity
   */
  extractKeywords(entity) {
    const text = JSON.stringify(entity).toLowerCase();
    const words = text.match(/\b[a-z]{4,}\b/g) || [];
    const uniqueWords = [...new Set(words)];
    
    // Filter common words
    const stopWords = ['this', 'that', 'with', 'from', 'have', 'been', 'were', 'what', 'when', 'where'];
    
    return uniqueWords
      .filter(word => !stopWords.includes(word))
      .slice(0, 30);
  }

  /**
   * Extract tags from product
   */
  extractTags(product) {
    const tags = [];
    
    if (product.category) tags.push(product.category.toLowerCase());
    if (product.subcategory) tags.push(product.subcategory.toLowerCase());
    
    if (product.specifications?.cure?.cure_type) {
      tags.push(product.specifications.cure.cure_type);
    }
    
    if (product.specifications?.thermal?.temperature_range?.max > 150) {
      tags.push('high-temperature');
    }
    
    if (product.specifications?.cure?.working_time?.value < 10) {
      tags.push('fast-cure');
    }
    
    if (product.compliance?.environmental?.includes('RoHS')) {
      tags.push('rohs-compliant');
    }
    
    return tags;
  }

  /**
   * Summarize specifications
   */
  summarizeSpecifications(specs) {
    if (!specs) return {};
    
    const summary = {};
    
    if (specs.thermal?.temperature_range) {
      summary.temperatureRange = `${specs.thermal.temperature_range.min}°C to ${specs.thermal.temperature_range.max}°C`;
    }
    
    if (specs.mechanical?.tensile_strength) {
      summary.tensileStrength = `${specs.mechanical.tensile_strength.value} ${specs.mechanical.tensile_strength.unit}`;
    }
    
    if (specs.cure?.working_time) {
      summary.workingTime = `${specs.cure.working_time.value} ${specs.cure.working_time.unit}`;
    }
    
    return summary;
  }

  /**
   * Calculate completeness score
   */
  calculateCompleteness(product) {
    const requiredFields = ['productId', 'name', 'category', 'specifications'];
    const optionalFields = ['description', 'applications', 'substrates', 'compliance'];
    
    let score = 0;
    let total = 0;
    
    requiredFields.forEach(field => {
      total += 2; // Required fields worth 2 points
      if (product[field]) score += 2;
    });
    
    optionalFields.forEach(field => {
      total += 1; // Optional fields worth 1 point
      if (product[field]) score += 1;
    });
    
    return score / total;
  }

  /**
   * Create relationships between entities
   */
  async createRelationships() {
    console.log('  🔗 Creating entity relationships...');
    
    const currentState = this.db.collection('KnowledgeBaseCurrentState');
    
    // Link products with similar categories
    const products = await currentState.find({ type: 'product' }).toArray();
    
    for (const product of products) {
      const related = await currentState.find({
        type: 'product',
        entityId: { $ne: product.entityId },
        'metadata.category': product.metadata.category
      }).limit(3).toArray();
      
      if (related.length > 0) {
        await currentState.updateOne(
          { entityId: product.entityId },
          { 
            $set: { 
              'relationships.related': related.map(r => r.entityId)
            }
          }
        );
      }
    }
  }

  /**
   * Compact state for history
   */
  compactState(state) {
    const essentialFields = [
      'entityId', 'type', 'name', 'version', 
      'lastModified', 'metadata', 'relationships'
    ];
    
    const compacted = {};
    for (const field of essentialFields) {
      if (state[field]) {
        compacted[field] = state[field];
      }
    }
    
    compacted.contentHash = this.hashContent(state);
    
    return compacted;
  }

  /**
   * Hash content
   */
  hashContent(content) {
    return crypto
      .createHash('sha256')
      .update(JSON.stringify(content))
      .digest('hex');
  }

  /**
   * Generate historical changes
   */
  generateHistoricalChanges(entity, monthsAgo) {
    const changes = [];
    const changeTypes = ['update', 'review', 'validation', 'enrichment'];
    
    for (let i = 0; i < 5; i++) {
      changes.push({
        type: changeTypes[Math.floor(Math.random() * changeTypes.length)],
        fields: ['metadata', 'quality', 'relationships'],
        timestamp: new Date(Date.now() - (monthsAgo * 30 + i) * 24 * 60 * 60 * 1000),
        description: `Historical change ${i + 1} from ${monthsAgo} months ago`
      });
    }
    
    return changes;
  }

  /**
   * Generate historical states
   */
  generateHistoricalStates(entity, monthsAgo) {
    const states = [];
    
    for (let i = 0; i < 3; i++) {
      states.push({
        version: entity.version - (monthsAgo * 3) + i,
        timestamp: new Date(Date.now() - (monthsAgo * 30 - i * 10) * 24 * 60 * 60 * 1000),
        quality: {
          completeness: 0.7 + (i * 0.1),
          accuracy: 0.8 + (i * 0.05),
          relevance: 0.9
        }
      });
    }
    
    return states;
  }

  /**
   * Generate summary report
   */
  generateReport() {
    console.log('\n📊 Initialization Summary');
    console.log('=' .repeat(50));
    console.log(`Current State Entities: ${this.stats.currentState}`);
    console.log(`Short-term History Records: ${this.stats.shortTermHistory}`);
    console.log(`Long-term History Records: ${this.stats.longTermHistory}`);
    console.log(`Snapshots Created: ${this.stats.snapshots}`);
    
    if (this.stats.errors.length > 0) {
      console.log('\n⚠️  Errors:');
      this.stats.errors.forEach(err => console.log(`  - ${err}`));
    }
    
    console.log('=' .repeat(50));
  }

  /**
   * Main execution
   */
  async run() {
    try {
      console.log('🚀 Initializing Knowledge Base State Management');
      console.log('=' .repeat(50));
      
      await this.connect();
      
      // Initialize collections
      await this.initializeCollections();
      
      // Create indexes
      await this.createIndexes();
      
      // Load current state
      await this.loadCurrentState();
      
      // Generate short-term history
      await this.generateShortTermHistory();
      
      // Create long-term compressed history
      await this.createLongTermHistory();
      
      // Create initial snapshot
      await this.createInitialSnapshot();
      
      // Generate report
      this.generateReport();
      
      console.log('\n✅ Knowledge Base initialization complete!');
      console.log('\n📝 Next Steps:');
      console.log('  1. Set up automated maintenance: ./scripts/setup-kb-cron.sh');
      console.log('  2. Test search: curl http://localhost:3000/api/kb/v1/search?q=adhesive');
      console.log('  3. Monitor logs: tail -f logs/kb_maintenance_*.log');
      
    } catch (error) {
      console.error('❌ Fatal error:', error);
      this.stats.errors.push(error.message);
      process.exit(1);
    } finally {
      await this.client.close();
    }
  }
}

// Run the initializer
const initializer = new KnowledgeBaseInitializer();
initializer.run();