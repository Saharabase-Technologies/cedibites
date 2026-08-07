import type { Metadata } from 'next';
import InventoryDashboardPage from './_components/InventoryDashboardPage';

export const metadata: Metadata = { title: 'Dashboard' };

export default function DashboardPage() {
  return <InventoryDashboardPage />;
}
