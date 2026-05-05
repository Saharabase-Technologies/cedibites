import type { Metadata } from 'next';
import { ConfigureShell } from '../_components/ConfigureShell';
import { CatalogUnitsPage } from '../../catalog/units/_components/CatalogUnitsPage';

export const metadata: Metadata = { title: 'Units — Configure' };

export default function Page() {
  return (
    <ConfigureShell>
      <CatalogUnitsPage />
    </ConfigureShell>
  );
}
