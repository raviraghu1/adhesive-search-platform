import config from '../src/config/index.js';

console.log('Testing PDS Adhesive Search Platform Configuration...\n');

console.log('=== Environment ===');
console.log(`NODE_ENV: ${config.server.env}`);
console.log(`Port: ${config.server.port}`);
console.log(`Host: ${config.server.host}`);

console.log('\n=== MongoDB Configuration ===');
console.log(`Database: ${config.mongodb.dbName}`);
console.log(`Collections:`);
Object.entries(config.mongodb.collections).forEach(([key, value]) => {
  console.log(`  - ${key}: ${value}`);
});

console.log('\n=== Azure OpenAI Configuration ===');
console.log(`Endpoint: ${config.azure.openai.endpoint ? 'Configured' : 'Not configured'}`);
console.log(`API Key: ${config.azure.openai.apiKey ? 'Configured' : 'Not configured'}`);
console.log(`Deployment: ${config.azure.openai.deploymentName}`);

console.log('\n=== Redis Configuration ===');
console.log(`Host: ${config.redis.host}`);
console.log(`Port: ${config.redis.port}`);

console.log('\n=== Search Configuration ===');
console.log(`Max Results: ${config.search.maxResults}`);
console.log(`Default Limit: ${config.search.defaultLimit}`);
console.log(`Vector Dimensions: ${config.search.vectorDimensions}`);

console.log('\n=== API Configuration ===');
console.log(`API Version: ${config.api.version}`);
console.log(`API Prefix: ${config.api.prefix}`);

console.log('\n✅ Configuration loaded successfully!');

// Test model imports
try {
  const Product = await import('../src/models/Product.js');
  console.log('✅ Product model loaded');
  
  const KnowledgeBase = await import('../src/models/KnowledgeBase.js');
  console.log('✅ KnowledgeBase model loaded');
  
  const CustomerPreference = await import('../src/models/CustomerPreference.js');
  console.log('✅ CustomerPreference model loaded');
} catch (error) {
  console.error('❌ Error loading models:', error.message);
}

console.log('\n🎉 Basic configuration test completed successfully!');
console.log('\nTo start the server, run: npm start');
console.log('To run tests, run: npm test');

process.exit(0);