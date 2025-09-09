# API Documentation
# PDS Adhesive Search Platform

## Base URL
```
http://localhost:3000/api
```

## Authentication
Currently, the API is open. JWT authentication will be implemented in Phase 4.

---

## Endpoints

### 1. Product Search

#### `POST /api/search`
Search for adhesive products with various filters and options.

**Request Body:**
```json
{
  "query": "epoxy high temperature",
  "filters": {
    "category": "Epoxy",
    "subcategory": "181-M, 20163",
    "specifications": {
      "thermal": {
        "maxTemperature": 200
      }
    }
  },
  "pagination": {
    "limit": 25,
    "offset": 0
  },
  "sort": {
    "relevance": -1
  }
}
```

**Response:**
```json
{
  "query": "epoxy high temperature",
  "products": [
    {
      "productId": "X-177-051-C",
      "name": "High Temperature Epoxy",
      "category": "Epoxy",
      "subcategory": "181-M, 20163",
      "description": "flex circuit coating - 181-M, 20163 adhesive",
      "specifications": {
        "xNumbers": ["X-177-051-C"],
        "features": ["Dry surface cure", "no refrigeration"],
        "thermal": {
          "maxTemperature": 250,
          "minTemperature": -55
        }
      },
      "variants": {
        "count": 2648
      }
    }
  ],
  "documents": [
    {
      "_id": "507f1f77bcf86cd799439011",
      "title": "Technical Data Sheet",
      "productIds": ["X-177-051-C"],
      "type": "PDF"
    }
  ],
  "totalCount": 1798,
  "pagination": {
    "limit": 25,
    "offset": 0,
    "hasMore": true
  }
}
```

**Status Codes:**
- `200 OK` - Successful search
- `400 Bad Request` - Invalid query parameters
- `500 Internal Server Error` - Server error

---

### 2. Autofill Suggestions

#### `GET /api/search/suggestions`
Get autofill suggestions for search input.

**Query Parameters:**
- `q` (required): Search prefix (minimum 2 characters)
- `limit` (optional): Maximum suggestions (default: 10)

**Example:**
```
GET /api/search/suggestions?q=X-17&limit=5
```

**Response:**
```json
{
  "suggestions": [
    "X-177-051-C",
    "X-177-073-B",
    "X-177-021-A",
    "X-177-065-C",
    "X-177-035-T"
  ]
}
```

---

### 3. Search by X_NUMBER

#### `GET /api/products/x-number/:xnumber`
Search for products by exact X_NUMBER.

**Example:**
```
GET /api/products/x-number/X-177-051-C
```

**Response:**
```json
{
  "products": [
    {
      "productId": "X-177-051-C",
      "category": "Epoxy",
      "description": "flex circuit coating - 181-M, 20163 adhesive",
      "specifications": {
        "xNumbers": ["X-177-051-C"],
        "features": ["Dry surface cure"]
      }
    }
  ],
  "count": 1
}
```

---

### 4. Product Comparison

#### `POST /api/search/compare`
Compare multiple products side by side.

**Request Body:**
```json
{
  "productIds": ["X-177-051-C", "X-428-009-A", "1-CN0025"]
}
```

**Response:**
```json
{
  "comparison": {
    "products": [
      {
        "productId": "X-177-051-C",
        "category": "Epoxy",
        "specifications": { ... }
      },
      {
        "productId": "X-428-009-A",
        "category": "Epoxy",
        "specifications": { ... }
      },
      {
        "productId": "1-CN0025",
        "category": "Specialty Adhesive",
        "specifications": { ... }
      }
    ],
    "differences": {
      "category": ["Epoxy", "Epoxy", "Specialty Adhesive"],
      "maxTemperature": [250, 200, 150]
    }
  }
}
```

**Constraints:**
- Minimum 2 products
- Maximum 5 products

---

### 5. Get Categories

#### `GET /api/products/categories`
Get all available product categories.

**Response:**
```json
{
  "categories": [
    {
      "name": "Epoxy",
      "count": 1798
    },
    {
      "name": "Specialty Adhesive",
      "count": 209
    }
  ],
  "total": 2
}
```

---

### 6. Get Facets

#### `GET /api/search/facets`
Get available search facets for filtering.

**Query Parameters:**
- `baseQuery` (optional): Base search query

**Response:**
```json
{
  "facets": {
    "categories": [
      { "value": "Epoxy", "count": 1798 },
      { "value": "Specialty Adhesive", "count": 209 }
    ],
    "subcategories": [
      { "value": "181-M, 20163", "count": 1500 },
      { "value": "215-CTH-UR-SC", "count": 50 }
    ],
    "features": [
      { "value": "Dry surface cure", "count": 1200 },
      { "value": "UV cure", "count": 300 }
    ]
  }
}
```

---

### 7. Product Details

#### `GET /api/products/:productId`
Get detailed information about a specific product.

**Example:**
```
GET /api/products/X-177-051-C
```

**Response:**
```json
{
  "product": {
    "productId": "X-177-051-C",
    "name": "High Temperature Epoxy",
    "category": "Epoxy",
    "subcategory": "181-M, 20163",
    "description": "flex circuit coating adhesive",
    "specifications": {
      "xNumbers": ["X-177-051-C"],
      "features": ["Dry surface cure", "no refrigeration"],
      "thermal": {
        "maxTemperature": 250,
        "minTemperature": -55,
        "units": "°C"
      },
      "mechanical": {
        "tensileStrength": 3500,
        "elongation": 5,
        "units": "psi"
      }
    },
    "variants": {
      "count": 2648,
      "list": ["A", "B", "C"]
    },
    "relatedDocuments": [
      {
        "_id": "507f1f77bcf86cd799439011",
        "title": "Technical Data Sheet",
        "type": "PDF",
        "url": "/documents/X-177-051-C-TDS.pdf"
      }
    ],
    "metadata": {
      "createdAt": "2024-01-15",
      "updatedAt": "2024-12-01",
      "status": "active"
    }
  }
}
```

---

### 8. Related Documents

#### `GET /api/products/:productId/documents`
Get all documents related to a specific product.

**Example:**
```
GET /api/products/X-177-051-C/documents
```

**Response:**
```json
{
  "productId": "X-177-051-C",
  "documents": [
    {
      "_id": "507f1f77bcf86cd799439011",
      "title": "Technical Data Sheet",
      "type": "PDF",
      "size": "2.5MB",
      "url": "/documents/X-177-051-C-TDS.pdf"
    },
    {
      "_id": "507f1f77bcf86cd799439012",
      "title": "Safety Data Sheet",
      "type": "PDF",
      "size": "1.2MB",
      "url": "/documents/X-177-051-C-SDS.pdf"
    }
  ],
  "count": 2
}
```

---

## Error Handling

All endpoints return consistent error responses:

```json
{
  "error": {
    "code": "INVALID_REQUEST",
    "message": "Query parameter is required",
    "details": {
      "field": "query",
      "requirement": "minimum 2 characters"
    }
  },
  "timestamp": "2024-12-09T10:30:00Z"
}
```

### Error Codes
- `INVALID_REQUEST` - Request validation failed
- `NOT_FOUND` - Resource not found
- `SERVER_ERROR` - Internal server error
- `RATE_LIMIT` - Rate limit exceeded
- `UNAUTHORIZED` - Authentication required (future)

---

## Rate Limiting

Current limits (per IP):
- 100 requests per minute
- 1000 requests per hour

Headers returned:
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1638360000
```

---

## Pagination

Standard pagination parameters:
- `limit`: Number of results (default: 25, max: 100)
- `offset`: Starting position (default: 0)

Response includes:
```json
{
  "pagination": {
    "limit": 25,
    "offset": 0,
    "total": 1798,
    "hasMore": true,
    "pages": 72
  }
}
```

---

## Search Query Syntax

### Simple Search
```
"epoxy"
```

### Phrase Search
```
"high temperature epoxy"
```

### X_NUMBER Search
```
"X-177-051-C"
```

### Category Search
```
"category:Epoxy"
```

### Range Search (future)
```
"temperature:150-250"
```

---

## Response Formats

All responses are in JSON format with UTF-8 encoding.

### Success Response Structure
```json
{
  "data": { ... },
  "meta": {
    "timestamp": "2024-12-09T10:30:00Z",
    "version": "2.0",
    "requestId": "req_abc123"
  }
}
```

### List Response Structure
```json
{
  "items": [ ... ],
  "count": 50,
  "total": 1798,
  "pagination": { ... }
}
```

---

## Webhooks (Future)

Planned webhook events:
- `product.created`
- `product.updated`
- `document.added`
- `search.performed`

---

## SDK Support (Future)

Planned SDKs:
- JavaScript/TypeScript
- Python
- Java
- .NET

---

## Testing

### Test Environment
```
https://api-test.adhesive-search.com
```

### Sample Test Data
Test product IDs:
- `X-177-051-C` (Epoxy)
- `1-CN0025` (Specialty Adhesive)
- `X-428-009-A` (Epoxy with variants)

---

## Changelog

### Version 2.0 (December 2024)
- Added AE Search Service integration
- Implemented autofill suggestions
- Added product comparison endpoint
- Improved search performance

### Version 1.0 (November 2024)
- Initial API release
- Basic search functionality
- Category filtering

---

## Support

For API support, contact:
- Email: api-support@adhesive-search.com
- Documentation: https://docs.adhesive-search.com/api
- Status Page: https://status.adhesive-search.com

---

*Last Updated: December 2024*
*API Version: 2.0*