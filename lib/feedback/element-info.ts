/**
 * Element identity — two consumers: the click breadcrumb trail (labels) and the
 * widget's pins (which element in code).
 *
 * I5 (structural privacy): we record WHAT an element is — its test-id, aria
 * label, or field *kind* — never WHAT was typed into it. Input values are never
 * read.
 */

const MAX_TEXT = 60;

function fieldKind(el: HTMLElement): string | null {
  const tag = el.tagName.toLowerCase();
  if (tag === 'input') {
    const type = (el as HTMLInputElement).type || 'text';
    return `input[${type}]`;
  }
  if (tag === 'textarea') return 'textarea';
  if (tag === 'select') return 'select';
  return null;
}

/**
 * Human-readable label for an element, in priority order:
 * test-id → aria-label → field kind (never the value) → visible text (capped).
 */
export function describeElement(el: Element | null): string {
  if (!el || !(el instanceof HTMLElement)) return 'unknown';

  const testId = el.getAttribute('data-testid');
  if (testId) return `@${testId}`;

  const aria = el.getAttribute('aria-label');
  if (aria) return aria.slice(0, MAX_TEXT);

  const kind = fieldKind(el);
  if (kind) {
    // A label or placeholder describes the field without leaking its value.
    const name = el.getAttribute('name') || el.getAttribute('placeholder');
    return name ? `${kind} ${name}`.slice(0, MAX_TEXT) : kind;
  }

  const text = (el.textContent || '').trim().replace(/\s+/g, ' ');
  if (text) return text.slice(0, MAX_TEXT);

  return el.tagName.toLowerCase();
}

/**
 * Best-effort CSS selector: `#id` or `[data-testid]` when present, else a short
 * (≤4-level) nth-of-type path anchored at the nearest stable ancestor. Good
 * enough to find the element in devtools — not a guaranteed unique locator.
 */
export function buildCssSelector(el: Element | null): string {
  if (!el || !(el instanceof HTMLElement)) return '';

  if (el.id) return `#${CSS.escape(el.id)}`;
  const testId = el.getAttribute('data-testid');
  if (testId) return `[data-testid="${testId}"]`;

  const parts: string[] = [];
  let node: HTMLElement | null = el;
  let depth = 0;

  while (node && depth < 4 && node.tagName.toLowerCase() !== 'body') {
    if (node.id) {
      parts.unshift(`#${CSS.escape(node.id)}`);
      break;
    }
    const testIdAncestor = node.getAttribute('data-testid');
    if (testIdAncestor) {
      parts.unshift(`[data-testid="${testIdAncestor}"]`);
      break;
    }

    const tag = node.tagName.toLowerCase();
    const parent: HTMLElement | null = node.parentElement;
    if (parent) {
      const siblings = Array.from(parent.children).filter(
        (c) => c.tagName === node!.tagName,
      );
      if (siblings.length > 1) {
        const idx = siblings.indexOf(node) + 1;
        parts.unshift(`${tag}:nth-of-type(${idx})`);
      } else {
        parts.unshift(tag);
      }
    } else {
      parts.unshift(tag);
    }

    node = parent;
    depth += 1;
  }

  return parts.join(' > ');
}
