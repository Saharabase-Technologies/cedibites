import type { Metadata } from 'next';
import { redirect } from 'next/navigation';

export const metadata: Metadata = { title: 'Configure' };

export default function ConfigurePage() {
  redirect('/inventory/configure/categories');
}
