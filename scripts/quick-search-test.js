import AESearchService from '../src/services/AESearchService.js';

async function quickSearchTest() {
  console.log('🔍 Quick Search Verification\n');
  
  try {
    await AESearchService.initialize();
    
    // Test specific searches
    const tests = [
      { query: 'X-177-051-C', description: 'Exact X_NUMBER search' },
      { query: '429', description: 'Product code search' },
      { query: 'epoxy high temperature', description: 'Multi-word search' },
      { query: '1-CN0025', description: 'Specialty adhesive search' },
      { query: 'flex circuit', description: 'Description search' }
    ];
    
    for (const test of tests) {
      console.log(`\n📌 ${test.description}: "${test.query}"`);
      console.log('-'.repeat(50));
      
      const results = await AESearchService.searchProducts(test.query, { limit: 3 });
      console.log(`Found ${results.totalCount} products`);
      
      if (results.products.length > 0) {
        results.products.forEach(p => {
          console.log(`  • ${p.productId}: ${p.category}`);
          if (p.description) {
            console.log(`    ${p.description.substring(0, 60)}...`);
          }
        });
      } else {
        console.log('  No products found');
      }
    }
    
    console.log('\n✅ Search verification complete!');
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

quickSearchTest();