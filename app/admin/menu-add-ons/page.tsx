import { redirect } from 'next/navigation';

/**
 * Add-ons are gone. They were configurable, priceable and attachable to dishes,
 * and no order path ever read them — nothing in the cart, checkout, POS or the
 * customer menu. A surface that could not affect a sale.
 *
 * The tables and their data are untouched; only the UI and API are withdrawn.
 */
export default function Page() {
    redirect('/admin/menu');
}
