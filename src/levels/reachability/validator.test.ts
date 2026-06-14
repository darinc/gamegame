import { describe, it, expect } from 'vitest';
import { TileType } from '../types';
import type { LevelData } from '../types';
import { buildReachableTable } from './reachableTable';
import { validate, revalidateRegion } from './validator';

const CHARS: Record<string, number> = {
  '.': TileType.EMPTY,
  '#': TileType.GROUND,
  P: TileType.PIPE,
  B: TileType.BRICK,
  '?': TileType.QUESTION,
  '=': TileType.PLATFORM,
  '^': TileType.SPIKE,
};

// ASCII level builder. '1'/'2' = player spawns (empty cells), 'E' = exit (empty cell).
function buildLevel(rows: string[]): LevelData {
  const height = rows.length;
  const width = Math.max(...rows.map((r) => r.length));
  const tiles: number[][] = [];
  const spawnByIndex: Record<number, { x: number; y: number }> = {};
  let exit: { x: number; y: number } | undefined;

  for (let y = 0; y < height; y++) {
    const row: number[] = [];
    for (let x = 0; x < width; x++) {
      const ch = rows[y][x] ?? '.';
      if (ch === '1' || ch === '2') {
        spawnByIndex[ch === '1' ? 0 : 1] = { x, y };
        row.push(TileType.EMPTY);
      } else if (ch === 'E') {
        exit = { x, y };
        row.push(TileType.EMPTY);
      } else {
        row.push(CHARS[ch] ?? TileType.EMPTY);
      }
    }
    tiles.push(row);
  }

  const playerSpawns = Object.keys(spawnByIndex)
    .map(Number)
    .sort((a, b) => a - b)
    .map((i) => spawnByIndex[i]);

  return {
    name: 'fixture',
    width,
    height,
    tileSize: 32,
    tiles,
    playerSpawns,
    enemySpawns: [],
    exit: exit ? { ...exit, type: 'flagpole' } : undefined,
  };
}

const table = buildReachableTable();
const v = (level: LevelData) => validate(level, { table });

describe('validator — core solvability (R8/R10)', () => {
  it('accepts a beatable level: walk, a small gap, walk to exit', () => {
    const level = buildLevel([
      '..............',
      '..............',
      '12.........E..',
      '####....######',
      '####....######',
    ]);
    expect(v(level).ok).toBe(true);
  });

  it('accepts a climb up onto a higher ledge', () => {
    const level = buildLevel([
      '...........',
      '........E..',
      '........###',
      '12.........',
      '###........',
      '###........',
    ]);
    // Ground at left (rows4-5), a ledge 2 up at right (row2 solid, stand on row1).
    expect(v(level).ok).toBe(true);
  });

  it('rejects when the exit is reachable from only one spawn (disjoint, uncrossable gap)', () => {
    const level = buildLevel([
      '.........................',
      '1....E..............2....',
      '######...............####',
      '######...............####',
    ]);
    // Left platform cols0-5 (spawn1 + exit), right platform cols20-24 (spawn2). The ~14-wide
    // gap exceeds run reach, so spawn2 can never reach the exit.
    const r = v(level);
    expect(r.ok).toBe(false);
    expect(r.reason).toMatch(/spawn 1/);
  });

  it('reaches an exit to the LEFT of the spawn (search is bidirectional)', () => {
    const level = buildLevel([
      '............',
      'E.........12',
      '############',
      '############',
    ]);
    expect(v(level).ok).toBe(true);
  });
});

describe('validator — standing-height invariant (KTD6, Cavern)', () => {
  it('accepts a 2-tile-tall corridor (player walks standing)', () => {
    const level = buildLevel([
      '############',
      '............', // headroom row
      '12........E.', // walk row (2 tall: this row + the one above)
      '############',
    ]);
    expect(v(level).ok).toBe(true);
  });

  it('rejects a 1-tile-tall (duck-only) corridor — the gate never assumes ducking', () => {
    const level = buildLevel([
      '............',
      '############', // ceiling directly above the walk row -> only 1 tile of space
      '12........E.',
      '############',
    ]);
    expect(v(level).ok).toBe(false);
  });
});

describe('validator — run-class runway precondition (air-speed cap)', () => {
  // A run-only gap (wider than the standing jump reach). Crossable only if the takeoff ledge
  // is long enough to accelerate to run speed.
  const withLedge = (ledge: number) => {
    const ground = '#'.repeat(ledge) + '.'.repeat(8) + '#'.repeat(8);
    const spawnRow =
      '1' + (ledge >= 2 ? '2' : '.') + '.'.repeat(ledge - 2 >= 0 ? ledge - 2 : 0) +
      '.'.repeat(8) + 'E' + '.'.repeat(7);
    return buildLevel(['.'.repeat(ground.length), spawnRow.padEnd(ground.length, '.'), ground, ground]);
  };

  it('rejects the run-only gap with a 2-tile takeoff ledge (no runway)', () => {
    expect(v(withLedge(2)).ok).toBe(false);
  });

  it('accepts the same gap with a 4-tile takeoff ledge (enough runway to run)', () => {
    expect(v(withLedge(4)).ok).toBe(true);
  });
});

describe('validator — guards and determinism', () => {
  it('rejects a level with no exit', () => {
    const level = buildLevel(['....', '12..', '####']);
    expect(v(level).ok).toBe(false);
  });

  it('rejects when a spawn cannot stand anywhere below it', () => {
    const level = buildLevel([
      'E..........1',
      '###########.', // spawn1 at col11 has no floor beneath -> falls out
      '###########.',
      '2...........',
      '############',
    ]);
    const r = v(level);
    expect(r.ok).toBe(false);
  });

  it('produces an identical verdict across runs (determinism)', () => {
    const level = buildLevel(['..............', '12.........E..', '####....######', '####....######']);
    expect(v(level)).toEqual(v(level));
    expect(revalidateRegion(level, { table })).toEqual(v(level));
  });
});
