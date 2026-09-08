/**
 * The app's own toast.
 *
 * What this replaces was a stub that had been left in place: `bg-green-600`,
 * `bg-red-600`, `bg-blue-600`, `bg-yellow-600` straight off Tailwind's default
 * palette, pinned to the top right, with a comment saying it could be swapped
 * for react-hot-toast one day. Four colours the brand does not contain, in the
 * one corner of a phone a thumb cannot reach, over the header.
 *
 * Two constraints shaped what replaced it.
 *
 * **It is appended to `document.body`, which is outside `.cb-customer`.** The
 * role tokens are declared on that wrapper, so `bg-surface` here would resolve
 * to the staff foundation on a customer screen and quietly be the wrong colour.
 * Everything below is therefore literal rather than tokenised. That is the
 * exception, and this comment is the reason for it.
 *
 * **It is shared.** Sixty-odd call sites across the POS, the kitchen, inventory,
 * admin and the customer app. So it is the one thing both worlds already agree
 * on: dark chrome with white type, which is what the tab bar and the brand's own
 * artwork run on. It reads as deliberate on a warm staff screen and on the
 * customer's mono ground.
 *
 * Bottom centre, clear of the tab bar and the home indicator, because that is
 * where a thumb is and because the top of the screen is where the branch chip,
 * the cart and the notch already are.
 */

type ToastType = 'success' | 'error' | 'info' | 'warning';

interface ToastOptions {
  duration?: number;
}

/** The one accent per type. Green confirms, red is a failure, yellow warns. */
const ACCENT: Record<ToastType, string> = {
  success: '#8fa84e',
  error: '#e5484d',
  warning: '#efa52e',
  info: '#ffffff',
};

const SURFACE = '#17181a';
const ANIMATION_MS = 180;

class ToastManager {
  private container: HTMLDivElement | null = null;

  private reducedMotion(): boolean {
    return typeof window !== 'undefined'
      && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }

  private getContainer(): HTMLDivElement {
    if (this.container && this.container.isConnected) return this.container;

    const el = document.createElement('div');
    el.style.cssText = [
      'position:fixed',
      'left:50%',
      'transform:translateX(-50%)',
      // Above the tab bar where there is one, above the home indicator where
      // there is not. `env()` is 0px on a device without either.
      'bottom:calc(var(--tabbar-h, 0px) + env(safe-area-inset-bottom, 0px) + 16px)',
      'z-index:9999',
      'display:flex',
      'flex-direction:column',
      'gap:8px',
      'align-items:center',
      'width:calc(100% - 32px)',
      'max-width:30rem',
      // The stack must never swallow taps meant for the page underneath it.
      // Each toast turns pointer events back on for itself.
      'pointer-events:none',
    ].join(';');

    // Cart writes report failures through here — "could not add that", "could
    // not remove that" — so the message has to reach a screen reader as well as
    // the screen. Polite rather than assertive: it should not cut across
    // whatever is being read, it just needs to arrive.
    el.setAttribute('role', 'status');
    el.setAttribute('aria-live', 'polite');

    document.body.appendChild(el);
    this.container = el;
    return el;
  }

  private show(message: string, type: ToastType, options: ToastOptions = {}) {
    if (typeof document === 'undefined') return;

    const { duration = 3600 } = options;
    const container = this.getContainer();
    const instant = this.reducedMotion();

    const toast = document.createElement('div');
    toast.style.cssText = [
      'display:flex',
      'align-items:flex-start',
      'gap:11px',
      'width:100%',
      'box-sizing:border-box',
      'padding:15px 17px',
      'border-radius:12px',
      `background:${SURFACE}`,
      'color:#ffffff',
      'font-size:15px',
      'font-weight:600',
      'line-height:1.45',
      'text-align:left',
      'box-shadow:0 10px 30px -8px rgb(0 0 0 / 0.45)',
      'pointer-events:auto',
      'cursor:pointer',
      instant ? 'opacity:1' : 'opacity:0',
      instant ? 'transform:none' : 'transform:translateY(10px)',
      instant ? '' : `transition:opacity ${ANIMATION_MS}ms ease-out, transform ${ANIMATION_MS}ms ease-out`,
    ].filter(Boolean).join(';');

    // A square, not a dot. Nothing in the brand's artwork is a circle, and the
    // open/closed marks and the live order dot are squares already.
    const mark = document.createElement('span');
    mark.setAttribute('aria-hidden', 'true');
    mark.style.cssText = [
      'flex:0 0 auto',
      'width:9px',
      'height:9px',
      'margin-top:7px',
      'border-radius:2px',
      `background:${ACCENT[type]}`,
    ].join(';');

    const text = document.createElement('span');
    text.style.cssText = 'min-width:0;flex:1 1 auto;overflow-wrap:anywhere';
    // textContent, never innerHTML: these strings carry API error messages.
    text.textContent = message;

    toast.append(mark, text);
    container.appendChild(toast);

    let done = false;
    const dismiss = () => {
      if (done) return;
      done = true;
      window.clearTimeout(timer);

      const remove = () => {
        toast.remove();
        // Two toasts expiring together used to race here: the second removeChild
        // threw because the first had already torn the container off the body.
        if (container.children.length === 0) {
          container.remove();
          if (this.container === container) this.container = null;
        }
      };

      if (instant) { remove(); return; }
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(10px)';
      window.setTimeout(remove, ANIMATION_MS);
    };

    // Tap to get rid of it. A message that will not go away is an obstacle.
    toast.addEventListener('click', dismiss);

    if (!instant) {
      requestAnimationFrame(() => {
        toast.style.opacity = '1';
        toast.style.transform = 'translateY(0)';
      });
    }

    const timer = window.setTimeout(dismiss, duration);
  }

  success(message: string, options?: ToastOptions) {
    this.show(message, 'success', options);
  }

  error(message: string, options?: ToastOptions) {
    this.show(message, 'error', options);
  }

  info(message: string, options?: ToastOptions) {
    this.show(message, 'info', options);
  }

  warning(message: string, options?: ToastOptions) {
    this.show(message, 'warning', options);
  }
}

export const toast = new ToastManager();
