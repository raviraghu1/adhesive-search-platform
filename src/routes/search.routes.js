import express from 'express';
import searchController from '../controllers/search.controller.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import { validateSearchQuery } from '../middleware/validation.js';

const router = express.Router();

/**
 * @route   POST /api/v1/search
 * @desc    Search for products
 * @access  Public
 */
router.post('/search',
  validateSearchQuery,
  asyncHandler(searchController.searchProducts)
);

/**
 * @route   GET /api/v1/search/suggestions
 * @desc    Get autofill suggestions
 * @access  Public
 */
router.get('/search/suggestions',
  asyncHandler(searchController.getAutofillSuggestions)
);

/**
 * @route   POST /api/v1/search/compare
 * @desc    Compare multiple products
 * @access  Public
 */
router.post('/search/compare',
  asyncHandler(searchController.compareProducts)
);

/**
 * @route   GET /api/v1/search/recommendations/:userId
 * @desc    Get personalized recommendations
 * @access  Private
 */
router.get('/search/recommendations/:userId',
  // Add authentication middleware here
  asyncHandler(searchController.getRecommendations)
);

/**
 * @route   POST /api/v1/search/parse
 * @desc    Parse natural language query
 * @access  Public
 */
router.post('/search/parse',
  asyncHandler(searchController.parseQuery)
);

/**
 * @route   GET /api/v1/search/facets
 * @desc    Get available facets for filtering
 * @access  Public
 */
router.get('/search/facets',
  asyncHandler(searchController.getFacets)
);

export default router;