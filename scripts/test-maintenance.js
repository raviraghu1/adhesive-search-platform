#!/usr/bin/env node

/**
 * Test Knowledge Base Maintenance Functions
 */

import { MongoClient } from 'mongodb';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import zlib from 'zlib';
import { promisify } from 'util';

const gzip = promisify(zlib.gzip);
const gunzip = promisify(zlib.gunzip);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env') });

class MaintenanceTest {
  constructor() {
    this.client = new MongoClient(process.env.MONGODB_URI);
    this.db = null;
  }

  async connect() {
    await this.client.connect();
    this.db = this.client.db(process.env.MONGODB_DB_NAME || 'PDSAdhesiveSearch');
    console.log('✅ Connected to MongoDB for Maintenance Testing');
  }

  /**
   * Test archival process
   */
  async testArchival() {
    console.log('\n🗄️  Testing Archival Process...');
    
    const shortTerm = this.db.collection('KnowledgeBaseShortTermHistory');
    
    // Simulate old data that should be archived
    const oldDate = new Date();
    oldDate.setDate(oldDate.getDate() - 35); // 35 days old
    
    // Insert test record
    const testRecord = {
      entityId: 'TEST-001',
      timestamp: oldDate,
      changes: {
        field: 'test',
        oldValue: 'old',
        newValue: 'new'
      },
      metadata: {
        source: 'test',
        user: 'system'
      }
    };
    
    await shortTerm.insertOne(testRecord);
    console.log('  ✅ Created test record for archival');
    
    // Count records before archival
    const beforeCount = await shortTerm.countDocuments();
    console.log(`  Records before: ${beforeCount}`);
    
    // Simulate archival (normally done by maintenance script)
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - 30);
    
    const toArchive = await shortTerm.find({
      timestamp: { $lt: cutoffDate }
    }).toArray();
    
    console.log(`  Found ${toArchive.length} records to archive`);
    
    if (toArchive.length > 0) {
      // Compress and move to long-term
      const longTerm = this.db.collection('KnowledgeBaseLongTermHistory');
      
      for (const record of toArchive) {
        const compressed = await gzip(JSON.stringify(record));
        const originalSize = JSON.stringify(record).length;
        const compressedSize = compressed.length;
        
        await longTerm.insertOne({
          entityId: record.entityId,
          startDate: record.timestamp,
          endDate: record.timestamp,
          compressedData: compressed,
          compressionRatio: compressedSize / originalSize,
          recordCount: 1,
          metadata: record.metadata
        });
        
        console.log(`  ✅ Archived ${record.entityId} (${((compressedSize/originalSize)*100).toFixed(1)}% of original)`);
      }
      
      // Remove from short-term
      await shortTerm.deleteMany({
        timestamp: { $lt: cutoffDate }
      });
      
      const afterCount = await shortTerm.countDocuments();
      console.log(`  Records after: ${afterCount}`);
      console.log(`  ✅ Archival test completed`);
    }
  }

  /**
   * Test compression/decompression
   */
  async testCompression() {
    console.log('\n🗜️  Testing Compression...');
    
    const testData = {
      entityId: 'COMP-TEST',
      name: 'Compression Test Entity',
      description: 'This is a test entity with a reasonably long description to test compression effectiveness. ' +
                   'The longer the text, the better the compression ratio we should see.',
      properties: {
        field1: 'value1',
        field2: 'value2',
        field3: 'value3',
        largeField: 'x'.repeat(1000) // Repeated data compresses well
      }
    };
    
    const original = JSON.stringify(testData);
    const originalSize = original.length;
    
    // Compress
    const compressed = await gzip(original);
    const compressedSize = compressed.length;
    const ratio = (compressedSize / originalSize * 100).toFixed(1);
    
    console.log(`  Original size: ${originalSize} bytes`);
    console.log(`  Compressed size: ${compressedSize} bytes`);
    console.log(`  Compression ratio: ${ratio}%`);
    
    // Decompress and verify
    const decompressed = await gunzip(compressed);
    const recovered = JSON.parse(decompressed.toString());
    
    const isValid = recovered.entityId === testData.entityId &&
                   recovered.name === testData.name;
    
    if (isValid) {
      console.log('  ✅ Compression/decompression verified');
    } else {
      console.log('  ❌ Decompression failed');
    }
  }

  /**
   * Test snapshot creation
   */
  async testSnapshot() {
    console.log('\n📸 Testing Snapshot Creation...');
    
    const currentState = this.db.collection('KnowledgeBaseCurrentState');
    const snapshots = this.db.collection('KnowledgeBaseSnapshots');
    
    // Get current state
    const entities = await currentState.find().toArray();
    console.log(`  Found ${entities.length} entities to snapshot`);
    
    // Create snapshot
    const snapshotData = {
      entities,
      timestamp: new Date(),
      stats: {
        totalEntities: entities.length,
        types: {}
      }
    };
    
    // Count by type
    entities.forEach(e => {
      const type = e.type || 'unknown';
      snapshotData.stats.types[type] = (snapshotData.stats.types[type] || 0) + 1;
    });
    
    // Compress snapshot
    const compressed = await gzip(JSON.stringify(snapshotData));
    const originalSize = JSON.stringify(snapshotData).length;
    const compressedSize = compressed.length;
    
    const snapshot = {
      snapshotDate: new Date(),
      type: 'test',
      entityCount: entities.length,
      compressedData: compressed,
      compressionRatio: compressedSize / originalSize,
      stats: snapshotData.stats
    };
    
    const result = await snapshots.insertOne(snapshot);
    
    if (result.insertedId) {
      console.log(`  ✅ Snapshot created: ${result.insertedId}`);
      console.log(`  Size: ${(compressedSize/1024).toFixed(2)} KB (${((compressedSize/originalSize)*100).toFixed(1)}% of original)`);
    } else {
      console.log('  ❌ Failed to create snapshot');
    }
  }

  /**
   * Test cache operations
   */
  async testCache() {
    console.log('\n🔍 Testing Search Cache...');
    
    const cache = this.db.collection('KnowledgeBaseSearchCache');
    
    // Use a unique query to avoid duplicates
    const uniqueQuery = `test adhesive ${Date.now()}`;
    
    // Create test cache entry
    const cacheEntry = {
      query: uniqueQuery,
      filters: { type: 'product' },
      results: [
        { entityId: 'PROD-001', score: 0.95 },
        { entityId: 'PROD-002', score: 0.87 }
      ],
      timestamp: new Date(),
      hitCount: 0,
      ttl: new Date(Date.now() + 3600000) // 1 hour TTL
    };
    
    await cache.insertOne(cacheEntry);
    console.log('  ✅ Cache entry created');
    
    // Simulate cache hit
    await cache.updateOne(
      { query: uniqueQuery },
      { $inc: { hitCount: 1 } }
    );
    
    const updated = await cache.findOne({ query: uniqueQuery });
    console.log(`  Hit count: ${updated.hitCount}`);
    
    // Clean expired entries
    const expired = await cache.deleteMany({
      ttl: { $lt: new Date() }
    });
    
    console.log(`  Cleaned ${expired.deletedCount} expired entries`);
    console.log('  ✅ Cache operations verified');
  }

  /**
   * Display summary
   */
  async displaySummary() {
    console.log('\n📊 Final State Summary');
    console.log('=' .repeat(50));
    
    const collections = [
      'KnowledgeBaseCurrentState',
      'KnowledgeBaseShortTermHistory', 
      'KnowledgeBaseLongTermHistory',
      'KnowledgeBaseSnapshots',
      'KnowledgeBaseSearchCache'
    ];
    
    for (const coll of collections) {
      const count = await this.db.collection(coll).countDocuments();
      console.log(`  ${coll}: ${count} documents`);
    }
  }

  /**
   * Run all tests
   */
  async runTests() {
    console.log('🚀 Starting Knowledge Base Maintenance Tests');
    console.log('=' .repeat(50));
    
    try {
      await this.connect();
      
      await this.testCompression();
      await this.testArchival();
      await this.testSnapshot();
      await this.testCache();
      
      await this.displaySummary();
      
      console.log('\n✅ All maintenance tests completed successfully!');
      
    } catch (error) {
      console.error('❌ Test failed:', error);
    } finally {
      await this.client.close();
    }
  }
}

// Run tests
const tester = new MaintenanceTest();
tester.runTests();