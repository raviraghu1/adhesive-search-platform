import mongoose from 'mongoose';
import { MongoClient } from 'mongodb';
import config from '../config/index.js';
import logger from '../utils/logger.js';

class DatabaseConnection {
  constructor() {
    this.mongoClient = null;
    this.db = null;
    this.isConnected = false;
  }

  /**
   * Connect to MongoDB using Mongoose for ODM
   */
  async connectMongoose() {
    try {
      mongoose.set('strictQuery', false);
      
      await mongoose.connect(config.mongodb.uri, config.mongodb.options);

      this.isConnected = true;
      logger.info('Mongoose connected to MongoDB');

      // Handle connection events
      mongoose.connection.on('error', (err) => {
        logger.error('MongoDB connection error:', err);
      });

      mongoose.connection.on('disconnected', () => {
        logger.warn('MongoDB disconnected');
        this.isConnected = false;
      });

      mongoose.connection.on('reconnected', () => {
        logger.info('MongoDB reconnected');
        this.isConnected = true;
      });

      return mongoose.connection;
    } catch (error) {
      logger.error('Failed to connect to MongoDB with Mongoose:', error);
      throw error;
    }
  }

  /**
   * Connect to MongoDB using native driver for advanced operations
   */
  async connectNative() {
    try {
      this.mongoClient = new MongoClient(config.mongodb.uri);
      await this.mongoClient.connect();
      
      this.db = this.mongoClient.db(config.mongodb.dbName);
      logger.info('Native MongoDB client connected');

      return this.db;
    } catch (error) {
      logger.error('Failed to connect to MongoDB with native driver:', error);
      throw error;
    }
  }

  /**
   * Get collection from native MongoDB connection
   */
  getCollection(collectionName) {
    if (!this.db) {
      throw new Error('Database not connected. Call connectNative() first.');
    }
    return this.db.collection(collectionName);
  }

  /**
   * Create indexes for optimal search performance
   */
  async createIndexes() {
    try {
      const productsCollection = this.getCollection(config.mongodb.collections.products);
      
      // Text search index
      await productsCollection.createIndex(
        { name: 'text', description: 'text' },
        { weights: { name: 10, description: 5 } }
      );

      // Compound indexes for common queries
      await productsCollection.createIndex({
        'specifications.thermal.temperature_range.max': 1,
        'specifications.mechanical.tensile_strength.value': -1,
      });

      await productsCollection.createIndex({
        category: 1,
        subcategory: 1,
        status: 1,
      });

      // Single field indexes
      await productsCollection.createIndex({ productId: 1 }, { unique: true });
      await productsCollection.createIndex({ 'applications.industries': 1 });
      await productsCollection.createIndex({ 'substrates.metals': 1 });
      await productsCollection.createIndex({ 'compliance.environmental': 1 });

      // Knowledge base indexes
      const knowledgeCollection = this.getCollection(config.mongodb.collections.knowledge);
      
      await knowledgeCollection.createIndex({ entityId: 1 }, { unique: true });
      await knowledgeCollection.createIndex({ type: 1, status: 1 });
      await knowledgeCollection.createIndex({ 'relationships.products': 1 });
      
      // Customer preferences indexes
      const preferencesCollection = this.getCollection(config.mongodb.collections.preferences);
      
      await preferencesCollection.createIndex({ customerId: 1 }, { unique: true });
      await preferencesCollection.createIndex({ companyId: 1 });

      logger.info('Database indexes created successfully');
    } catch (error) {
      logger.error('Error creating indexes:', error);
      throw error;
    }
  }

  /**
   * Create Atlas Search indexes (Note: These need to be created via Atlas UI or API)
   */
  async createAtlasSearchIndexes() {
    try {
      const productsCollection = this.getCollection(config.mongodb.collections.products);
      
      // This is a placeholder - Atlas Search indexes must be created via UI or Management API
      const searchIndexDefinition = {
        name: 'default',
        definition: {
          mappings: {
            dynamic: false,
            fields: {
              name: {
                type: 'string',
                analyzer: 'lucene.standard',
              },
              description: {
                type: 'string',
                analyzer: 'lucene.english',
              },
              'specifications': {
                type: 'document',
                dynamic: true,
              },
              'search_data.vectors.product_embedding': {
                type: 'knnVector',
                dimensions: config.search.vectorDimensions,
                similarity: 'cosine',
              },
            },
          },
        },
      };

      logger.info('Atlas Search index definition prepared:', searchIndexDefinition);
      logger.info('Please create Atlas Search indexes via MongoDB Atlas UI');
      
      return searchIndexDefinition;
    } catch (error) {
      logger.error('Error preparing Atlas Search indexes:', error);
      throw error;
    }
  }

  /**
   * Test database connection
   */
  async testConnection() {
    try {
      if (this.db) {
        await this.db.admin().ping();
        logger.info('Database connection test successful');
        return true;
      }
      return false;
    } catch (error) {
      logger.error('Database connection test failed:', error);
      return false;
    }
  }

  /**
   * Close database connections
   */
  async close() {
    try {
      if (mongoose.connection.readyState !== 0) {
        await mongoose.connection.close();
      }
      
      if (this.mongoClient) {
        await this.mongoClient.close();
      }
      
      this.isConnected = false;
      logger.info('Database connections closed');
    } catch (error) {
      logger.error('Error closing database connections:', error);
      throw error;
    }
  }

  /**
   * Get database statistics
   */
  async getStats() {
    try {
      const stats = await this.db.stats();
      const collections = await this.db.listCollections().toArray();
      
      return {
        database: config.mongodb.dbName,
        collections: collections.map(c => c.name),
        dataSize: stats.dataSize,
        indexes: stats.indexes,
        documents: stats.objects,
      };
    } catch (error) {
      logger.error('Error getting database stats:', error);
      throw error;
    }
  }
}

// Create singleton instance
const dbConnection = new DatabaseConnection();

export default dbConnection;