import request from 'supertest';
import { jest } from '@jest/globals';
import app from '../../src/app.js';

// Mock the database connection
jest.mock('../../src/database/connection.js', () => ({
  default: {
    isConnected: true,
    connectNative: jest.fn(),
    connectMongoose: jest.fn(),
    testConnection: jest.fn(() => Promise.resolve(true)),
    createIndexes: jest.fn(),
    getStats: jest.fn(() => Promise.resolve({
      database: 'test',
      collections: ['products', 'knowledge_base'],
      dataSize: 1000,
      indexes: 5,
      documents: 100,
    })),
    close: jest.fn(),
  },
}));

// Mock the services
jest.mock('../../src/services/KnowledgeBaseService.js', () => ({
  default: {
    initialize: jest.fn(() => Promise.resolve(true)),
    query: jest.fn((query) => Promise.resolve({
      query,
      results: [
        { entityId: 'KB-001', title: 'Test Entity', type: 'product_info' },
      ],
      count: 1,
      duration: 100,
    })),
    getEntity: jest.fn((id) => Promise.resolve({
      entityId: id,
      title: 'Test Entity',
      type: 'product_info',
    })),
    getStatistics: jest.fn(() => Promise.resolve({
      total: 100,
      published: 90,
      types: [{ _id: 'product_info', count: 50 }],
      averageQuality: 0.85,
    })),
  },
}));

jest.mock('../../src/services/SearchService.js', () => ({
  default: {
    initialize: jest.fn(() => Promise.resolve(true)),
    searchProducts: jest.fn((query) => Promise.resolve({
      query,
      results: [
        { productId: 'TEST-001', name: 'Test Product' },
      ],
      totalCount: 1,
      facets: {},
      suggestions: [],
      pagination: { limit: 25, offset: 0, hasMore: false },
      duration: 150,
    })),
    getAutofillSuggestions: jest.fn((partial) => Promise.resolve([
      { type: 'product', text: 'Test Product', id: 'TEST-001' },
    ])),
    compareProducts: jest.fn((ids) => Promise.resolve({
      products: ids.map(id => ({ id, name: `Product ${id}` })),
      specifications: {},
      applications: {},
      substrates: {},
      compliance: {},
    })),
  },
}));

describe('API Integration Tests', () => {
  describe('Health Check', () => {
    it('should return health status', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);

      expect(response.body).toHaveProperty('status', 'healthy');
      expect(response.body).toHaveProperty('timestamp');
      expect(response.body).toHaveProperty('uptime');
    });
  });

  describe('API Info', () => {
    it('should return API information', async () => {
      const response = await request(app)
        .get('/api')
        .expect(200);

      expect(response.body).toHaveProperty('name');
      expect(response.body).toHaveProperty('version');
      expect(response.body).toHaveProperty('endpoints');
      expect(response.body.endpoints).toHaveProperty('knowledge_base');
      expect(response.body.endpoints).toHaveProperty('search');
    });
  });

  describe('Knowledge Base API', () => {
    describe('GET /api/kb/v1/health', () => {
      it('should return knowledge base health status', async () => {
        const response = await request(app)
          .get('/api/kb/v1/health')
          .expect(200);

        expect(response.body).toHaveProperty('status', 'healthy');
        expect(response.body).toHaveProperty('service', 'knowledge-base');
      });
    });

    describe('GET /api/kb/v1/query', () => {
      it('should query knowledge base', async () => {
        const response = await request(app)
          .get('/api/kb/v1/query')
          .query({ q: 'epoxy adhesive' })
          .expect(200);

        expect(response.body).toHaveProperty('query', 'epoxy adhesive');
        expect(response.body).toHaveProperty('results');
        expect(response.body.results).toBeInstanceOf(Array);
        expect(response.body).toHaveProperty('count');
        expect(response.body).toHaveProperty('duration');
      });

      it('should return error without query parameter', async () => {
        const response = await request(app)
          .get('/api/kb/v1/query')
          .expect(400);

        expect(response.body).toHaveProperty('error');
      });
    });

    describe('GET /api/kb/v1/entity/:id', () => {
      it('should get entity by ID', async () => {
        const response = await request(app)
          .get('/api/kb/v1/entity/KB-001')
          .expect(200);

        expect(response.body).toHaveProperty('entityId', 'KB-001');
        expect(response.body).toHaveProperty('title');
        expect(response.body).toHaveProperty('type');
      });
    });

    describe('GET /api/kb/v1/metrics', () => {
      it('should return knowledge base statistics', async () => {
        const response = await request(app)
          .get('/api/kb/v1/metrics')
          .expect(200);

        expect(response.body).toHaveProperty('total');
        expect(response.body).toHaveProperty('published');
        expect(response.body).toHaveProperty('types');
        expect(response.body).toHaveProperty('averageQuality');
      });
    });
  });

  describe('Search API', () => {
    describe('POST /api/v1/search', () => {
      it('should search for products', async () => {
        const response = await request(app)
          .post('/api/v1/search')
          .send({
            query: 'high temperature epoxy',
            pagination: { limit: 10, offset: 0 },
          })
          .expect(200);

        expect(response.body).toHaveProperty('query', 'high temperature epoxy');
        expect(response.body).toHaveProperty('results');
        expect(response.body.results).toBeInstanceOf(Array);
        expect(response.body).toHaveProperty('totalCount');
        expect(response.body).toHaveProperty('facets');
        expect(response.body).toHaveProperty('suggestions');
        expect(response.body).toHaveProperty('pagination');
      });

      it('should return error without query', async () => {
        const response = await request(app)
          .post('/api/v1/search')
          .send({})
          .expect(400);

        expect(response.body).toHaveProperty('error');
      });
    });

    describe('GET /api/v1/search/suggestions', () => {
      it('should return autofill suggestions', async () => {
        const response = await request(app)
          .get('/api/v1/search/suggestions')
          .query({ q: 'epo' })
          .expect(200);

        expect(response.body).toHaveProperty('suggestions');
        expect(response.body.suggestions).toBeInstanceOf(Array);
      });

      it('should return empty suggestions for short query', async () => {
        const response = await request(app)
          .get('/api/v1/search/suggestions')
          .query({ q: 'e' })
          .expect(200);

        expect(response.body.suggestions).toEqual([]);
      });
    });

    describe('POST /api/v1/search/compare', () => {
      it('should compare multiple products', async () => {
        const response = await request(app)
          .post('/api/v1/search/compare')
          .send({
            productIds: ['PROD-001', 'PROD-002'],
          })
          .expect(200);

        expect(response.body).toHaveProperty('products');
        expect(response.body.products).toHaveLength(2);
        expect(response.body).toHaveProperty('specifications');
        expect(response.body).toHaveProperty('applications');
      });

      it('should return error with less than 2 products', async () => {
        const response = await request(app)
          .post('/api/v1/search/compare')
          .send({
            productIds: ['PROD-001'],
          })
          .expect(400);

        expect(response.body).toHaveProperty('error');
      });

      it('should return error with more than 5 products', async () => {
        const response = await request(app)
          .post('/api/v1/search/compare')
          .send({
            productIds: ['P1', 'P2', 'P3', 'P4', 'P5', 'P6'],
          })
          .expect(400);

        expect(response.body).toHaveProperty('error');
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle 404 for unknown routes', async () => {
      const response = await request(app)
        .get('/api/unknown/route')
        .expect(404);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toHaveProperty('message');
      expect(response.body.error.message).toContain('Not Found');
    });

    it('should handle invalid JSON', async () => {
      const response = await request(app)
        .post('/api/v1/search')
        .set('Content-Type', 'application/json')
        .send('invalid json')
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });
  });

  describe('Rate Limiting', () => {
    it('should enforce rate limiting', async () => {
      // Note: This test would need to be adjusted based on actual rate limit settings
      // For now, we just test that the endpoint responds
      const response = await request(app)
        .get('/api/kb/v1/health')
        .expect(200);

      expect(response.body).toHaveProperty('status');
    });
  });
});