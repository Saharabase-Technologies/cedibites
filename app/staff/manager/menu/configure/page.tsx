import { redirect } from 'next/navigation';

/**
 * Categories are company-level, same as tags — and `menu_categories` is still
 * branch-scoped with UNIQUE(branch_id, slug), so a manager editing one here was
 * editing a row that only their own branch could see while the list showed
 * every branch's copy. The endpoints need `manage_menu` regardless.
 *
 * Kept as a redirect for bookmarks. The admin's is at /admin/menu/configure.
 */
export default function Page() {
    redirect('/staff/manager/menu');
}
