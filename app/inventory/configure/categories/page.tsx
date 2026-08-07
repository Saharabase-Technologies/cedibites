import { redirect } from 'next/navigation';

// Categories now live in the Catalog section (the Warehouse Manager curates them
// alongside items). Kept as a redirect for backward-compatible links/bookmarks.
export default function Page() {
  redirect('/inventory/catalog/categories');
}
