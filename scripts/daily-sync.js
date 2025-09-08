#!/usr/bin/env node

import { MongoClient } from 'mongodb';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import nodemailer from 'nodemailer';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env') });

class DailySync {
  constructor() {
    this.client = new MongoClient(process.env.MONGODB_URI);
    this.db = null;
    this.report = {
      startTime: new Date(),
      endTime: null,
      summary: {},
      changes: [],
      errors: []
    };
  }

  async connect() {
    await this.client.connect();
    this.db = this.client.db(process.env.MONGODB_DB_NAME || 'PDSAdhesiveSearch');
    console.log('✅ Connected to MongoDB Atlas for daily sync');
  }

  /**
   * Check for external data sources
   */
  async checkExternalSources() {
    console.log('\n🔍 Checking external data sources...');
    
    const sources = [
      {
        name: 'Product Updates',
        path: path.join(__dirname, '../data/updates'),
        type: 'products'
      },
      {
        name: 'Document Updates',
        path: path.join(__dirname, '../data/documents'),
        type: 'documents'
      }
    ];
    
    const updates = [];
    
    for (const source of sources) {
      try {
        const exists = await fs.stat(source.path).catch(() => null);
        if (exists && exists.isDirectory()) {
          const files = await fs.readdir(source.path);
          const jsonFiles = files.filter(f => f.endsWith('.json'));
          
          for (const file of jsonFiles) {
            const filePath = path.join(source.path, file);
            const stats = await fs.stat(filePath);
            
            // Check if file was modified in last 24 hours
            const hoursSinceModified = (Date.now() - stats.mtime) / (1000 * 60 * 60);
            
            if (hoursSinceModified < 24) {
              updates.push({
                source: source.name,
                file: file,
                path: filePath,
                type: source.type,
                modified: stats.mtime
              });
              
              console.log(`  📁 Found update: ${file} (${source.name})`);
            }
          }
        }
      } catch (error) {
        console.log(`  ⚠️  Could not check ${source.name}: ${error.message}`);
      }
    }
    
    return updates;
  }

  /**
   * Process product updates
   */
  async processProductUpdates(updates) {
    const productsCollection = this.db.collection('AESearchDatabase');
    const changesCollection = this.db.collection('DataChangeLog');
    
    let processed = 0;
    let errors = 0;
    
    for (const update of updates.filter(u => u.type === 'products')) {
      try {
        const data = await fs.readFile(update.path, 'utf8');
        const products = JSON.parse(data);
        
        for (const product of Array.isArray(products) ? products : [products]) {
          const existing = await productsCollection.findOne({ productId: product.productId });
          
          if (existing) {
            // Update existing product
            product.lastModified = new Date();
            product.version = (existing.version || 1) + 1;
            
            await productsCollection.replaceOne(
              { productId: product.productId },
              product
            );
            
            await changesCollection.insertOne({
              entityId: product.productId,
              entityType: 'product',
              action: 'sync_update',
              timestamp: new Date(),
              source: update.file,
              version: product.version
            });
            
            this.report.changes.push({
              type: 'product_update',
              id: product.productId,
              name: product.name,
              version: product.version
            });
            
            processed++;
          } else {
            // Insert new product
            product.createdAt = new Date();
            product.lastModified = new Date();
            product.version = 1;
            
            await productsCollection.insertOne(product);
            
            this.report.changes.push({
              type: 'product_new',
              id: product.productId,
              name: product.name
            });
            
            processed++;
          }
        }
        
        // Archive processed file
        const archivePath = path.join(__dirname, '../data/archive', 
          `${path.basename(update.file, '.json')}_${Date.now()}.json`);
        await fs.mkdir(path.dirname(archivePath), { recursive: true });
        await fs.rename(update.path, archivePath);
        
      } catch (error) {
        console.error(`  ❌ Error processing ${update.file}:`, error.message);
        this.report.errors.push({
          file: update.file,
          error: error.message
        });
        errors++;
      }
    }
    
    return { processed, errors };
  }

  /**
   * Clean up old data
   */
  async cleanupOldData() {
    console.log('\n🧹 Cleaning up old data...');
    
    const changesCollection = this.db.collection('DataChangeLog');
    const metricsCollection = this.db.collection('KnowledgeBaseMetrics');
    
    // Keep only last 30 days of change logs
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    
    const deletedChanges = await changesCollection.deleteMany({
      timestamp: { $lt: thirtyDaysAgo }
    });
    
    console.log(`  🗑️  Removed ${deletedChanges.deletedCount} old change logs`);
    
    // Aggregate old metrics (keep daily summaries)
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    
    // This would aggregate hourly metrics into daily summaries
    // For time-series collections, MongoDB handles this automatically
    
    return {
      deletedChangeLogs: deletedChanges.deletedCount
    };
  }

  /**
   * Validate data integrity
   */
  async validateDataIntegrity() {
    console.log('\n✅ Validating data integrity...');
    
    const issues = [];
    
    // Check for orphaned documents
    const docsCollection = this.db.collection('AdhesivePDSDocumentMaster');
    const productsCollection = this.db.collection('AESearchDatabase');
    
    const docs = await docsCollection.find({ productId: { $exists: true } }).toArray();
    
    for (const doc of docs) {
      const product = await productsCollection.findOne({ productId: doc.productId });
      if (!product) {
        issues.push({
          type: 'orphaned_document',
          documentId: doc.documentId,
          productId: doc.productId
        });
      }
    }
    
    // Check for products without specifications
    const incompleteProducts = await productsCollection.find({
      $or: [
        { specifications: { $exists: false } },
        { specifications: null }
      ]
    }).toArray();
    
    for (const product of incompleteProducts) {
      issues.push({
        type: 'incomplete_product',
        productId: product.productId,
        name: product.name,
        missing: 'specifications'
      });
    }
    
    console.log(`  Found ${issues.length} data integrity issues`);
    
    return issues;
  }

  /**
   * Update knowledge base
   */
  async updateKnowledgeBase() {
    console.log('\n🔄 Updating knowledge base...');
    
    try {
      const response = await fetch('http://localhost:3000/api/kb/v1/extract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      
      if (response.ok) {
        console.log('  ✅ Knowledge base extraction triggered');
        return true;
      } else {
        console.log('  ⚠️  Could not trigger extraction');
        return false;
      }
    } catch (error) {
      console.log('  ⚠️  Server not available for knowledge base update');
      return false;
    }
  }

  /**
   * Record sync metrics
   */
  async recordMetrics() {
    const metricsCollection = this.db.collection('SyncMetrics');
    
    await metricsCollection.insertOne({
      timestamp: new Date(),
      type: 'daily_sync',
      duration: this.report.endTime - this.report.startTime,
      summary: this.report.summary,
      changes: this.report.changes.length,
      errors: this.report.errors.length
    });
  }

  /**
   * Generate and send report
   */
  async sendReport() {
    console.log('\n📧 Generating sync report...');
    
    const report = `
DAILY SYNC REPORT
=================
Date: ${this.report.startTime.toISOString().split('T')[0]}
Duration: ${Math.round((this.report.endTime - this.report.startTime) / 1000)}s

SUMMARY
-------
• Products Processed: ${this.report.summary.productsProcessed || 0}
• Documents Processed: ${this.report.summary.documentsProcessed || 0}
• Changes Applied: ${this.report.changes.length}
• Errors: ${this.report.errors.length}
• Data Issues: ${this.report.summary.dataIssues || 0}
• Old Logs Cleaned: ${this.report.summary.cleaned || 0}

CHANGES
-------
${this.report.changes.slice(0, 10).map(c => 
  `• ${c.type}: ${c.name || c.id}`
).join('\n') || 'No changes'}
${this.report.changes.length > 10 ? `\n... and ${this.report.changes.length - 10} more` : ''}

ERRORS
------
${this.report.errors.map(e => 
  `• ${e.file}: ${e.error}`
).join('\n') || 'No errors'}

DATA INTEGRITY
--------------
Issues Found: ${this.report.summary.dataIssues || 0}

---
Generated by PDS Adhesive Platform Daily Sync
    `.trim();
    
    console.log(report);
    
    // Save report to file
    const reportPath = path.join(__dirname, '../logs', 
      `sync_${this.report.startTime.toISOString().split('T')[0]}.log`);
    
    await fs.mkdir(path.dirname(reportPath), { recursive: true });
    await fs.writeFile(reportPath, report);
    
    // If email is configured, send report
    if (process.env.SMTP_HOST && process.env.REPORT_EMAIL) {
      try {
        const transporter = nodemailer.createTransport({
          host: process.env.SMTP_HOST,
          port: process.env.SMTP_PORT || 587,
          secure: false,
          auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS
          }
        });
        
        await transporter.sendMail({
          from: process.env.SMTP_FROM || 'noreply@pds-adhesive.com',
          to: process.env.REPORT_EMAIL,
          subject: `Daily Sync Report - ${this.report.startTime.toISOString().split('T')[0]}`,
          text: report
        });
        
        console.log('  ✅ Report emailed successfully');
      } catch (error) {
        console.log('  ⚠️  Could not send email report:', error.message);
      }
    }
  }

  /**
   * Main execution
   */
  async run() {
    try {
      console.log('🚀 Starting Daily Sync');
      console.log('=' .repeat(50));
      
      await this.connect();
      
      // Check for updates
      const updates = await this.checkExternalSources();
      
      // Process updates
      if (updates.length > 0) {
        const productResults = await this.processProductUpdates(updates);
        this.report.summary.productsProcessed = productResults.processed;
      }
      
      // Validate data
      const issues = await this.validateDataIntegrity();
      this.report.summary.dataIssues = issues.length;
      
      // Clean up old data
      const cleanup = await this.cleanupOldData();
      this.report.summary.cleaned = cleanup.deletedChangeLogs;
      
      // Update knowledge base
      const kbUpdated = await this.updateKnowledgeBase();
      this.report.summary.knowledgeBaseUpdated = kbUpdated;
      
      // Record metrics
      this.report.endTime = new Date();
      await this.recordMetrics();
      
      // Send report
      await this.sendReport();
      
      console.log('\n' + '='.repeat(50));
      console.log('✅ Daily Sync Complete!');
      
    } catch (error) {
      console.error('❌ Fatal error in daily sync:', error);
      this.report.errors.push({
        type: 'fatal',
        error: error.message
      });
      this.report.endTime = new Date();
      await this.sendReport();
      process.exit(1);
    } finally {
      await this.client.close();
    }
  }
}

// Run if executed directly
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const sync = new DailySync();
  sync.run();
}

export default DailySync;