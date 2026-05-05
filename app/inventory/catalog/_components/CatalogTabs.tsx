'use client';

import { SegmentedTabsLink } from '../../_components';

const CATALOG_NAV = [
  { href: '/inventory/catalog/items',     label: 'Items'     },
  { href: '/inventory/catalog/suppliers', label: 'Suppliers' },
];

export function CatalogTabs() {
  return <SegmentedTabsLink items={CATALOG_NAV} />;
}

/**
 * Unified Catalog header — one "Inventory" title above the tabs,
 * shared by all four sub-pages (Items, Categories, Units, Suppliers).
 */
export function CatalogShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="p-6 pb-24 md:pb-6 max-w-6xl mx-auto w-full">
      <div className="mb-5">
        <h1 className="text-2xl font-bold font-brand text-text-dark">Inventory</h1>
        <p className="text-neutral-gray text-sm font-body mt-1">
          Inventory items and supplier master data.
        </p>
      </div>
      <div className="mb-5">
        <CatalogTabs />
      </div>
      {children}
    </div>
  );
}

