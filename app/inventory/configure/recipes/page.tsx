import type { Metadata } from 'next';
import { ConfigureShell } from '../_components/ConfigureShell';
import RecipesPage from '../../recipes/_components/RecipesPage';

export const metadata: Metadata = { title: 'Recipes — Configure' };

export default function Page() {
  return (
    <ConfigureShell>
      <RecipesPage />
    </ConfigureShell>
  );
}
