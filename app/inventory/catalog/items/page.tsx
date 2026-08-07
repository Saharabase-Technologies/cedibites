import type { Metadata } from 'next';
import { CatalogShell } from '../_components/CatalogTabs';
import InventoryItemsPage from './_components/InventoryItemsPage';

export const metadata: Metadata = { title: 'Items - Inventory' };

export default function ItemsPage() {
  return (
    <CatalogShell>
      <InventoryItemsPage />
    </CatalogShell>
  );
}
