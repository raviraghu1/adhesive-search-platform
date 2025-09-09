# PDS Adhesive Intelligent Search Platform

AI-powered intelligent search platform for 2,000+ adhesive products, leveraging MongoDB Atlas and providing comprehensive search capabilities across product specifications and technical documentation.

## 🚀 Current Status

**Version 2.0** - Production Ready with AE Search Service
- ✅ **2,007 products** successfully imported from AEdatabase
- ✅ **443 technical documents** linked to products
- ✅ **Full-text search** across all product fields
- ✅ **X_NUMBER search** for direct product identification
- ✅ **Category filtering** (Epoxy, Specialty Adhesive)
- ✅ **Autofill suggestions** for improved UX
- ✅ **Comprehensive test coverage** with all features verified

## Features

### Core Search Capabilities
- 🔍 **Text Search**: Search across product names, descriptions, and specifications
- 🏷️ **X_NUMBER Search**: Direct product lookup using unique identifiers
- 📊 **Category Filtering**: Filter by Epoxy (1,798) or Specialty Adhesive (209)
- 💡 **Autofill Suggestions**: Real-time search suggestions as you type
- 📄 **Document Integration**: Access related technical documentation
- ⚡ **Fast Performance**: <100ms response time for most queries
- 📈 **Pagination**: Efficient handling of large result sets
- 🔄 **Product Comparison**: Compare multiple products side-by-side

### Data Coverage
- **Products**: 2,007 unique adhesive products
- **Categories**: 2 main categories (Epoxy, Specialty Adhesive)
- **Documents**: 443 technical documents
- **Specifications**: Thermal, mechanical, chemical properties
- **Variants**: Track multiple product configurations

## Architecture

### Current Implementation
- ✅ **AE Search Service**: Core search functionality for AEdatabase products
- ✅ **MongoDB Atlas**: Cloud database with optimized indexes
- ✅ **REST API**: Comprehensive endpoints for all operations
- ✅ **Data Integration**: Complete import from AEdatabase
- ✅ **Document Relationships**: Many-to-one mapping via PdsId

### Core Components
- **AESearchService**: Main search service for product queries
- **SearchService**: Advanced search operations and filtering
- **DatabaseConnection**: MongoDB connection management
- **Search Controller**: API endpoint handlers
- **Data Models**: Product, Document, Preference schemas

## Prerequisites

- Node.js 18+ 
- MongoDB Atlas account (required)
- Azure OpenAI API credentials (optional, for AI features)
- Redis (for caching)

## MongoDB Atlas Setup

1. **Create MongoDB Atlas Account**:
   - Go to [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
   - Sign up for a free account or log in

2. **Create a Cluster**:
   - Click "Create a New Cluster"
   - Choose your preferred cloud provider and region
   - Select cluster tier (M0 Sandbox is free)

3. **Configure Security**:
   - Go to "Database Access" and create a database user
   - Go to "Network Access" and add your IP address (or 0.0.0.0/0 for development)

4. **Get Connection String**:
   - Click "Connect" on your cluster
   - Choose "Connect your application"
   - Copy the connection string
   - Replace `<password>` with your database user password
   - Update the database name in the connection string to `PDSAdhesiveSearch`

5. **Create Required Collections**:
   The application will automatically create collections on first run:
   - `AESearchDatabase` - Product catalog
   - `AdhesivePDSDocumentMaster` - Technical documents
   - `PDSAdhesiveSearchCollection` - Search history
   - `CustomerPreferences` - User preferences
   - `KnowledgeBase` - Knowledge entities

## Data Import

### Import AEdatabase Products and Documents
```bash
# Full unrestricted import (recommended)
node scripts/import-ae-data-v2.js

# Check database connections and verify data
node scripts/check-ae-database.js
```

This will import:
- **2,007 products** from AEdatabase (all PdsProducts and X_NUMBER entries)
- **443 documents** from AdhesivePDSDocumentMaster
- Establish many-to-one relationships via PdsId linking
- Aggregate attributes from multiple AE entries per document

## Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd adhesive-search-platform
```

2. Install dependencies:
```bash
npm install
```

3. Create environment file:
```bash
cp .env.example .env
```

4. Configure environment variables in `.env`:
```env
# MongoDB Atlas Configuration
# Get your connection string from MongoDB Atlas Dashboard
MONGODB_URI=mongodb+srv://username:password@your-cluster.mongodb.net/PDSAdhesiveSearch?retryWrites=true&w=majority
MONGODB_DB_NAME=PDSAdhesiveSearch

# Azure OpenAI Configuration (optional)
AZURE_OPENAI_ENDPOINT=https://your-resource.openai.azure.com
AZURE_OPENAI_API_KEY=your-api-key
AZURE_OPENAI_DEPLOYMENT_NAME=gpt-5-mini

# Redis Configuration
REDIS_HOST=localhost
REDIS_PORT=6379

# JWT Configuration
JWT_SECRET=your-secret-key-change-in-production
```

## Running the Application

### Development Mode
```bash
npm run dev
```

### Production Mode
```bash
npm start
```

### Running Tests
```bash
# Run all tests
npm test

# Run with coverage
npm test -- --coverage

# Run specific test file
npm test -- Product.test.js

# Watch mode
npm run test:watch
```

### Docker Deployment
```bash
# Build and run with Docker Compose
docker-compose up -d

# Build Docker image
docker build -t adhesive-search-platform .

# Run Docker container
docker run -p 3000:3000 --env-file .env adhesive-search-platform
```

## API Documentation

### Knowledge Base API

#### Health Check
```http
GET /api/kb/v1/health
```

#### Query Knowledge Base
```http
GET /api/kb/v1/query?q=epoxy+adhesive&limit=10
```

#### Get Entity
```http
GET /api/kb/v1/entity/{entityId}
```

#### Get Statistics
```http
GET /api/kb/v1/metrics
```

#### Extract and Build Knowledge Base
```http
POST /api/kb/v1/extract
```

### Search API

#### Search Products
```http
POST /api/v1/search
Content-Type: application/json

{
  "query": "high temperature epoxy for aluminum",
  "filters": {
    "category": "structural_adhesive"
  },
  "pagination": {
    "limit": 25,
    "offset": 0
  }
}
```

#### Get Autofill Suggestions
```http
GET /api/v1/search/suggestions?q=epox
```

#### Compare Products
```http
POST /api/v1/search/compare
Content-Type: application/json

{
  "productIds": ["PROD-001", "PROD-002", "PROD-003"]
}
```

## Data Models

### Product Schema (AESearchDatabase)
- Product identification (productId, name from PdsProduct or X_NUMBER)
- Category classification (Epoxy, Specialty Adhesive, etc.)
- Technical specifications aggregated from AEdatabase:
  - Multiple X_NUMBER variants per product
  - Viscosity, color, and cure mechanisms
  - Features and applications
- Relationships to technical documents via PdsId
- Search optimization with keywords
- Total: **2,007 products** (209 PdsProducts + 1,798 X_NUMBER products)

### Document Schema (AdhesivePDSDocumentMaster)
- Document identification and versioning
- Many-to-One relationship with AEdatabase entries
- Enriched with aggregated AE attributes when linked
- Technical content and safety information
- File paths and metadata
- Total: **443 documents** (209 with AE data links)

### AEdatabase Integration
- **2,858 total entries** in source database
- **Many-to-One relationship**: Multiple AE entries → Single document
- Linking field: `AEdatabase.PdsId` → `AdhesivePDSDocumentMaster._id`
- **1,893 unique X_NUMBERs** across all products

### Knowledge Base Schema
- Entity types (product_info, technical_concept, FAQ, etc.)
- Content sections with structured data
- Relationships and cross-references
- Quality metrics and validation
- Search vectors for semantic matching

### Customer Preference Schema
- User profile and industry
- Search preferences and history
- Behavior patterns analysis
- Saved products and searches
- Personalized recommendations

## Testing

The platform includes comprehensive test coverage:

- **Unit Tests**: Models, services, utilities
- **Integration Tests**: API endpoints, database operations
- **Test Coverage Goal**: >70% for all metrics

Run tests with:
```bash
npm test
```

## Performance Targets

- API Response Time: <500ms (p95)
- Search Latency: <2s (p99)
- System Availability: 99.9%
- Concurrent Users: 1000+
- Document Processing: 100 docs/minute

## Security Features

- JWT-based authentication
- Rate limiting on API endpoints
- Input sanitization and validation
- Helmet.js security headers
- CORS configuration
- Environment variable protection

## Monitoring

- Comprehensive logging with Winston
- Request tracking with Morgan
- Error tracking and reporting
- Performance metrics collection
- Health check endpoints

## Project Structure

```
adhesive-search-platform/
├── src/
│   ├── config/          # Configuration files
│   ├── controllers/     # Route controllers
│   ├── database/        # Database connection
│   ├── middleware/      # Express middleware
│   ├── models/          # Mongoose models
│   ├── routes/          # API routes
│   ├── services/        # Business logic
│   ├── utils/           # Utility functions
│   ├── app.js          # Express app setup
│   └── index.js        # Server entry point
├── tests/
│   ├── unit/           # Unit tests
│   ├── integration/    # Integration tests
│   └── setup.js        # Test configuration
├── docs/               # Documentation
├── scripts/            # Utility scripts
├── .env.example        # Environment template
├── Dockerfile          # Docker configuration
├── docker-compose.yml  # Docker Compose setup
├── jest.config.js      # Jest configuration
├── package.json        # Dependencies
└── README.md           # This file
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## License

MIT License - See LICENSE file for details

## Support

For issues and questions:
- Create an issue in the repository
- Contact the development team
- Check the documentation in `/docs`

## Roadmap

- [x] Sprint 1: Standalone Knowledge Base
- [ ] Sprint 2: Search UX Design & Development
- [ ] Sprint 3: Autofill & Intelligent Recommendations
- [ ] Sprint 4: Multi-Format Output Generation
- [ ] Sprint 5: Response Quality Analysis & Fine-Tuning

## Acknowledgments

- MongoDB Atlas for database and search capabilities
- Azure OpenAI for natural language processing
- Express.js community for the web framework
- All contributors and testers