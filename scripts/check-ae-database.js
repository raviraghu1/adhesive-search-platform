import { MongoClient } from 'mongodb';
import dotenv from 'dotenv';

dotenv.config();

async function checkAEDatabase() {
  const client = new MongoClient(process.env.MONGODB_URI);
  
  try {
    await client.connect();
    console.log('✅ Connected to MongoDB');
    
    // Check for PDSAdhesives database
    const adminDb = client.db('admin');
    const databases = await adminDb.admin().listDatabases();
    console.log('\n📚 Available Databases:');
    databases.databases.forEach(db => {
      if (db.name.includes('PDS') || db.name.includes('Adhesive')) {
        console.log(`  - ${db.name}`);
      }
    });
    
    // Check PDSAdhesives database
    const pdsDb = client.db('PDSAdhesives');
    const pdsCollections = await pdsDb.listCollections().toArray();
    console.log('\n📂 Collections in PDSAdhesives:');
    pdsCollections.forEach(col => {
      console.log(`  - ${col.name}`);
    });
    
    // Check AEDatabase collection
    const aeCollection = pdsDb.collection('AEDatabase');
    const aeCount = await aeCollection.countDocuments();
    console.log(`\n📊 AEDatabase has ${aeCount} documents`);
    
    if (aeCount > 0) {
      // Sample a document to see structure
      const sample = await aeCollection.findOne();
      console.log('\n🔍 Sample AEDatabase document structure:');
      console.log(JSON.stringify(sample, null, 2).substring(0, 1000) + '...');
      
      // Check what fields might link to documents
      const keys = Object.keys(sample || {});
      console.log('\n🔑 Top-level fields in AEDatabase:');
      keys.forEach(key => {
        console.log(`  - ${key}: ${typeof sample[key]}`);
      });
    }
    
    // Check PDSAdhesiveSearch database
    const searchDb = client.db('PDSAdhesiveSearch');
    
    // Check AdhesivePDSDocumentMaster
    const docMaster = searchDb.collection('AdhesivePDSDocumentMaster');
    const docCount = await docMaster.countDocuments();
    console.log(`\n📄 AdhesivePDSDocumentMaster has ${docCount} documents`);
    
    if (docCount > 0) {
      const docSample = await docMaster.findOne();
      console.log('\n🔍 Sample Document structure:');
      console.log(JSON.stringify(docSample, null, 2).substring(0, 500) + '...');
    }
    
    // Check for potential linking fields
    console.log('\n🔗 Checking for potential links...');
    
    // Look for documents that might have product IDs
    const docsWithProductId = await docMaster.findOne({ productId: { $exists: true } });
    if (docsWithProductId) {
      console.log('  ✓ Documents have productId field');
    }
    
    // Look for AEDatabase entries with document references
    if (aeCount > 0) {
      const aeWithDocs = await aeCollection.findOne({ 
        $or: [
          { documentId: { $exists: true } },
          { documents: { $exists: true } },
          { relatedDocuments: { $exists: true } }
        ]
      });
      if (aeWithDocs) {
        console.log('  ✓ AEDatabase has document references');
        console.log('    Fields:', Object.keys(aeWithDocs).filter(k => 
          k.includes('doc') || k.includes('Doc')
        ));
      }
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await client.close();
  }
}

checkAEDatabase();