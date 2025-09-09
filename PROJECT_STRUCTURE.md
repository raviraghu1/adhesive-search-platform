# PDS Adhesive Platform - Project Structure

## Overview
The PDS Adhesive Platform has been restructured into two separate, independently manageable services:

1. **Knowledge Base Service** - Manages data state, history, and auto-refresh
2. **Search Application** - Provides AI-powered search capabilities

## Architecture

```
adhesive-search-platform/
├── knowledge-base-service/     # Knowledge Base Management
│   ├── src/                    # Service source code
│   ├── scripts/                # KB maintenance scripts
│   ├── tests/                  # KB tests
│   └── README.md               # KB documentation
│
├── search-application/         # Search Service
│   ├── src/                    # Application source code
│   ├── scripts/                # Data management scripts
│   ├── tests/                  # Search tests
│   └── README.md               # Search documentation
│
└── PROJECT_STRUCTURE.md        # This file
```

## Service Separation Benefits

### Independent Development
- Each service can be developed and deployed independently
- Different teams can work on different services
- Reduced complexity per service

### Scalability
- Services can be scaled independently based on load
- Knowledge Base can run on different infrastructure than Search
- Better resource utilization

### Maintenance
- Updates to one service don't affect the other
- Easier debugging and monitoring
- Independent versioning

## Running the Services

### Option 1: Run Both Services Together
```bash
# Terminal 1 - Knowledge Base Service
cd knowledge-base-service
npm install
npm start
# Runs on port 3001

# Terminal 2 - Search Application
cd search-application
npm install
npm start
# Runs on port 3000
```

### Option 2: Run Services Independently
Each service can run standalone with its own MongoDB connection.

## Communication Between Services

The services communicate via:
1. **Shared MongoDB Database** - Both services connect to the same MongoDB instance
2. **REST APIs** - Services can call each other's APIs when needed
3. **Event-driven updates** - Auto-refresh updates trigger search index rebuilds

## MongoDB Collections

### Source Database (PDSAdhesives)
- `AEdatabase` - 2,858 product specifications and attributes
- `AdhesivePDSDocumentMaster` - 443 technical documents
- **Relationship**: AEdatabase.PdsId → AdhesivePDSDocumentMaster._id (Many-to-One)

### Shared Collections (PDSAdhesiveSearch)
- `AESearchDatabase` - 2,007 imported products (209 PdsProducts + 1,798 X_NUMBER products)
- `AdhesivePDSDocumentMaster` - 443 enriched documents with AE attributes

### Knowledge Base Collections
- `KnowledgeBaseCurrentState` - Current entity states (51 entities)
- `KnowledgeBaseShortTermHistory` - Recent changes (time-series)
- `KnowledgeBaseLongTermArchive` - Compressed archives
- `KnowledgeBaseSnapshots` - System snapshots (6 snapshots)

### Search Collections
- `PDSAdhesiveSearchCollection` - Search indexes
- `SearchCache` - Cached search results
- `UserSearchHistory` - Search analytics
- `CustomerPreferences` - User preferences and settings

## Deployment Options

### Docker Compose
```yaml
version: '3.8'
services:
  knowledge-base:
    build: ./knowledge-base-service
    ports:
      - "3001:3001"
    environment:
      - MONGODB_URI=${MONGODB_URI}
  
  search-app:
    build: ./search-application
    ports:
      - "3000:3000"
    environment:
      - MONGODB_URI=${MONGODB_URI}
      - AZURE_OPENAI_API_KEY=${AZURE_OPENAI_API_KEY}
```

### Kubernetes
Each service can have its own deployment, service, and scaling configuration.

### Cloud Services
- Knowledge Base: AWS Lambda / Azure Functions for scheduled tasks
- Search App: Container instances with auto-scaling

## Environment Variables

### Common Variables
```env
MONGODB_URI=mongodb+srv://...
MONGODB_DB_NAME=PDSAdhesiveSearch
NODE_ENV=production
```

### Knowledge Base Specific
```env
KB_SERVICE_PORT=3001
REFRESH_INTERVAL=1200000  # 20 minutes
```

### Search Application Specific
```env
PORT=3000
AZURE_OPENAI_ENDPOINT=https://...
AZURE_OPENAI_API_KEY=...
CACHE_TTL=300  # 5 minutes
```

## Development Workflow

1. **Feature Development**
   - Develop features in respective service directories
   - Test independently
   - Deploy independently

2. **Testing**
   - Unit tests per service
   - Integration tests for inter-service communication
   - End-to-end tests for complete flow

3. **Deployment**
   - CI/CD pipelines per service
   - Independent versioning
   - Rolling updates without downtime

## Monitoring

### Health Checks
- Knowledge Base: `http://localhost:3001/health`
- Search App: `http://localhost:3000/health`

### Logs
- Knowledge Base: `knowledge-base-service/logs/`
- Search App: `search-application/logs/`

### Metrics
- Response times
- Error rates
- Resource usage
- API call counts

## Migration from Monolith

The original monolithic application has been split into:
1. **Data Layer** → Knowledge Base Service
2. **Business Logic** → Search Application
3. **Scheduled Tasks** → KB Auto-refresh scripts

All original functionality is preserved while gaining the benefits of microservices architecture.

## Next Steps

1. Set up CI/CD pipelines for each service
2. Implement service discovery for dynamic communication
3. Add API gateway for unified access point
4. Implement distributed tracing for debugging
5. Set up centralized logging with ELK stack

## Support

For issues or questions:
- Knowledge Base Service: See `knowledge-base-service/README.md`
- Search Application: See `search-application/README.md`
- General Architecture: Create issue in main repository