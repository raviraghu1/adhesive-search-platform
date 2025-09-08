#!/usr/bin/env node

/**
 * Simple verification of Knowledge Base data
 */

import { MongoClient } from 'mongodb';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env') });

async function verifyKnowledgeBase() {
  const client = new MongoClient(process.env.MONGODB_URI);
  
  try {
    await client.connect();
    console.log('✅ Connected to MongoDB');
    
    const db = client.db(process.env.MONGODB_DB_NAME || 'PDSAdhesiveSearch');
    
    console.log('\n📊 Knowledge Base Data Verification');
    console.log('=' .repeat(50));
    
    // Check current state
    const currentState = db.collection('KnowledgeBaseCurrentState');
    const currentCount = await currentState.countDocuments();
    console.log(`\n📂 Current State: ${currentCount} entities`);
    
    if (currentCount > 0) {
      const samples = await currentState.find().limit(3).toArray();
      console.log('  Sample entities:');
      samples.forEach(s => {
        console.log(`    - ${s.entityId}: ${s.name || s.type}`);
      });
    }
    
    // Check short-term history
    const shortTerm = db.collection('KnowledgeBaseShortTermHistory');
    const shortTermCount = await shortTerm.countDocuments();
    console.log(`\n📅 Short-term History: ${shortTermCount} records`);
    
    if (shortTermCount > 0) {
      const recent = await shortTerm.find().sort({ timestamp: -1 }).limit(1).toArray();
      if (recent[0]) {
        console.log(`  Latest: ${recent[0].timestamp}`);
      }
    }
    
    // Check long-term history
    const longTerm = db.collection('KnowledgeBaseLongTermHistory');
    const longTermCount = await longTerm.countDocuments();
    console.log(`\n🗄️  Long-term History: ${longTermCount} archives`);
    
    if (longTermCount > 0) {
      const archive = await longTerm.findOne();
      if (archive) {
        console.log(`  Compression ratio: ${(archive.compressionRatio * 100).toFixed(1)}%`);
      }
    }
    
    // Check snapshots
    const snapshots = db.collection('KnowledgeBaseSnapshots');
    const snapshotCount = await snapshots.countDocuments();
    console.log(`\n📸 Snapshots: ${snapshotCount} saved`);
    
    // Check search cache
    const cache = db.collection('KnowledgeBaseSearchCache');
    const cacheCount = await cache.countDocuments();
    console.log(`\n🔍 Search Cache: ${cacheCount} entries`);
    
    // Summary
    console.log('\n' + '=' .repeat(50));
    
    const allLoaded = currentCount > 0 && shortTermCount > 0 && longTermCount > 0;
    
    if (allLoaded) {
      console.log('✅ Knowledge Base is fully loaded and operational!');
      console.log('\n📝 Summary:');
      console.log(`  • ${currentCount} entities in current state`);
      console.log(`  • ${shortTermCount} short-term history records`);
      console.log(`  • ${longTermCount} long-term compressed archives`);
      console.log(`  • ${snapshotCount} snapshots available`);
    } else {
      console.log('⚠️  Knowledge Base is not fully loaded');
      console.log('\nMissing data in:');
      if (currentCount === 0) console.log('  - Current State');
      if (shortTermCount === 0) console.log('  - Short-term History');
      if (longTermCount === 0) console.log('  - Long-term History');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await client.close();
  }
}

// Run verification
verifyKnowledgeBase();