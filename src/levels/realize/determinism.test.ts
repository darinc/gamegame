// U9 determinism guard for the directed generator (KTD3, R9).
//
// This is the load-bearing guard that the seeded Rng is threaded through EVERY generation
// consumer: we stub Math.random to throw during generation, so if any code on the director path
// escaped the injected Rng and reached for global randomness, generation would crash. It must
// complete. We also re-prove byte-identical determinism (same inputs -> deep-equal LevelData,
// including the questionBlockContents sidecar) and that adjacent levels of one seed differ.
//
// Phaser-free: this imports ONLY generateDirectedLevel (the pure director path). It deliberately
// does NOT exercise GameScene.create, which needs the Phaser runtime (that wiring is covered by
// build + manual). The Phaser-side random session-seed selection is OUTSIDE this pure call and so
// is not (and must not be) guarded here.

import { describe, it, expect, afterEach } from 'vitest';
import { generateDirectedLevel } from './realizeLevel';
import { buildReachableTable } from '../reachability/reachableTable';
import { validate } from '../reachability/validator';
import { TileType } from '../types';

const COMBOS: [number, number][] = [
  [1, 1],
  [1, 2],
  [42, 1],
  [42, 3],
  [123456789, 5],
];

describe('generateDirectedLevel: determinism guard (KTD3, R9)', () => {
  afterEach(() => {
    // Always restore the real Math.random so a thrown stub can't leak into later tests.
    viRestoreRandom();
  });

  it('completes with Math.random stubbed to throw (no consumer escapes the injected Rng)', () => {
    stubRandomToThrow();
    for (const [seed, level] of COMBOS) {
      // If any generation consumer reached for global Math.random, this would throw.
      const data = generateDirectedLevel(seed, level);
      expect(data.tiles.length).toBeGreaterThan(0);
      expect(data.playerSpawns.length).toBe(2);
      expect(data.exit).toBeDefined();
    }
  });

  it('same (seed, levelNumber) -> byte-identical LevelData, incl. questionBlockContents', () => {
    for (const [seed, level] of COMBOS) {
      const a = generateDirectedLevel(seed, level);
      const b = generateDirectedLevel(seed, level);
      expect(b).toEqual(a);
      // Spell out the sidecar so a future shape change can't silently drop it from the guarantee.
      expect(b.questionBlockContents).toEqual(a.questionBlockContents);
    }
  });

  it('different levels of the same seed differ (the arc varies level to level)', () => {
    const seed = 42;
    const l1 = generateDirectedLevel(seed, 1);
    const l2 = generateDirectedLevel(seed, 2);
    const l3 = generateDirectedLevel(seed, 3);
    expect(JSON.stringify(l1)).not.toBe(JSON.stringify(l2));
    expect(JSON.stringify(l2)).not.toBe(JSON.stringify(l3));
    expect(JSON.stringify(l1)).not.toBe(JSON.stringify(l3));
  });

  // Load-bearing invariant (review): the LevelLoader only reads power-up contents deterministically
  // when EVERY QUESTION tile has a matching questionBlockContents sidecar entry (KTD4). A missing
  // entry would silently fall back to LevelLoader's legacy Math.random roll, reintroducing per-load
  // nondeterminism the byte-identical test above can't see (it never renders through LevelLoader).
  it('every QUESTION tile has a matching questionBlockContents sidecar entry (KTD4)', () => {
    for (const [seed, level] of COMBOS) {
      const data = generateDirectedLevel(seed, level);
      const sidecar = new Set((data.questionBlockContents ?? []).map((c) => `${c.x},${c.y}`));
      for (let y = 0; y < data.height; y++) {
        for (let x = 0; x < data.width; x++) {
          if (data.tiles[y][x] === TileType.QUESTION) {
            expect(sidecar.has(`${x},${y}`)).toBe(true);
          }
        }
      }
    }
  });
});

// Endless-run robustness (review): the game increments levelNumber without bound, so generation
// must not blow the call stack or otherwise fail at a high level number (the previous-level
// archetype recompute once recursed to depth = levelNumber and crashed around level ~4798).
describe('generateDirectedLevel: high level numbers (endless run)', () => {
  it('does not throw and stays solvable at very high level numbers', () => {
    const table = buildReachableTable();
    for (const level of [1000, 5000, 50000]) {
      const data = generateDirectedLevel(777, level);
      expect(data.playerSpawns.length).toBe(2);
      expect(validate(data, { table }).ok).toBe(true);
    }
  });
});

// --- Math.random stub helpers (kept local so the guard owns its own setup/teardown) ---

let realRandom: typeof Math.random | null = null;

function stubRandomToThrow(): void {
  if (realRandom === null) realRandom = Math.random;
  Math.random = () => {
    throw new Error('Math.random must not be called on the pure director path (KTD3)');
  };
}

function viRestoreRandom(): void {
  if (realRandom !== null) {
    Math.random = realRandom;
    realRandom = null;
  }
}
