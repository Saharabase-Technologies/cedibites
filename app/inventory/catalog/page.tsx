import type { Metadata } from 'next';
import { redirect } from 'next/navigation';

export const metadata: Metadata = { title: 'Catalog' };

export default function CatalogPage() {
  redirect('/inventory/catalog/items');
}
