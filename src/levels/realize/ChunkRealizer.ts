// ChunkRealizer — the Phase 1 BeatRealizer backed by the authored chunk pool (U5, R4, R5, KTD8).
//
// Phaser-free / Node-importable. Realizes a beat by selecting an in-range authored chunk matching
// its (band x verticality) cell, applying deterministic transforms (mirror / height-shift /
// enemy-swap), and returning a RealizedSegment (edge profile + semantic placements).
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
import { Band, BAND_ORDER, bandRank } from '../director/bands';
import type { Beat } from '../director/outline';
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

/**
 * Theme-legality predicate (U5 simple form; U8 will drive it from the theme recipe). A "sky"-class
 * theme forbids low-ceiling chunks (no roofs in the sky). Real themes today are cosmetic, so this
 * is a no-op for them and exists to be unit-tested + extended by U8.
 */
export function isChunkThemeLegal(chunk: LevelChunk, theme: string): boolean {
  const t = theme.toLowerCase();
  const skyLike = t.includes('sky');
  if (skyLike && chunkLowCeiling(chunk)) return false;
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
 * Walk the fallback ladder to choose a chunk for a (band x verticality x theme) request. Pure +
 * deterministic given `rng`. Returns a filler sentinel (chunk omitted) as the terminal rung.
 */
export function selectChunk(
  band: BandName,
  vert: VerticalityClass,
  theme: string,
  rng: import('../rng').Rng,
  lookup: CandidateLookup = realCandidates
): ChunkSelection | { rung: 'filler' } {
  // 1. exact cell.
  let cands = lookup(band, vert, theme);
  if (cands.length > 0) return { chunk: rng.pick(cands), rung: 'exact' };

  // 2. relax verticality within the same band.
  for (const v of VERTICALITY_RELAX[vert]) {
    if (v === vert) continue;
    cands = lookup(band, v, theme);
    if (cands.length > 0) return { chunk: rng.pick(cands), rung: 'relax-verticality' };
  }

  // 3. relax band by one toward easier, re-walking verticality at each band.
  for (let r = bandRank(band) - 1; r >= 0; r--) {
    const b = BAND_ORDER[r];
    for (const v of VERTICALITY_RELAX[vert]) {
      cands = lookup(b, v, theme);
      if (cands.length > 0) return { chunk: rng.pick(cands), rung: 'relax-band' };
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
  };
}

/**
 * Build the semantic placement requests for a stamped chunk: enemies (patrol vs charger by type),
 * coins (route vs cache by reward kind), and question tiles (content decided here for KTD4
 * determinism). All coords are SEGMENT-LOCAL grid coords.
 */
function placementsFor(
  chunk: LevelChunk,
  stamp: ReturnType<typeof stampChunk>,
  rng: import('../rng').Rng
): PlacementRequest[] {
  const out: PlacementRequest[] = [];

  for (const e of stamp.enemySpawns) {
    out.push({
      kind: 'enemy',
      enemyType: e.type ?? EnemyType.GOOMBA,
      atCol: Math.round(e.x),
      atRow: Math.round(e.y),
      role: e.type === EnemyType.BULL ? 'charger' : 'patrol',
    });
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
    const sel = selectChunk(beat.band as BandName, beat.verticality, ctx.theme, ctx.rng);
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
      placements: placementsFor(chunk, stamp, ctx.rng),
      source: chunk.name,
      reward: chunk.reward,
    };
  }
}

// Re-export Band for tests that want to construct beats by band name.
export { Band };
