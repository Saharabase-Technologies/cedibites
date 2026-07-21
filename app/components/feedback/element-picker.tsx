'use client';

/**
 * Figma-style element picker. Overlays the live page; hovering highlights the
 * real element under the cursor, clicking drops a numbered pin that records the
 * element's CSS selector + label (not just a dot on a picture). Pins are stored
 * PAGE-relative (percent of the full scroll content) so they map onto the
 * full-page screenshot and survive rescaling.
 *
 * The overlay is pointer-events:none, so the page scrolls normally — you can
 * scroll to reach below-the-fold elements, and pins re-anchor to content as you
 * scroll. The overlay carries [data-feedback-widget] so it's excluded from
 * capture and from pin/hover hit-testing.
 */
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { buildCssSelector, describeElement } from '@/lib/feedback';
import {
  resolveCaptureTarget,
  clientToPagePercent,
  pagePercentToClient,
  type CaptureTarget,
} from '@/lib/feedback/capture-target';
import type { Pin } from '@/lib/feedback/types';

export function ElementPicker({
  pins,
  onPin,
  onDone,
}: {
  pins: Pin[];
  onPin: (pin: Pin) => void;
  onDone: () => void;
}) {
  // Resolve the capture frame once — not on every scroll-driven re-render.
  const targetRef = useRef<CaptureTarget | null>(null);
  if (!targetRef.current) targetRef.current = resolveCaptureTarget();
  const target = targetRef.current;

  const [hover, setHover] = useState<DOMRect | null>(null);
  const [, setTick] = useState(0); // bumped on scroll to re-anchor pins

  useEffect(() => {
    const insideWidget = (el: Element | null) => !!el?.closest?.('[data-feedback-widget]');

    const onMove = (e: MouseEvent) => {
      const el = e.target as Element | null;
      setHover(el && !insideWidget(el) ? el.getBoundingClientRect() : null);
    };
    const onClick = (e: MouseEvent) => {
      const el = e.target as Element | null;
      if (!el || insideWidget(el)) return; // ignore clicks on our own UI
      const pct = clientToPagePercent(e.clientX, e.clientY, target);
      onPin({ selector: buildCssSelector(el), label: describeElement(el), x: pct.x, y: pct.y });
    };
    const onScroll = () => setTick((t) => t + 1);
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onDone();

    // Overlay is pointer-events:none, so e.target is the real page element.
    document.addEventListener('mousemove', onMove, true);
    document.addEventListener('click', onClick, true);
    window.addEventListener('scroll', onScroll, true); // capture: also catches container scroll
    window.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousemove', onMove, true);
      document.removeEventListener('click', onClick, true);
      window.removeEventListener('scroll', onScroll, true);
      window.removeEventListener('keydown', onKey);
    };
  }, [onPin, onDone, target]);

  return createPortal(
    <div
      data-feedback-widget
      style={{ position: 'fixed', inset: 0, zIndex: 2147483000, pointerEvents: 'none', cursor: 'crosshair' }}
    >
      {/* Hover highlight */}
      {hover && (
        <div
          style={{
            position: 'fixed',
            left: hover.left,
            top: hover.top,
            width: hover.width,
            height: hover.height,
            border: '2px solid #e49925',
            background: 'rgba(228,153,37,0.12)',
            borderRadius: 4,
          }}
        />
      )}

      {/* Dropped pins — re-anchored to content position each scroll */}
      {pins.map((p, i) => {
        const v = pagePercentToClient(p.x, p.y, target);
        return (
          <div
            key={i}
            style={{
              position: 'fixed',
              left: v.x,
              top: v.y,
              transform: 'translate(-50%, -50%)',
              width: 26,
              height: 26,
              borderRadius: '50%',
              background: '#e49925',
              color: '#fff',
              fontSize: 13,
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 2px 6px rgba(0,0,0,0.3)',
            }}
          >
            {i + 1}
          </div>
        );
      })}

      {/* Instruction bar — the one interactive part of the overlay */}
      <div
        data-feedback-widget
        style={{
          position: 'fixed',
          bottom: 24,
          left: '50%',
          transform: 'translateX(-50%)',
          display: 'flex',
          alignItems: 'center',
          gap: 16,
          padding: '10px 16px',
          borderRadius: 999,
          background: '#1d1a16',
          color: '#fbf6ed',
          fontSize: 14,
          fontFamily: 'system-ui, sans-serif',
          boxShadow: '0 6px 24px rgba(0,0,0,0.35)',
          pointerEvents: 'auto',
        }}
      >
        <span>Scroll and click anything to pin it{pins.length ? ` · ${pins.length} pinned` : ''}</span>
        <button
          type="button"
          onClick={onDone}
          style={{
            background: '#e49925',
            color: '#fff',
            border: 'none',
            borderRadius: 999,
            padding: '6px 16px',
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          Done
        </button>
      </div>
    </div>,
    document.body,
  );
}
