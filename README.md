# PDS Adhesive Intelligent Search Platform

AI-powered intelligent search platform for adhesive products, leveraging MongoDB Atlas Search and Azure OpenAI for natural language processing.

## Features

- 🔍 **Natural Language Search**: Convert queries like "adhesive for metal-to-plastic bonding" into structured searches
- 🧠 **Semantic Search**: Find products by meaning, not just keywords
- 📊 **Multi-modal Results**: Combine product specs, documents, and recommendations
- ⚡ **Real-time Performance**: <2 second response for 95% of queries
- 📚 **Knowledge Base**: Comprehensive product and technical documentation
- 🎯 **Personalized Recommendations**: Customer preference-based suggestions
- 📈 **Numeric Comparisons**: Support for >, <, between operators on specifications
- 📄 **Multi-format Export**: PDF, Excel, Word, CSV, JSON export capabilities

## Architecture

### Sprint 1 - Standalone Knowledge Base (Implemented)
- ✅ Independent knowledge base service
- ✅ REST API for knowledge queries
- ✅ Data extraction from MongoDB collections
- ✅ Entity relationship mapping
- ✅ Quality metrics tracking

### Core Components
- **Knowledge Base Service**: Manages technical documentation and product information
- **Search Service**: Natural language processing and intelligent search
- **MongoDB Models**: Product, KnowledgeBase, CustomerPreference schemas
- **REST APIs**: Comprehensive endpoints for search and knowledge base operations

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

### Product Schema
- Product identification (ID, name, category)
- Technical specifications (thermal, mechanical, chemical)
- Substrate compatibility matrix
- Applications and industries
- Compliance and certifications
- Search optimization data

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