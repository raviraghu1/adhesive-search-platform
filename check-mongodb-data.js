import { MongoClient } from 'mongodb';
import dotenv from 'dotenv';

dotenv.config();

async function checkData() {
  const client = new MongoClient(process.env.MONGODB_URI);
  
  try {
    await client.connect();
    console.log('Connected to MongoDB Atlas');
    
    const db = client.db('PDSAdhesiveSearch');
    
    // Check each collection
    const collections = [
      'AESearchDatabase',
      'AdhesivePDSDocumentMaster', 
      'PDSAdhesiveSearchCollection',
      'CustomerPreferences',
      'KnowledgeBase'
    ];
    
    for (const collectionName of collections) {
      const collection = db.collection(collectionName);
      const count = await collection.countDocuments();
      console.log(`\n${collectionName}: ${count} documents`);
      
      if (count > 0) {
        const sample = await collection.findOne();
        console.log('Sample document fields:', Object.keys(sample));
      }
    }
    
    // Try to find products in AESearchDatabase
    const products = db.collection('AESearchDatabase');
    const productCount = await products.countDocuments();
    
    if (productCount > 0) {
      console.log('\n--- Sample Product ---');
      const sampleProduct = await products.findOne();
      console.log(JSON.stringify(sampleProduct, null, 2));
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.close();
  }
}

checkData();