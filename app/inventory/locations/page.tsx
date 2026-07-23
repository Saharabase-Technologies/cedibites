import type { Metadata } from 'next';
import InventoryLocationsPage from './_components/InventoryLocationsPage';

export const metadata: Metadata = { title: 'Locations — Inventory' };

export default function Page() {
  return (
    <div className="p-6 pb-24 md:pb-6 max-w-6xl mx-auto w-full">
      <div className="mb-5">
        <h1 className="text-2xl font-bold font-brand text-text-dark">Locations</h1>
        <p className="text-neutral-gray text-sm font-body mt-1">
          Your mother kitchen and satellite kitchen locations.
        </p>
      </div>
      <InventoryLocationsPage />
    </div>
  );
}
