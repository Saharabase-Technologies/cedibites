import type { Metadata } from 'next';
import { PromoForm } from '../_components/PromoForm';

export const metadata: Metadata = { title: 'Promo' };

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    return <PromoForm promoId={id} />;
}
