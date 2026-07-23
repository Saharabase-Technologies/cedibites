'use client';

import { SegmentedTabsLink } from '../../_components';
import { useStaffAuthOptional } from '@/app/components/providers/StaffAuthProvider';

/**
 * Catalog master-data tabs. Each tab carries the same permission as its sidebar
 * entry (see `layout-client.tsx`) so a role only sees the tabs it can open:
 * Warehouse Manager → Items/Categories/Units, Purchasing Clerk → Items/Suppliers,
 * Branch Manager → Items/Recipes, Admin → all. Outside a provider (mock mode) the
 * filter is skipped and every tab shows.
 */
const CATALOG_TABS = [
  { href: '/inventory/catalog/items',      label: 'Items',      permission: 'view_inventory_catalog'   },
  { href: '/inventory/catalog/categories', label: 'Categories', permission: 'inventory.category.manage' },
  { href: '/inventory/catalog/units',      label: 'Units',      permission: 'inventory.unit.manage'     },
  { href: '/inventory/catalog/suppliers',  label: 'Suppliers',  permission: 'inventory.supplier.manage' },
  { href: '/inventory/catalog/recipes',    label: 'Recipes',    permission: 'inventory.recipe.view'     },
];

export function CatalogTabs() {
  const can = useStaffAuthOptional()?.can;
  const items = CATALOG_TABS.filter((t) => !can || can(t.permission)).map(
    ({ href, label }) => ({ href, label }),
  );
  return <SegmentedTabsLink items={items} />;
}

/**
 * Unified Catalog header — one "Inventory" title above the tabs, shared by the
 * sub-pages (Items, Categories, Units, Suppliers, Recipes).
 */
export function CatalogShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="p-6 pb-24 md:pb-6 max-w-6xl mx-auto w-full">
      <div className="mb-5">
        <h1 className="text-2xl font-bold font-brand text-text-dark">Inventory</h1>
        <p className="text-neutral-gray text-sm font-body mt-1">
          Items, categories, units, suppliers and recipes.
        </p>
      </div>
      <div className="mb-5">
        <CatalogTabs />
      </div>
      {children}
    </div>
  );
}

