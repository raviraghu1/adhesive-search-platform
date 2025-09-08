import app from './app.js';
import config from './config/index.js';
import logger from './utils/logger.js';
import dbConnection from './database/connection.js';
import knowledgeBaseService from './services/KnowledgeBaseService.js';
import searchService from './services/SearchService.js';

// Start server
const startServer = async () => {
  try {
    logger.info('Starting PDS Adhesive Intelligent Search Platform...');
    
    // Connect to MongoDB Atlas
    logger.info('Connecting to MongoDB Atlas...');
    await dbConnection.connectMongoose();
    await dbConnection.connectNative();
    logger.info('MongoDB Atlas connected successfully');
    
    // Test database connection
    const isConnected = await dbConnection.testConnection();
    if (!isConnected) {
      throw new Error('Database connection test failed');
    }
    
    // Create indexes
    logger.info('Creating database indexes...');
    await dbConnection.createIndexes();
    
    // Initialize services
    logger.info('Initializing services...');
    await knowledgeBaseService.initialize();
    await searchService.initialize();
    logger.info('Services initialized successfully');
    
    // Get database stats
    const stats = await dbConnection.getStats();
    logger.info('Database statistics:', stats);
    
    // Start Express server
    const server = app.listen(config.server.port, config.server.host, () => {
      logger.info(`
        ========================================
        🚀 Server is running!
        ========================================
        📍 Environment: ${config.server.env}
        🌐 URL: http://${config.server.host}:${config.server.port}
        📚 API Docs: http://${config.server.host}:${config.server.port}/docs
        🔍 Knowledge Base: /api/kb/v1
        🔎 Search API: /api/v1
        ========================================
      `);
    });
    
    // Handle server errors
    server.on('error', (error) => {
      if (error.syscall !== 'listen') {
        throw error;
      }
      
      const bind = typeof config.server.port === 'string'
        ? `Pipe ${config.server.port}`
        : `Port ${config.server.port}`;
      
      switch (error.code) {
        case 'EACCES':
          logger.error(`${bind} requires elevated privileges`);
          process.exit(1);
          break;
        case 'EADDRINUSE':
          logger.error(`${bind} is already in use`);
          process.exit(1);
          break;
        default:
          throw error;
      }
    });
    
    return server;
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
};

// Start the server
startServer();

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error);
  process.exit(1);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});