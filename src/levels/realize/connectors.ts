// Table-drawn connectors between adjacent segment edge profiles (U5, R7, KTD11).
//
// Phaser-free / Node-importable. A connector is a solid ground floor that carries the surface from
// one segment's exit edge to the next segment's entry edge using ONLY height transitions the
// reachable table permits — so the spine is solvable BY CONSTRUCTION (it never emits an unjumpable
// wall or a floating ledge). The contract is edge-profile mating: connector.exitGroundRow ===
// nextSegment.entryGroundRow exactly (for a flat chunk this reduces to scalar height equality).
//
// Rows are GRID rows (smaller row index = higher surface). The floor at a column fills from the
// bottom of the grid up to the surface row, mirroring HybridGenerator.generateBridge's "fill so
// the surface sits N tiles from the bottom" so the connector is flush with chunk floors.

import { TileType } from '../types';
import type { ReachableTable } from '../reachability/reachableTable';

export interface Connector {
  tiles: number[][]; // full grid-height stamp; solid floor, EMPTY above
  width: number;
  entryGroundRow: number; // == previous exit foot row
  exitGroundRow: number; // == next entry foot row (mated exactly)
}

/**
 * Largest single-column UP step (rows) the table allows a STANDING walker to take over 1 tile of
 * horizontal travel — i.e. the steepest a connector floor may rise per column. Derived from the
 * table, not hard-coded, so it tracks the physics. We use dx=1 (a step onto the very next column);
 * if a 1-tile climb isn't table-valid we fall back to 1 (a single tile is always walkable in this
 * engine), but in practice the table admits a 1-tile step.
 */
function maxRisePerColumn(table: ReachableTable): number {
  for (let dy = table.designApexTiles; dy >= 1; dy--) {
    if (table.canReach('stand', 1, dy)) return dy;
  }
  return 1;
}

/**
 * Build a connector floor of width `width` from `entryGroundRow` to `exitGroundRow`. If the height
 * delta cannot be spanned within `width` at the table-valid rise rate, the returned width is
 * WIDENED to whatever is needed (the caller honors `result.width`, which may exceed the request) so
 * a steep mate never becomes an unclimbable wall. A width of 0 with equal rows yields an empty
 * connector (the segments already mate).
 *
 * Going DOWN (surface descends, row index increases) is a fall and is always table-reachable, so
 * descents may be as steep as needed; only ascents are rate-limited.
 */
export function buildConnector(
  table: ReachableTable,
  gridHeight: number,
  entryGroundRow: number,
  exitGroundRow: number,
  width: number
): Connector {
  const risePerCol = maxRisePerColumn(table); // rows of UP-climb allowed per column
  // Up = surface row DECREASES. Total climb (in rows) we must gain (negative if net descent).
  const climbRows = entryGroundRow - exitGroundRow; // >0 means we climb (exit is higher)

  // Minimum columns to climb at the valid rate. Descents are unconstrained, so width is driven by
  // the climb requirement only.
  const minClimbCols = climbRows > 0 ? Math.ceil(climbRows / risePerCol) : 0;
  // We need at least 1 flat landing column on each end for a clean mate; ensure room for that plus
  // the climb. (A descent still wants >=1 column so the surface isn't a vertical cliff at the seam,
  // but a fall down a cliff is fine, so 1 is enough.)
  const needed = Math.max(minClimbCols, climbRows !== 0 ? 1 : 0);
  const w = Math.max(width, needed);

  const tiles: number[][] = [];
  for (let y = 0; y < gridHeight; y++) tiles.push(new Array<number>(w).fill(TileType.EMPTY));

  // Compute the surface row per column: hold the entry row, climb at the valid rate over the climb
  // window, then hold the exit row. For a net descent, drop to the exit row immediately after the
  // first column (a fall), then hold (keeps a walkable run before the next segment).
  const surfaceRow = (col: number): number => {
    if (w === 0) return entryGroundRow;
    if (climbRows > 0) {
      // Climb across the LAST `minClimbCols` columns so we land on exitGroundRow exactly at the
      // right edge. Earlier columns hold the entry row.
      const climbStart = w - minClimbCols;
      if (col < climbStart) return entryGroundRow;
      const stepsIn = col - climbStart + 1; // 1..minClimbCols
      const row = entryGroundRow - stepsIn * risePerCol;
      return Math.max(row, exitGroundRow); // never overshoot the target
    }
    if (climbRows < 0) {
      // Descend: hold entry for the first column, then fall to exit and hold.
      return col === 0 ? entryGroundRow : exitGroundRow;
    }
    return entryGroundRow; // flat
  };

  for (let col = 0; col < w; col++) {
    const sRow = surfaceRow(col);
    // Fill solid from the bottom of the grid up to (and including) the surface's top solid tile.
    // The foot row is `sRow` (EMPTY); the top solid tile is `sRow + 1`.
    for (let y = sRow + 1; y < gridHeight; y++) {
      tiles[y][col] = TileType.GROUND;
    }
  }

  return {
    tiles,
    width: w,
    entryGroundRow: w === 0 ? entryGroundRow : surfaceRow(0),
    exitGroundRow: w === 0 ? exitGroundRow : surfaceRow(w - 1),
  };
}

/**
 * Validate that every adjacent-column height transition in a connector floor is table-reachable
 * (used by tests to assert the construction guarantee directly). Returns the first illegal step or
 * null if every step is legal. A descent (row increases) is always legal (a fall); an ascent (row
 * decreases) of `dy` over 1 column must satisfy table.canReach('stand', 1, dy).
 */
export function firstIllegalStep(
  table: ReachableTable,
  connector: Connector
): { col: number; dy: number } | null {
  const surfaceRowAt = (col: number): number => {
    for (let y = 0; y < connector.tiles.length; y++) {
      if (connector.tiles[y][col] === TileType.GROUND) return y - 1; // foot row above top solid
    }
    return connector.tiles.length - 1;
  };
  for (let col = 1; col < connector.width; col++) {
    const prev = surfaceRowAt(col - 1);
    const cur = surfaceRowAt(col);
    const dy = prev - cur; // >0 = climb up
    if (dy > 0 && !table.canReach('stand', 1, dy)) {
      return { col, dy };
    }
  }
  return null;
}
