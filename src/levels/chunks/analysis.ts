// Geometry analysis for authored chunks (U6, KTD8/KTD11).
//
// Phaser-free / Node-importable: pure array math over the chunk tile grid. Shared by both the
// chunk annotations (so a chunk's declared band/verticality/lowCeiling/entryHeight/exitHeight is
// derived from — and therefore can't drift from — its actual tiles) and coverage.test.ts (which
// re-derives the same values and asserts the annotations match). One source of truth for "what
// the geometry says" keeps KTD11's metadata-vs-geometry check honest.
//
// Coordinate conventions match the rest of the level format: tiles[y][x], y=0 is the TOP row,
// the bottom row is the floor; "height (tiles from bottom)" of a surface = grid height minus the
// row index of its top solid tile.

import { TileType } from '../types';
import type { LevelChunk, BandName, VerticalityClass } from '../types';
import { scoreBand } from '../director/bands';
import type { SegmentFeatures } from '../director/bands';

// Tiles a player can STAND on / that act as the terrain floor + walls, matching how LevelLoader
// makes tiles collidable as static terrain (GROUND / PLATFORM / PIPE) — see LevelLoader.ts:65-86.
// Used for surface heights, gaps, and the height-step profile.
const SOLID = new Set<number>([TileType.GROUND, TileType.PLATFORM, TileType.PIPE]);

// Tiles that OBSTRUCT headroom above a standing player. Broader than SOLID: bricks and question
// blocks are collidable obstacles you bonk your head on (LevelLoader.ts:60-76), so they form a
// low ceiling even though you can't stand ON them as terrain. Used only by hasLowCeiling — this
// is the set U8's Sky theme-legality filter ("no low ceilings") reasons about.
const CEILING = new Set<number>([
  TileType.GROUND,
  TileType.PLATFORM,
  TileType.PIPE,
  TileType.BRICK,
  TileType.QUESTION,
]);

// Standing body needs ~2 tiles of headroom under the KTD6 no-ducking invariant; a solid tile
// within this distance above a standable surface is a low ceiling.
export const STAND_CLEARANCE_TILES = 2;

/**
 * Height (tiles from bottom) of the contiguous SOLID stack rising from the floor at column
 * `col` — i.e. the standable surface a connector mates to at that edge. This is the "highest
 * solid run at that column" metric KTD11 asserts entryHeight/exitHeight against. A column that
 * is a pit (no floor-connected solid) returns 0.
 */
export function edgeGroundHeight(tiles: number[][], col: number): number {
  let run = 0;
  for (let y = tiles.length - 1; y >= 0; y--) {
    if (SOLID.has(tiles[y][col])) run++;
    else break;
  }
  return run;
}

/** Declared-edge helpers: the left/right standable surface height. */
export function entryGroundHeight(tiles: number[][]): number {
  return edgeGroundHeight(tiles, 0);
}
export function exitGroundHeight(tiles: number[][]): number {
  return edgeGroundHeight(tiles, tiles[0].length - 1);
}

// GROUND-only floor stack from the bottom (PIPE/PLATFORM excluded). Used for the height-step
// feature so a pipe obstacle or a floating platform is NOT read as a terrain elevation change —
// only the actual ground profile counts as a "step".
function groundFloor(tiles: number[][], col: number): number {
  let run = 0;
  for (let y = tiles.length - 1; y >= 0; y--) {
    if (tiles[y][col] === TileType.GROUND) run++;
    else break;
  }
  return run;
}

/**
 * Derive the countable rubric features (KTD9) from a chunk's geometry + its declared enemy
 * count, so `scoreBand(deriveFeatures(chunk))` is the chunk's measured band.
 *
 *   gapCount / maxGapWidth — runs of columns with NO floor-connected solid (true pits).
 *   enemyCount             — declared enemySpawns (a generation-time count, not geometry).
 *   maxHeightStep          — largest GROUND-floor elevation change between adjacent ground
 *                            columns (pipes/platforms excluded so they don't inflate it).
 *   lowCeiling             — any standable surface with a solid tile within STAND_CLEARANCE above.
 */
export function deriveFeatures(chunk: LevelChunk): SegmentFeatures {
  const tiles = chunk.tiles;
  const w = tiles[0].length;

  // Pits: contiguous columns with no solid stack at all.
  let gapCount = 0;
  let maxGapWidth = 0;
  let cur = 0;
  for (let x = 0; x < w; x++) {
    if (edgeGroundHeight(tiles, x) === 0) {
      cur++;
    } else if (cur > 0) {
      gapCount++;
      maxGapWidth = Math.max(maxGapWidth, cur);
      cur = 0;
    } else {
      cur = 0;
    }
  }
  if (cur > 0) {
    gapCount++;
    maxGapWidth = Math.max(maxGapWidth, cur);
  }

  // Ground-floor height steps between adjacent ground columns (reset across pits).
  let maxHeightStep = 0;
  let prev: number | null = null;
  for (let x = 0; x < w; x++) {
    const g = groundFloor(tiles, x);
    if (g > 0) {
      if (prev !== null) maxHeightStep = Math.max(maxHeightStep, Math.abs(g - prev));
      prev = g;
    } else {
      prev = null;
    }
  }

  return {
    gapCount,
    maxGapWidth,
    enemyCount: chunk.enemySpawns?.length ?? 0,
    maxHeightStep,
    lowCeiling: hasLowCeiling(tiles),
  };
}

/** True if any standable surface has a solid tile within STAND_CLEARANCE_TILES above it. */
export function hasLowCeiling(tiles: number[][]): boolean {
  const h = tiles.length;
  const w = tiles[0].length;
  for (let x = 0; x < w; x++) {
    const run = edgeGroundHeight(tiles, x);
    if (run === 0) continue;
    const surfaceTopRow = h - run; // row index just above the floor stack (the standing foot row)
    for (let dy = 1; dy <= STAND_CLEARANCE_TILES; dy++) {
      const ry = surfaceTopRow - dy;
      if (ry >= 0 && CEILING.has(tiles[ry][x])) return true;
    }
  }
  return false;
}

/** The chunk's measured difficulty band (KTD9 rubric over its geometry). */
export function deriveBand(chunk: LevelChunk): BandName {
  return scoreBand(deriveFeatures(chunk));
}

/**
 * The chunk's verticality class from geometry: the effective vertical traversal it demands,
 * taken as the larger of the ground-floor step within the chunk and the entry->exit edge delta.
 *   0 tiles      -> flat
 *   1-2 tiles    -> stepped
 *   >=3 tiles    -> high
 */
export function deriveVerticality(chunk: LevelChunk): VerticalityClass {
  const f = deriveFeatures(chunk);
  const edgeDelta = Math.abs(entryGroundHeight(chunk.tiles) - exitGroundHeight(chunk.tiles));
  const effective = Math.max(f.maxHeightStep, edgeDelta);
  if (effective === 0) return 'flat';
  if (effective >= 3) return 'high';
  return 'stepped';
}
