import { redirect } from 'next/navigation';

// Recipes moved to Catalog (it's master data that depends on items existing).
// Kept as a redirect so old links / bookmarks still resolve.
export default function Page() {
  redirect('/inventory/catalog/recipes');
}
