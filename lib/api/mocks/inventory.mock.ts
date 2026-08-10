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
  InventoryDashboardStats,
  InventoryDashboardAlert,
  InventoryTransfer,
  InventorySettings,
  ImsStaffAssignment,
  PurchaseOrder,
  Purchase,
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
  // Catch-all for cash / open-market buys where the exact vendor isn't a contracted supplier.
  // Record the specific vendor in the purchase's free-text `supplier_name`.
  { id: 6, code: 'SUP-MKT', name: 'Market / Cash Purchase', contact_name: null, phone: null, email: null, address: null, payment_terms_days: 0, notes: 'Generic vendor for open-market and cash purchases. Capture the actual vendor name on the receipt.', is_active: true, created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z' },
];

// ─── Locations ────────────────────────────────────────────────────────────────

export const MOCK_LOCATIONS: InventoryLocation[] = [
  { id: 1, code: 'WH-001', name: 'Mother Kitchen, Spintex', type: 'warehouse', branch_id: null, branch: null, address: 'Spintex Rd, Accra, GH', is_active: true, created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z' },
  { id: 2, code: 'SK-001', name: 'Osu Branch',               type: 'satellite', branch_id: 1,    branch: { id: 1, name: 'Osu',     area: 'Osu'     }, address: 'Oxford St, Osu, Accra',     is_active: true, created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z' },
  { id: 3, code: 'SK-002', name: 'Accra Mall Branch',        type: 'satellite', branch_id: 2,    branch: { id: 2, name: 'Accra Mall', area: 'Tetteh Quarshie' }, address: 'Accra Mall, Ring Rd', is_active: true, created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z' },
  { id: 4, code: 'SK-003', name: 'Tema Branch',              type: 'satellite', branch_id: 3,    branch: { id: 3, name: 'Tema',    area: 'Tema'    }, address: 'Community 1, Tema',          is_active: true, created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z' },
  { id: 5, code: 'SK-004', name: 'Achimota Branch',          type: 'satellite', branch_id: 4,    branch: { id: 4, name: 'Achimota', area: 'Achimota' }, address: 'Achimota, Accra',          is_active: false, created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z' },
];

// ─── Items ────────────────────────────────────────────────────────────────────

/**
 * Mock items carry no location thresholds, so their effective figures are just
 * their globals. Derived below rather than written out 33 times.
 */
type MockItemSeed = Omit<
  InventoryItem,
  'effective_reorder_level' | 'effective_min_threshold' | 'has_location_thresholds'
>;

const MOCK_ITEM_SEEDS: MockItemSeed[] = [
  { id: 1,  sku: 'ITM-000001', name: 'Chicken Thighs (Bone-in)',  description: 'Fresh bone-in thighs, 1kg packs',    category_id: 1, category: { id: 1, name: 'Proteins', slug: 'proteins' },      base_unit_id: 1, base_unit: { id: 1, name: 'Kilogram', symbol: 'kg' }, default_supplier_id: 1, default_supplier: { id: 1, name: 'Accra Meat Depot' },    storage_type: 'cold',    is_consumable: true,  expiry_tracked: true,  reorder_level: 20,  min_threshold: 8,   weighted_avg_cost: 42.50, stock_on_hand: 40, purchase_pack_label: null, purchase_pack_size: null, is_active: true,  created_at: '2026-02-01T00:00:00Z', updated_at: '2026-05-01T00:00:00Z' },
  { id: 2,  sku: 'ITM-000002', name: 'Chicken Breast (Boneless)', description: null,                                 category_id: 1, category: { id: 1, name: 'Proteins', slug: 'proteins' },      base_unit_id: 1, base_unit: { id: 1, name: 'Kilogram', symbol: 'kg' }, default_supplier_id: 1, default_supplier: { id: 1, name: 'Accra Meat Depot' },    storage_type: 'cold',    is_consumable: true,  expiry_tracked: true,  reorder_level: 15,  min_threshold: 5,   weighted_avg_cost: 58.00, stock_on_hand: 30, purchase_pack_label: null, purchase_pack_size: null, is_active: true,  created_at: '2026-02-01T00:00:00Z', updated_at: '2026-05-01T00:00:00Z' },
  { id: 3,  sku: 'ITM-000003', name: 'Tilapia (Fresh)',           description: 'Whole tilapia from Volta River',    category_id: 1, category: { id: 1, name: 'Proteins', slug: 'proteins' },      base_unit_id: 1, base_unit: { id: 1, name: 'Kilogram', symbol: 'kg' }, default_supplier_id: 1, default_supplier: { id: 1, name: 'Accra Meat Depot' },    storage_type: 'cold',    is_consumable: true,  expiry_tracked: true,  reorder_level: 10,  min_threshold: 3,   weighted_avg_cost: 35.00, stock_on_hand: 20, purchase_pack_label: null, purchase_pack_size: null, is_active: true,  created_at: '2026-02-01T00:00:00Z', updated_at: '2026-05-01T00:00:00Z' },
  { id: 4,  sku: 'ITM-000004', name: 'Basmati Rice',              description: '5kg imported basmati',              category_id: 2, category: { id: 2, name: 'Grains & Starch', slug: 'grains-starch' }, base_unit_id: 1, base_unit: { id: 1, name: 'Kilogram', symbol: 'kg' }, default_supplier_id: 5, default_supplier: { id: 5, name: 'North Rice Growers Co.' }, storage_type: 'dry', is_consumable: true, expiry_tracked: false, reorder_level: 50, min_threshold: 20, weighted_avg_cost: 8.80, stock_on_hand: 100, purchase_pack_label: null, purchase_pack_size: null, is_active: true, created_at: '2026-02-01T00:00:00Z', updated_at: '2026-05-01T00:00:00Z' },
  { id: 5,  sku: 'ITM-000005', name: 'Jollof Rice Parboiled',     description: 'Local parboiled for jollof base',   category_id: 2, category: { id: 2, name: 'Grains & Starch', slug: 'grains-starch' }, base_unit_id: 1, base_unit: { id: 1, name: 'Kilogram', symbol: 'kg' }, default_supplier_id: 5, default_supplier: { id: 5, name: 'North Rice Growers Co.' }, storage_type: 'dry', is_consumable: true, expiry_tracked: false, reorder_level: 80, min_threshold: 30, weighted_avg_cost: 6.20, stock_on_hand: 160, purchase_pack_label: null, purchase_pack_size: null, is_active: true, created_at: '2026-02-01T00:00:00Z', updated_at: '2026-05-01T00:00:00Z' },
  { id: 6,  sku: 'ITM-000006', name: 'Tomatoes (Fresh)',          description: null,                                 category_id: 3, category: { id: 3, name: 'Vegetables', slug: 'vegetables' },    base_unit_id: 1, base_unit: { id: 1, name: 'Kilogram', symbol: 'kg' }, default_supplier_id: 2, default_supplier: { id: 2, name: 'Tema Port Fresh Veg' }, storage_type: 'ambient', is_consumable: true, expiry_tracked: true, reorder_level: 15, min_threshold: 5, weighted_avg_cost: 4.50, stock_on_hand: 30, purchase_pack_label: null, purchase_pack_size: null, is_active: true, created_at: '2026-02-01T00:00:00Z', updated_at: '2026-05-01T00:00:00Z' },
  { id: 7,  sku: 'ITM-000007', name: 'Onions (Large)',            description: null,                                 category_id: 3, category: { id: 3, name: 'Vegetables', slug: 'vegetables' },    base_unit_id: 1, base_unit: { id: 1, name: 'Kilogram', symbol: 'kg' }, default_supplier_id: 2, default_supplier: { id: 2, name: 'Tema Port Fresh Veg' }, storage_type: 'ambient', is_consumable: true, expiry_tracked: false, reorder_level: 20, min_threshold: 7, weighted_avg_cost: 3.80, stock_on_hand: 40, purchase_pack_label: null, purchase_pack_size: null, is_active: true, created_at: '2026-02-01T00:00:00Z', updated_at: '2026-05-01T00:00:00Z' },
  { id: 8,  sku: 'ITM-000008', name: 'Red Bell Pepper',           description: null,                                 category_id: 3, category: { id: 3, name: 'Vegetables', slug: 'vegetables' },    base_unit_id: 1, base_unit: { id: 1, name: 'Kilogram', symbol: 'kg' }, default_supplier_id: 2, default_supplier: { id: 2, name: 'Tema Port Fresh Veg' }, storage_type: 'ambient', is_consumable: true, expiry_tracked: true, reorder_level: 5, min_threshold: 2, weighted_avg_cost: 12.00, stock_on_hand: 10, purchase_pack_label: null, purchase_pack_size: null, is_active: true, created_at: '2026-02-01T00:00:00Z', updated_at: '2026-05-01T00:00:00Z' },
  { id: 9,  sku: 'ITM-000009', name: 'Palm Oil',                  description: 'Unrefined red palm oil',            category_id: 4, category: { id: 4, name: 'Oils & Fats', slug: 'oils-fats' },    base_unit_id: 3, base_unit: { id: 3, name: 'Litre', symbol: 'L' },     default_supplier_id: 3, default_supplier: { id: 3, name: 'Golden Fry Oils Ltd' }, storage_type: 'ambient', is_consumable: true, expiry_tracked: false, reorder_level: 20, min_threshold: 5, weighted_avg_cost: 18.00, stock_on_hand: 40, purchase_pack_label: null, purchase_pack_size: null, is_active: true, created_at: '2026-02-01T00:00:00Z', updated_at: '2026-05-01T00:00:00Z' },
  { id: 10, sku: 'ITM-000010', name: 'Soyabean Oil',              description: '5L refined cooking oil',            category_id: 4, category: { id: 4, name: 'Oils & Fats', slug: 'oils-fats' },    base_unit_id: 3, base_unit: { id: 3, name: 'Litre', symbol: 'L' },     default_supplier_id: 3, default_supplier: { id: 3, name: 'Golden Fry Oils Ltd' }, storage_type: 'ambient', is_consumable: true, expiry_tracked: false, reorder_level: 30, min_threshold: 10, weighted_avg_cost: 14.50, stock_on_hand: 60, purchase_pack_label: null, purchase_pack_size: null, is_active: true, created_at: '2026-02-01T00:00:00Z', updated_at: '2026-05-01T00:00:00Z' },
  { id: 11, sku: 'ITM-000011', name: 'Curry Powder',              description: null,                                 category_id: 5, category: { id: 5, name: 'Spices & Herbs', slug: 'spices-herbs' }, base_unit_id: 1, base_unit: { id: 1, name: 'Kilogram', symbol: 'kg' }, default_supplier_id: null, default_supplier: null, storage_type: 'dry', is_consumable: true, expiry_tracked: false, reorder_level: 3, min_threshold: 1, weighted_avg_cost: 22.00, stock_on_hand: 6, purchase_pack_label: null, purchase_pack_size: null, is_active: true, created_at: '2026-02-01T00:00:00Z', updated_at: '2026-05-01T00:00:00Z' },
  { id: 12, sku: 'ITM-000012', name: 'Nutmeg (Ground)',           description: null,                                 category_id: 5, category: { id: 5, name: 'Spices & Herbs', slug: 'spices-herbs' }, base_unit_id: 2, base_unit: { id: 2, name: 'Gram', symbol: 'g' },       default_supplier_id: null, default_supplier: null, storage_type: 'dry', is_consumable: true, expiry_tracked: false, reorder_level: 500, min_threshold: 100, weighted_avg_cost: 0.045, stock_on_hand: 1000, purchase_pack_label: null, purchase_pack_size: null, is_active: true, created_at: '2026-02-01T00:00:00Z', updated_at: '2026-05-01T00:00:00Z' },
  { id: 13, sku: 'ITM-000013', name: 'Malta Guinness',            description: 'Malta Guinness 330mL cans × 24',   category_id: 6, category: { id: 6, name: 'Beverages', slug: 'beverages' },      base_unit_id: 7, base_unit: { id: 7, name: 'Carton', symbol: 'ctn' }, default_supplier_id: 4, default_supplier: { id: 4, name: 'CoolDrinks GH Dist.' }, storage_type: 'ambient', is_consumable: true, expiry_tracked: true, reorder_level: 10, min_threshold: 3, weighted_avg_cost: 85.00, stock_on_hand: 20, purchase_pack_label: null, purchase_pack_size: null, is_active: true, created_at: '2026-02-01T00:00:00Z', updated_at: '2026-05-01T00:00:00Z' },
  { id: 14, sku: 'ITM-000014', name: 'Bottled Water (500mL)',     description: 'Voltic / Refresh 500mL crate × 24',category_id: 6, category: { id: 6, name: 'Beverages', slug: 'beverages' },      base_unit_id: 7, base_unit: { id: 7, name: 'Carton', symbol: 'ctn' }, default_supplier_id: 4, default_supplier: { id: 4, name: 'CoolDrinks GH Dist.' }, storage_type: 'ambient', is_consumable: true, expiry_tracked: true, reorder_level: 15, min_threshold: 5, weighted_avg_cost: 28.00, stock_on_hand: 30, purchase_pack_label: null, purchase_pack_size: null, is_active: true, created_at: '2026-02-01T00:00:00Z', updated_at: '2026-05-01T00:00:00Z' },
  { id: 15, sku: 'ITM-000015', name: 'Takeaway Boxes (Large)',    description: '500pc per carton',                  category_id: 7, category: { id: 7, name: 'Packaging', slug: 'packaging' },      base_unit_id: 7, base_unit: { id: 7, name: 'Carton', symbol: 'ctn' }, default_supplier_id: null, default_supplier: null, storage_type: 'dry', is_consumable: true, expiry_tracked: false, reorder_level: 5, min_threshold: 2, weighted_avg_cost: 95.00, stock_on_hand: 10, purchase_pack_label: null, purchase_pack_size: null, is_active: true, created_at: '2026-02-01T00:00:00Z', updated_at: '2026-05-01T00:00:00Z' },
  { id: 16, sku: 'ITM-000016', name: 'Scotch Bonnet Pepper',      description: 'Fresh whole, per kg',               category_id: 3, category: { id: 3, name: 'Vegetables', slug: 'vegetables' },    base_unit_id: 1, base_unit: { id: 1, name: 'Kilogram', symbol: 'kg' }, default_supplier_id: 2, default_supplier: { id: 2, name: 'Tema Port Fresh Veg' }, storage_type: 'ambient', is_consumable: true, expiry_tracked: true, reorder_level: 3, min_threshold: 1, weighted_avg_cost: 16.50, stock_on_hand: 6, purchase_pack_label: null, purchase_pack_size: null, is_active: true, created_at: '2026-02-01T00:00:00Z', updated_at: '2026-05-01T00:00:00Z' },
  { id: 17, sku: 'ITM-000017', name: 'Vegetable Shortening',      description: null,                                 category_id: 4, category: { id: 4, name: 'Oils & Fats', slug: 'oils-fats' },    base_unit_id: 1, base_unit: { id: 1, name: 'Kilogram', symbol: 'kg' }, default_supplier_id: 3, default_supplier: { id: 3, name: 'Golden Fry Oils Ltd' }, storage_type: 'ambient', is_consumable: true, expiry_tracked: false, reorder_level: 10, min_threshold: 3, weighted_avg_cost: 11.20, stock_on_hand: 20, purchase_pack_label: null, purchase_pack_size: null, is_active: false, created_at: '2026-02-01T00:00:00Z', updated_at: '2026-04-01T00:00:00Z' },
  // ---- added for Noodles / Banku / Coleslaw / Cedi Wraps ----
  { id: 18, sku: 'ITM-000018', name: 'Indomie Noodles',           description: 'Chicken flavour, 70g × 40 per carton', category_id: 2, category: { id: 2, name: 'Grains & Starch', slug: 'grains-starch' }, base_unit_id: 7, base_unit: { id: 7, name: 'Carton', symbol: 'ctn' }, default_supplier_id: null, default_supplier: null, storage_type: 'dry', is_consumable: true, expiry_tracked: true, reorder_level: 10, min_threshold: 3, weighted_avg_cost: 65.00, stock_on_hand: 20, purchase_pack_label: null, purchase_pack_size: null, is_active: true, created_at: '2026-02-01T00:00:00Z', updated_at: '2026-05-01T00:00:00Z' },
  { id: 19, sku: 'ITM-000019', name: 'Corn Dough (Fermented)',    description: 'Ready-fermented banku corn dough, 5kg', category_id: 2, category: { id: 2, name: 'Grains & Starch', slug: 'grains-starch' }, base_unit_id: 1, base_unit: { id: 1, name: 'Kilogram', symbol: 'kg' }, default_supplier_id: 2, default_supplier: { id: 2, name: 'Tema Port Fresh Veg' }, storage_type: 'cold', is_consumable: true, expiry_tracked: true, reorder_level: 10, min_threshold: 3, weighted_avg_cost: 9.50, stock_on_hand: 20, purchase_pack_label: null, purchase_pack_size: null, is_active: true, created_at: '2026-02-01T00:00:00Z', updated_at: '2026-05-01T00:00:00Z' },
  { id: 20, sku: 'ITM-000020', name: 'Cassava Dough',             description: 'Fermented cassava for banku blend',   category_id: 2, category: { id: 2, name: 'Grains & Starch', slug: 'grains-starch' }, base_unit_id: 1, base_unit: { id: 1, name: 'Kilogram', symbol: 'kg' }, default_supplier_id: 2, default_supplier: { id: 2, name: 'Tema Port Fresh Veg' }, storage_type: 'cold', is_consumable: true, expiry_tracked: true, reorder_level: 5, min_threshold: 2, weighted_avg_cost: 7.00, stock_on_hand: 10, purchase_pack_label: null, purchase_pack_size: null, is_active: true, created_at: '2026-02-01T00:00:00Z', updated_at: '2026-05-01T00:00:00Z' },
  { id: 21, sku: 'ITM-000021', name: 'Cabbage (White)',           description: null,                                 category_id: 3, category: { id: 3, name: 'Vegetables', slug: 'vegetables' },    base_unit_id: 1, base_unit: { id: 1, name: 'Kilogram', symbol: 'kg' }, default_supplier_id: 2, default_supplier: { id: 2, name: 'Tema Port Fresh Veg' }, storage_type: 'cold', is_consumable: true, expiry_tracked: true, reorder_level: 10, min_threshold: 3, weighted_avg_cost: 3.20, stock_on_hand: 20, purchase_pack_label: null, purchase_pack_size: null, is_active: true, created_at: '2026-02-01T00:00:00Z', updated_at: '2026-05-01T00:00:00Z' },
  { id: 22, sku: 'ITM-000022', name: 'Carrots',                   description: null,                                 category_id: 3, category: { id: 3, name: 'Vegetables', slug: 'vegetables' },    base_unit_id: 1, base_unit: { id: 1, name: 'Kilogram', symbol: 'kg' }, default_supplier_id: 2, default_supplier: { id: 2, name: 'Tema Port Fresh Veg' }, storage_type: 'cold', is_consumable: true, expiry_tracked: true, reorder_level: 5, min_threshold: 2, weighted_avg_cost: 4.00, stock_on_hand: 10, purchase_pack_label: null, purchase_pack_size: null, is_active: true, created_at: '2026-02-01T00:00:00Z', updated_at: '2026-05-01T00:00:00Z' },
  { id: 23, sku: 'ITM-000023', name: 'Spring Onions',             description: null,                                 category_id: 3, category: { id: 3, name: 'Vegetables', slug: 'vegetables' },    base_unit_id: 1, base_unit: { id: 1, name: 'Kilogram', symbol: 'kg' }, default_supplier_id: 2, default_supplier: { id: 2, name: 'Tema Port Fresh Veg' }, storage_type: 'cold', is_consumable: true, expiry_tracked: true, reorder_level: 3, min_threshold: 1, weighted_avg_cost: 6.50, stock_on_hand: 6, purchase_pack_label: null, purchase_pack_size: null, is_active: true, created_at: '2026-02-01T00:00:00Z', updated_at: '2026-05-01T00:00:00Z' },
  { id: 24, sku: 'ITM-000024', name: 'Mayonnaise',                description: '3L tubs for coleslaw dressing',     category_id: 8, category: { id: 8, name: 'Condiments', slug: 'condiments' },    base_unit_id: 3, base_unit: { id: 3, name: 'Litre', symbol: 'L' },     default_supplier_id: null, default_supplier: null, storage_type: 'cold', is_consumable: true, expiry_tracked: true, reorder_level: 6, min_threshold: 2, weighted_avg_cost: 32.00, stock_on_hand: 12, purchase_pack_label: null, purchase_pack_size: null, is_active: true, created_at: '2026-02-01T00:00:00Z', updated_at: '2026-05-01T00:00:00Z' },
  { id: 25, sku: 'ITM-000025', name: 'Flour Tortilla Wraps (10")', description: '100pc per bag, Cedi Wraps',       category_id: 2, category: { id: 2, name: 'Grains & Starch', slug: 'grains-starch' }, base_unit_id: 6, base_unit: { id: 6, name: 'Bag', symbol: 'bag' }, default_supplier_id: null, default_supplier: null, storage_type: 'dry', is_consumable: true, expiry_tracked: true, reorder_level: 5, min_threshold: 2, weighted_avg_cost: 48.00, stock_on_hand: 10, purchase_pack_label: null, purchase_pack_size: null, is_active: true, created_at: '2026-02-01T00:00:00Z', updated_at: '2026-05-01T00:00:00Z' },
  { id: 26, sku: 'ITM-000026', name: 'Beef Mince (Fresh)',        description: 'Minced beef for wrap filling',     category_id: 1, category: { id: 1, name: 'Proteins', slug: 'proteins' },      base_unit_id: 1, base_unit: { id: 1, name: 'Kilogram', symbol: 'kg' }, default_supplier_id: 1, default_supplier: { id: 1, name: 'Accra Meat Depot' }, storage_type: 'cold', is_consumable: true, expiry_tracked: true, reorder_level: 5, min_threshold: 2, weighted_avg_cost: 65.00, stock_on_hand: 10, purchase_pack_label: null, purchase_pack_size: null, is_active: true, created_at: '2026-02-01T00:00:00Z', updated_at: '2026-05-01T00:00:00Z' },
  { id: 27, sku: 'ITM-000027', name: 'Garlic',                   description: null,                                 category_id: 5, category: { id: 5, name: 'Spices & Herbs', slug: 'spices-herbs' }, base_unit_id: 1, base_unit: { id: 1, name: 'Kilogram', symbol: 'kg' }, default_supplier_id: 2, default_supplier: { id: 2, name: 'Tema Port Fresh Veg' }, storage_type: 'ambient', is_consumable: true, expiry_tracked: false, reorder_level: 2, min_threshold: 0.5, weighted_avg_cost: 25.00, stock_on_hand: 4, purchase_pack_label: null, purchase_pack_size: null, is_active: true, created_at: '2026-02-01T00:00:00Z', updated_at: '2026-05-01T00:00:00Z' },
  { id: 28, sku: 'ITM-000028', name: 'Ginger (Fresh)',           description: null,                                 category_id: 5, category: { id: 5, name: 'Spices & Herbs', slug: 'spices-herbs' }, base_unit_id: 1, base_unit: { id: 1, name: 'Kilogram', symbol: 'kg' }, default_supplier_id: 2, default_supplier: { id: 2, name: 'Tema Port Fresh Veg' }, storage_type: 'ambient', is_consumable: true, expiry_tracked: false, reorder_level: 1, min_threshold: 0.3, weighted_avg_cost: 20.00, stock_on_hand: 2, purchase_pack_label: null, purchase_pack_size: null, is_active: true, created_at: '2026-02-01T00:00:00Z', updated_at: '2026-05-01T00:00:00Z' },
  { id: 29, sku: 'ITM-000029', name: 'Mixed Vegetables (Frozen)', description: 'Peas, sweetcorn, diced carrots mix',category_id: 3, category: { id: 3, name: 'Vegetables', slug: 'vegetables' },    base_unit_id: 1, base_unit: { id: 1, name: 'Kilogram', symbol: 'kg' }, default_supplier_id: 2, default_supplier: { id: 2, name: 'Tema Port Fresh Veg' }, storage_type: 'frozen', is_consumable: true, expiry_tracked: true, reorder_level: 15, min_threshold: 5, weighted_avg_cost: 19.50, stock_on_hand: 30, purchase_pack_label: null, purchase_pack_size: null, is_active: true, created_at: '2026-02-01T00:00:00Z', updated_at: '2026-05-01T00:00:00Z' },
  { id: 30, sku: 'ITM-000030', name: 'Seasoning Cubes (Maggi)',  description: '100-cube pack',                     category_id: 5, category: { id: 5, name: 'Spices & Herbs', slug: 'spices-herbs' }, base_unit_id: 5, base_unit: { id: 5, name: 'Piece', symbol: 'pc' }, default_supplier_id: null, default_supplier: null, storage_type: 'dry', is_consumable: true, expiry_tracked: false, reorder_level: 10, min_threshold: 3, weighted_avg_cost: 0.35, stock_on_hand: 20, purchase_pack_label: null, purchase_pack_size: null, is_active: true, created_at: '2026-02-01T00:00:00Z', updated_at: '2026-05-01T00:00:00Z' },
  { id: 31, sku: 'ITM-000031', name: 'Eggs',                     description: null,                                 category_id: 1, category: { id: 1, name: 'Proteins', slug: 'proteins' },      base_unit_id: 5, base_unit: { id: 5, name: 'Piece', symbol: 'pc' }, default_supplier_id: null, default_supplier: null, storage_type: 'cold', is_consumable: true, expiry_tracked: true, reorder_level: 60, min_threshold: 12, weighted_avg_cost: 1.50, stock_on_hand: 120, purchase_pack_label: null, purchase_pack_size: null, is_active: true, created_at: '2026-02-01T00:00:00Z', updated_at: '2026-05-01T00:00:00Z' },
  { id: 32, sku: 'ITM-000032', name: 'Whole Chicken',            description: 'Broiler whole bird ~1.4kg avg',     category_id: 1, category: { id: 1, name: 'Proteins', slug: 'proteins' },      base_unit_id: 5, base_unit: { id: 5, name: 'Piece', symbol: 'pc' }, default_supplier_id: 1, default_supplier: { id: 1, name: 'Accra Meat Depot' }, storage_type: 'frozen', is_consumable: true, expiry_tracked: true, reorder_level: 10, min_threshold: 4, weighted_avg_cost: 95.00, stock_on_hand: 20, purchase_pack_label: null, purchase_pack_size: null, is_active: true, created_at: '2026-02-01T00:00:00Z', updated_at: '2026-05-01T00:00:00Z' },
  { id: 33, sku: 'ITM-000033', name: 'Kpokpoi (Corn Kenkey)',    description: 'Fermented corn kenkey as kɔkɔɔ side', category_id: 2, category: { id: 2, name: 'Grains & Starch', slug: 'grains-starch' }, base_unit_id: 5, base_unit: { id: 5, name: 'Piece', symbol: 'pc' }, default_supplier_id: 2, default_supplier: { id: 2, name: 'Tema Port Fresh Veg' }, storage_type: 'ambient', is_consumable: true, expiry_tracked: true, reorder_level: 20, min_threshold: 5, weighted_avg_cost: 5.00, stock_on_hand: 40, purchase_pack_label: null, purchase_pack_size: null, is_active: true, created_at: '2026-02-01T00:00:00Z', updated_at: '2026-05-01T00:00:00Z' },
];

export const MOCK_ITEMS: InventoryItem[] = MOCK_ITEM_SEEDS.map((item) => ({
  ...item,
  effective_reorder_level: item.reorder_level,
  effective_min_threshold: item.min_threshold,
  has_location_thresholds: false,
}));

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
    description: 'Osu Branch reported ₵340 wastage. Above the ₵500 threshold this requires warehouse review.',
    href: '/inventory/wastage?status=pending_approval',
    action_label: 'Approve',
    count: 1,
  },
];

// ─── Sample recent transfers ──────────────────────────────────────────────────

export const MOCK_RECENT_TRANSFERS: InventoryTransfer[] = [
  {
    id: 1,
    reference: 'TRF-260505-041',
    status: 'received',
    source_location: { id: 1, name: 'Mother Kitchen, Spintex', type: 'warehouse' },
    destination_location: { id: 2, name: 'Osu Branch', type: 'satellite' },
    parent_transfer_id: null,
    notes: null,
    lines: [],
    dispute: null,
    created_by: 'Ama Boateng',
    created_by_id: null,
    approved_by: 'Kofi Mensah',
    sent_by: 'Kofi Mensah',
    sent_by_id: null,
    received_by: 'Osei Tutu',
    rejected_by: null,
    reject_reason: null,
    reject_reason_code: null,
    cancelled_by: null,
    cancel_reason: null,
    wastage: null,
    submitted_at: '2026-05-05T06:35:00Z',
    approved_at: '2026-05-05T06:50:00Z',
    sent_at: '2026-05-05T07:10:00Z',
    received_at: '2026-05-05T09:15:00Z',
    rejected_at: null,
    cancelled_at: null,
    created_at: '2026-05-05T06:30:00Z',
  },
  {
    id: 2,
    reference: 'TRF-260505-042',
    status: 'sent',
    source_location: { id: 1, name: 'Mother Kitchen, Spintex', type: 'warehouse' },
    destination_location: { id: 3, name: 'Accra Mall Branch', type: 'satellite' },
    parent_transfer_id: null,
    notes: 'Supplementary, weekend rush',
    lines: [],
    dispute: null,
    created_by: 'Abena Frimpong',
    created_by_id: null,
    approved_by: 'Kofi Mensah',
    sent_by: 'Kofi Mensah',
    sent_by_id: null,
    received_by: null,
    rejected_by: null,
    reject_reason: null,
    reject_reason_code: null,
    cancelled_by: null,
    cancel_reason: null,
    wastage: null,
    submitted_at: '2026-05-05T07:05:00Z',
    approved_at: '2026-05-05T07:20:00Z',
    sent_at: '2026-05-05T10:45:00Z',
    received_at: null,
    rejected_at: null,
    cancelled_at: null,
    created_at: '2026-05-05T07:00:00Z',
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

// ─── Purchase Orders ──────────────────────────────────────────────────────────
//
// Mix of statuses so list views can show every state without needing
// mutations. Items reference real MOCK_ITEMS and MOCK_SUPPLIERS.

const WH = MOCK_LOCATIONS[0]; // Mother Kitchen — Spintex
const ACCRA_MEAT = MOCK_SUPPLIERS[0];
const TEMA_VEG = MOCK_SUPPLIERS[1];
const GOLDEN_OIL = MOCK_SUPPLIERS[2];
const COOL_DRINKS = MOCK_SUPPLIERS[3];
const NORTH_RICE = MOCK_SUPPLIERS[4];
const MARKET = MOCK_SUPPLIERS[5];

const WAREHOUSE_MGR = { id: 3, name: 'Kofi Mensah' };
const PURCHASING_CLERK = { id: 7, name: 'Abena Darko' };
const ADMIN = { id: 1, name: 'Platform Admin' };

const item = (id: number) => {
  const i = MOCK_ITEMS.find((x) => x.id === id);
  if (!i) throw new Error(`MOCK_ITEMS missing id ${id}`);
  return { id: i.id, sku: i.sku, name: i.name, base_unit: i.base_unit };
};

export const MOCK_PURCHASE_ORDERS: PurchaseOrder[] = [
  // 1 — sent, large order, approved (above threshold)
  {
    id: 1,
    reference: 'PO-2026-0001',
    verification_code: 'K7M4-2QXP-9HJF',
    supplier_id: ACCRA_MEAT.id,
    supplier: { id: ACCRA_MEAT.id, code: ACCRA_MEAT.code, name: ACCRA_MEAT.name, phone: ACCRA_MEAT.phone },
    destination_location_id: WH.id,
    destination_location: { id: WH.id, code: WH.code, name: WH.name, type: WH.type },
    status: 'sent',
    requires_approval: true,
    expected_delivery_date: '2026-05-08',
    notes: 'Weekly meat restock for Spintex mother kitchen.',
    cancel_reason: null,
    created_by_id: WAREHOUSE_MGR.id, created_by: WAREHOUSE_MGR,
    approved_by_id: ADMIN.id, approved_by: ADMIN, approved_at: '2026-05-04T09:30:00Z',
    cancelled_by_id: null, cancelled_by: null, cancelled_at: null,
    items: [
      { id: 1, item_id: 1,  item: item(1),  ordered_qty: 200, received_qty: 0, unit: { id: 1, symbol: 'kg' }, estimated_unit_cost: 42.50, line_total: 8500 },
      { id: 2, item_id: 2,  item: item(2),  ordered_qty: 80,  received_qty: 0, unit: { id: 1, symbol: 'kg' }, estimated_unit_cost: 58.00, line_total: 4640 },
      { id: 3, item_id: 32, item: item(32), ordered_qty: 30,  received_qty: 0, unit: { id: 5, symbol: 'pc' }, estimated_unit_cost: 95.00, line_total: 2850 },
    ],
    estimated_total: 15990,
    actual_total: 0,
    created_at: '2026-05-04T08:00:00Z',
    updated_at: '2026-05-04T09:30:00Z',
  },

  // 2 — partially_received
  {
    id: 2,
    reference: 'PO-2026-0002',
    verification_code: 'R3TK-8WQM-4ZXN',
    supplier_id: TEMA_VEG.id,
    supplier: { id: TEMA_VEG.id, code: TEMA_VEG.code, name: TEMA_VEG.name, phone: TEMA_VEG.phone },
    destination_location_id: WH.id,
    destination_location: { id: WH.id, code: WH.code, name: WH.name, type: WH.type },
    status: 'partially_received',
    requires_approval: false,
    expected_delivery_date: '2026-05-05',
    notes: 'Daily fresh vegetables.',
    cancel_reason: null,
    created_by_id: WAREHOUSE_MGR.id, created_by: WAREHOUSE_MGR,
    approved_by_id: null, approved_by: null, approved_at: null,
    cancelled_by_id: null, cancelled_by: null, cancelled_at: null,
    items: [
      { id: 4, item_id: 6,  item: item(6),  ordered_qty: 40, received_qty: 40, unit: { id: 1, symbol: 'kg' }, estimated_unit_cost: 4.50,  line_total: 180 },
      { id: 5, item_id: 7,  item: item(7),  ordered_qty: 30, received_qty: 30, unit: { id: 1, symbol: 'kg' }, estimated_unit_cost: 3.80,  line_total: 114 },
      { id: 6, item_id: 21, item: item(21), ordered_qty: 25, received_qty: 10, unit: { id: 1, symbol: 'kg' }, estimated_unit_cost: 3.20,  line_total: 80 },
      { id: 7, item_id: 22, item: item(22), ordered_qty: 15, received_qty: 0,  unit: { id: 1, symbol: 'kg' }, estimated_unit_cost: 4.00,  line_total: 60 },
    ],
    estimated_total: 434,
    actual_total: 326,
    created_at: '2026-05-04T07:30:00Z',
    updated_at: '2026-05-05T08:15:00Z',
  },

  // 3 — received (closed automatically when fully received? No — closed is manual)
  {
    id: 3,
    reference: 'PO-2026-0003',
    verification_code: 'P9JH-5MNT-2KQW',
    supplier_id: GOLDEN_OIL.id,
    supplier: { id: GOLDEN_OIL.id, code: GOLDEN_OIL.code, name: GOLDEN_OIL.name, phone: GOLDEN_OIL.phone },
    destination_location_id: WH.id,
    destination_location: { id: WH.id, code: WH.code, name: WH.name, type: WH.type },
    status: 'received',
    requires_approval: false,
    expected_delivery_date: '2026-05-03',
    notes: null,
    cancel_reason: null,
    created_by_id: WAREHOUSE_MGR.id, created_by: WAREHOUSE_MGR,
    approved_by_id: null, approved_by: null, approved_at: null,
    cancelled_by_id: null, cancelled_by: null, cancelled_at: null,
    items: [
      { id: 8, item_id: 9,  item: item(9),  ordered_qty: 50, received_qty: 50, unit: { id: 3, symbol: 'L' }, estimated_unit_cost: 18.00, line_total: 900 },
      { id: 9, item_id: 10, item: item(10), ordered_qty: 80, received_qty: 80, unit: { id: 3, symbol: 'L' }, estimated_unit_cost: 14.50, line_total: 1160 },
    ],
    estimated_total: 2060,
    actual_total: 2090,
    created_at: '2026-05-02T10:00:00Z',
    updated_at: '2026-05-03T14:20:00Z',
  },

  // 4 — draft (small order, no approval required)
  {
    id: 4,
    reference: 'PO-2026-0004',
    verification_code: 'T4WX-7HQK-3MPN',
    supplier_id: COOL_DRINKS.id,
    supplier: { id: COOL_DRINKS.id, code: COOL_DRINKS.code, name: COOL_DRINKS.name, phone: COOL_DRINKS.phone },
    destination_location_id: WH.id,
    destination_location: { id: WH.id, code: WH.code, name: WH.name, type: WH.type },
    status: 'draft',
    requires_approval: false,
    expected_delivery_date: '2026-05-09',
    notes: 'Top-up beverages.',
    cancel_reason: null,
    created_by_id: WAREHOUSE_MGR.id, created_by: WAREHOUSE_MGR,
    approved_by_id: null, approved_by: null, approved_at: null,
    cancelled_by_id: null, cancelled_by: null, cancelled_at: null,
    items: [
      { id: 10, item_id: 13, item: item(13), ordered_qty: 12, received_qty: 0, unit: { id: 7, symbol: 'ctn' }, estimated_unit_cost: 85.00, line_total: 1020 },
      { id: 11, item_id: 14, item: item(14), ordered_qty: 20, received_qty: 0, unit: { id: 7, symbol: 'ctn' }, estimated_unit_cost: 28.00, line_total: 560 },
    ],
    estimated_total: 1580,
    actual_total: 0,
    created_at: '2026-05-05T07:00:00Z',
    updated_at: '2026-05-05T07:00:00Z',
  },

  // 5 — pending_approval (above threshold)
  {
    id: 5,
    reference: 'PO-2026-0005',
    verification_code: 'W2QN-6KJT-8XMP',
    supplier_id: NORTH_RICE.id,
    supplier: { id: NORTH_RICE.id, code: NORTH_RICE.code, name: NORTH_RICE.name, phone: NORTH_RICE.phone },
    destination_location_id: WH.id,
    destination_location: { id: WH.id, code: WH.code, name: WH.name, type: WH.type },
    status: 'pending_approval',
    requires_approval: true,
    expected_delivery_date: '2026-05-12',
    notes: 'Quarterly bulk rice order from Tamale.',
    cancel_reason: null,
    created_by_id: WAREHOUSE_MGR.id, created_by: WAREHOUSE_MGR,
    approved_by_id: null, approved_by: null, approved_at: null,
    cancelled_by_id: null, cancelled_by: null, cancelled_at: null,
    items: [
      { id: 12, item_id: 4, item: item(4), ordered_qty: 600,  received_qty: 0, unit: { id: 1, symbol: 'kg' }, estimated_unit_cost: 8.80, line_total: 5280 },
      { id: 13, item_id: 5, item: item(5), ordered_qty: 1200, received_qty: 0, unit: { id: 1, symbol: 'kg' }, estimated_unit_cost: 6.20, line_total: 7440 },
    ],
    estimated_total: 12720,
    actual_total: 0,
    created_at: '2026-05-05T06:30:00Z',
    updated_at: '2026-05-05T06:30:00Z',
  },

  // 6 — cancelled
  {
    id: 6,
    reference: 'PO-2026-0006',
    verification_code: 'B5HM-3PQX-7WKN',
    supplier_id: ACCRA_MEAT.id,
    supplier: { id: ACCRA_MEAT.id, code: ACCRA_MEAT.code, name: ACCRA_MEAT.name, phone: ACCRA_MEAT.phone },
    destination_location_id: WH.id,
    destination_location: { id: WH.id, code: WH.code, name: WH.name, type: WH.type },
    status: 'cancelled',
    requires_approval: false,
    expected_delivery_date: '2026-05-01',
    notes: 'Original beef order.',
    cancel_reason: 'Supplier out of stock. Re-issued under PO-2026-0007.',
    created_by_id: WAREHOUSE_MGR.id, created_by: WAREHOUSE_MGR,
    approved_by_id: null, approved_by: null, approved_at: null,
    cancelled_by_id: WAREHOUSE_MGR.id, cancelled_by: WAREHOUSE_MGR, cancelled_at: '2026-04-30T11:00:00Z',
    items: [
      { id: 14, item_id: 26, item: item(26), ordered_qty: 30, received_qty: 0, unit: { id: 1, symbol: 'kg' }, estimated_unit_cost: 65.00, line_total: 1950 },
    ],
    estimated_total: 1950,
    actual_total: 0,
    created_at: '2026-04-29T10:00:00Z',
    updated_at: '2026-04-30T11:00:00Z',
  },
];

// ─── Purchases (actual receipts) ──────────────────────────────────────────────

export const MOCK_PURCHASES: Purchase[] = [
  // Receipt against PO-2026-0003 (received in full)
  {
    id: 1,
    reference: 'RCP-2026-0001',
    purchase_order_id: 3,
    purchase_order: { id: 3, reference: 'PO-2026-0003' },
    supplier_id: GOLDEN_OIL.id,
    supplier: { id: GOLDEN_OIL.id, code: GOLDEN_OIL.code, name: GOLDEN_OIL.name },
    supplier_name: null,
    destination_location_id: WH.id,
    destination_location: { id: WH.id, name: WH.name },
    is_urgent_buy: false,
    urgent_buy_reason: null,
    invoice_number: 'GFO-INV-44512',
    notes: 'Full delivery, slightly above estimated cost on palm oil.',
    recorded_by_id: PURCHASING_CLERK.id, recorded_by: PURCHASING_CLERK,
    items: [
      { id: 1, item_id: 9,  item: item(9),  purchase_order_item_id: 8, ordered_qty: 50, received_qty: 50, variance: 0, variance_reason: 'Palm oil up ₵0.50/L on the day.', expected_unit_cost: 18.00, cost_variance: 0.50, unit: { id: 3, symbol: 'L' }, unit_cost_paid: 18.50, line_total: 925 },
      { id: 2, item_id: 10, item: item(10), purchase_order_item_id: 9, ordered_qty: 80, received_qty: 80, variance: 0, variance_reason: null, expected_unit_cost: 14.50, cost_variance: 0, unit: { id: 3, symbol: 'L' }, unit_cost_paid: 14.50, line_total: 1160 },
    ],
    total_paid: 2085,
    received_at: '2026-05-03T14:00:00Z',
    created_at: '2026-05-03T14:20:00Z',
  },

  // First partial against PO-2026-0002
  {
    id: 2,
    reference: 'RCP-2026-0002',
    purchase_order_id: 2,
    purchase_order: { id: 2, reference: 'PO-2026-0002' },
    supplier_id: TEMA_VEG.id,
    supplier: { id: TEMA_VEG.id, code: TEMA_VEG.code, name: TEMA_VEG.name },
    supplier_name: null,
    destination_location_id: WH.id,
    destination_location: { id: WH.id, name: WH.name },
    is_urgent_buy: false,
    urgent_buy_reason: null,
    invoice_number: 'TVF-2026-0512',
    notes: 'Tomatoes + onions full; cabbage short, carrots not delivered.',
    recorded_by_id: PURCHASING_CLERK.id, recorded_by: PURCHASING_CLERK,
    items: [
      { id: 3, item_id: 6,  item: item(6),  purchase_order_item_id: 4, ordered_qty: 40, received_qty: 40, variance: 0,   variance_reason: null, expected_unit_cost: 4.50, cost_variance: 0, unit: { id: 1, symbol: 'kg' }, unit_cost_paid: 4.50, line_total: 180 },
      { id: 4, item_id: 7,  item: item(7),  purchase_order_item_id: 5, ordered_qty: 30, received_qty: 30, variance: 0,   variance_reason: null, expected_unit_cost: 3.80, cost_variance: 0, unit: { id: 1, symbol: 'kg' }, unit_cost_paid: 3.80, line_total: 114 },
      { id: 5, item_id: 21, item: item(21), purchase_order_item_id: 6, ordered_qty: 25, received_qty: 10, variance: -15, variance_reason: 'Supplier short on cabbage; balance of 15kg promised with next delivery.', expected_unit_cost: 3.20, cost_variance: 0, unit: { id: 1, symbol: 'kg' }, unit_cost_paid: 3.20, line_total: 32 },
    ],
    total_paid: 326,
    received_at: '2026-05-05T08:00:00Z',
    created_at: '2026-05-05T08:15:00Z',
  },

  // Urgent buy — no PO
  {
    id: 3,
    reference: 'RCP-2026-0003',
    purchase_order_id: null,
    purchase_order: null,
    supplier_id: MARKET.id,
    supplier: { id: MARKET.id, code: MARKET.code, name: MARKET.name },
    supplier_name: 'Madina Market, Auntie Akos (vegetables)',
    destination_location_id: WH.id,
    destination_location: { id: WH.id, name: WH.name },
    is_urgent_buy: true,
    urgent_buy_reason: 'Ran out of scotch bonnet during morning prep. Bought from the market.',
    invoice_number: null,
    notes: 'Cash purchase from Madina market.',
    recorded_by_id: PURCHASING_CLERK.id, recorded_by: PURCHASING_CLERK,
    items: [
      { id: 6, item_id: 16, item: item(16), purchase_order_item_id: null, ordered_qty: null, received_qty: 5, variance: null, variance_reason: null, expected_unit_cost: null, cost_variance: null, unit: { id: 1, symbol: 'kg' }, unit_cost_paid: 18.00, line_total: 90 },
    ],
    total_paid: 90,
    received_at: '2026-05-04T07:45:00Z',
    created_at: '2026-05-04T07:50:00Z',
  },
];
