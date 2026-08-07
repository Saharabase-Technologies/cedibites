/**
 * DOM → image capture for the reporting widget.
 *
 * Uses `html-to-image` (NOT html2canvas — C2). html-to-image clones computed
 * styles rather than parsing color values, so Tailwind v4's oklch utilities
 * survive; html2canvas chokes on them. Capture failure DEGRADES to null — the
 * widget then offers "upload a photo or skip", never blocking the report.
 *
 * Full-page: captures the real scroll container at its full scrollHeight (C8),
 * un-clipping the clone so content below the fold is included — not just the
 * viewport. The widget's own nodes ([data-feedback-widget]) are excluded.
 */
import { resolveCaptureTarget } from './capture-target';

// A PNG data URL over this size is re-encoded as JPEG to respect the 5 MB cap.
const PNG_SIZE_CEILING = 3_500_000;
// Above this rendered height, drop to 1x so we don't blow past canvas limits.
const HIRES_HEIGHT_LIMIT = 3000;

function excludeWidget(node: HTMLElement): boolean {
  // Returning false skips the node and its subtree.
  return !(node?.dataset && 'feedbackWidget' in node.dataset);
}

/** Capture the full page to an image data URL, or null on failure. */
export async function captureScreenshot(): Promise<string | null> {
  if (typeof window === 'undefined') return null;

  try {
    const { toPng, toJpeg } = await import('html-to-image');
    const { element, width, height } = resolveCaptureTarget();

    const opts = {
      filter: excludeWidget as (node: HTMLElement) => boolean,
      cacheBust: true,
      pixelRatio: height > HIRES_HEIGHT_LIMIT ? 1 : Math.min(window.devicePixelRatio || 1, 2),
      backgroundColor: getComputedStyle(document.body).backgroundColor || '#ffffff',
      width,
      height,
      // Un-clip the clone so a scroll container renders its FULL content, not
      // just the visible slice.
      style: {
        overflow: 'visible',
        height: `${height}px`,
        maxHeight: 'none',
        transform: 'none',
      } as Partial<CSSStyleDeclaration> as Record<string, string>,
    };

    let dataUrl = await toPng(element, opts);
    if (dataUrl.length > PNG_SIZE_CEILING) {
      dataUrl = await toJpeg(element, { ...opts, quality: 0.85 });
    }
    return dataUrl;
  } catch {
    return null; // degrade — never block the report on a capture failure
  }
}

/** Convert a captured data URL into an uploadable File. */
export async function dataUrlToFile(dataUrl: string, name: string): Promise<File> {
  const res = await fetch(dataUrl);
  const blob = await res.blob();
  const ext = blob.type === 'image/jpeg' ? 'jpg' : 'png';
  return new File([blob], `${name}.${ext}`, { type: blob.type });
}
