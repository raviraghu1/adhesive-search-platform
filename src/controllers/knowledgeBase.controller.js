import knowledgeBaseService from '../services/KnowledgeBaseService.js';
import logger from '../utils/logger.js';

class KnowledgeBaseController {
  /**
   * Query the knowledge base
   */
  async query(req, res) {
    const { q, limit = 10, type = null, includeRelated = false } = req.query;
    
    if (!q) {
      return res.status(400).json({ 
        error: 'Query parameter "q" is required' 
      });
    }
    
    const result = await knowledgeBaseService.query(q, {
      limit: parseInt(limit),
      type,
      includeRelated: includeRelated === 'true',
    });
    
    res.json(result);
  }

  /**
   * Get specific entity
   */
  async getEntity(req, res) {
    const { id } = req.params;
    
    const entity = await knowledgeBaseService.getEntity(id);
    
    if (!entity) {
      return res.status(404).json({ 
        error: 'Entity not found' 
      });
    }
    
    res.json(entity);
  }

  /**
   * Advanced search
   */
  async search(req, res) {
    const { 
      query,
      filters = {},
      limit = 10,
      offset = 0,
      sortBy = 'relevance',
    } = req.body;
    
    if (!query) {
      return res.status(400).json({ 
        error: 'Search query is required' 
      });
    }
    
    const results = await knowledgeBaseService.query(query, {
      limit,
      offset,
      ...filters,
    });
    
    res.json(results);
  }

  /**
   * Extract and build knowledge base
   */
  async extractAndBuild(req, res) {
    // Start the process asynchronously
    knowledgeBaseService.buildKnowledgeBase()
      .then(result => {
        logger.info('Knowledge base build completed:', result);
      })
      .catch(error => {
        logger.error('Knowledge base build failed:', error);
      });
    
    res.json({ 
      message: 'Knowledge base extraction started',
      status: 'processing',
    });
  }

  /**
   * Get related entities
   */
  async getRelatedEntities(req, res) {
    const { id } = req.params;
    const { depth = 1 } = req.query;
    
    const related = await knowledgeBaseService.getRelatedEntities(id, parseInt(depth));
    
    res.json({
      entityId: id,
      related,
      count: related.length,
    });
  }

  /**
   * Search by concept
   */
  async searchByConcept(req, res) {
    const { concept } = req.params;
    const { limit = 10 } = req.query;
    
    const results = await knowledgeBaseService.searchByConcept(concept, parseInt(limit));
    
    res.json({
      concept,
      results,
      count: results.length,
    });
  }

  /**
   * Get statistics
   */
  async getStatistics(req, res) {
    const stats = await knowledgeBaseService.getStatistics();
    res.json(stats);
  }

  /**
   * Add feedback
   */
  async addFeedback(req, res) {
    const { id } = req.params;
    const { isPositive = true } = req.body;
    
    const entity = await knowledgeBaseService.addFeedback(id, isPositive);
    
    if (!entity) {
      return res.status(404).json({ 
        error: 'Entity not found' 
      });
    }
    
    res.json({ 
      message: 'Feedback added successfully',
      entityId: id,
    });
  }

  /**
   * Update quality metrics
   */
  async updateQuality(req, res) {
    const { id } = req.params;
    const { 
      accuracy,
      completeness,
      relevance,
      status,
    } = req.body;
    
    const updated = await knowledgeBaseService.updateQualityMetrics(id, {
      accuracy,
      completeness,
      relevance,
      status,
    });
    
    if (!updated) {
      return res.status(404).json({ 
        error: 'Entity not found' 
      });
    }
    
    res.json({
      message: 'Quality metrics updated',
      entity: updated,
    });
  }
}

// Create singleton instance
const knowledgeBaseController = new KnowledgeBaseController();

export default knowledgeBaseController;