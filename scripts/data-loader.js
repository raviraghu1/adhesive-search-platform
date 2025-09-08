#!/usr/bin/env node

import { MongoClient } from 'mongodb';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import crypto from 'crypto';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../.env') });

class DataLoader {
  constructor() {
    this.client = new MongoClient(process.env.MONGODB_URI);
    this.db = null;
    this.stats = {
      inserted: 0,
      updated: 0,
      unchanged: 0,
      errors: 0
    };
  }

  async connect() {
    try {
      await this.client.connect();
      this.db = this.client.db(process.env.MONGODB_DB_NAME || 'PDSAdhesiveSearch');
      console.log('✅ Connected to MongoDB Atlas');
    } catch (error) {
      console.error('❌ Failed to connect to MongoDB:', error.message);
      throw error;
    }
  }

  /**
   * Calculate hash of product data for change detection
   */
  calculateHash(data) {
    const normalized = JSON.stringify(data, Object.keys(data).sort());
    return crypto.createHash('md5').update(normalized).digest('hex');
  }

  /**
   * Load products with change tracking
   */
  async loadProducts(dataPath) {
    console.log('\n📦 Loading Products...');
    
    try {
      const productsCollection = this.db.collection('AESearchDatabase');
      const changesCollection = this.db.collection('DataChangeLog');
      
      // Read product data
      const rawData = await fs.readFile(dataPath, 'utf8');
      const products = JSON.parse(rawData);
      
      for (const product of products) {
        const productId = product.productId;
        
        // Add metadata
        const enhancedProduct = {
          ...product,
          dataHash: this.calculateHash(product),
          lastModified: new Date(),
          dataSource: 'manual_import',
          version: 1
        };
        
        // Check if product exists
        const existing = await productsCollection.findOne({ productId });
        
        if (!existing) {
          // New product - insert
          enhancedProduct.createdAt = new Date();
          enhancedProduct.version = 1;
          
          await productsCollection.insertOne(enhancedProduct);
          
          // Log change
          await changesCollection.insertOne({
            entityId: productId,
            entityType: 'product',
            action: 'create',
            timestamp: new Date(),
            changes: { new: enhancedProduct },
            dataHash: enhancedProduct.dataHash
          });
          
          this.stats.inserted++;
          console.log(`  ✅ Inserted: ${product.name}`);
          
        } else if (existing.dataHash !== enhancedProduct.dataHash) {
          // Product changed - update
          enhancedProduct.version = (existing.version || 1) + 1;
          enhancedProduct.createdAt = existing.createdAt;
          
          const changes = this.detectChanges(existing, enhancedProduct);
          
          await productsCollection.replaceOne(
            { productId },
            enhancedProduct
          );
          
          // Log change
          await changesCollection.insertOne({
            entityId: productId,
            entityType: 'product',
            action: 'update',
            timestamp: new Date(),
            changes: changes,
            previousHash: existing.dataHash,
            newHash: enhancedProduct.dataHash,
            version: enhancedProduct.version
          });
          
          this.stats.updated++;
          console.log(`  🔄 Updated: ${product.name} (v${enhancedProduct.version})`);
          
        } else {
          // No changes
          this.stats.unchanged++;
          console.log(`  ⏭️  Unchanged: ${product.name}`);
        }
      }
      
      // Create indexes
      await this.createIndexes(productsCollection);
      await this.createChangeLogIndexes(changesCollection);
      
    } catch (error) {
      console.error('❌ Error loading products:', error);
      this.stats.errors++;
      throw error;
    }
  }

  /**
   * Detect specific changes between versions
   */
  detectChanges(oldDoc, newDoc) {
    const changes = {
      fields: [],
      old: {},
      new: {}
    };
    
    const skipFields = ['_id', 'dataHash', 'lastModified', 'version'];
    
    for (const key in newDoc) {
      if (skipFields.includes(key)) continue;
      
      if (JSON.stringify(oldDoc[key]) !== JSON.stringify(newDoc[key])) {
        changes.fields.push(key);
        changes.old[key] = oldDoc[key];
        changes.new[key] = newDoc[key];
      }
    }
    
    return changes;
  }

  /**
   * Load sample documents
   */
  async loadDocuments() {
    console.log('\n📄 Loading Documents...');
    
    const docsCollection = this.db.collection('AdhesivePDSDocumentMaster');
    const changesCollection = this.db.collection('DataChangeLog');
    
    const sampleDocs = [
      {
        documentId: 'TDS-EP-2000',
        productId: 'EP-2000',
        type: 'technical_data_sheet',
        title: 'EpoxiBond 2000 Technical Data Sheet',
        version: '2.1',
        language: 'en',
        format: 'pdf',
        url: '/documents/TDS-EP-2000.pdf',
        content: 'Technical specifications and application guidelines for EpoxiBond 2000...',
        metadata: {
          pages: 4,
          fileSize: '245KB',
          lastUpdated: new Date('2024-01-15')
        },
        tags: ['epoxy', 'structural', 'technical', 'datasheet']
      },
      {
        documentId: 'SDS-EP-2000',
        productId: 'EP-2000',
        type: 'safety_data_sheet',
        title: 'EpoxiBond 2000 Safety Data Sheet',
        version: '1.3',
        language: 'en',
        format: 'pdf',
        url: '/documents/SDS-EP-2000.pdf',
        content: 'Safety information and handling procedures for EpoxiBond 2000...',
        metadata: {
          pages: 8,
          fileSize: '512KB',
          lastUpdated: new Date('2024-01-10')
        },
        tags: ['epoxy', 'safety', 'MSDS', 'handling']
      },
      {
        documentId: 'APP-AUTO-001',
        type: 'application_guide',
        title: 'Adhesive Selection Guide for Automotive Applications',
        version: '3.0',
        language: 'en',
        format: 'pdf',
        url: '/documents/APP-AUTO-001.pdf',
        content: 'Comprehensive guide for selecting adhesives in automotive manufacturing...',
        relatedProducts: ['EP-2000', 'PU-3300', 'AC-5500'],
        metadata: {
          pages: 25,
          fileSize: '2.1MB',
          lastUpdated: new Date('2024-02-01')
        },
        tags: ['automotive', 'selection', 'guide', 'application']
      }
    ];
    
    for (const doc of sampleDocs) {
      const enhancedDoc = {
        ...doc,
        dataHash: this.calculateHash(doc),
        lastModified: new Date(),
        createdAt: new Date()
      };
      
      const existing = await docsCollection.findOne({ documentId: doc.documentId });
      
      if (!existing) {
        await docsCollection.insertOne(enhancedDoc);
        
        await changesCollection.insertOne({
          entityId: doc.documentId,
          entityType: 'document',
          action: 'create',
          timestamp: new Date(),
          dataHash: enhancedDoc.dataHash
        });
        
        console.log(`  ✅ Inserted document: ${doc.title}`);
      } else {
        console.log(`  ⏭️  Document exists: ${doc.title}`);
      }
    }
    
    // Create indexes
    await docsCollection.createIndex({ documentId: 1 }, { unique: true });
    await docsCollection.createIndex({ productId: 1 });
    await docsCollection.createIndex({ type: 1 });
    await docsCollection.createIndex({ tags: 1 });
  }

  /**
   * Initialize time-series collection for metrics
   */
  async initializeTimeSeries() {
    console.log('\n📊 Initializing Time-Series Collections...');
    
    try {
      // Check if collection exists
      const collections = await this.db.listCollections({ name: 'KnowledgeBaseMetrics' }).toArray();
      
      if (collections.length === 0) {
        // Create time-series collection for metrics
        await this.db.createCollection('KnowledgeBaseMetrics', {
          timeseries: {
            timeField: 'timestamp',
            metaField: 'metadata',
            granularity: 'hours'
          }
        });
        console.log('  ✅ Created time-series collection: KnowledgeBaseMetrics');
      }
      
      // Check search metrics collection
      const searchCollections = await this.db.listCollections({ name: 'SearchMetrics' }).toArray();
      
      if (searchCollections.length === 0) {
        await this.db.createCollection('SearchMetrics', {
          timeseries: {
            timeField: 'timestamp',
            metaField: 'metadata',
            granularity: 'minutes'
          }
        });
        console.log('  ✅ Created time-series collection: SearchMetrics');
      }
      
    } catch (error) {
      console.error('⚠️  Time-series collection may already exist:', error.message);
    }
  }

  /**
   * Create indexes for products collection
   */
  async createIndexes(collection) {
    await collection.createIndex({ productId: 1 }, { unique: true });
    await collection.createIndex({ category: 1, subcategory: 1 });
    await collection.createIndex({ 'applications.industries': 1 });
    await collection.createIndex({ status: 1 });
    await collection.createIndex({ lastModified: -1 });
    await collection.createIndex({ dataHash: 1 });
    await collection.createIndex({ 
      name: 'text', 
      description: 'text' 
    }, { 
      weights: { name: 10, description: 5 } 
    });
  }

  /**
   * Create indexes for change log
   */
  async createChangeLogIndexes(collection) {
    await collection.createIndex({ entityId: 1, timestamp: -1 });
    await collection.createIndex({ entityType: 1, action: 1 });
    await collection.createIndex({ timestamp: -1 });
    await collection.createIndex({ dataHash: 1 });
  }

  /**
   * Record metrics
   */
  async recordMetrics() {
    const metricsCollection = this.db.collection('KnowledgeBaseMetrics');
    
    const metrics = {
      timestamp: new Date(),
      metadata: {
        source: 'data_loader',
        environment: process.env.NODE_ENV || 'development'
      },
      products: {
        total: await this.db.collection('AESearchDatabase').countDocuments(),
        active: await this.db.collection('AESearchDatabase').countDocuments({ status: 'active' })
      },
      documents: {
        total: await this.db.collection('AdhesivePDSDocumentMaster').countDocuments()
      },
      knowledgeBase: {
        total: await this.db.collection('KnowledgeBase').countDocuments()
      },
      changes: {
        inserted: this.stats.inserted,
        updated: this.stats.updated,
        unchanged: this.stats.unchanged,
        errors: this.stats.errors
      }
    };
    
    await metricsCollection.insertOne(metrics);
    console.log('\n📈 Metrics recorded');
  }

  /**
   * Main execution
   */
  async run() {
    try {
      console.log('🚀 Starting Data Loader');
      console.log('=' .repeat(50));
      
      await this.connect();
      await this.initializeTimeSeries();
      
      // Load sample products
      const dataPath = path.join(__dirname, '../data/sample-products.json');
      await this.loadProducts(dataPath);
      
      // Load sample documents
      await this.loadDocuments();
      
      // Record metrics
      await this.recordMetrics();
      
      // Print summary
      console.log('\n' + '='.repeat(50));
      console.log('✅ Data Loading Complete!');
      console.log(`  📊 Summary:`);
      console.log(`     • Inserted: ${this.stats.inserted}`);
      console.log(`     • Updated: ${this.stats.updated}`);
      console.log(`     • Unchanged: ${this.stats.unchanged}`);
      console.log(`     • Errors: ${this.stats.errors}`);
      
      // Trigger knowledge base extraction
      console.log('\n🔄 Triggering Knowledge Base Extraction...');
      await this.triggerKnowledgeBaseExtraction();
      
    } catch (error) {
      console.error('❌ Fatal error:', error);
      process.exit(1);
    } finally {
      await this.client.close();
    }
  }

  /**
   * Trigger knowledge base extraction via API
   */
  async triggerKnowledgeBaseExtraction() {
    try {
      const response = await fetch('http://localhost:3000/api/kb/v1/extract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      
      if (response.ok) {
        console.log('✅ Knowledge base extraction triggered');
      } else {
        console.log('⚠️  Could not trigger extraction - server may not be running');
      }
    } catch (error) {
      console.log('⚠️  Could not trigger extraction - server may not be running');
    }
  }
}

// Run if executed directly
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const loader = new DataLoader();
  loader.run();
}

export default DataLoader;