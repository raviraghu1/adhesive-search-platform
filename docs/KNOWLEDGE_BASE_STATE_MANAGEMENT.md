# Knowledge Base State Management System

## Overview

The Knowledge Base State Management System provides a comprehensive solution for maintaining current state, tracking historical changes, and optimizing search performance through intelligent data archival and compression.

## Architecture

### Three-Tier Data Model

```
┌─────────────────────────────────────────────────────────────┐
│                     Current State                           │
│  • Real-time data                                          │
│  • Immediate access                                        │
│  • Full indexing                                          │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                  Short-Term History                         │
│  • Recent changes (< 30 days)                              │
│  • Time-series storage                                     │
│  • Minute-level granularity                               │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                  Long-Term History                          │
│  • Compressed archives (> 30 days)                         │
│  • Daily aggregation                                       │
│  • 2-year retention                                        │
└─────────────────────────────────────────────────────────────┘
```

## Collections

### 1. KnowledgeBaseCurrentState
- **Purpose**: Stores the current state of all knowledge base entities
- **Features**:
  - Full-text search indexing
  - Version tracking
  - Change counting
  - Relationship mapping

### 2. KnowledgeBaseShortTermHistory
- **Type**: Time-series collection
- **Purpose**: Tracks recent changes with high granularity
- **Retention**: 90 days
- **Features**:
  - Minute-level timestamps
  - Change delta tracking
  - State snapshots
  - Metadata preservation

### 3. KnowledgeBaseLongTermHistory
- **Purpose**: Compressed historical data for long-term storage
- **Retention**: 2 years
- **Features**:
  - GZIP compression
  - Daily aggregation
  - Compression ratio tracking
  - Efficient retrieval

### 4. KnowledgeBaseSnapshots
- **Purpose**: Complete state snapshots at regular intervals
- **Types**:
  - Daily snapshots
  - Weekly snapshots
  - Manual snapshots
- **Features**:
  - Full state backup
  - Compressed storage
  - Point-in-time recovery

### 5. KnowledgeBaseSearchCache
- **Purpose**: Caches search results for performance
- **TTL**: 1 hour
- **Features**:
  - Query result caching
  - Hit rate tracking
  - Automatic invalidation

## State Management Operations

### 1. State Updates

```javascript
// Update current state with automatic history tracking
await stateManager.updateCurrentState({
  entityId: 'PROD-001',
  type: 'product',
  name: 'Updated Product',
  // ... other fields
});
```

### 2. Search Operations

```javascript
// Search across all states
const results = await stateManager.search('adhesive', {
  includeHistory: true,      // Search short-term history
  includeLongTerm: true,      // Search compressed archives
  timeRange: {
    start: new Date('2024-01-01'),
    end: new Date('2024-12-31')
  },
  limit: 50
});
```

### 3. Archival Process

The system automatically archives data through scheduled maintenance:

1. **Hourly**: 
   - Cache statistics update
   - Anomaly detection

2. **Daily** (2 AM):
   - Archive short-term history > 30 days old
   - Create daily snapshot
   - Generate reports

3. **Weekly** (Sunday 3 AM):
   - Deep compression of archives
   - Cleanup old data
   - Index optimization

## Data Lifecycle

### Stage 1: Current State (0-30 days)
- **Storage**: Uncompressed
- **Access**: Immediate
- **Search**: Full-text indexed
- **Updates**: Real-time

### Stage 2: Short-Term History (30-90 days)
- **Storage**: Time-series
- **Access**: Fast query
- **Search**: Metadata indexed
- **Archival**: Daily to long-term

### Stage 3: Long-Term Archive (90 days - 2 years)
- **Storage**: Compressed (GZIP)
- **Access**: Decompression required
- **Search**: Limited, metadata only
- **Retention**: Automatic cleanup after 2 years

## Performance Optimization

### 1. Search Optimization
- **Caching**: 1-hour TTL for repeated queries
- **Indexing**: Multi-field compound indexes
- **Partitioning**: Time-based data separation

### 2. Compression Strategy
- **Short-term**: No compression for fast access
- **Long-term**: GZIP compression with ~70% size reduction
- **Deep compression**: Weekly optimization for archives

### 3. Query Performance
- **Current state**: < 50ms response time
- **Short-term history**: < 200ms response time
- **Long-term archives**: < 1s response time (with decompression)

## Maintenance Commands

### Manual Maintenance

```bash
# Run hourly maintenance
node scripts/kb-maintenance.js hourly

# Run daily maintenance
node scripts/kb-maintenance.js daily

# Run weekly maintenance
node scripts/kb-maintenance.js weekly

# Run all maintenance tasks
node scripts/kb-maintenance.js all
```

### Setup Automated Maintenance

```bash
# Setup cron jobs for automatic maintenance
chmod +x scripts/setup-kb-cron.sh
./scripts/setup-kb-cron.sh
```

## Monitoring

### Key Metrics

1. **Current State Metrics**:
   - Total entities
   - Last update time
   - Version distribution

2. **History Metrics**:
   - Short-term record count
   - Compression ratios
   - Archive size

3. **Performance Metrics**:
   - Cache hit rate
   - Query response times
   - Compression savings

### Health Checks

```javascript
// Get system statistics
const stats = await stateManager.getStatistics();

console.log('Current entities:', stats.current.count);
console.log('Short-term records:', stats.shortTerm.count);
console.log('Long-term archives:', stats.longTerm.count);
console.log('Cache hit rate:', stats.cache.totalHits);
```

## Recovery Procedures

### Restore from Snapshot

```javascript
// List available snapshots
const snapshots = await db.collection('KnowledgeBaseSnapshots')
  .find()
  .sort({ snapshotDate: -1 })
  .toArray();

// Restore specific snapshot
const snapshot = snapshots[0];
const data = await stateManager.decompressHistoryData(snapshot.compressedData);
// Restore process...
```

### Rebuild Indexes

```bash
# Rebuild all indexes
node scripts/kb-maintenance.js weekly
```

## Best Practices

1. **Regular Monitoring**:
   - Check maintenance logs daily
   - Monitor compression ratios
   - Track query performance

2. **Capacity Planning**:
   - Monitor storage growth
   - Plan for 30% yearly growth
   - Archive old data regularly

3. **Performance Tuning**:
   - Adjust cache TTL based on usage
   - Optimize compression thresholds
   - Review index usage monthly

4. **Backup Strategy**:
   - Daily snapshots for recovery
   - Weekly full backups
   - Test restoration quarterly

## Troubleshooting

### Common Issues

1. **High Memory Usage**:
   - Check cache size
   - Review compression settings
   - Increase archival frequency

2. **Slow Queries**:
   - Check index usage
   - Clear search cache
   - Review query patterns

3. **Storage Growth**:
   - Run cleanup manually
   - Check compression ratios
   - Review retention policies

### Maintenance Logs

Logs are stored in:
- Hourly: `logs/kb_maintenance_hourly_YYYYMMDD.log`
- Daily: `logs/kb_maintenance_daily_YYYYMMDD.log`
- Weekly: `logs/kb_maintenance_weekly_YYYYMMDD.log`

## Configuration

Key configuration parameters in `KnowledgeBaseStateManager.js`:

```javascript
compressionThreshold: 30,    // Days before compression
shortTermRetention: 90,       // Days in short-term
longTermRetention: 365 * 2,   // 2 years in long-term
```

Adjust these values based on your requirements and storage constraints.