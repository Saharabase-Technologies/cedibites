/**
 * What the Finance charts share: the scale, the shapes and the quiet colours
 * of the frame. Ported from the review page.
 *
 * A chart is drawn in SVG units, one unit to a pixel at its own width, so the
 * margins and radii below are chart geometry and not page spacing.
 */

/** The room around the plot, for the axis labels. */
export interface Margin {
  left: number;
  right: number;
  top: number;
  bottom: number;
}

/** One line or one set of columns: a value for each category. Null leaves a gap. */
export interface BandSeries {
  name: string;
  colour: string;
  values: (number | null)[];
  /** Columns to draw lighter, for a part month. */
  faded?: boolean[];
  /** Dots to draw hollow, for a part month. */
  hollow?: boolean[];
  /** A colour for each category, where the columns of one series differ. */
  colours?: string[];
}

/** Gridlines sit one step off the card. The axis is a step darker. */
export const GRID = '#ece3d1';
export const AXIS = '#cbbfa8';
/** Axis text. The kit's grey is too pale at this size on the cream card. */
export const AXIS_TEXT = '#6f6353';
export const CROSSHAIR = '#ddd2bd';

/** A chart is never drawn narrower than this. */
export const MIN_WIDTH = 260;
const NARROW = 520;

/** A chart is a little shorter where it is narrow, so it does not fill a phone's screen. */
export const chartHeight = (width: number, base: number): number => (width < NARROW ? Math.round(base * 0.85) : base);

/** Round steps from 0 to just past `max`: 0, 2,500, 5,000 and so on. */
export function niceTicks(max: number, count = 4): number[] {
  if (!(max > 0)) return [0, 1];
  const raw = max / count;
  const magnitude = Math.pow(10, Math.floor(Math.log10(raw)));
  const f = raw / magnitude;
  const step = (f <= 1 ? 1 : f <= 2 ? 2 : f <= 2.5 ? 2.5 : f <= 5 ? 5 : 10) * magnitude;
  const top = Math.ceil(max / step - 1e-9) * step;
  const out: number[] = [];
  for (let v = 0; v <= top + step / 2; v += step) out.push(Math.round(v * 1e6) / 1e6);
  return out;
}

/** A column that stands on the baseline: square at the foot, rounded at the top. */
export function columnPath(x: number, baseline: number, width: number, height: number, radius: number): string {
  if (!(height > 0)) return '';
  const r = Math.min(radius, width / 2, height);
  const top = baseline - height;
  return `M${x},${baseline}V${top + r}Q${x},${top} ${x + r},${top}H${x + width - r}Q${x + width},${top} ${x + width},${top + r}V${baseline}Z`;
}

/** Label every `n`th category, so the labels never touch. */
export const labelStep = (band: number, minPx: number): number => Math.max(1, Math.ceil(minPx / band));
