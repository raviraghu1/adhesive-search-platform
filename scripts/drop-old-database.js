#!/usr/bin/env node

import { MongoClient } from 'mongodb';
import dotenv from 'dotenv';
import readline from 'readline';

dotenv.config();

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

async function dropOldDatabase() {
  const client = new MongoClient(process.env.MONGODB_URI);
  
  try {
    await client.connect();
    console.log('✅ Connected to MongoDB Atlas');
    
    // Check if old database exists
    const admin = client.db().admin();
    const databases = await admin.listDatabases();
    const oldDbExists = databases.databases.some(db => db.name === 'PDSAdhesive');
    
    if (!oldDbExists) {
      console.log('ℹ️  Database "PDSAdhesive" does not exist.');
      return;
    }
    
    // Show what's in the old database
    console.log('\n📊 Found old database "PDSAdhesive"');
    const oldDb = client.db('PDSAdhesive');
    const collections = await oldDb.listCollections().toArray();
    
    console.log('Collections in PDSAdhesive:');
    for (const coll of collections) {
      const count = await oldDb.collection(coll.name).countDocuments();
      console.log(`  - ${coll.name}: ${count} documents`);
    }
    
    // Confirm before dropping
    console.log('\n⚠️  WARNING: This will permanently delete the PDSAdhesive database!');
    console.log('The new database PDSAdhesiveSearch has been created with all data migrated.');
    
    rl.question('\nDo you want to drop the old "PDSAdhesive" database? (yes/no): ', async (answer) => {
      if (answer.toLowerCase() === 'yes') {
        console.log('\n🗑️  Dropping old database...');
        await oldDb.dropDatabase();
        console.log('✅ Successfully dropped "PDSAdhesive" database');
        
        // Verify new database
        console.log('\n📊 Verifying new database "PDSAdhesiveSearch":');
        const newDb = client.db('PDSAdhesiveSearch');
        const newCollections = await newDb.listCollections().toArray();
        
        for (const coll of newCollections) {
          const count = await newDb.collection(coll.name).countDocuments();
          console.log(`  - ${coll.name}: ${count} documents`);
        }
        
        console.log('\n✅ Migration complete! Now using PDSAdhesiveSearch database.');
      } else {
        console.log('❌ Operation cancelled. Old database retained.');
      }
      
      rl.close();
      await client.close();
    });
    
  } catch (error) {
    console.error('❌ Error:', error);
    rl.close();
    await client.close();
  }
}

// Run the script
dropOldDatabase();