import type { Metadata } from 'next';
import { PromoForm } from '../_components/PromoForm';

export const metadata: Metadata = { title: 'New promo' };

export default function Page() {
    return <PromoForm />;
}
