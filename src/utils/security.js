import crypto from 'crypto';
import validator from 'validator';

/**
 * Security utilities for input sanitization and validation
 */
class SecurityUtils {
  /**
   * Sanitize string for use in MongoDB RegExp
   * Escapes special regex characters to prevent ReDoS attacks
   */
  static escapeRegex(string) {
    if (typeof string !== 'string') return '';
    
    // Remove any characters that could cause ReDoS
    // Limit length to prevent excessive patterns
    const sanitized = string
      .substring(0, 100) // Limit length
      .replace(/[.*+?^${}()|[\]\\]/g, '\\$&') // Escape special chars
      .replace(/\s+/g, ' ') // Normalize whitespace
      .trim();
    
    return sanitized;
  }

  /**
   * Sanitize MongoDB query object to prevent injection
   */
  static sanitizeQuery(query) {
    if (!query || typeof query !== 'object') return {};
    
    const sanitized = {};
    
    for (const [key, value] of Object.entries(query)) {
      // Skip keys with $ or . to prevent operator injection
      if (key.includes('$') || key.includes('.')) {
        continue;
      }
      
      // Recursively sanitize nested objects
      if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        sanitized[key] = this.sanitizeQuery(value);
      } else if (Array.isArray(value)) {
        // Sanitize array elements
        sanitized[key] = value.map(item => 
          typeof item === 'object' ? this.sanitizeQuery(item) : this.sanitizeValue(item)
        );
      } else {
        sanitized[key] = this.sanitizeValue(value);
      }
    }
    
    return sanitized;
  }

  /**
   * Sanitize individual values
   */
  static sanitizeValue(value) {
    if (value === null || value === undefined) return value;
    
    // Convert to string and sanitize if needed
    if (typeof value === 'string') {
      // Remove null bytes
      return value.replace(/\0/g, '');
    }
    
    // Ensure numbers are within safe range
    if (typeof value === 'number') {
      if (!Number.isFinite(value)) return 0;
      if (value > Number.MAX_SAFE_INTEGER) return Number.MAX_SAFE_INTEGER;
      if (value < Number.MIN_SAFE_INTEGER) return Number.MIN_SAFE_INTEGER;
    }
    
    return value;
  }

  /**
   * Validate and sanitize search query text
   */
  static validateSearchQuery(query) {
    if (!query || typeof query !== 'string') {
      throw new Error('Invalid search query');
    }
    
    // Trim and normalize whitespace
    let sanitized = query.trim().replace(/\s+/g, ' ');
    
    // Check length limits
    if (sanitized.length < 2) {
      throw new Error('Search query too short (minimum 2 characters)');
    }
    
    if (sanitized.length > 500) {
      throw new Error('Search query too long (maximum 500 characters)');
    }
    
    // Remove potential script tags or HTML
    sanitized = validator.escape(sanitized);
    
    // Check for potential prompt injection patterns
    const suspiciousPatterns = [
      /ignore previous instructions/i,
      /disregard all prior/i,
      /system prompt/i,
      /\{\{.*\}\}/,  // Template injection
      /<script/i,
      /javascript:/i,
    ];
    
    for (const pattern of suspiciousPatterns) {
      if (pattern.test(sanitized)) {
        throw new Error('Invalid characters in search query');
      }
    }
    
    return sanitized;
  }

  /**
   * Generate secure random token
   */
  static generateSecureToken(length = 32) {
    return crypto.randomBytes(length).toString('hex');
  }

  /**
   * Hash sensitive data
   */
  static hashData(data, salt = '') {
    return crypto
      .createHash('sha256')
      .update(data + salt)
      .digest('hex');
  }

  /**
   * Validate MongoDB ObjectId
   */
  static isValidObjectId(id) {
    if (!id) return false;
    const objectIdPattern = /^[0-9a-fA-F]{24}$/;
    return objectIdPattern.test(id);
  }

  /**
   * Validate and sanitize numeric input
   */
  static validateNumeric(value, options = {}) {
    const {
      min = Number.MIN_SAFE_INTEGER,
      max = Number.MAX_SAFE_INTEGER,
      allowFloat = true,
      defaultValue = 0,
    } = options;
    
    // Convert to number
    const num = allowFloat ? parseFloat(value) : parseInt(value, 10);
    
    // Check if valid number
    if (!Number.isFinite(num)) {
      return defaultValue;
    }
    
    // Apply bounds
    if (num < min) return min;
    if (num > max) return max;
    
    return num;
  }

  /**
   * Sanitize file path to prevent directory traversal
   */
  static sanitizeFilePath(filepath) {
    if (!filepath || typeof filepath !== 'string') return '';
    
    // Remove directory traversal patterns
    return filepath
      .replace(/\.\./g, '')
      .replace(/[<>:"|?*]/g, '') // Windows invalid chars
      .replace(/\/+/g, '/') // Normalize slashes
      .trim();
  }

  /**
   * Validate email address
   */
  static validateEmail(email) {
    if (!email || typeof email !== 'string') return false;
    return validator.isEmail(email);
  }

  /**
   * Validate URL
   */
  static validateURL(url, options = {}) {
    if (!url || typeof url !== 'string') return false;
    
    const validationOptions = {
      protocols: ['http', 'https'],
      require_protocol: true,
      require_valid_protocol: true,
      ...options,
    };
    
    return validator.isURL(url, validationOptions);
  }

  /**
   * Rate limit key generator
   */
  static getRateLimitKey(req) {
    // Use combination of IP and user ID if authenticated
    const ip = req.ip || req.connection.remoteAddress;
    const userId = req.user?.id || 'anonymous';
    return `rate_limit:${userId}:${ip}`;
  }

  /**
   * Validate pagination parameters
   */
  static validatePagination(limit, offset) {
    const validatedLimit = this.validateNumeric(limit, {
      min: 1,
      max: 100,
      allowFloat: false,
      defaultValue: 25,
    });
    
    const validatedOffset = this.validateNumeric(offset, {
      min: 0,
      max: 10000,
      allowFloat: false,
      defaultValue: 0,
    });
    
    return {
      limit: validatedLimit,
      offset: validatedOffset,
    };
  }

  /**
   * Sanitize sort parameters
   */
  static validateSort(sortField, sortOrder) {
    const allowedSortFields = [
      'name',
      'createdAt',
      'updatedAt',
      'relevance',
      'price',
      'availability',
    ];
    
    const allowedSortOrders = ['asc', 'desc', '1', '-1'];
    
    const field = allowedSortFields.includes(sortField) ? sortField : 'relevance';
    const order = allowedSortOrders.includes(sortOrder) ? sortOrder : 'desc';
    
    return { field, order };
  }
}

export default SecurityUtils;