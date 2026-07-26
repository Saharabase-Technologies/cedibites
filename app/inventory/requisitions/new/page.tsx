import type { Metadata } from 'next';
import { RequisitionForm } from '../_components/RequisitionForm';

export const metadata: Metadata = { title: 'New Requisition - Inventory' };

export default function Page() {
  return <RequisitionForm mode="create" />;
}
