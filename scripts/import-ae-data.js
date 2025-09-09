import { MongoClient } from 'mongodb';
import dotenv from 'dotenv';

dotenv.config();

class AEDataImporter {
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

  async importAEProducts() {
    console.log('\n📦 Importing Products from AEdatabase...');
    
    const aeCollection = this.pdsDb.collection('AEdatabase');
    const productsCollection = this.searchDb.collection('AESearchDatabase');
    
    // Clear existing products
    await productsCollection.deleteMany({});
    
    // Get unique products from AEdatabase
    const aeProducts = await aeCollection.aggregate([
      {
        $group: {
          _id: '$PdsProduct',
          xNumbers: { $addToSet: '$X_NUMBER' },
          applications: { $addToSet: '$APPLICATION' },
          families: { $addToSet: '$FAMILYORTYPE' },
          features: { $addToSet: '$Features' },
          viscosities: { $addToSet: '$VISCOSITY' },
          colors: { $addToSet: '$COLOR' },
          pdsIds: { $addToSet: '$PdsId' },
          count: { $sum: 1 }
        }
      },
      {
        $match: {
          _id: { $ne: null, $ne: 'none', $ne: '' }
        }
      }
    ]).toArray();
    
    console.log(`  Found ${aeProducts.length} unique products in AEdatabase`);
    
    const products = [];
    for (const aeProduct of aeProducts) {
      const product = {
        productId: aeProduct._id,
        name: aeProduct._id,
        category: this.determineCategory(aeProduct.families[0]),
        subcategory: aeProduct.families[0] || 'General',
        description: this.generateDescription(aeProduct),
        manufacturer: 'Henkel',
        status: 'active',
        specifications: {
          xNumbers: aeProduct.xNumbers.filter(x => x && x !== 'none'),
          viscosity: aeProduct.viscosities.filter(v => v).join(', '),
          color: aeProduct.colors.filter(c => c).join(', '),
          features: aeProduct.features.filter(f => f).join(', ')
        },
        applications: aeProduct.applications.filter(a => a && a !== 'none'),
        aeAttributes: {
          variantCount: aeProduct.count,
          relatedPdsIds: aeProduct.pdsIds.filter(id => id !== null)
        },
        searchKeywords: this.generateKeywords(aeProduct),
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      products.push(product);
      console.log(`  ✓ ${product.productId}: ${product.category} - ${product.subcategory}`);
    }
    
    // Also import products from X_NUMBER where STD_PRODUCT is 'none'
    const xNumberProducts = await aeCollection.aggregate([
      {
        $match: {
          STD_PRODUCT: { $in: ['none', null, ''] },
          X_NUMBER: { $ne: 'none', $ne: null, $ne: '' }
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
          pdsId: { $first: '$PdsId' }
        }
      }
    ]).limit(50).toArray();
    
    console.log(`\n  Found ${xNumberProducts.length} additional X_NUMBER products`);
    
    for (const xProduct of xNumberProducts) {
      const product = {
        productId: xProduct._id,
        name: xProduct._id,
        category: this.determineCategory(xProduct.family),
        subcategory: xProduct.family || 'General',
        description: `${xProduct.application || 'Adhesive'} - ${xProduct.features || ''}`.trim(),
        manufacturer: 'Henkel',
        status: 'active',
        specifications: {
          viscosity: xProduct.viscosity || '',
          color: xProduct.color || '',
          features: xProduct.features || ''
        },
        applications: [xProduct.application].filter(Boolean),
        aeAttributes: {
          pdsId: xProduct.pdsId
        },
        searchKeywords: [
          xProduct._id,
          xProduct.application,
          xProduct.family,
          xProduct.features
        ].filter(Boolean),
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      products.push(product);
      console.log(`  ✓ ${product.productId}: ${product.category}`);
    }
    
    // Insert products
    if (products.length > 0) {
      await productsCollection.insertMany(products);
      console.log(`\n✅ Imported ${products.length} products`);
    }
    
    return products.length;
  }

  async linkDocumentsWithAE() {
    console.log('\n🔗 Linking Documents with AE Attributes...');
    
    const aeCollection = this.pdsDb.collection('AEdatabase');
    const docMasterCollection = this.pdsDb.collection('AdhesivePDSDocumentMaster');
    const searchDocsCollection = this.searchDb.collection('AdhesivePDSDocumentMaster');
    
    // Clear existing search documents
    await searchDocsCollection.deleteMany({});
    
    // Get AE entries with PdsId
    const aeWithPdsId = await aeCollection.find({ 
      PdsId: { $exists: true, $ne: null } 
    }).toArray();
    
    console.log(`  Found ${aeWithPdsId.length} AE entries with PdsId`);
    
    // Create a map of PdsId to AE attributes
    const pdsIdToAE = new Map();
    for (const ae of aeWithPdsId) {
      pdsIdToAE.set(ae.PdsId, {
        aeId: ae._id,
        xNumber: ae.X_NUMBER,
        stdProduct: ae.STD_PRODUCT,
        pdsProduct: ae.PdsProduct,
        application: ae.APPLICATION,
        family: ae.FAMILYORTYPE,
        features: ae.Features,
        viscosity: ae.VISCOSITY,
        color: ae.COLOR,
        cureType: ae.Cure_Mechanism,
        durometer: ae.DUROMETER_HARDNESS
      });
    }
    
    // Get documents and enrich with AE data
    const documents = await docMasterCollection.find({}).toArray();
    console.log(`  Found ${documents.length} documents`);
    
    const enrichedDocs = [];
    let matchCount = 0;
    
    for (const doc of documents) {
      const aeData = pdsIdToAE.get(doc._id);
      
      // Create enriched document
      const enrichedDoc = {
        documentId: `DOC-${doc._id}`,
        originalId: doc._id,
        productId: aeData?.pdsProduct || aeData?.xNumber || `PROD-${doc._id}`,
        type: doc.TypeofDocument || 'technical_data_sheet',
        title: doc.Document || `Document ${doc._id}`,
        version: doc.DocumentVersion || '1.0',
        language: 'en',
        format: 'pdf',
        url: doc.fileOptionOne || `/documents/doc-${doc._id}.pdf`,
        content: this.extractContent(doc),
        metadata: {
          status: doc.Status || doc.documentStatus,
          createdBy: doc.Createdby,
          created: doc.Created,
          modifiedBy: doc.Modifiedby,
          modified: doc.Modified,
          isActive: doc.isActive,
          isArchive: doc.isArchive
        },
        aeAttributes: aeData || null,
        tags: this.generateDocumentTags(doc, aeData),
        searchableText: this.generateSearchableText(doc, aeData),
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      enrichedDocs.push(enrichedDoc);
      
      if (aeData) {
        matchCount++;
        console.log(`  ✓ Linked document ${doc._id} with AE product ${aeData.pdsProduct || aeData.xNumber}`);
      }
    }
    
    // Insert enriched documents
    if (enrichedDocs.length > 0) {
      // Split into batches to avoid bulk write errors
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
    
    console.log(`\n✅ Linked ${matchCount}/${documents.length} documents with AE attributes`);
    return enrichedDocs.length;
  }

  determineCategory(family) {
    if (!family) return 'Adhesive';
    
    const familyLower = family.toLowerCase();
    if (familyLower.includes('epoxy')) return 'Epoxy';
    if (familyLower.includes('silicone')) return 'Silicone';
    if (familyLower.includes('acrylic')) return 'Acrylic';
    if (familyLower.includes('urethane') || familyLower.includes('polyurethane')) return 'Polyurethane';
    if (familyLower.includes('cyano')) return 'Cyanoacrylate';
    if (familyLower.includes('anaerobic')) return 'Anaerobic';
    if (familyLower.includes('uv')) return 'UV Cure';
    if (familyLower.includes('hot') || familyLower.includes('melt')) return 'Hot Melt';
    if (familyLower.includes('rubber') || familyLower.includes('neoprene')) return 'Rubber';
    if (familyLower.includes('modified')) return 'Modified';
    
    return 'Specialty Adhesive';
  }

  generateDescription(aeProduct) {
    const parts = [];
    
    if (aeProduct.applications && aeProduct.applications[0] && aeProduct.applications[0] !== 'none') {
      parts.push(aeProduct.applications[0]);
    }
    
    if (aeProduct.families && aeProduct.families[0]) {
      parts.push(`${aeProduct.families[0]} adhesive`);
    }
    
    if (aeProduct.features && aeProduct.features[0] && aeProduct.features[0] !== 'none') {
      parts.push(`featuring ${aeProduct.features[0]}`);
    }
    
    return parts.join(' - ') || 'Professional adhesive solution';
  }

  generateKeywords(aeProduct) {
    const keywords = [];
    
    // Add product ID
    keywords.push(aeProduct._id);
    
    // Add X numbers
    if (aeProduct.xNumbers) {
      keywords.push(...aeProduct.xNumbers.filter(x => x && x !== 'none'));
    }
    
    // Add applications
    if (aeProduct.applications) {
      keywords.push(...aeProduct.applications.filter(a => a && a !== 'none'));
    }
    
    // Add families
    if (aeProduct.families) {
      keywords.push(...aeProduct.families.filter(f => f));
    }
    
    // Add features
    if (aeProduct.features) {
      keywords.push(...aeProduct.features.filter(f => f && f !== 'none'));
    }
    
    return [...new Set(keywords)]; // Remove duplicates
  }

  extractContent(doc) {
    const contentParts = [];
    
    // Add general info
    if (doc.GenaralInfo) contentParts.push(doc.GenaralInfo);
    if (doc.SafetyInfo) contentParts.push(`Safety: ${doc.SafetyInfo}`);
    if (doc.CautionInfo) contentParts.push(`Caution: ${doc.CautionInfo}`);
    if (doc.StorageInfo) contentParts.push(`Storage: ${doc.StorageInfo}`);
    
    // Add cure information
    if (doc.CuringGuideLineInfo) contentParts.push(`Curing: ${doc.CuringGuideLineInfo}`);
    if (doc.DepthOfCureInfo) contentParts.push(`Depth of Cure: ${doc.DepthOfCureInfo}`);
    
    // Add performance info
    if (doc.OptimizingPerformenceInfo) contentParts.push(`Performance: ${doc.OptimizingPerformenceInfo}`);
    
    return contentParts.join('\n\n') || 'Technical product documentation';
  }

  generateDocumentTags(doc, aeData) {
    const tags = [];
    
    // Add document type
    if (doc.TypeofDocument) tags.push(doc.TypeofDocument);
    
    // Add AE-based tags
    if (aeData) {
      if (aeData.family) tags.push(aeData.family);
      if (aeData.application) tags.push(aeData.application);
      if (aeData.cureType) tags.push(aeData.cureType);
    }
    
    // Add status tags
    if (doc.isActive) tags.push('active');
    if (doc.isArchive) tags.push('archived');
    
    return [...new Set(tags)];
  }

  generateSearchableText(doc, aeData) {
    const parts = [];
    
    // Add document content
    parts.push(this.extractContent(doc));
    
    // Add AE attributes
    if (aeData) {
      parts.push(aeData.xNumber);
      parts.push(aeData.pdsProduct);
      parts.push(aeData.application);
      parts.push(aeData.family);
      parts.push(aeData.features);
    }
    
    // Add document metadata
    parts.push(doc.Document);
    parts.push(doc.TypeofDocument);
    
    return parts.filter(Boolean).join(' ');
  }

  async createIndexes() {
    console.log('\n📑 Creating Indexes...');
    
    const productsCollection = this.searchDb.collection('AESearchDatabase');
    const docsCollection = this.searchDb.collection('AdhesivePDSDocumentMaster');
    
    try {
      // Drop existing text indexes to avoid conflicts
      try {
        await productsCollection.dropIndex('name_text_description_text');
      } catch (e) {}
      try {
        await productsCollection.dropIndex('name_text_description_text_searchKeywords_text');
      } catch (e) {}
      
      // Products indexes
      await productsCollection.createIndex({ productId: 1 }, { unique: true });
      await productsCollection.createIndex({ name: 'text', description: 'text', searchKeywords: 'text' });
      await productsCollection.createIndex({ category: 1, subcategory: 1 });
      await productsCollection.createIndex({ 'aeAttributes.relatedPdsIds': 1 });
      
      // Documents indexes
      await docsCollection.createIndex({ documentId: 1 }, { unique: true });
      await docsCollection.createIndex({ productId: 1 });
      await docsCollection.createIndex({ originalId: 1 });
      await docsCollection.createIndex({ searchableText: 'text', title: 'text' });
      await docsCollection.createIndex({ 'aeAttributes.pdsProduct': 1 });
      
      console.log('  ✓ Indexes created');
    } catch (error) {
      console.log('  ⚠️ Some indexes already exist, continuing...');
    }
  }

  async verifyImport() {
    console.log('\n🔍 Verifying Import...');
    
    const productsCollection = this.searchDb.collection('AESearchDatabase');
    const docsCollection = this.searchDb.collection('AdhesivePDSDocumentMaster');
    
    const productCount = await productsCollection.countDocuments();
    const docCount = await docsCollection.countDocuments();
    const linkedDocs = await docsCollection.countDocuments({ aeAttributes: { $ne: null } });
    
    console.log(`  Products: ${productCount}`);
    console.log(`  Documents: ${docCount}`);
    console.log(`  Documents with AE attributes: ${linkedDocs}`);
    
    // Sample searches
    console.log('\n  Sample searches:');
    
    const searches = ['429', 'epoxy', 'UV', 'silicone'];
    for (const term of searches) {
      const results = await productsCollection.find(
        { $text: { $search: term } }
      ).limit(3).toArray();
      console.log(`    "${term}": ${results.length} products found`);
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
      await this.createIndexes();
      
      const productCount = await this.importAEProducts();
      const docCount = await this.linkDocumentsWithAE();
      
      await this.verifyImport();
      
      console.log('\n🎉 AE Data Import Complete!');
      console.log(`  - ${productCount} products imported`);
      console.log(`  - ${docCount} documents enriched`);
      
    } catch (error) {
      console.error('❌ Error:', error);
    } finally {
      await this.close();
    }
  }
}

// Run the importer
const importer = new AEDataImporter();
importer.run();