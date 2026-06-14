// Difficulty progression: the single source of truth for how hard a level is (R1/R2/R3/R4).
//
// Phaser-free / Node-importable: part of the pure generation path, exercised under vitest in node
// and by the offline sweep. Do NOT import Phaser or anything under src/scenes / src/entities.
//
// The shipped director makes the difficulty BANDS (easy/medium/peak) relative WITHIN a level, never
// absolute across levels — so level 40 plays like level 2. This module adds the missing absolute
// ramp: a scalar `d` derived from (levelNumber, difficulty) that the realize layer multiplies into
// its three existing intensity seams (enemy density, threat mix, gap/vertical preference). It does
// NOT change the arc SHAPE (that stays the outline's job) — only HOW MUCH threat each beat realizes.
//
// Curve shape (moderate, long runway):
//   - level 1 is hard-floored to d = 0 at EVERY difficulty tier (a co-op family game must not open
//     on a wall — KTD6/R4);
//   - a soft-start ramp (EASE_POWER) keeps the early levels gentle, reaching "real challenge"
//     (d ~ 0.6-0.85) around levels 8-10 at the Normal tier;
//   - past the knee (d = 1 near level RAMP_LEVELS) a slow creep continues with no hard plateau.
// Menu difficulty enters as a LEVEL OFFSET (Easy shifts the curve later, Hard earlier) rather than a
// slope multiplier, so the tiers feel like "start further along the same curve" (KTD5).
//
// All curve constants live here, named, so the whole game's difficulty tunes in one place.

// --- Curve constants (tuning lives here; the playtest loop adjusts these, U5 profiles them) -------

// The `difficulty` baseline that reproduces today's gentle early-game feel. Matches
// DEFAULT_SETTINGS.difficulty in src/settings.ts.
const NORMAL_DIFFICULTY = 2;
// Each step of `difficulty` away from Normal shifts the ramp by this many levels.
const LEVELS_PER_TIER = 2;
// Levels (at Normal) to reach the knee, where d = 1.
const RAMP_LEVELS = 10;
// >1 makes the pre-knee ramp start gently and steepen toward the knee (soft early game).
const EASE_POWER = 1.6;
// Post-knee slope: a slow continued creep so very-late levels keep getting harder.
const CREEP_SLOPE = 0.35;

// --- Intensity multipliers derived from d --------------------------------------------------------

// Density baseline (>1) raises the floor so even an early peak has more teeth than today's ~4-enemy
// output (R3). It climbs with d. Capped so reroll/degrade pressure stays bounded (KTD7).
const DENSITY_BASE = 1.15;
const DENSITY_SLOPE = 1.6;
const DENSITY_MAX = 3.0;
// Gap-bearing / vertical chunk preference. At d = 0 it is neutral (1); it climbs with d and rides on
// top of the theme's own gapBias in weightedPick.
const GAP_SLOPE = 2.0;
const GAP_MAX = 4.0;
// Additive weight pushed onto the KOOPA entry of the theme enemy-mix as d rises, shifting patrols
// toward the faster threat. NOT bull: a bull needs an authored charge-lane arena, so re-rolling a
// patrol spawn to bull just gets dropped by placement validity (placement.ts). Koopa is the sound
// within-the-patrol-roster threat lever. At d = 0 it is 0 (theme mix unchanged).
const KOOPA_SLOPE = 1.6;

export interface DifficultyParams {
  densityScale: number; // multiply effective enemyDensity by this
  gapWeight: number;    // multiply gap-bearing chunk weight by this (on top of theme gapBias)
  koopaBias: number;    // add this to the koopa weight in the enemy-mix before picking
}

// The no-op params used when no difficulty is supplied (legacy callers + the existing sweep/tests):
// generation stays byte-identical to the pre-ramp generator (R2 regression guard).
export const IDENTITY_PARAMS: DifficultyParams = { densityScale: 1, gapWeight: 1, koopaBias: 0 };

function clamp(v: number, lo: number, hi: number): number {
  return v < lo ? lo : v > hi ? hi : v;
}

/**
 * The absolute difficulty scalar for a level (R1/R2/R4). Pure + deterministic in (levelNumber,
 * difficulty). Returns d >= 0, unbounded above (endless creep). Level 1 is always 0 (the gentle
 * opener floor, KTD6) regardless of tier.
 */
export function difficultyScalar(levelNumber: number, difficulty: number): number {
  if (levelNumber <= 1) return 0;
  const tierShift = (difficulty - NORMAL_DIFFICULTY) * LEVELS_PER_TIER;
  const effProgress = Math.max(0, levelNumber - 1 + tierShift);
  const knee = effProgress / RAMP_LEVELS;
  if (knee <= 1) return Math.pow(knee, EASE_POWER);
  return 1 + (knee - 1) * CREEP_SLOPE;
}

/** Map a difficulty scalar `d` to the concrete intensity multipliers the realize layer applies. */
export function difficultyParams(d: number): DifficultyParams {
  return {
    densityScale: clamp(DENSITY_BASE + d * DENSITY_SLOPE, DENSITY_BASE, DENSITY_MAX),
    gapWeight: clamp(1 + d * GAP_SLOPE, 1, GAP_MAX),
    koopaBias: Math.max(0, d * KOOPA_SLOPE),
  };
}

/**
 * The single entry point the realize layer calls. When `difficulty` is undefined (legacy callers,
 * the existing sweep/tests), returns IDENTITY_PARAMS so output is unchanged. Otherwise returns the
 * level/tier-scaled multipliers.
 */
export function difficultyParamsFor(levelNumber: number, difficulty?: number): DifficultyParams {
  if (difficulty === undefined) return IDENTITY_PARAMS;
  return difficultyParams(difficultyScalar(levelNumber, difficulty));
}
