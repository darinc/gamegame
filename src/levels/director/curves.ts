// Curve-archetype vocabulary: the named pacing shapes the director chooses between (KTD1, R2).
//
// Phaser-free / Node-importable (pure generation path).
//
// Each archetype is a single-dominant-peak band sequence (R2/AE1): warmup -> rising action ->
// ONE 'peak' climax -> resolution. The base sequences below are authored at a canonical length
// and then SCALED to the level's actual beat count by `bandSequenceFor`, which preserves the
// single-peak invariant (it stretches the easy/medium shoulders, never duplicates the peak).
//
// Determinism note: this module is data + pure functions. Selection (which archetype a level
// uses, and the previous-level exclusion) lives in outline.ts.

import { Band } from './bands';
import type { Band as BandT } from './bands';

export interface CurveArchetype {
  name: string;
  // Canonical band shape. MUST contain exactly one 'peak' (the dominant climax). The first
  // entry is the warmup, the last is the resolution.
  base: readonly BandT[];
}

// --- The vocabulary -------------------------------------------------------------------------
// Every shape below has exactly ONE 'peak' band (asserted in curves.test.ts). The peak sits at
// a different relative position per archetype, which is what makes consecutive levels feel
// shaped differently even before geometry exists.

// classic: gentle build to a centered climax, then ease off.
const classic: CurveArchetype = {
  name: 'classic',
  base: [Band.EASY, Band.EASY, Band.MEDIUM, Band.PEAK, Band.MEDIUM, Band.EASY],
};

// double-hump: a medium false-summit, a dip, then the real single peak. Still ONE 'peak' band;
// the first hump tops out at 'medium' so the climax stays singular.
const doubleHump: CurveArchetype = {
  name: 'double-hump',
  base: [Band.EASY, Band.MEDIUM, Band.EASY, Band.MEDIUM, Band.PEAK, Band.EASY],
};

// slow-burn: a long, patient rise to a late peak with a very short resolution.
const slowBurn: CurveArchetype = {
  name: 'slow-burn',
  base: [Band.EASY, Band.EASY, Band.MEDIUM, Band.MEDIUM, Band.PEAK, Band.MEDIUM],
};

// front-loaded: hits the peak early, then a long wind-down (a "boss-up-front" shape).
const frontLoaded: CurveArchetype = {
  name: 'front-loaded',
  base: [Band.MEDIUM, Band.PEAK, Band.MEDIUM, Band.EASY, Band.EASY, Band.EASY],
};

// plateau: rises and holds at medium with a single brief spike, then settles.
const plateau: CurveArchetype = {
  name: 'plateau',
  base: [Band.EASY, Band.MEDIUM, Band.MEDIUM, Band.PEAK, Band.MEDIUM, Band.MEDIUM],
};

// gentle-opener: the canonical LEVEL 1 shape (KTD10) — a family co-op game should not open on a
// peak, so this archetype has NO 'peak' band at all. It is excluded from normal selection and
// only used for levelNumber === 1.
const gentleOpener: CurveArchetype = {
  name: 'gentle-opener',
  base: [Band.EASY, Band.EASY, Band.EASY, Band.MEDIUM, Band.EASY, Band.EASY],
};

// Normal selectable archetypes (every one has a single 'peak'). gentle-opener is intentionally
// NOT in this list — it is the level-1-only opener.
export const CURVE_ARCHETYPES: readonly CurveArchetype[] = [
  classic,
  doubleHump,
  slowBurn,
  frontLoaded,
  plateau,
];

// The designated gentle level-1 opener (KTD10): no 'peak' band.
export const GENTLE_OPENER: CurveArchetype = gentleOpener;

/** Names of the normally selectable archetypes (excludes the gentle opener). */
export const ARCHETYPE_NAMES: readonly string[] = CURVE_ARCHETYPES.map((a) => a.name);

/** Look up an archetype by name (including the gentle opener); undefined if unknown. */
export function archetypeByName(name: string): CurveArchetype | undefined {
  if (name === GENTLE_OPENER.name) return GENTLE_OPENER;
  return CURVE_ARCHETYPES.find((a) => a.name === name);
}

/** Index of the single dominant peak in an archetype's base sequence. */
function peakIndex(base: readonly BandT[]): number {
  return base.indexOf(Band.PEAK);
}

/**
 * Scale an archetype's base shape to exactly `beatCount` bands while preserving its single-peak
 * shape. The peak stays a single beat at its proportional position; the easy/medium shoulders
 * are stretched or compressed around it by nearest-source sampling. For an archetype with no
 * peak (the gentle opener) the proportional resampling still applies — there is simply no peak
 * to protect — so the result also has no peak.
 *
 * Guarantees:
 *   - output length === beatCount
 *   - if the base had exactly one 'peak', the output has exactly one 'peak'
 *   - if the base had no 'peak', the output has no 'peak'
 */
export function bandSequenceFor(archetype: CurveArchetype, beatCount: number): BandT[] {
  const base = archetype.base;
  const n = Math.max(1, Math.floor(beatCount));

  // Resample the base shape to length n by proportional nearest-source mapping.
  const out: BandT[] = [];
  for (let i = 0; i < n; i++) {
    // Map output slot i to the proportionally-closest source slot.
    const src = n === 1 ? 0 : Math.round((i * (base.length - 1)) / (n - 1));
    out[i] = base[src];
  }

  const srcPeak = peakIndex(base);
  if (srcPeak < 0) {
    // No peak in the source (gentle opener) — resampling can't introduce one, return as is.
    return out;
  }

  // Protect the single-peak invariant. Proportional sampling can either drop the peak entirely
  // (when n < base.length and the peak slot is skipped) or — never, since 'peak' appears once —
  // duplicate it. Force EXACTLY one peak at the proportional peak position.
  const destPeak = n === 1 ? 0 : clamp(Math.round((srcPeak * (n - 1)) / (base.length - 1)), 0, n - 1);

  for (let i = 0; i < n; i++) {
    if (out[i] === Band.PEAK && i !== destPeak) {
      // Demote any stray sampled peak to medium (a peak should never be a shoulder).
      out[i] = Band.MEDIUM;
    }
  }
  // Ensure the designated peak slot is the peak.
  out[destPeak] = Band.PEAK;
  return out;
}

function clamp(v: number, lo: number, hi: number): number {
  return v < lo ? lo : v > hi ? hi : v;
}
