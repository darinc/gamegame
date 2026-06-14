import { describe, it, expect } from 'vitest';
import {
  liftCoin,
  resolveCoins,
  resolveQuestion,
  resolveEnemy,
  noEntitiesInSolids,
  PATROL_RUNWAY,
} from './placement';
import type { PlacementGrid } from './placement';
import { TileType, EnemyType } from '../types';

// Build a small grid with a flat floor at the bottom two rows.
function flatGrid(width = 20, height = 12): PlacementGrid {
  const tiles: number[][] = [];
  for (let y = 0; y < height; y++) tiles.push(new Array<number>(width).fill(TileType.EMPTY));
  for (let x = 0; x < width; x++) {
    tiles[height - 1][x] = TileType.GROUND;
    tiles[height - 2][x] = TileType.GROUND;
  }
  return { tiles, width, height };
}

describe('placement: coins (R11, generalized liftCoins)', () => {
  it('a coin inside a solid is lifted to the first empty cell above', () => {
    const grid = flatGrid();
    // Place a coin request inside the floor (y = bottom solid row).
    const lifted = liftCoin(grid, { x: 5, y: grid.height - 1 });
    expect(lifted).not.toBeNull();
    // First empty cell above the 2-row floor is height-3.
    expect(lifted!.y).toBe(grid.height - 3);
    expect(grid.tiles[lifted!.y][5]).toBe(TileType.EMPTY);
  });

  it('a coin already in open air is unchanged', () => {
    const grid = flatGrid();
    const lifted = liftCoin(grid, { x: 5, y: 4 });
    expect(lifted).toEqual({ x: 5, y: 4 });
  });

  it('resolveCoins never returns a coin sitting in a solid', () => {
    const grid = flatGrid();
    const out = resolveCoins(grid, [
      { x: 2, y: grid.height - 1 },
      { x: 8, y: grid.height - 2 },
      { x: 12, y: 3 },
    ]);
    for (const c of out) expect(grid.tiles[c.y][Math.round(c.x)]).toBe(TileType.EMPTY);
  });
});

describe('placement: question headroom (R11)', () => {
  it('a ceiling-flush question suppresses its power-up (no emit into a solid)', () => {
    const grid = flatGrid();
    // Solid directly above the question cell.
    grid.tiles[5][7] = TileType.BRICK;
    const r = resolveQuestion(grid, { x: 7, y: 6, containsPowerUp: true });
    expect(r.containsPowerUp).toBe(false);
  });
  it('a question with open headroom keeps its power-up', () => {
    const grid = flatGrid();
    const r = resolveQuestion(grid, { x: 7, y: 6, containsPowerUp: true });
    expect(r.containsPowerUp).toBe(true);
  });
});

describe('placement: enemies (R11)', () => {
  it('a patrol enemy gets a floor + runway', () => {
    const grid = flatGrid();
    const r = resolveEnemy(grid, { x: 10, y: 3, type: EnemyType.GOOMBA });
    expect(r).not.toBeNull();
    expect(grid.tiles[r!.spawn.y + 1][r!.spawn.x]).toBe(TileType.GROUND); // floor beneath
    expect(grid.tiles[r!.spawn.y][r!.spawn.x]).toBe(TileType.EMPTY); // standing cell open
  });

  it('a patrol enemy on a too-narrow ledge is dropped', () => {
    // A 1-wide pillar with pits both sides: no runway.
    const height = 12;
    const tiles: number[][] = [];
    for (let y = 0; y < height; y++) tiles.push(new Array<number>(5).fill(TileType.EMPTY));
    tiles[height - 1][2] = TileType.GROUND; // single solid column
    const grid: PlacementGrid = { tiles, width: 5, height };
    const r = resolveEnemy(grid, { x: 2, y: height - 2, type: EnemyType.GOOMBA });
    expect(r).toBeNull(); // PATROL_RUNWAY not satisfied
    expect(PATROL_RUNWAY).toBeGreaterThan(1);
  });
});

describe('placement: bull charge lane (R11/KTD13)', () => {
  it('a bull on a flat arena bounded by walls both sides is accepted', () => {
    const grid = flatGrid(20, 12);
    // Raise a 2-tile wall on each side near the middle to bound the lane.
    for (const wx of [4, 14]) {
      grid.tiles[grid.height - 3][wx] = TileType.GROUND;
      grid.tiles[grid.height - 4][wx] = TileType.GROUND;
    }
    const r = resolveEnemy(grid, { x: 9, y: grid.height - 2, type: EnemyType.BULL });
    expect(r).not.toBeNull();
  });

  it('a bull with an open pit in one charge lane is rejected', () => {
    const grid = flatGrid(20, 12);
    // Carve a pit two tiles to the right of the bull.
    for (const px of [11, 12]) {
      grid.tiles[grid.height - 1][px] = TileType.EMPTY;
      grid.tiles[grid.height - 2][px] = TileType.EMPTY;
    }
    const r = resolveEnemy(grid, { x: 9, y: grid.height - 2, type: EnemyType.BULL });
    expect(r).toBeNull();
  });

  it('a bull next to the world edge on flat ground is rejected', () => {
    const grid = flatGrid(8, 12); // narrow world
    const r = resolveEnemy(grid, { x: 1, y: grid.height - 2, type: EnemyType.BULL });
    expect(r).toBeNull(); // left lane hits the world edge on flat ground
  });
});

describe('placement: final audit', () => {
  it('noEntitiesInSolids is true for resolved spawns and false for a buried one', () => {
    const grid = flatGrid();
    const coins = resolveCoins(grid, [{ x: 3, y: grid.height - 1 }]);
    const enemies = [resolveEnemy(grid, { x: 10, y: 3, type: EnemyType.GOOMBA })!.spawn];
    expect(noEntitiesInSolids(grid, coins, enemies)).toBe(true);
    expect(noEntitiesInSolids(grid, [{ x: 3, y: grid.height - 1 }], [])).toBe(false);
  });
});
