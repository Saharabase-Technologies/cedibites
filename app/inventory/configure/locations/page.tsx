import type { Metadata } from 'next';
import { ConfigureShell } from '../_components/ConfigureShell';
import InventoryLocationsPage from '../../locations/_components/InventoryLocationsPage';

export const metadata: Metadata = { title: 'Locations — Configure' };

export default function Page() {
  return (
    <ConfigureShell>
      <InventoryLocationsPage />
    </ConfigureShell>
  );
}
