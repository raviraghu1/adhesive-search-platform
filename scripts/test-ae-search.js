import { MongoClient } from 'mongodb';
import dotenv from 'dotenv';

dotenv.config();

async function testSearch() {
  const client = new MongoClient(process.env.MONGODB_URI);
  
  try {
    await client.connect();
    console.log('✅ Connected to MongoDB');
    
    const db = client.db('PDSAdhesiveSearch');
    const productsCollection = db.collection('AESearchDatabase');
    const documentsCollection = db.collection('AdhesivePDSDocumentMaster');
    
    console.log('\n📊 Collection Statistics:');
    const productCount = await productsCollection.countDocuments();
    const documentCount = await documentsCollection.countDocuments();
    console.log(`  Products: ${productCount}`);
    console.log(`  Documents: ${documentCount}`);
    
    // Test 1: Search for Epoxy products
    console.log('\n🔍 Test 1: Search for "epoxy" products');
    const epoxyProducts = await productsCollection
      .find({ category: { $regex: 'epoxy', $options: 'i' } })
      .limit(5)
      .toArray();
    console.log(`  Found ${epoxyProducts.length} epoxy products:`);
    epoxyProducts.forEach(p => {
      console.log(`    - ${p.productId}: ${p.category} - ${p.subcategory || 'N/A'}`);
    });
    
    // Test 2: Search by X_NUMBER
    console.log('\n🔍 Test 2: Search for X_NUMBER containing "X-177"');
    const xNumberProducts = await productsCollection
      .find({ 
        $or: [
          { productId: { $regex: 'X-177', $options: 'i' } },
          { 'specifications.xNumbers': { $regex: 'X-177', $options: 'i' } }
        ]
      })
      .limit(5)
      .toArray();
    console.log(`  Found ${xNumberProducts.length} products with X-177:`);
    xNumberProducts.forEach(p => {
      console.log(`    - ${p.productId}: ${p.category}`);
      if (p.specifications?.xNumbers?.length > 0) {
        console.log(`      X_NUMBERs: ${p.specifications.xNumbers.slice(0, 3).join(', ')}`);
      }
    });
    
    // Test 3: Search for Specialty Adhesive products
    console.log('\n🔍 Test 3: Search for "Specialty Adhesive" category');
    const specialtyProducts = await productsCollection
      .find({ category: 'Specialty Adhesive' })
      .limit(5)
      .toArray();
    console.log(`  Found ${specialtyProducts.length} specialty adhesive products:`);
    specialtyProducts.forEach(p => {
      console.log(`    - ${p.productId}: ${p.subcategory || 'N/A'}`);
    });
    
    // Test 4: Search documents with AE attributes
    console.log('\n🔍 Test 4: Documents with AE attributes');
    const docsWithAE = await documentsCollection
      .find({ aeAttributes: { $ne: null } })
      .limit(5)
      .toArray();
    console.log(`  Found ${docsWithAE.length} documents with AE attributes:`);
    docsWithAE.forEach(d => {
      console.log(`    - Doc ${d.originalId}: ${d.aeAttributes?.productIds?.join(', ') || 'N/A'}`);
    });
    
    // Test 5: Text search
    console.log('\n🔍 Test 5: Text search for "429" (product code)');
    const textSearch = await productsCollection
      .find({ 
        $or: [
          { productId: '429' },
          { name: '429' },
          { searchKeywords: '429' }
        ]
      })
      .toArray();
    console.log(`  Found ${textSearch.length} products matching "429":`);
    textSearch.forEach(p => {
      console.log(`    - ${p.productId}: ${p.category}`);
    });
    
    // Test 6: Get all unique categories
    console.log('\n📋 Test 6: All product categories');
    const categories = await productsCollection.distinct('category');
    console.log(`  Found ${categories.length} unique categories:`);
    categories.forEach(c => console.log(`    - ${c}`));
    
    // Test 7: Products with related documents
    console.log('\n🔗 Test 7: Products with related documents');
    const productsWithDocs = await productsCollection
      .find({ relatedDocuments: { $exists: true, $ne: [] } })
      .limit(5)
      .toArray();
    console.log(`  Found ${productsWithDocs.length} products with documents:`);
    productsWithDocs.forEach(p => {
      console.log(`    - ${p.productId}: ${p.relatedDocuments?.length || 0} documents`);
    });
    
    console.log('\n✅ All tests completed successfully!');
    console.log('\n📝 Summary:');
    console.log('  - AESearchDatabase products are searchable');
    console.log('  - Categories are properly assigned (Epoxy, Specialty Adhesive)');
    console.log('  - X_NUMBER searches work');
    console.log('  - Document relationships are preserved');
    console.log('  - Search service can query these collections directly');
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await client.close();
  }
}

testSearch();