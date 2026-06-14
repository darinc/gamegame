// Typed placement validity — generalizes liftCoins to all placed entities (U5, R11, KTD13).
//
// Phaser-free / Node-importable. Operates on the ASSEMBLED full level tile grid plus the placement
// requests already offset to GLOBAL grid coordinates. Per-entity rules:
//   - coins:            lift up out of solids to the first EMPTY cell. A fully-buried coin with no
//                       air above is repositioned to the nearest open cell rather than silently
//                       dropped (reward-beat coins are content, not noise).
//   - question blocks:  need emit headroom — an EMPTY cell directly above the block. A ceiling-flush
//                       question is relocated down to a solid run with headroom, or (last resort)
//                       its content is suppressed (containsPowerUp=false) so nothing spawns into a
//                       ceiling.
//   - enemies (patrol): need a solid floor under the foot and >= PATROL_RUNWAY standable tiles to
//                       walk; otherwise dropped (a trapped enemy is degenerate output).
//   - bulls (charger):  need a bounded charge lane on BOTH directions within charge range — a
//                       standable floor with NO pit / world-edge in either lane (a back-wall alone
//                       is not enough; ChargingBull runs off an open front edge). Otherwise dropped.
//
// The invariant the whole layer guarantees: after resolution, ZERO returned spawns intersect a
// solid tile, and every enemy stands on a floor.

import { TileType, EnemyType } from '../types';
import type { CoinSpawn, SpawnPoint, QuestionBlockContent } from '../types';

// Minimum standable runway (tiles, including the foot tile) a patrol enemy needs to be non-trapped.
export const PATROL_RUNWAY = 3;
// Bull charge lane: within this many tiles on EACH side of the bull there must be NO open pit /
// world-edge (a RAISED wall, e.g. a terrace, is fine — it bounds the charge and stops the bull on
// body.blocked rather than letting it run off the level, KTD13). The bull also needs a minimal flat
// runway (BULL_MIN_RUNWAY) to start a charge from. CHARGE_SPEED=200 makes a few tiles plenty.
export const BULL_CHARGE_LANE = 4;
export const BULL_MIN_RUNWAY = 2;

const SOLID = new Set<number>([
  TileType.GROUND,
  TileType.PLATFORM,
  TileType.PIPE,
  TileType.BRICK,
  TileType.QUESTION,
]);

export interface PlacementGrid {
  tiles: number[][];
  width: number;
  height: number;
}

function tileAt(grid: PlacementGrid, x: number, y: number): number {
  if (x < 0 || x >= grid.width || y < 0 || y >= grid.height) return TileType.EMPTY;
  return grid.tiles[y][x];
}

function isSolid(grid: PlacementGrid, x: number, y: number): boolean {
  return SOLID.has(tileAt(grid, x, y));
}

/** A standing foot cell: EMPTY with a solid tile directly below it (in bounds). */
function isStandFoot(grid: PlacementGrid, x: number, y: number): boolean {
  if (x < 0 || x >= grid.width || y < 0 || y >= grid.height) return false;
  if (tileAt(grid, x, y) !== TileType.EMPTY) return false;
  return isSolid(grid, x, y + 1);
}

// --- Coins (generalized liftCoins) ----------------------------------------------------------

/**
 * Lift a coin out of any solid it landed in to the first EMPTY cell above. If it is buried to the
 * top with no air above, search downward then sideways for the nearest open cell so the reward is
 * never lost (KTD13). Returns null only if the whole column neighborhood is solid (shouldn't happen
 * on a real level).
 */
export function liftCoin(grid: PlacementGrid, coin: CoinSpawn): CoinSpawn | null {
  const gx = Math.round(coin.x);
  if (gx < 0 || gx >= grid.width) return coin; // out of bounds horizontally: leave as-is
  let gy = Math.round(coin.y);

  // Walk up out of solid to the first empty cell.
  let guard = 0;
  while (gy >= 0 && tileAt(grid, gx, gy) !== TileType.EMPTY && guard < grid.height) {
    gy--;
    guard++;
  }
  if (gy >= 0 && tileAt(grid, gx, gy) === TileType.EMPTY) {
    return { x: coin.x, y: gy };
  }

  // No air above in this column: search downward in the column, then nearby columns.
  const startY = Math.round(coin.y);
  for (let y = startY; y < grid.height; y++) {
    if (tileAt(grid, gx, y) === TileType.EMPTY) return { x: coin.x, y };
  }
  for (let dx = 1; dx <= 3; dx++) {
    for (const nx of [gx - dx, gx + dx]) {
      for (let y = 0; y < grid.height; y++) {
        if (tileAt(grid, nx, y) === TileType.EMPTY) return { x: nx, y };
      }
    }
  }
  return null;
}

export function resolveCoins(grid: PlacementGrid, coins: CoinSpawn[]): CoinSpawn[] {
  const out: CoinSpawn[] = [];
  for (const c of coins) {
    const lifted = liftCoin(grid, c);
    if (lifted) out.push(lifted);
  }
  return out;
}

// --- Question blocks ------------------------------------------------------------------------

/**
 * Resolve a question block's content under the emit-headroom rule. A QUESTION tile must have an
 * EMPTY cell directly above to pop its content; if it is ceiling-flush we suppress the power-up
 * (containsPowerUp=false) so nothing spawns into a solid. (Relocating the tile itself is a terrain
 * edit the realizer owns; here we only decide content safely.)
 */
export function resolveQuestion(
  grid: PlacementGrid,
  q: QuestionBlockContent
): QuestionBlockContent {
  const above = tileAt(grid, q.x, q.y - 1);
  if (above !== TileType.EMPTY) {
    return { x: q.x, y: q.y, containsPowerUp: false };
  }
  return q;
}

export function resolveQuestions(
  grid: PlacementGrid,
  qs: QuestionBlockContent[]
): QuestionBlockContent[] {
  return qs.map((q) => resolveQuestion(grid, q));
}

// --- Enemies --------------------------------------------------------------------------------

/** Standable run length (tiles at the same foot row) extending from x in `dir`, including self. */
function flatRun(grid: PlacementGrid, x: number, y: number, dir: -1 | 1): number {
  let n = 0;
  let cx = x;
  while (isStandFoot(grid, cx, y)) {
    n++;
    cx += dir;
  }
  return n;
}

/**
 * Is the bull's charge lane SAFE in direction `dir` within `range` tiles? Safe means: scanning
 * outward, we either stay on solid floor the whole way, OR we hit a RAISED wall (a solid tile at
 * the foot row that the bull bumps into and stops on) BEFORE any open pit / world-edge. An open pit
 * or the world edge reached on flat ground is UNSAFE (the bull runs off and self-destructs, KTD13).
 */
function chargeLaneSafe(grid: PlacementGrid, x: number, y: number, dir: -1 | 1, range: number): boolean {
  for (let i = 1; i <= range; i++) {
    const cx = x + dir * i;
    if (cx < 0 || cx >= grid.width) return false; // ran to the world edge on flat ground
    if (isSolid(grid, cx, y)) return true; // a wall at foot height bounds the charge -> safe
    if (!isSolid(grid, cx, y + 1)) return false; // open pit under the lane -> unsafe
  }
  return true; // solid floor the whole way within range (a long flat arena) -> safe
}

export interface ResolvedEnemy {
  spawn: SpawnPoint;
}

/**
 * Resolve an enemy spawn to a valid floor cell or drop it. Snaps the foot down to the nearest floor
 * below the requested row, then enforces:
 *   - patrol (goomba/koopa): a solid floor + >= PATROL_RUNWAY total standable tiles around it.
 *   - charger (bull):        a bounded charge lane both directions (no pit/world-edge within
 *                            BULL_CHARGE_LANE on either side) so it turns at a wall, never runs off.
 * Returns null when no valid placement exists (caller omits it — no trapped/self-destructing enemy).
 */
export function resolveEnemy(grid: PlacementGrid, enemy: SpawnPoint): ResolvedEnemy | null {
  const x = Math.round(enemy.x);
  if (x < 0 || x >= grid.width) return null;

  // Snap the foot to a standable cell at or below the requested row.
  let foot = -1;
  for (let y = Math.max(0, Math.round(enemy.y)); y < grid.height; y++) {
    if (isStandFoot(grid, x, y)) {
      foot = y;
      break;
    }
  }
  // If nothing below, try searching upward too (chunk floor may be above the requested row).
  if (foot < 0) {
    for (let y = Math.min(grid.height - 1, Math.round(enemy.y)); y >= 0; y--) {
      if (isStandFoot(grid, x, y)) {
        foot = y;
        break;
      }
    }
  }
  if (foot < 0) return null;

  if (enemy.type === EnemyType.BULL) {
    // Both charge directions must be bounded (a wall or continuous floor within range; no pit /
    // world-edge), and there must be a minimal flat runway each way to start a charge from.
    const leftSafe = chargeLaneSafe(grid, x, foot, -1, BULL_CHARGE_LANE);
    const rightSafe = chargeLaneSafe(grid, x, foot, 1, BULL_CHARGE_LANE);
    const leftRunway = flatRun(grid, x, foot, -1) >= BULL_MIN_RUNWAY;
    const rightRunway = flatRun(grid, x, foot, 1) >= BULL_MIN_RUNWAY;
    if (!(leftSafe && rightSafe && leftRunway && rightRunway)) return null;
    return { spawn: { x, y: foot, type: enemy.type } };
  }

  // Patrol classes: need enough standable runway around the foot.
  const total = flatRun(grid, x, foot, -1) + flatRun(grid, x, foot, 1) - 1; // self counted twice
  if (total < PATROL_RUNWAY) return null;
  return { spawn: { x, y: foot, type: enemy.type } };
}

export function resolveEnemies(grid: PlacementGrid, enemies: SpawnPoint[]): SpawnPoint[] {
  const out: SpawnPoint[] = [];
  for (const e of enemies) {
    const r = resolveEnemy(grid, e);
    if (r) out.push(r.spawn);
  }
  return out;
}

// --- Final audit ----------------------------------------------------------------------------

/** True if every spawn/coin sits in a non-solid cell (the R11 no-buried-entity invariant). */
export function noEntitiesInSolids(
  grid: PlacementGrid,
  coins: CoinSpawn[],
  enemies: SpawnPoint[]
): boolean {
  for (const c of coins) {
    if (isSolid(grid, Math.round(c.x), Math.round(c.y))) return false;
  }
  for (const e of enemies) {
    if (isSolid(grid, Math.round(e.x), Math.round(e.y))) return false;
  }
  return true;
}
