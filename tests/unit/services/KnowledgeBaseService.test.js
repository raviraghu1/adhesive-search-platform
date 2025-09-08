import { jest } from '@jest/globals';
import knowledgeBaseService from '../../../src/services/KnowledgeBaseService.js';

// Mock the models
jest.mock('../../../src/models/KnowledgeBase.js');
jest.mock('../../../src/models/Product.js');
jest.mock('../../../src/database/connection.js', () => ({
  default: {
    isConnected: true,
    connectNative: jest.fn(),
    connectMongoose: jest.fn(),
    getCollection: jest.fn(() => ({
      find: jest.fn(() => ({
        toArray: jest.fn(() => Promise.resolve([
          {
            productId: 'TEST-001',
            name: 'Test Product',
            category: 'epoxy',
            specifications: {
              thermal: { temperature_range: { min: -40, max: 150 } },
            },
          },
        ])),
      })),
    })),
  },
}));

describe('KnowledgeBaseService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Initialization', () => {
    it('should initialize successfully', async () => {
      const result = await knowledgeBaseService.initialize();
      expect(result).toBe(true);
      expect(knowledgeBaseService.initialized).toBe(true);
    });
  });

  describe('Product Knowledge Entity Creation', () => {
    it('should create knowledge entity from product data', async () => {
      const productData = {
        productId: 'TEST-001',
        name: 'Test Adhesive',
        description: 'A test adhesive product',
        category: 'epoxy',
        subcategory: 'structural',
        specifications: {
          thermal: {
            temperature_range: { min: -40, max: 150 },
          },
        },
        applications: {
          industries: ['automotive', 'aerospace'],
          specific_uses: ['bonding', 'sealing'],
        },
        compliance: {
          environmental: ['RoHS', 'REACH'],
          industry: ['ASTM D1002'],
        },
      };

      const entity = await knowledgeBaseService.createProductKnowledgeEntity(productData);

      expect(entity.entityId).toBe('KB-PROD-TEST-001');
      expect(entity.type).toBe('product_info');
      expect(entity.title).toBe('Test Adhesive');
      expect(entity.metadata.industry).toContain('automotive');
      expect(entity.relationships.standards).toContain('ASTM D1002');
    });

    it('should handle missing optional fields', async () => {
      const productData = {
        productId: 'TEST-002',
        name: 'Minimal Product',
        category: 'sealant',
      };

      const entity = await knowledgeBaseService.createProductKnowledgeEntity(productData);

      expect(entity.entityId).toBe('KB-PROD-TEST-002');
      expect(entity.type).toBe('product_info');
      expect(entity.title).toBe('Minimal Product');
      expect(entity.metadata.industry).toEqual([]);
    });
  });

  describe('Section Extraction', () => {
    it('should extract sections from product data', () => {
      const productData = {
        specifications: {
          thermal: { temperature_range: { min: -40, max: 150 } },
        },
        applications: {
          industries: ['automotive'],
        },
        substrates: {
          metals: { aluminum: { bond_strength: 'excellent' } },
        },
        compliance: {
          environmental: ['RoHS'],
        },
      };

      const sections = knowledgeBaseService.extractProductSections(productData);

      expect(sections).toHaveLength(4);
      expect(sections[0].heading).toBe('Technical Specifications');
      expect(sections[1].heading).toBe('Applications');
      expect(sections[2].heading).toBe('Substrate Compatibility');
      expect(sections[3].heading).toBe('Compliance & Certifications');
    });
  });

  describe('Standards Extraction', () => {
    it('should extract standards from product data', () => {
      const productData = {
        compliance: {
          industry: ['ISO 9001', 'ASTM D1002'],
        },
        specifications: {
          mechanical: {
            tensile_strength: {
              test_method: 'ASTM D638',
            },
          },
        },
      };

      const standards = knowledgeBaseService.extractStandards(productData);

      expect(standards).toContain('ISO 9001');
      expect(standards).toContain('ASTM D1002');
      expect(standards).toContain('ASTM D638');
    });
  });

  describe('Tag Generation', () => {
    it('should generate appropriate tags', () => {
      const productData = {
        category: 'epoxy',
        subcategory: 'structural',
        specifications: {
          cure: { cure_type: 'heat' },
          thermal: { temperature_range: { max: 200 } },
          cure: { working_time: { value: 5 } },
        },
      };

      const tags = knowledgeBaseService.generateTags(productData);

      expect(tags).toContain('epoxy');
      expect(tags).toContain('structural');
      expect(tags).toContain('heat');
      expect(tags).toContain('high-temperature');
      expect(tags).toContain('fast-cure');
    });
  });

  describe('Completeness Calculation', () => {
    it('should calculate completeness score correctly', () => {
      const completeProduct = {
        productId: 'TEST-001',
        name: 'Complete Product',
        category: 'epoxy',
        specifications: {},
        description: 'Description',
        applications: {},
        substrates: {},
        compliance: {},
      };

      const score = knowledgeBaseService.calculateCompleteness(completeProduct);
      expect(score).toBeGreaterThan(0.5);
      expect(score).toBeLessThanOrEqual(1);
    });

    it('should handle minimal product data', () => {
      const minimalProduct = {
        productId: 'TEST-002',
        name: 'Minimal Product',
        category: 'sealant',
      };

      const score = knowledgeBaseService.calculateCompleteness(minimalProduct);
      expect(score).toBeGreaterThan(0);
      expect(score).toBeLessThan(0.5);
    });
  });
});