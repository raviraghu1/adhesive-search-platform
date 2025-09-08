import KnowledgeBase from '../models/KnowledgeBase.js';
import Product from '../models/Product.js';
import logger from '../utils/logger.js';
import dbConnection from '../database/connection.js';
import config from '../config/index.js';

class KnowledgeBaseService {
  constructor() {
    this.initialized = false;
  }

  /**
   * Initialize the Knowledge Base service
   */
  async initialize() {
    try {
      logger.info('Initializing Knowledge Base Service...');
      
      // Ensure database connection
      if (!dbConnection.isConnected) {
        await dbConnection.connectNative();
        await dbConnection.connectMongoose();
      }
      
      // Create indexes if needed
      await this.ensureIndexes();
      
      this.initialized = true;
      logger.info('Knowledge Base Service initialized successfully');
      
      // Get initial stats
      const stats = await this.getStatistics();
      logger.info('Knowledge Base Statistics:', stats);
      
      return true;
    } catch (error) {
      logger.error('Failed to initialize Knowledge Base Service:', error);
      throw error;
    }
  }

  /**
   * Ensure required indexes exist
   */
  async ensureIndexes() {
    try {
      await KnowledgeBase.createIndexes();
      logger.info('Knowledge Base indexes ensured');
    } catch (error) {
      logger.error('Error creating Knowledge Base indexes:', error);
      throw error;
    }
  }

  /**
   * Extract and process data from source collections
   */
  async extractFromSources() {
    try {
      logger.info('Starting data extraction from source collections...');
      
      const productsCollection = dbConnection.getCollection(config.mongodb.collections.products);
      const documentsCollection = dbConnection.getCollection(config.mongodb.collections.documents);
      
      // Extract product data
      const products = await productsCollection.find({}).toArray();
      logger.info(`Found ${products.length} products to process`);
      
      // Extract document data
      const documents = await documentsCollection.find({}).toArray();
      logger.info(`Found ${documents.length} documents to process`);
      
      return { products, documents };
    } catch (error) {
      logger.error('Error extracting data from sources:', error);
      throw error;
    }
  }

  /**
   * Create knowledge entity from product data
   */
  async createProductKnowledgeEntity(productData) {
    try {
      const entityId = `KB-PROD-${productData.productId || productData._id}`;
      
      const knowledgeEntity = {
        entityId,
        type: 'product_info',
        title: productData.name || 'Unknown Product',
        summary: productData.description || '',
        
        content: {
          overview: productData.description,
          sections: this.extractProductSections(productData),
          full_text: this.generateProductFullText(productData),
          technical_data: {
            specifications: productData.specifications,
            test_results: productData.test_results,
            formulations: productData.chemical_composition,
          },
        },
        
        source: {
          type: 'database',
          location: config.mongodb.collections.products,
          last_modified: productData.updatedAt || new Date(),
        },
        
        relationships: {
          products: [productData.productId],
          categories: [productData.category, productData.subcategory].filter(Boolean),
          standards: this.extractStandards(productData),
        },
        
        metadata: {
          industry: productData.applications?.industries || [],
          applications: productData.applications?.specific_uses || [],
          tags: this.generateTags(productData),
          keywords: this.extractKeywords(productData),
        },
        
        search_data: {
          keywords: this.extractKeywords(productData),
          concepts: this.extractConcepts(productData),
          entities: [productData.productId, productData.name].filter(Boolean),
        },
        
        quality: {
          completeness: this.calculateCompleteness(productData),
          accuracy_score: 0.9, // Default high score for source data
          relevance: 1.0,
          freshness: 1.0,
        },
        
        status: 'published',
      };
      
      return knowledgeEntity;
    } catch (error) {
      logger.error('Error creating product knowledge entity:', error);
      throw error;
    }
  }

  /**
   * Extract sections from product data
   */
  extractProductSections(productData) {
    const sections = [];
    
    if (productData.specifications) {
      sections.push({
        heading: 'Technical Specifications',
        content: JSON.stringify(productData.specifications, null, 2),
        order: 1,
        entities: ['specifications'],
      });
    }
    
    if (productData.applications) {
      sections.push({
        heading: 'Applications',
        content: JSON.stringify(productData.applications, null, 2),
        order: 2,
        entities: productData.applications.industries || [],
      });
    }
    
    if (productData.substrates) {
      sections.push({
        heading: 'Substrate Compatibility',
        content: JSON.stringify(productData.substrates, null, 2),
        order: 3,
        entities: ['substrates'],
      });
    }
    
    if (productData.compliance) {
      sections.push({
        heading: 'Compliance & Certifications',
        content: JSON.stringify(productData.compliance, null, 2),
        order: 4,
        entities: productData.compliance.environmental || [],
      });
    }
    
    return sections;
  }

  /**
   * Generate full text content from product data
   */
  generateProductFullText(productData) {
    const parts = [
      productData.name,
      productData.description,
      productData.category,
      productData.subcategory,
    ];
    
    if (productData.applications?.industries) {
      parts.push(`Industries: ${productData.applications.industries.join(', ')}`);
    }
    
    if (productData.specifications?.thermal?.temperature_range) {
      const range = productData.specifications.thermal.temperature_range;
      parts.push(`Temperature range: ${range.min}°C to ${range.max}°C`);
    }
    
    return parts.filter(Boolean).join(' ');
  }

  /**
   * Extract standards from product data
   */
  extractStandards(productData) {
    const standards = [];
    
    if (productData.compliance?.industry) {
      standards.push(...productData.compliance.industry);
    }
    
    if (productData.specifications) {
      // Look for test methods in specifications
      const specs = JSON.stringify(productData.specifications);
      const astmMatches = specs.match(/ASTM\s+[A-Z]\d+/g) || [];
      const isoMatches = specs.match(/ISO\s+\d+/g) || [];
      standards.push(...astmMatches, ...isoMatches);
    }
    
    return [...new Set(standards)];
  }

  /**
   * Generate tags from product data
   */
  generateTags(productData) {
    const tags = [];
    
    if (productData.category) tags.push(productData.category);
    if (productData.subcategory) tags.push(productData.subcategory);
    
    if (productData.specifications?.cure?.cure_type) {
      tags.push(productData.specifications.cure.cure_type);
    }
    
    if (productData.specifications?.thermal?.temperature_range?.max > 150) {
      tags.push('high-temperature');
    }
    
    if (productData.specifications?.cure?.working_time?.value < 10) {
      tags.push('fast-cure');
    }
    
    return tags;
  }

  /**
   * Extract keywords from product data
   */
  extractKeywords(productData) {
    const text = `${productData.name} ${productData.description} ${productData.category}`.toLowerCase();
    const words = text.split(/\s+/).filter(word => word.length > 3);
    const uniqueWords = [...new Set(words)];
    return uniqueWords.slice(0, 30);
  }

  /**
   * Extract concepts from product data
   */
  extractConcepts(productData) {
    const concepts = [];
    
    if (productData.category) {
      concepts.push(`${productData.category}_adhesive`);
    }
    
    if (productData.applications?.industries) {
      productData.applications.industries.forEach(industry => {
        concepts.push(`${industry}_application`);
      });
    }
    
    if (productData.specifications?.cure?.cure_type) {
      concepts.push(`${productData.specifications.cure.cure_type}_cure`);
    }
    
    return concepts;
  }

  /**
   * Calculate completeness score for product data
   */
  calculateCompleteness(productData) {
    const requiredFields = ['productId', 'name', 'category', 'specifications'];
    const optionalFields = ['description', 'applications', 'substrates', 'compliance'];
    
    let score = 0;
    let total = requiredFields.length + optionalFields.length;
    
    requiredFields.forEach(field => {
      if (productData[field]) score += 1;
    });
    
    optionalFields.forEach(field => {
      if (productData[field]) score += 0.5;
    });
    
    return Math.min(score / total, 1);
  }

  /**
   * Build the complete knowledge base
   */
  async buildKnowledgeBase() {
    try {
      logger.info('Building Knowledge Base...');
      
      // Extract data from sources
      const { products, documents } = await this.extractFromSources();
      
      // Process products
      let processedCount = 0;
      let errorCount = 0;
      
      for (const product of products) {
        try {
          const knowledgeEntity = await this.createProductKnowledgeEntity(product);
          
          // Save or update in knowledge base
          await KnowledgeBase.findOneAndUpdate(
            { entityId: knowledgeEntity.entityId },
            knowledgeEntity,
            { upsert: true, new: true }
          );
          
          processedCount++;
          
          if (processedCount % 100 === 0) {
            logger.info(`Processed ${processedCount} products...`);
          }
        } catch (error) {
          logger.error(`Error processing product ${product.productId}:`, error);
          errorCount++;
        }
      }
      
      logger.info(`Knowledge Base build complete. Processed: ${processedCount}, Errors: ${errorCount}`);
      
      return {
        processed: processedCount,
        errors: errorCount,
        total: products.length,
      };
    } catch (error) {
      logger.error('Error building Knowledge Base:', error);
      throw error;
    }
  }

  /**
   * Query the knowledge base
   */
  async query(queryText, options = {}) {
    try {
      const startTime = Date.now();
      
      const {
        limit = 10,
        type = null,
        includeRelated = false,
      } = options;
      
      // Build query
      const query = {
        $text: { $search: queryText },
        status: 'published',
      };
      
      if (type) {
        query.type = type;
      }
      
      // Execute search
      const results = await KnowledgeBase
        .find(query)
        .limit(limit)
        .sort({ score: { $meta: 'textScore' } })
        .lean();
      
      // Include related entities if requested
      if (includeRelated && results.length > 0) {
        for (const result of results) {
          if (result.relationships?.related_documents?.length > 0) {
            result.related = await KnowledgeBase
              .find({ _id: { $in: result.relationships.related_documents } })
              .limit(3)
              .lean();
          }
        }
      }
      
      const duration = Date.now() - startTime;
      logger.logSearchQuery(queryText, results.length, duration);
      
      return {
        query: queryText,
        results,
        count: results.length,
        duration,
      };
    } catch (error) {
      logger.error('Error querying Knowledge Base:', error);
      throw error;
    }
  }

  /**
   * Get entity by ID
   */
  async getEntity(entityId) {
    try {
      const entity = await KnowledgeBase.findOne({ entityId }).lean();
      
      if (entity) {
        // Increment view count
        await KnowledgeBase.updateOne(
          { entityId },
          { $inc: { 'analytics.views': 1 } }
        );
      }
      
      return entity;
    } catch (error) {
      logger.error(`Error getting entity ${entityId}:`, error);
      throw error;
    }
  }

  /**
   * Search for entities by concept
   */
  async searchByConcept(concept, limit = 10) {
    try {
      const results = await KnowledgeBase
        .find({
          'search_data.concepts': concept,
          status: 'published',
        })
        .limit(limit)
        .lean();
      
      return results;
    } catch (error) {
      logger.error(`Error searching by concept ${concept}:`, error);
      throw error;
    }
  }

  /**
   * Get related entities
   */
  async getRelatedEntities(entityId, depth = 1) {
    try {
      const entity = await this.getEntity(entityId);
      
      if (!entity) {
        return [];
      }
      
      const related = [];
      
      // Get directly related products
      if (entity.relationships?.products?.length > 0) {
        const productEntities = await KnowledgeBase
          .find({
            'relationships.products': { $in: entity.relationships.products },
            entityId: { $ne: entityId },
          })
          .limit(5)
          .lean();
        
        related.push(...productEntities);
      }
      
      // Get entities with same categories
      if (entity.relationships?.categories?.length > 0) {
        const categoryEntities = await KnowledgeBase
          .find({
            'relationships.categories': { $in: entity.relationships.categories },
            entityId: { $ne: entityId },
          })
          .limit(5)
          .lean();
        
        related.push(...categoryEntities);
      }
      
      // Remove duplicates
      const uniqueRelated = Array.from(
        new Map(related.map(item => [item.entityId, item])).values()
      );
      
      return uniqueRelated.slice(0, 10);
    } catch (error) {
      logger.error(`Error getting related entities for ${entityId}:`, error);
      throw error;
    }
  }

  /**
   * Get knowledge base statistics
   */
  async getStatistics() {
    try {
      const totalEntities = await KnowledgeBase.countDocuments();
      const publishedEntities = await KnowledgeBase.countDocuments({ status: 'published' });
      
      const typeDistribution = await KnowledgeBase.aggregate([
        { $group: { _id: '$type', count: { $sum: 1 } } },
      ]);
      
      const avgQualityScore = await KnowledgeBase.aggregate([
        { $group: { _id: null, avgQuality: { $avg: '$quality.completeness_score' } } },
      ]);
      
      return {
        total: totalEntities,
        published: publishedEntities,
        types: typeDistribution,
        averageQuality: avgQualityScore[0]?.avgQuality || 0,
      };
    } catch (error) {
      logger.error('Error getting Knowledge Base statistics:', error);
      throw error;
    }
  }

  /**
   * Update entity quality metrics
   */
  async updateQualityMetrics(entityId, metrics) {
    try {
      const updated = await KnowledgeBase.findOneAndUpdate(
        { entityId },
        { 
          $set: { 
            'quality.accuracy_score': metrics.accuracy,
            'quality.completeness': metrics.completeness,
            'quality.relevance': metrics.relevance,
            'quality.validation_status': metrics.status,
            'quality.last_reviewed': new Date(),
          },
        },
        { new: true }
      );
      
      return updated;
    } catch (error) {
      logger.error(`Error updating quality metrics for ${entityId}:`, error);
      throw error;
    }
  }

  /**
   * Add feedback to entity
   */
  async addFeedback(entityId, isPositive) {
    try {
      const entity = await KnowledgeBase.findOne({ entityId });
      
      if (entity) {
        await entity.addFeedback(isPositive);
        logger.info(`Feedback added to entity ${entityId}: ${isPositive ? 'positive' : 'negative'}`);
      }
      
      return entity;
    } catch (error) {
      logger.error(`Error adding feedback to ${entityId}:`, error);
      throw error;
    }
  }
}

// Create singleton instance
const knowledgeBaseService = new KnowledgeBaseService();

export default knowledgeBaseService;