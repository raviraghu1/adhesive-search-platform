#!/usr/bin/env node

/**
 * Comprehensive Data Conversion Script
 * Loads all products and documents into the knowledge base
 */

import { MongoClient } from 'mongodb';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env') });

class DataConverter {
  constructor() {
    this.client = new MongoClient(process.env.MONGODB_URI);
    this.db = null;
    this.stats = {
      products: { total: 0, converted: 0, failed: 0 },
      documents: { total: 0, converted: 0, failed: 0 },
      relationships: { total: 0, created: 0 },
      startTime: new Date(),
      endTime: null
    };
  }

  async connect() {
    await this.client.connect();
    this.db = this.client.db(process.env.MONGODB_DB_NAME || 'PDSAdhesiveSearch');
    console.log('✅ Connected to MongoDB');
  }

  calculateHash(data) {
    const normalized = JSON.stringify(data, Object.keys(data).sort());
    return crypto.createHash('md5').update(normalized).digest('hex');
  }

  /**
   * Generate comprehensive product data with all fields
   */
  generateProductData() {
    return [
      // Cyanoacrylate Adhesives
      {
        productId: 'CA-1000',
        name: 'CyanoFast 1000 Instant Adhesive',
        category: 'Cyanoacrylate',
        subcategory: 'Low-Viscosity',
        description: 'Low viscosity instant adhesive for fast bonding of close-fitting parts. Excellent capillary action for pre-assembled components.',
        manufacturer: 'PDS Advanced Materials',
        status: 'active',
        specifications: {
          physical: {
            color: 'Clear',
            viscosity: { value: 5, unit: 'cPs', temperature: 25 },
            density: { value: 1.06, unit: 'g/cm3' },
            flashPoint: { value: 87, unit: '°C' }
          },
          mechanical: {
            tensile_strength: { value: 22, unit: 'MPa' },
            shear_strength: { value: 18, unit: 'MPa', substrate: 'steel' },
            elongation: { value: 5, unit: '%' }
          },
          thermal: {
            temperature_range: { min: -55, max: 82, unit: '°C' },
            glass_transition: { value: 65, unit: '°C' }
          },
          cure: {
            cure_type: 'moisture',
            fixture_time: { value: 10, unit: 'seconds', substrate: 'steel' },
            full_cure: { value: 24, unit: 'hours', temperature: 22 }
          }
        },
        applications: {
          industries: ['electronics', 'medical_device', 'automotive', 'consumer_goods'],
          uses: ['Small part assembly', 'Wire tacking', 'Rubber O-ring bonding', 'Plastic bonding']
        },
        substrates: {
          metals: ['steel', 'aluminum', 'brass'],
          plastics: ['ABS', 'PC', 'PVC', 'PMMA'],
          rubbers: ['nitrile', 'EPDM'],
          others: ['glass', 'ceramics']
        },
        packaging: [
          { size: '20g', unit_price: 15.99 },
          { size: '50g', unit_price: 29.99 },
          { size: '500g', unit_price: 199.99 }
        ],
        compliance: {
          certifications: ['ISO 10993', 'RoHS', 'REACH'],
          environmental: ['low_voc', 'non_toxic'],
          safety_class: 'Class IIa Medical Device'
        },
        storage: {
          temperature: { min: 2, max: 8, unit: '°C' },
          shelf_life: { value: 12, unit: 'months' },
          conditions: 'Store in refrigerator. Allow to reach room temperature before use.'
        }
      },
      {
        productId: 'CA-2000',
        name: 'CyanoGel 2000 Gap-Filling Adhesive',
        category: 'Cyanoacrylate',
        subcategory: 'Gel',
        description: 'Thixotropic gel formula for vertical applications and gap-filling up to 0.5mm. No-drip formula ideal for overhead applications.',
        manufacturer: 'PDS Advanced Materials',
        status: 'active',
        specifications: {
          physical: {
            color: 'Clear to slight haze',
            viscosity: { value: 3000, unit: 'cPs', temperature: 25 },
            density: { value: 1.08, unit: 'g/cm3' }
          },
          mechanical: {
            tensile_strength: { value: 20, unit: 'MPa' },
            shear_strength: { value: 16, unit: 'MPa', substrate: 'steel' },
            gap_fill: { max: 0.5, unit: 'mm' }
          },
          thermal: {
            temperature_range: { min: -55, max: 80, unit: '°C' }
          },
          cure: {
            cure_type: 'moisture',
            fixture_time: { value: 30, unit: 'seconds', substrate: 'steel' },
            full_cure: { value: 24, unit: 'hours', temperature: 22 }
          }
        },
        applications: {
          industries: ['automotive', 'construction', 'maintenance'],
          uses: ['Vertical surface bonding', 'Gap filling', 'Porous substrate bonding']
        }
      },

      // Epoxy Adhesives
      {
        productId: 'EP-2000',
        name: 'EpoxiBond 2000 High-Strength Structural Adhesive',
        category: 'Epoxy',
        subcategory: 'Two-Component',
        description: 'High-performance two-component epoxy adhesive designed for structural bonding of dissimilar materials. Excellent chemical resistance and durability.',
        manufacturer: 'PDS Advanced Materials',
        status: 'active',
        specifications: {
          physical: {
            color: 'Gray',
            viscosity: { value: 45000, unit: 'cPs', temperature: 25 },
            density: { value: 1.4, unit: 'g/cm3' },
            mix_ratio: '2:1 by volume'
          },
          mechanical: {
            tensile_strength: { value: 35, unit: 'MPa' },
            shear_strength: { value: 28, unit: 'MPa', substrate: 'aluminum' },
            compressive_strength: { value: 85, unit: 'MPa' },
            lap_shear: { value: 3500, unit: 'psi' }
          },
          thermal: {
            temperature_range: { min: -55, max: 120, unit: '°C' },
            glass_transition: { value: 85, unit: '°C' },
            cte: { value: 65, unit: 'ppm/°C' }
          },
          cure: {
            cure_type: 'chemical',
            pot_life: { value: 45, unit: 'minutes', temperature: 25 },
            fixture_time: { value: 6, unit: 'hours', temperature: 25 },
            full_cure: { value: 72, unit: 'hours', temperature: 25 }
          }
        },
        applications: {
          industries: ['aerospace', 'marine', 'automotive', 'construction'],
          uses: ['Structural bonding', 'Composite assembly', 'Metal bonding', 'Panel bonding']
        },
        substrates: {
          metals: ['steel', 'aluminum', 'stainless_steel', 'titanium'],
          composites: ['carbon_fiber', 'fiberglass', 'kevlar'],
          plastics: ['thermoset', 'engineering_plastics'],
          others: ['concrete', 'wood', 'ceramics']
        }
      },
      {
        productId: 'EP-3000',
        name: 'EpoxiClear 3000 Optical Adhesive',
        category: 'Epoxy',
        subcategory: 'UV-Cure',
        description: 'Optically clear UV-curing epoxy for glass bonding and optical assemblies. Low shrinkage and excellent light transmission.',
        manufacturer: 'PDS Advanced Materials',
        status: 'active',
        specifications: {
          physical: {
            color: 'Water-clear',
            viscosity: { value: 500, unit: 'cPs', temperature: 25 },
            refractive_index: 1.52,
            light_transmission: { value: 98, unit: '%' }
          },
          mechanical: {
            tensile_strength: { value: 25, unit: 'MPa' },
            shear_strength: { value: 20, unit: 'MPa', substrate: 'glass' }
          },
          cure: {
            cure_type: 'UV',
            wavelength: { value: 365, unit: 'nm' },
            intensity: { value: 100, unit: 'mW/cm2' },
            cure_time: { value: 30, unit: 'seconds' }
          }
        }
      },

      // Polyurethane Adhesives
      {
        productId: 'PU-3300',
        name: 'PolyBond 3300 Structural Polyurethane',
        category: 'Polyurethane',
        subcategory: 'Two-Component',
        description: 'Two-component polyurethane adhesive with exceptional impact resistance and flexibility. Ideal for bonding dissimilar materials with different thermal expansion rates.',
        manufacturer: 'PDS Advanced Materials',
        status: 'active',
        specifications: {
          physical: {
            color: 'Black',
            viscosity: { value: 8000, unit: 'cPs', temperature: 25 },
            density: { value: 1.1, unit: 'g/cm3' },
            hardness: { value: 80, unit: 'Shore A' }
          },
          mechanical: {
            tensile_strength: { value: 18, unit: 'MPa' },
            shear_strength: { value: 15, unit: 'MPa', substrate: 'aluminum' },
            elongation: { value: 300, unit: '%' },
            tear_strength: { value: 65, unit: 'N/mm' }
          },
          thermal: {
            temperature_range: { min: -40, max: 90, unit: '°C' },
            thermal_shock: 'Excellent'
          },
          cure: {
            cure_type: 'chemical',
            pot_life: { value: 20, unit: 'minutes', temperature: 25 },
            handling_time: { value: 2, unit: 'hours', temperature: 25 },
            full_cure: { value: 7, unit: 'days', temperature: 25 }
          }
        },
        applications: {
          industries: ['transportation', 'marine', 'construction', 'wind_energy'],
          uses: ['Panel bonding', 'Vibration damping', 'Sealing and bonding', 'Composite bonding']
        }
      },

      // Acrylic Adhesives
      {
        productId: 'AC-5500',
        name: 'AcryFix 5500 Instant Bond Adhesive',
        category: 'Acrylic',
        subcategory: 'Anaerobic',
        description: 'Fast-curing anaerobic threadlocker and retaining compound. Ideal for securing threaded assemblies and cylindrical parts.',
        manufacturer: 'PDS Advanced Materials',
        status: 'active',
        specifications: {
          physical: {
            color: 'Red',
            viscosity: { value: 1200, unit: 'cPs', temperature: 25 },
            density: { value: 1.08, unit: 'g/cm3' }
          },
          mechanical: {
            breakaway_torque: { value: 25, unit: 'Nm' },
            prevail_torque: { value: 35, unit: 'Nm' },
            shear_strength: { value: 15, unit: 'MPa', substrate: 'steel' }
          },
          cure: {
            cure_type: 'anaerobic',
            fixture_time: { value: 15, unit: 'minutes', substrate: 'steel' },
            full_cure: { value: 24, unit: 'hours', temperature: 22 }
          }
        },
        applications: {
          industries: ['automotive', 'machinery', 'maintenance'],
          uses: ['Thread locking', 'Bearing retention', 'Shaft mounting', 'Stud locking']
        }
      },
      {
        productId: 'AC-6000',
        name: 'AcryBond 6000 Structural Adhesive',
        category: 'Acrylic',
        subcategory: 'Two-Component',
        description: 'High-strength methacrylate adhesive with excellent adhesion to metals and plastics without surface preparation.',
        manufacturer: 'PDS Advanced Materials',
        status: 'active',
        specifications: {
          physical: {
            color: 'Off-white',
            viscosity: { value: 40000, unit: 'cPs', temperature: 25 },
            mix_ratio: '10:1'
          },
          mechanical: {
            tensile_strength: { value: 24, unit: 'MPa' },
            shear_strength: { value: 20, unit: 'MPa', substrate: 'aluminum' },
            elongation: { value: 120, unit: '%' }
          },
          cure: {
            cure_type: 'chemical',
            working_time: { value: 4, unit: 'minutes' },
            fixture_time: { value: 15, unit: 'minutes' },
            full_cure: { value: 24, unit: 'hours' }
          }
        }
      },

      // Silicone Adhesives
      {
        productId: 'SI-8000',
        name: 'SiliconeSeal 8000 Flexible Adhesive Sealant',
        category: 'Silicone',
        subcategory: 'RTV-1',
        description: 'One-component RTV silicone adhesive sealant with excellent flexibility and weather resistance. Ideal for outdoor applications.',
        manufacturer: 'PDS Advanced Materials',
        status: 'active',
        specifications: {
          physical: {
            color: 'Clear, White, Black',
            viscosity: { value: 'paste', unit: 'consistency' },
            density: { value: 1.04, unit: 'g/cm3' },
            hardness: { value: 30, unit: 'Shore A' }
          },
          mechanical: {
            tensile_strength: { value: 2.5, unit: 'MPa' },
            elongation: { value: 500, unit: '%' },
            tear_strength: { value: 8, unit: 'N/mm' }
          },
          thermal: {
            temperature_range: { min: -65, max: 200, unit: '°C' },
            thermal_stability: 'Excellent'
          },
          cure: {
            cure_type: 'moisture',
            skin_time: { value: 10, unit: 'minutes' },
            cure_rate: { value: 3, unit: 'mm/24hr' }
          }
        },
        applications: {
          industries: ['construction', 'automotive', 'electronics', 'HVAC'],
          uses: ['Weatherproofing', 'Glazing', 'Gasketing', 'Electronic potting']
        }
      },

      // Hot Melt Adhesives
      {
        productId: 'HM-9000',
        name: 'HotStick 9000 EVA Hot Melt',
        category: 'Hot Melt',
        subcategory: 'EVA-Based',
        description: 'Fast-setting EVA hot melt adhesive for packaging and product assembly. Excellent adhesion to porous substrates.',
        manufacturer: 'PDS Advanced Materials',
        status: 'active',
        specifications: {
          physical: {
            color: 'Light amber',
            form: 'Pellets/Sticks',
            melt_viscosity: { value: 6000, unit: 'cPs', temperature: 180 },
            softening_point: { value: 95, unit: '°C' }
          },
          mechanical: {
            tensile_strength: { value: 8, unit: 'MPa' },
            peel_strength: { value: 25, unit: 'N/25mm' }
          },
          thermal: {
            application_temp: { min: 160, max: 180, unit: '°C' },
            service_temp: { min: -30, max: 60, unit: '°C' }
          },
          performance: {
            open_time: { value: 30, unit: 'seconds' },
            set_time: { value: 5, unit: 'seconds' }
          }
        },
        applications: {
          industries: ['packaging', 'bookbinding', 'woodworking', 'textile'],
          uses: ['Case sealing', 'Carton closing', 'Spine gluing', 'Product assembly']
        }
      },

      // Specialty Adhesives
      {
        productId: 'SP-1100',
        name: 'ConductaBond 1100 Electrically Conductive',
        category: 'Specialty',
        subcategory: 'Conductive',
        description: 'Silver-filled electrically conductive adhesive for EMI/RFI shielding and electrical connections.',
        manufacturer: 'PDS Advanced Materials',
        status: 'active',
        specifications: {
          physical: {
            color: 'Silver',
            viscosity: { value: 25000, unit: 'cPs', temperature: 25 },
            filler: 'Silver flakes',
            density: { value: 2.5, unit: 'g/cm3' }
          },
          electrical: {
            volume_resistivity: { value: 0.0001, unit: 'ohm-cm' },
            surface_resistivity: { value: 0.05, unit: 'ohm/sq' }
          },
          mechanical: {
            shear_strength: { value: 10, unit: 'MPa', substrate: 'copper' },
            adhesion: { value: 'excellent', substrates: ['gold', 'silver', 'copper', 'aluminum'] }
          },
          cure: {
            cure_type: 'heat',
            cure_temperature: { value: 150, unit: '°C' },
            cure_time: { value: 30, unit: 'minutes' }
          }
        },
        applications: {
          industries: ['electronics', 'telecommunications', 'aerospace'],
          uses: ['Die attach', 'EMI shielding', 'Grounding', 'Circuit repair']
        }
      },

      // Additional Products - Extended Catalog
      {
        productId: 'EP-4000',
        name: 'EpoxiMarine 4000 Underwater Adhesive',
        category: 'Epoxy',
        subcategory: 'Marine',
        description: 'Specially formulated epoxy that cures underwater. Ideal for marine repairs, pool maintenance, and wet environment applications.',
        manufacturer: 'PDS Advanced Materials',
        status: 'active',
        specifications: {
          physical: {
            color: 'Blue-Gray',
            viscosity: { value: 50000, unit: 'cPs', temperature: 25 },
            density: { value: 1.35, unit: 'g/cm3' }
          },
          mechanical: {
            tensile_strength: { value: 28, unit: 'MPa' },
            shear_strength: { value: 22, unit: 'MPa', substrate: 'wet_steel' },
            water_absorption: { value: 0.5, unit: '%' }
          },
          thermal: {
            temperature_range: { min: -30, max: 65, unit: '°C' }
          },
          cure: {
            cure_type: 'chemical',
            underwater_cure: true,
            fixture_time: { value: 45, unit: 'minutes', condition: 'underwater' },
            full_cure: { value: 48, unit: 'hours', temperature: 20 }
          }
        },
        applications: {
          industries: ['marine', 'pool_spa', 'plumbing', 'infrastructure'],
          uses: ['Hull repairs', 'Pool tile fixing', 'Pipe sealing', 'Underwater patching']
        }
      },
      {
        productId: 'CA-3000',
        name: 'CyanoFlex 3000 Rubber Toughened',
        category: 'Cyanoacrylate',
        subcategory: 'Flexible',
        description: 'Rubber-toughened cyanoacrylate with enhanced impact resistance and flexibility. Ideal for applications requiring vibration resistance.',
        manufacturer: 'PDS Advanced Materials',
        status: 'active',
        specifications: {
          physical: {
            color: 'Black',
            viscosity: { value: 125, unit: 'cPs', temperature: 25 },
            density: { value: 1.08, unit: 'g/cm3' }
          },
          mechanical: {
            tensile_strength: { value: 18, unit: 'MPa' },
            shear_strength: { value: 14, unit: 'MPa', substrate: 'steel' },
            peel_strength: { value: 5, unit: 'N/mm' },
            impact_resistance: 'Excellent'
          }
        },
        applications: {
          industries: ['automotive', 'electronics', 'appliance'],
          uses: ['Speaker assembly', 'Gasket bonding', 'Vibration dampening', 'Flexible joint bonding']
        }
      },
      {
        productId: 'PU-4400',
        name: 'PolyFoam 4400 Expanding Adhesive',
        category: 'Polyurethane',
        subcategory: 'Foam',
        description: 'One-component polyurethane foam adhesive that expands to fill gaps. Excellent for construction and insulation applications.',
        manufacturer: 'PDS Advanced Materials',
        status: 'active',
        specifications: {
          physical: {
            color: 'Yellow',
            form: 'Aerosol foam',
            expansion_ratio: { value: 3, unit: 'times' },
            density_cured: { value: 35, unit: 'kg/m3' }
          },
          mechanical: {
            tensile_strength: { value: 0.15, unit: 'MPa' },
            compression_strength: { value: 0.1, unit: 'MPa' }
          },
          thermal: {
            temperature_range: { min: -40, max: 80, unit: '°C' },
            thermal_conductivity: { value: 0.035, unit: 'W/mK' }
          }
        },
        applications: {
          industries: ['construction', 'HVAC', 'insulation'],
          uses: ['Window installation', 'Gap filling', 'Insulation', 'Door frame mounting']
        }
      },
      {
        productId: 'SI-9000',
        name: 'SiliconeHT 9000 High Temperature',
        category: 'Silicone',
        subcategory: 'High-Temperature',
        description: 'High-temperature silicone adhesive sealant rated up to 315°C. Ideal for exhaust systems, ovens, and high-heat applications.',
        manufacturer: 'PDS Advanced Materials',
        status: 'active',
        specifications: {
          physical: {
            color: 'Red, Black',
            viscosity: { value: 'paste', unit: 'consistency' },
            density: { value: 1.3, unit: 'g/cm3' }
          },
          thermal: {
            temperature_range: { min: -65, max: 315, unit: '°C' },
            continuous_service: { value: 260, unit: '°C' },
            intermittent_service: { value: 315, unit: '°C' }
          }
        },
        applications: {
          industries: ['automotive', 'aerospace', 'industrial'],
          uses: ['Exhaust systems', 'Engine gaskets', 'Oven door seals', 'Heating equipment']
        }
      },
      {
        productId: 'AC-7000',
        name: 'AcrySpeed 7000 Light Cure',
        category: 'Acrylic',
        subcategory: 'UV-Cure',
        description: 'UV/Visible light curing acrylic adhesive with rapid cure and excellent optical clarity. Perfect for glass and plastic bonding.',
        manufacturer: 'PDS Advanced Materials',
        status: 'active',
        specifications: {
          physical: {
            color: 'Crystal clear',
            viscosity: { value: 300, unit: 'cPs', temperature: 25 },
            refractive_index: 1.48
          },
          cure: {
            cure_type: 'UV/Visible',
            wavelength: { value: '365-420', unit: 'nm' },
            cure_time: { value: 5, unit: 'seconds' },
            depth_of_cure: { value: 5, unit: 'mm' }
          }
        },
        applications: {
          industries: ['medical', 'optical', 'electronics'],
          uses: ['Medical device assembly', 'Lens bonding', 'Display assembly', 'Glass furniture']
        }
      },
      {
        productId: 'HM-1000',
        name: 'HotGrip 1000 Polyamide Hot Melt',
        category: 'Hot Melt',
        subcategory: 'Polyamide',
        description: 'High-performance polyamide hot melt with excellent chemical and oil resistance. Superior adhesion to difficult substrates.',
        manufacturer: 'PDS Advanced Materials',
        status: 'active',
        specifications: {
          physical: {
            color: 'Amber',
            form: 'Pellets',
            melt_viscosity: { value: 4000, unit: 'cPs', temperature: 210 },
            softening_point: { value: 140, unit: '°C' }
          },
          mechanical: {
            tensile_strength: { value: 25, unit: 'MPa' },
            chemical_resistance: 'Excellent'
          },
          thermal: {
            application_temp: { min: 190, max: 210, unit: '°C' },
            service_temp: { min: -40, max: 100, unit: '°C' }
          }
        },
        applications: {
          industries: ['automotive', 'electronics', 'filtration'],
          uses: ['Filter assembly', 'Automotive trim', 'Electronic potting', 'Cable assembly']
        }
      },
      {
        productId: 'SP-2200',
        name: 'ThermaBond 2200 Thermal Conductive',
        category: 'Specialty',
        subcategory: 'Thermal',
        description: 'Thermally conductive adhesive with aluminum oxide filler. Provides heat dissipation while maintaining electrical insulation.',
        manufacturer: 'PDS Advanced Materials',
        status: 'active',
        specifications: {
          physical: {
            color: 'White',
            viscosity: { value: 35000, unit: 'cPs', temperature: 25 },
            density: { value: 1.8, unit: 'g/cm3' }
          },
          thermal: {
            thermal_conductivity: { value: 1.2, unit: 'W/mK' },
            temperature_range: { min: -55, max: 150, unit: '°C' }
          },
          electrical: {
            dielectric_strength: { value: 15, unit: 'kV/mm' },
            volume_resistivity: { value: 1e14, unit: 'ohm-cm' }
          }
        },
        applications: {
          industries: ['electronics', 'LED', 'power_electronics'],
          uses: ['Heat sink attachment', 'LED assembly', 'Power module bonding', 'CPU cooling']
        }
      },
      {
        productId: 'EP-5000',
        name: 'EpoxiFast 5000 Five-Minute',
        category: 'Epoxy',
        subcategory: 'Rapid-Cure',
        description: 'Fast-setting five-minute epoxy for quick repairs and assembly. General purpose adhesive for household and industrial use.',
        manufacturer: 'PDS Advanced Materials',
        status: 'active',
        specifications: {
          physical: {
            color: 'Clear to amber',
            viscosity: { value: 5000, unit: 'cPs', temperature: 25 },
            mix_ratio: '1:1'
          },
          mechanical: {
            tensile_strength: { value: 17, unit: 'MPa' },
            shear_strength: { value: 12, unit: 'MPa', substrate: 'aluminum' }
          },
          cure: {
            cure_type: 'chemical',
            working_time: { value: 5, unit: 'minutes' },
            handling_time: { value: 15, unit: 'minutes' },
            full_cure: { value: 1, unit: 'hours' }
          }
        },
        applications: {
          industries: ['maintenance', 'DIY', 'general_repair'],
          uses: ['Quick repairs', 'Small part assembly', 'Emergency fixes', 'Craft projects']
        }
      },
      {
        productId: 'CA-4000',
        name: 'CyanoMed 4000 Medical Grade',
        category: 'Cyanoacrylate',
        subcategory: 'Medical',
        description: 'USP Class VI certified medical grade cyanoacrylate for medical device assembly. Low bloom, low odor formulation.',
        manufacturer: 'PDS Advanced Materials',
        status: 'active',
        specifications: {
          physical: {
            color: 'Clear',
            viscosity: { value: 100, unit: 'cPs', temperature: 25 },
            purity: 'USP Class VI'
          },
          mechanical: {
            tensile_strength: { value: 20, unit: 'MPa' },
            shear_strength: { value: 16, unit: 'MPa', substrate: 'polycarbonate' }
          },
          compliance: {
            certifications: ['USP Class VI', 'ISO 10993-5', 'ISO 10993-10'],
            biocompatibility: 'Cytotoxicity tested'
          }
        },
        applications: {
          industries: ['medical_device', 'pharmaceutical', 'diagnostic'],
          uses: ['Needle assembly', 'Catheter bonding', 'Diagnostic device assembly', 'Surgical instrument assembly']
        }
      },
      {
        productId: 'PU-5500',
        name: 'PolyGlass 5500 Windshield Adhesive',
        category: 'Polyurethane',
        subcategory: 'Automotive',
        description: 'OEM approved polyurethane adhesive for automotive glass installation. Fast drive-away time with excellent durability.',
        manufacturer: 'PDS Advanced Materials',
        status: 'active',
        specifications: {
          physical: {
            color: 'Black',
            viscosity: { value: 'paste', unit: 'consistency' },
            sag_resistance: 'Excellent'
          },
          mechanical: {
            tensile_strength: { value: 7, unit: 'MPa' },
            lap_shear: { value: 4, unit: 'MPa' },
            elongation: { value: 400, unit: '%' }
          },
          performance: {
            drive_away_time: { value: 1, unit: 'hour', conditions: 'with_airbag' },
            primer_required: true
          }
        },
        applications: {
          industries: ['automotive', 'transportation', 'glass'],
          uses: ['Windshield installation', 'Side glass bonding', 'Sunroof installation', 'Back glass mounting']
        }
      },
      {
        productId: 'AC-8000',
        name: 'AcryWeld 8000 Plastic Bonder',
        category: 'Acrylic',
        subcategory: 'Solvent-Based',
        description: 'Solvent-based acrylic adhesive specifically designed for bonding thermoplastics including ABS, PC, and PMMA.',
        manufacturer: 'PDS Advanced Materials',
        status: 'active',
        specifications: {
          physical: {
            color: 'Water clear',
            viscosity: { value: 3, unit: 'cPs', temperature: 25 },
            solids_content: { value: 15, unit: '%' }
          },
          mechanical: {
            tensile_strength: { value: 30, unit: 'MPa' },
            shear_strength: { value: 25, unit: 'MPa', substrate: 'acrylic' }
          },
          cure: {
            cure_type: 'solvent_evaporation',
            fixture_time: { value: 30, unit: 'seconds' },
            full_cure: { value: 24, unit: 'hours' }
          }
        },
        applications: {
          industries: ['signage', 'display', 'fabrication'],
          uses: ['Acrylic fabrication', 'Display cases', 'Sign making', 'Plastic welding']
        }
      },
      {
        productId: 'SI-1100',
        name: 'SiliconePot 1100 Encapsulant',
        category: 'Silicone',
        subcategory: 'Potting',
        description: 'Two-component silicone potting compound for electronic encapsulation. Provides environmental protection and vibration damping.',
        manufacturer: 'PDS Advanced Materials',
        status: 'active',
        specifications: {
          physical: {
            color: 'Black, Clear',
            viscosity: { value: 3500, unit: 'cPs', temperature: 25 },
            mix_ratio: '10:1',
            hardness: { value: 45, unit: 'Shore A' }
          },
          electrical: {
            dielectric_strength: { value: 20, unit: 'kV/mm' },
            volume_resistivity: { value: 1e15, unit: 'ohm-cm' }
          },
          thermal: {
            temperature_range: { min: -65, max: 200, unit: '°C' },
            thermal_conductivity: { value: 0.2, unit: 'W/mK' }
          }
        },
        applications: {
          industries: ['electronics', 'automotive', 'telecommunications'],
          uses: ['PCB potting', 'Sensor encapsulation', 'Junction box filling', 'Connector sealing']
        }
      },
      {
        productId: 'HM-1100',
        name: 'HotSeal 1100 Pressure Sensitive',
        category: 'Hot Melt',
        subcategory: 'PSA',
        description: 'Pressure-sensitive hot melt adhesive for label and tape applications. Maintains tack at room temperature.',
        manufacturer: 'PDS Advanced Materials',
        status: 'active',
        specifications: {
          physical: {
            color: 'Clear to light yellow',
            form: 'Blocks',
            melt_viscosity: { value: 8000, unit: 'cPs', temperature: 175 }
          },
          performance: {
            tack: 'High',
            peel_adhesion: { value: 35, unit: 'N/25mm' },
            shear_adhesion: { value: 48, unit: 'hours', load: '1kg' }
          },
          thermal: {
            application_temp: { min: 160, max: 180, unit: '°C' },
            service_temp: { min: -20, max: 60, unit: '°C' }
          }
        },
        applications: {
          industries: ['label', 'tape', 'packaging'],
          uses: ['Label application', 'Tape manufacturing', 'Removable bonding', 'Temporary assembly']
        }
      },
      {
        productId: 'SP-3300',
        name: 'FlexBond 3300 Conductive Rubber',
        category: 'Specialty',
        subcategory: 'Flexible-Conductive',
        description: 'Flexible conductive adhesive combining electrical conductivity with rubber-like flexibility. Ideal for flexible circuits.',
        manufacturer: 'PDS Advanced Materials',
        status: 'active',
        specifications: {
          physical: {
            color: 'Black',
            viscosity: { value: 15000, unit: 'cPs', temperature: 25 },
            hardness: { value: 65, unit: 'Shore A' }
          },
          electrical: {
            volume_resistivity: { value: 0.01, unit: 'ohm-cm' },
            flexibility: 'Can withstand 180° bend'
          },
          mechanical: {
            elongation: { value: 200, unit: '%' },
            tensile_strength: { value: 5, unit: 'MPa' }
          }
        },
        applications: {
          industries: ['flexible_electronics', 'wearables', 'automotive'],
          uses: ['Flexible circuit assembly', 'Wearable electronics', 'Strain gauge attachment', 'EMI gaskets']
        }
      },
      
      // Extended Product Catalog - Phase 2
      {
        productId: 'AN-1000',
        name: 'AnaerobicLock 1000 Threadlocker',
        category: 'Anaerobic',
        subcategory: 'Threadlocker',
        description: 'Medium-strength anaerobic adhesive for locking and sealing threaded fasteners.',
        manufacturer: 'PDS Advanced Materials',
        status: 'active',
        specifications: {
          physical: {
            color: 'Blue',
            viscosity: { value: 900, unit: 'cPs', temperature: 25 },
            specific_gravity: 1.08
          },
          mechanical: {
            breakaway_torque: { value: 15, unit: 'Nm' },
            prevail_torque: { value: 6, unit: 'Nm' },
            max_thread_size: 'M20'
          },
          cure: {
            fixture_time: { value: 10, unit: 'minutes' },
            full_cure: { value: 24, unit: 'hours' },
            temperature_range: { min: -55, max: 150, unit: '°C' }
          }
        },
        applications: {
          industries: ['automotive', 'machinery', 'aerospace'],
          uses: ['Bolt locking', 'Vibration resistance', 'Seal threads', 'Prevent loosening']
        }
      },
      {
        productId: 'UV-2000',
        name: 'UVBond 2000 Glass Adhesive',
        category: 'UV Cure',
        subcategory: 'Optical',
        description: 'Crystal clear UV-curable adhesive for glass bonding and optical applications.',
        manufacturer: 'PDS Advanced Materials',
        status: 'active',
        specifications: {
          physical: {
            color: 'Clear',
            viscosity: { value: 500, unit: 'cPs', temperature: 25 },
            refractive_index: 1.51
          },
          optical: {
            transmission: { value: 98, unit: '%', wavelength: '400-700nm' },
            clarity: 'Water clear'
          },
          cure: {
            wavelength: { value: 365, unit: 'nm' },
            cure_time: { value: 30, unit: 'seconds' },
            intensity: { value: 100, unit: 'mW/cm²' }
          }
        },
        applications: {
          industries: ['optics', 'display', 'photonics', 'furniture'],
          uses: ['Glass bonding', 'Display assembly', 'Lens bonding', 'Crystal bonding']
        }
      },
      {
        productId: 'MS-3000',
        name: 'ModifiedSilane 3000 Hybrid',
        category: 'MS Polymer',
        subcategory: 'Hybrid',
        description: 'Modified silane polymer adhesive combining the best of polyurethane and silicone.',
        manufacturer: 'PDS Advanced Materials',
        status: 'active',
        specifications: {
          physical: {
            color: 'White',
            viscosity: { value: 80000, unit: 'cPs', temperature: 25 },
            solids_content: { value: 100, unit: '%' }
          },
          mechanical: {
            tensile_strength: { value: 3.5, unit: 'MPa' },
            elongation: { value: 350, unit: '%' },
            shore_hardness: { value: 50, unit: 'Shore A' }
          },
          environmental: {
            uv_resistant: true,
            weathering: 'Excellent',
            chemical_resistance: 'Good'
          }
        },
        applications: {
          industries: ['construction', 'marine', 'transportation'],
          uses: ['Facade bonding', 'Deck caulking', 'Panel bonding', 'Weatherproofing']
        }
      },
      {
        productId: 'RB-4000',
        name: 'RubberBond 4000 Contact Adhesive',
        category: 'Rubber',
        subcategory: 'Contact',
        description: 'High-strength contact adhesive for rubber and flexible materials.',
        manufacturer: 'PDS Advanced Materials',
        status: 'active',
        specifications: {
          physical: {
            color: 'Amber',
            viscosity: { value: 3000, unit: 'cPs', temperature: 25 },
            solids: { value: 28, unit: '%' }
          },
          performance: {
            open_time: { value: 30, unit: 'minutes' },
            tack_range: { min: 5, max: 30, unit: 'minutes' },
            bond_strength: { value: 4, unit: 'MPa' }
          }
        },
        applications: {
          industries: ['footwear', 'automotive', 'furniture'],
          uses: ['Shoe assembly', 'Rubber bonding', 'Laminating', 'Gasket attachment']
        }
      },
      {
        productId: 'PSA-5000',
        name: 'PressureGrip 5000 PSA',
        category: 'Pressure Sensitive',
        subcategory: 'Transfer Tape',
        description: 'High-performance pressure sensitive adhesive transfer tape.',
        manufacturer: 'PDS Advanced Materials',
        status: 'active',
        specifications: {
          physical: {
            thickness: { value: 0.05, unit: 'mm' },
            color: 'Clear',
            carrier: 'None'
          },
          adhesion: {
            peel_strength: { value: 25, unit: 'N/25mm' },
            shear_strength: { value: 72, unit: 'hours', load: '1kg' },
            tack: 'High'
          }
        },
        applications: {
          industries: ['graphics', 'electronics', 'automotive'],
          uses: ['Mounting', 'Laminating', 'Die-cutting', 'Nameplate attachment']
        }
      },
      {
        productId: 'VA-6000',
        name: 'VinylAcetate 6000 Wood Glue',
        category: 'PVA',
        subcategory: 'Wood',
        description: 'Professional-grade polyvinyl acetate adhesive for wood bonding.',
        manufacturer: 'PDS Advanced Materials',
        status: 'active',
        specifications: {
          physical: {
            color: 'White',
            viscosity: { value: 4500, unit: 'cPs', temperature: 25 },
            pH: 4.5
          },
          performance: {
            open_time: { value: 10, unit: 'minutes' },
            clamp_time: { value: 30, unit: 'minutes' },
            full_strength: { value: 24, unit: 'hours' }
          }
        },
        applications: {
          industries: ['woodworking', 'furniture', 'construction'],
          uses: ['Furniture assembly', 'Laminating', 'Edge banding', 'General woodworking']
        }
      },
      {
        productId: 'NP-7000',
        name: 'Neoprene 7000 Contact Cement',
        category: 'Neoprene',
        subcategory: 'Solvent-Based',
        description: 'High-strength neoprene contact cement for demanding applications.',
        manufacturer: 'PDS Advanced Materials',
        status: 'active',
        specifications: {
          physical: {
            color: 'Tan',
            viscosity: { value: 2500, unit: 'cPs', temperature: 25 },
            solids: { value: 23, unit: '%' }
          },
          performance: {
            coverage: { value: 250, unit: 'sq.ft/gallon' },
            open_time: { value: 45, unit: 'minutes' },
            heat_resistance: { max: 93, unit: '°C' }
          }
        },
        applications: {
          industries: ['construction', 'marine', 'automotive'],
          uses: ['Laminate bonding', 'Foam attachment', 'Leather bonding', 'Metal to rubber']
        }
      },
      {
        productId: 'BU-8000',
        name: 'ButylSeal 8000 Tape',
        category: 'Butyl',
        subcategory: 'Tape',
        description: 'Butyl rubber adhesive tape for sealing and waterproofing.',
        manufacturer: 'PDS Advanced Materials',
        status: 'active',
        specifications: {
          physical: {
            thickness: { value: 1.5, unit: 'mm' },
            width: { value: 50, unit: 'mm' },
            color: 'Black'
          },
          performance: {
            peel_adhesion: { value: 30, unit: 'N/25mm' },
            service_temp: { min: -40, max: 90, unit: '°C' },
            water_absorption: { value: 0.1, unit: '%' }
          }
        },
        applications: {
          industries: ['construction', 'HVAC', 'automotive'],
          uses: ['Roof sealing', 'Window installation', 'Pipe wrapping', 'Vapor barrier']
        }
      },
      {
        productId: 'ST-9000',
        name: 'StructuralTape 9000 VHB',
        category: 'Acrylic',
        subcategory: 'VHB Tape',
        description: 'Very high bond double-sided acrylic foam tape for permanent bonding.',
        manufacturer: 'PDS Advanced Materials',
        status: 'active',
        specifications: {
          physical: {
            thickness: { value: 1.1, unit: 'mm' },
            color: 'Gray',
            density: { value: 720, unit: 'kg/m³' }
          },
          performance: {
            tensile_strength: { value: 480, unit: 'kPa' },
            dynamic_shear: { value: 690, unit: 'kPa' },
            temperature_resistance: { min: -40, max: 150, unit: '°C' }
          }
        },
        applications: {
          industries: ['architectural', 'signage', 'transportation'],
          uses: ['Panel bonding', 'Curtain wall', 'Sign mounting', 'Trim attachment']
        }
      },
      {
        productId: 'FP-1000',
        name: 'FoamPU 1000 Spray',
        category: 'Polyurethane',
        subcategory: 'Spray Foam',
        description: 'One-component polyurethane foam adhesive for insulation and filling.',
        manufacturer: 'PDS Advanced Materials',
        status: 'active',
        specifications: {
          physical: {
            expansion_ratio: { value: 30, unit: 'times' },
            tack_free: { value: 10, unit: 'minutes' },
            cuttable: { value: 30, unit: 'minutes' }
          },
          insulation: {
            r_value: { value: 5, unit: 'per inch' },
            closed_cell: { value: 70, unit: '%' }
          }
        },
        applications: {
          industries: ['construction', 'insulation', 'packaging'],
          uses: ['Gap filling', 'Insulation', 'Sound dampening', 'Mounting blocks']
        }
      },
      {
        productId: 'WB-2000',
        name: 'WaterBond 2000 Aqueous',
        category: 'Water-Based',
        subcategory: 'Acrylic',
        description: 'Environmentally friendly water-based acrylic adhesive.',
        manufacturer: 'PDS Advanced Materials',
        status: 'active',
        specifications: {
          physical: {
            solids: { value: 45, unit: '%' },
            pH: 7.5,
            VOC: { value: 0, unit: 'g/L' }
          },
          performance: {
            dry_time: { value: 20, unit: 'minutes' },
            bond_strength: { value: 2.5, unit: 'MPa' },
            water_resistance: 'Good after drying'
          }
        },
        applications: {
          industries: ['packaging', 'paper', 'textiles'],
          uses: ['Box sealing', 'Label application', 'Paper bonding', 'Fabric laminating']
        }
      },
      {
        productId: 'SG-3000',
        name: 'SolventGrip 3000 Adhesive',
        category: 'Solvent-Based',
        subcategory: 'Multipurpose',
        description: 'Fast-drying solvent-based adhesive for difficult substrates.',
        manufacturer: 'PDS Advanced Materials',
        status: 'active',
        specifications: {
          physical: {
            viscosity: { value: 200, unit: 'cPs', temperature: 25 },
            flash_point: { value: -4, unit: '°C' },
            evaporation_rate: 'Fast'
          },
          performance: {
            set_time: { value: 30, unit: 'seconds' },
            full_strength: { value: 10, unit: 'minutes' }
          }
        },
        applications: {
          industries: ['plastics', 'automotive', 'manufacturing'],
          uses: ['Plastic bonding', 'Trim work', 'Quick repairs', 'Model making']
        }
      },
      {
        productId: 'FB-4000',
        name: 'FilmBond 4000 Laminating',
        category: 'Hot Melt',
        subcategory: 'Film',
        description: 'Thermoplastic hot melt adhesive film for laminating applications.',
        manufacturer: 'PDS Advanced Materials',
        status: 'active',
        specifications: {
          physical: {
            thickness: { value: 0.1, unit: 'mm' },
            activation_temp: { value: 120, unit: '°C' },
            melt_flow: { value: 15, unit: 'g/10min' }
          },
          performance: {
            bond_strength: { value: 3.5, unit: 'MPa' },
            heat_resistance: { max: 80, unit: '°C' }
          }
        },
        applications: {
          industries: ['textiles', 'automotive', 'electronics'],
          uses: ['Fabric laminating', 'Membrane switches', 'Automotive interiors', 'Badge attachment']
        }
      },
      {
        productId: 'RP-5000',
        name: 'ReactivePolymer 5000',
        category: 'Reactive',
        subcategory: 'Moisture Cure',
        description: 'One-component reactive adhesive that cures with atmospheric moisture.',
        manufacturer: 'PDS Advanced Materials',
        status: 'active',
        specifications: {
          physical: {
            color: 'Translucent',
            viscosity: { value: 7000, unit: 'cPs', temperature: 25 },
            skin_time: { value: 15, unit: 'minutes' }
          },
          mechanical: {
            tensile_strength: { value: 8, unit: 'MPa' },
            elongation: { value: 400, unit: '%' }
          }
        },
        applications: {
          industries: ['construction', 'marine', 'automotive'],
          uses: ['Structural glazing', 'Boat building', 'Panel bonding', 'Waterproofing']
        }
      },
      {
        productId: 'HS-6000',
        name: 'HybridSeal 6000 Adhesive',
        category: 'Hybrid',
        subcategory: 'Sealant-Adhesive',
        description: 'Dual-purpose product functioning as both adhesive and sealant.',
        manufacturer: 'PDS Advanced Materials',
        status: 'active',
        specifications: {
          physical: {
            color: 'Gray',
            viscosity: { value: 100000, unit: 'cPs', temperature: 25 },
            sag_resistance: 'Excellent'
          },
          performance: {
            movement_capability: { value: 25, unit: '%' },
            adhesion_strength: { value: 2, unit: 'MPa' }
          }
        },
        applications: {
          industries: ['construction', 'HVAC', 'transportation'],
          uses: ['Joint sealing', 'Duct sealing', 'Vibration dampening', 'Weatherproofing']
        }
      }
    ];
  }

  /**
   * Generate comprehensive document data
   */
  generateDocumentData() {
    return [
      {
        documentId: 'TDS-CA-1000',
        type: 'technical_data_sheet',
        title: 'Technical Data Sheet - CyanoFast 1000',
        version: '2.3',
        language: 'en',
        format: 'pdf',
        url: '/documents/TDS-CA-1000.pdf',
        content: 'Complete technical specifications and application guidelines for CyanoFast 1000...',
        relatedProducts: ['CA-1000'],
        metadata: {
          pages: 8,
          fileSize: '1.2MB',
          lastUpdated: new Date('2024-01-15')
        },
        tags: ['technical', 'specifications', 'cyanoacrylate']
      },
      {
        documentId: 'SDS-CA-1000',
        type: 'safety_data_sheet',
        title: 'Safety Data Sheet - CyanoFast 1000',
        version: '3.1',
        language: 'en',
        format: 'pdf',
        url: '/documents/SDS-CA-1000.pdf',
        content: 'Safety information, handling procedures, and emergency measures for CyanoFast 1000...',
        relatedProducts: ['CA-1000'],
        metadata: {
          pages: 12,
          fileSize: '890KB',
          lastUpdated: new Date('2024-02-01')
        },
        tags: ['safety', 'MSDS', 'handling', 'storage']
      },
      {
        documentId: 'APP-AUTO-001',
        type: 'application_guide',
        title: 'Adhesive Selection Guide for Automotive Applications',
        version: '3.0',
        language: 'en',
        format: 'pdf',
        url: '/documents/APP-AUTO-001.pdf',
        content: 'Comprehensive guide for selecting adhesives in automotive manufacturing. Covers body assembly, interior trim, glass bonding, and powertrain applications...',
        relatedProducts: ['EP-2000', 'PU-3300', 'AC-5500', 'SI-8000'],
        metadata: {
          pages: 45,
          fileSize: '5.2MB',
          lastUpdated: new Date('2024-03-01')
        },
        tags: ['automotive', 'selection', 'guide', 'application', 'best-practices']
      },
      {
        documentId: 'APP-ELEC-001',
        type: 'application_guide',
        title: 'Electronic Assembly Adhesives Guide',
        version: '2.5',
        language: 'en',
        format: 'pdf',
        url: '/documents/APP-ELEC-001.pdf',
        content: 'Guidelines for selecting and using adhesives in electronic assembly, including PCB assembly, component potting, and thermal management...',
        relatedProducts: ['CA-1000', 'EP-3000', 'SP-1100', 'SI-8000'],
        metadata: {
          pages: 32,
          fileSize: '3.8MB',
          lastUpdated: new Date('2024-02-15')
        },
        tags: ['electronics', 'PCB', 'assembly', 'thermal-management']
      },
      {
        documentId: 'CERT-ISO-10993',
        type: 'certification',
        title: 'ISO 10993 Biocompatibility Certification',
        version: '1.0',
        language: 'en',
        format: 'pdf',
        url: '/documents/CERT-ISO-10993.pdf',
        content: 'Certification of biocompatibility testing according to ISO 10993 standards for medical device applications...',
        relatedProducts: ['CA-1000', 'EP-3000', 'SI-8000'],
        metadata: {
          pages: 15,
          fileSize: '2.1MB',
          issueDate: new Date('2023-06-01'),
          expiryDate: new Date('2026-06-01')
        },
        tags: ['certification', 'medical', 'ISO-10993', 'biocompatibility']
      },
      {
        documentId: 'GUIDE-SURFACE-PREP',
        type: 'technical_guide',
        title: 'Surface Preparation Guide for Optimal Adhesion',
        version: '4.2',
        language: 'en',
        format: 'pdf',
        url: '/documents/GUIDE-SURFACE-PREP.pdf',
        content: 'Detailed guide on surface preparation techniques including cleaning, abrading, priming, and plasma treatment for various substrates...',
        relatedProducts: ['EP-2000', 'PU-3300', 'AC-6000'],
        metadata: {
          pages: 28,
          fileSize: '3.5MB',
          lastUpdated: new Date('2024-01-20')
        },
        tags: ['surface-preparation', 'cleaning', 'priming', 'best-practices']
      },
      {
        documentId: 'TROUBLESHOOT-001',
        type: 'troubleshooting_guide',
        title: 'Adhesive Bonding Troubleshooting Guide',
        version: '2.1',
        language: 'en',
        format: 'pdf',
        url: '/documents/TROUBLESHOOT-001.pdf',
        content: 'Common adhesive bonding problems and solutions. Covers adhesion failure, cure issues, dispensing problems, and joint design...',
        relatedProducts: [],
        metadata: {
          pages: 36,
          fileSize: '4.2MB',
          lastUpdated: new Date('2024-02-10')
        },
        tags: ['troubleshooting', 'problem-solving', 'failure-analysis']
      },
      {
        documentId: 'CATALOG-2024',
        type: 'product_catalog',
        title: 'PDS Advanced Materials Product Catalog 2024',
        version: '2024.1',
        language: 'en',
        format: 'pdf',
        url: '/documents/CATALOG-2024.pdf',
        content: 'Complete product catalog featuring all adhesive products, specifications, and ordering information...',
        relatedProducts: [],
        metadata: {
          pages: 120,
          fileSize: '15.3MB',
          lastUpdated: new Date('2024-01-01')
        },
        tags: ['catalog', 'products', 'specifications', 'ordering']
      },
      {
        documentId: 'VIDEO-EP-2000',
        type: 'video_tutorial',
        title: 'EpoxiBond 2000 Application Tutorial',
        version: '1.0',
        language: 'en',
        format: 'mp4',
        url: '/videos/EP-2000-tutorial.mp4',
        content: 'Step-by-step video tutorial demonstrating proper mixing and application techniques for EpoxiBond 2000...',
        relatedProducts: ['EP-2000'],
        metadata: {
          duration: '12:30',
          fileSize: '125MB',
          resolution: '1920x1080',
          lastUpdated: new Date('2024-03-15')
        },
        tags: ['video', 'tutorial', 'epoxy', 'application']
      },
      {
        documentId: 'WHITEPAPER-SUSTAIN',
        type: 'whitepaper',
        title: 'Sustainable Adhesive Technologies',
        version: '1.2',
        language: 'en',
        format: 'pdf',
        url: '/documents/WHITEPAPER-SUSTAIN.pdf',
        content: 'Research paper on environmentally sustainable adhesive technologies including bio-based materials and recycling strategies...',
        relatedProducts: [],
        metadata: {
          pages: 18,
          fileSize: '2.8MB',
          authors: ['Dr. Sarah Johnson', 'Prof. Michael Chen'],
          lastUpdated: new Date('2024-02-28')
        },
        tags: ['sustainability', 'environment', 'research', 'bio-based']
      }
    ];
  }

  /**
   * Load and merge AEDatabase attributes
   */
  async loadAEDatabaseAttributes() {
    try {
      // Connect to PDSAdhesives database
      const pdsDb = this.client.db('PDSAdhesives');
      const aeCollection = pdsDb.collection('AEdatabase');
      const aeData = await aeCollection.find({}).toArray();
      
      if (aeData.length > 0) {
        console.log(`  📊 Found ${aeData.length} entries in AEDatabase`);
        
        // Create a map for quick lookup
        const aeMap = new Map();
        aeData.forEach(item => {
          // Map by productId or any other identifier
          if (item.productId) {
            aeMap.set(item.productId, item);
          } else if (item.code) {
            aeMap.set(item.code, item);
          }
        });
        
        return aeMap;
      } else {
        console.log('  ℹ️ AEDatabase is empty, skipping attribute merge');
        return new Map();
      }
    } catch (error) {
      console.log('  ⚠️ Could not access AEDatabase:', error.message);
      return new Map();
    }
  }

  /**
   * Load real documents from PDSAdhesives.AdhesivePDSDocumentMaster
   */
  async loadRealDocuments() {
    try {
      const pdsDb = this.client.db('PDSAdhesives');
      const docCollection = pdsDb.collection('AdhesivePDSDocumentMaster');
      const realDocs = await docCollection.find({}).toArray();
      
      if (realDocs.length > 0) {
        console.log(`  📄 Found ${realDocs.length} real documents in PDSAdhesives`);
        return realDocs;
      }
      return [];
    } catch (error) {
      console.log('  ⚠️ Could not access PDSAdhesives documents:', error.message);
      return [];
    }
  }

  /**
   * Convert and load all products
   */
  async loadProducts() {
    console.log('\n📦 Loading Products...');
    
    // Load AEDatabase attributes
    const aeAttributes = await this.loadAEDatabaseAttributes();
    
    const products = this.generateProductData();
    const collection = this.db.collection('AESearchDatabase');
    const kbCollection = this.db.collection('KnowledgeBaseCurrentState');
    
    this.stats.products.total = products.length;
    
    for (const product of products) {
      try {
        // Merge AEDatabase attributes if available
        const aeData = aeAttributes.get(product.productId);
        if (aeData) {
          console.log(`    ✓ Merging AEDatabase attributes for ${product.productId}`);
          // Merge additional attributes from AEDatabase
          product.aeAttributes = {
            ...aeData,
            mergedAt: new Date()
          };
          
          // Merge specific fields into main product
          if (aeData.additionalSpecs) {
            product.specifications = {
              ...product.specifications,
              ...aeData.additionalSpecs
            };
          }
          
          if (aeData.certifications) {
            product.compliance = {
              ...product.compliance,
              certifications: aeData.certifications
            };
          }
        }
        
        // Add metadata
        product.dataHash = this.calculateHash(product);
        product.lastModified = new Date();
        product.createdAt = new Date();
        
        // Insert/update in main collection
        await collection.replaceOne(
          { productId: product.productId },
          product,
          { upsert: true }
        );
        
        // Create knowledge base entity
        const kbEntity = {
          entityId: `PROD_${product.productId}`,
          type: 'product',
          subType: product.category,
          name: product.name,
          description: product.description,
          status: product.status,
          version: 1,
          content: {
            original: product,
            searchable: this.createSearchableContent(product)
          },
          metadata: {
            category: product.category,
            subcategory: product.subcategory,
            manufacturer: product.manufacturer,
            keywords: this.extractKeywords(product),
            tags: product.applications?.uses || [],
            industries: product.applications?.industries || []
          },
          relationships: {
            products: [],
            related: [],
            supersedes: null,
            supersededBy: null
          },
          quality: {
            completeness: 1,
            accuracy: 1,
            relevance: 1
          },
          createdAt: new Date(),
          lastModified: new Date(),
          changeCount: 0
        };
        
        await kbCollection.replaceOne(
          { entityId: kbEntity.entityId },
          kbEntity,
          { upsert: true }
        );
        
        this.stats.products.converted++;
        console.log(`  ✅ ${product.name}`);
        
      } catch (error) {
        console.error(`  ❌ Failed to load ${product.productId}:`, error.message);
        this.stats.products.failed++;
      }
    }
  }

  /**
   * Convert and load all documents
   */
  async loadDocuments() {
    console.log('\n📄 Loading Documents...');
    
    // First, try to load real documents from PDSAdhesives
    const realDocuments = await this.loadRealDocuments();
    
    // Use real documents if available, otherwise use generated data
    const documents = realDocuments.length > 0 ? realDocuments : this.generateDocumentData();
    
    if (realDocuments.length > 0) {
      console.log('  ✓ Using real documents from PDSAdhesives.AdhesivePDSDocumentMaster');
    } else {
      console.log('  ℹ️ Using generated document data');
    }
    
    const collection = this.db.collection('AdhesivePDSDocumentMaster');
    const kbCollection = this.db.collection('KnowledgeBaseCurrentState');
    
    this.stats.documents.total = documents.length;
    
    for (const doc of documents) {
      try {
        // Clean up document for insertion (remove _id from source)
        const cleanDoc = { ...doc };
        delete cleanDoc._id;
        
        // Ensure documentId exists
        if (!cleanDoc.documentId) {
          cleanDoc.documentId = `DOC_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        }
        
        // Add metadata
        cleanDoc.dataHash = this.calculateHash(cleanDoc);
        cleanDoc.lastModified = new Date();
        if (!cleanDoc.createdAt) {
          cleanDoc.createdAt = new Date();
        }
        
        // Insert/update in main collection
        await collection.replaceOne(
          { documentId: cleanDoc.documentId },
          cleanDoc,
          { upsert: true }
        );
        
        // Create knowledge base entity
        const kbEntity = {
          entityId: `DOC_${cleanDoc.documentId}`,
          type: 'document',
          subType: cleanDoc.type || 'general',
          name: cleanDoc.title || cleanDoc.documentId,
          description: `${cleanDoc.type || 'Document'} for ${cleanDoc.title || cleanDoc.documentId}`,
          status: 'active',
          version: 1,
          content: {
            original: cleanDoc,
            searchable: this.createSearchableContent(cleanDoc)
          },
          metadata: {
            documentType: doc.type,
            language: doc.language,
            format: doc.format,
            keywords: this.extractKeywords(doc),
            tags: doc.tags || [],
            relatedProducts: doc.relatedProducts || []
          },
          relationships: {
            products: [],
            related: doc.relatedProducts?.map(p => `PROD_${p}`) || [],
            supersedes: null,
            supersededBy: null
          },
          quality: {
            completeness: 1,
            accuracy: 1,
            relevance: 1
          },
          createdAt: new Date(),
          lastModified: new Date(),
          changeCount: 0
        };
        
        await kbCollection.replaceOne(
          { entityId: kbEntity.entityId },
          kbEntity,
          { upsert: true }
        );
        
        this.stats.documents.converted++;
        console.log(`  ✅ ${doc.title}`);
        
      } catch (error) {
        console.error(`  ❌ Failed to load ${doc.documentId}:`, error.message);
        this.stats.documents.failed++;
      }
    }
  }

  /**
   * Create searchable content from entity
   */
  createSearchableContent(entity) {
    const fields = [];
    
    const extractText = (obj, prefix = '') => {
      for (const key in obj) {
        if (typeof obj[key] === 'string') {
          fields.push(obj[key]);
        } else if (Array.isArray(obj[key])) {
          fields.push(...obj[key].filter(item => typeof item === 'string'));
        } else if (typeof obj[key] === 'object' && obj[key] !== null && !obj[key] instanceof Date) {
          extractText(obj[key], `${prefix}${key}.`);
        }
      }
    };
    
    extractText(entity);
    return fields.join(' ');
  }

  /**
   * Extract keywords from entity
   */
  extractKeywords(entity) {
    const text = this.createSearchableContent(entity).toLowerCase();
    const words = text.split(/\s+/)
      .filter(word => word.length > 3)
      .filter(word => !['this', 'that', 'with', 'from', 'have'].includes(word));
    
    // Get unique words
    const uniqueWords = [...new Set(words)];
    
    // Return top 30 keywords
    return uniqueWords.slice(0, 30);
  }

  /**
   * Create relationships between products and documents
   */
  async createRelationships() {
    console.log('\n🔗 Creating Relationships...');
    
    const kbCollection = this.db.collection('KnowledgeBaseCurrentState');
    const documents = await kbCollection.find({ type: 'document' }).toArray();
    
    for (const doc of documents) {
      if (doc.metadata?.relatedProducts?.length > 0) {
        for (const productId of doc.metadata.relatedProducts) {
          // Update product to reference this document
          await kbCollection.updateOne(
            { entityId: `PROD_${productId}` },
            { 
              $addToSet: { 
                'relationships.related': doc.entityId 
              } 
            }
          );
          this.stats.relationships.created++;
        }
      }
    }
    
    console.log(`  ✅ Created ${this.stats.relationships.created} relationships`);
  }

  /**
   * Generate statistics report
   */
  async generateReport() {
    console.log('\n📊 Conversion Statistics');
    console.log('=' .repeat(50));
    
    const kbCollection = this.db.collection('KnowledgeBaseCurrentState');
    const productsCollection = this.db.collection('AESearchDatabase');
    const documentsCollection = this.db.collection('AdhesivePDSDocumentMaster');
    
    const kbCount = await kbCollection.countDocuments();
    const productCount = await productsCollection.countDocuments();
    const documentCount = await documentsCollection.countDocuments();
    
    console.log('Products:');
    console.log(`  • Total: ${this.stats.products.total}`);
    console.log(`  • Converted: ${this.stats.products.converted}`);
    console.log(`  • Failed: ${this.stats.products.failed}`);
    console.log(`  • In Database: ${productCount}`);
    
    console.log('\nDocuments:');
    console.log(`  • Total: ${this.stats.documents.total}`);
    console.log(`  • Converted: ${this.stats.documents.converted}`);
    console.log(`  • Failed: ${this.stats.documents.failed}`);
    console.log(`  • In Database: ${documentCount}`);
    
    console.log('\nKnowledge Base:');
    console.log(`  • Total Entities: ${kbCount}`);
    console.log(`  • Relationships: ${this.stats.relationships.created}`);
    
    const duration = (Date.now() - this.stats.startTime) / 1000;
    console.log(`\n⏱️  Total Time: ${duration.toFixed(2)} seconds`);
    
    // Sample queries
    console.log('\n🔍 Sample Searches:');
    const samples = ['epoxy', 'automotive', 'silicone', 'medical'];
    for (const query of samples) {
      const results = await kbCollection.find({
        $text: { $search: query }
      }).limit(3).toArray();
      console.log(`  • "${query}": ${results.length} results`);
    }
  }

  /**
   * Run the complete conversion
   */
  async run() {
    try {
      console.log('🚀 Starting Comprehensive Data Conversion');
      console.log('=' .repeat(50));
      
      await this.connect();
      
      // Ensure indexes
      console.log('\n📑 Creating Indexes...');
      try {
        await this.db.collection('KnowledgeBaseCurrentState').createIndex({ entityId: 1 }, { unique: true });
      } catch (e) { /* Index exists */ }
      
      try {
        await this.db.collection('AESearchDatabase').createIndex({ productId: 1 }, { unique: true });
      } catch (e) { /* Index exists */ }
      
      try {
        await this.db.collection('AdhesivePDSDocumentMaster').createIndex({ documentId: 1 }, { unique: true });
      } catch (e) { /* Index exists */ }
      
      // Load data
      await this.loadProducts();
      await this.loadDocuments();
      await this.createRelationships();
      
      // Generate report
      await this.generateReport();
      
      console.log('\n✅ Data Conversion Complete!');
      
    } catch (error) {
      console.error('❌ Conversion failed:', error);
    } finally {
      await this.client.close();
    }
  }
}

// Run the converter
const converter = new DataConverter();
converter.run().catch(console.error);