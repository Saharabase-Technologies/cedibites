import type { Metadata } from 'next';
import { VerifyPurchaseOrderPage } from '../_components/VerifyPurchaseOrderPage';

export const metadata: Metadata = { title: 'Verify Purchase Order' };

export default async function Page({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  return <VerifyPurchaseOrderPage code={decodeURIComponent(code)} />;
}
