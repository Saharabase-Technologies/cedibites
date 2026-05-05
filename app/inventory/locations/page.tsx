import type { Metadata } from 'next';
import { redirect } from 'next/navigation';

export const metadata: Metadata = { title: 'Locations' };

export default function LocationsPage() {
  redirect('/inventory/configure/locations');
}
