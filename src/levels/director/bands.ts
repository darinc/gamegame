// Difficulty bands + the countable-feature verification rubric (KTD9, R3).
//
// Phaser-free and Node-importable: this module is part of the pure generation path and is
// exercised under vitest in a node environment. Do NOT import Phaser or anything under
// src/scenes / src/entities from here.
//
// Difficulty is three COARSE, HAND-SET bands — not a calibrated score (KTD9). The arc is the
// band sequence with a single dominant peak (R2). `scoreBand` below is the *verification*
// rubric: given a realized segment's countable features it returns the band that segment
// actually lands in. It is consumed later by U6/U10 to check that a realized segment matches
// the band the outline asked for (the arc-legibility check) — it never drives selection.

// Band is a string union expressed via a `const` object, matching the TileType / EnemyType
// pattern in src/levels/types.ts (NOT a TS enum — tsconfig forbids erasable-only violations).
export const Band = {
  EASY: 'easy',
  MEDIUM: 'medium',
  PEAK: 'peak',
} as const;

export type Band = typeof Band[keyof typeof Band];

// Ordered easiest -> hardest. Used to compare/clamp bands and to scale curves.
export const BAND_ORDER: readonly Band[] = [Band.EASY, Band.MEDIUM, Band.PEAK];

/** Rank of a band in BAND_ORDER (0 = easy, 2 = peak). */
export function bandRank(band: Band): number {
  return BAND_ORDER.indexOf(band);
}

// Countable features of a realized segment (KTD9). All are simple, observable integer/boolean
// measurements of geometry + entities — nothing calibrated.
export interface SegmentFeatures {
  gapCount: number;      // number of distinct pit gaps the player must clear
  maxGapWidth: number;   // widest single gap, in tiles
  enemyCount: number;    // enemies present in the segment
  maxHeightStep: number; // largest elevation change between adjacent surfaces, in tiles
  lowCeiling: boolean;   // true if the segment has a low-ceiling / ducking-pressure stretch
}

// Verification thresholds (hand-set, documented per KTD9). A segment is scored by the HIGHEST
// band any single feature pushes it into ("the hardest thing in the segment defines its band"),
// which keeps the rubric monotonic: adding threat can only raise a band, never lower it.
//
// PEAK if ANY of:
//   - gapCount    >= 3
//   - maxGapWidth >= 4 tiles
//   - enemyCount  >= 4
//   - maxHeightStep >= 2 tiles AND (a gap OR an enemy is also present)  [compound pressure]
// MEDIUM (when not PEAK) if ANY of:
//   - gapCount    >= 1
//   - maxGapWidth >= 2 tiles
//   - enemyCount  >= 2
//   - maxHeightStep >= 2 tiles
//   - lowCeiling
// EASY otherwise (flat, sparse, low-feature).
export const BAND_THRESHOLDS = {
  peak: {
    gapCount: 3,
    maxGapWidth: 4,
    enemyCount: 4,
    heightStep: 2, // combined with a gap or enemy
  },
  medium: {
    gapCount: 1,
    maxGapWidth: 2,
    enemyCount: 2,
    heightStep: 2,
  },
} as const;

/**
 * Verify which band a realized segment lands in from its countable features (KTD9, R3).
 * Used by U6/U10 to confirm a segment matches the outline's requested band. NOT used for
 * selection. Pure and deterministic.
 */
export function scoreBand(f: SegmentFeatures): Band {
  const p = BAND_THRESHOLDS.peak;
  const m = BAND_THRESHOLDS.medium;

  const peakCompoundStep =
    f.maxHeightStep >= p.heightStep && (f.gapCount > 0 || f.enemyCount > 0);

  if (
    f.gapCount >= p.gapCount ||
    f.maxGapWidth >= p.maxGapWidth ||
    f.enemyCount >= p.enemyCount ||
    peakCompoundStep
  ) {
    return Band.PEAK;
  }

  if (
    f.gapCount >= m.gapCount ||
    f.maxGapWidth >= m.maxGapWidth ||
    f.enemyCount >= m.enemyCount ||
    f.maxHeightStep >= m.heightStep ||
    f.lowCeiling
  ) {
    return Band.MEDIUM;
  }

  return Band.EASY;
}
