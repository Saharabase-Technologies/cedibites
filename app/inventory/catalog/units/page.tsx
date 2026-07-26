import type { Metadata } from 'next';
import { CatalogShell } from '../_components/CatalogTabs';
import { CatalogUnitsPage } from './_components/CatalogUnitsPage';

export const metadata: Metadata = { title: 'Units - Inventory' };

export default function Page() {
  return (
    <CatalogShell>
      <CatalogUnitsPage />
    </CatalogShell>
  );
}
