// ChunkRealizer — the Phase 1 BeatRealizer backed by the authored chunk pool (U5, R4, R5, KTD8).
//
// Phaser-free / Node-importable. Realizes a beat by selecting an in-range authored chunk matching
// its (band x verticality) cell, applying deterministic transforms (mirror / height-shift /
// enemy-swap), and returning a RealizedSegment (edge profile + semantic placements).
//
// THEME RECIPE (U8, KTD14, R14). The beat carries a theme STRING KEY; the realizer looks up its
// structural recipe (themes.ts getThemeRecipe) and lets the THEME constrain + bias selection:
//   - legality: a theme with allowsLowCeiling=false (Sky) REJECTS low-ceiling chunks outright,
//     regardless of band/verticality tags.
//   - ceilingPressure: 'high' (Cavern) biases the weighted pick toward low-ceiling candidates;
//     'none' (Sky) away from them.
//   - gapBias: >1 (Sky) biases the pick toward gap-bearing chunks (longer gaps); <1 toward solid.
//   - enemyMix / enemyDensity: weight enemy-type swaps and thin/thicken the roster.
// THEME-VS-BAND PRECEDENCE: when legality + the relaxation ladder re-target to a nearer achievable
// band, the THEME wins and the realized segment records its ACHIEVED band (RealizedSegment.
// achievedBand) so any arc-legibility check reads the achieved band, not the requested one.
//
// Empty-cell FALLBACK LADDER (KTD8), applied deterministically:
//   1. exact (band x verticality), theme-legal
//   2. relax verticality: high -> stepped -> flat (same band)
//   3. relax band by one: peak -> medium -> easy (re-walking verticality at each)
//   4. trivial flat traversal filler (a short flat ground run) — NEVER throws.
//
// Selection uses an rng FORK keyed by the beat index so it is stable regardless of how many draws
// sibling beats make (KTD3).

import { TileType, EnemyType } from '../types';
import type { LevelChunk, BandName, VerticalityClass } from '../types';
import { allChunks } from '../chunks';
import { deriveFeatures } from '../chunks/analysis';
import { Band, BAND_ORDER, bandRank } from '../director/bands';
import type { Beat } from '../director/outline';
import { getThemeRecipe } from '../themes';
import type { Theme } from '../themes';
import { IDENTITY_PARAMS } from '../director/difficulty';
import type { DifficultyParams } from '../director/difficulty';
import type { Rng } from '../rng';
import type {
  BeatRealizer,
  RealizeContext,
  RealizedSegment,
  PlacementRequest,
} from './BeatRealizer';
import {
  stampChunk,
  shiftToMateEntry,
  clampShiftToGrid,
  mirrorChunk,
  enemySwapChunk,
} from './transforms';

// Verticality relax order (most -> least demanding).
const VERTICALITY_RELAX: Record<VerticalityClass, VerticalityClass[]> = {
  high: ['high', 'stepped', 'flat'],
  stepped: ['stepped', 'flat'],
  flat: ['flat'],
};

const chunkBand = (c: LevelChunk): BandName => c.band ?? 'easy';
const chunkVert = (c: LevelChunk): VerticalityClass => c.verticality ?? 'flat';
const chunkLowCeiling = (c: LevelChunk): boolean => c.lowCeiling ?? false;
const chunkHasGap = (c: LevelChunk): boolean => deriveFeatures(c).gapCount > 0;

/**
 * Theme-legality predicate (U8, KTD14/R14): driven by the theme RECIPE, not the name string. A
 * theme whose recipe forbids low ceilings (allowsLowCeiling=false — the open Sky theme) rejects any
 * low-ceiling chunk regardless of its band/verticality tags. Unknown theme keys resolve to the
 * neutral baseline recipe (allowsLowCeiling=true), so non-theme placeholders accept all chunks.
 */
export function isChunkThemeLegal(chunk: LevelChunk, theme: string): boolean {
  const recipe = getThemeRecipe(theme);
  if (!recipe.allowsLowCeiling && chunkLowCeiling(chunk)) return false;
  return true;
}

/** Candidate chunks for a (band x verticality) cell that are theme-legal. */
function candidatesFor(band: BandName, vert: VerticalityClass, theme: string): LevelChunk[] {
  return allChunks.filter(
    (c) => chunkBand(c) === band && chunkVert(c) === vert && isChunkThemeLegal(c, theme)
  );
}

export interface ChunkSelection {
  chunk: LevelChunk;
  rung: 'exact' | 'relax-verticality' | 'relax-band' | 'filler';
  // The band the chosen chunk actually realizes at (its own annotation) — the ACHIEVED band for
  // theme-vs-band precedence (KTD14). On the 'exact'/'relax-verticality' rungs this equals the
  // requested band; on 'relax-band' it is the easier band the theme/pool re-targeted to.
  achievedBand: BandName;
}

// A lookup of candidate chunks for a (band x verticality x theme) cell. Injectable so the fallback
// ladder can be unit-tested with a starved pool (forcing the filler rung) without touching the real
// chunk pool. Defaults to the real, theme-filtered pool.
export type CandidateLookup = (
  band: BandName,
  vert: VerticalityClass,
  theme: string
) => LevelChunk[];

const realCandidates: CandidateLookup = candidatesFor;

/**
 * Fold the absolute-difficulty multipliers (U1) into an EFFECTIVE theme recipe so the existing
 * selection/placement consumers scale without new code paths:
 *   - gapWeight   rides on gapBias        -> weightedPick prefers gap-bearing chunks more strongly;
 *   - densityScale rides on enemyDensity  -> placementsFor thickens the roster;
 *   - koopaBias   adds to the koopa mix   -> patrols lean toward the faster threat (bull is left
 *                                            alone — it needs an authored arena; only bias koopa if
 *                                            the theme already includes it, preserving theme identity
 *                                            like Sky's bull-free roster).
 * With IDENTITY_PARAMS every factor is a numeric no-op (x*1, x+0), so the effective recipe is
 * value-identical to the base and generation stays byte-identical (R2 regression guard).
 */
export function applyDifficulty(recipe: Theme, params: DifficultyParams): Theme {
  const mix = recipe.enemyMix;
  const koopa = mix[EnemyType.KOOPA];
  return {
    ...recipe,
    gapBias: recipe.gapBias * params.gapWeight,
    enemyDensity: recipe.enemyDensity * params.densityScale,
    enemyMix: koopa !== undefined
      ? { ...mix, [EnemyType.KOOPA]: koopa + params.koopaBias }
      : mix,
  };
}

/**
 * Theme-biased weighted pick among legal candidates. Each candidate starts at weight 1 and is
 * scaled by the theme recipe so the structural archetype reads through selection (KTD14/R14):
 *   - ceilingPressure 'high' favors low-ceiling chunks (Cavern crowds the player with roofs);
 *     'none' avoids them (handled already by legality, this just de-prioritizes any that slip in).
 *   - gapBias > 1 favors gap-bearing chunks (Sky's longer gaps); < 1 favors solid ground.
 * Weights are clamped positive so every legal candidate stays selectable (no starvation). Pure +
 * deterministic given `rng`.
 */
function weightedPick(cands: LevelChunk[], recipe: Theme, rng: Rng): LevelChunk {
  if (cands.length === 1) return cands[0];
  const weights = cands.map((c) => {
    let w = 1;
    if (chunkLowCeiling(c)) {
      if (recipe.ceilingPressure === 'high') w *= 2.5;
      else if (recipe.ceilingPressure === 'none') w *= 0.4;
    }
    if (chunkHasGap(c)) {
      w *= recipe.gapBias;
    }
    return Math.max(0.0001, w);
  });
  const total = weights.reduce((s, w) => s + w, 0);
  let roll = rng.next() * total;
  for (let i = 0; i < cands.length; i++) {
    roll -= weights[i];
    if (roll < 0) return cands[i];
  }
  return cands[cands.length - 1];
}

/**
 * Walk the fallback ladder to choose a chunk for a (band x verticality x theme) request. Pure +
 * deterministic given `rng`. Returns a filler sentinel (chunk omitted) as the terminal rung. The
 * theme recipe biases the within-cell pick (ceilingPressure / gapBias) without changing the ladder
 * order — legality already partitioned the pool per theme.
 */
export function selectChunk(
  band: BandName,
  vert: VerticalityClass,
  theme: string,
  rng: Rng,
  lookup: CandidateLookup = realCandidates,
  // Optional EFFECTIVE recipe (difficulty-scaled gapBias/ceilingPressure). When omitted, the theme's
  // own recipe is used so callers/tests that don't scale behave exactly as before.
  recipeOverride?: Theme
): ChunkSelection | { rung: 'filler' } {
  const recipe = recipeOverride ?? getThemeRecipe(theme);

  // 1. exact cell.
  let cands = lookup(band, vert, theme);
  if (cands.length > 0) return { chunk: weightedPick(cands, recipe, rng), rung: 'exact', achievedBand: band };

  // 2. relax verticality within the same band (achieved band unchanged).
  for (const v of VERTICALITY_RELAX[vert]) {
    if (v === vert) continue;
    cands = lookup(band, v, theme);
    if (cands.length > 0) {
      return { chunk: weightedPick(cands, recipe, rng), rung: 'relax-verticality', achievedBand: band };
    }
  }

  // 3. relax band by one toward easier, re-walking verticality at each band. THEME WINS (KTD14):
  // the achieved band is the easier band we actually found a legal chunk in.
  for (let r = bandRank(band) - 1; r >= 0; r--) {
    const b = BAND_ORDER[r];
    for (const v of VERTICALITY_RELAX[vert]) {
      cands = lookup(b, v, theme);
      if (cands.length > 0) {
        return { chunk: weightedPick(cands, recipe, rng), rung: 'relax-band', achievedBand: b };
      }
    }
  }

  // 4. filler.
  return { rung: 'filler' };
}

// A short flat ground run used as the terminal filler segment (KTD8 rung 4). Width is modest so the
// arc isn't visibly broken; the floor sits at the target ground row via the connector mate.
const FILLER_WIDTH = 8;

function buildFiller(ctx: RealizeContext): RealizedSegment {
  const { gridHeight, targetGroundRow } = ctx;
  const tiles: number[][] = [];
  for (let y = 0; y < gridHeight; y++) tiles.push(new Array<number>(FILLER_WIDTH).fill(TileType.EMPTY));
  for (let col = 0; col < FILLER_WIDTH; col++) {
    for (let y = targetGroundRow + 1; y < gridHeight; y++) tiles[y][col] = TileType.GROUND;
  }
  return {
    tiles,
    width: FILLER_WIDTH,
    entryGroundRow: targetGroundRow,
    exitGroundRow: targetGroundRow,
    entryEdgeOpen: false,
    exitEdgeOpen: false,
    placements: [],
    source: 'filler',
    achievedBand: 'easy', // a flat run is an easy segment
  };
}

/** Weighted enemy-type pick from the theme's enemy-mix (U7 will use this fully; KTD14). */
function pickEnemyType(mix: Partial<Record<EnemyType, number>>, rng: Rng): EnemyType {
  const entries = (Object.entries(mix) as [EnemyType, number][]).filter(([, w]) => w > 0);
  if (entries.length === 0) return EnemyType.GOOMBA;
  const total = entries.reduce((s, [, w]) => s + w, 0);
  let roll = rng.next() * total;
  for (const [type, w] of entries) {
    roll -= w;
    if (roll < 0) return type;
  }
  return entries[entries.length - 1][0];
}

/**
 * Build the semantic placement requests for a stamped chunk: enemies (patrol vs charger by type),
 * coins (route vs cache by reward kind), and question tiles (content decided here for KTD4
 * determinism). All coords are SEGMENT-LOCAL grid coords.
 *
 * Enemy density (U8, KTD14): the theme's enemyDensity thins (<1) or thickens (>1) the roster. A
 * thickened enemy may spawn a sibling one column over (placement.ts re-validates and drops any that
 * don't fit, so duplicates never break solvability). Non-charger enemy TYPES are re-rolled from the
 * theme enemy-mix; bulls (chargers) are left in place (their arena geometry is authored for them).
 */
function placementsFor(
  chunk: LevelChunk,
  stamp: ReturnType<typeof stampChunk>,
  recipe: Theme,
  rng: Rng
): PlacementRequest[] {
  const out: PlacementRequest[] = [];

  const density = recipe.enemyDensity;
  for (const e of stamp.enemySpawns) {
    const isBull = e.type === EnemyType.BULL;
    // Thin the roster when density < 1 (never drops bulls — they anchor a set-piece beat).
    if (!isBull && density < 1 && !rng.chance(density)) continue;

    const enemyType = isBull ? EnemyType.BULL : pickEnemyType(recipe.enemyMix, rng);
    const baseCol = Math.round(e.x);
    const baseRow = Math.round(e.y);
    out.push({
      kind: 'enemy',
      enemyType,
      atCol: baseCol,
      atRow: baseRow,
      role: isBull ? 'charger' : 'patrol',
    });

    // Thicken when density > 1: add a sibling near a non-bull enemy with the surplus probability.
    if (!isBull && density > 1 && rng.chance(density - 1)) {
      out.push({
        kind: 'enemy',
        enemyType: pickEnemyType(recipe.enemyMix, rng),
        atCol: baseCol + 1,
        atRow: baseRow,
        role: 'patrol',
      });
    }
  }

  if (stamp.coinSpawns.length > 0) {
    const kind = chunk.reward === 'hidden-cache' ? 'cache' : 'coin-route';
    out.push({
      kind,
      cells: stamp.coinSpawns.map((c) => ({ col: c.x, row: c.y })),
    });
  }

  for (const q of stamp.questionCells) {
    // Decide content deterministically at generation time (KTD4): a power-up with modest odds.
    out.push({
      kind: 'question',
      atCol: q.col,
      atRow: q.row,
      containsPowerUp: rng.chance(0.35),
    });
  }

  return out;
}

export class ChunkRealizer implements BeatRealizer {
  realize(beat: Beat, ctx: RealizeContext): RealizedSegment {
    // Scale the theme recipe by the level's absolute difficulty (identity when none supplied), then
    // feed the SAME effective recipe to both selection (gap bias) and placement (density + mix).
    const recipe = applyDifficulty(getThemeRecipe(ctx.theme), ctx.difficulty ?? IDENTITY_PARAMS);
    const sel = selectChunk(
      beat.band as BandName, beat.verticality, ctx.theme, ctx.rng, realCandidates, recipe
    );
    if (!('chunk' in sel)) {
      return buildFiller(ctx);
    }

    let chunk = sel.chunk;
    // Deterministic transforms. Mirror first (it swaps edges), then enemy-swap. Both are stable on
    // the per-beat fork.
    if (ctx.rng.chance(0.5)) chunk = mirrorChunk(chunk);
    if (ctx.rng.chance(0.5)) chunk = enemySwapChunk(chunk);

    // Height-shift to mate the chunk's entry edge to the target ground row (clamped on-grid).
    const wantShift = shiftToMateEntry(chunk, ctx.gridHeight, ctx.targetGroundRow);
    const shift = clampShiftToGrid(chunk, ctx.gridHeight, wantShift);
    const stamp = stampChunk(chunk, ctx.gridHeight, shift);

    return {
      tiles: stamp.tiles,
      width: stamp.width,
      entryGroundRow: stamp.entryGroundRow,
      exitGroundRow: stamp.exitGroundRow,
      entryEdgeOpen: stamp.entryEdgeOpen,
      exitEdgeOpen: stamp.exitEdgeOpen,
      placements: placementsFor(chunk, stamp, recipe, ctx.rng),
      source: chunk.name,
      reward: chunk.reward,
      achievedBand: sel.achievedBand,
    };
  }
}

// Re-export Band for tests that want to construct beats by band name.
export { Band };
