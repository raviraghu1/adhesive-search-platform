import mongoose from 'mongoose';

const { Schema } = mongoose;

// Sub-schemas
const SearchHistorySchema = new Schema({
  sessionId: String,
  timestamp: { type: Date, default: Date.now, index: true },
  query: { type: String, required: true },
  query_type: {
    type: String,
    enum: ['text', 'numeric', 'faceted', 'combined'],
  },
  refinements: [String],
  filters: Schema.Types.Mixed,
  selected_products: [{ type: String, ref: 'Product' }],
  actions: [{
    type: String,
    enum: ['view_details', 'download_tds', 'compare', 'add_to_cart', 'request_sample'],
  }],
  results_count: Number,
  click_position: Number,
  time_to_click: Number, // in seconds
  session_duration: Number, // in seconds
  feedback_score: { type: Number, min: 1, max: 5 },
  successful: { type: Boolean, default: false },
}, { _id: false });

const ConversationHistorySchema = new Schema({
  sessionId: String,
  timestamp: { type: Date, default: Date.now },
  messages: [{
    role: { type: String, enum: ['user', 'assistant'] },
    content: String,
    timestamp: Date,
  }],
  extracted_requirements: {
    temperature_range: { min: Number, max: Number },
    substrates: [String],
    cure_time: Number,
    strength_requirements: Schema.Types.Mixed,
    certifications: [String],
  },
  outcomes: {
    products_recommended: [String],
    products_selected: [String],
    converted: Boolean,
    satisfaction_score: Number,
  },
}, { _id: false });

const PreferenceRangeSchema = new Schema({
  min: Number,
  max: Number,
  unit: String,
  importance: { type: Number, min: 0, max: 1, default: 0.5 },
}, { _id: false });

const BehaviorPatternSchema = new Schema({
  search_frequency: {
    type: String,
    enum: ['daily', 'weekly', 'monthly', 'occasional'],
  },
  avg_session_duration: Number, // in minutes
  preferred_search_style: {
    type: String,
    enum: ['technical', 'conversational', 'comparative', 'exploratory'],
  },
  decision_factors: [{
    factor: String,
    weight: { type: Number, min: 0, max: 1 },
  }],
  typical_time_of_day: String,
  device_preference: {
    type: String,
    enum: ['desktop', 'mobile', 'tablet'],
  },
}, { _id: false });

// Main Customer Preference Schema
const CustomerPreferenceSchema = new Schema({
  customerId: {
    type: String,
    required: true,
    unique: true,
    index: true,
  },
  
  companyId: {
    type: String,
    required: true,
    index: true,
  },
  
  // Profile Information
  profile: {
    industry: {
      type: String,
      required: true,
      enum: ['automotive', 'aerospace', 'electronics', 'medical', 'construction', 'marine', 'general'],
    },
    role: {
      type: String,
      enum: ['engineer', 'procurement', 'r&d', 'technician', 'manager', 'other'],
    },
    department: String,
    experience_level: {
      type: String,
      enum: ['beginner', 'intermediate', 'advanced', 'expert'],
    },
    location: {
      country: String,
      region: String,
      timezone: String,
    },
    language: { type: String, default: 'en' },
    company_size: {
      type: String,
      enum: ['small', 'medium', 'large', 'enterprise'],
    },
  },
  
  // Search Preferences
  preferences: {
    search: {
      default_view: {
        type: String,
        enum: ['grid', 'list', 'table', 'technical'],
        default: 'grid',
      },
      results_per_page: { type: Number, default: 25 },
      sort_by: {
        type: String,
        enum: ['relevance', 'name', 'newest', 'price', 'availability'],
        default: 'relevance',
      },
      show_out_of_stock: { type: Boolean, default: false },
      auto_suggestions: { type: Boolean, default: true },
      units: {
        type: String,
        enum: ['metric', 'imperial'],
        default: 'metric',
      },
    },
    
    products: {
      favorite_categories: [String],
      preferred_brands: [String],
      excluded_brands: [String],
      required_certifications: [String],
      
      attributes: {
        priority_order: [String],
        ranges: {
          temperature: PreferenceRangeSchema,
          cure_time: PreferenceRangeSchema,
          strength: PreferenceRangeSchema,
          viscosity: PreferenceRangeSchema,
          shelf_life: PreferenceRangeSchema,
        },
        must_have: [String],
        nice_to_have: [String],
        exclude: [String],
      },
      
      substrates: {
        frequently_used: [String],
        combinations: [{
          substrate1: String,
          substrate2: String,
          frequency: Number,
        }],
      },
    },
    
    export: {
      default_format: {
        type: String,
        enum: ['pdf', 'excel', 'word', 'csv'],
        default: 'pdf',
      },
      include_images: { type: Boolean, default: true },
      include_pricing: { type: Boolean, default: false },
      language: { type: String, default: 'en' },
      branding: {
        type: String,
        enum: ['none', 'company', 'custom'],
        default: 'company',
      },
      auto_email: { type: Boolean, default: false },
      email_recipients: [String],
    },
    
    notifications: {
      new_products: { type: Boolean, default: true },
      price_changes: { type: Boolean, default: false },
      technical_updates: { type: Boolean, default: true },
      inventory_alerts: { type: Boolean, default: false },
      newsletter: { type: Boolean, default: true },
      frequency: {
        type: String,
        enum: ['immediate', 'daily', 'weekly', 'monthly'],
        default: 'weekly',
      },
    },
  },
  
  // Search and Interaction History
  search_history: [SearchHistorySchema],
  conversation_history: [ConversationHistorySchema],
  
  // Behavior Analysis
  behavior_patterns: BehaviorPatternSchema,
  
  // Saved Items
  saved: {
    products: [{ 
      productId: { type: String, ref: 'Product' },
      saved_date: Date,
      notes: String,
      tags: [String],
    }],
    searches: [{
      name: String,
      query: String,
      filters: Schema.Types.Mixed,
      created_date: Date,
      last_used: Date,
      frequency: Number,
    }],
    comparisons: [{
      name: String,
      products: [String],
      created_date: Date,
      shared_with: [String],
    }],
    documents: [{
      document_id: String,
      document_type: String,
      saved_date: Date,
    }],
  },
  
  // Recommendation Scores
  recommendations: {
    viewed_products: [String],
    purchased_products: [{
      productId: String,
      purchase_date: Date,
      quantity: Number,
    }],
    rejected_products: [String],
    model_scores: {
      collaborative: { type: Number, min: 0, max: 1 },
      content_based: { type: Number, min: 0, max: 1 },
      hybrid: { type: Number, min: 0, max: 1 },
    },
    last_updated: Date,
  },
  
  // Analytics
  analytics: {
    total_searches: { type: Number, default: 0 },
    successful_searches: { type: Number, default: 0 },
    search_success_rate: Number,
    avg_time_to_find: Number, // in seconds
    most_searched_categories: [{
      category: String,
      count: Number,
    }],
    most_viewed_products: [{
      productId: String,
      views: Number,
    }],
    conversion_rate: Number,
    last_active: Date,
    account_age_days: Number,
  },
  
  // Permissions and Settings
  permissions: {
    can_view_pricing: { type: Boolean, default: true },
    can_download_documents: { type: Boolean, default: true },
    can_request_samples: { type: Boolean, default: true },
    can_access_technical_data: { type: Boolean, default: true },
    data_sharing_consent: { type: Boolean, default: false },
    marketing_consent: { type: Boolean, default: false },
  },
  
  // Status
  status: {
    type: String,
    enum: ['active', 'inactive', 'suspended', 'deleted'],
    default: 'active',
  },
  
  // Metadata
  created_by: String,
  updated_by: String,
  last_login: Date,
  login_count: { type: Number, default: 0 },
  
}, {
  timestamps: true,
  collection: 'customer_preferences',
});

// Indexes
CustomerPreferenceSchema.index({ companyId: 1, status: 1 });
CustomerPreferenceSchema.index({ 'profile.industry': 1 });
CustomerPreferenceSchema.index({ 'search_history.timestamp': -1 });
CustomerPreferenceSchema.index({ 'analytics.last_active': -1 });

// Virtual properties
CustomerPreferenceSchema.virtual('isActive').get(function() {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  return this.analytics.last_active > thirtyDaysAgo;
});

// Methods
CustomerPreferenceSchema.methods.addSearchHistory = async function(searchData) {
  this.search_history.push(searchData);
  
  // Keep only last 100 searches
  if (this.search_history.length > 100) {
    this.search_history = this.search_history.slice(-100);
  }
  
  // Update analytics
  this.analytics.total_searches++;
  if (searchData.successful) {
    this.analytics.successful_searches++;
  }
  this.analytics.search_success_rate = 
    this.analytics.successful_searches / this.analytics.total_searches;
  this.analytics.last_active = new Date();
  
  await this.save();
};

CustomerPreferenceSchema.methods.updateBehaviorPatterns = async function() {
  const recentSearches = this.search_history.slice(-20);
  
  if (recentSearches.length > 0) {
    // Calculate average session duration
    const durations = recentSearches
      .filter(s => s.session_duration)
      .map(s => s.session_duration);
    
    if (durations.length > 0) {
      this.behavior_patterns.avg_session_duration = 
        durations.reduce((a, b) => a + b, 0) / durations.length / 60; // Convert to minutes
    }
    
    // Determine preferred search style
    const styles = recentSearches.map(s => s.query_type);
    const styleCounts = {};
    styles.forEach(style => {
      styleCounts[style] = (styleCounts[style] || 0) + 1;
    });
    
    const mostCommonStyle = Object.keys(styleCounts).reduce((a, b) => 
      styleCounts[a] > styleCounts[b] ? a : b
    );
    
    const styleMap = {
      'text': 'conversational',
      'numeric': 'technical',
      'faceted': 'exploratory',
      'combined': 'comparative',
    };
    
    this.behavior_patterns.preferred_search_style = styleMap[mostCommonStyle] || 'technical';
  }
  
  await this.save();
};

CustomerPreferenceSchema.methods.getPersonalizedSuggestions = function(context) {
  const suggestions = [];
  
  // Based on search history
  const recentQueries = this.search_history.slice(-10).map(s => s.query);
  
  // Based on saved products
  const savedCategories = this.saved.products.map(p => p.category);
  
  // Based on behavior patterns
  if (this.behavior_patterns.preferred_search_style === 'technical') {
    suggestions.push('Try using numeric filters for more precise results');
  }
  
  // Based on preferences
  if (this.preferences.products.favorite_categories.length > 0) {
    suggestions.push(`Explore new products in ${this.preferences.products.favorite_categories[0]}`);
  }
  
  return suggestions;
};

// Static methods
CustomerPreferenceSchema.statics.findByCompany = async function(companyId) {
  return this.find({ companyId, status: 'active' });
};

CustomerPreferenceSchema.statics.findByIndustry = async function(industry) {
  return this.find({ 'profile.industry': industry, status: 'active' });
};

CustomerPreferenceSchema.statics.getActiveUsers = async function(days = 30) {
  const cutoffDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  return this.find({ 'analytics.last_active': { $gte: cutoffDate } });
};

// Middleware
CustomerPreferenceSchema.pre('save', function(next) {
  // Update account age
  if (this.createdAt) {
    this.analytics.account_age_days = 
      Math.floor((Date.now() - this.createdAt) / (1000 * 60 * 60 * 24));
  }
  
  next();
});

const CustomerPreference = mongoose.model('CustomerPreference', CustomerPreferenceSchema);

export default CustomerPreference;