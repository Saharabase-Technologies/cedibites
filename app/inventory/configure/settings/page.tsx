import { redirect } from 'next/navigation';

// The wastage-threshold editor now lives on the consolidated admin Settings page
// (alongside IMS role assignment). Kept as a redirect for backward-compatible links.
export default function Page() {
  redirect('/inventory/settings');
}
