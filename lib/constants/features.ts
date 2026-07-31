/**
 * Build-time feature flags. The feedback widget is OFF — the floating button and
 * the silent-capture layer behind it are both disabled for now. Set
 * `NEXT_PUBLIC_FEEDBACK=true` to bring them back with no code change. The admin
 * inbox (/admin/feedback), /my-feedback and the backend endpoints stay live
 * regardless, so existing reports remain readable.
 */
export const FEATURES = {
  feedback:
    process.env.NEXT_PUBLIC_FEEDBACK === 'true' ||
    process.env.NEXT_PUBLIC_FEEDBACK === '1',
} as const;
