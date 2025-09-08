import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

/**
 * Production configuration with enhanced security
 */
class ProductionConfig {
  constructor() {
    this.validateEnvironment();
    this.config = this.buildConfig();
  }

  /**
   * Validate required environment variables
   */
  validateEnvironment() {
    const required = [
      'NODE_ENV',
      'MONGODB_URI',
      'JWT_SECRET',
      'JWT_REFRESH_SECRET',
      'SESSION_SECRET',
    ];

    const missing = required.filter(key => !process.env[key]);
    
    if (missing.length > 0) {
      throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
    }

    // Validate JWT secrets are strong
    if (process.env.JWT_SECRET.length < 32) {
      throw new Error('JWT_SECRET must be at least 32 characters');
    }

    if (process.env.JWT_REFRESH_SECRET.length < 32) {
      throw new Error('JWT_REFRESH_SECRET must be at least 32 characters');
    }

    // Ensure not using default values in production
    const defaults = ['default-secret', 'change-me', 'your-secret'];
    const secrets = [
      process.env.JWT_SECRET,
      process.env.JWT_REFRESH_SECRET,
      process.env.SESSION_SECRET,
    ];

    for (const secret of secrets) {
      if (defaults.some(d => secret.toLowerCase().includes(d))) {
        throw new Error('Production secrets cannot contain default values');
      }
    }
  }

  /**
   * Build production configuration
   */
  buildConfig() {
    return {
      app: {
        name: process.env.APP_NAME || 'PDS Adhesive Search Platform',
        env: 'production',
        port: parseInt(process.env.PORT || '3000', 10),
        host: process.env.HOST || '0.0.0.0',
        url: process.env.APP_URL || 'https://api.pds-adhesive.com',
        trustProxy: true,
      },

      database: {
        mongodb: {
          uri: process.env.MONGODB_URI,
          options: {
            maxPoolSize: parseInt(process.env.MONGODB_POOL_SIZE || '100', 10),
            minPoolSize: parseInt(process.env.MONGODB_MIN_POOL_SIZE || '10', 10),
            maxIdleTimeMS: 30000,
            serverSelectionTimeoutMS: 5000,
            socketTimeoutMS: 45000,
            family: 4,
            retryWrites: true,
            w: 'majority',
            readPreference: 'primaryPreferred',
            readConcern: { level: 'majority' },
          },
        },
        redis: {
          host: process.env.REDIS_HOST || 'localhost',
          port: parseInt(process.env.REDIS_PORT || '6379', 10),
          password: process.env.REDIS_PASSWORD,
          db: parseInt(process.env.REDIS_DB || '0', 10),
          maxRetriesPerRequest: 3,
          enableReadyCheck: true,
          connectTimeout: 10000,
          commandTimeout: 5000,
          enableOfflineQueue: false,
          tls: process.env.REDIS_TLS === 'true' ? {} : undefined,
        },
      },

      security: {
        jwt: {
          secret: process.env.JWT_SECRET,
          refreshSecret: process.env.JWT_REFRESH_SECRET,
          expiresIn: process.env.JWT_EXPIRES_IN || '15m',
          refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
          algorithm: 'HS512',
          issuer: process.env.JWT_ISSUER || 'pds-adhesive-api',
          audience: process.env.JWT_AUDIENCE || 'pds-adhesive-client',
        },
        session: {
          secret: process.env.SESSION_SECRET,
          name: 'pds_session',
          resave: false,
          saveUninitialized: false,
          cookie: {
            secure: true,
            httpOnly: true,
            maxAge: 24 * 60 * 60 * 1000, // 24 hours
            sameSite: 'strict',
            domain: process.env.COOKIE_DOMAIN,
          },
        },
        cors: {
          origin: process.env.CORS_ORIGINS ? 
            process.env.CORS_ORIGINS.split(',').map(o => o.trim()) :
            ['https://app.pds-adhesive.com'],
          credentials: true,
          maxAge: 86400,
          methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
          allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-ID', 'X-API-Key'],
          exposedHeaders: ['X-Request-ID', 'X-RateLimit-Limit', 'X-RateLimit-Remaining'],
        },
        helmet: {
          contentSecurityPolicy: {
            directives: {
              defaultSrc: ["'self'"],
              scriptSrc: ["'self'", "'unsafe-inline'"],
              styleSrc: ["'self'", "'unsafe-inline'"],
              imgSrc: ["'self'", 'data:', 'https:'],
              connectSrc: ["'self'"],
              fontSrc: ["'self'"],
              objectSrc: ["'none'"],
              mediaSrc: ["'self'"],
              frameSrc: ["'none'"],
            },
          },
          hsts: {
            maxAge: 31536000,
            includeSubDomains: true,
            preload: true,
          },
        },
        rateLimit: {
          windowMs: parseInt(process.env.RATE_LIMIT_WINDOW || '60000', 10),
          general: {
            max: parseInt(process.env.RATE_LIMIT_GENERAL || '100', 10),
          },
          search: {
            max: parseInt(process.env.RATE_LIMIT_SEARCH || '30', 10),
          },
          auth: {
            max: parseInt(process.env.RATE_LIMIT_AUTH || '5', 10),
          },
          api: {
            max: parseInt(process.env.RATE_LIMIT_API || '1000', 10),
          },
        },
        encryption: {
          algorithm: 'aes-256-gcm',
          key: process.env.ENCRYPTION_KEY || crypto.randomBytes(32).toString('hex'),
        },
      },

      azure: {
        openai: {
          endpoint: process.env.AZURE_OPENAI_ENDPOINT,
          apiKey: process.env.AZURE_OPENAI_API_KEY,
          deploymentName: process.env.AZURE_OPENAI_DEPLOYMENT,
          apiVersion: process.env.AZURE_OPENAI_API_VERSION || '2024-02-15-preview',
          maxRetries: 3,
          timeout: 30000,
        },
      },

      services: {
        email: {
          provider: process.env.EMAIL_PROVIDER || 'sendgrid',
          apiKey: process.env.EMAIL_API_KEY,
          from: process.env.EMAIL_FROM || 'noreply@pds-adhesive.com',
          replyTo: process.env.EMAIL_REPLY_TO || 'support@pds-adhesive.com',
        },
        monitoring: {
          sentry: {
            dsn: process.env.SENTRY_DSN,
            environment: 'production',
            sampleRate: parseFloat(process.env.SENTRY_SAMPLE_RATE || '0.1'),
            tracesSampleRate: parseFloat(process.env.SENTRY_TRACES_SAMPLE_RATE || '0.1'),
          },
          prometheus: {
            enabled: process.env.PROMETHEUS_ENABLED === 'true',
            port: parseInt(process.env.PROMETHEUS_PORT || '9090', 10),
            path: '/metrics',
          },
          newRelic: {
            appName: process.env.NEW_RELIC_APP_NAME,
            licenseKey: process.env.NEW_RELIC_LICENSE_KEY,
            logging: {
              level: 'info',
            },
          },
        },
        cache: {
          ttl: {
            search: parseInt(process.env.CACHE_TTL_SEARCH || '300', 10),
            product: parseInt(process.env.CACHE_TTL_PRODUCT || '3600', 10),
            knowledge: parseInt(process.env.CACHE_TTL_KNOWLEDGE || '86400', 10),
          },
        },
      },

      features: {
        enableAI: process.env.FEATURE_AI === 'true',
        enableCache: process.env.FEATURE_CACHE !== 'false',
        enableMetrics: process.env.FEATURE_METRICS !== 'false',
        enableWebhooks: process.env.FEATURE_WEBHOOKS === 'true',
        enableBatchOperations: process.env.FEATURE_BATCH === 'true',
        maintenanceMode: process.env.MAINTENANCE_MODE === 'true',
      },

      limits: {
        maxRequestSize: process.env.MAX_REQUEST_SIZE || '10mb',
        maxUploadSize: process.env.MAX_UPLOAD_SIZE || '50mb',
        maxBatchSize: parseInt(process.env.MAX_BATCH_SIZE || '100', 10),
        maxQueryComplexity: parseInt(process.env.MAX_QUERY_COMPLEXITY || '10', 10),
        queryTimeout: parseInt(process.env.QUERY_TIMEOUT || '30000', 10),
      },

      logging: {
        level: process.env.LOG_LEVEL || 'info',
        format: process.env.LOG_FORMAT || 'json',
        destination: process.env.LOG_DESTINATION || 'file',
        file: {
          path: process.env.LOG_PATH || './logs',
          maxSize: process.env.LOG_MAX_SIZE || '100m',
          maxFiles: parseInt(process.env.LOG_MAX_FILES || '30', 10),
          compress: true,
        },
        sensitiveFields: [
          'password',
          'token',
          'apiKey',
          'secret',
          'authorization',
          'cookie',
          'creditCard',
          'ssn',
        ],
      },

      paths: {
        uploads: process.env.UPLOAD_PATH || './uploads',
        temp: process.env.TEMP_PATH || './temp',
        exports: process.env.EXPORT_PATH || './exports',
        backups: process.env.BACKUP_PATH || './backups',
      },
    };
  }

  /**
   * Get configuration value
   */
  get(path) {
    const keys = path.split('.');
    let value = this.config;
    
    for (const key of keys) {
      value = value[key];
      if (value === undefined) {
        return undefined;
      }
    }
    
    return value;
  }

  /**
   * Check if feature is enabled
   */
  isFeatureEnabled(feature) {
    return this.config.features[feature] === true;
  }

  /**
   * Get rate limit for endpoint
   */
  getRateLimit(endpoint) {
    return this.config.security.rateLimit[endpoint] || 
           this.config.security.rateLimit.general;
  }

  /**
   * Generate secure random string
   */
  static generateSecret(length = 64) {
    return crypto.randomBytes(length).toString('base64').replace(/[^a-zA-Z0-9]/g, '').substring(0, length);
  }

  /**
   * Create example .env.production file
   */
  static createExampleEnv() {
    const template = `# Production Environment Variables
# Generated: ${new Date().toISOString()}

# Application
NODE_ENV=production
APP_NAME="PDS Adhesive Search Platform"
PORT=3000
HOST=0.0.0.0
APP_URL=https://api.pds-adhesive.com

# Database
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/pds_adhesive?retryWrites=true&w=majority
MONGODB_POOL_SIZE=100
MONGODB_MIN_POOL_SIZE=10

# Redis
REDIS_HOST=redis.pds-adhesive.com
REDIS_PORT=6379
REDIS_PASSWORD=${this.generateSecret(32)}
REDIS_DB=0
REDIS_TLS=true

# Security - CHANGE ALL THESE VALUES
JWT_SECRET=${this.generateSecret(64)}
JWT_REFRESH_SECRET=${this.generateSecret(64)}
SESSION_SECRET=${this.generateSecret(64)}
ENCRYPTION_KEY=${this.generateSecret(64)}
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d
JWT_ISSUER=pds-adhesive-api
JWT_AUDIENCE=pds-adhesive-client

# CORS
CORS_ORIGINS=https://app.pds-adhesive.com,https://www.pds-adhesive.com
COOKIE_DOMAIN=.pds-adhesive.com

# Rate Limiting
RATE_LIMIT_WINDOW=60000
RATE_LIMIT_GENERAL=100
RATE_LIMIT_SEARCH=30
RATE_LIMIT_AUTH=5
RATE_LIMIT_API=1000

# Azure OpenAI
AZURE_OPENAI_ENDPOINT=https://your-resource.openai.azure.com
AZURE_OPENAI_API_KEY=your-api-key
AZURE_OPENAI_DEPLOYMENT=gpt-35-turbo
AZURE_OPENAI_API_VERSION=2024-02-15-preview

# Email Service
EMAIL_PROVIDER=sendgrid
EMAIL_API_KEY=your-sendgrid-api-key
EMAIL_FROM=noreply@pds-adhesive.com
EMAIL_REPLY_TO=support@pds-adhesive.com

# Monitoring
SENTRY_DSN=https://your-sentry-dsn@sentry.io/project-id
SENTRY_SAMPLE_RATE=0.1
SENTRY_TRACES_SAMPLE_RATE=0.1

PROMETHEUS_ENABLED=true
PROMETHEUS_PORT=9090

NEW_RELIC_APP_NAME=PDS-Adhesive-API
NEW_RELIC_LICENSE_KEY=your-new-relic-key

# Cache TTL (seconds)
CACHE_TTL_SEARCH=300
CACHE_TTL_PRODUCT=3600
CACHE_TTL_KNOWLEDGE=86400

# Features
FEATURE_AI=true
FEATURE_CACHE=true
FEATURE_METRICS=true
FEATURE_WEBHOOKS=true
FEATURE_BATCH=true
MAINTENANCE_MODE=false

# Limits
MAX_REQUEST_SIZE=10mb
MAX_UPLOAD_SIZE=50mb
MAX_BATCH_SIZE=100
MAX_QUERY_COMPLEXITY=10
QUERY_TIMEOUT=30000

# Logging
LOG_LEVEL=info
LOG_FORMAT=json
LOG_DESTINATION=file
LOG_PATH=./logs
LOG_MAX_SIZE=100m
LOG_MAX_FILES=30

# Paths
UPLOAD_PATH=./uploads
TEMP_PATH=./temp
EXPORT_PATH=./exports
BACKUP_PATH=./backups
`;

    fs.writeFileSync('.env.production.example', template);
    console.log('Created .env.production.example file');
  }
}

// Create singleton instance
const config = new ProductionConfig();

export default config;
export { ProductionConfig };