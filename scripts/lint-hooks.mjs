/**
 * scripts/lint-hooks.mjs
 *
 * Fail the build on React Hook violations, and ONLY those.
 *
 * Why this exists rather than `npm run lint`: the full run reports ~349
 * pre-existing problems (mostly `no-explicit-any` and unused vars). A gate that
 * fails on all of them is a gate nobody can turn on, so it never gets turned on,
 * and the one class of error that actually takes production down keeps shipping.
 *
 * Hook-order bugs have white-screened this app TWICE. They are invisible to
 * `tsc` and to `next build` - both pass happily on code that throws "Rendered
 * more hooks than during the previous render" the moment a component finishes
 * loading. Nothing else catches them.
 *
 * So: everything else stays advisory and gets cleaned up gradually; this one
 * thing is a hard stop from today.
 *
 *   node scripts/lint-hooks.mjs
 */
import { ESLint } from 'eslint';

/*
 * `rules-of-hooks` only, deliberately.
 *
 * It is the one that CRASHES - a hook called conditionally throws on the next
 * render and the route goes white. The rest of the react-hooks family flags
 * real problems (stale closures, effects that loop) but they degrade rather
 * than explode, and there is already one pre-existing `set-state-in-effect` in
 * lib/hooks/usePushNotifications.ts. Including it would make this gate red on
 * day one, and a gate that is red on day one never gets switched on.
 *
 * Widen it once that is cleaned up. Do not widen it before.
 */
const BLOCKING = /^react-hooks\/rules-of-hooks$/;

const eslint = new ESLint();
const results = await eslint.lintFiles(['app/**/*.{ts,tsx}', 'lib/**/*.{ts,tsx}']);

const offences = results.flatMap((result) =>
  result.messages
    .filter((m) => m.ruleId && BLOCKING.test(m.ruleId))
    .map((m) => ({ file: result.filePath, ...m })),
);

if (offences.length === 0) {
  console.log('No React Hook violations.');
  process.exit(0);
}

console.error(`\n${offences.length} React Hook violation(s):\n`);
for (const o of offences) {
  console.error(`  ${o.file}:${o.line}:${o.column}`);
  console.error(`    ${o.message}  [${o.ruleId}]\n`);
}
console.error('These break at runtime and neither tsc nor next build sees them.\n');
process.exit(1);
