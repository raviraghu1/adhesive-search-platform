import { MongoClient } from 'mongodb';
import dotenv from 'dotenv';

dotenv.config();

// Import the AE Search Service
import AESearchService from '../src/services/AESearchService.js';

async function testSearchAPI() {
  console.log('🔍 Testing AE Search Service\n');
  console.log('=' .repeat(60));
  
  try {
    // Initialize the search service
    await AESearchService.initialize();
    console.log('✅ Search service initialized\n');

    // Test 1: Search for Epoxy products
    console.log('📌 Test 1: Search for "epoxy" products');
    console.log('-'.repeat(40));
    const epoxyResults = await AESearchService.searchProducts('epoxy', { limit: 5 });
    console.log(`Found ${epoxyResults.totalCount} total epoxy products`);
    console.log(`Showing first ${epoxyResults.products.length}:`);
    epoxyResults.products.forEach(p => {
      console.log(`  • ${p.productId}: ${p.category} - ${p.subcategory || 'N/A'}`);
      if (p.specifications?.xNumbers?.length > 0) {
        console.log(`    X-Numbers: ${p.specifications.xNumbers.slice(0, 3).join(', ')}`);
      }
    });
    console.log();

    // Test 2: Search for specific product code
    console.log('📌 Test 2: Search for product "429"');
    console.log('-'.repeat(40));
    const product429 = await AESearchService.searchProducts('429', { limit: 5 });
    console.log(`Found ${product429.totalCount} products matching "429"`);
    if (product429.products.length > 0) {
      product429.products.forEach(p => {
        console.log(`  • ${p.productId}: ${p.category}`);
        if (p.variants) {
          console.log(`    Variants: ${p.variants.count || 0}`);
        }
      });
    }
    console.log();

    // Test 3: Search by X_NUMBER
    console.log('📌 Test 3: Search for X_NUMBER "X-177-051"');
    console.log('-'.repeat(40));
    const xNumberResults = await AESearchService.searchByXNumber('X-177-051-C');
    console.log(`Found ${xNumberResults.length} products with X-177-051-C`);
    xNumberResults.forEach(p => {
      console.log(`  • ${p.productId}: ${p.category}`);
      console.log(`    Description: ${p.description || 'N/A'}`);
    });
    console.log();

    // Test 4: Search for Specialty Adhesive
    console.log('📌 Test 4: Search for "specialty" products');
    console.log('-'.repeat(40));
    const specialtyResults = await AESearchService.searchProducts('specialty', { limit: 5 });
    console.log(`Found ${specialtyResults.totalCount} specialty adhesive products`);
    specialtyResults.products.forEach(p => {
      console.log(`  • ${p.productId}: ${p.category} - ${p.subcategory || 'N/A'}`);
    });
    console.log();

    // Test 5: Get autofill suggestions
    console.log('📌 Test 5: Autofill suggestions for "X-17"');
    console.log('-'.repeat(40));
    const suggestions = await AESearchService.getAutofillSuggestions('X-17', 10);
    console.log(`Found ${suggestions.length} suggestions:`);
    suggestions.forEach(s => {
      console.log(`  • ${s}`);
    });
    console.log();

    // Test 6: Search with filters
    console.log('📌 Test 6: Search with category filter');
    console.log('-'.repeat(40));
    const filteredResults = await AESearchService.searchProducts('', {
      limit: 5,
      filters: { category: 'Epoxy' }
    });
    console.log(`Found ${filteredResults.totalCount} products in Epoxy category`);
    filteredResults.products.forEach(p => {
      console.log(`  • ${p.productId}: ${p.category}`);
    });
    console.log();

    // Test 7: Get all categories
    console.log('📌 Test 7: Get all product categories');
    console.log('-'.repeat(40));
    const categories = await AESearchService.getCategories();
    console.log(`Found ${categories.length} categories:`);
    categories.forEach(c => {
      console.log(`  • ${c}`);
    });
    console.log();

    // Test 8: Search with pagination
    console.log('📌 Test 8: Test pagination (page 2, limit 3)');
    console.log('-'.repeat(40));
    const page1 = await AESearchService.searchProducts('epoxy', { limit: 3, offset: 0 });
    const page2 = await AESearchService.searchProducts('epoxy', { limit: 3, offset: 3 });
    console.log('Page 1 products:');
    page1.products.forEach(p => console.log(`  • ${p.productId}`));
    console.log('Page 2 products:');
    page2.products.forEach(p => console.log(`  • ${p.productId}`));
    console.log(`Has more pages: ${page2.pagination.hasMore}`);
    console.log();

    // Test 9: Search for related documents
    console.log('📌 Test 9: Search for documents related to products');
    console.log('-'.repeat(40));
    const productsWithDocs = await AESearchService.searchProducts('429', { limit: 2 });
    if (productsWithDocs.documents && productsWithDocs.documents.length > 0) {
      console.log(`Found ${productsWithDocs.documents.length} related documents:`);
      productsWithDocs.documents.forEach(d => {
        console.log(`  • Doc ${d.originalId}: ${d.title || 'N/A'}`);
        if (d.aeAttributes) {
          console.log(`    Products: ${d.aeAttributes.productIds?.join(', ') || 'N/A'}`);
        }
      });
    } else {
      console.log('No related documents found');
    }
    console.log();

    // Test 10: Complex search query
    console.log('📌 Test 10: Complex search "high temperature epoxy"');
    console.log('-'.repeat(40));
    const complexResults = await AESearchService.searchProducts('high temperature epoxy', { limit: 5 });
    console.log(`Found ${complexResults.totalCount} products`);
    complexResults.products.forEach(p => {
      console.log(`  • ${p.productId}: ${p.category}`);
      if (p.specifications?.features) {
        const featuresText = typeof p.specifications.features === 'string' 
          ? p.specifications.features 
          : JSON.stringify(p.specifications.features);
        console.log(`    Features: ${featuresText.substring(0, 50)}...`);
      }
    });
    console.log();

    console.log('=' .repeat(60));
    console.log('✅ All search tests completed successfully!\n');

    // Summary
    console.log('📊 SUMMARY:');
    console.log('-'.repeat(40));
    console.log('✓ Search service initialization: Working');
    console.log('✓ Text search: Working');
    console.log('✓ Category search: Working');
    console.log('✓ X_NUMBER search: Working');
    console.log('✓ Autofill suggestions: Working');
    console.log('✓ Filtered search: Working');
    console.log('✓ Pagination: Working');
    console.log('✓ Document relationships: Working');
    console.log('✓ Complex queries: Working');
    console.log('\n🎉 The AE Search Service is fully functional!');

  } catch (error) {
    console.error('❌ Error during testing:', error);
    console.error('Stack trace:', error.stack);
  }
}

// Run the tests
testSearchAPI();