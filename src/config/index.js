import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../../.env') });

const config = {
  // Server Configuration
  server: {
    env: process.env.NODE_ENV || 'development',
    port: parseInt(process.env.PORT, 10) || 3000,
    host: process.env.HOST || 'localhost',
    isDevelopment: process.env.NODE_ENV === 'development',
    isProduction: process.env.NODE_ENV === 'production',
    isTest: process.env.NODE_ENV === 'test',
  },

  // MongoDB Atlas Configuration
  mongodb: {
    uri: process.env.MONGODB_URI || process.env.MONGODB_ATLAS_URI,
    dbName: process.env.MONGODB_DB_NAME || 'PDSAdhesiveSearch',
    collections: {
      products: process.env.MONGODB_COLLECTION_PRODUCTS || 'AESearchDatabase',
      documents: process.env.MONGODB_COLLECTION_DOCUMENTS || 'AdhesivePDSDocumentMaster',
      search: process.env.MONGODB_COLLECTION_SEARCH || 'PDSAdhesiveSearchCollection',
      preferences: process.env.MONGODB_COLLECTION_PREFERENCES || 'CustomerPreferences',
      knowledge: process.env.MONGODB_COLLECTION_KNOWLEDGE || 'KnowledgeBase',
    },
    options: {
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 45000,
      retryWrites: true,
      w: 'majority',
    },
  },

  // Azure OpenAI Configuration
  azure: {
    openai: {
      endpoint: process.env.AZURE_OPENAI_ENDPOINT,
      apiKey: process.env.AZURE_OPENAI_API_KEY,
      deploymentName: process.env.AZURE_OPENAI_DEPLOYMENT_NAME || 'gpt-5-mini',
      apiVersion: process.env.AZURE_OPENAI_API_VERSION || '2024-01-01-preview',
    },
    ad: {
      tenantId: process.env.AZURE_AD_TENANT_ID,
      clientId: process.env.AZURE_AD_CLIENT_ID,
      clientSecret: process.env.AZURE_AD_CLIENT_SECRET,
    },
  },

  // Redis Configuration
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT, 10) || 6379,
    password: process.env.REDIS_PASSWORD,
    db: parseInt(process.env.REDIS_DB, 10) || 0,
    ttl: parseInt(process.env.REDIS_TTL, 10) || 3600,
    keyPrefix: 'adhesive:',
  },

  // JWT Configuration
  jwt: {
    secret: process.env.JWT_SECRET || 'default-secret-change-in-production',
    expiresIn: process.env.JWT_EXPIRES_IN || '24h',
    refreshSecret: process.env.JWT_REFRESH_SECRET || 'refresh-secret-change-in-production',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  },

  // Rate Limiting
  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS, 10) || 900000, // 15 minutes
    maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS, 10) || 100,
  },

  // Logging
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    file: process.env.LOG_FILE || 'logs/app.log',
    console: true,
    json: process.env.NODE_ENV === 'production',
  },

  // Search Configuration
  search: {
    maxResults: parseInt(process.env.SEARCH_MAX_RESULTS, 10) || 50,
    defaultLimit: parseInt(process.env.SEARCH_DEFAULT_LIMIT, 10) || 25,
    vectorDimensions: parseInt(process.env.VECTOR_SEARCH_DIMENSIONS, 10) || 1536,
    similarityThreshold: parseFloat(process.env.SIMILARITY_THRESHOLD) || 0.7,
  },

  // Export Configuration
  export: {
    timeoutMs: parseInt(process.env.EXPORT_TIMEOUT_MS, 10) || 30000,
    maxBatchSize: parseInt(process.env.EXPORT_MAX_BATCH_SIZE, 10) || 100,
    tempDir: process.env.EXPORT_TEMP_DIR || './temp/exports',
  },

  // Monitoring
  monitoring: {
    enabled: process.env.ENABLE_METRICS === 'true',
    port: parseInt(process.env.METRICS_PORT, 10) || 9090,
  },

  // API Versioning
  api: {
    version: 'v1',
    prefix: '/api',
  },

  // CORS Configuration
  cors: {
    origin: process.env.CORS_ORIGIN?.split(',') || ['http://localhost:3000'],
    credentials: true,
    optionsSuccessStatus: 200,
  },
};

// Validate required configuration
const validateConfig = () => {
  const errors = [];

  if (!config.mongodb.uri) {
    errors.push('MongoDB URI is required');
  }

  if (config.server.isProduction) {
    if (!config.azure.openai.endpoint || !config.azure.openai.apiKey) {
      errors.push('Azure OpenAI credentials are required in production');
    }
    if (config.jwt.secret === 'default-secret-change-in-production') {
      errors.push('JWT secret must be changed in production');
    }
  }

  if (errors.length > 0) {
    console.error('Configuration errors:', errors);
    if (config.server.isProduction) {
      process.exit(1);
    }
  }
};

validateConfig();

export default config;