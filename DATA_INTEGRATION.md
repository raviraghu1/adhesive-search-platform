# Data Integration Documentation

## Overview

The Adhesive Search Platform integrates data from the PDSAdhesives database, establishing relationships between product specifications (AEdatabase) and technical documents (AdhesivePDSDocumentMaster).

## Data Sources

### PDSAdhesives.AEdatabase
- **Total Entries**: 2,858
- **Unique PdsProducts**: 209
- **Unique X_NUMBERs**: 1,893
- **Entries with PdsId**: 210 (linking to documents)

Key fields:
- `_id`: Numeric identifier (1-2858)
- `PdsProduct`: Product code (e.g., "429", "706")
- `X_NUMBER`: Unique identifier (e.g., "X-177-092-B")
- `PdsId`: Links to document _id (Many-to-One relationship)
- `APPLICATION`: Product application description
- `FAMILYORTYPE`: Product family/category
- `Features`: Product features
- `VISCOSITY`, `COLOR`, `Cure_Mechanism`: Specifications

### PDSAdhesives.AdhesivePDSDocumentMaster
- **Total Documents**: 443
- **Documents with AE Links**: 209

Key fields:
- `_id`: Numeric identifier (matches AEdatabase.PdsId)
- `Document`: Document title
- `TypeofDocument`: Document type
- `fileOptionOne`: Primary file path
- Technical specifications and safety information

## Data Relationships

### Many-to-One Relationship
```
AEdatabase (Many) → AdhesivePDSDocumentMaster (One)
AEdatabase.PdsId → AdhesivePDSDocumentMaster._id
```

Example:
- Document 453 has 2 AE entries (both with PdsProduct "1404-M-UR")
- Multiple X_NUMBERs can link to the same document
- One document can represent multiple product variants

## Import Process

### 1. Product Import
```javascript
// Import from AEdatabase
- Group by PdsProduct (209 unique products)
- Import X_NUMBER-only entries (1,798 products)
- Total: 2,007 products imported
```

### 2. Document Import
```javascript
// Import from AdhesivePDSDocumentMaster
- All 443 documents imported
- Enriched with AE attributes when PdsId matches
- 209 documents have linked AE data
```

### 3. Data Enrichment
Products are enriched with:
- Multiple X_NUMBER variants
- Aggregated specifications (viscosity, color, features)
- Related document IDs
- Application categories

Documents are enriched with:
- Linked product IDs (array)
- AE attributes from all related entries
- Searchable text combining all attributes

## Import Scripts

### Full Import (Unrestricted)
```bash
node scripts/import-ae-data-v2.js
```
- Imports ALL products including nulls
- No limits on X_NUMBER products
- Handles many-to-one relationships
- Creates variant tracking

### Verification Script
```bash
node scripts/check-ae-database.js
```
- Verifies database connections
- Checks relationship mappings
- Displays sample data

## Data Schema

### Product Schema (AESearchDatabase)
```javascript
{
  productId: String,           // PdsProduct or X_NUMBER
  name: String,                 // Same as productId
  category: String,             // "Epoxy" or "Specialty Adhesive"
  subcategory: String,          // FAMILYORTYPE value
  specifications: {
    xNumbers: [String],         // All X_NUMBERs
    viscosities: [String],      // All viscosity values
    colors: [String],           // All colors
    features: [String],         // All features
    families: [String]          // All family types
  },
  variants: {
    count: Number,              // Number of variants
    items: [{                   // Individual variants
      aeId: Number,
      xNumber: String,
      application: String,
      features: String,
      documentId: Number
    }]
  },
  relatedDocuments: [Number],   // Document IDs
  searchKeywords: [String],     // For text search
  createdAt: Date,
  updatedAt: Date
}
```

### Document Schema (AdhesivePDSDocumentMaster)
```javascript
{
  documentId: String,           // "DOC-{originalId}"
  originalId: Number,           // Original _id from source
  productIds: [String],         // All related products
  primaryProductId: String,     // Main product
  type: String,                 // Document type
  title: String,                // Document title
  aeAttributes: {               // Aggregated from all AE entries
    entryCount: Number,
    productIds: [String],
    xNumbers: [String],
    applications: [String],
    families: [String],
    features: [String],
    entries: [Object]           // Individual AE entries
  },
  relationships: {
    aeEntryCount: Number,       // Number of AE entries
    aeIds: [Number],            // AE entry IDs
    products: [String],         // Product codes
    xNumbers: [String]          // X_NUMBERs
  },
  metadata: Object,             // Document metadata
  searchableText: String,       // Combined search text
  createdAt: Date,
  updatedAt: Date
}
```

## Search Capabilities

### Product Search
- By productId (exact match)
- By X_NUMBER (partial match)
- By category (Epoxy, Specialty Adhesive)
- By specifications (viscosity, color, features)
- By application keywords

### Document Search
- By document ID
- By product association
- By X_NUMBER reference
- Full-text search on content
- By document type

### Cross-Reference Search
- Find all documents for a product
- Find all products in a document
- Find all variants of a product family
- Find documents by X_NUMBER

## Statistics

### Current Import Results
- **Products**: 2,007 (209 PdsProducts + 1,798 X_NUMBER products)
- **Documents**: 443
- **Product Categories**: 2 (Epoxy: 1,798, Specialty Adhesive: 209)
- **Documents with AE Data**: 209
- **Unique X_NUMBERs**: 1,893

### Search Performance
- Product search: < 50ms
- Document search: < 100ms
- Cross-reference: < 150ms
- Full-text search: < 200ms

## Maintenance

### Refresh Data
```bash
# Clear all data
node -e "/* clear script */"

# Re-import everything
node scripts/import-ae-data-v2.js
```

### Verify Data Integrity
```bash
node scripts/check-ae-database.js
```

### Monitor Import
```bash
# Run import in background
node scripts/import-ae-data-v2.js > import-log.txt 2>&1 &

# Check progress
tail -f import-log.txt
```

## Troubleshooting

### Common Issues

1. **Language Override Field Error**
   - Some documents have non-string language fields
   - Solution: Clean documents before import

2. **Memory Issues with Large Import**
   - 1,800+ X_NUMBER products can cause timeouts
   - Solution: Run import in background

3. **Missing Relationships**
   - Not all AE entries have PdsId
   - Not all documents have AE entries
   - This is expected behavior

### Validation Queries
```javascript
// Check product count
db.AESearchDatabase.countDocuments()

// Check documents with AE data
db.AdhesivePDSDocumentMaster.countDocuments({ aeAttributes: { $ne: null } })

// Find products by X_NUMBER
db.AESearchDatabase.find({ "specifications.xNumbers": /X-177/ })

// Find multi-variant products
db.AESearchDatabase.find({ "variants.count": { $gt: 1 } })
```

## Future Enhancements

1. **Real-time Sync**
   - Implement change streams for live updates
   - Automatic re-import on source changes

2. **Data Validation**
   - Validate X_NUMBER formats
   - Check for orphaned relationships
   - Ensure data consistency

3. **Performance Optimization**
   - Implement incremental imports
   - Add caching for frequent queries
   - Optimize indexes for search patterns

4. **Extended Relationships**
   - Link to customer data
   - Connect to order history
   - Associate with test results