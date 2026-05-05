import type { Metadata } from 'next';
import { ConfigureShell } from '../_components/ConfigureShell';
import { CatalogCategoriesPage } from '../../catalog/categories/_components/CatalogCategoriesPage';

export const metadata: Metadata = { title: 'Categories — Configure' };

export default function Page() {
  return (
    <ConfigureShell>
      <CatalogCategoriesPage />
    </ConfigureShell>
  );
}
