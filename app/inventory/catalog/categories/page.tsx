import type { Metadata } from 'next';
import { CatalogShell } from '../_components/CatalogTabs';
import { CatalogCategoriesPage } from './_components/CatalogCategoriesPage';

export const metadata: Metadata = { title: 'Categories — Inventory' };

export default function Page() {
  return (
    <CatalogShell>
      <CatalogCategoriesPage />
    </CatalogShell>
  );
}
