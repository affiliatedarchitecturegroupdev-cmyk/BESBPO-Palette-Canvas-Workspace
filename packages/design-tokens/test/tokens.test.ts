/**
 * V2-6.1 visual-language snapshot.
 *
 * The public-surface palette is a fixed contract. The authoritative source is
 * the logo mark supplied in the specification package, so rather than asserting
 * hexes against a copy of themselves this test reads the shipped SVG and checks
 * the tokens agree with it. A token edit that drifts from the real logo, or a
 * logo swap the tokens do not follow, fails a gate instead of shipping.
 */
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { brandRamp, brandDots, brandDotsCompact } from '../src';

const EXPECTED = {
  accent: '#4f7dff',
  indigo: '#7876e0',
  violet: '#9471cb',
  mauve: '#ba6aae',
  pink: '#cd67a0',
  magenta: '#d66599',
  ink: '#131021',
  raise: '#1c1830',
} as const;

for (const [key, value] of Object.entries(EXPECTED)) {
  const actual = (brandRamp as Record<string, string>)[key];
  if (actual !== value) {
    throw new Error(`brandRamp.${key} drifted from the logo: expected ${value}, got ${actual}`);
  }
}

const EXPECTED_GRADIENT =
  'linear-gradient(90deg, #7876e0 0%, #9471cb 25%, #ba6aae 50%, #cd67a0 75%, #d66599 100%)';
if (brandRamp.gradient !== EXPECTED_GRADIENT) {
  throw new Error(`brandRamp.gradient drifted: ${brandRamp.gradient}`);
}

// The mark is a five-dot ramp plus a separate accent centre. Collapsing it back
// to a three-stop accent gradient is the specific regression that shipped once.
const rampDots = [
  EXPECTED.indigo,
  EXPECTED.violet,
  EXPECTED.mauve,
  EXPECTED.pink,
  EXPECTED.magenta,
];
if (brandDots.length !== 5) {
  throw new Error(`brandDots must be the five-stop ramp, got ${brandDots.length}`);
}
if (JSON.stringify(brandDots) !== JSON.stringify(rampDots)) {
  throw new Error(`brandDots drifted: ${JSON.stringify(brandDots)}`);
}
const compact = [EXPECTED.indigo, EXPECTED.mauve, EXPECTED.magenta];
if (JSON.stringify(brandDotsCompact) !== JSON.stringify(compact)) {
  throw new Error(`brandDotsCompact drifted: ${JSON.stringify(brandDotsCompact)}`);
}

// Bind the tokens to the authoritative asset: every fill in the shipped mark
// must be a colour the ramp actually declares. Locate the asset by walking up
// from here rather than by a fixed relative depth, so this still resolves after
// compilation moves the file under .test-dist/.
const REL = join('apps', 'web', 'public', 'brand', 'palette-canvas-logo-mark.svg');
function findUp(rel: string): string {
  let dir = __dirname;
  for (;;) {
    const candidate = join(dir, rel);
    if (existsSync(candidate)) return candidate;
    const parent = dirname(dir);
    if (parent === dir) throw new Error(`could not locate ${rel} above ${__dirname}`);
    dir = parent;
  }
}
const mark = readFileSync(findUp(REL), 'utf8');
const fills = [...mark.matchAll(/fill="(#[0-9a-f]{6})"/gi)].map((m) => m[1].toLowerCase());
if (fills.length === 0) {
  throw new Error('logo mark has no hex fills — asset missing or reworded');
}
const declared = new Set(Object.values(EXPECTED).map((v) => v.toLowerCase()));
for (const fill of fills) {
  if (!declared.has(fill)) {
    throw new Error(`logo mark uses ${fill}, which brandRamp does not declare`);
  }
}

// The ramp must actually be represented in the mark. Indigo and magenta are the
// two ends of the gradient; losing either means the mark fell back to accents.
for (const required of [EXPECTED.indigo, EXPECTED.magenta, EXPECTED.accent]) {
  if (!fills.includes(required)) {
    throw new Error(`logo mark is missing ${required}`);
  }
}

// The public ink must stay distinct from the app surface colour, or the
// landing page and the workspace collapse into one another.
const ramp = brandRamp as Record<string, string>;
if (ramp.ink === ramp.raise) {
  throw new Error('brandRamp.ink and brandRamp.raise must differ');
}

console.log(`design-token snapshot passed (${fills.length} mark fills verified)`);