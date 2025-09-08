import express from 'express';
import KnowledgeBaseService from '../services/KnowledgeBaseService.js';
import stateManager from '../services/KnowledgeBaseStateManager.js';
import logger from '../utils/logger.js';

const router = express.Router();

/**
 * @route GET /api/kb/v1/search
 * @desc Search across knowledge base
 * @query q - Search query
 * @query includeHistory - Include historical data
 * @query limit - Result limit
 */
router.get('/search', async (req, res, next) => {
  try {
    const { q, includeHistory = false, limit = 20 } = req.query;
    
    if (!q) {
      return res.status(400).json({
        success: false,
        error: 'Search query is required'
      });
    }

    logger.info(`KB Search: "${q}"`);

    const results = await stateManager.search(q, {
      includeHistory: includeHistory === 'true',
      includeLongTerm: false,
      limit: parseInt(limit)
    });

    res.json({
      success: true,
      query: q,
      count: results.length,
      results
    });
  } catch (error) {
    logger.error('KB Search error:', error);
    next(error);
  }
});

/**
 * @route GET /api/kb/v1/stats
 * @desc Get knowledge base statistics
 */
router.get('/stats', async (req, res, next) => {
  try {
    const stats = await stateManager.getStatistics();
    
    res.json({
      success: true,
      statistics: stats
    });
  } catch (error) {
    logger.error('KB Stats error:', error);
    next(error);
  }
});

/**
 * @route GET /api/kb/v1/entity/:id
 * @desc Get entity by ID
 */
router.get('/entity/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { includeHistory = false } = req.query;
    
    const knowledgeBase = new KnowledgeBaseService();
    const entity = await knowledgeBase.getEntity(id);
    
    if (!entity) {
      return res.status(404).json({
        success: false,
        error: 'Entity not found'
      });
    }
    
    let history = [];
    if (includeHistory === 'true') {
      // Get history for this entity
      const shortTermHistory = await stateManager.db
        .collection('KnowledgeBaseShortTermHistory')
        .find({ entityId: id })
        .sort({ timestamp: -1 })
        .limit(10)
        .toArray();
      
      history = shortTermHistory;
    }
    
    res.json({
      success: true,
      entity,
      history
    });
  } catch (error) {
    logger.error('KB Entity error:', error);
    next(error);
  }
});

/**
 * @route POST /api/kb/v1/update
 * @desc Update knowledge base entity
 */
router.post('/update', async (req, res, next) => {
  try {
    const { entityId, updates } = req.body;
    
    if (!entityId || !updates) {
      return res.status(400).json({
        success: false,
        error: 'EntityId and updates are required'
      });
    }
    
    await stateManager.updateCurrentState({
      entityId,
      ...updates,
      lastModified: new Date()
    });
    
    res.json({
      success: true,
      message: 'Entity updated successfully',
      entityId
    });
  } catch (error) {
    logger.error('KB Update error:', error);
    next(error);
  }
});

/**
 * @route POST /api/kb/v1/snapshot
 * @desc Create a manual snapshot
 */
router.post('/snapshot', async (req, res, next) => {
  try {
    const { type = 'manual', description } = req.body;
    
    const snapshot = await stateManager.createSnapshot(type, description);
    
    res.json({
      success: true,
      message: 'Snapshot created successfully',
      snapshot: {
        id: snapshot.insertedId,
        type,
        description
      }
    });
  } catch (error) {
    logger.error('KB Snapshot error:', error);
    next(error);
  }
});

/**
 * @route GET /api/kb/v1/snapshots
 * @desc List available snapshots
 */
router.get('/snapshots', async (req, res, next) => {
  try {
    const snapshots = await stateManager.db
      .collection('KnowledgeBaseSnapshots')
      .find()
      .sort({ snapshotDate: -1 })
      .limit(10)
      .toArray();
    
    res.json({
      success: true,
      count: snapshots.length,
      snapshots: snapshots.map(s => ({
        id: s._id,
        date: s.snapshotDate,
        type: s.type,
        entityCount: s.entityCount,
        compressionRatio: s.compressionRatio,
        stats: s.stats
      }))
    });
  } catch (error) {
    logger.error('KB Snapshots list error:', error);
    next(error);
  }
});

/**
 * @route POST /api/kb/v1/maintenance
 * @desc Trigger maintenance task
 */
router.post('/maintenance', async (req, res, next) => {
  try {
    const { task = 'hourly' } = req.body;
    
    logger.info(`Triggering ${task} maintenance`);
    
    // Run maintenance in background
    process.nextTick(async () => {
      try {
        if (task === 'archive') {
          await stateManager.archiveShortTermHistory();
        } else if (task === 'cleanup') {
          await stateManager.cleanup();
        } else if (task === 'snapshot') {
          await stateManager.createSnapshot('manual');
        }
      } catch (error) {
        logger.error(`Maintenance task ${task} failed:`, error);
      }
    });
    
    res.json({
      success: true,
      message: `Maintenance task ${task} started`,
      task
    });
  } catch (error) {
    logger.error('KB Maintenance error:', error);
    next(error);
  }
});

export default router;