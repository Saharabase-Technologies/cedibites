import { redirect } from 'next/navigation';

// Locations now live under the System section as a standalone admin route.
// Kept as a redirect for backward-compatible links/bookmarks.
export default function Page() {
  redirect('/inventory/locations');
}
