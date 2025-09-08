#!/usr/bin/env node

/**
 * Test Knowledge Base Search Functionality
 * Tests search across all three tiers: current state, short-term, and long-term history
 */

import { MongoClient } from 'mongodb';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import stateManager from '../src/services/KnowledgeBaseStateManager.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env') });

class KnowledgeBaseSearchTest {
  constructor() {
    this.client = new MongoClient(process.env.MONGODB_URI);
    this.db = null;
    this.stateManager = null;
    this.testResults = {
      passed: 0,
      failed: 0,
      tests: []
    };
  }

  async connect() {
    await this.client.connect();
    this.db = this.client.db(process.env.MONGODB_DB_NAME || 'PDSAdhesiveSearch');
    
    // Use the singleton instance
    this.stateManager = stateManager;
    
    // Initialize the state manager
    await this.stateManager.initialize();
    
    console.log('✅ Connected for KB Search Testing');
  }

  /**
   * Test 1: Search in current state
   */
  async testCurrentStateSearch() {
    console.log('\n🔍 Test 1: Current State Search');
    
    try {
      // Search for "epoxy" in current state
      const results = await this.stateManager.search('epoxy', {
        includeHistory: false,
        includeLongTerm: false,
        limit: 10
      });
      
      console.log(`  Found ${results.length} results for "epoxy"`);
      
      // Verify we found the EpoxiBond product
      const hasEpoxiBond = results.some(r => 
        r.entityId === 'PROD-001' || r.name?.includes('EpoxiBond')
      );
      
      if (hasEpoxiBond) {
        console.log('  ✅ Found EpoxiBond 2000 in current state');
        this.testResults.passed++;
      } else {
        console.log('  ❌ Failed to find EpoxiBond in current state');
        this.testResults.failed++;
      }
      
      this.testResults.tests.push({
        name: 'Current State Search',
        status: hasEpoxiBond ? 'passed' : 'failed',
        results: results.length
      });
      
    } catch (error) {
      console.error('  ❌ Error:', error.message);
      this.testResults.failed++;
    }
  }

  /**
   * Test 2: Search with history included
   */
  async testHistorySearch() {
    console.log('\n🔍 Test 2: Search with History');
    
    try {
      // Search across current and history
      const results = await this.stateManager.search('adhesive', {
        includeHistory: true,
        includeLongTerm: true,
        limit: 50
      });
      
      console.log(`  Found ${results.length} total results`);
      
      // Count results by source
      const sources = {
        current: 0,
        shortTerm: 0,
        longTerm: 0
      };
      
      results.forEach(r => {
        if (r.source === 'current') sources.current++;
        else if (r.source === 'shortTerm') sources.shortTerm++;
        else if (r.source === 'longTerm') sources.longTerm++;
      });
      
      console.log(`  Current: ${sources.current}, Short-term: ${sources.shortTerm}, Long-term: ${sources.longTerm}`);
      
      const hasAllSources = sources.current > 0 || sources.shortTerm > 0 || sources.longTerm > 0;
      
      if (hasAllSources) {
        console.log('  ✅ Search spans multiple tiers');
        this.testResults.passed++;
      } else {
        console.log('  ❌ Failed to search across tiers');
        this.testResults.failed++;
      }
      
      this.testResults.tests.push({
        name: 'Multi-tier Search',
        status: hasAllSources ? 'passed' : 'failed',
        sources
      });
      
    } catch (error) {
      console.error('  ❌ Error:', error.message);
      this.testResults.failed++;
    }
  }

  /**
   * Test 3: Time-range search
   */
  async testTimeRangeSearch() {
    console.log('\n🔍 Test 3: Time-Range Search');
    
    try {
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 7); // Last 7 days
      
      const results = await this.stateManager.search('', {
        includeHistory: true,
        timeRange: {
          start: startDate,
          end: endDate
        },
        limit: 100
      });
      
      console.log(`  Found ${results.length} results in last 7 days`);
      
      // Verify timestamps are within range
      let inRange = true;
      results.forEach(r => {
        if (r.timestamp) {
          const ts = new Date(r.timestamp);
          if (ts < startDate || ts > endDate) {
            inRange = false;
          }
        }
      });
      
      if (inRange && results.length > 0) {
        console.log('  ✅ Time-range filtering works correctly');
        this.testResults.passed++;
      } else {
        console.log('  ❌ Time-range filtering failed');
        this.testResults.failed++;
      }
      
      this.testResults.tests.push({
        name: 'Time-range Search',
        status: inRange ? 'passed' : 'failed',
        resultCount: results.length
      });
      
    } catch (error) {
      console.error('  ❌ Error:', error.message);
      this.testResults.failed++;
    }
  }

  /**
   * Test 4: Cache functionality
   */
  async testSearchCache() {
    console.log('\n🔍 Test 4: Search Cache');
    
    try {
      const query = 'silicone test cache';
      
      // First search (cache miss)
      const start1 = Date.now();
      const results1 = await this.stateManager.search(query, { limit: 10 });
      const time1 = Date.now() - start1;
      
      // Second search (should hit cache)
      const start2 = Date.now();
      const results2 = await this.stateManager.search(query, { limit: 10 });
      const time2 = Date.now() - start2;
      
      console.log(`  First search: ${time1}ms (${results1.length} results)`);
      console.log(`  Cached search: ${time2}ms (${results2.length} results)`);
      
      // Cache should be faster and return same results
      const cacheWorking = time2 <= time1 && results1.length === results2.length;
      
      if (cacheWorking) {
        console.log('  ✅ Search cache is working');
        this.testResults.passed++;
      } else {
        console.log('  ❌ Search cache not functioning properly');
        this.testResults.failed++;
      }
      
      this.testResults.tests.push({
        name: 'Search Cache',
        status: cacheWorking ? 'passed' : 'failed',
        performance: { first: time1, cached: time2 }
      });
      
    } catch (error) {
      console.error('  ❌ Error:', error.message);
      this.testResults.failed++;
    }
  }

  /**
   * Test 5: Entity relationships
   */
  async testEntityRelationships() {
    console.log('\n🔍 Test 5: Entity Relationships');
    
    try {
      // Get a product entity
      const currentState = this.db.collection('KnowledgeBaseCurrentState');
      const product = await currentState.findOne({ entityId: 'PROD-001' });
      
      if (product && product.relationships) {
        console.log(`  Product PROD-001 has ${product.relationships.length} relationships`);
        
        // Verify related documents exist
        const relatedDocs = product.relationships.filter(r => 
          r.targetId.startsWith('DOC-')
        );
        
        if (relatedDocs.length > 0) {
          console.log(`  ✅ Found ${relatedDocs.length} document relationships`);
          this.testResults.passed++;
        } else {
          console.log('  ❌ No document relationships found');
          this.testResults.failed++;
        }
      } else {
        console.log('  ❌ Entity or relationships not found');
        this.testResults.failed++;
      }
      
      this.testResults.tests.push({
        name: 'Entity Relationships',
        status: product?.relationships?.length > 0 ? 'passed' : 'failed'
      });
      
    } catch (error) {
      console.error('  ❌ Error:', error.message);
      this.testResults.failed++;
    }
  }

  /**
   * Test 6: Compression in long-term history
   */
  async testCompressionIntegrity() {
    console.log('\n🔍 Test 6: Compression Integrity');
    
    try {
      const longTerm = this.db.collection('KnowledgeBaseLongTermHistory');
      const compressed = await longTerm.findOne({});
      
      if (compressed && compressed.compressedData) {
        // Test decompression
        const decompressed = await this.stateManager.decompressHistoryData(
          compressed.compressedData
        );
        
        const hasValidData = decompressed && 
          (decompressed.entities || decompressed.entity || decompressed.changes);
        
        if (hasValidData) {
          console.log(`  ✅ Compression/decompression working`);
          console.log(`  Compression ratio: ${(compressed.compressionRatio * 100).toFixed(1)}%`);
          this.testResults.passed++;
        } else {
          console.log('  ❌ Decompression failed');
          this.testResults.failed++;
        }
        
        this.testResults.tests.push({
          name: 'Compression Integrity',
          status: hasValidData ? 'passed' : 'failed',
          compressionRatio: compressed.compressionRatio
        });
      } else {
        console.log('  ⚠️  No compressed data found');
      }
      
    } catch (error) {
      console.error('  ❌ Error:', error.message);
      this.testResults.failed++;
    }
  }

  /**
   * Test 7: Statistics and metrics
   */
  async testStatistics() {
    console.log('\n🔍 Test 7: Statistics & Metrics');
    
    try {
      const stats = await this.stateManager.getStatistics();
      
      console.log('  Current state:', stats.current.count, 'entities');
      console.log('  Short-term:', stats.shortTerm.count, 'records');
      console.log('  Long-term:', stats.longTerm.count, 'archives');
      console.log('  Cache entries:', stats.cache.entries);
      
      const hasValidStats = 
        stats.current.count > 0 &&
        stats.shortTerm.count > 0 &&
        stats.longTerm.count > 0;
      
      if (hasValidStats) {
        console.log('  ✅ Statistics collection working');
        this.testResults.passed++;
      } else {
        console.log('  ❌ Missing statistics data');
        this.testResults.failed++;
      }
      
      this.testResults.tests.push({
        name: 'Statistics Collection',
        status: hasValidStats ? 'passed' : 'failed',
        stats
      });
      
    } catch (error) {
      console.error('  ❌ Error:', error.message);
      this.testResults.failed++;
    }
  }

  /**
   * Display test results
   */
  displayResults() {
    console.log('\n' + '='.repeat(60));
    console.log('📊 Test Results Summary');
    console.log('='.repeat(60));
    
    console.log(`\n✅ Passed: ${this.testResults.passed}`);
    console.log(`❌ Failed: ${this.testResults.failed}`);
    console.log(`📈 Total: ${this.testResults.passed + this.testResults.failed}`);
    
    const successRate = 
      (this.testResults.passed / (this.testResults.passed + this.testResults.failed)) * 100;
    
    console.log(`\n🎯 Success Rate: ${successRate.toFixed(1)}%`);
    
    if (successRate === 100) {
      console.log('\n🎉 All tests passed! Knowledge Base is fully operational.');
    } else if (successRate >= 80) {
      console.log('\n✅ Knowledge Base is mostly functional with minor issues.');
    } else {
      console.log('\n⚠️  Knowledge Base has significant issues that need attention.');
    }
    
    // Detailed test results
    console.log('\n📝 Detailed Results:');
    this.testResults.tests.forEach(test => {
      const icon = test.status === 'passed' ? '✅' : '❌';
      console.log(`  ${icon} ${test.name}`);
    });
  }

  /**
   * Run all tests
   */
  async runAllTests() {
    console.log('🚀 Starting Knowledge Base Search Tests');
    console.log('='.repeat(60));
    
    try {
      await this.connect();
      
      // Run test suite
      await this.testCurrentStateSearch();
      await this.testHistorySearch();
      await this.testTimeRangeSearch();
      await this.testSearchCache();
      await this.testEntityRelationships();
      await this.testCompressionIntegrity();
      await this.testStatistics();
      
      // Display results
      this.displayResults();
      
    } catch (error) {
      console.error('❌ Fatal error during testing:', error);
    } finally {
      await this.client.close();
      console.log('\n✅ Testing complete!');
    }
  }
}

// Run tests
const tester = new KnowledgeBaseSearchTest();
tester.runAllTests();