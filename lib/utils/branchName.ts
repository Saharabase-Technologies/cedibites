/**
 * What a branch is called when a customer reads it.
 *
 * The database holds the area — "Ashaiman", "Spintex" — because that is what
 * staff say to each other all day. A customer reading "Cooked at Ashaiman" on a
 * receipt is being told a town, not a shop, and a customer told to collect from
 * "Ashaiman" has been given a district of about a quarter of a million people.
 *
 * So the word Branch is added for anything a customer sees. It is not added
 * twice: a branch someone has already named "Ashaiman Branch" stays as it is.
 */
export function branchTitle(name: string | null | undefined): string {
  const trimmed = (name ?? '').trim();
  if (!trimmed) return 'the branch';
  return /\bbranch$/i.test(trimmed) ? trimmed : `${trimmed} Branch`;
}
