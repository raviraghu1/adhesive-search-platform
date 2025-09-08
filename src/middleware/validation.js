import { body, param, query, validationResult } from 'express-validator';

/**
 * Handle validation errors
 */
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: 'Validation failed',
      details: errors.array(),
    });
  }
  
  next();
};

/**
 * Validate search query
 */
export const validateSearchQuery = [
  body('query')
    .trim()
    .notEmpty()
    .withMessage('Search query is required')
    .isLength({ min: 2, max: 500 })
    .withMessage('Query must be between 2 and 500 characters'),
  
  body('pagination.limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),
  
  body('pagination.offset')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Offset must be a positive integer'),
  
  handleValidationErrors,
];

/**
 * Validate knowledge base query
 */
export const validateQuery = [
  query('q')
    .trim()
    .notEmpty()
    .withMessage('Query parameter is required')
    .isLength({ min: 2, max: 500 })
    .withMessage('Query must be between 2 and 500 characters'),
  
  query('limit')
    .optional()
    .isInt({ min: 1, max: 50 })
    .withMessage('Limit must be between 1 and 50'),
  
  query('type')
    .optional()
    .isIn([
      'product_info',
      'technical_concept',
      'application_guide',
      'troubleshooting',
      'faq',
      'glossary',
      'standard',
      'regulation',
      'best_practice',
      'case_study',
    ])
    .withMessage('Invalid entity type'),
  
  handleValidationErrors,
];

/**
 * Validate entity ID parameter
 */
export const validateEntityId = [
  param('id')
    .trim()
    .notEmpty()
    .withMessage('Entity ID is required')
    .matches(/^KB-[A-Z0-9-]+$/)
    .withMessage('Invalid entity ID format'),
  
  handleValidationErrors,
];

/**
 * Validate product ID
 */
export const validateProductId = [
  param('productId')
    .trim()
    .notEmpty()
    .withMessage('Product ID is required')
    .isLength({ min: 2, max: 50 })
    .withMessage('Product ID must be between 2 and 50 characters'),
  
  handleValidationErrors,
];

/**
 * Validate export request
 */
export const validateExportRequest = [
  body('productIds')
    .isArray({ min: 1, max: 100 })
    .withMessage('Product IDs must be an array with 1-100 items'),
  
  body('productIds.*')
    .trim()
    .notEmpty()
    .withMessage('Product ID cannot be empty'),
  
  body('format')
    .isIn(['pdf', 'excel', 'word', 'csv', 'json'])
    .withMessage('Invalid export format'),
  
  body('template')
    .optional()
    .isString()
    .withMessage('Template must be a string'),
  
  handleValidationErrors,
];

/**
 * Validate feedback submission
 */
export const validateFeedback = [
  body('isPositive')
    .isBoolean()
    .withMessage('isPositive must be a boolean'),
  
  body('comment')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Comment must not exceed 1000 characters'),
  
  handleValidationErrors,
];

/**
 * Validate user registration
 */
export const validateUserRegistration = [
  body('email')
    .trim()
    .isEmail()
    .normalizeEmail()
    .withMessage('Valid email is required'),
  
  body('password')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Password must contain at least one uppercase letter, one lowercase letter, and one number'),
  
  body('companyId')
    .trim()
    .notEmpty()
    .withMessage('Company ID is required'),
  
  body('role')
    .optional()
    .isIn(['engineer', 'procurement', 'r&d', 'technician', 'manager', 'other'])
    .withMessage('Invalid role'),
  
  body('industry')
    .isIn(['automotive', 'aerospace', 'electronics', 'medical', 'construction', 'marine', 'general'])
    .withMessage('Invalid industry'),
  
  handleValidationErrors,
];

/**
 * Validate login credentials
 */
export const validateLogin = [
  body('email')
    .trim()
    .isEmail()
    .normalizeEmail()
    .withMessage('Valid email is required'),
  
  body('password')
    .notEmpty()
    .withMessage('Password is required'),
  
  handleValidationErrors,
];

/**
 * Validate numeric comparison
 */
export const validateNumericComparison = [
  body('field')
    .trim()
    .notEmpty()
    .withMessage('Field name is required'),
  
  body('operator')
    .isIn(['>', '>=', '<', '<=', '=', 'between'])
    .withMessage('Invalid comparison operator'),
  
  body('value')
    .isNumeric()
    .withMessage('Value must be numeric'),
  
  body('value2')
    .if(body('operator').equals('between'))
    .isNumeric()
    .withMessage('Second value is required for between operator'),
  
  handleValidationErrors,
];

/**
 * Sanitize input to prevent XSS
 */
export const sanitizeInput = (req, res, next) => {
  // Recursively clean all string inputs
  const clean = (obj) => {
    if (typeof obj === 'string') {
      // Remove any HTML tags and scripts
      return obj.replace(/<[^>]*>/g, '').trim();
    } else if (Array.isArray(obj)) {
      return obj.map(clean);
    } else if (obj !== null && typeof obj === 'object') {
      const cleaned = {};
      for (const key in obj) {
        cleaned[key] = clean(obj[key]);
      }
      return cleaned;
    }
    return obj;
  };
  
  if (req.body) req.body = clean(req.body);
  if (req.query) req.query = clean(req.query);
  if (req.params) req.params = clean(req.params);
  
  next();
};

/**
 * Validate pagination parameters
 */
export const validatePagination = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),
  
  query('sort')
    .optional()
    .isIn(['relevance', 'name', 'newest', 'price', 'availability'])
    .withMessage('Invalid sort option'),
  
  query('order')
    .optional()
    .isIn(['asc', 'desc'])
    .withMessage('Order must be asc or desc'),
  
  handleValidationErrors,
];