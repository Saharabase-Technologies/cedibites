/**
 * Reporter identity + active context, resolved at the root (outside any portal's
 * StaffAuthProvider) by reading the same tokens the axios client keys on. The
 * backend derives the authoritative reporter from the token; role/branch here
 * are best-effort *context at report time*.
 *
 * P7: the widget only shows when a token is present — the reporter is always
 * authenticated; guests never see it.
 */

export interface ReporterContext {
  authenticated: boolean;
  roleAtReport: string | null;
  branchId: number | null;
  route: string;
}

export function resolveReporterContext(): ReporterContext {
  if (typeof window === 'undefined') {
    return { authenticated: false, roleAtReport: null, branchId: null, route: '' };
  }

  const staffToken = localStorage.getItem('cedibites_staff_token');
  const customerToken = localStorage.getItem('cedibites_auth_token');
  const route = window.location.pathname;

  let roleAtReport: string | null = null;
  if (staffToken) {
    try {
      const session = JSON.parse(localStorage.getItem('cedibites-staff-session') || 'null');
      roleAtReport = session?.role ?? 'staff';
    } catch {
      roleAtReport = 'staff';
    }
  } else if (customerToken) {
    roleAtReport = 'customer';
  }

  const rawBranch = localStorage.getItem('selected-branch-id');
  const branchId = rawBranch && !Number.isNaN(Number(rawBranch)) ? Number(rawBranch) : null;

  return {
    authenticated: Boolean(staffToken || customerToken),
    roleAtReport,
    branchId,
    route,
  };
}
