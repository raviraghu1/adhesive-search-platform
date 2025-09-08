import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import Product from '../../../src/models/Product.js';

describe('Product Model', () => {
  let mongoServer;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();
    await mongoose.connect(mongoUri);
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  afterEach(async () => {
    await Product.deleteMany({});
  });

  describe('Product Creation', () => {
    it('should create a product with valid data', async () => {
      const productData = {
        productId: 'TEST-001',
        name: 'Test Adhesive',
        category: 'structural_adhesive',
        specifications: {
          thermal: {
            temperature_range: {
              min: -40,
              max: 150,
              unit: 'celsius',
            },
          },
        },
      };

      const product = new Product(productData);
      const savedProduct = await product.save();

      expect(savedProduct.productId).toBe('TEST-001');
      expect(savedProduct.name).toBe('Test Adhesive');
      expect(savedProduct.category).toBe('structural_adhesive');
      expect(savedProduct.specifications.thermal.temperature_range.max).toBe(150);
    });

    it('should require productId', async () => {
      const product = new Product({
        name: 'Test Adhesive',
        category: 'structural_adhesive',
      });

      await expect(product.save()).rejects.toThrow();
    });

    it('should enforce unique productId', async () => {
      const productData = {
        productId: 'TEST-001',
        name: 'Test Adhesive',
        category: 'structural_adhesive',
      };

      await Product.create(productData);
      
      const duplicate = new Product(productData);
      await expect(duplicate.save()).rejects.toThrow();
    });
  });

  describe('Data Quality Calculation', () => {
    it('should calculate data quality score', async () => {
      const product = new Product({
        productId: 'TEST-001',
        name: 'Test Adhesive',
        category: 'structural_adhesive',
        description: 'A test adhesive product',
        specifications: {
          thermal: {
            temperature_range: { min: -40, max: 150 },
          },
        },
        applications: {
          industries: ['automotive'],
        },
      });

      product.calculateDataQuality();
      
      expect(product.data_quality.completeness_score).toBeGreaterThan(0);
      expect(product.data_quality.completeness_score).toBeLessThanOrEqual(1);
      expect(product.data_quality.field_coverage.critical_fields).toBeGreaterThan(0);
    });
  });

  describe('Search by Specifications', () => {
    beforeEach(async () => {
      await Product.create([
        {
          productId: 'HIGH-TEMP-001',
          name: 'High Temperature Adhesive',
          category: 'structural_adhesive',
          specifications: {
            thermal: { temperature_range: { min: -20, max: 200 } },
            mechanical: { tensile_strength: { value: 5000, unit: 'psi' } },
            cure: { full_cure: { value: 24, unit: 'hours' } },
          },
        },
        {
          productId: 'LOW-TEMP-001',
          name: 'Low Temperature Adhesive',
          category: 'structural_adhesive',
          specifications: {
            thermal: { temperature_range: { min: -40, max: 80 } },
            mechanical: { tensile_strength: { value: 3000, unit: 'psi' } },
            cure: { full_cure: { value: 12, unit: 'hours' } },
          },
        },
      ]);
    });

    it('should find products by temperature range', async () => {
      const results = await Product.searchBySpecs({
        temperature_max: 150,
      });

      expect(results).toHaveLength(1);
      expect(results[0].productId).toBe('LOW-TEMP-001');
    });

    it('should find products by tensile strength', async () => {
      const results = await Product.searchBySpecs({
        tensile_strength_min: 4000,
      });

      expect(results).toHaveLength(1);
      expect(results[0].productId).toBe('HIGH-TEMP-001');
    });

    it('should find products by cure time', async () => {
      const results = await Product.searchBySpecs({
        cure_time_max: 20,
      });

      expect(results).toHaveLength(1);
      expect(results[0].productId).toBe('LOW-TEMP-001');
    });
  });

  describe('Virtual Properties', () => {
    it('should generate fullName virtual property', () => {
      const product = new Product({
        productId: 'TEST-001',
        name: 'Test Adhesive',
        category: 'structural_adhesive',
      });

      expect(product.fullName).toBe('TEST-001 - Test Adhesive');
    });
  });
});