/**
 * The colour of each branch on the Finance charts.
 *
 * Branch is the only thing colour stands for in Finance. A branch keeps its
 * colour on every chart and under every filter, so a reader who learnt that
 * Lakeside is orange is never misled.
 *
 * The three named colours were checked with the dataviz validator on the
 * cream card (`#fffbf3`), for colour blind readers as well. The spare colours
 * are the next slots of the same palette, in its fixed order, and the eight
 * together pass the same check in that order. The aqua, the yellow and the
 * pink are under 3:1 against the card, so a chart that uses them always has a
 * legend and a table beside it.
 */

const NAMED: [name: string, colour: string][] = [
  ['ashaiman', '#2a78d6'],
  ['lakeside', '#eb6834'],
  ['east legon', '#1baf7a'],
];

/** For a branch with no colour of its own, handed out in this order. */
const SPARE = ['#eda100', '#e87ba4', '#008300', '#6250d6', '#e34948'];

/** For a branch past the last spare colour. A ninth hue could not be told from one of the eight. */
export const NO_BRANCH_COLOUR = '#6f6353';

const named = (name: string): string | undefined => {
  const n = name.trim().toLowerCase();
  const exact = NAMED.find(([key]) => key === n);
  return (exact || NAMED.find(([key]) => n.includes(key)))?.[1];
};

/**
 * A colour for every branch, by branch id.
 *
 * Hand it all the branches of the book, not the ones a filter left: the spare
 * colours go out in the order of this list, so a shorter list would repaint
 * the branches that stayed.
 */
export function branchColours(branches: { id: number; name: string }[]): Record<number, string> {
  const colours: Record<number, string> = {};
  let spare = 0;
  for (const b of branches) colours[b.id] = named(b.name) || SPARE[spare++] || NO_BRANCH_COLOUR;
  return colours;
}
