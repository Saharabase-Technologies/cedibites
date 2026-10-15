/**
 * Copy the Google fonts the app uses into the repo, once, so `next build`
 * never asks Google for anything.
 *
 * Why: Google Fonts sometimes answers with a font link of another shape,
 * `fonts.gstatic.com/l/font?kit=...&skey=...&v=v20`. Next's Turbopack font
 * loader (16.1.6, and still on canary in October 2026) parses its own query
 * string with that link inside, splits on the `&`, and fails the build with
 * "next/font/google queries have exactly one entry". The webpack loader fails
 * on the same link because it expects a file extension. Measured from the
 * server on 2026-10-15: one request in eight came back that way, and each
 * build makes five, so about half of all deploys failed.
 *
 * What it writes, the same as next/font/google produced at build time:
 *  - public/fonts/google/*.woff2, every subset Google serves (each one loads
 *    only when a page uses a character in its range);
 *  - app/fonts/google-fonts.css, the @font-face rules, the size-adjusted
 *    fallback faces, and the --font-* variables;
 *  - app/fonts/google-fonts-preload.ts, the latin files to preload.
 *
 * Run it only when a font, weight or style changes: `node scripts/fetch-google-fonts.mjs`.
 * Google's request URL and the fallback metrics come from Next's own helpers.
 */
import { createRequire } from 'node:module';
import { mkdir, writeFile, readdir, unlink } from 'node:fs/promises';
import path from 'node:path';

const require = createRequire(import.meta.url);
const { getGoogleFontsUrl } = require('next/dist/compiled/@next/font/dist/google/get-google-fonts-url');
const { getFontAxes } = require('next/dist/compiled/@next/font/dist/google/get-font-axes');
const { getFallbackFontOverrideMetrics } = require('next/dist/compiled/@next/font/dist/google/get-fallback-font-override-metrics');

/** The same options the layouts gave next/font/google. `group` says which layout preloads it. */
const FONTS = [
  { family: 'Caprasimo', weights: ['400'], styles: ['normal'], variable: '--font-caprasimo', group: 'root' },
  { family: 'Cabin', weights: ['400', '500', '600', '700'], styles: ['normal', 'italic'], variable: '--font-cabin', group: 'root' },
  { family: 'Manrope', weights: ['400', '500', '600', '700', '800'], styles: ['normal'], variable: '--font-manrope', group: 'root' },
  { family: 'Montserrat', weights: ['400', '500', '600', '700', '800'], styles: ['normal'], variable: '--font-montserrat', group: 'root' },
  { family: 'Inter', weights: ['400', '500', '600', '700'], styles: ['normal'], variable: '--font-inter', group: 'inventory' },
];

// The user agent next/font sends, so Google answers with woff2.
const USER_AGENT = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/104.0.0.0 Safari/537.36';
const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')), '..');
const FONT_DIR = path.join(ROOT, 'public', 'fonts', 'google');
const PUBLIC_PATH = '/fonts/google';

async function get(url) {
  const res = await fetch(url, { headers: { 'User-Agent': USER_AGENT } });
  if (!res.ok) throw new Error(`${res.status} from ${url}`);
  return res;
}

/** Google's CSS, asked again until every link is the ordinary /s/ kind. */
async function stylesheet(url) {
  for (let attempt = 1; attempt <= 12; attempt++) {
    const css = await (await get(url)).text();
    if (!css.includes('fonts.gstatic.com/l/')) return css;
    console.log(`  odd links from Google on attempt ${attempt}, asking again`);
  }
  throw new Error(`Google kept answering with /l/font links for ${url}`);
}

const fontFaces = [];
const fallbacks = [];
const variables = [];
const preload = { root: [], inventory: [] };
const kept = new Set();

await mkdir(FONT_DIR, { recursive: true });

for (const font of FONTS) {
  const url = getGoogleFontsUrl(font.family, getFontAxes(font.family, font.weights, font.styles, undefined), 'swap');
  console.log(`${font.family}: ${url}`);
  let css = await stylesheet(url);

  // Each subset's file, downloaded once, named by its Google path so a new
  // version is a new file and an old one can be cached for good.
  const blocks = [...css.matchAll(/\/\* ([a-z0-9-]+) \*\/\s*@font-face\s*\{[^}]*?url\((https:\/\/fonts\.gstatic\.com\/s\/[^)]+)\)[^}]*\}/g)];
  for (const [, subset, fontUrl] of blocks) {
    const [, slug, version, file] = new URL(fontUrl).pathname.match(/^\/s\/([^/]+)\/([^/]+)\/(.+)$/);
    const name = `${slug}-${version}-${file}`;
    if (!kept.has(name)) {
      kept.add(name);
      await writeFile(path.join(FONT_DIR, name), Buffer.from(await (await get(fontUrl)).arrayBuffer()));
    }
    css = css.replaceAll(fontUrl, `${PUBLIC_PATH}/${name}`);
    if (subset === 'latin' && !preload[font.group].includes(`${PUBLIC_PATH}/${name}`)) {
      preload[font.group].push(`${PUBLIC_PATH}/${name}`);
    }
  }
  fontFaces.push(css.trim());

  const m = getFallbackFontOverrideMetrics(font.family);
  fallbacks.push(`@font-face {
  font-family: '${font.family} Fallback';
  src: local("${m.fallbackFont}");
  ascent-override: ${m.ascentOverride};
  descent-override: ${m.descentOverride};
  line-gap-override: ${m.lineGapOverride};
  size-adjust: ${m.sizeAdjust};
}`);
  variables.push(`  ${font.variable}: '${font.family}', '${font.family} Fallback';`);
}

// Files from an older run that nothing points to any more.
for (const file of await readdir(FONT_DIR)) {
  if (!kept.has(file)) await unlink(path.join(FONT_DIR, file));
}

const header = '/* Generated by scripts/fetch-google-fonts.mjs. Do not edit by hand: run the script. */\n';
await writeFile(
  path.join(ROOT, 'app', 'fonts', 'google-fonts.css'),
  `${header}\n${fontFaces.join('\n\n')}\n\n${fallbacks.join('\n\n')}\n\n:root {\n${variables.join('\n')}\n}\n`,
);
await writeFile(
  path.join(ROOT, 'app', 'fonts', 'google-fonts-preload.ts'),
  `// Generated by scripts/fetch-google-fonts.mjs. Do not edit by hand: run the script.\n\n`
    + `/** The latin file of each self-hosted Google font, preloaded by the layout that uses it. */\n`
    + `export const GOOGLE_FONT_PRELOADS = ${JSON.stringify(preload, null, 2).replace(/"/g, "'")} as const;\n`,
);
console.log(`${kept.size} files in public/fonts/google`);
