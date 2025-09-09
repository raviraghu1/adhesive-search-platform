#!/usr/bin/env node

/**
 * Monitor Search Index Rebuild Status
 * Checks the status of scheduled rebuilds and provides health reports
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
const LOG_FILE = path.join(__dirname, '../logs/search-rebuild.log');
const CRON_LOG_FILE = path.join(__dirname, '../logs/search-rebuild-cron.log');

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

async function monitorRebuildStatus() {
  let client;
  
  try {
    // Connect to MongoDB
    client = new MongoClient(MONGODB_URI);
    await client.connect();
    
    const db = client.db('PDSAdhesiveSearch');
    const metadataCollection = db.collection('system_metadata');
    const productsCollection = db.collection('AESearchDatabase');
    const documentsCollection = db.collection('AdhesivePDSDocumentMaster');
    
    console.log(`${colors.cyan}═══════════════════════════════════════════════════════════${colors.reset}`);
    console.log(`${colors.cyan}          SEARCH INDEX REBUILD STATUS MONITOR${colors.reset}`);
    console.log(`${colors.cyan}═══════════════════════════════════════════════════════════${colors.reset}\n`);
    
    // Get rebuild metadata
    const metadata = await metadataCollection.findOne({ _id: 'search_rebuild' });
    
    if (metadata) {
      // Display last rebuild status
      console.log(`${colors.blue}📊 Last Rebuild Status${colors.reset}`);
      console.log('─'.repeat(40));
      
      const status = metadata.status === 'success' ? 
        `${colors.green}✅ SUCCESS${colors.reset}` : 
        `${colors.red}❌ FAILED${colors.reset}`;
      
      console.log(`Status: ${status}`);
      
      if (metadata.lastRebuild) {
        const lastRebuildTime = new Date(metadata.lastRebuild);
        const hoursAgo = Math.floor((Date.now() - lastRebuildTime) / (1000 * 60 * 60));
        console.log(`Last Rebuild: ${lastRebuildTime.toLocaleString()} (${hoursAgo} hours ago)`);
      }
      
      if (metadata.stats) {
        console.log(`\n${colors.blue}📈 Statistics${colors.reset}`);
        console.log('─'.repeat(40));
        console.log(`Total Products: ${metadata.stats.totalProducts}`);
        console.log(`Total Documents: ${metadata.stats.totalDocuments}`);
        console.log(`Epoxy Products: ${metadata.stats.epoxyCount}`);
        console.log(`Specialty Products: ${metadata.stats.specialtyCount}`);
        console.log(`Index Count: ${metadata.stats.indexCount}`);
        console.log(`Rebuild Time: ${metadata.stats.rebuildTime}ms`);
      }
      
      if (metadata.lastError) {
        console.log(`\n${colors.red}⚠️  Last Error${colors.reset}`);
        console.log('─'.repeat(40));
        console.log(`Time: ${new Date(metadata.lastError.timestamp).toLocaleString()}`);
        console.log(`Message: ${metadata.lastError.message}`);
      }
      
      // Show rebuild history
      if (metadata.history && metadata.history.length > 0) {
        console.log(`\n${colors.blue}📜 Recent Rebuild History${colors.reset}`);
        console.log('─'.repeat(40));
        
        const recentHistory = metadata.history.slice(-5).reverse();
        recentHistory.forEach((entry, index) => {
          const time = new Date(entry.timestamp).toLocaleString();
          const duration = entry.duration ? `${entry.duration}ms` : 'N/A';
          console.log(`${index + 1}. ${time} - Duration: ${duration}`);
        });
      }
    } else {
      console.log(`${colors.yellow}⚠️  No rebuild metadata found${colors.reset}`);
      console.log('The rebuild process has not been run yet.');
    }
    
    // Check current database status
    console.log(`\n${colors.blue}🗄️  Current Database Status${colors.reset}`);
    console.log('─'.repeat(40));
    
    const productCount = await productsCollection.countDocuments();
    const documentCount = await documentsCollection.countDocuments();
    const indexes = await productsCollection.indexes();
    
    console.log(`Products in Database: ${productCount}`);
    console.log(`Documents in Database: ${documentCount}`);
    console.log(`Product Indexes: ${indexes.length}`);
    
    // Check cron job status
    console.log(`\n${colors.blue}⏰ Scheduled Rebuilds${colors.reset}`);
    console.log('─'.repeat(40));
    console.log('Scheduled Times: 6:00 AM and 6:00 PM daily');
    
    // Calculate next rebuild times
    const now = new Date();
    const next6AM = new Date(now);
    next6AM.setHours(6, 0, 0, 0);
    if (next6AM <= now) {
      next6AM.setDate(next6AM.getDate() + 1);
    }
    
    const next6PM = new Date(now);
    next6PM.setHours(18, 0, 0, 0);
    if (next6PM <= now) {
      next6PM.setDate(next6PM.getDate() + 1);
    }
    
    const nextRebuild = next6AM < next6PM ? next6AM : next6PM;
    const hoursUntilNext = Math.ceil((nextRebuild - now) / (1000 * 60 * 60));
    
    console.log(`Next Rebuild: ${nextRebuild.toLocaleString()} (in ${hoursUntilNext} hours)`);
    
    // Check log files
    console.log(`\n${colors.blue}📝 Log Files${colors.reset}`);
    console.log('─'.repeat(40));
    
    if (fs.existsSync(LOG_FILE)) {
      const stats = fs.statSync(LOG_FILE);
      const sizeKB = Math.round(stats.size / 1024);
      console.log(`Rebuild Log: ${LOG_FILE}`);
      console.log(`  Size: ${sizeKB} KB`);
      console.log(`  Modified: ${stats.mtime.toLocaleString()}`);
      
      // Show last few lines of log
      const logContent = fs.readFileSync(LOG_FILE, 'utf-8');
      const lines = logContent.trim().split('\n');
      const lastLines = lines.slice(-3);
      
      if (lastLines.length > 0) {
        console.log('  Last entries:');
        lastLines.forEach(line => {
          console.log(`    ${line.substring(0, 80)}...`);
        });
      }
    } else {
      console.log(`Log file not found: ${LOG_FILE}`);
    }
    
    if (fs.existsSync(CRON_LOG_FILE)) {
      const stats = fs.statSync(CRON_LOG_FILE);
      const sizeKB = Math.round(stats.size / 1024);
      console.log(`\nCron Log: ${CRON_LOG_FILE}`);
      console.log(`  Size: ${sizeKB} KB`);
      console.log(`  Modified: ${stats.mtime.toLocaleString()}`);
    }
    
    // Health check
    console.log(`\n${colors.blue}🏥 Health Check${colors.reset}`);
    console.log('─'.repeat(40));
    
    const healthChecks = [];
    
    // Check if rebuild is overdue
    if (metadata?.lastRebuild) {
      const hoursSinceRebuild = (Date.now() - new Date(metadata.lastRebuild)) / (1000 * 60 * 60);
      if (hoursSinceRebuild > 24) {
        healthChecks.push({
          status: 'warning',
          message: 'Last rebuild was more than 24 hours ago'
        });
      } else {
        healthChecks.push({
          status: 'ok',
          message: 'Rebuild schedule is up to date'
        });
      }
    }
    
    // Check product count
    if (productCount < 1000) {
      healthChecks.push({
        status: 'error',
        message: `Low product count: ${productCount} (expected 2000+)`
      });
    } else {
      healthChecks.push({
        status: 'ok',
        message: `Product count normal: ${productCount}`
      });
    }
    
    // Check indexes
    if (indexes.length < 5) {
      healthChecks.push({
        status: 'warning',
        message: `Low index count: ${indexes.length} (expected 5+)`
      });
    } else {
      healthChecks.push({
        status: 'ok',
        message: `Index count normal: ${indexes.length}`
      });
    }
    
    // Display health check results
    healthChecks.forEach(check => {
      let icon, color;
      switch(check.status) {
        case 'ok':
          icon = '✅';
          color = colors.green;
          break;
        case 'warning':
          icon = '⚠️ ';
          color = colors.yellow;
          break;
        case 'error':
          icon = '❌';
          color = colors.red;
          break;
      }
      console.log(`${icon} ${color}${check.message}${colors.reset}`);
    });
    
    // Summary
    const overallHealth = healthChecks.every(c => c.status === 'ok') ? 'HEALTHY' :
                         healthChecks.some(c => c.status === 'error') ? 'CRITICAL' : 'WARNING';
    
    const healthColor = overallHealth === 'HEALTHY' ? colors.green :
                       overallHealth === 'CRITICAL' ? colors.red : colors.yellow;
    
    console.log(`\n${colors.cyan}═══════════════════════════════════════════════════════════${colors.reset}`);
    console.log(`Overall Status: ${healthColor}${overallHealth}${colors.reset}`);
    console.log(`${colors.cyan}═══════════════════════════════════════════════════════════${colors.reset}\n`);
    
  } catch (error) {
    console.error(`${colors.red}Error monitoring rebuild status:${colors.reset}`, error.message);
    process.exit(1);
  } finally {
    if (client) {
      await client.close();
    }
  }
}

// Run the monitor
monitorRebuildStatus().catch(console.error);