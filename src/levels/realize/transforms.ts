// Pure chunk transforms + the chunk->segment stamp (U5, R5).
//
// Phaser-free / Node-importable. Each transform preserves the metadata contract: a mirror swaps
// the entry/exit edges, a height-shift moves the whole stamp (entry/exit move together), an
// enemy-swap only relabels enemy types. None mutate their input chunk.
//
// Coordinate conventions match the level format: tiles[row][col], row 0 is the TOP, the bottom
// row is the floor. A chunk's `entryHeight`/`exitHeight` are "tiles from bottom" of the standable
// surface; the FOOT row a player stands on at that edge is `gridHeight - 1 - height` (the EMPTY
// cell directly above the top solid tile). The stamp bottom-aligns the chunk into the full grid
// height, matching HybridGenerator.placeChunk (offsetY = gridHeight - chunkHeight).

import { TileType, EnemyType } from '../types';
import type { LevelChunk, SpawnPoint, CoinSpawn } from '../types';
import type { Rng } from '../rng';

/** Foot row (grid row) of a standable surface that sits `heightFromBottom` tiles up. */
export function footRowForHeight(gridHeight: number, heightFromBottom: number): number {
  // Top solid row = gridHeight - heightFromBottom; the foot cell is the EMPTY cell above it.
  return gridHeight - heightFromBottom - 1;
}

/** Deep-copy a 2D tile grid. */
export function cloneTiles(tiles: number[][]): number[][] {
  return tiles.map((row) => row.slice());
}

/**
 * Horizontally mirror a chunk in place over a copy: reverse every row, swap entry/exit heights,
 * and reflect coin/enemy column coordinates. Verticality/band/lowCeiling are mirror-invariant.
 */
export function mirrorChunk(chunk: LevelChunk): LevelChunk {
  const w = chunk.width;
  const tiles = chunk.tiles.map((row) => row.slice().reverse());

  const reflectCol = (x: number): number => w - 1 - x;

  const coinSpawns: CoinSpawn[] | undefined = chunk.coinSpawns?.map((c) => ({
    x: reflectCol(c.x),
    y: c.y,
  }));
  const enemySpawns: SpawnPoint[] | undefined = chunk.enemySpawns?.map((e) => ({
    x: reflectCol(e.x),
    y: e.y,
    type: e.type,
  }));

  return {
    ...chunk,
    name: `${chunk.name}_mirror`,
    tiles,
    entryHeight: chunk.exitHeight,
    exitHeight: chunk.entryHeight,
    coinSpawns,
    enemySpawns,
  };
}

/**
 * Swap GOOMBA<->KOOPA in a chunk's enemy spawns (R5 reskin/enemy-swap). BULL is left untouched
 * (a charger is a set-piece, not a patrol-class swap). Returns the chunk unchanged if it has no
 * swappable enemies.
 */
export function enemySwapChunk(chunk: LevelChunk): LevelChunk {
  if (!chunk.enemySpawns || chunk.enemySpawns.length === 0) return chunk;
  let changed = false;
  const enemySpawns = chunk.enemySpawns.map((e) => {
    if (e.type === EnemyType.GOOMBA) {
      changed = true;
      return { ...e, type: EnemyType.KOOPA };
    }
    if (e.type === EnemyType.KOOPA) {
      changed = true;
      return { ...e, type: EnemyType.GOOMBA };
    }
    return { ...e };
  });
  if (!changed) return chunk;
  return { ...chunk, name: `${chunk.name}_swap`, enemySpawns };
}

export interface StampResult {
  tiles: number[][]; // full grid-height stamp (EMPTY outside the chunk body)
  width: number;
  entryGroundRow: number; // grid foot row at the left edge (after shift)
  exitGroundRow: number; // grid foot row at the right edge (after shift)
  entryEdgeOpen: boolean;
  exitEdgeOpen: boolean;
  coinSpawns: CoinSpawn[]; // segment-local {x: col, y: grid row}
  enemySpawns: SpawnPoint[]; // segment-local {x: col, y: grid row}
  questionCells: { col: number; row: number }[]; // QUESTION tiles, segment-local grid coords
}

/**
 * Stamp a chunk into a full-height (gridHeight) segment grid, bottom-aligned, then HEIGHT-SHIFT it
 * vertically by `shift` rows (shift>0 moves the whole stamp UP — raises the surface; shift<0 moves
 * it DOWN). The shift mates the chunk's entry edge toward a target ground row without changing the
 * chunk's internal geometry. Rows pushed off the top/bottom are clipped (callers keep shifts small
 * so the floor stays inside the grid). Coin/enemy/question coords are shifted with the tiles.
 *
 * The returned entry/exit ground rows are derived from the chunk's declared edge heights so they
 * stay the single source of truth (KTD11): a flat chunk's edges are constant; an edge whose floor
 * stack is 0 (a pit) is reported as `*EdgeOpen`.
 */
export function stampChunk(chunk: LevelChunk, gridHeight: number, shift: number): StampResult {
  const chunkHeight = chunk.tiles.length;
  const baseOffsetY = gridHeight - chunkHeight; // bottom-align (HybridGenerator.placeChunk)
  const offsetY = baseOffsetY - shift; // shift>0 raises (smaller row index)

  const tiles: number[][] = [];
  for (let y = 0; y < gridHeight; y++) tiles.push(new Array<number>(chunk.width).fill(TileType.EMPTY));

  for (let y = 0; y < chunkHeight; y++) {
    const gy = offsetY + y;
    if (gy < 0 || gy >= gridHeight) continue; // clipped
    for (let x = 0; x < chunk.width; x++) {
      const tile = chunk.tiles[y][x];
      if (tile !== TileType.EMPTY) tiles[gy][x] = tile;
    }
  }

  const coinSpawns: CoinSpawn[] = (chunk.coinSpawns ?? []).map((c) => ({
    x: c.x,
    y: c.y + offsetY,
  }));
  const enemySpawns: SpawnPoint[] = (chunk.enemySpawns ?? []).map((e) => ({
    x: e.x,
    y: e.y + offsetY,
    type: e.type,
  }));

  const questionCells: { col: number; row: number }[] = [];
  for (let y = 0; y < gridHeight; y++) {
    for (let x = 0; x < chunk.width; x++) {
      if (tiles[y][x] === TileType.QUESTION) questionCells.push({ col: x, row: y });
    }
  }

  // Edge ground rows from declared heights, then shifted. height===0 means an open (pit) edge.
  const entryEdgeOpen = chunk.entryHeight <= 0;
  const exitEdgeOpen = chunk.exitHeight <= 0;
  const entryGroundRow = footRowForHeight(gridHeight, chunk.entryHeight) - shift;
  const exitGroundRow = footRowForHeight(gridHeight, chunk.exitHeight) - shift;

  return {
    tiles,
    width: chunk.width,
    entryGroundRow,
    exitGroundRow,
    entryEdgeOpen,
    exitEdgeOpen,
    coinSpawns,
    enemySpawns,
    questionCells,
  };
}

/**
 * The vertical shift (rows) that lands a chunk's ENTRY foot edge on `targetFootRow`. Positive =
 * raise. Clamped by the caller via `clampShiftToGrid` so the floor never clips off-grid.
 */
export function shiftToMateEntry(chunk: LevelChunk, gridHeight: number, targetFootRow: number): number {
  const naturalEntryFoot = footRowForHeight(gridHeight, chunk.entryHeight);
  // raising by `shift` makes the foot row = naturalEntryFoot - shift; solve for shift.
  return naturalEntryFoot - targetFootRow;
}

/**
 * Clamp a height-shift so the chunk body stays fully inside the grid (no clipped floor/ceiling).
 * Returns the largest-magnitude shift in [requested] direction that keeps every solid row on-grid.
 */
export function clampShiftToGrid(chunk: LevelChunk, gridHeight: number, shift: number): number {
  const chunkHeight = chunk.tiles.length;
  const baseOffsetY = gridHeight - chunkHeight;
  // offsetY = baseOffsetY - shift must keep [offsetY, offsetY+chunkHeight) within [0, gridHeight).
  // offsetY >= 0  => shift <= baseOffsetY ; offsetY+chunkHeight <= gridHeight => shift >= 0... but
  // a chunk already at bottom (baseOffsetY) only has headroom to move UP. Allow down only if there
  // is room below (there usually isn't — chunks are bottom-aligned). So shift in [0, baseOffsetY].
  const maxUp = baseOffsetY; // moving up reduces offsetY toward 0
  if (shift < 0) return 0; // never sink the floor below the grid bottom
  return Math.min(shift, maxUp);
}

// Re-export so callers (ChunkRealizer) can build a deterministic transform decision off the rng
// without importing EnemyType separately.
export function maybeEnemySwap(chunk: LevelChunk, rng: Rng): LevelChunk {
  return rng.chance(0.5) ? enemySwapChunk(chunk) : chunk;
}

export function maybeMirror(chunk: LevelChunk, rng: Rng): LevelChunk {
  return rng.chance(0.5) ? mirrorChunk(chunk) : chunk;
}
