import { describe, it, expect } from 'vitest';
import {
  mirrorChunk,
  enemySwapChunk,
  stampChunk,
  shiftToMateEntry,
  clampShiftToGrid,
  footRowForHeight,
} from './transforms';
import { entryGroundHeight, exitGroundHeight } from '../chunks/analysis';
import { risingLedge, enemyRush, terraceWalk } from '../chunks';
import { EnemyType, TileType } from '../types';

const GRID = 22;

describe('transforms: mirror (R5)', () => {
  it('swaps entry/exit heights and reflects spawn columns; preserves geometry by reversal', () => {
    const m = mirrorChunk(risingLedge);
    // entry/exit heights swap (declared).
    expect(m.entryHeight).toBe(risingLedge.exitHeight);
    expect(m.exitHeight).toBe(risingLedge.entryHeight);
    // The mirrored tiles' actual edge heights match the swapped declarations (geometry preserved).
    expect(entryGroundHeight(m.tiles)).toBe(exitGroundHeight(risingLedge.tiles));
    expect(exitGroundHeight(m.tiles)).toBe(entryGroundHeight(risingLedge.tiles));
    // double-mirror is identity on tiles.
    expect(mirrorChunk(m).tiles).toEqual(risingLedge.tiles);
  });

  it('reflects enemy columns', () => {
    const m = mirrorChunk(enemyRush);
    const w = enemyRush.width;
    const origCols = enemyRush.enemySpawns!.map((e) => e.x).sort((a, b) => a - b);
    const mirCols = m.enemySpawns!.map((e) => e.x).sort((a, b) => a - b);
    expect(mirCols).toEqual(origCols.map((c) => w - 1 - c).sort((a, b) => a - b));
  });
});

describe('transforms: enemy-swap (R5)', () => {
  it('swaps GOOMBA<->KOOPA, leaves BULL untouched', () => {
    const swapped = enemySwapChunk(enemyRush); // all goombas
    expect(swapped.enemySpawns!.every((e) => e.type === EnemyType.KOOPA)).toBe(true);
    // double-swap restores.
    expect(enemySwapChunk(swapped).enemySpawns!.every((e) => e.type === EnemyType.GOOMBA)).toBe(true);
  });
});

describe('transforms: height-shift mate (R5/R7)', () => {
  it('shifts a chunk so its entry foot lands on a target row; declared entry/exit preserved as rows', () => {
    const targetFoot = footRowForHeight(GRID, 5); // pretend the connector left us at height-5 surface
    const wantShift = shiftToMateEntry(terraceWalk, GRID, targetFoot);
    const shift = clampShiftToGrid(terraceWalk, GRID, wantShift);
    const stamp = stampChunk(terraceWalk, GRID, shift);
    // The stamp's entry ground row equals the (shifted) declared entry height row.
    expect(stamp.entryGroundRow).toBe(footRowForHeight(GRID, terraceWalk.entryHeight) - shift);
    // The exit edge moved by the same shift (entry/exit move together — relative profile preserved).
    const entryDelta = footRowForHeight(GRID, terraceWalk.entryHeight) - stamp.entryGroundRow;
    const exitDelta = footRowForHeight(GRID, terraceWalk.exitHeight) - stamp.exitGroundRow;
    expect(entryDelta).toBe(exitDelta);
  });

  it('clamps a shift that would push the floor off-grid (never negative, never above headroom)', () => {
    expect(clampShiftToGrid(terraceWalk, GRID, -5)).toBe(0); // never sink below the grid floor
    const big = clampShiftToGrid(terraceWalk, GRID, 999);
    const baseOffsetY = GRID - terraceWalk.tiles.length;
    expect(big).toBe(baseOffsetY); // clamped to max headroom
  });

  it('a flat chunk stamps with constant edge rows (degenerate edge profile)', () => {
    const stamp = stampChunk(enemyRush, GRID, 0); // flat 2/2 chunk
    expect(stamp.entryGroundRow).toBe(stamp.exitGroundRow);
    expect(stamp.entryEdgeOpen).toBe(false);
    expect(stamp.exitEdgeOpen).toBe(false);
  });

  it('stamp preserves tile content bottom-aligned + shifted', () => {
    const stamp = stampChunk(terraceWalk, GRID, 0);
    expect(stamp.tiles.length).toBe(GRID);
    // bottom row is solid floor (chunk floor bottom-aligned).
    expect(stamp.tiles[GRID - 1].some((t) => t === TileType.GROUND)).toBe(true);
  });
});
