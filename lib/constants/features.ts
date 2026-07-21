/**
 * Build-time feature flags. The feedback widget defaults ON (the inverse of a
 * usual flag) so it's available to every logged-in role during beta — one env
 * flip (`NEXT_PUBLIC_FEEDBACK=false`) turns the whole thing off after beta with
 * no code change. Backend endpoints stay live regardless, for support use.
 */
export const FEATURES = {
  feedback:
    process.env.NEXT_PUBLIC_FEEDBACK !== 'false' &&
    process.env.NEXT_PUBLIC_FEEDBACK !== '0',
} as const;
