import { describe, it, expect } from 'vitest';
import { generateDirectedLevel } from './realizeLevel';
import { generateDirectedLevel as fromDirector } from '../director/Director';
import { buildReachableTable } from '../reachability/reachableTable';
import { validate } from '../reachability/validator';
import { TileType, COLLIDABLE_SOLID, EnemyType } from '../types';
import type { LevelData } from '../types';

const table = buildReachableTable();

const SOLID = COLLIDABLE_SOLID;

// 30+ distinct (seed, level) combos.
const combos: [number, number][] = [];
for (let seed = 1; seed <= 8; seed++) {
  for (let lvl = 1; lvl <= 5; lvl++) combos.push([seed, lvl]);
}

describe('generateDirectedLevel: THE KEY TEST — solvable by construction (R7/R8)', () => {
  it(`${combos.length} distinct (seed, level) combos all PASS the validator`, () => {
    let pass = 0;
    const failures: string[] = [];
    for (const [seed, lvl] of combos) {
      const level = generateDirectedLevel(seed, lvl);
      const v = validate(level, { table });
      if (v.ok) pass++;
      else failures.push(`(${seed},${lvl}): ${v.reason}`);
    }
    expect(failures).toEqual([]);
    expect(pass).toBe(combos.length);
  });

  it('every generated level has exactly 2 player spawns and an exit', () => {
    for (const [seed, lvl] of combos) {
      const level = generateDirectedLevel(seed, lvl);
      expect(level.playerSpawns.length).toBe(2);
      expect(level.exit).toBeDefined();
      expect(level.height).toBe(22);
      expect(level.tileSize).toBe(32);
    }
  });

  it('is re-exported from the director as the public entry point (U9 import path)', () => {
    expect(fromDirector(3, 2)).toEqual(generateDirectedLevel(3, 2));
  });
});

describe('generateDirectedLevel: determinism (R9)', () => {
  it('same (seed, levelNumber) -> byte-identical LevelData (deep equal)', () => {
    for (const [seed, lvl] of [[1, 1], [4, 3], [7, 5], [2, 2]] as [number, number][]) {
      const a = generateDirectedLevel(seed, lvl);
      const b = generateDirectedLevel(seed, lvl);
      expect(a).toEqual(b);
    }
  });

  it('different levels of the same seed differ (the outline varies the arc)', () => {
    const a = generateDirectedLevel(5, 2);
    const b = generateDirectedLevel(5, 3);
    // Tiles or content should differ between adjacent levels.
    expect(JSON.stringify(a.tiles) === JSON.stringify(b.tiles) && a.width === b.width).toBe(false);
  });
});

describe('generateDirectedLevel: placement validity after assembly (R11)', () => {
  it('zero placed entities (enemies, coins, question blocks) sit in solid tiles', () => {
    for (const [seed, lvl] of combos) {
      const level = generateDirectedLevel(seed, lvl);
      for (const e of level.enemySpawns) {
        expect(SOLID.has(level.tiles[Math.round(e.y)]?.[Math.round(e.x)] ?? 0)).toBe(false);
      }
      for (const c of level.coinSpawns ?? []) {
        expect(SOLID.has(level.tiles[Math.round(c.y)]?.[Math.round(c.x)] ?? 0)).toBe(false);
      }
      for (const q of level.questionBlockContents ?? []) {
        // The QUESTION tile itself is solid (it's a block); its CONTENT must have headroom when a
        // power-up is flagged (no power-up emits into a ceiling).
        if (q.containsPowerUp) {
          expect(level.tiles[q.y - 1]?.[q.x] ?? 0).toBe(TileType.EMPTY);
        }
      }
    }
  });

  it('both player spawns and the exit are on standable cells (empty over solid)', () => {
    const standable = (level: ReturnType<typeof generateDirectedLevel>, x: number, y: number) => {
      const cx = Math.round(x);
      const cy = Math.round(y);
      const here = level.tiles[cy]?.[cx] ?? 0;
      const below = level.tiles[cy + 1]?.[cx] ?? 0;
      return here === TileType.EMPTY && SOLID.has(below);
    };
    for (const [seed, lvl] of combos) {
      const level = generateDirectedLevel(seed, lvl);
      for (const s of level.playerSpawns) expect(standable(level, s.x, s.y)).toBe(true);
      expect(standable(level, level.exit!.x, level.exit!.y)).toBe(true);
    }
  });

  it('a bull is never placed with a pit/world-edge in its charge lane', () => {
    // Scan every placed bull and assert there is no open pit within the charge lane on either side
    // before a bounding wall (the placement guard's contract).
    const LANE = 4;
    for (const [seed, lvl] of combos) {
      const level = generateDirectedLevel(seed, lvl);
      for (const e of level.enemySpawns.filter((s) => s.type === 'bull')) {
        const x = Math.round(e.x);
        const foot = Math.round(e.y);
        for (const dir of [-1, 1] as const) {
          let safe = false;
          for (let i = 1; i <= LANE; i++) {
            const cx = x + dir * i;
            if (cx < 0 || cx >= level.width) {
              safe = false;
              break;
            }
            const atFoot = level.tiles[foot]?.[cx] ?? 0;
            const below = level.tiles[foot + 1]?.[cx] ?? 0;
            if (SOLID.has(atFoot)) {
              safe = true;
              break;
            } // wall bounds the charge
            if (!SOLID.has(below)) {
              safe = false;
              break;
            } // pit
            safe = true;
          }
          expect(safe).toBe(true);
        }
      }
    }
  });
});

describe('generateDirectedLevel: difficulty scaling (R2/R3/R7)', () => {
  // Menu tiers map onto the shared `difficulty` field (see TitleScene): Normal=2, Hard=4.
  const NORMAL = 2;
  const HARD = 4;
  const LVL = 8; // mid-game, past the gentle opener so the ramp is engaged

  // Aggregate metrics over many seeds at a fixed level, optionally at a difficulty tier.
  function profile(level: number, difficulty?: number) {
    let enemies = 0, koopa = 0, nonBull = 0, pitCols = 0;
    const SEEDS = 24;
    for (let seed = 1; seed <= SEEDS; seed++) {
      const lvl: LevelData = generateDirectedLevel(seed, level, undefined, difficulty);
      enemies += lvl.enemySpawns.length;
      for (const e of lvl.enemySpawns) {
        if (e.type !== EnemyType.BULL) {
          nonBull++;
          if (e.type === EnemyType.KOOPA) koopa++;
        }
      }
      const bottom = lvl.tiles[lvl.tiles.length - 1];
      for (let x = 0; x < bottom.length; x++) if (!SOLID.has(bottom[x])) pitCols++;
    }
    return {
      enemies: enemies / SEEDS,
      koopaShare: nonBull > 0 ? koopa / nonBull : 0,
      pitCols: pitCols / SEEDS,
    };
  }

  it('with no difficulty arg, output is byte-identical to the legacy path (R2 regression guard)', () => {
    for (const [seed, lvl] of [[1, 4], [5, 8], [3, 12]] as [number, number][]) {
      expect(generateDirectedLevel(seed, lvl)).toEqual(
        generateDirectedLevel(seed, lvl, undefined, undefined),
      );
    }
  });

  it('is deterministic per (seed, level, difficulty) — same inputs, byte-identical output (R2)', () => {
    for (const [seed, lvl] of [[1, 8], [4, 12], [7, 20]] as [number, number][]) {
      expect(generateDirectedLevel(seed, lvl, undefined, HARD)).toEqual(
        generateDirectedLevel(seed, lvl, undefined, HARD),
      );
    }
  });

  it('raises mean enemy density as difficulty rises (R3/R7)', () => {
    const base = profile(LVL, undefined); // identity / today's sparse output
    const hard = profile(LVL, HARD);
    expect(hard.enemies).toBeGreaterThan(base.enemies);
  });

  it('shifts the patrol roster toward the faster koopa as difficulty rises (R7)', () => {
    const normal = profile(LVL, NORMAL);
    const hard = profile(LVL, HARD);
    expect(hard.koopaShare).toBeGreaterThan(normal.koopaShare);
  });

  it('increases gap/pit presence as difficulty rises (R7)', () => {
    const base = profile(LVL, undefined);
    const hard = profile(LVL, HARD);
    expect(hard.pitCols).toBeGreaterThan(base.pitCols);
  });

  it('level 1 is byte-identical across tiers — the gentle opener is floored (R4/KTD6, end-to-end)', () => {
    // difficultyScalar(1, *) === 0 at every tier, so level 1 must realize identically on Easy,
    // Normal, and Hard — proving the gentle opener survives any menu floor at the realized-output
    // level, not just in the scalar unit test.
    for (let seed = 1; seed <= 10; seed++) {
      const normal = generateDirectedLevel(seed, 1, undefined, NORMAL);
      const hard = generateDirectedLevel(seed, 1, undefined, HARD);
      const easy = generateDirectedLevel(seed, 1, undefined, 1);
      expect(hard).toEqual(normal);
      expect(easy).toEqual(normal);
    }
  });

  it('keeps hard levels solvable from both spawns (no collapse, R8 smoke check)', () => {
    for (let seed = 1; seed <= 12; seed++) {
      const lvl = generateDirectedLevel(seed, 15, undefined, HARD);
      expect(validate(lvl, { table }).ok).toBe(true);
      expect(lvl.playerSpawns.length).toBe(2);
    }
  });
});

describe('generateDirectedLevel: real content flows through (R12/R13 sanity)', () => {
  it('across many levels, enemies and coins are placed (not an all-bare-spine collapse)', () => {
    let enemies = 0;
    let coins = 0;
    let degraded = 0;
    for (const [seed, lvl] of combos) {
      const level = generateDirectedLevel(seed, lvl);
      enemies += level.enemySpawns.length;
      coins += (level.coinSpawns ?? []).length;
      if (level.name.includes('spine')) degraded++;
    }
    expect(enemies).toBeGreaterThan(0);
    expect(coins).toBeGreaterThan(0);
    expect(degraded).toBe(0); // the seam works by construction; nothing should need degrading
  });
});
