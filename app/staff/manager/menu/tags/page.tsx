import { redirect } from 'next/navigation';

/**
 * Tags are company-level. The menu is one menu across every branch, so a tag
 * edited at one till changes what every branch shows — and the endpoints behind
 * this page need `manage_menu`, which a branch manager does not hold. It was a
 * full CRUD editor that could only ever return 403.
 *
 * Kept as a redirect for bookmarks. The admin's is at /admin/menu/tags.
 */
export default function Page() {
    redirect('/staff/manager/menu');
}
