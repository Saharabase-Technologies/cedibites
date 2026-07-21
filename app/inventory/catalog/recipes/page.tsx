import type { Metadata } from 'next';
import { CatalogShell } from '../_components/CatalogTabs';
import RecipesPage from '../../recipes/_components/RecipesPage';

export const metadata: Metadata = { title: 'Recipes' };

export default function Page() {
  return (
    <CatalogShell>
      <RecipesPage />
    </CatalogShell>
  );
}
