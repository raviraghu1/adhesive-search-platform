#!/usr/bin/env node

/**
 * Auto-Refresh Script for Knowledge Base
 * Checks for changes every 20 minutes and updates the knowledge base
 */

import { MongoClient } from 'mongodb';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';
import logger from '../src/utils/logger.js';
import stateManager from '../src/services/KnowledgeBaseStateManager.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env') });

class AutoRefreshService {
  constructor() {
    this.client = new MongoClient(process.env.MONGODB_URI);
    this.db = null;
    this.lastCheckTime = new Date();
    this.checkInterval = 20 * 60 * 1000; // 20 minutes in milliseconds
    this.running = false;
    this.stats = {
      checksPerformed: 0,
      changesDetected: 0,
      entitiesUpdated: 0,
      errorsEncountered: 0,
      lastCheck: null,
      lastChange: null
    };
  }

  async connect() {
    await this.client.connect();
    this.db = this.client.db(process.env.MONGODB_DB_NAME || 'PDSAdhesiveSearch');
    
    // Initialize state manager
    stateManager.db = this.db;
    stateManager.client = this.client;
    await stateManager.ensureCollections();
    
    logger.info('Auto-refresh service connected to MongoDB');
  }

  /**
   * Calculate hash for change detection
   */
  calculateHash(data) {
    const normalized = JSON.stringify(data, Object.keys(data).sort());
    return crypto.createHash('md5').update(normalized).digest('hex');
  }

  /**
   * Check for changes in products collection
   */
  async checkProductChanges() {
    const products = this.db.collection('AESearchDatabase');
    const changedProducts = [];
    
    try {
      // Get all products modified since last check
      const recentProducts = await products.find({
        lastModified: { $gte: this.lastCheckTime }
      }).toArray();
      
      for (const product of recentProducts) {
        const currentHash = this.calculateHash(product);
        
        // Check if hash differs from stored version
        const kbEntity = await this.db.collection('KnowledgeBaseCurrentState')
          .findOne({ entityId: `PROD_${product.productId}` });
        
        if (!kbEntity || kbEntity.contentHash !== currentHash) {
          changedProducts.push(product);
          
          // Update knowledge base
          await this.updateKnowledgeBase(product, 'product');
        }
      }
      
      if (changedProducts.length > 0) {
        logger.info(`Detected ${changedProducts.length} product changes`);
        this.stats.changesDetected += changedProducts.length;
        this.stats.lastChange = new Date();
      }
      
    } catch (error) {
      logger.error('Error checking product changes:', error);
      this.stats.errorsEncountered++;
    }
    
    return changedProducts;
  }

  /**
   * Check for changes in documents collection
   */
  async checkDocumentChanges() {
    const documents = this.db.collection('AdhesivePDSDocumentMaster');
    const changedDocuments = [];
    
    try {
      // Get all documents modified since last check
      const recentDocs = await documents.find({
        lastModified: { $gte: this.lastCheckTime }
      }).toArray();
      
      for (const doc of recentDocs) {
        const currentHash = this.calculateHash(doc);
        
        // Check if hash differs from stored version
        const kbEntity = await this.db.collection('KnowledgeBaseCurrentState')
          .findOne({ entityId: `DOC_${doc.documentId}` });
        
        if (!kbEntity || kbEntity.contentHash !== currentHash) {
          changedDocuments.push(doc);
          
          // Update knowledge base
          await this.updateKnowledgeBase(doc, 'document');
        }
      }
      
      if (changedDocuments.length > 0) {
        logger.info(`Detected ${changedDocuments.length} document changes`);
        this.stats.changesDetected += changedDocuments.length;
        this.stats.lastChange = new Date();
      }
      
    } catch (error) {
      logger.error('Error checking document changes:', error);
      this.stats.errorsEncountered++;
    }
    
    return changedDocuments;
  }

  /**
   * Update knowledge base with changes
   */
  async updateKnowledgeBase(entity, type) {
    try {
      const entityId = type === 'product' ? 
        `PROD_${entity.productId}` : 
        `DOC_${entity.documentId}`;
      
      const kbEntity = {
        entityId,
        type,
        name: entity.name || entity.title,
        description: entity.description || `${type} entity`,
        content: {
          original: entity,
          searchable: this.createSearchableContent(entity)
        },
        metadata: this.extractMetadata(entity, type),
        lastModified: new Date(),
        contentHash: this.calculateHash(entity)
      };
      
      await stateManager.updateCurrentState(kbEntity);
      this.stats.entitiesUpdated++;
      
      logger.info(`Updated KB entity: ${entityId}`);
      
    } catch (error) {
      logger.error(`Error updating KB entity:`, error);
      this.stats.errorsEncountered++;
    }
  }

  /**
   * Create searchable content from entity
   */
  createSearchableContent(entity) {
    const fields = [];
    
    const extractText = (obj, prefix = '') => {
      for (const key in obj) {
        if (typeof obj[key] === 'string') {
          fields.push(obj[key]);
        } else if (Array.isArray(obj[key])) {
          fields.push(...obj[key].filter(item => typeof item === 'string'));
        } else if (typeof obj[key] === 'object' && obj[key] !== null) {
          extractText(obj[key], `${prefix}${key}.`);
        }
      }
    };
    
    extractText(entity);
    return fields.join(' ');
  }

  /**
   * Extract metadata from entity
   */
  extractMetadata(entity, type) {
    if (type === 'product') {
      return {
        category: entity.category,
        subcategory: entity.subcategory,
        manufacturer: entity.manufacturer,
        tags: entity.tags || [],
        industries: entity.applications?.industries || []
      };
    } else {
      return {
        documentType: entity.type,
        language: entity.language,
        format: entity.format,
        tags: entity.tags || [],
        relatedProducts: entity.relatedProducts || []
      };
    }
  }

  /**
   * Perform refresh check
   */
  async performRefresh() {
    console.log(`\n🔄 Performing refresh check at ${new Date().toISOString()}`);
    this.stats.checksPerformed++;
    this.stats.lastCheck = new Date();
    
    const startTime = Date.now();
    
    // Check for changes
    const productChanges = await this.checkProductChanges();
    const documentChanges = await this.checkDocumentChanges();
    
    const totalChanges = productChanges.length + documentChanges.length;
    
    if (totalChanges > 0) {
      console.log(`  ✅ Found ${totalChanges} changes`);
      console.log(`     • Products: ${productChanges.length}`);
      console.log(`     • Documents: ${documentChanges.length}`);
      
      // Trigger maintenance if significant changes
      if (totalChanges > 10) {
        console.log('  🔧 Triggering maintenance due to significant changes');
        await this.triggerMaintenance();
      }
    } else {
      console.log('  ✅ No changes detected');
    }
    
    const duration = Date.now() - startTime;
    console.log(`  ⏱️  Check completed in ${duration}ms`);
    
    // Update last check time
    this.lastCheckTime = new Date();
    
    // Save refresh stats
    await this.saveStats();
  }

  /**
   * Trigger maintenance tasks
   */
  async triggerMaintenance() {
    try {
      // Archive short-term history if needed
      const shortTermCount = await this.db.collection('KnowledgeBaseShortTermHistory')
        .countDocuments();
      
      if (shortTermCount > 1000) {
        await stateManager.archiveShortTermHistory();
        console.log('    • Archived short-term history');
      }
      
      // Create snapshot after significant changes
      await stateManager.createSnapshot('auto-refresh');
      console.log('    • Created snapshot');
      
    } catch (error) {
      logger.error('Error triggering maintenance:', error);
    }
  }

  /**
   * Save statistics to database
   */
  async saveStats() {
    try {
      const statsCollection = this.db.collection('RefreshStats');
      await statsCollection.replaceOne(
        { _id: 'auto-refresh' },
        { _id: 'auto-refresh', ...this.stats },
        { upsert: true }
      );
    } catch (error) {
      logger.error('Error saving stats:', error);
    }
  }

  /**
   * Start the auto-refresh service
   */
  async start() {
    console.log('🚀 Starting Auto-Refresh Service');
    console.log('=' .repeat(50));
    console.log(`📅 Check interval: Every 20 minutes`);
    console.log(`🕐 Current time: ${new Date().toISOString()}`);
    console.log('=' .repeat(50));
    
    await this.connect();
    this.running = true;
    
    // Perform initial check
    await this.performRefresh();
    
    // Set up interval
    this.intervalId = setInterval(async () => {
      if (this.running) {
        await this.performRefresh();
      }
    }, this.checkInterval);
    
    console.log('\n✅ Auto-refresh service is running');
    console.log('Press Ctrl+C to stop\n');
    
    // Handle graceful shutdown
    process.on('SIGINT', async () => {
      await this.stop();
    });
    
    process.on('SIGTERM', async () => {
      await this.stop();
    });
  }

  /**
   * Stop the service
   */
  async stop() {
    console.log('\n🛑 Stopping Auto-Refresh Service...');
    this.running = false;
    
    if (this.intervalId) {
      clearInterval(this.intervalId);
    }
    
    // Save final stats
    await this.saveStats();
    
    // Display summary
    console.log('\n📊 Service Summary:');
    console.log(`  • Checks performed: ${this.stats.checksPerformed}`);
    console.log(`  • Changes detected: ${this.stats.changesDetected}`);
    console.log(`  • Entities updated: ${this.stats.entitiesUpdated}`);
    console.log(`  • Errors encountered: ${this.stats.errorsEncountered}`);
    
    await this.client.close();
    console.log('\n✅ Service stopped gracefully');
    process.exit(0);
  }

  /**
   * Run once (for cron jobs)
   */
  async runOnce() {
    console.log('🔄 Running single refresh check');
    await this.connect();
    await this.performRefresh();
    await this.client.close();
    console.log('✅ Refresh check complete');
  }
}

// Parse command line arguments
const args = process.argv.slice(2);
const mode = args[0] || 'daemon';

// Create service instance
const service = new AutoRefreshService();

// Run based on mode
if (mode === 'once') {
  // Run once and exit (for cron)
  service.runOnce().catch(error => {
    console.error('❌ Error:', error);
    process.exit(1);
  });
} else {
  // Run as daemon with interval
  service.start().catch(error => {
    console.error('❌ Error starting service:', error);
    process.exit(1);
  });
}

export default AutoRefreshService;