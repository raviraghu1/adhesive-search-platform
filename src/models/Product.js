import mongoose from 'mongoose';

const { Schema } = mongoose;

// Sub-schemas for nested structures
const NumericSpecificationSchema = new Schema({
  value: { type: Number, required: true, index: true },
  unit: { type: String, required: true },
  temperature_c: Number,
  test_method: String,
  comparable: { type: Boolean, default: true },
  searchable: { type: Boolean, default: true },
  conversion: Schema.Types.Mixed,
}, { _id: false });

const TemperatureRangeSchema = new Schema({
  min: { type: Number, required: true, index: true },
  max: { type: Number, required: true, index: true },
  unit: { type: String, default: 'celsius' },
  comparable: { type: Boolean, default: true },
}, { _id: false });

const SubstrateCompatibilitySchema = new Schema({
  bond_strength: { 
    type: String, 
    enum: ['excellent', 'good', 'fair', 'poor', 'not_recommended'] 
  },
  prep_required: String,
  notes: String,
}, { _id: false });

const DataQualitySchema = new Schema({
  completeness_score: { type: Number, min: 0, max: 1, default: 0 },
  last_validated: { type: Date, default: Date.now },
  field_coverage: {
    critical_fields: { type: Number, min: 0, max: 1 },
    optional_fields: { type: Number, min: 0, max: 1 },
  },
  validation_status: {
    type: String,
    enum: ['pending', 'approved', 'rejected', 'needs_review'],
    default: 'pending',
  },
  enrichment_status: {
    type: String,
    enum: ['pending', 'in_progress', 'complete', 'failed'],
    default: 'pending',
  },
}, { _id: false });

// Main Product Schema
const ProductSchema = new Schema({
  productId: {
    type: String,
    required: true,
    unique: true,
    index: true,
    trim: true,
  },
  name: {
    type: String,
    required: true,
    index: 'text',
    trim: true,
  },
  description: {
    type: String,
    index: 'text',
  },
  category: {
    type: String,
    required: true,
    index: true,
    enum: ['structural_adhesive', 'sealant', 'coating', 'primer', 'tape', 'other'],
  },
  subcategory: {
    type: String,
    index: true,
  },
  
  // Technical Specifications with numeric comparison support
  specifications: {
    physical: {
      viscosity: NumericSpecificationSchema,
      density: NumericSpecificationSchema,
      color: String,
      appearance: String,
      odor: String,
      ph: NumericSpecificationSchema,
    },
    
    mechanical: {
      tensile_strength: NumericSpecificationSchema,
      lap_shear_strength: NumericSpecificationSchema,
      peel_strength: NumericSpecificationSchema,
      elongation: NumericSpecificationSchema,
      hardness: NumericSpecificationSchema,
      impact_resistance: NumericSpecificationSchema,
      compression_strength: NumericSpecificationSchema,
    },
    
    thermal: {
      temperature_range: TemperatureRangeSchema,
      glass_transition: NumericSpecificationSchema,
      thermal_conductivity: NumericSpecificationSchema,
      CTE: NumericSpecificationSchema,
      heat_deflection: NumericSpecificationSchema,
      flash_point: NumericSpecificationSchema,
    },
    
    cure: {
      working_time: NumericSpecificationSchema,
      fixture_time: NumericSpecificationSchema,
      full_cure: NumericSpecificationSchema,
      tack_free_time: NumericSpecificationSchema,
      cure_type: {
        type: String,
        enum: ['room_temp', 'heat', 'uv', 'moisture', 'anaerobic', 'two_part'],
      },
      accelerated_cure: {
        temperature: Number,
        time: Number,
        unit: String,
      },
    },
    
    chemical: {
      voc_content: NumericSpecificationSchema,
      shelf_life: NumericSpecificationSchema,
      mix_ratio: {
        resin: Number,
        hardener: Number,
        by: { type: String, enum: ['volume', 'weight'] },
      },
      composition: {
        resin_type: String,
        hardener_type: String,
        filler: String,
        additives: [String],
      },
      resistance: [String],
    },
    
    electrical: {
      dielectric_strength: NumericSpecificationSchema,
      volume_resistivity: NumericSpecificationSchema,
      dielectric_constant: NumericSpecificationSchema,
      dissipation_factor: NumericSpecificationSchema,
    },
  },
  
  // Application Data
  applications: {
    industries: [{
      type: String,
      index: true,
    }],
    specific_uses: [String],
    not_recommended_for: [String],
    typical_applications: [String],
    case_studies: [{
      title: String,
      description: String,
      industry: String,
      outcome: String,
    }],
  },
  
  // Substrate Compatibility
  substrates: {
    metals: {
      aluminum: SubstrateCompatibilitySchema,
      steel: SubstrateCompatibilitySchema,
      stainless: SubstrateCompatibilitySchema,
      copper: SubstrateCompatibilitySchema,
      brass: SubstrateCompatibilitySchema,
      titanium: SubstrateCompatibilitySchema,
    },
    plastics: {
      ABS: SubstrateCompatibilitySchema,
      PC: SubstrateCompatibilitySchema,
      nylon: SubstrateCompatibilitySchema,
      PVC: SubstrateCompatibilitySchema,
      PE: SubstrateCompatibilitySchema,
      PP: SubstrateCompatibilitySchema,
      PTFE: SubstrateCompatibilitySchema,
      acrylic: SubstrateCompatibilitySchema,
    },
    composites: {
      carbon_fiber: SubstrateCompatibilitySchema,
      fiberglass: SubstrateCompatibilitySchema,
      kevlar: SubstrateCompatibilitySchema,
    },
    others: {
      glass: SubstrateCompatibilitySchema,
      ceramic: SubstrateCompatibilitySchema,
      wood: SubstrateCompatibilitySchema,
      concrete: SubstrateCompatibilitySchema,
      rubber: SubstrateCompatibilitySchema,
    },
  },
  
  // Compliance & Certifications
  compliance: {
    environmental: [{
      type: String,
      index: true,
    }],
    industry: [String],
    safety: [String],
    quality: [String],
    certifications: [{
      name: String,
      issuer: String,
      date: Date,
      expiry: Date,
      document_url: String,
    }],
  },
  
  // Packaging & Availability
  packaging: {
    sizes: [{
      size: String,
      unit: String,
      sku: String,
      price: Number,
    }],
    min_order_quantity: Number,
    lead_time_days: Number,
    availability: {
      type: String,
      enum: ['in_stock', 'made_to_order', 'discontinued', 'limited'],
      default: 'in_stock',
    },
  },
  
  // Search Optimization
  search_data: {
    keywords: [String],
    synonyms: [String],
    common_misspellings: [String],
    vectors: {
      product_embedding: [Number],
      spec_embedding: [Number],
      application_embedding: [Number],
    },
    search_score: { type: Number, default: 0 },
  },
  
  // Related Products
  related_products: {
    alternatives: [{ type: String, ref: 'Product' }],
    complementary: [{ type: String, ref: 'Product' }],
    upgrades: [{ type: String, ref: 'Product' }],
    accessories: [{ type: String, ref: 'Product' }],
  },
  
  // Documentation
  documents: [{
    type: {
      type: String,
      enum: ['tds', 'sds', 'application_guide', 'certificate', 'case_study', 'other'],
    },
    title: String,
    url: String,
    language: String,
    version: String,
    updated_date: Date,
  }],
  
  // Data Quality
  data_quality: DataQualitySchema,
  
  // Metadata
  status: {
    type: String,
    enum: ['active', 'inactive', 'discontinued', 'pending'],
    default: 'active',
    index: true,
  },
  created_by: String,
  updated_by: String,
  import_source: String,
  import_date: Date,
  notes: String,
}, {
  timestamps: true,
  collection: 'products',
});

// Indexes for performance
ProductSchema.index({ 
  'specifications.thermal.temperature_range.max': 1,
  'specifications.mechanical.tensile_strength.value': -1,
});

ProductSchema.index({ 
  category: 1, 
  subcategory: 1, 
  status: 1 
});

ProductSchema.index({ 
  'applications.industries': 1 
});

ProductSchema.index({ 
  'compliance.environmental': 1 
});

// Virtual properties
ProductSchema.virtual('fullName').get(function() {
  return `${this.productId} - ${this.name}`;
});

// Methods
ProductSchema.methods.calculateDataQuality = function() {
  const requiredFields = ['productId', 'name', 'category', 'specifications'];
  const optionalFields = ['description', 'applications', 'substrates', 'compliance'];
  
  let criticalComplete = 0;
  let optionalComplete = 0;
  
  requiredFields.forEach(field => {
    if (this[field]) criticalComplete++;
  });
  
  optionalFields.forEach(field => {
    if (this[field]) optionalComplete++;
  });
  
  this.data_quality.field_coverage.critical_fields = criticalComplete / requiredFields.length;
  this.data_quality.field_coverage.optional_fields = optionalComplete / optionalFields.length;
  this.data_quality.completeness_score = 
    (this.data_quality.field_coverage.critical_fields * 0.7) + 
    (this.data_quality.field_coverage.optional_fields * 0.3);
  
  return this.data_quality.completeness_score;
};

// Static methods
ProductSchema.statics.searchBySpecs = async function(specs) {
  const query = {};
  
  if (specs.temperature_min) {
    query['specifications.thermal.temperature_range.min'] = { $gte: specs.temperature_min };
  }
  
  if (specs.temperature_max) {
    query['specifications.thermal.temperature_range.max'] = { $lte: specs.temperature_max };
  }
  
  if (specs.tensile_strength_min) {
    query['specifications.mechanical.tensile_strength.value'] = { $gte: specs.tensile_strength_min };
  }
  
  if (specs.cure_time_max) {
    query['specifications.cure.full_cure.value'] = { $lte: specs.cure_time_max };
  }
  
  return this.find(query);
};

// Middleware
ProductSchema.pre('save', function(next) {
  this.calculateDataQuality();
  this.data_quality.last_validated = new Date();
  next();
});

const Product = mongoose.model('Product', ProductSchema);

export default Product;