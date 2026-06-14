// Offline reachability validator — the sole accept/reject solvability authority (KTD6, U3).
//
// A breadth-first search over standable tiles whose edges are generated from the physics
// reachable table (reachableTable.ts). It verifies a continuous spawn->exit path from BOTH
// co-op player spawns (the more-constrained spawn binds, R10). Pure and Phaser-free so it
// runs in Node for the 1,000-seed sweep.
//
// Conservative-by-design (it must never certify an unbeatable level):
//   - Standing-height invariant (KTD6): a node requires STAND_CLEARANCE_TILES of headroom, so
//     the gate never relies on ducking to pass a low corridor.
//   - Run-class jumps require a runway: their farther reach is only allowed where the player
//     could accelerate to run speed (the "back up and run up" maneuver), which is a positional
//     property of the cell, so the 3D (x,y,speedClass) model collapses to (x,y) + a precomputed
//     per-cell run-capability flag.
//   - A jump's intervening columns must be clear at body height (pits pass; walls/pipes block).
//
// Deferred (best-effort co-op guards): the bubble-safe corridor and forced-divergence checks
// depend on the bubble's runtime behavior, which the review flagged as needing a direction
// decision (bubble has no solid collider today — see the plan's Open Questions). They are not
// implemented here; this validator asserts only what it can check soundly.

import { TileType } from '../types';
import type { LevelData } from '../types';
import { STAND_CLEARANCE_TILES, type ReachableTable, type SpeedClass } from './reachableTable';
import { DESIGN_APEX_TILES, runwayTilesForRunSpeed } from '../../physics';

export interface Region {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface ValidationResult {
  ok: boolean;
  reason?: string;
  /** Region around the first detected failure, for targeted reroll (KTD7). */
  failingRegion?: Region;
}

const SOLID = new Set<number>([
  TileType.GROUND,
  TileType.PLATFORM,
  TileType.PIPE,
  TileType.BRICK,
  TileType.QUESTION,
]);

class Grid {
  private readonly level: LevelData;

  constructor(level: LevelData) {
    this.level = level;
  }

  get width(): number {
    return this.level.width;
  }
  get height(): number {
    return this.level.height;
  }

  private tile(x: number, y: number): number {
    if (x < 0 || x >= this.level.width || y < 0 || y >= this.level.height) return TileType.EMPTY;
    return this.level.tiles[y][x];
  }

  inBoundsX(x: number): boolean {
    return x >= 0 && x < this.level.width;
  }

  solid(x: number, y: number): boolean {
    return SOLID.has(this.tile(x, y));
  }

  // Passable = empty space the player body can occupy. A SPIKE is treated as impassable
  // (deadly), and out-of-bounds above the level counts as open sky.
  passable(x: number, y: number): boolean {
    if (y < 0) return true; // open sky above the top row
    if (!this.inBoundsX(x) || y >= this.level.height) return false;
    return this.tile(x, y) === TileType.EMPTY;
  }

  // A valid standing cell: empty floor cell with solid below and STAND_CLEARANCE headroom
  // (the no-ducking invariant, KTD6).
  isStand(x: number, y: number): boolean {
    if (!this.inBoundsX(x) || y < 0 || y >= this.level.height) return false;
    if (!this.solid(x, y + 1)) return false;
    for (let h = 0; h < STAND_CLEARANCE_TILES; h++) {
      if (!this.passable(x, y - h)) return false;
    }
    return true;
  }
}

/** Drop a spawn/exit grid coord down to the standable cell beneath it. */
function resolveStandCell(grid: Grid, x: number, y: number): { x: number; y: number } | null {
  const sx = Math.round(x);
  for (let sy = Math.max(0, Math.round(y)); sy < grid.height; sy++) {
    if (grid.isStand(sx, sy)) return { x: sx, y: sy };
  }
  return null;
}

/** Contiguous same-level standable cells extending left/right (including self). */
function flatRun(grid: Grid, x: number, y: number, dir: -1 | 1): number {
  let n = 1;
  let cx = x + dir;
  while (grid.isStand(cx, y)) {
    n++;
    cx += dir;
  }
  return n;
}

// A jump's flight corridor must be clear. We approximate the foot trajectory as a tent that
// rises `clearanceTiles` above the takeoff foot at mid-span and lands at the target, then
// require the 2-tile body band to be open along it. This lets the player clear short obstacles
// (a 1-tile pipe mid-gap) while still blocking tall walls and low ceilings — and pits, being
// empty, always pass.
function corridorClear(
  grid: Grid,
  x: number,
  y: number,
  tx: number,
  ty: number,
  clearanceTiles: number
): boolean {
  // Headroom directly above takeoff so the player can begin to rise.
  for (let h = 1; h < clearanceTiles; h++) {
    if (!grid.passable(x, y - h)) return false;
  }
  const span = Math.abs(tx - x);
  if (span <= 1) return true; // adjacent move: no intervening columns

  const minX = Math.min(x, tx);
  const maxX = Math.max(x, tx);
  for (let c = minX + 1; c < maxX; c++) {
    const frac = (c - x) / (tx - x); // 0 at takeoff .. 1 at landing
    const rise = clearanceTiles * 4 * frac * (1 - frac); // parabola, peak = clearance at mid
    const base = y + (ty - y) * frac; // interpolate floor between the two ledges
    const footRow = Math.round(base - rise);
    // The 2-tile body (feet + head) must be open where the arc passes this column.
    if (!grid.passable(c, footRow) || !grid.passable(c, footRow - 1)) return false;
  }
  return true;
}

interface Edge {
  dx: number; // table offset (>=0)
  dy: number; // up-positive
}

function reachableCells(grid: Grid, start: { x: number; y: number }, table: ReachableTable): Set<string> {
  const runway = runwayTilesForRunSpeed();
  const visited = new Set<string>();
  const queue: { x: number; y: number }[] = [start];
  visited.add(`${start.x},${start.y}`);

  // Pre-enumerate table offsets per speed class once.
  const offsets: Record<SpeedClass, Edge[]> = { stand: [], run: [] };
  for (const speed of ['stand', 'run'] as SpeedClass[]) {
    for (let dx = 0; dx <= table.maxDx; dx++) {
      for (let dy = -table.maxFall; dy <= DESIGN_APEX_TILES; dy++) {
        if (table.canReach(speed, dx, dy)) offsets[speed].push({ dx, dy });
      }
    }
  }
  // Run-only offsets = reachable at run but not at stand (the extra reach).
  const runOnly = offsets.run.filter((e) => !table.canReach('stand', e.dx, e.dy));

  while (queue.length > 0) {
    const { x, y } = queue.shift()!;

    const canRunRight = flatRun(grid, x, y, -1) > runway; // runway to the left -> run rightward
    const canRunLeft = flatRun(grid, x, y, 1) > runway;

    const tryMove = (tx: number, ty: number, speed: SpeedClass, dx: number, dy: number) => {
      const k = `${tx},${ty}`;
      if (visited.has(k)) return;
      if (!grid.isStand(tx, ty)) return;
      const clr = table.requiredClearanceTiles(speed, dx, dy);
      if (!corridorClear(grid, x, y, tx, ty, clr)) return;
      visited.add(k);
      queue.push({ x: tx, y: ty });
    };

    // Walk + stand-class jumps/drops in both directions.
    for (const { dx, dy } of offsets.stand) {
      tryMove(x + dx, y - dy, 'stand', dx, dy);
      if (dx > 0) tryMove(x - dx, y - dy, 'stand', dx, dy);
    }
    // Run-only (longer) jumps, gated by available runway in the travel direction.
    for (const { dx, dy } of runOnly) {
      if (canRunRight) tryMove(x + dx, y - dy, 'run', dx, dy);
      if (canRunLeft && dx > 0) tryMove(x - dx, y - dy, 'run', dx, dy);
    }
  }

  return visited;
}

export interface ValidateOptions {
  table: ReachableTable;
}

export function validate(level: LevelData, opts: ValidateOptions): ValidationResult {
  const grid = new Grid(level);

  if (!level.exit) {
    return { ok: false, reason: 'level has no exit' };
  }
  const exit = resolveStandCell(grid, level.exit.x, level.exit.y);
  if (!exit) {
    return {
      ok: false,
      reason: 'exit does not resolve to a standable cell',
      failingRegion: { x: Math.round(level.exit.x) - 1, y: Math.round(level.exit.y) - 1, w: 3, h: 4 },
    };
  }
  const exitKey = `${exit.x},${exit.y}`;

  if (level.playerSpawns.length < 2) {
    return { ok: false, reason: 'co-op requires two player spawns (R10)' };
  }

  const reachSets: Set<string>[] = [];
  for (let i = 0; i < level.playerSpawns.length; i++) {
    const spawn = level.playerSpawns[i];
    const start = resolveStandCell(grid, spawn.x, spawn.y);
    if (!start) {
      return {
        ok: false,
        reason: `player spawn ${i} does not resolve to a standable cell`,
        failingRegion: { x: Math.round(spawn.x) - 1, y: Math.round(spawn.y) - 1, w: 3, h: 4 },
      };
    }
    const reach = reachableCells(grid, start, opts.table);
    if (!reach.has(exitKey)) {
      return {
        ok: false,
        reason: `exit not reachable from player spawn ${i} (R8/R10)`,
        failingRegion: { x: exit.x - 2, y: exit.y - 3, w: 5, h: 5 },
      };
    }
    reachSets.push(reach);
  }

  // No disjoint reachable regions: both spawns can regroup (they share at least the exit).
  // (Stronger in-tether-path and bubble-corridor checks are deferred — see file header.)
  const shared = [...reachSets[0]].some((c) => reachSets.every((s) => s.has(c)));
  if (!shared) {
    return { ok: false, reason: 'player spawns reach disjoint regions (R10)' };
  }

  return { ok: true };
}

/**
 * Re-validate after a targeted overlay reroll (KTD7). The BFS over a typical level (~6.6k
 * cells) is sub-millisecond, so a full re-validate is correct and fast enough; the `region`
 * hint is accepted for API stability and future incremental optimization if U10's measured
 * budget ever demands it.
 */
export function revalidateRegion(
  level: LevelData,
  opts: ValidateOptions,
  _region?: Region
): ValidationResult {
  return validate(level, opts);
}
