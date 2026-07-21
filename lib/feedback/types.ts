/**
 * Shared shapes for the silent-capture layer. These mirror, verbatim, the JSON
 * columns on the backend `feedback_reports` table — a report ships exactly what
 * the buffers hold, and the triage dashboard reads it back unchanged.
 */

export type ConsoleLevel = 'log' | 'info' | 'warn' | 'error';

export interface ConsoleEntry {
  level: ConsoleLevel;
  /** Defensively serialized args, joined — never the live objects. */
  message: string;
  at: number;
}

export type BreadcrumbKind = 'nav' | 'click';

export interface Breadcrumb {
  kind: BreadcrumbKind;
  /** Human label: a route path (nav) or an element description (click). */
  label: string;
  at: number;
}

export interface NetworkEntry {
  method: string;
  /** Redacted URL — sensitive query-param values stripped (I5). */
  url: string;
  /** null when there was no response at all (network failure / timeout / CORS). */
  status: number | null;
  durationMs: number | null;
  requestId: string | null;
  at: number;
}

/** Everything the capture layer knows right now, assembled at submit time. */
export interface CaptureSnapshot {
  capturedAt: number;
  consoleEntries: ConsoleEntry[];
  network: NetworkEntry[];
  breadcrumbs: Breadcrumb[];
  requestIds: string[];
}

/** A numbered pin dropped on the frozen screenshot. Coords are viewport %. */
export interface Pin {
  selector: string;
  label: string;
  x: number;
  y: number;
}

/** A drag-rectangle annotation. Coords are viewport %. */
export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** One annotated screenshot the widget holds before submit. */
export interface Shot {
  /** Data URL for preview; converted to a File at submit. */
  dataUrl: string;
  source: 'capture' | 'upload';
  pins: Pin[];
  rects: Rect[];
}

export type Severity = 'blocking' | 'annoying' | 'cosmetic' | 'suggestion';
