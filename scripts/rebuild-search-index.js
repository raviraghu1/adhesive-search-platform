#!/usr/bin/env node

/**
 * Search Index Rebuild Script
 * Rebuilds search indexes and refreshes data from AEdatabase
 * Scheduled to run twice daily (6 AM and 6 PM)
 */

import { MongoClient } from 'mongodb';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config();

// Configuration
const MONGODB_URI = process.env.MONGODB_URI;
const LOG_DIR = path.join(__dirname, '../logs');
const LOG_FILE = path.join(LOG_DIR, 'search-rebuild.log');

// Ensure log directory exists
if (!fs.existsSync(LOG_DIR)) {
  fs.mkdirSync(LOG_DIR, { recursive: true });
}

// Logging function
function log(message, level = 'INFO') {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] [${level}] ${message}`;
  console.log(logMessage);
  fs.appendFileSync(LOG_FILE, logMessage + '\n');
}

// Main rebuild function
async function rebuildSearchIndex() {
  const startTime = Date.now();
  let client;
  
  try {
    log('Starting search index rebuild process');
    
    // Connect to MongoDB
    client = new MongoClient(MONGODB_URI);
    await client.connect();
    log('Connected to MongoDB');
    
    const db = client.db('PDSAdhesiveSearch');
    const sourceDb = client.db('PDSAdhesives');
    
    // Step 1: Check source data for updates
    log('Checking source database for updates');
    const sourceCollection = sourceDb.collection('AEdatabase');
    const targetCollection = db.collection('AESearchDatabase');
    const documentsCollection = db.collection('AdhesivePDSDocumentMaster');
    
    const sourceCount = await sourceCollection.countDocuments();
    const targetCount = await targetCollection.countDocuments();
    log(`Source: ${sourceCount} entries, Target: ${targetCount} products`);
    
    // Step 2: Rebuild text search indexes
    log('Rebuilding text search indexes');
    
    // Drop existing indexes (except _id)
    const existingIndexes = await targetCollection.indexes();
    for (const index of existingIndexes) {
      if (index.name !== '_id_') {
        await targetCollection.dropIndex(index.name);
        log(`Dropped index: ${index.name}`);
      }
    }
    
    // Create new optimized indexes
    const indexesToCreate = [
      // Text search index
      {
        fields: { name: 'text', description: 'text', searchKeywords: 'text' },
        options: { 
          weights: { name: 10, description: 5, searchKeywords: 3 },
          name: 'text_search_index'
        }
      },
      // Product ID index
      {
        fields: { productId: 1 },
        options: { unique: true, name: 'productId_unique' }
      },
      // Category indexes
      {
        fields: { category: 1, subcategory: 1 },
        options: { name: 'category_compound' }
      },
      // X_NUMBER index
      {
        fields: { 'specifications.xNumbers': 1 },
        options: { name: 'xnumber_index' }
      },
      // Compound index for filtering
      {
        fields: { 
          category: 1,
          'specifications.thermal.temperature_range.max': -1,
          'specifications.mechanical.tensile_strength.value': -1
        },
        options: { name: 'filter_compound' }
      }
    ];
    
    for (const indexDef of indexesToCreate) {
      await targetCollection.createIndex(indexDef.fields, indexDef.options);
      log(`Created index: ${indexDef.options.name}`);
    }
    
    // Step 3: Update search keywords and metadata
    log('Updating search keywords and metadata');
    
    const products = await targetCollection.find({}).toArray();
    let updateCount = 0;
    
    for (const product of products) {
      // Generate enhanced search keywords
      const keywords = new Set();
      
      // Add product ID variations
      if (product.productId) {
        keywords.add(product.productId.toLowerCase());
        keywords.add(product.productId.replace(/-/g, ''));
      }
      
      // Add category keywords
      if (product.category) {
        keywords.add(product.category.toLowerCase());
      }
      if (product.subcategory) {
        keywords.add(product.subcategory.toLowerCase());
      }
      
      // Add X_NUMBER keywords
      if (product.specifications?.xNumbers) {
        product.specifications.xNumbers.forEach(xnum => {
          keywords.add(xnum.toLowerCase());
          keywords.add(xnum.replace(/-/g, ''));
        });
      }
      
      // Add feature keywords
      if (product.specifications?.features) {
        product.specifications.features.forEach(feature => {
          if (typeof feature === 'string') {
            feature.split(/\s+/).forEach(word => {
              if (word.length > 2) {
                keywords.add(word.toLowerCase());
              }
            });
          }
        });
      }
      
      // Update the product with new keywords
      await targetCollection.updateOne(
        { _id: product._id },
        {
          $set: {
            searchKeywords: Array.from(keywords),
            lastIndexed: new Date(),
            indexVersion: '2.0'
          }
        }
      );
      updateCount++;
      
      if (updateCount % 100 === 0) {
        log(`Updated ${updateCount} products with search keywords`);
      }
    }
    
    log(`Completed updating ${updateCount} products`);
    
    // Step 4: Rebuild document indexes
    log('Rebuilding document indexes');
    
    await documentsCollection.createIndex(
      { productIds: 1 },
      { name: 'productIds_index' }
    );
    
    await documentsCollection.createIndex(
      { primaryProductId: 1 },
      { name: 'primaryProductId_index' }
    );
    
    await documentsCollection.createIndex(
      { 'aeAttributes.pdsProduct': 1 },
      { name: 'ae_pds_product_index' }
    );
    
    log('Document indexes rebuilt');
    
    // Step 5: Collect statistics
    const stats = {
      totalProducts: await targetCollection.countDocuments(),
      totalDocuments: await documentsCollection.countDocuments(),
      epoxyCount: await targetCollection.countDocuments({ category: 'Epoxy' }),
      specialtyCount: await targetCollection.countDocuments({ category: 'Specialty Adhesive' }),
      indexCount: (await targetCollection.indexes()).length,
      rebuildTime: Date.now() - startTime
    };
    
    log(`Rebuild Statistics:
    - Total Products: ${stats.totalProducts}
    - Total Documents: ${stats.totalDocuments}
    - Epoxy Products: ${stats.epoxyCount}
    - Specialty Products: ${stats.specialtyCount}
    - Index Count: ${stats.indexCount}
    - Rebuild Time: ${stats.rebuildTime}ms`);
    
    // Step 6: Save rebuild metadata
    const metadataCollection = db.collection('system_metadata');
    await metadataCollection.updateOne(
      { _id: 'search_rebuild' },
      {
        $set: {
          lastRebuild: new Date(),
          stats,
          status: 'success'
        },
        $push: {
          history: {
            $each: [{
              timestamp: new Date(),
              stats,
              duration: stats.rebuildTime
            }],
            $slice: -30 // Keep last 30 rebuild records
          }
        }
      },
      { upsert: true }
    );
    
    log('Search index rebuild completed successfully', 'SUCCESS');
    
  } catch (error) {
    log(`Error during rebuild: ${error.message}`, 'ERROR');
    log(error.stack, 'ERROR');
    
    // Save error to metadata
    if (client) {
      try {
        const db = client.db('PDSAdhesiveSearch');
        const metadataCollection = db.collection('system_metadata');
        await metadataCollection.updateOne(
          { _id: 'search_rebuild' },
          {
            $set: {
              lastError: {
                timestamp: new Date(),
                message: error.message,
                stack: error.stack
              },
              status: 'failed'
            }
          },
          { upsert: true }
        );
      } catch (metaError) {
        log(`Failed to save error metadata: ${metaError.message}`, 'ERROR');
      }
    }
    
    process.exit(1);
  } finally {
    if (client) {
      await client.close();
      log('MongoDB connection closed');
    }
  }
}

// Check if running directly or being imported
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  rebuildSearchIndex().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

export default rebuildSearchIndex;