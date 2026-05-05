'use client';

import { SegmentedTabsLink } from '../../_components';

const CONFIGURE_NAV = [
  { href: '/inventory/configure/categories', label: 'Categories' },
  { href: '/inventory/configure/units',      label: 'Units'      },
  { href: '/inventory/configure/locations',  label: 'Locations'  },
  { href: '/inventory/configure/recipes',    label: 'Recipes'    },
  { href: '/inventory/configure/settings',   label: 'Settings'   },
];

export function ConfigureTabs() {
  return <SegmentedTabsLink items={CONFIGURE_NAV} />;
}

export function ConfigureShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="p-6 pb-24 md:pb-6 max-w-6xl mx-auto w-full">
      <div className="mb-5">
        <h1 className="text-2xl font-bold font-brand text-text-dark">Configure</h1>
        <p className="text-neutral-gray text-sm font-body mt-1">
          System configuration — categories, units of measurement and kitchen locations.
        </p>
      </div>
      <div className="mb-5">
        <ConfigureTabs />
      </div>
      {children}
    </div>
  );
}
