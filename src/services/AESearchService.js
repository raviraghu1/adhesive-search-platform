import dbConnection from '../database/connection.js';
import logger from '../utils/logger.js';

class AESearchService {
  constructor() {
    this.db = null;
    this.productsCollection = null;
    this.documentsCollection = null;
  }

  async initialize() {
    try {
      // Connect to database if not already connected
      if (!dbConnection.db) {
        await dbConnection.connectNative();
      }
      
      // Get the database instance
      this.db = dbConnection.db;
      this.productsCollection = this.db.collection('AESearchDatabase');
      this.documentsCollection = this.db.collection('AdhesivePDSDocumentMaster');
      logger.info('AE Search Service initialized');
      return true;
    } catch (error) {
      logger.error('Failed to initialize AE Search Service:', error);
      throw error;
    }
  }

  /**
   * Search products in AESearchDatabase
   */
  async searchProducts(queryText, options = {}) {
    try {
      if (!this.productsCollection) {
        await this.initialize();
      }

      const {
        limit = 25,
        offset = 0,
        filters = {}
      } = options;

      // Build search query
      const searchQuery = this.buildSearchQuery(queryText, filters);
      
      logger.debug('AE Search Query:', searchQuery);

      // Execute search
      const [products, totalCount] = await Promise.all([
        this.productsCollection
          .find(searchQuery)
          .skip(offset)
          .limit(limit)
          .toArray(),
        this.productsCollection.countDocuments(searchQuery)
      ]);

      // Get related documents for found products
      const productIds = products.map(p => p.productId);
      const documents = await this.findRelatedDocuments(productIds);

      return {
        query: queryText,
        products,
        documents,
        totalCount,
        pagination: {
          limit,
          offset,
          hasMore: offset + products.length < totalCount
        }
      };
    } catch (error) {
      logger.error('AE Search error:', error);
      return {
        query: queryText,
        products: [],
        documents: [],
        totalCount: 0,
        error: 'Search failed',
        pagination: {
          limit: options.limit || 25,
          offset: options.offset || 0,
          hasMore: false
        }
      };
    }
  }

  /**
   * Build search query for AESearchDatabase
   */
  buildSearchQuery(queryText, filters = {}) {
    const query = {};
    
    if (!queryText) {
      return query;
    }

    const searchTerm = queryText.toLowerCase();

    // Build text search or regex search
    if (searchTerm) {
      query.$or = [
        { productId: { $regex: searchTerm, $options: 'i' } },
        { name: { $regex: searchTerm, $options: 'i' } },
        { category: { $regex: searchTerm, $options: 'i' } },
        { subcategory: { $regex: searchTerm, $options: 'i' } },
        { 'specifications.xNumbers': { $regex: searchTerm, $options: 'i' } },
        { searchKeywords: { $regex: searchTerm, $options: 'i' } }
      ];

      // Check for specific product types
      const productTypes = ['epoxy', 'silicone', 'acrylic', 'polyurethane', 'cyanoacrylate'];
      const matchedType = productTypes.find(type => searchTerm.includes(type));
      if (matchedType) {
        query.category = { $regex: matchedType, $options: 'i' };
        delete query.$or; // Use category match instead of OR
      }
    }

    // Apply additional filters
    if (filters.category) {
      query.category = filters.category;
    }
    if (filters.subcategory) {
      query.subcategory = filters.subcategory;
    }

    return query;
  }

  /**
   * Find related documents for products
   */
  async findRelatedDocuments(productIds) {
    try {
      if (!productIds || productIds.length === 0) {
        return [];
      }

      const documents = await this.documentsCollection
        .find({
          $or: [
            { productIds: { $in: productIds } },
            { primaryProductId: { $in: productIds } },
            { 'aeAttributes.pdsProduct': { $in: productIds } }
          ]
        })
        .limit(10)
        .toArray();

      return documents;
    } catch (error) {
      logger.error('Error finding related documents:', error);
      return [];
    }
  }

  /**
   * Get autofill suggestions
   */
  async getAutofillSuggestions(prefix, limit = 10) {
    try {
      if (!this.productsCollection) {
        await this.initialize();
      }

      const regex = new RegExp(`^${prefix}`, 'i');
      
      // Get unique product IDs and names
      const suggestions = await this.productsCollection
        .find({
          $or: [
            { productId: regex },
            { name: regex },
            { 'specifications.xNumbers': regex }
          ]
        })
        .project({ productId: 1, name: 1 })
        .limit(limit)
        .toArray();

      return suggestions.map(s => s.productId || s.name);
    } catch (error) {
      logger.error('Error getting suggestions:', error);
      return [];
    }
  }

  /**
   * Search by X_NUMBER
   */
  async searchByXNumber(xNumber) {
    try {
      if (!this.productsCollection) {
        await this.initialize();
      }

      const products = await this.productsCollection
        .find({
          $or: [
            { productId: xNumber },
            { 'specifications.xNumbers': xNumber }
          ]
        })
        .toArray();

      return products;
    } catch (error) {
      logger.error('Error searching by X_NUMBER:', error);
      return [];
    }
  }

  /**
   * Get product categories
   */
  async getCategories() {
    try {
      if (!this.productsCollection) {
        await this.initialize();
      }

      const categories = await this.productsCollection.distinct('category');
      return categories.filter(c => c); // Remove null/empty values
    } catch (error) {
      logger.error('Error getting categories:', error);
      return [];
    }
  }
}

// Create singleton instance
const aeSearchService = new AESearchService();

export default aeSearchService;