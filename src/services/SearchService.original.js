import { OpenAIClient, AzureKeyCredential } from '@azure/openai';
import Product from '../models/Product.js';
import KnowledgeBase from '../models/KnowledgeBase.js';
import CustomerPreference from '../models/CustomerPreference.js';
import logger from '../utils/logger.js';
import config from '../config/index.js';
import dbConnection from '../database/connection.js';

class SearchService {
  constructor() {
    this.openAIClient = null;
    this.initialized = false;
  }

  /**
   * Initialize the Search Service
   */
  async initialize() {
    try {
      logger.info('Initializing Search Service...');
      
      // Initialize Azure OpenAI client if credentials are provided
      if (config.azure.openai.endpoint && config.azure.openai.apiKey) {
        this.openAIClient = new OpenAIClient(
          config.azure.openai.endpoint,
          new AzureKeyCredential(config.azure.openai.apiKey)
        );
        logger.info('Azure OpenAI client initialized');
      } else {
        logger.warn('Azure OpenAI credentials not provided - running without AI enhancement');
      }
      
      this.initialized = true;
      logger.info('Search Service initialized successfully');
      
      return true;
    } catch (error) {
      logger.error('Failed to initialize Search Service:', error);
      throw error;
    }
  }

  /**
   * Parse natural language query into structured search
   */
  async parseQuery(queryText) {
    try {
      // Basic parsing without AI if OpenAI is not available
      if (!this.openAIClient) {
        return this.basicQueryParser(queryText);
      }
      
      const startTime = Date.now();
      
      // Use Azure OpenAI to parse the query
      const prompt = `
        Parse the following adhesive product search query and extract structured information:
        Query: "${queryText}"
        
        Extract the following if present:
        1. Product type (epoxy, silicone, acrylic, etc.)
        2. Temperature requirements (min/max values with units)
        3. Substrates (materials to be bonded)
        4. Cure time requirements
        5. Strength requirements
        6. Certifications needed
        7. Applications or industries
        8. Any numeric comparisons (>, <, between, etc.)
        
        Return as JSON with these fields:
        {
          "product_type": "",
          "temperature": { "min": null, "max": null, "unit": "celsius" },
          "substrates": [],
          "cure_time": { "value": null, "operator": "", "unit": "" },
          "strength": { "value": null, "operator": "", "unit": "" },
          "certifications": [],
          "applications": [],
          "intent": "search|compare|technical_info"
        }
      `;
      
      const response = await this.openAIClient.getCompletions(
        config.azure.openai.deploymentName,
        [prompt],
        {
          maxTokens: 200,
          temperature: 0.3,
        }
      );
      
      const duration = Date.now() - startTime;
      logger.logAIOperation('query_parsing', config.azure.openai.deploymentName, 200, duration);
      
      const parsedQuery = JSON.parse(response.choices[0].text);
      return parsedQuery;
    } catch (error) {
      logger.error('Error parsing query with AI:', error);
      // Fallback to basic parser
      return this.basicQueryParser(queryText);
    }
  }

  /**
   * Basic query parser without AI
   */
  basicQueryParser(queryText) {
    const query = queryText.toLowerCase();
    const parsed = {
      product_type: null,
      temperature: { min: null, max: null, unit: 'celsius' },
      substrates: [],
      cure_time: { value: null, operator: null, unit: 'minutes' },
      strength: { value: null, operator: null, unit: 'psi' },
      certifications: [],
      applications: [],
      intent: 'search',
    };
    
    // Extract product types
    const productTypes = ['epoxy', 'silicone', 'acrylic', 'polyurethane', 'cyanoacrylate'];
    productTypes.forEach(type => {
      if (query.includes(type)) {
        parsed.product_type = type;
      }
    });
    
    // Extract temperature
    const tempMatch = query.match(/(\d+)\s*(?:°|deg|degree)?\s*([cf])?/i);
    if (tempMatch) {
      const value = parseInt(tempMatch[1]);
      const unit = tempMatch[2]?.toLowerCase() === 'f' ? 'fahrenheit' : 'celsius';
      
      if (query.includes('above') || query.includes('>')) {
        parsed.temperature.min = value;
      } else if (query.includes('below') || query.includes('<')) {
        parsed.temperature.max = value;
      } else {
        parsed.temperature.max = value;
      }
      parsed.temperature.unit = unit;
    }
    
    // Extract substrates
    const substrates = ['metal', 'plastic', 'glass', 'wood', 'ceramic', 'rubber', 'aluminum', 'steel'];
    substrates.forEach(substrate => {
      if (query.includes(substrate)) {
        parsed.substrates.push(substrate);
      }
    });
    
    // Extract numeric comparisons
    const strengthMatch = query.match(/strength\s*([><=]+)\s*(\d+)\s*(\w+)?/i);
    if (strengthMatch) {
      parsed.strength.operator = strengthMatch[1];
      parsed.strength.value = parseInt(strengthMatch[2]);
      parsed.strength.unit = strengthMatch[3] || 'psi';
    }
    
    const cureMatch = query.match(/cure\s*(?:time)?\s*([><=]+)?\s*(\d+)\s*(\w+)?/i);
    if (cureMatch) {
      parsed.cure_time.operator = cureMatch[1] || '<=';
      parsed.cure_time.value = parseInt(cureMatch[2]);
      parsed.cure_time.unit = cureMatch[3] || 'minutes';
    }
    
    // Extract applications
    const applications = ['automotive', 'aerospace', 'electronics', 'medical', 'construction'];
    applications.forEach(app => {
      if (query.includes(app)) {
        parsed.applications.push(app);
      }
    });
    
    // Determine intent
    if (query.includes('compare') || query.includes('vs') || query.includes('versus')) {
      parsed.intent = 'compare';
    } else if (query.includes('how') || query.includes('what') || query.includes('why')) {
      parsed.intent = 'technical_info';
    }
    
    return parsed;
  }

  /**
   * Build MongoDB query from parsed query
   */
  buildMongoQuery(parsedQuery) {
    const query = {};
    
    // Product type
    if (parsedQuery.product_type) {
      query.$or = [
        { category: new RegExp(parsedQuery.product_type, 'i') },
        { subcategory: new RegExp(parsedQuery.product_type, 'i') },
      ];
    }
    
    // Temperature requirements
    if (parsedQuery.temperature.min !== null) {
      query['specifications.thermal.temperature_range.min'] = { 
        $gte: parsedQuery.temperature.min 
      };
    }
    if (parsedQuery.temperature.max !== null) {
      query['specifications.thermal.temperature_range.max'] = { 
        $lte: parsedQuery.temperature.max 
      };
    }
    
    // Substrates
    if (parsedQuery.substrates.length > 0) {
      const substrateQueries = parsedQuery.substrates.map(substrate => ({
        $or: [
          { [`substrates.metals.${substrate}`]: { $exists: true } },
          { [`substrates.plastics.${substrate}`]: { $exists: true } },
          { [`substrates.others.${substrate}`]: { $exists: true } },
        ],
      }));
      
      if (substrateQueries.length > 0) {
        query.$and = query.$and || [];
        query.$and.push({ $or: substrateQueries });
      }
    }
    
    // Cure time
    if (parsedQuery.cure_time.value !== null) {
      const cureQuery = {};
      const operator = parsedQuery.cure_time.operator || '<=';
      
      switch (operator) {
        case '>':
          cureQuery.$gt = parsedQuery.cure_time.value;
          break;
        case '>=':
          cureQuery.$gte = parsedQuery.cure_time.value;
          break;
        case '<':
          cureQuery.$lt = parsedQuery.cure_time.value;
          break;
        case '<=':
        default:
          cureQuery.$lte = parsedQuery.cure_time.value;
          break;
      }
      
      query['specifications.cure.full_cure.value'] = cureQuery;
    }
    
    // Strength requirements
    if (parsedQuery.strength.value !== null) {
      const strengthQuery = {};
      const operator = parsedQuery.strength.operator || '>=';
      
      switch (operator) {
        case '>':
          strengthQuery.$gt = parsedQuery.strength.value;
          break;
        case '>=':
          strengthQuery.$gte = parsedQuery.strength.value;
          break;
        case '<':
          strengthQuery.$lt = parsedQuery.strength.value;
          break;
        case '<=':
          strengthQuery.$lte = parsedQuery.strength.value;
          break;
      }
      
      query['specifications.mechanical.tensile_strength.value'] = strengthQuery;
    }
    
    // Applications
    if (parsedQuery.applications.length > 0) {
      query['applications.industries'] = { $in: parsedQuery.applications };
    }
    
    // Certifications
    if (parsedQuery.certifications.length > 0) {
      query['compliance.environmental'] = { $in: parsedQuery.certifications };
    }
    
    // Only active products
    query.status = 'active';
    
    return query;
  }

  /**
   * Perform product search
   */
  async searchProducts(queryText, options = {}) {
    try {
      const startTime = Date.now();
      
      const {
        limit = config.search.defaultLimit,
        offset = 0,
        sort = { relevance: -1 },
        filters = {},
        userId = null,
      } = options;
      
      // Parse the query
      const parsedQuery = await this.parseQuery(queryText);
      logger.debug('Parsed query:', parsedQuery);
      
      // Build MongoDB query
      const mongoQuery = this.buildMongoQuery(parsedQuery);
      
      // Merge with additional filters
      Object.assign(mongoQuery, filters);
      
      logger.debug('MongoDB query:', mongoQuery);
      
      // Execute search
      let results;
      
      // If text search is needed
      if (queryText && !Object.keys(mongoQuery).length) {
        results = await Product
          .find({ $text: { $search: queryText }, status: 'active' })
          .sort({ score: { $meta: 'textScore' }, ...sort })
          .skip(offset)
          .limit(limit)
          .lean();
      } else {
        results = await Product
          .find(mongoQuery)
          .sort(sort)
          .skip(offset)
          .limit(limit)
          .lean();
      }
      
      // Get total count for pagination
      const totalCount = await Product.countDocuments(mongoQuery);
      
      // Enhance results with knowledge base if available
      if (parsedQuery.intent === 'technical_info' && results.length > 0) {
        for (const product of results) {
          const knowledgeEntities = await KnowledgeBase
            .find({ 'relationships.products': product.productId })
            .limit(2)
            .lean();
          
          product.knowledge = knowledgeEntities;
        }
      }
      
      // Track search in user preferences if userId provided
      if (userId) {
        await this.trackUserSearch(userId, {
          query: queryText,
          parsedQuery,
          resultsCount: results.length,
          selectedProducts: results.slice(0, 3).map(r => r.productId),
        });
      }
      
      const duration = Date.now() - startTime;
      logger.logSearchQuery(queryText, results.length, duration);
      
      // Generate facets for filtering
      const facets = await this.generateFacets(mongoQuery);
      
      // Generate suggestions
      const suggestions = await this.generateSuggestions(queryText, parsedQuery, results);
      
      return {
        query: queryText,
        parsedQuery,
        results,
        totalCount,
        facets,
        suggestions,
        pagination: {
          limit,
          offset,
          hasMore: offset + limit < totalCount,
        },
        duration,
      };
    } catch (error) {
      logger.error('Error searching products:', error);
      throw error;
    }
  }

  /**
   * Generate facets for search results
   */
  async generateFacets(baseQuery) {
    try {
      const facets = {};
      
      // Category facet
      const categories = await Product.aggregate([
        { $match: baseQuery },
        { $group: { _id: '$category', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]);
      facets.categories = categories.map(c => ({ name: c._id, count: c.count }));
      
      // Temperature range facet
      const tempRanges = await Product.aggregate([
        { $match: baseQuery },
        {
          $bucket: {
            groupBy: '$specifications.thermal.temperature_range.max',
            boundaries: [0, 50, 100, 150, 200, 250, 300, Infinity],
            default: 'Unknown',
            output: { count: { $sum: 1 } },
          },
        },
      ]);
      facets.temperatureRanges = tempRanges;
      
      // Cure type facet
      const cureTypes = await Product.aggregate([
        { $match: baseQuery },
        { $group: { _id: '$specifications.cure.cure_type', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]);
      facets.cureTypes = cureTypes.filter(c => c._id).map(c => ({ name: c._id, count: c.count }));
      
      // Industry facet
      const industries = await Product.aggregate([
        { $match: baseQuery },
        { $unwind: '$applications.industries' },
        { $group: { _id: '$applications.industries', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 10 },
      ]);
      facets.industries = industries.map(i => ({ name: i._id, count: i.count }));
      
      return facets;
    } catch (error) {
      logger.error('Error generating facets:', error);
      return {};
    }
  }

  /**
   * Generate search suggestions
   */
  async generateSuggestions(queryText, parsedQuery, results) {
    const suggestions = [];
    
    // If no results, suggest alternatives
    if (results.length === 0) {
      suggestions.push('Try broadening your search criteria');
      suggestions.push('Remove some filters to see more results');
      
      if (parsedQuery.product_type) {
        suggestions.push(`Browse all ${parsedQuery.product_type} products`);
      }
    }
    
    // If results found, suggest refinements
    if (results.length > 10) {
      suggestions.push('Add more filters to narrow your results');
      
      if (!parsedQuery.temperature.max) {
        suggestions.push('Specify maximum temperature requirement');
      }
      
      if (!parsedQuery.cure_time.value) {
        suggestions.push('Add cure time requirements');
      }
    }
    
    // Suggest related searches
    if (parsedQuery.substrates.length > 0) {
      const substrate = parsedQuery.substrates[0];
      suggestions.push(`Surface preparation for ${substrate}`);
    }
    
    if (parsedQuery.applications.length > 0) {
      const app = parsedQuery.applications[0];
      suggestions.push(`${app} adhesive requirements`);
    }
    
    return suggestions.slice(0, 5);
  }

  /**
   * Track user search for preferences
   */
  async trackUserSearch(userId, searchData) {
    try {
      const preference = await CustomerPreference.findOne({ customerId: userId });
      
      if (preference) {
        await preference.addSearchHistory({
          query: searchData.query,
          query_type: searchData.parsedQuery.intent,
          results_count: searchData.resultsCount,
          selected_products: searchData.selectedProducts,
          successful: searchData.resultsCount > 0,
        });
      }
    } catch (error) {
      logger.error('Error tracking user search:', error);
      // Don't throw - this is not critical
    }
  }

  /**
   * Get personalized recommendations
   */
  async getRecommendations(userId, context = {}) {
    try {
      const preference = await CustomerPreference.findOne({ customerId: userId });
      
      if (!preference) {
        return [];
      }
      
      // Get frequently viewed products
      const viewedProducts = preference.recommendations.viewed_products.slice(-10);
      
      // Find similar products
      const recommendations = await Product.find({
        productId: { $nin: viewedProducts },
        category: { $in: preference.preferences.products.favorite_categories },
        status: 'active',
      })
      .limit(10)
      .lean();
      
      return recommendations;
    } catch (error) {
      logger.error('Error getting recommendations:', error);
      return [];
    }
  }

  /**
   * Compare multiple products
   */
  async compareProducts(productIds) {
    try {
      const products = await Product
        .find({ productId: { $in: productIds } })
        .lean();
      
      if (products.length === 0) {
        return { error: 'No products found' };
      }
      
      // Structure comparison data
      const comparison = {
        products: products.map(p => ({
          id: p.productId,
          name: p.name,
          category: p.category,
        })),
        specifications: {},
        applications: {},
        substrates: {},
        compliance: {},
      };
      
      // Compare specifications
      const specFields = [
        'specifications.thermal.temperature_range',
        'specifications.mechanical.tensile_strength',
        'specifications.cure.full_cure',
        'specifications.chemical.voc_content',
      ];
      
      specFields.forEach(field => {
        comparison.specifications[field] = products.map(p => {
          const value = field.split('.').reduce((obj, key) => obj?.[key], p);
          return value || 'N/A';
        });
      });
      
      // Compare applications
      comparison.applications.industries = products.map(p => 
        p.applications?.industries?.join(', ') || 'N/A'
      );
      
      // Compare substrates
      comparison.substrates.metals = products.map(p => 
        Object.keys(p.substrates?.metals || {}).filter(k => 
          p.substrates.metals[k]?.bond_strength === 'excellent'
        ).join(', ') || 'N/A'
      );
      
      // Compare compliance
      comparison.compliance.certifications = products.map(p => 
        p.compliance?.environmental?.join(', ') || 'N/A'
      );
      
      return comparison;
    } catch (error) {
      logger.error('Error comparing products:', error);
      throw error;
    }
  }

  /**
   * Get autofill suggestions
   */
  async getAutofillSuggestions(partial, limit = 10) {
    try {
      const suggestions = [];
      
      // Get product name suggestions
      const products = await Product
        .find(
          { 
            name: new RegExp(`^${partial}`, 'i'),
            status: 'active',
          },
          { name: 1, productId: 1 }
        )
        .limit(limit / 2)
        .lean();
      
      suggestions.push(...products.map(p => ({
        type: 'product',
        text: p.name,
        id: p.productId,
      })));
      
      // Get category suggestions
      const categories = await Product.distinct('category', {
        category: new RegExp(`^${partial}`, 'i'),
      });
      
      suggestions.push(...categories.slice(0, limit / 4).map(c => ({
        type: 'category',
        text: c,
      })));
      
      // Get common search terms
      const commonTerms = [
        'high temperature epoxy',
        'fast cure adhesive',
        'structural adhesive',
        'metal to plastic bonding',
        'aerospace certified',
        'low voc sealant',
      ].filter(term => term.toLowerCase().startsWith(partial.toLowerCase()));
      
      suggestions.push(...commonTerms.slice(0, limit / 4).map(t => ({
        type: 'suggestion',
        text: t,
      })));
      
      return suggestions.slice(0, limit);
    } catch (error) {
      logger.error('Error getting autofill suggestions:', error);
      return [];
    }
  }
}

// Create singleton instance
const searchService = new SearchService();

export default searchService;