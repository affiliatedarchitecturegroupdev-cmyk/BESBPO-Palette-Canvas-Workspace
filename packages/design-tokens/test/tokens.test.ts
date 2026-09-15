/**
 * V2-6.1 visual-language snapshot.
 *
 * The public-surface palette is a fixed contract: the marketing pages and the
 * landing mockup must agree. Asserting the exact values here means a token edit
 * that drifts from the mockup fails a gate instead of shipping quietly.
 */
import { brandRamp, brandDots } from '../src';

const EXPECTED = {
  cobalt: '#4f7dff',
  violet: '#9471cb',
  magenta: '#d66599',
  ink: '#131021',
  raise: '#1c1830',
} as const;

for (const [key, value] of Object.entries(EXPECTED)) {
  const actual = (brandRamp as Record<string, string>)[key];
  if (actual !== value) {
    throw new Error(`brandRamp.${key} drifted from the mockup: expected ${value}, got ${actual}`);
  }
}

if (brandRamp.gradient !== 'linear-gradient(90deg, #4f7dff 0%, #9471cb 50%, #d66599 100%)') {
  throw new Error(`brandRamp.gradient drifted: ${brandRamp.gradient}`);
}

const expectedDots = [EXPECTED.cobalt, EXPECTED.violet, EXPECTED.magenta];
if (JSON.stringify(brandDots) !== JSON.stringify(expectedDots)) {
  throw new Error(`brandDots drifted: ${JSON.stringify(brandDots)}`);
}

// The public ink must stay distinct from the app surface colour, or the
// landing page and the workspace collapse into one another.
const ramp = brandRamp as Record<string, string>;
if (ramp.ink === ramp.raise) {
  throw new Error('brandRamp.ink and brandRamp.raise must differ');
}

console.log('design-token snapshot passed');
