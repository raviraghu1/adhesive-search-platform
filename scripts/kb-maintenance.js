#!/usr/bin/env node

/**
 * Knowledge Base Maintenance Script
 * Handles archival, compression, and optimization of knowledge base history
 */

import { MongoClient } from 'mongodb';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import stateManager from '../src/services/KnowledgeBaseStateManager.js';
import logger from '../src/utils/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env') });

class KnowledgeBaseMaintenance {
  constructor() {
    this.client = new MongoClient(process.env.MONGODB_URI);
    this.db = null;
    this.report = {
      startTime: new Date(),
      endTime: null,
      tasks: [],
      errors: [],
      metrics: {}
    };
  }

  async connect() {
    await this.client.connect();
    this.db = this.client.db(process.env.MONGODB_DB_NAME || 'PDSAdhesiveSearch');
    console.log('✅ Connected to MongoDB for KB Maintenance');
  }

  /**
   * Run hourly maintenance tasks
   */
  async runHourlyTasks() {
    console.log('\n⏰ Running hourly maintenance tasks...');
    
    try {
      // Update search cache statistics
      await this.updateCacheStatistics();
      
      // Check for anomalies
      await this.detectAnomalies();
      
      this.report.tasks.push({
        type: 'hourly',
        status: 'completed',
        timestamp: new Date()
      });
      
    } catch (error) {
      console.error('❌ Hourly tasks failed:', error);
      this.report.errors.push({
        task: 'hourly',
        error: error.message
      });
    }
  }

  /**
   * Run daily maintenance tasks
   */
  async runDailyTasks() {
    console.log('\n📅 Running daily maintenance tasks...');
    
    try {
      // Archive short-term history
      await stateManager.archiveShortTermHistory();
      
      // Create daily snapshot
      await stateManager.createSnapshot('daily');
      
      // Optimize indexes
      await this.optimizeIndexes();
      
      // Generate daily report
      await this.generateDailyReport();
      
      this.report.tasks.push({
        type: 'daily',
        status: 'completed',
        timestamp: new Date()
      });
      
    } catch (error) {
      console.error('❌ Daily tasks failed:', error);
      this.report.errors.push({
        task: 'daily',
        error: error.message
      });
    }
  }

  /**
   * Run weekly maintenance tasks
   */
  async runWeeklyTasks() {
    console.log('\n📆 Running weekly maintenance tasks...');
    
    try {
      // Create weekly snapshot
      await stateManager.createSnapshot('weekly');
      
      // Deep compression of old data
      await this.performDeepCompression();
      
      // Cleanup old data
      await stateManager.cleanup();
      
      // Rebuild search indexes
      await this.rebuildSearchIndexes();
      
      this.report.tasks.push({
        type: 'weekly',
        status: 'completed',
        timestamp: new Date()
      });
      
    } catch (error) {
      console.error('❌ Weekly tasks failed:', error);
      this.report.errors.push({
        task: 'weekly',
        error: error.message
      });
    }
  }

  /**
   * Update cache statistics
   */
  async updateCacheStatistics() {
    console.log('  📊 Updating cache statistics...');
    
    const searchCache = this.db.collection('KnowledgeBaseSearchCache');
    
    const stats = await searchCache.aggregate([
      {
        $group: {
          _id: null,
          totalQueries: { $sum: 1 },
          totalHits: { $sum: '$hitCount' },
          avgHitRate: { $avg: '$hitCount' }
        }
      }
    ]).toArray();
    
    if (stats.length > 0) {
      this.report.metrics.cacheStats = stats[0];
      console.log(`    Cache hit rate: ${stats[0].avgHitRate.toFixed(2)}`);
    }
  }

  /**
   * Detect anomalies in the knowledge base
   */
  async detectAnomalies() {
    console.log('  🔍 Detecting anomalies...');
    
    const currentState = this.db.collection('KnowledgeBaseCurrentState');
    
    // Check for orphaned entities
    const orphaned = await currentState.find({
      $or: [
        { relationships: { $exists: false } },
        { relationships: { $size: 0 } }
      ]
    }).toArray();
    
    if (orphaned.length > 0) {
      console.log(`    ⚠️  Found ${orphaned.length} orphaned entities`);
      this.report.metrics.orphanedEntities = orphaned.length;
    }
    
    // Check for stale entities (not updated in 90 days)
    const staleDate = new Date();
    staleDate.setDate(staleDate.getDate() - 90);
    
    const stale = await currentState.countDocuments({
      lastModified: { $lt: staleDate }
    });
    
    if (stale > 0) {
      console.log(`    ⚠️  Found ${stale} stale entities`);
      this.report.metrics.staleEntities = stale;
    }
  }

  /**
   * Optimize database indexes
   */
  async optimizeIndexes() {
    console.log('  🔧 Optimizing indexes...');
    
    const collections = [
      'KnowledgeBaseCurrentState',
      'KnowledgeBaseShortTermHistory',
      'KnowledgeBaseLongTermHistory'
    ];
    
    for (const collName of collections) {
      const collection = this.db.collection(collName);
      
      // Get index statistics
      const stats = await collection.aggregate([
        { $indexStats: {} }
      ]).toArray();
      
      // Identify unused indexes
      const unusedIndexes = stats.filter(idx => 
        idx.accesses.ops === 0 && 
        idx.name !== '_id_'
      );
      
      if (unusedIndexes.length > 0) {
        console.log(`    Found ${unusedIndexes.length} unused indexes in ${collName}`);
      }
    }
  }

  /**
   * Perform deep compression of historical data
   */
  async performDeepCompression() {
    console.log('  🗜️  Performing deep compression...');
    
    const longTerm = this.db.collection('KnowledgeBaseLongTermHistory');
    
    // Get uncompressed or lightly compressed records
    const toCompress = await longTerm.find({
      $or: [
        { compressionRatio: { $gt: 0.5 } },
        { compressionRatio: { $exists: false } }
      ]
    }).limit(100).toArray();
    
    let totalSaved = 0;
    
    for (const record of toCompress) {
      try {
        // Re-compress with higher compression
        const originalSize = record.compressedData.buffer.byteLength;
        
        // Apply additional compression techniques
        const optimized = await this.optimizeCompression(record.compressedData);
        
        const newSize = optimized.buffer.byteLength;
        const saved = originalSize - newSize;
        
        if (saved > 0) {
          await longTerm.updateOne(
            { _id: record._id },
            {
              $set: {
                compressedData: optimized,
                compressionRatio: newSize / originalSize,
                lastCompressed: new Date()
              }
            }
          );
          
          totalSaved += saved;
        }
      } catch (error) {
        console.error(`    Failed to compress record ${record._id}:`, error.message);
      }
    }
    
    if (totalSaved > 0) {
      console.log(`    Saved ${(totalSaved / 1024).toFixed(2)} KB through compression`);
      this.report.metrics.compressionSaved = totalSaved;
    }
  }

  /**
   * Optimize compression
   */
  async optimizeCompression(data) {
    // This is a placeholder for advanced compression
    // In production, you might use algorithms like Brotli or Zstandard
    return data;
  }

  /**
   * Rebuild search indexes
   */
  async rebuildSearchIndexes() {
    console.log('  🔄 Rebuilding search indexes...');
    
    const currentState = this.db.collection('KnowledgeBaseCurrentState');
    
    // Reindex for better search performance
    await currentState.reIndex();
    
    console.log('    Search indexes rebuilt');
  }

  /**
   * Generate daily report
   */
  async generateDailyReport() {
    console.log('  📈 Generating daily report...');
    
    const stats = await stateManager.getStatistics();
    
    this.report.metrics.dailyStats = {
      currentEntities: stats.current.count,
      shortTermRecords: stats.shortTerm.count,
      longTermRecords: stats.longTerm.count,
      cacheEntries: stats.cache.entries,
      timestamp: new Date()
    };
    
    // Store report
    const reports = this.db.collection('MaintenanceReports');
    await reports.insertOne({
      date: new Date(),
      type: 'daily',
      stats: this.report.metrics.dailyStats,
      tasks: this.report.tasks,
      errors: this.report.errors
    });
    
    console.log(`    Report saved with ${stats.current.count} entities`);
  }

  /**
   * Send maintenance report
   */
  async sendReport() {
    console.log('\n📧 Maintenance Report');
    console.log('=' .repeat(50));
    
    const duration = (this.report.endTime - this.report.startTime) / 1000;
    
    console.log(`Duration: ${duration.toFixed(2)}s`);
    console.log(`Tasks completed: ${this.report.tasks.length}`);
    console.log(`Errors: ${this.report.errors.length}`);
    
    if (this.report.metrics.dailyStats) {
      console.log('\nDaily Statistics:');
      console.log(`  Current Entities: ${this.report.metrics.dailyStats.currentEntities}`);
      console.log(`  Short-term Records: ${this.report.metrics.dailyStats.shortTermRecords}`);
      console.log(`  Long-term Records: ${this.report.metrics.dailyStats.longTermRecords}`);
    }
    
    if (this.report.errors.length > 0) {
      console.log('\nErrors:');
      this.report.errors.forEach(err => {
        console.log(`  - ${err.task}: ${err.error}`);
      });
    }
    
    console.log('=' .repeat(50));
  }

  /**
   * Main execution
   */
  async run(taskType = 'all') {
    try {
      console.log('🚀 Starting Knowledge Base Maintenance');
      console.log('=' .repeat(50));
      
      await this.connect();
      
      // Pass database connection to state manager
      stateManager.db = this.db;
      stateManager.client = this.client;
      
      // Ensure collections exist
      await stateManager.ensureCollections();
      
      // Run tasks based on schedule
      if (taskType === 'hourly' || taskType === 'all') {
        await this.runHourlyTasks();
      }
      
      if (taskType === 'daily' || taskType === 'all') {
        await this.runDailyTasks();
      }
      
      if (taskType === 'weekly' || taskType === 'all') {
        await this.runWeeklyTasks();
      }
      
      this.report.endTime = new Date();
      await this.sendReport();
      
      console.log('\n✅ Maintenance completed successfully!');
      
    } catch (error) {
      console.error('❌ Fatal error in maintenance:', error);
      this.report.errors.push({
        type: 'fatal',
        error: error.message
      });
      process.exit(1);
    } finally {
      await this.client.close();
    }
  }
}

// Parse command line arguments
const args = process.argv.slice(2);
const taskType = args[0] || 'daily';

// Run maintenance
const maintenance = new KnowledgeBaseMaintenance();
maintenance.run(taskType);

export default KnowledgeBaseMaintenance;