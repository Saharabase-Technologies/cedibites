/**
 * lib/api/mocks/inventory.mock.ts
 *
 * CediBites IMS mock data — derived directly from the real CediBites menu.
 *
 * Menu covered:
 *   Main Delights:  Jollof, Fried Rice, Noodles, Banku + Tilapia
 *   Meat Bites:     Drumsticks (Special Crunch / Juicy Fried), Rotisserie Grilled
 *   Combos:         3-drum combos, 7-drum + Kɔkɔɔ combos, Full chicken combos
 *   Soft Bites:     Cedi Wraps (Chicken / Beef / Mix)
 *   Free side:      Coleslaw
 *
 * Every inventory item maps to at least one recipe ingredient below.
 * Consumed by services when NEXT_PUBLIC_IMS_MOCK=true.
 */

import type {
  InventoryUnit,
  InventoryCategory,
  InventorySupplier,
  InventoryLocation,
  InventoryItem,
  InventoryRecipe,
  InventoryDashboardStats,
  InventoryDashboardAlert,
  InventoryTransfer,
  InventorySettings,
  ImsStaffAssignment,
} from '@/types/inventory';

// ─── Units ────────────────────────────────────────────────────────────────────

export const MOCK_UNITS: InventoryUnit[] = [
  { id: 1, code: 'kg', name: 'Kilogram', symbol: 'kg', dimension: 'mass',   is_base_unit: true,  is_active: true, created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z' },
  { id: 2, code: 'g',  name: 'Gram',     symbol: 'g',  dimension: 'mass',   is_base_unit: false, is_active: true, created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z' },
  { id: 3, code: 'l',  name: 'Litre',    symbol: 'L',  dimension: 'volume', is_base_unit: true,  is_active: true, created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z' },
  { id: 4, code: 'ml', name: 'Millilitre', symbol: 'mL', dimension: 'volume', is_base_unit: false, is_active: true, created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z' },
  { id: 5, code: 'pc', name: 'Piece',    symbol: 'pc', dimension: 'count',  is_base_unit: true,  is_active: true, created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z' },
  { id: 6, code: 'bag', name: 'Bag',     symbol: 'bag', dimension: 'count', is_base_unit: false, is_active: true, created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z' },
  { id: 7, code: 'ctn', name: 'Carton',  symbol: 'ctn', dimension: 'count', is_base_unit: false, is_active: true, created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z' },
  { id: 8, code: 'btl', name: 'Bottle',  symbol: 'btl', dimension: 'count', is_base_unit: false, is_active: true, created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z' },
];

// ─── Categories ───────────────────────────────────────────────────────────────

export const MOCK_CATEGORIES: InventoryCategory[] = [
  { id: 1,  parent_id: null, name: 'Proteins',       slug: 'proteins',       sort_order: 1, is_active: true, created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z' },
  { id: 2,  parent_id: null, name: 'Grains & Starch', slug: 'grains-starch',  sort_order: 2, is_active: true, created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z' },
  { id: 3,  parent_id: null, name: 'Vegetables',      slug: 'vegetables',     sort_order: 3, is_active: true, created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z' },
  { id: 4,  parent_id: null, name: 'Oils & Fats',     slug: 'oils-fats',      sort_order: 4, is_active: true, created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z' },
  { id: 5,  parent_id: null, name: 'Spices & Herbs',  slug: 'spices-herbs',   sort_order: 5, is_active: true, created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z' },
  { id: 6,  parent_id: null, name: 'Beverages',       slug: 'beverages',      sort_order: 6, is_active: true, created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z' },
  { id: 7,  parent_id: null, name: 'Packaging',       slug: 'packaging',      sort_order: 7, is_active: true, created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z' },
  { id: 8,  parent_id: null, name: 'Condiments',      slug: 'condiments',     sort_order: 8, is_active: true, created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z' },
];

// ─── Suppliers ────────────────────────────────────────────────────────────────

export const MOCK_SUPPLIERS: InventorySupplier[] = [
  { id: 1, code: 'SUP-001', name: 'Accra Meat Depot',      contact_name: 'Kwame Asante',    phone: '0244111222', email: 'kwame@accrameat.gh',   address: 'Agbogbloshie, Accra',        payment_terms_days: 7,  notes: null, is_active: true, created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z' },
  { id: 2, code: 'SUP-002', name: 'Tema Port Fresh Veg',   contact_name: 'Ama Owusu',       phone: '0208334455', email: 'ama@temafresh.gh',      address: 'Tema Community 5',           payment_terms_days: 0,  notes: null, is_active: true, created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z' },
  { id: 3, code: 'SUP-003', name: 'Golden Fry Oils Ltd',   contact_name: 'Emmanuel Boateng',phone: '0302876543', email: 'info@goldenfry.gh',     address: 'Spintex Rd, Accra',          payment_terms_days: 14, notes: null, is_active: true, created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z' },
  { id: 4, code: 'SUP-004', name: 'CoolDrinks GH Dist.',   contact_name: 'Kofi Mensah',     phone: '0277654321', email: 'kofi@cooldrinks.gh',    address: 'Achimota, Accra',            payment_terms_days: 7,  notes: null, is_active: true, created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z' },
  { id: 5, code: 'SUP-005', name: 'North Rice Growers Co.',contact_name: 'Abdulai Ibrahim', phone: '0244789012', email: 'abdulai@northrice.gh',  address: 'Tamale, Northern Region',    payment_terms_days: 30, notes: null, is_active: true, created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z' },
];

// ─── Locations ────────────────────────────────────────────────────────────────

export const MOCK_LOCATIONS: InventoryLocation[] = [
  { id: 1, code: 'WH-001', name: 'Mother Kitchen — Spintex', type: 'warehouse', branch_id: null, branch: null, address: 'Spintex Rd, Accra, GH', is_active: true, created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z' },
  { id: 2, code: 'SK-001', name: 'Osu Branch',               type: 'satellite', branch_id: 1,    branch: { id: 1, name: 'Osu',     area: 'Osu'     }, address: 'Oxford St, Osu, Accra',     is_active: true, created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z' },
  { id: 3, code: 'SK-002', name: 'Accra Mall Branch',        type: 'satellite', branch_id: 2,    branch: { id: 2, name: 'Accra Mall', area: 'Tetteh Quarshie' }, address: 'Accra Mall, Ring Rd', is_active: true, created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z' },
  { id: 4, code: 'SK-003', name: 'Tema Branch',              type: 'satellite', branch_id: 3,    branch: { id: 3, name: 'Tema',    area: 'Tema'    }, address: 'Community 1, Tema',          is_active: true, created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z' },
  { id: 5, code: 'SK-004', name: 'Achimota Branch',          type: 'satellite', branch_id: 4,    branch: { id: 4, name: 'Achimota', area: 'Achimota' }, address: 'Achimota, Accra',          is_active: false, created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z' },
];

// ─── Items ────────────────────────────────────────────────────────────────────

export const MOCK_ITEMS: InventoryItem[] = [
  { id: 1,  sku: 'ITM-000001', name: 'Chicken Thighs (Bone-in)',  description: 'Fresh bone-in thighs, 1kg packs',    category_id: 1, category: { id: 1, name: 'Proteins', slug: 'proteins' },      base_unit_id: 1, base_unit: { id: 1, name: 'Kilogram', symbol: 'kg' }, default_supplier_id: 1, default_supplier: { id: 1, name: 'Accra Meat Depot' },    storage_type: 'cold',    is_consumable: true,  expiry_tracked: true,  reorder_level: 20,  min_threshold: 8,   weighted_avg_cost: 42.50, is_active: true,  created_at: '2026-02-01T00:00:00Z', updated_at: '2026-05-01T00:00:00Z' },
  { id: 2,  sku: 'ITM-000002', name: 'Chicken Breast (Boneless)', description: null,                                 category_id: 1, category: { id: 1, name: 'Proteins', slug: 'proteins' },      base_unit_id: 1, base_unit: { id: 1, name: 'Kilogram', symbol: 'kg' }, default_supplier_id: 1, default_supplier: { id: 1, name: 'Accra Meat Depot' },    storage_type: 'cold',    is_consumable: true,  expiry_tracked: true,  reorder_level: 15,  min_threshold: 5,   weighted_avg_cost: 58.00, is_active: true,  created_at: '2026-02-01T00:00:00Z', updated_at: '2026-05-01T00:00:00Z' },
  { id: 3,  sku: 'ITM-000003', name: 'Tilapia (Fresh)',           description: 'Whole tilapia from Volta River',    category_id: 1, category: { id: 1, name: 'Proteins', slug: 'proteins' },      base_unit_id: 1, base_unit: { id: 1, name: 'Kilogram', symbol: 'kg' }, default_supplier_id: 1, default_supplier: { id: 1, name: 'Accra Meat Depot' },    storage_type: 'cold',    is_consumable: true,  expiry_tracked: true,  reorder_level: 10,  min_threshold: 3,   weighted_avg_cost: 35.00, is_active: true,  created_at: '2026-02-01T00:00:00Z', updated_at: '2026-05-01T00:00:00Z' },
  { id: 4,  sku: 'ITM-000004', name: 'Basmati Rice',              description: '5kg imported basmati',              category_id: 2, category: { id: 2, name: 'Grains & Starch', slug: 'grains-starch' }, base_unit_id: 1, base_unit: { id: 1, name: 'Kilogram', symbol: 'kg' }, default_supplier_id: 5, default_supplier: { id: 5, name: 'North Rice Growers Co.' }, storage_type: 'dry', is_consumable: true, expiry_tracked: false, reorder_level: 50, min_threshold: 20, weighted_avg_cost: 8.80, is_active: true, created_at: '2026-02-01T00:00:00Z', updated_at: '2026-05-01T00:00:00Z' },
  { id: 5,  sku: 'ITM-000005', name: 'Jollof Rice Parboiled',     description: 'Local parboiled for jollof base',   category_id: 2, category: { id: 2, name: 'Grains & Starch', slug: 'grains-starch' }, base_unit_id: 1, base_unit: { id: 1, name: 'Kilogram', symbol: 'kg' }, default_supplier_id: 5, default_supplier: { id: 5, name: 'North Rice Growers Co.' }, storage_type: 'dry', is_consumable: true, expiry_tracked: false, reorder_level: 80, min_threshold: 30, weighted_avg_cost: 6.20, is_active: true, created_at: '2026-02-01T00:00:00Z', updated_at: '2026-05-01T00:00:00Z' },
  { id: 6,  sku: 'ITM-000006', name: 'Tomatoes (Fresh)',          description: null,                                 category_id: 3, category: { id: 3, name: 'Vegetables', slug: 'vegetables' },    base_unit_id: 1, base_unit: { id: 1, name: 'Kilogram', symbol: 'kg' }, default_supplier_id: 2, default_supplier: { id: 2, name: 'Tema Port Fresh Veg' }, storage_type: 'ambient', is_consumable: true, expiry_tracked: true, reorder_level: 15, min_threshold: 5, weighted_avg_cost: 4.50, is_active: true, created_at: '2026-02-01T00:00:00Z', updated_at: '2026-05-01T00:00:00Z' },
  { id: 7,  sku: 'ITM-000007', name: 'Onions (Large)',            description: null,                                 category_id: 3, category: { id: 3, name: 'Vegetables', slug: 'vegetables' },    base_unit_id: 1, base_unit: { id: 1, name: 'Kilogram', symbol: 'kg' }, default_supplier_id: 2, default_supplier: { id: 2, name: 'Tema Port Fresh Veg' }, storage_type: 'ambient', is_consumable: true, expiry_tracked: false, reorder_level: 20, min_threshold: 7, weighted_avg_cost: 3.80, is_active: true, created_at: '2026-02-01T00:00:00Z', updated_at: '2026-05-01T00:00:00Z' },
  { id: 8,  sku: 'ITM-000008', name: 'Red Bell Pepper',           description: null,                                 category_id: 3, category: { id: 3, name: 'Vegetables', slug: 'vegetables' },    base_unit_id: 1, base_unit: { id: 1, name: 'Kilogram', symbol: 'kg' }, default_supplier_id: 2, default_supplier: { id: 2, name: 'Tema Port Fresh Veg' }, storage_type: 'ambient', is_consumable: true, expiry_tracked: true, reorder_level: 5, min_threshold: 2, weighted_avg_cost: 12.00, is_active: true, created_at: '2026-02-01T00:00:00Z', updated_at: '2026-05-01T00:00:00Z' },
  { id: 9,  sku: 'ITM-000009', name: 'Palm Oil',                  description: 'Unrefined red palm oil',            category_id: 4, category: { id: 4, name: 'Oils & Fats', slug: 'oils-fats' },    base_unit_id: 3, base_unit: { id: 3, name: 'Litre', symbol: 'L' },     default_supplier_id: 3, default_supplier: { id: 3, name: 'Golden Fry Oils Ltd' }, storage_type: 'ambient', is_consumable: true, expiry_tracked: false, reorder_level: 20, min_threshold: 5, weighted_avg_cost: 18.00, is_active: true, created_at: '2026-02-01T00:00:00Z', updated_at: '2026-05-01T00:00:00Z' },
  { id: 10, sku: 'ITM-000010', name: 'Soyabean Oil',              description: '5L refined cooking oil',            category_id: 4, category: { id: 4, name: 'Oils & Fats', slug: 'oils-fats' },    base_unit_id: 3, base_unit: { id: 3, name: 'Litre', symbol: 'L' },     default_supplier_id: 3, default_supplier: { id: 3, name: 'Golden Fry Oils Ltd' }, storage_type: 'ambient', is_consumable: true, expiry_tracked: false, reorder_level: 30, min_threshold: 10, weighted_avg_cost: 14.50, is_active: true, created_at: '2026-02-01T00:00:00Z', updated_at: '2026-05-01T00:00:00Z' },
  { id: 11, sku: 'ITM-000011', name: 'Curry Powder',              description: null,                                 category_id: 5, category: { id: 5, name: 'Spices & Herbs', slug: 'spices-herbs' }, base_unit_id: 1, base_unit: { id: 1, name: 'Kilogram', symbol: 'kg' }, default_supplier_id: null, default_supplier: null, storage_type: 'dry', is_consumable: true, expiry_tracked: false, reorder_level: 3, min_threshold: 1, weighted_avg_cost: 22.00, is_active: true, created_at: '2026-02-01T00:00:00Z', updated_at: '2026-05-01T00:00:00Z' },
  { id: 12, sku: 'ITM-000012', name: 'Nutmeg (Ground)',           description: null,                                 category_id: 5, category: { id: 5, name: 'Spices & Herbs', slug: 'spices-herbs' }, base_unit_id: 2, base_unit: { id: 2, name: 'Gram', symbol: 'g' },       default_supplier_id: null, default_supplier: null, storage_type: 'dry', is_consumable: true, expiry_tracked: false, reorder_level: 500, min_threshold: 100, weighted_avg_cost: 0.045, is_active: true, created_at: '2026-02-01T00:00:00Z', updated_at: '2026-05-01T00:00:00Z' },
  { id: 13, sku: 'ITM-000013', name: 'Malta Guinness',            description: 'Malta Guinness 330mL cans × 24',   category_id: 6, category: { id: 6, name: 'Beverages', slug: 'beverages' },      base_unit_id: 7, base_unit: { id: 7, name: 'Carton', symbol: 'ctn' }, default_supplier_id: 4, default_supplier: { id: 4, name: 'CoolDrinks GH Dist.' }, storage_type: 'ambient', is_consumable: true, expiry_tracked: true, reorder_level: 10, min_threshold: 3, weighted_avg_cost: 85.00, is_active: true, created_at: '2026-02-01T00:00:00Z', updated_at: '2026-05-01T00:00:00Z' },
  { id: 14, sku: 'ITM-000014', name: 'Bottled Water (500mL)',     description: 'Voltic / Refresh 500mL crate × 24',category_id: 6, category: { id: 6, name: 'Beverages', slug: 'beverages' },      base_unit_id: 7, base_unit: { id: 7, name: 'Carton', symbol: 'ctn' }, default_supplier_id: 4, default_supplier: { id: 4, name: 'CoolDrinks GH Dist.' }, storage_type: 'ambient', is_consumable: true, expiry_tracked: true, reorder_level: 15, min_threshold: 5, weighted_avg_cost: 28.00, is_active: true, created_at: '2026-02-01T00:00:00Z', updated_at: '2026-05-01T00:00:00Z' },
  { id: 15, sku: 'ITM-000015', name: 'Takeaway Boxes (Large)',    description: '500pc per carton',                  category_id: 7, category: { id: 7, name: 'Packaging', slug: 'packaging' },      base_unit_id: 7, base_unit: { id: 7, name: 'Carton', symbol: 'ctn' }, default_supplier_id: null, default_supplier: null, storage_type: 'dry', is_consumable: true, expiry_tracked: false, reorder_level: 5, min_threshold: 2, weighted_avg_cost: 95.00, is_active: true, created_at: '2026-02-01T00:00:00Z', updated_at: '2026-05-01T00:00:00Z' },
  { id: 16, sku: 'ITM-000016', name: 'Scotch Bonnet Pepper',      description: 'Fresh whole, per kg',               category_id: 3, category: { id: 3, name: 'Vegetables', slug: 'vegetables' },    base_unit_id: 1, base_unit: { id: 1, name: 'Kilogram', symbol: 'kg' }, default_supplier_id: 2, default_supplier: { id: 2, name: 'Tema Port Fresh Veg' }, storage_type: 'ambient', is_consumable: true, expiry_tracked: true, reorder_level: 3, min_threshold: 1, weighted_avg_cost: 16.50, is_active: true, created_at: '2026-02-01T00:00:00Z', updated_at: '2026-05-01T00:00:00Z' },
  { id: 17, sku: 'ITM-000017', name: 'Vegetable Shortening',      description: null,                                 category_id: 4, category: { id: 4, name: 'Oils & Fats', slug: 'oils-fats' },    base_unit_id: 1, base_unit: { id: 1, name: 'Kilogram', symbol: 'kg' }, default_supplier_id: 3, default_supplier: { id: 3, name: 'Golden Fry Oils Ltd' }, storage_type: 'ambient', is_consumable: true, expiry_tracked: false, reorder_level: 10, min_threshold: 3, weighted_avg_cost: 11.20, is_active: false, created_at: '2026-02-01T00:00:00Z', updated_at: '2026-04-01T00:00:00Z' },
  // ---- added for Noodles / Banku / Coleslaw / Cedi Wraps ----
  { id: 18, sku: 'ITM-000018', name: 'Indomie Noodles',           description: 'Chicken flavour, 70g × 40 per carton', category_id: 2, category: { id: 2, name: 'Grains & Starch', slug: 'grains-starch' }, base_unit_id: 7, base_unit: { id: 7, name: 'Carton', symbol: 'ctn' }, default_supplier_id: null, default_supplier: null, storage_type: 'dry', is_consumable: true, expiry_tracked: true, reorder_level: 10, min_threshold: 3, weighted_avg_cost: 65.00, is_active: true, created_at: '2026-02-01T00:00:00Z', updated_at: '2026-05-01T00:00:00Z' },
  { id: 19, sku: 'ITM-000019', name: 'Corn Dough (Fermented)',    description: 'Ready-fermented banku corn dough, 5kg', category_id: 2, category: { id: 2, name: 'Grains & Starch', slug: 'grains-starch' }, base_unit_id: 1, base_unit: { id: 1, name: 'Kilogram', symbol: 'kg' }, default_supplier_id: 2, default_supplier: { id: 2, name: 'Tema Port Fresh Veg' }, storage_type: 'cold', is_consumable: true, expiry_tracked: true, reorder_level: 10, min_threshold: 3, weighted_avg_cost: 9.50, is_active: true, created_at: '2026-02-01T00:00:00Z', updated_at: '2026-05-01T00:00:00Z' },
  { id: 20, sku: 'ITM-000020', name: 'Cassava Dough',             description: 'Fermented cassava for banku blend',   category_id: 2, category: { id: 2, name: 'Grains & Starch', slug: 'grains-starch' }, base_unit_id: 1, base_unit: { id: 1, name: 'Kilogram', symbol: 'kg' }, default_supplier_id: 2, default_supplier: { id: 2, name: 'Tema Port Fresh Veg' }, storage_type: 'cold', is_consumable: true, expiry_tracked: true, reorder_level: 5, min_threshold: 2, weighted_avg_cost: 7.00, is_active: true, created_at: '2026-02-01T00:00:00Z', updated_at: '2026-05-01T00:00:00Z' },
  { id: 21, sku: 'ITM-000021', name: 'Cabbage (White)',           description: null,                                 category_id: 3, category: { id: 3, name: 'Vegetables', slug: 'vegetables' },    base_unit_id: 1, base_unit: { id: 1, name: 'Kilogram', symbol: 'kg' }, default_supplier_id: 2, default_supplier: { id: 2, name: 'Tema Port Fresh Veg' }, storage_type: 'cold', is_consumable: true, expiry_tracked: true, reorder_level: 10, min_threshold: 3, weighted_avg_cost: 3.20, is_active: true, created_at: '2026-02-01T00:00:00Z', updated_at: '2026-05-01T00:00:00Z' },
  { id: 22, sku: 'ITM-000022', name: 'Carrots',                   description: null,                                 category_id: 3, category: { id: 3, name: 'Vegetables', slug: 'vegetables' },    base_unit_id: 1, base_unit: { id: 1, name: 'Kilogram', symbol: 'kg' }, default_supplier_id: 2, default_supplier: { id: 2, name: 'Tema Port Fresh Veg' }, storage_type: 'cold', is_consumable: true, expiry_tracked: true, reorder_level: 5, min_threshold: 2, weighted_avg_cost: 4.00, is_active: true, created_at: '2026-02-01T00:00:00Z', updated_at: '2026-05-01T00:00:00Z' },
  { id: 23, sku: 'ITM-000023', name: 'Spring Onions',             description: null,                                 category_id: 3, category: { id: 3, name: 'Vegetables', slug: 'vegetables' },    base_unit_id: 1, base_unit: { id: 1, name: 'Kilogram', symbol: 'kg' }, default_supplier_id: 2, default_supplier: { id: 2, name: 'Tema Port Fresh Veg' }, storage_type: 'cold', is_consumable: true, expiry_tracked: true, reorder_level: 3, min_threshold: 1, weighted_avg_cost: 6.50, is_active: true, created_at: '2026-02-01T00:00:00Z', updated_at: '2026-05-01T00:00:00Z' },
  { id: 24, sku: 'ITM-000024', name: 'Mayonnaise',                description: '3L tubs for coleslaw dressing',     category_id: 8, category: { id: 8, name: 'Condiments', slug: 'condiments' },    base_unit_id: 3, base_unit: { id: 3, name: 'Litre', symbol: 'L' },     default_supplier_id: null, default_supplier: null, storage_type: 'cold', is_consumable: true, expiry_tracked: true, reorder_level: 6, min_threshold: 2, weighted_avg_cost: 32.00, is_active: true, created_at: '2026-02-01T00:00:00Z', updated_at: '2026-05-01T00:00:00Z' },
  { id: 25, sku: 'ITM-000025', name: 'Flour Tortilla Wraps (10")', description: '100pc per bag — Cedi Wraps',       category_id: 2, category: { id: 2, name: 'Grains & Starch', slug: 'grains-starch' }, base_unit_id: 6, base_unit: { id: 6, name: 'Bag', symbol: 'bag' }, default_supplier_id: null, default_supplier: null, storage_type: 'dry', is_consumable: true, expiry_tracked: true, reorder_level: 5, min_threshold: 2, weighted_avg_cost: 48.00, is_active: true, created_at: '2026-02-01T00:00:00Z', updated_at: '2026-05-01T00:00:00Z' },
  { id: 26, sku: 'ITM-000026', name: 'Beef Mince (Fresh)',        description: 'Minced beef for wrap filling',     category_id: 1, category: { id: 1, name: 'Proteins', slug: 'proteins' },      base_unit_id: 1, base_unit: { id: 1, name: 'Kilogram', symbol: 'kg' }, default_supplier_id: 1, default_supplier: { id: 1, name: 'Accra Meat Depot' }, storage_type: 'cold', is_consumable: true, expiry_tracked: true, reorder_level: 5, min_threshold: 2, weighted_avg_cost: 65.00, is_active: true, created_at: '2026-02-01T00:00:00Z', updated_at: '2026-05-01T00:00:00Z' },
  { id: 27, sku: 'ITM-000027', name: 'Garlic',                   description: null,                                 category_id: 5, category: { id: 5, name: 'Spices & Herbs', slug: 'spices-herbs' }, base_unit_id: 1, base_unit: { id: 1, name: 'Kilogram', symbol: 'kg' }, default_supplier_id: 2, default_supplier: { id: 2, name: 'Tema Port Fresh Veg' }, storage_type: 'ambient', is_consumable: true, expiry_tracked: false, reorder_level: 2, min_threshold: 0.5, weighted_avg_cost: 25.00, is_active: true, created_at: '2026-02-01T00:00:00Z', updated_at: '2026-05-01T00:00:00Z' },
  { id: 28, sku: 'ITM-000028', name: 'Ginger (Fresh)',           description: null,                                 category_id: 5, category: { id: 5, name: 'Spices & Herbs', slug: 'spices-herbs' }, base_unit_id: 1, base_unit: { id: 1, name: 'Kilogram', symbol: 'kg' }, default_supplier_id: 2, default_supplier: { id: 2, name: 'Tema Port Fresh Veg' }, storage_type: 'ambient', is_consumable: true, expiry_tracked: false, reorder_level: 1, min_threshold: 0.3, weighted_avg_cost: 20.00, is_active: true, created_at: '2026-02-01T00:00:00Z', updated_at: '2026-05-01T00:00:00Z' },
  { id: 29, sku: 'ITM-000029', name: 'Mixed Vegetables (Frozen)', description: 'Peas, sweetcorn, diced carrots mix',category_id: 3, category: { id: 3, name: 'Vegetables', slug: 'vegetables' },    base_unit_id: 1, base_unit: { id: 1, name: 'Kilogram', symbol: 'kg' }, default_supplier_id: 2, default_supplier: { id: 2, name: 'Tema Port Fresh Veg' }, storage_type: 'frozen', is_consumable: true, expiry_tracked: true, reorder_level: 15, min_threshold: 5, weighted_avg_cost: 19.50, is_active: true, created_at: '2026-02-01T00:00:00Z', updated_at: '2026-05-01T00:00:00Z' },
  { id: 30, sku: 'ITM-000030', name: 'Seasoning Cubes (Maggi)',  description: '100-cube pack',                     category_id: 5, category: { id: 5, name: 'Spices & Herbs', slug: 'spices-herbs' }, base_unit_id: 5, base_unit: { id: 5, name: 'Piece', symbol: 'pc' }, default_supplier_id: null, default_supplier: null, storage_type: 'dry', is_consumable: true, expiry_tracked: false, reorder_level: 10, min_threshold: 3, weighted_avg_cost: 0.35, is_active: true, created_at: '2026-02-01T00:00:00Z', updated_at: '2026-05-01T00:00:00Z' },
  { id: 31, sku: 'ITM-000031', name: 'Eggs',                     description: null,                                 category_id: 1, category: { id: 1, name: 'Proteins', slug: 'proteins' },      base_unit_id: 5, base_unit: { id: 5, name: 'Piece', symbol: 'pc' }, default_supplier_id: null, default_supplier: null, storage_type: 'cold', is_consumable: true, expiry_tracked: true, reorder_level: 60, min_threshold: 12, weighted_avg_cost: 1.50, is_active: true, created_at: '2026-02-01T00:00:00Z', updated_at: '2026-05-01T00:00:00Z' },
  { id: 32, sku: 'ITM-000032', name: 'Whole Chicken',            description: 'Broiler whole bird ~1.4kg avg',     category_id: 1, category: { id: 1, name: 'Proteins', slug: 'proteins' },      base_unit_id: 5, base_unit: { id: 5, name: 'Piece', symbol: 'pc' }, default_supplier_id: 1, default_supplier: { id: 1, name: 'Accra Meat Depot' }, storage_type: 'frozen', is_consumable: true, expiry_tracked: true, reorder_level: 10, min_threshold: 4, weighted_avg_cost: 95.00, is_active: true, created_at: '2026-02-01T00:00:00Z', updated_at: '2026-05-01T00:00:00Z' },
  { id: 33, sku: 'ITM-000033', name: 'Kpokpoi (Corn Kenkey)',    description: 'Fermented corn kenkey as kɔkɔɔ side', category_id: 2, category: { id: 2, name: 'Grains & Starch', slug: 'grains-starch' }, base_unit_id: 5, base_unit: { id: 5, name: 'Piece', symbol: 'pc' }, default_supplier_id: 2, default_supplier: { id: 2, name: 'Tema Port Fresh Veg' }, storage_type: 'ambient', is_consumable: true, expiry_tracked: true, reorder_level: 20, min_threshold: 5, weighted_avg_cost: 5.00, is_active: true, created_at: '2026-02-01T00:00:00Z', updated_at: '2026-05-01T00:00:00Z' },
];

// ─── Dashboard stats ──────────────────────────────────────────────────────────

export const MOCK_DASHBOARD_STATS: InventoryDashboardStats = {
  low_stock_count:                3,
  pending_requisitions_count:     2,
  pending_wastage_approvals_count: 1,
  todays_transfers_count:         4,
  todays_transfers_value:         2450.00,
  todays_wastage_value:           340.00,
  wastage_threshold:              500.00,
  unresolved_disputes_count:      0,
  missed_closing_entries_count:   1,
};

export const MOCK_DASHBOARD_ALERTS: InventoryDashboardAlert[] = [
  {
    id: 'low-stock',
    type: 'error',
    title: '3 items below threshold',
    description: 'Scotch Bonnet Pepper, Tilapia (Fresh), Red Bell Pepper need restocking.',
    href: '/inventory/catalog/items?filter=low_stock',
    action_label: 'View items',
    count: 3,
  },
  {
    id: 'missed-closing',
    type: 'warning',
    title: 'Missing yesterday\'s closing entry',
    description: 'Osu Branch has not submitted closing stock for 4 May 2026.',
    href: '/inventory/daily-closing',
    action_label: 'Enter now',
    count: 1,
  },
  {
    id: 'pending-requisitions',
    type: 'warning',
    title: '2 requisitions awaiting approval',
    description: 'Accra Mall and Tema branches are waiting on today\'s stock.',
    href: '/inventory/requisitions?status=submitted',
    action_label: 'Review',
    count: 2,
  },
  {
    id: 'wastage-approval',
    type: 'info',
    title: '1 wastage event needs your sign-off',
    description: 'Osu Branch reported ₵340 wastage — above the ₵500 threshold requires warehouse review.',
    href: '/inventory/wastage?status=pending_approval',
    action_label: 'Approve',
    count: 1,
  },
];

// ─── Sample recent transfers ──────────────────────────────────────────────────

export const MOCK_RECENT_TRANSFERS: InventoryTransfer[] = [
  {
    id: 1,
    reference: 'TRF-2026-00041',
    source_location_id: 1,
    source_location: { id: 1, name: 'Mother Kitchen — Spintex', type: 'warehouse' },
    destination_location_id: 2,
    destination_location: { id: 2, name: 'Osu Branch', type: 'satellite' },
    status: 'received',
    notes: null,
    requested_by_id: 5,
    requested_by: { id: 5, name: 'Ama Boateng' },
    approved_by_id: 3,
    approved_by: { id: 3, name: 'Kofi Mensah' },
    parent_transfer_id: null,
    source_validation_overridden_by: null,
    lines: [],
    total_value: 680.00,
    created_at: '2026-05-05T06:30:00Z',
    updated_at: '2026-05-05T09:15:00Z',
  },
  {
    id: 2,
    reference: 'TRF-2026-00042',
    source_location_id: 1,
    source_location: { id: 1, name: 'Mother Kitchen — Spintex', type: 'warehouse' },
    destination_location_id: 3,
    destination_location: { id: 3, name: 'Accra Mall Branch', type: 'satellite' },
    status: 'sent',
    notes: 'Supplementary — weekend rush',
    requested_by_id: 6,
    requested_by: { id: 6, name: 'Abena Frimpong' },
    approved_by_id: 3,
    approved_by: { id: 3, name: 'Kofi Mensah' },
    parent_transfer_id: null,
    source_validation_overridden_by: null,
    lines: [],
    total_value: 1240.00,
    created_at: '2026-05-05T07:00:00Z',
    updated_at: '2026-05-05T10:45:00Z',
  },
];

// ─── Recipes (BOMs) ────────────────────────────────────────────────────────────
//
// One recipe per CediBites menu item (global default, no branch override).
// Quantities are per-serving yields that drive the sales-deduction engine on
// OrderCompleted.  Adjust to real kitchen measurements before going live.
//
// menu_item_id values MUST match the seeded menu_items.id rows in production.
// Use sequential placeholders here; the mock layer does not validate FKs.

export const MOCK_RECIPES: InventoryRecipe[] = [
  // ── Jollof (serves 1 portion) ─────────────────────────────────────────────
  {
    id: 1, menu_item_id: 1, menu_item: { id: 1, name: 'Jollof' },
    branch_id: null, is_default: true, status: 'locked', version: 1,
    locked_by_id: 3, locked_by: { id: 3, name: 'Kofi Mensah' }, locked_at: '2026-03-01T00:00:00Z',
    created_at: '2026-02-15T00:00:00Z', updated_at: '2026-03-01T00:00:00Z',
    ingredients: [
      { id: 1,  item_id: 5,  item: { id: 5,  sku: 'ITM-000005', name: 'Jollof Rice Parboiled',  base_unit: { id: 1, symbol: 'kg' } }, quantity: 0.22, unit: { id: 1, symbol: 'kg' } },
      { id: 2,  item_id: 6,  item: { id: 6,  sku: 'ITM-000006', name: 'Tomatoes (Fresh)',         base_unit: { id: 1, symbol: 'kg' } }, quantity: 0.08, unit: { id: 1, symbol: 'kg' } },
      { id: 3,  item_id: 7,  item: { id: 7,  sku: 'ITM-000007', name: 'Onions (Large)',           base_unit: { id: 1, symbol: 'kg' } }, quantity: 0.04, unit: { id: 1, symbol: 'kg' } },
      { id: 4,  item_id: 16, item: { id: 16, sku: 'ITM-000016', name: 'Scotch Bonnet Pepper',     base_unit: { id: 1, symbol: 'kg' } }, quantity: 0.01, unit: { id: 1, symbol: 'kg' } },
      { id: 5,  item_id: 9,  item: { id: 9,  sku: 'ITM-000009', name: 'Palm Oil',                 base_unit: { id: 3, symbol: 'L'  } }, quantity: 0.03, unit: { id: 3, symbol: 'L'  } },
      { id: 6,  item_id: 30, item: { id: 30, sku: 'ITM-000030', name: 'Seasoning Cubes (Maggi)',  base_unit: { id: 5, symbol: 'pc' } }, quantity: 2,    unit: { id: 5, symbol: 'pc' } },
      { id: 7,  item_id: 21, item: { id: 21, sku: 'ITM-000021', name: 'Cabbage (White)',           base_unit: { id: 1, symbol: 'kg' } }, quantity: 0.05, unit: { id: 1, symbol: 'kg' } },
      { id: 8,  item_id: 24, item: { id: 24, sku: 'ITM-000024', name: 'Mayonnaise',               base_unit: { id: 3, symbol: 'L'  } }, quantity: 0.02, unit: { id: 3, symbol: 'L'  } },
    ],
  },

  // ── Fried Rice ────────────────────────────────────────────────────────────
  {
    id: 2, menu_item_id: 2, menu_item: { id: 2, name: 'Fried Rice' },
    branch_id: null, is_default: true, status: 'locked', version: 1,
    locked_by_id: 3, locked_by: { id: 3, name: 'Kofi Mensah' }, locked_at: '2026-03-01T00:00:00Z',
    created_at: '2026-02-15T00:00:00Z', updated_at: '2026-03-01T00:00:00Z',
    ingredients: [
      { id: 9,  item_id: 4,  item: { id: 4,  sku: 'ITM-000004', name: 'Basmati Rice',             base_unit: { id: 1, symbol: 'kg' } }, quantity: 0.20, unit: { id: 1, symbol: 'kg' } },
      { id: 10, item_id: 31, item: { id: 31, sku: 'ITM-000031', name: 'Eggs',                     base_unit: { id: 5, symbol: 'pc' } }, quantity: 1,    unit: { id: 5, symbol: 'pc' } },
      { id: 11, item_id: 29, item: { id: 29, sku: 'ITM-000029', name: 'Mixed Vegetables (Frozen)',base_unit: { id: 1, symbol: 'kg' } }, quantity: 0.08, unit: { id: 1, symbol: 'kg' } },
      { id: 12, item_id: 23, item: { id: 23, sku: 'ITM-000023', name: 'Spring Onions',            base_unit: { id: 1, symbol: 'kg' } }, quantity: 0.02, unit: { id: 1, symbol: 'kg' } },
      { id: 13, item_id: 10, item: { id: 10, sku: 'ITM-000010', name: 'Soyabean Oil',             base_unit: { id: 3, symbol: 'L'  } }, quantity: 0.03, unit: { id: 3, symbol: 'L'  } },
      { id: 14, item_id: 30, item: { id: 30, sku: 'ITM-000030', name: 'Seasoning Cubes (Maggi)',  base_unit: { id: 5, symbol: 'pc' } }, quantity: 2,    unit: { id: 5, symbol: 'pc' } },
      { id: 15, item_id: 21, item: { id: 21, sku: 'ITM-000021', name: 'Cabbage (White)',           base_unit: { id: 1, symbol: 'kg' } }, quantity: 0.05, unit: { id: 1, symbol: 'kg' } },
      { id: 16, item_id: 24, item: { id: 24, sku: 'ITM-000024', name: 'Mayonnaise',               base_unit: { id: 3, symbol: 'L'  } }, quantity: 0.02, unit: { id: 3, symbol: 'L'  } },
    ],
  },

  // ── Noodles ───────────────────────────────────────────────────────────────
  {
    id: 3, menu_item_id: 3, menu_item: { id: 3, name: 'Noodles' },
    branch_id: null, is_default: true, status: 'locked', version: 1,
    locked_by_id: 3, locked_by: { id: 3, name: 'Kofi Mensah' }, locked_at: '2026-03-01T00:00:00Z',
    created_at: '2026-02-15T00:00:00Z', updated_at: '2026-03-01T00:00:00Z',
    ingredients: [
      { id: 17, item_id: 18, item: { id: 18, sku: 'ITM-000018', name: 'Indomie Noodles',          base_unit: { id: 7, symbol: 'ctn' } }, quantity: 2, unit: { id: 5, symbol: 'pc' } },
      { id: 18, item_id: 31, item: { id: 31, sku: 'ITM-000031', name: 'Eggs',                     base_unit: { id: 5, symbol: 'pc' } }, quantity: 1, unit: { id: 5, symbol: 'pc' } },
      { id: 19, item_id: 7,  item: { id: 7,  sku: 'ITM-000007', name: 'Onions (Large)',           base_unit: { id: 1, symbol: 'kg' } }, quantity: 0.03, unit: { id: 1, symbol: 'kg' } },
      { id: 20, item_id: 23, item: { id: 23, sku: 'ITM-000023', name: 'Spring Onions',            base_unit: { id: 1, symbol: 'kg' } }, quantity: 0.02, unit: { id: 1, symbol: 'kg' } },
      { id: 21, item_id: 10, item: { id: 10, sku: 'ITM-000010', name: 'Soyabean Oil',             base_unit: { id: 3, symbol: 'L'  } }, quantity: 0.02, unit: { id: 3, symbol: 'L'  } },
      { id: 22, item_id: 21, item: { id: 21, sku: 'ITM-000021', name: 'Cabbage (White)',           base_unit: { id: 1, symbol: 'kg' } }, quantity: 0.05, unit: { id: 1, symbol: 'kg' } },
      { id: 23, item_id: 24, item: { id: 24, sku: 'ITM-000024', name: 'Mayonnaise',               base_unit: { id: 3, symbol: 'L'  } }, quantity: 0.02, unit: { id: 3, symbol: 'L'  } },
    ],
  },

  // ── Banku + Grilled Tilapia ───────────────────────────────────────────────
  {
    id: 4, menu_item_id: 4, menu_item: { id: 4, name: 'Banku' },
    branch_id: null, is_default: true, status: 'locked', version: 1,
    locked_by_id: 3, locked_by: { id: 3, name: 'Kofi Mensah' }, locked_at: '2026-03-01T00:00:00Z',
    created_at: '2026-02-15T00:00:00Z', updated_at: '2026-03-01T00:00:00Z',
    ingredients: [
      { id: 24, item_id: 19, item: { id: 19, sku: 'ITM-000019', name: 'Corn Dough (Fermented)',   base_unit: { id: 1, symbol: 'kg' } }, quantity: 0.25, unit: { id: 1, symbol: 'kg' } },
      { id: 25, item_id: 20, item: { id: 20, sku: 'ITM-000020', name: 'Cassava Dough',            base_unit: { id: 1, symbol: 'kg' } }, quantity: 0.10, unit: { id: 1, symbol: 'kg' } },
      { id: 26, item_id: 3,  item: { id: 3,  sku: 'ITM-000003', name: 'Tilapia (Fresh)',          base_unit: { id: 1, symbol: 'kg' } }, quantity: 0.60, unit: { id: 1, symbol: 'kg' } },
      { id: 27, item_id: 6,  item: { id: 6,  sku: 'ITM-000006', name: 'Tomatoes (Fresh)',         base_unit: { id: 1, symbol: 'kg' } }, quantity: 0.05, unit: { id: 1, symbol: 'kg' } },
      { id: 28, item_id: 16, item: { id: 16, sku: 'ITM-000016', name: 'Scotch Bonnet Pepper',     base_unit: { id: 1, symbol: 'kg' } }, quantity: 0.01, unit: { id: 1, symbol: 'kg' } },
      { id: 29, item_id: 27, item: { id: 27, sku: 'ITM-000027', name: 'Garlic',                   base_unit: { id: 1, symbol: 'kg' } }, quantity: 0.01, unit: { id: 1, symbol: 'kg' } },
      { id: 30, item_id: 28, item: { id: 28, sku: 'ITM-000028', name: 'Ginger (Fresh)',           base_unit: { id: 1, symbol: 'kg' } }, quantity: 0.01, unit: { id: 1, symbol: 'kg' } },
    ],
  },

  // ── Drumsticks (per 5 pieces) ─────────────────────────────────────────────
  {
    id: 5, menu_item_id: 5, menu_item: { id: 5, name: 'Drumsticks' },
    branch_id: null, is_default: true, status: 'locked', version: 1,
    locked_by_id: 3, locked_by: { id: 3, name: 'Kofi Mensah' }, locked_at: '2026-03-01T00:00:00Z',
    created_at: '2026-02-15T00:00:00Z', updated_at: '2026-03-01T00:00:00Z',
    ingredients: [
      { id: 31, item_id: 1,  item: { id: 1,  sku: 'ITM-000001', name: 'Chicken Thighs (Bone-in)', base_unit: { id: 1, symbol: 'kg' } }, quantity: 0.60, unit: { id: 1, symbol: 'kg' } },
      { id: 32, item_id: 11, item: { id: 11, sku: 'ITM-000011', name: 'Curry Powder',             base_unit: { id: 1, symbol: 'kg' } }, quantity: 0.005, unit: { id: 1, symbol: 'kg' } },
      { id: 33, item_id: 27, item: { id: 27, sku: 'ITM-000027', name: 'Garlic',                   base_unit: { id: 1, symbol: 'kg' } }, quantity: 0.008, unit: { id: 1, symbol: 'kg' } },
      { id: 34, item_id: 28, item: { id: 28, sku: 'ITM-000028', name: 'Ginger (Fresh)',           base_unit: { id: 1, symbol: 'kg' } }, quantity: 0.005, unit: { id: 1, symbol: 'kg' } },
      { id: 35, item_id: 10, item: { id: 10, sku: 'ITM-000010', name: 'Soyabean Oil',             base_unit: { id: 3, symbol: 'L'  } }, quantity: 1.00, unit: { id: 3, symbol: 'L'  } },
      { id: 36, item_id: 30, item: { id: 30, sku: 'ITM-000030', name: 'Seasoning Cubes (Maggi)',  base_unit: { id: 5, symbol: 'pc' } }, quantity: 2,    unit: { id: 5, symbol: 'pc' } },
    ],
  },

  // ── Rotisserie Grilled (half bird) ────────────────────────────────────────
  {
    id: 6, menu_item_id: 6, menu_item: { id: 6, name: 'Rotisserie Grilled' },
    branch_id: null, is_default: true, status: 'locked', version: 1,
    locked_by_id: 3, locked_by: { id: 3, name: 'Kofi Mensah' }, locked_at: '2026-03-01T00:00:00Z',
    created_at: '2026-02-15T00:00:00Z', updated_at: '2026-03-01T00:00:00Z',
    ingredients: [
      { id: 37, item_id: 32, item: { id: 32, sku: 'ITM-000032', name: 'Whole Chicken',            base_unit: { id: 5, symbol: 'pc' } }, quantity: 0.5, unit: { id: 5, symbol: 'pc' } },
      { id: 38, item_id: 27, item: { id: 27, sku: 'ITM-000027', name: 'Garlic',                   base_unit: { id: 1, symbol: 'kg' } }, quantity: 0.01, unit: { id: 1, symbol: 'kg' } },
      { id: 39, item_id: 28, item: { id: 28, sku: 'ITM-000028', name: 'Ginger (Fresh)',           base_unit: { id: 1, symbol: 'kg' } }, quantity: 0.01, unit: { id: 1, symbol: 'kg' } },
      { id: 40, item_id: 11, item: { id: 11, sku: 'ITM-000011', name: 'Curry Powder',             base_unit: { id: 1, symbol: 'kg' } }, quantity: 0.008, unit: { id: 1, symbol: 'kg' } },
      { id: 41, item_id: 30, item: { id: 30, sku: 'ITM-000030', name: 'Seasoning Cubes (Maggi)',  base_unit: { id: 5, symbol: 'pc' } }, quantity: 3,    unit: { id: 5, symbol: 'pc' } },
    ],
  },

  // ── Cedi Wraps (Chicken) ──────────────────────────────────────────────────
  {
    id: 7, menu_item_id: 7, menu_item: { id: 7, name: 'Cedi Wraps' },
    branch_id: null, is_default: true, status: 'locked', version: 1,
    locked_by_id: 3, locked_by: { id: 3, name: 'Kofi Mensah' }, locked_at: '2026-03-01T00:00:00Z',
    created_at: '2026-02-15T00:00:00Z', updated_at: '2026-03-01T00:00:00Z',
    ingredients: [
      { id: 42, item_id: 25, item: { id: 25, sku: 'ITM-000025', name: 'Flour Tortilla Wraps (10")',base_unit: { id: 6, symbol: 'bag' } }, quantity: 1, unit: { id: 5, symbol: 'pc' } },
      { id: 43, item_id: 2,  item: { id: 2,  sku: 'ITM-000002', name: 'Chicken Breast (Boneless)', base_unit: { id: 1, symbol: 'kg' } }, quantity: 0.12, unit: { id: 1, symbol: 'kg' } },
      { id: 44, item_id: 21, item: { id: 21, sku: 'ITM-000021', name: 'Cabbage (White)',            base_unit: { id: 1, symbol: 'kg' } }, quantity: 0.04, unit: { id: 1, symbol: 'kg' } },
      { id: 45, item_id: 22, item: { id: 22, sku: 'ITM-000022', name: 'Carrots',                    base_unit: { id: 1, symbol: 'kg' } }, quantity: 0.02, unit: { id: 1, symbol: 'kg' } },
      { id: 46, item_id: 24, item: { id: 24, sku: 'ITM-000024', name: 'Mayonnaise',                 base_unit: { id: 3, symbol: 'L'  } }, quantity: 0.025, unit: { id: 3, symbol: 'L'  } },
    ],
  },
];

// ─── IMS Settings ─────────────────────────────────────────────────────────────

export const MOCK_IMS_SETTINGS: InventorySettings = {
  id: 1,
  location_id: null,
  wastage_threshold_amount: 500,
  updated_at: '2026-01-01T00:00:00Z',
};

// ─── IMS Staff Assignments ────────────────────────────────────────────────────

export const MOCK_IMS_STAFF: ImsStaffAssignment[] = [
  { id: 1, user_id: 3, name: 'Kofi Mensah',  email: 'kofi@cedibites.com',  phone: '0244111000', ims_role: 'warehouse_manager', assigned_at: '2026-01-15T00:00:00Z' },
  { id: 2, user_id: 7, name: 'Abena Darko',  email: 'abena@cedibites.com', phone: '0277222333', ims_role: 'purchasing_clerk',  assigned_at: '2026-02-01T00:00:00Z' },
];
