import type { Metadata } from 'next';
import InventorySettingsPage from './_components/InventorySettingsPage';

export const metadata: Metadata = { title: 'Settings' };

export default function Page() {
  return <InventorySettingsPage />;
}
