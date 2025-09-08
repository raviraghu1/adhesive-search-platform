import searchService from '../services/SearchService.js';
import logger from '../utils/logger.js';

class SearchController {
  /**
   * Search for products
   */
  async searchProducts(req, res) {
    const {
      query,
      filters = {},
      pagination = {},
      sort = { relevance: -1 },
      includeKnowledge = false,
    } = req.body;
    
    if (!query) {
      return res.status(400).json({
        error: 'Search query is required',
      });
    }
    
    const options = {
      limit: pagination.limit || 25,
      offset: pagination.offset || 0,
      sort,
      filters,
      userId: req.user?.id || null,
    };
    
    const results = await searchService.searchProducts(query, options);
    
    res.json(results);
  }

  /**
   * Get autofill suggestions
   */
  async getAutofillSuggestions(req, res) {
    const { q, limit = 10 } = req.query;
    
    if (!q || q.length < 2) {
      return res.json({ suggestions: [] });
    }
    
    const suggestions = await searchService.getAutofillSuggestions(q, parseInt(limit));
    
    res.json({ suggestions });
  }

  /**
   * Compare products
   */
  async compareProducts(req, res) {
    const { productIds } = req.body;
    
    if (!productIds || !Array.isArray(productIds) || productIds.length < 2) {
      return res.status(400).json({
        error: 'At least 2 product IDs are required for comparison',
      });
    }
    
    if (productIds.length > 5) {
      return res.status(400).json({
        error: 'Maximum 5 products can be compared at once',
      });
    }
    
    const comparison = await searchService.compareProducts(productIds);
    
    res.json(comparison);
  }

  /**
   * Get personalized recommendations
   */
  async getRecommendations(req, res) {
    const { userId } = req.params;
    const { context = {} } = req.query;
    
    const recommendations = await searchService.getRecommendations(userId, context);
    
    res.json({
      userId,
      recommendations,
      count: recommendations.length,
    });
  }

  /**
   * Parse natural language query
   */
  async parseQuery(req, res) {
    const { query } = req.body;
    
    if (!query) {
      return res.status(400).json({
        error: 'Query text is required',
      });
    }
    
    const parsed = await searchService.parseQuery(query);
    
    res.json({
      original: query,
      parsed,
    });
  }

  /**
   * Get available facets
   */
  async getFacets(req, res) {
    const { baseQuery = {} } = req.query;
    
    const facets = await searchService.generateFacets(baseQuery);
    
    res.json(facets);
  }
}

// Create singleton instance
const searchController = new SearchController();

export default searchController;