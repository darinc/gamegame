// The outline layer of the outline-first director (KTD1, R1, R2, R3).
//
// Phaser-free / Node-importable: pure generation path, exercised under vitest in node. Do NOT
// import Phaser or anything under src/scenes / src/entities.
//
// An Outline is the explicit pacing artifact built BEFORE any geometry (KTD1, R1): a curve
// archetype sampled into an ordered beat sequence with a single dominant peak (R2). Geometry
// realization is U5/U9 — this module produces NO tiles.
//
// Determinism + variation (KTD10, R2): an outline is a pure function of (rng, levelNumber).
// The `rng` passed here is the BASE-seed Rng (i.e. `new Rng(seed)`), not a per-level Rng — this
// is what lets the director STATELESSLY recompute the *previous* level's archetype+climax to
// exclude back-to-back reruns (see selectArchetype). Per-level substreams are forked internally.

import { Band, bandRank } from './bands';
import type { Band as BandT } from './bands';
import { CURVE_ARCHETYPES, GENTLE_OPENER, bandSequenceFor } from './curves';
import type { CurveArchetype } from './curves';
import { getThemeRecipe } from '../themes';
import type { CeilingPressure } from '../themes';
import type { Rng } from '../rng';
import type { VerticalityClass } from '../types';

// --- Public types ---------------------------------------------------------------------------

export type Role = 'traversal' | 'combat' | 'reward' | 'setpiece';

// VerticalityClass's string-union type lives in src/levels/types.ts (so the chunk pool can
// annotate against it without an import cycle); re-exported here as the director's canonical name.
export type { VerticalityClass } from '../types';

export interface Beat {
  index: number;
  band: BandT;
  role: Role;
  mechanic?: string; // optional hint for the realizer; undefined when the beat has no special mechanic
  verticality: VerticalityClass;
  theme: string;
}

export interface Outline {
  levelNumber: number;
  theme: string;
  widthTiles: number;
  archetype: string;
  beats: Beat[];
}

// --- Bounds (documented; flow-analysis M3/M4) -----------------------------------------------
// Beat count is bounded so warmup / rise / peak / resolution stay distinct AND the reserved
// start/end zones fit. Width is bounded so the smallest level still has room for >=4
// distinguishable bands plus the reserved zones.

export const MIN_BEATS = 6;
export const MAX_BEATS = 9;
export const MIN_WIDTH_TILES = 280;
export const MAX_WIDTH_TILES = 340;
export const START_RESERVE_TILES = 18; // ~15-20 tile spawn warmup zone reserved at the start
export const END_RESERVE_TILES = 18; // ~15-20 tile exit/landing zone reserved at the end

// --- Roles & mechanics --------------------------------------------------------------------
// Role is assigned from the beat's band + position so the arc reads as a designed sequence
// rather than a random bag: easy beats traverse, mid beats fight, the peak is a set-piece,
// reward beats sit on the downslope. Mechanic is an optional realizer hint keyed off role/band.

const MECHANIC_BY_ROLE: Record<Role, readonly string[]> = {
  traversal: ['gap-run', 'platform-hop', 'stair-climb'],
  combat: ['goomba-line', 'mixed-skirmish', 'koopa-patrol'],
  reward: ['coin-route', 'hidden-cache', 'risk-reward-path'],
  setpiece: ['bull-arena', 'gauntlet'],
};

function roleForBeat(band: BandT, index: number, total: number, isClimax: boolean): Role {
  if (isClimax) return 'setpiece';
  if (band === Band.PEAK) return 'setpiece';
  if (band === Band.MEDIUM) return 'combat';
  // Easy beats: the post-climax downslope carries the reward beat; otherwise traverse.
  if (index > total / 2) return 'reward';
  return 'traversal';
}

function verticalityForBeat(rng: Rng, band: BandT, ceilingPressure: CeilingPressure): VerticalityClass {
  // Harder bands lean more vertical; easy beats stay mostly flat. Probabilities are coarse and
  // hand-set (KTD9 spirit) — verticality granularity is flat/stepped/high (Open Questions).
  //
  // The theme's ceilingPressure (U8, KTD14) nudges the roll: 'high' (Cavern) shifts toward more
  // vertical/low beats, 'none' (Sky) toward flatter/open beats. The shift is applied to the roll
  // so easy never reaches 'high' (preserving the director's emitted-cell matrix) — it only moves
  // weight between flat<->stepped and stepped<->high.
  const rank = bandRank(band); // 0 easy, 1 medium, 2 peak
  // bias > 0 pushes toward flatter (lower the roll's effective threshold-clearing); we instead
  // shift the roll itself: subtract for 'high' (more likely to exceed flat thresholds), add for
  // 'none' (more likely to stay flat).
  const shift = ceilingPressure === 'high' ? -0.2 : ceilingPressure === 'none' ? 0.2 : 0;
  const roll = Math.min(0.999, Math.max(0, rng.next() + shift));
  if (rank === 0) return roll < 0.7 ? 'flat' : 'stepped';
  if (rank === 1) return roll < 0.45 ? 'flat' : roll < 0.85 ? 'stepped' : 'high';
  return roll < 0.5 ? 'stepped' : 'high';
}

function mechanicForBeat(rng: Rng, role: Role, band: BandT): string | undefined {
  // Easy traversal beats sometimes carry no special mechanic (undefined) — the outline must be
  // able to express "plain traversal" so realization stays honest (test asserts undefined is
  // representable).
  if (role === 'traversal' && band === Band.EASY && rng.chance(0.5)) return undefined;
  return rng.pick(MECHANIC_BY_ROLE[role]);
}

// --- Archetype selection with stateless previous-level exclusion (KTD10, R2) ----------------

/**
 * The archetype a given level uses, computed purely from the base `rng` + level number. Because
 * it is a pure function of (rng, levelNumber), the director can recompute ANY level's archetype
 * on demand — that is how the previous-level exclusion stays stateless and survives a mid-run
 * reload (KTD10).
 *
 * Level 1 always returns the gentle opener (no peak archetype) — a family co-op game should not
 * open on a peak (KTD10). For level N>1 the choice excludes the archetype level N-1 would
 * produce (recomputed via this same function), so no two back-to-back levels rerun the same
 * curve shape AND climax (R2).
 */
export function selectArchetype(rng: Rng, levelNumber: number): CurveArchetype {
  if (levelNumber <= 1) return GENTLE_OPENER;

  // Walk forward from level 1, carrying the previous level's archetype so each level can exclude
  // it (KTD10). This is the iterative form of the previous-level recompute — it produces the EXACT
  // same sequence as the old recursion but uses O(1) stack instead of O(levelNumber), so an
  // endless run can never overflow the call stack (the recursion crashed around level 4798).
  let prevName = GENTLE_OPENER.name; // level 1
  let current = GENTLE_OPENER;
  for (let n = 2; n <= levelNumber; n++) {
    // Candidate pool excludes the previous archetype. (Level 2's prev is the gentle opener, which
    // is not in CURVE_ARCHETYPES, so the pool is the full vocabulary there.)
    const pool = CURVE_ARCHETYPES.filter((a) => a.name !== prevName);
    const candidates = pool.length > 0 ? pool : CURVE_ARCHETYPES;
    // Independent per-level stream so adding/removing a draw elsewhere can't shift this choice.
    current = rng.fork(`curve:level:${n}`).pick(candidates);
    prevName = current.name;
  }
  return current;
}

// --- Width & beat count -------------------------------------------------------------------

function deriveWidth(rng: Rng, levelNumber: number): number {
  const w = rng.fork(`width:level:${levelNumber}`);
  return w.rangeInt(MIN_WIDTH_TILES, MAX_WIDTH_TILES);
}

function deriveBeatCount(rng: Rng, levelNumber: number): number {
  const b = rng.fork(`beatcount:level:${levelNumber}`);
  return b.rangeInt(MIN_BEATS, MAX_BEATS);
}

// --- The outline derivation ---------------------------------------------------------------

/**
 * Derive an explicit outline for `levelNumber` from the BASE-seed `rng` (KTD1, R1, R2, R3).
 * Produces a curve archetype + ordered beats; every beat carries band, role, an optional
 * mechanic hint, verticality, and the theme. No geometry is produced (that is U5/U9).
 *
 * `rng` MUST be the base-seed Rng (e.g. `new Rng(seed)`) so the previous-level exclusion
 * recompute (selectArchetype) is consistent with what level N-1 actually produced.
 */
export function deriveOutline(rng: Rng, levelNumber: number, theme: string): Outline {
  const archetype = selectArchetype(rng, levelNumber);
  const widthTiles = deriveWidth(rng, levelNumber);
  const beatCount = deriveBeatCount(rng, levelNumber);

  const bands = bandSequenceFor(archetype, beatCount);

  // The climax beat is the single 'peak' (if any). For the gentle opener there is no peak, so
  // the climax index is -1 and no beat is marked a forced set-piece climax.
  const climaxIndex = bands.indexOf(Band.PEAK);

  // Per-level stream for per-beat detail draws (verticality, mechanic) — independent from the
  // archetype/width/count streams so they don't desync each other (KTD3).
  const beatRng = rng.fork(`beats:level:${levelNumber}`);

  // The theme recipe (KTD14) biases verticality toward / away from vertical+low-ceiling beats.
  const ceilingPressure = getThemeRecipe(theme).ceilingPressure;

  const beats: Beat[] = bands.map((band, index) => {
    const isClimax = index === climaxIndex;
    const role = roleForBeat(band, index, bands.length, isClimax);
    const verticality = verticalityForBeat(beatRng, band, ceilingPressure);
    const mechanic = mechanicForBeat(beatRng, role, band);
    return { index, band, role, mechanic, verticality, theme };
  });

  return {
    levelNumber,
    theme,
    widthTiles,
    archetype: archetype.name,
    beats,
  };
}
