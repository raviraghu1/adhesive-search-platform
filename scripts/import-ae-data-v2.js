import { MongoClient } from 'mongodb';
import dotenv from 'dotenv';

dotenv.config();

class AEDataImporterV2 {
  constructor() {
    this.client = null;
    this.searchDb = null;
    this.pdsDb = null;
  }

  async connect() {
    this.client = new MongoClient(process.env.MONGODB_URI);
    await this.client.connect();
    this.searchDb = this.client.db('PDSAdhesiveSearch');
    this.pdsDb = this.client.db('PDSAdhesives');
    console.log('✅ Connected to MongoDB');
  }

  async analyzeRelationships() {
    console.log('\n📊 Analyzing Many-to-One Relationships...');
    
    const aeCollection = this.pdsDb.collection('AEdatabase');
    const docCollection = this.pdsDb.collection('AdhesivePDSDocumentMaster');
    
    // Find all AE entries grouped by PdsId (many AE to one document)
    const aeByPdsId = await aeCollection.aggregate([
      { $match: { PdsId: { $exists: true, $ne: null } } },
      { 
        $group: {
          _id: '$PdsId',
          aeEntries: { 
            $push: {
              aeId: '$_id',
              xNumber: '$X_NUMBER',
              stdProduct: '$STD_PRODUCT',
              pdsProduct: '$PdsProduct',
              application: '$APPLICATION',
              family: '$FAMILYORTYPE',
              features: '$Features',
              viscosity: '$VISCOSITY',
              color: '$COLOR'
            }
          },
          products: { $addToSet: '$PdsProduct' },
          xNumbers: { $addToSet: '$X_NUMBER' },
          applications: { $addToSet: '$APPLICATION' },
          count: { $sum: 1 }
        }
      },
      { $sort: { count: -1 } }
    ]).toArray();
    
    console.log(`  Found ${aeByPdsId.length} documents with AE relationships`);
    console.log(`  Average AE entries per document: ${(aeByPdsId.reduce((sum, doc) => sum + doc.count, 0) / aeByPdsId.length).toFixed(1)}`);
    
    // Show examples of many-to-one relationships
    const multipleAE = aeByPdsId.filter(doc => doc.count > 1).slice(0, 3);
    if (multipleAE.length > 0) {
      console.log('\n  Examples of documents with multiple AE entries:');
      for (const doc of multipleAE) {
        console.log(`    Document ${doc._id}: ${doc.count} AE entries`);
        console.log(`      Products: ${doc.products.filter(p => p).join(', ')}`);
        console.log(`      X-Numbers: ${doc.xNumbers.filter(x => x && x !== 'none').join(', ')}`);
      }
    }
    
    return aeByPdsId;
  }

  async importProducts() {
    console.log('\n📦 Importing Products with Relationship Awareness...');
    
    const aeCollection = this.pdsDb.collection('AEdatabase');
    const productsCollection = this.searchDb.collection('AESearchDatabase');
    
    // Clear existing products
    await productsCollection.deleteMany({});
    
    // Get ALL unique products with their variants (including nulls for comprehensive import)
    const productVariants = await aeCollection.aggregate([
      {
        $group: {
          _id: '$PdsProduct',
          variants: {
            $push: {
              aeId: '$_id',
              xNumber: '$X_NUMBER',
              stdProduct: '$STD_PRODUCT',
              application: '$APPLICATION',
              family: '$FAMILYORTYPE',
              features: '$Features',
              viscosity: '$VISCOSITY',
              color: '$COLOR',
              pdsId: '$PdsId'
            }
          },
          xNumbers: { $addToSet: '$X_NUMBER' },
          applications: { $addToSet: '$APPLICATION' },
          families: { $addToSet: '$FAMILYORTYPE' },
          features: { $addToSet: '$Features' },
          colors: { $addToSet: '$COLOR' },
          viscosities: { $addToSet: '$VISCOSITY' },
          relatedDocIds: { $addToSet: '$PdsId' },
          variantCount: { $sum: 1 }
        }
      }
      // Removed filter - import ALL products including nulls
    ]).toArray();
    
    console.log(`  Found ${productVariants.length} unique products with variants`);
    
    const products = [];
    for (const productGroup of productVariants) {
      // Skip only completely null products, but create entries for 'none' or empty strings
      if (productGroup._id === null) {
        // For null products, create entries based on X_NUMBER if available
        if (productGroup.xNumbers && productGroup.xNumbers.length > 0) {
          for (const xNum of productGroup.xNumbers.filter(x => x && x !== 'none')) {
            products.push({
              productId: xNum,
              name: xNum,
              category: this.determineCategory(productGroup.families),
              subcategory: productGroup.families[0] || 'General',
              description: this.generateDescription(productGroup),
              manufacturer: 'Henkel',
              status: 'active',
              specifications: {
                xNumbers: [xNum],
                viscosities: productGroup.viscosities.filter(v => v),
                colors: productGroup.colors.filter(c => c),
                features: productGroup.features.filter(f => f && f !== 'none'),
                families: productGroup.families.filter(f => f)
              },
              applications: productGroup.applications.filter(a => a && a !== 'none'),
              variants: {
                count: 1,
                items: productGroup.variants.filter(v => v.xNumber === xNum)
              },
              relatedDocuments: productGroup.relatedDocIds.filter(id => id !== null),
              searchKeywords: this.generateKeywords(productGroup),
              createdAt: new Date(),
              updatedAt: new Date()
            });
          }
        }
        continue;
      }
      
      const productId = productGroup._id === '' ? 'UNKNOWN' : (productGroup._id === 'none' ? 'GENERIC' : productGroup._id);
      const product = {
        productId: productId,
        name: productId,
        category: this.determineCategory(productGroup.families),
        subcategory: this.determineSubcategory(productGroup.families),
        description: this.generateDescription(productGroup),
        manufacturer: 'Henkel',
        status: 'active',
        
        // Aggregate specifications from all variants
        specifications: {
          xNumbers: productGroup.xNumbers.filter(x => x && x !== 'none'),
          viscosities: productGroup.viscosities.filter(v => v),
          colors: productGroup.colors.filter(c => c),
          features: productGroup.features.filter(f => f && f !== 'none'),
          families: productGroup.families.filter(f => f)
        },
        
        // All unique applications
        applications: productGroup.applications.filter(a => a && a !== 'none'),
        
        // Variant information
        variants: {
          count: productGroup.variantCount,
          items: productGroup.variants.map(v => ({
            aeId: v.aeId,
            xNumber: v.xNumber,
            application: v.application,
            features: v.features,
            viscosity: v.viscosity,
            color: v.color,
            documentId: v.pdsId
          }))
        },
        
        // Related documents (many-to-one aware)
        relatedDocuments: productGroup.relatedDocIds.filter(id => id !== null),
        
        // Search keywords
        searchKeywords: this.generateKeywords(productGroup),
        
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      products.push(product);
    }
    
    // Also import standalone X_NUMBER products
    const xNumberOnlyProducts = await this.importXNumberProducts(aeCollection);
    products.push(...xNumberOnlyProducts);
    
    // Insert all products
    if (products.length > 0) {
      await productsCollection.insertMany(products);
      console.log(`\n✅ Imported ${products.length} products with variants`);
    }
    
    return products.length;
  }

  async importXNumberProducts(aeCollection) {
    // Import products that only have X_NUMBER (no PdsProduct)
    const xNumberOnly = await aeCollection.aggregate([
      {
        $match: {
          $or: [
            { PdsProduct: { $in: ['none', null, ''] } },
            { PdsProduct: { $exists: false } }
          ],
          X_NUMBER: { $ne: 'none', $ne: null, $ne: '', $exists: true }
        }
      },
      {
        $group: {
          _id: '$X_NUMBER',
          application: { $first: '$APPLICATION' },
          family: { $first: '$FAMILYORTYPE' },
          features: { $first: '$Features' },
          viscosity: { $first: '$VISCOSITY' },
          color: { $first: '$COLOR' },
          pdsId: { $first: '$PdsId' },
          stdProduct: { $first: '$STD_PRODUCT' }
        }
      }
      // Removed limit - import ALL X_NUMBER products
    ]).toArray();
    
    console.log(`\n  Found ${xNumberOnly.length} X_NUMBER-only products`);
    
    return xNumberOnly.map(x => ({
      productId: x._id,
      name: x._id,
      category: this.determineCategory([x.family]),
      subcategory: x.family || 'General',
      description: `${x.application || 'Specialty adhesive'} - ${x.features || ''}`.trim(),
      manufacturer: 'Henkel',
      status: 'active',
      specifications: {
        xNumbers: [x._id],
        viscosities: x.viscosity ? [x.viscosity] : [],
        colors: x.color ? [x.color] : [],
        features: x.features ? [x.features] : [],
        stdProduct: x.stdProduct
      },
      applications: x.application ? [x.application] : [],
      variants: {
        count: 1,
        items: [{
          xNumber: x._id,
          application: x.application,
          features: x.features,
          documentId: x.pdsId
        }]
      },
      relatedDocuments: x.pdsId ? [x.pdsId] : [],
      searchKeywords: [x._id, x.application, x.family, x.features].filter(Boolean),
      createdAt: new Date(),
      updatedAt: new Date()
    }));
  }

  async enrichDocuments() {
    console.log('\n🔗 Enriching Documents with Many-to-One AE Relationships...');
    
    const aeCollection = this.pdsDb.collection('AEdatabase');
    const docMasterCollection = this.pdsDb.collection('AdhesivePDSDocumentMaster');
    const searchDocsCollection = this.searchDb.collection('AdhesivePDSDocumentMaster');
    
    // Clear existing search documents
    await searchDocsCollection.deleteMany({});
    
    // Get all documents
    const documents = await docMasterCollection.find({}).toArray();
    console.log(`  Found ${documents.length} documents to enrich`);
    
    const enrichedDocs = [];
    let multiAECount = 0;
    
    for (const doc of documents) {
      // Find ALL AE entries for this document (many-to-one)
      const aeEntries = await aeCollection.find({ PdsId: doc._id }).toArray();
      
      if (aeEntries.length > 1) {
        multiAECount++;
      }
      
      // Aggregate data from all related AE entries
      const aggregatedAE = this.aggregateAEData(aeEntries);
      
      const enrichedDoc = {
        documentId: `DOC-${doc._id}`,
        originalId: doc._id,
        
        // Use aggregated product IDs
        productIds: aggregatedAE?.productIds || [], // Array of all related products
        primaryProductId: aggregatedAE?.primaryProductId || `PROD-${doc._id}`, // Main product
        
        type: doc.TypeofDocument || 'technical_data_sheet',
        title: doc.Document || `Document ${doc._id}`,
        version: doc.DocumentVersion || '1.0',
        language: 'en',
        format: 'pdf',
        url: doc.fileOptionOne || `/documents/doc-${doc._id}.pdf`,
        
        // Document content
        content: this.extractContent(doc),
        
        // Metadata
        metadata: {
          status: doc.Status || doc.documentStatus,
          createdBy: doc.Createdby,
          created: doc.Created,
          modifiedBy: doc.Modifiedby,
          modified: doc.Modified,
          isActive: doc.isActive,
          isArchive: doc.isArchive
        },
        
        // Aggregated AE attributes from all related entries
        aeAttributes: aggregatedAE,
        
        // Relationship info
        relationships: {
          aeEntryCount: aeEntries.length,
          aeIds: aeEntries.map(ae => ae._id),
          products: aggregatedAE?.productIds || [],
          xNumbers: aggregatedAE?.xNumbers || []
        },
        
        // Tags for searching
        tags: this.generateDocumentTags(doc, aggregatedAE),
        
        // Searchable text including all AE data
        searchableText: this.generateSearchableText(doc, aggregatedAE),
        
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      enrichedDocs.push(enrichedDoc);
    }
    
    console.log(`  Found ${multiAECount} documents with multiple AE entries`);
    
    // Insert enriched documents in batches
    if (enrichedDocs.length > 0) {
      const batchSize = 100;
      for (let i = 0; i < enrichedDocs.length; i += batchSize) {
        const batch = enrichedDocs.slice(i, i + batchSize);
        try {
          await searchDocsCollection.insertMany(batch, { ordered: false });
          console.log(`  Inserted batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(enrichedDocs.length/batchSize)}`);
        } catch (error) {
          console.log(`  ⚠️ Batch insert warning: ${error.message}`);
        }
      }
    }
    
    console.log(`\n✅ Enriched ${enrichedDocs.length} documents with AE relationships`);
    return enrichedDocs.length;
  }

  aggregateAEData(aeEntries) {
    if (!aeEntries || aeEntries.length === 0) {
      return null;
    }
    
    // Collect all unique values from all AE entries
    const aggregated = {
      entryCount: aeEntries.length,
      productIds: [...new Set(aeEntries.map(ae => ae.PdsProduct).filter(p => p && p !== 'none'))],
      primaryProductId: aeEntries[0].PdsProduct || aeEntries[0].X_NUMBER,
      xNumbers: [...new Set(aeEntries.map(ae => ae.X_NUMBER).filter(x => x && x !== 'none'))],
      stdProducts: [...new Set(aeEntries.map(ae => ae.STD_PRODUCT).filter(s => s && s !== 'none'))],
      applications: [...new Set(aeEntries.map(ae => ae.APPLICATION).filter(a => a && a !== 'none'))],
      families: [...new Set(aeEntries.map(ae => ae.FAMILYORTYPE).filter(f => f))],
      features: [...new Set(aeEntries.map(ae => ae.Features).filter(f => f && f !== 'none'))],
      viscosities: [...new Set(aeEntries.map(ae => ae.VISCOSITY).filter(v => v))],
      colors: [...new Set(aeEntries.map(ae => ae.COLOR).filter(c => c))],
      cureTypes: [...new Set(aeEntries.map(ae => ae.Cure_Mechanism).filter(c => c))],
      durometers: [...new Set(aeEntries.map(ae => ae.DUROMETER_HARDNESS).filter(d => d))]
    };
    
    // Add individual entries for reference
    aggregated.entries = aeEntries.map(ae => ({
      aeId: ae._id,
      xNumber: ae.X_NUMBER,
      pdsProduct: ae.PdsProduct,
      application: ae.APPLICATION,
      features: ae.Features
    }));
    
    return aggregated;
  }

  determineCategory(families) {
    if (!families || families.length === 0) return 'Adhesive';
    
    // Check all family values for categorization
    const familyStr = families.join(' ').toLowerCase();
    
    if (familyStr.includes('epoxy')) return 'Epoxy';
    if (familyStr.includes('silicone')) return 'Silicone';
    if (familyStr.includes('acrylic')) return 'Acrylic';
    if (familyStr.includes('urethane') || familyStr.includes('polyurethane')) return 'Polyurethane';
    if (familyStr.includes('cyano')) return 'Cyanoacrylate';
    if (familyStr.includes('anaerobic')) return 'Anaerobic';
    if (familyStr.includes('uv')) return 'UV Cure';
    if (familyStr.includes('hot') || familyStr.includes('melt')) return 'Hot Melt';
    if (familyStr.includes('rubber') || familyStr.includes('neoprene')) return 'Rubber';
    
    return 'Specialty Adhesive';
  }

  determineSubcategory(families) {
    if (!families || families.length === 0) return 'General';
    return families[0] || 'General';
  }

  generateDescription(productGroup) {
    const parts = [];
    
    // Add primary application
    const mainApp = productGroup.applications.find(a => a && a !== 'none');
    if (mainApp) parts.push(mainApp);
    
    // Add family info
    const mainFamily = productGroup.families.find(f => f);
    if (mainFamily) parts.push(`${mainFamily} adhesive`);
    
    // Add key features
    const mainFeature = productGroup.features.find(f => f && f !== 'none');
    if (mainFeature) parts.push(`featuring ${mainFeature}`);
    
    // Add variant info
    if (productGroup.variantCount > 1) {
      parts.push(`(${productGroup.variantCount} variants)`);
    }
    
    return parts.join(' - ') || 'Professional adhesive solution';
  }

  generateKeywords(productGroup) {
    const keywords = [];
    
    // Add product ID
    keywords.push(productGroup._id);
    
    // Add all X numbers
    keywords.push(...productGroup.xNumbers.filter(x => x && x !== 'none'));
    
    // Add all applications
    keywords.push(...productGroup.applications.filter(a => a && a !== 'none'));
    
    // Add all families
    keywords.push(...productGroup.families.filter(f => f));
    
    // Add all features
    keywords.push(...productGroup.features.filter(f => f && f !== 'none'));
    
    return [...new Set(keywords)];
  }

  extractContent(doc) {
    const contentParts = [];
    
    if (doc.GenaralInfo) contentParts.push(doc.GenaralInfo);
    if (doc.SafetyInfo) contentParts.push(`Safety: ${doc.SafetyInfo}`);
    if (doc.CautionInfo) contentParts.push(`Caution: ${doc.CautionInfo}`);
    if (doc.StorageInfo) contentParts.push(`Storage: ${doc.StorageInfo}`);
    if (doc.CuringGuideLineInfo) contentParts.push(`Curing: ${doc.CuringGuideLineInfo}`);
    if (doc.DepthOfCureInfo) contentParts.push(`Depth of Cure: ${doc.DepthOfCureInfo}`);
    if (doc.OptimizingPerformenceInfo) contentParts.push(`Performance: ${doc.OptimizingPerformenceInfo}`);
    
    return contentParts.join('\n\n') || 'Technical product documentation';
  }

  generateDocumentTags(doc, aggregatedAE) {
    const tags = [];
    
    // Document type
    if (doc.TypeofDocument) tags.push(doc.TypeofDocument);
    
    // AE-based tags
    if (aggregatedAE) {
      tags.push(...aggregatedAE.families);
      tags.push(...aggregatedAE.applications.slice(0, 3));
      tags.push(...aggregatedAE.cureTypes);
    }
    
    // Status tags
    if (doc.isActive) tags.push('active');
    if (doc.isArchive) tags.push('archived');
    
    return [...new Set(tags)];
  }

  generateSearchableText(doc, aggregatedAE) {
    const parts = [];
    
    // Document content
    parts.push(this.extractContent(doc));
    
    // All AE attributes
    if (aggregatedAE) {
      parts.push(...aggregatedAE.xNumbers);
      parts.push(...aggregatedAE.productIds);
      parts.push(...aggregatedAE.applications);
      parts.push(...aggregatedAE.families);
      parts.push(...aggregatedAE.features);
    }
    
    // Document metadata
    parts.push(doc.Document);
    parts.push(doc.TypeofDocument);
    
    return parts.filter(Boolean).join(' ');
  }

  async createIndexes() {
    console.log('\n📑 Creating Optimized Indexes...');
    
    const productsCollection = this.searchDb.collection('AESearchDatabase');
    const docsCollection = this.searchDb.collection('AdhesivePDSDocumentMaster');
    
    try {
      // Drop old indexes
      try { await productsCollection.dropIndexes(); } catch (e) {}
      try { await docsCollection.dropIndexes(); } catch (e) {}
      
      // Products indexes
      await productsCollection.createIndex({ productId: 1 }, { unique: true });
      await productsCollection.createIndex({ 'variants.items.xNumber': 1 });
      await productsCollection.createIndex({ 'specifications.xNumbers': 1 });
      await productsCollection.createIndex({ relatedDocuments: 1 });
      await productsCollection.createIndex({ 
        name: 'text', 
        description: 'text', 
        searchKeywords: 'text',
        'specifications.features': 'text',
        applications: 'text'
      });
      
      // Documents indexes
      await docsCollection.createIndex({ documentId: 1 }, { unique: true });
      await docsCollection.createIndex({ originalId: 1 });
      await docsCollection.createIndex({ productIds: 1 });
      await docsCollection.createIndex({ primaryProductId: 1 });
      await docsCollection.createIndex({ 'relationships.xNumbers': 1 });
      await docsCollection.createIndex({ 'aeAttributes.xNumbers': 1 });
      await docsCollection.createIndex({ 
        searchableText: 'text',
        title: 'text',
        'aeAttributes.applications': 'text'
      });
      
      console.log('  ✓ Indexes created');
    } catch (error) {
      console.log('  ⚠️ Index creation warning:', error.message);
    }
  }

  async verifyImport() {
    console.log('\n🔍 Verifying Many-to-One Import...');
    
    const productsCollection = this.searchDb.collection('AESearchDatabase');
    const docsCollection = this.searchDb.collection('AdhesivePDSDocumentMaster');
    
    const productCount = await productsCollection.countDocuments();
    const docCount = await docsCollection.countDocuments();
    const enrichedDocs = await docsCollection.countDocuments({ 
      'aeAttributes': { $ne: null } 
    });
    const multiAEDocs = await docsCollection.countDocuments({ 
      'relationships.aeEntryCount': { $gt: 1 } 
    });
    
    console.log(`  Products: ${productCount}`);
    console.log(`  Documents: ${docCount}`);
    console.log(`  Documents with AE data: ${enrichedDocs}`);
    console.log(`  Documents with multiple AE entries: ${multiAEDocs}`);
    
    // Show example of many-to-one relationship
    const exampleDoc = await docsCollection.findOne({ 
      'relationships.aeEntryCount': { $gt: 1 } 
    });
    
    if (exampleDoc) {
      console.log('\n  Example of many-to-one relationship:');
      console.log(`    Document: ${exampleDoc.title}`);
      console.log(`    AE Entries: ${exampleDoc.relationships.aeEntryCount}`);
      console.log(`    Products: ${exampleDoc.productIds.join(', ')}`);
      console.log(`    X-Numbers: ${exampleDoc.relationships.xNumbers.slice(0, 3).join(', ')}`);
    }
    
    // Test searches
    console.log('\n  Sample searches:');
    const searches = ['429', '706', 'epoxy', 'UV'];
    for (const term of searches) {
      const products = await productsCollection.find(
        { $text: { $search: term } }
      ).limit(2).toArray();
      const docs = await docsCollection.find(
        { $text: { $search: term } }
      ).limit(2).toArray();
      console.log(`    "${term}": ${products.length} products, ${docs.length} documents`);
    }
  }

  async close() {
    if (this.client) {
      await this.client.close();
      console.log('\n✅ Database connection closed');
    }
  }

  async run() {
    try {
      await this.connect();
      
      // Analyze relationships first
      await this.analyzeRelationships();
      
      // Create indexes
      await this.createIndexes();
      
      // Import data with relationship awareness
      const productCount = await this.importProducts();
      const docCount = await this.enrichDocuments();
      
      // Verify
      await this.verifyImport();
      
      console.log('\n🎉 AE Data Import V2 Complete!');
      console.log(`  - ${productCount} products imported with variants`);
      console.log(`  - ${docCount} documents enriched with many-to-one relationships`);
      
    } catch (error) {
      console.error('❌ Error:', error);
    } finally {
      await this.close();
    }
  }
}

// Run the importer
const importer = new AEDataImporterV2();
importer.run();