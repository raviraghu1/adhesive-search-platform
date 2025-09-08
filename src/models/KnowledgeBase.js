import mongoose from 'mongoose';

const { Schema } = mongoose;

// Sub-schemas
const ContentSectionSchema = new Schema({
  heading: { type: String, required: true },
  content: { type: String, required: true },
  order: { type: Number, default: 0 },
  entities: [String],
  relevance_score: { type: Number, min: 0, max: 1 },
}, { _id: false });

const DocumentSourceSchema = new Schema({
  type: {
    type: String,
    enum: ['pdf', 'word', 'excel', 'web', 'manual', 'database', 'other'],
    required: true,
  },
  location: String,
  url: String,
  file_path: String,
  last_modified: Date,
  checksum: String,
  version: String,
  language: { type: String, default: 'en' },
}, { _id: false });

const RelationshipSchema = new Schema({
  products: [{ type: String, ref: 'Product' }],
  related_documents: [{ type: Schema.Types.ObjectId, ref: 'KnowledgeBase' }],
  categories: [String],
  standards: [String],
  parent_topics: [String],
  child_topics: [String],
  see_also: [String],
}, { _id: false });

const QualityMetricsSchema = new Schema({
  accuracy_score: { type: Number, min: 0, max: 1, default: 0 },
  completeness: { type: Number, min: 0, max: 1, default: 0 },
  relevance: { type: Number, min: 0, max: 1, default: 0 },
  freshness: { type: Number, min: 0, max: 1, default: 0 },
  confidence: { type: Number, min: 0, max: 1, default: 0 },
  validation_status: {
    type: String,
    enum: ['pending', 'validated', 'needs_review', 'rejected'],
    default: 'pending',
  },
  last_reviewed: Date,
  reviewed_by: String,
}, { _id: false });

// Main Knowledge Base Schema
const KnowledgeBaseSchema = new Schema({
  entityId: {
    type: String,
    required: true,
    unique: true,
    index: true,
  },
  
  type: {
    type: String,
    required: true,
    index: true,
    enum: [
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
      'technical_document',
      'other',
    ],
  },
  
  title: {
    type: String,
    required: true,
    index: 'text',
  },
  
  summary: {
    type: String,
    maxlength: 500,
  },
  
  // Main content
  content: {
    overview: String,
    sections: [ContentSectionSchema],
    full_text: String,
    
    // Structured content for different types
    technical_data: {
      specifications: Schema.Types.Mixed,
      test_results: Schema.Types.Mixed,
      formulations: Schema.Types.Mixed,
      procedures: [String],
    },
    
    faq_data: {
      question: String,
      answer: String,
      category: String,
      frequency: { type: Number, default: 0 },
    },
    
    troubleshooting_data: {
      problem: String,
      symptoms: [String],
      causes: [String],
      solutions: [{
        description: String,
        steps: [String],
        success_rate: Number,
      }],
    },
    
    glossary_data: {
      term: String,
      definition: String,
      acronym: String,
      related_terms: [String],
    },
  },
  
  // Source information
  source: DocumentSourceSchema,
  
  // Relationships
  relationships: RelationshipSchema,
  
  // Metadata
  metadata: {
    author: String,
    created_date: Date,
    updated_date: Date,
    expiry_date: Date,
    tags: [String],
    keywords: [String],
    industry: [String],
    applications: [String],
    difficulty_level: {
      type: String,
      enum: ['basic', 'intermediate', 'advanced', 'expert'],
    },
    reading_time_minutes: Number,
    language: { type: String, default: 'en' },
  },
  
  // Search optimization
  search_data: {
    keywords: [String],
    concepts: [String],
    entities: [String],
    vectors: {
      title_embedding: [Number],
      content_embedding: [Number],
      concept_embedding: [Number],
    },
    search_count: { type: Number, default: 0 },
    click_count: { type: Number, default: 0 },
    usefulness_score: { type: Number, default: 0 },
  },
  
  // Tables and structured data
  tables: [{
    name: String,
    headers: [String],
    data: [[Schema.Types.Mixed]],
    description: String,
  }],
  
  // Images and media
  media: [{
    type: {
      type: String,
      enum: ['image', 'video', 'diagram', 'chart', 'graph'],
    },
    caption: String,
    url: String,
    alt_text: String,
    analysis: String,
    thumbnail_url: String,
  }],
  
  // External references
  references: [{
    title: String,
    author: String,
    url: String,
    type: String,
    date: Date,
  }],
  
  // Quality metrics
  quality: QualityMetricsSchema,
  
  // Status and workflow
  status: {
    type: String,
    enum: ['draft', 'published', 'archived', 'deprecated'],
    default: 'draft',
    index: true,
  },
  
  visibility: {
    type: String,
    enum: ['public', 'internal', 'restricted'],
    default: 'public',
  },
  
  // Tracking
  created_by: String,
  updated_by: String,
  import_source: String,
  import_date: Date,
  
  // Analytics
  analytics: {
    views: { type: Number, default: 0 },
    shares: { type: Number, default: 0 },
    feedback_positive: { type: Number, default: 0 },
    feedback_negative: { type: Number, default: 0 },
    avg_time_on_page: Number,
    bounce_rate: Number,
  },
}, {
  timestamps: true,
  collection: 'knowledge_base',
});

// Indexes
KnowledgeBaseSchema.index({ type: 1, status: 1 });
KnowledgeBaseSchema.index({ 'relationships.products': 1 });
KnowledgeBaseSchema.index({ 'metadata.tags': 1 });
KnowledgeBaseSchema.index({ 'metadata.industry': 1 });
KnowledgeBaseSchema.index({ 'search_data.concepts': 1 });

// Virtual properties
KnowledgeBaseSchema.virtual('qualityScore').get(function() {
  const weights = {
    accuracy_score: 0.3,
    completeness: 0.25,
    relevance: 0.25,
    freshness: 0.2,
  };
  
  return Object.keys(weights).reduce((score, metric) => {
    return score + (this.quality[metric] * weights[metric]);
  }, 0);
});

// Methods
KnowledgeBaseSchema.methods.incrementView = async function() {
  this.analytics.views++;
  this.search_data.search_count++;
  await this.save();
};

KnowledgeBaseSchema.methods.addFeedback = async function(isPositive) {
  if (isPositive) {
    this.analytics.feedback_positive++;
  } else {
    this.analytics.feedback_negative++;
  }
  
  // Update usefulness score
  const total = this.analytics.feedback_positive + this.analytics.feedback_negative;
  if (total > 0) {
    this.search_data.usefulness_score = this.analytics.feedback_positive / total;
  }
  
  await this.save();
};

KnowledgeBaseSchema.methods.calculateRelevance = function(query) {
  // Simple relevance calculation based on keyword matches
  const queryWords = query.toLowerCase().split(' ');
  const titleWords = this.title.toLowerCase().split(' ');
  const keywords = this.search_data.keywords.map(k => k.toLowerCase());
  
  let score = 0;
  
  queryWords.forEach(word => {
    if (titleWords.includes(word)) score += 2;
    if (keywords.includes(word)) score += 1;
    if (this.content.full_text && this.content.full_text.toLowerCase().includes(word)) score += 0.5;
  });
  
  return Math.min(score / queryWords.length, 1);
};

// Static methods
KnowledgeBaseSchema.statics.findByProduct = async function(productId) {
  return this.find({ 'relationships.products': productId });
};

KnowledgeBaseSchema.statics.findByConcept = async function(concept) {
  return this.find({ 'search_data.concepts': concept });
};

KnowledgeBaseSchema.statics.searchFAQ = async function(query) {
  return this.find({
    type: 'faq',
    $text: { $search: query },
  }).sort({ 'search_data.usefulness_score': -1 });
};

KnowledgeBaseSchema.statics.getMostViewed = async function(limit = 10) {
  return this.find({ status: 'published' })
    .sort({ 'analytics.views': -1 })
    .limit(limit);
};

// Middleware
KnowledgeBaseSchema.pre('save', function(next) {
  // Update quality metrics
  if (!this.quality.last_reviewed) {
    this.quality.last_reviewed = new Date();
  }
  
  // Calculate freshness based on age
  const ageInDays = (Date.now() - this.updatedAt) / (1000 * 60 * 60 * 24);
  if (ageInDays < 30) {
    this.quality.freshness = 1;
  } else if (ageInDays < 90) {
    this.quality.freshness = 0.8;
  } else if (ageInDays < 180) {
    this.quality.freshness = 0.6;
  } else if (ageInDays < 365) {
    this.quality.freshness = 0.4;
  } else {
    this.quality.freshness = 0.2;
  }
  
  // Extract keywords if not present
  if (!this.search_data.keywords || this.search_data.keywords.length === 0) {
    const text = `${this.title} ${this.summary} ${this.content.overview}`.toLowerCase();
    const words = text.split(/\s+/).filter(word => word.length > 3);
    const uniqueWords = [...new Set(words)];
    this.search_data.keywords = uniqueWords.slice(0, 20);
  }
  
  next();
});

const KnowledgeBase = mongoose.model('KnowledgeBase', KnowledgeBaseSchema);

export default KnowledgeBase;