import type { Metadata } from 'next';
import { CatalogShell } from '../_components/CatalogTabs';
import { CatalogSuppliersPage } from './_components/CatalogSuppliersPage';

export const metadata: Metadata = { title: 'Suppliers — Inventory' };

export default function Page() {
  return (
    <CatalogShell>
      <CatalogSuppliersPage />
    </CatalogShell>
  );
}
