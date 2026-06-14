// Structural themes (U8, KTD14, R14, AE5).
//
// Asserts that themes are STRUCTURAL recipes, not just palette: a Cavern level is structurally
// different from a Sky level, theme-vs-band precedence keeps levels solvable + records the achieved
// band, and theme selection is deterministic per level number.

import { describe, it, expect } from 'vitest';
import { THEMES, themeForLevel, getThemeRecipe } from './themes';
import { generateDirectedLevel } from './realize/realizeLevel';
import { ChunkRealizer } from './realize/ChunkRealizer';
import type { RealizeContext } from './realize/BeatRealizer';
import type { Beat } from './director/outline';
import { Band } from './director/bands';
import { Rng } from './rng';
import { buildReachableTable } from './reachability/reachableTable';
import { validate } from './reachability/validator';
import { hasLowCeiling } from './chunks/analysis';
import { TileType } from './types';

const table = buildReachableTable();
const GRID = 22;
const BASELINE = GRID - 2 - 1;

// Standable / floor tiles (matches LevelLoader collidable terrain).
const FLOOR = new Set<number>([TileType.GROUND, TileType.PLATFORM, TileType.PIPE]);

// --- helpers --------------------------------------------------------------------------------

/** A pit is a run of columns with no floor tile in the bottom band of the grid. */
function pitStats(level: ReturnType<typeof generateDirectedLevel>): { pits: number; totalGap: number; maxGap: number } {
  const { tiles, width, height } = level;
  let pits = 0;
  let cur = 0;
  let totalGap = 0;
  let maxGap = 0;
  for (let x = 0; x < width; x++) {
    let hasFloor = false;
    for (let y = height - 1; y >= height - 4; y--) {
      if (FLOOR.has(tiles[y]?.[x] ?? 0)) {
        hasFloor = true;
        break;
      }
    }
    if (!hasFloor) cur++;
    else {
      if (cur > 0) {
        pits++;
        totalGap += cur;
        maxGap = Math.max(maxGap, cur);
      }
      cur = 0;
    }
  }
  if (cur > 0) {
    pits++;
    totalGap += cur;
    maxGap = Math.max(maxGap, cur);
  }
  return { pits, totalGap, maxGap };
}

const SEEDS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
// themeForLevel cycles (level-1)%6 over [Grassland, Sunset, Dusk, Night, Sky, Cavern].
const SKY_LEVELS = [5, 11, 17];
const CAVERN_LEVELS = [6, 12, 18];

function cavernLevels() {
  const out: ReturnType<typeof generateDirectedLevel>[] = [];
  for (const s of SEEDS) for (const l of CAVERN_LEVELS) out.push(generateDirectedLevel(s, l));
  return out;
}
function skyLevels() {
  const out: ReturnType<typeof generateDirectedLevel>[] = [];
  for (const s of SEEDS) for (const l of SKY_LEVELS) out.push(generateDirectedLevel(s, l));
  return out;
}

// --- recipe shape ---------------------------------------------------------------------------

describe('Theme recipe fields (KTD14)', () => {
  it('all six themes carry structural recipe fields plus the cosmetic fields', () => {
    expect(THEMES.length).toBe(6);
    for (const t of THEMES) {
      // cosmetic (consumed by GameScene) — must survive U8.
      expect(typeof t.name).toBe('string');
      expect(typeof t.sky).toBe('string');
      expect(typeof t.ground).toBe('number');
      expect(typeof t.hill).toBe('number');
      expect(typeof t.bush).toBe('number');
      expect(typeof t.cloud).toBe('number');
      expect(typeof t.sunAlpha).toBe('number');
      // structural recipe.
      expect(typeof t.allowsLowCeiling).toBe('boolean');
      expect(['none', 'low', 'high']).toContain(t.ceilingPressure);
      expect(typeof t.enemyDensity).toBe('number');
      expect(typeof t.gapBias).toBe('number');
      expect(t.enemyMix).toBeTruthy();
    }
  });

  it('Cavern is the low-ceiling/high-pressure theme; Sky forbids low ceilings', () => {
    const cavern = getThemeRecipe('Cavern');
    const sky = getThemeRecipe('Sky');
    expect(cavern.allowsLowCeiling).toBe(true);
    expect(cavern.ceilingPressure).toBe('high');
    expect(cavern.enemyDensity).toBeGreaterThan(1);
    expect(sky.allowsLowCeiling).toBe(false);
    expect(sky.ceilingPressure).toBe('none');
    expect(sky.gapBias).toBeGreaterThan(1);
    expect(sky.enemyDensity).toBeLessThan(1);
  });

  it('getThemeRecipe is case-insensitive and falls back to a neutral baseline for unknown keys', () => {
    expect(getThemeRecipe('cavern').name).toBe('Cavern');
    const baseline = getThemeRecipe('overworld'); // not a real theme — neutral default
    expect(baseline.allowsLowCeiling).toBe(true);
    expect(baseline.ceilingPressure).toBe('low');
    expect(baseline.enemyDensity).toBe(1.0);
    expect(baseline.gapBias).toBe(1.0);
  });
});

// --- AE5: Cavern vs Sky are structurally different -----------------------------------------

describe('AE5: Cavern is low ceilings + above-baseline enemies + pits', () => {
  const cav = cavernLevels();
  const sky = skyLevels();

  it('Cavern levels exhibit low-ceiling tiles', () => {
    const withLowCeiling = cav.filter((l) => hasLowCeiling(l.tiles)).length;
    expect(withLowCeiling).toBeGreaterThan(0);
    // It is the DOMINANT shape of the theme, not an occasional accident.
    expect(withLowCeiling).toBeGreaterThan(cav.length / 2);
  });

  it('Cavern enemy density is above baseline (denser than the open Sky theme)', () => {
    const cavEnemies = cav.reduce((s, l) => s + l.enemySpawns.length, 0);
    const skyEnemies = sky.reduce((s, l) => s + l.enemySpawns.length, 0);
    expect(cavEnemies).toBeGreaterThan(skyEnemies);
  });

  it('Cavern levels contain pits', () => {
    const totalPits = cav.reduce((s, l) => s + pitStats(l).pits, 0);
    expect(totalPits).toBeGreaterThanOrEqual(1);
  });

  it('a representative single Cavern level has all three: low ceiling, a pit, and enemies', () => {
    // seed 1, level 6 is a deterministic Cavern level that exhibits the full archetype in one level.
    const level = generateDirectedLevel(1, 6);
    expect(themeForLevel(6).name).toBe('Cavern');
    expect(hasLowCeiling(level.tiles)).toBe(true);
    expect(pitStats(level).pits).toBeGreaterThanOrEqual(1);
    expect(level.enemySpawns.length).toBeGreaterThan(0);
  });
});

describe('AE5: Sky is open — no low ceilings + longer gaps', () => {
  const cav = cavernLevels();
  const sky = skyLevels();

  it('NO Sky level has a low-ceiling corridor (the legality filter holds)', () => {
    for (const level of sky) {
      expect(hasLowCeiling(level.tiles)).toBe(false);
    }
  });

  it('Sky gaps are longer than Cavern gaps (gapBias)', () => {
    const skyGap = sky.reduce((s, l) => s + pitStats(l).totalGap, 0);
    const cavGap = cav.reduce((s, l) => s + pitStats(l).totalGap, 0);
    expect(skyGap).toBeGreaterThan(cavGap);
  });
});

// --- AE5: theme-vs-band precedence (KTD14) --------------------------------------------------

describe('theme-vs-band precedence: theme wins, achieved band recorded (KTD14)', () => {
  function ctx(theme: string, seed = 1): RealizeContext {
    return { rng: new Rng(seed), table, theme, targetGroundRow: BASELINE, gridHeight: GRID };
  }
  function beat(band: Beat['band'], verticality: Beat['verticality']): Beat {
    return { index: 0, band, role: 'setpiece', verticality, theme: 'Sky' };
  }

  it('a peak|high beat under Sky still realizes a segment that records its achieved band', () => {
    // Force a vertical peak under the open Sky theme. Sky forbids low ceilings; the realizer must
    // still emit a usable segment and record the band it ACHIEVED (not necessarily the requested
    // peak if the legal pool re-targeted), per theme-vs-band precedence.
    const seg = new ChunkRealizer().realize(beat(Band.PEAK, 'high'), ctx('Sky'));
    expect(seg.width).toBeGreaterThan(0);
    expect(['easy', 'medium', 'peak']).toContain(seg.achievedBand);
    // No low-ceiling tiles slipped through under Sky.
    expect(hasLowCeiling(seg.tiles)).toBe(false);
  });

  it('a vertical peak under Cavern (low ceiling theme) yields a fully solvable level', () => {
    // The whole-level path threads the level-locked theme; a Cavern level with a vertical peak must
    // still pass the validator (a low ceiling never blocks a required jump — the gate would reject
    // and the realizer would reroll/degrade). Solvable-by-construction means it passes outright.
    for (const seed of SEEDS) {
      for (const lvl of CAVERN_LEVELS) {
        const level = generateDirectedLevel(seed, lvl);
        const v = validate(level, { table });
        expect(v.ok, `cavern (${seed},${lvl}): ${v.reason}`).toBe(true);
      }
    }
  });

  it('on the exact rung the achieved band equals the requested band', () => {
    // overworld (neutral) keeps the full pool, so a peak|high request resolves on the exact rung.
    const seg = new ChunkRealizer().realize(
      { index: 0, band: Band.PEAK, role: 'setpiece', verticality: 'high', theme: 'overworld' },
      ctx('overworld'),
    );
    expect(seg.achievedBand).toBe('peak');
  });
});

// --- AE5: deterministic theme selection -----------------------------------------------------

describe('theme selection is deterministic + same-seed reproducible (KTD14)', () => {
  it('themeForLevel is level-locked and cycles the six themes', () => {
    expect(themeForLevel(1).name).toBe('Grassland');
    expect(themeForLevel(5).name).toBe('Sky');
    expect(themeForLevel(6).name).toBe('Cavern');
    expect(themeForLevel(7).name).toBe('Grassland'); // wraps
    expect(themeForLevel(12).name).toBe('Cavern');
  });

  it('same seed + level -> same theme -> byte-identical structural result', () => {
    for (const [seed, lvl] of [[3, 6], [7, 5], [2, 12], [9, 11]] as [number, number][]) {
      const a = generateDirectedLevel(seed, lvl);
      const b = generateDirectedLevel(seed, lvl);
      expect(a).toEqual(b);
    }
  });

  it('the same level number across seeds shares the theme but differs structurally', () => {
    const a = generateDirectedLevel(1, 6); // Cavern
    const b = generateDirectedLevel(2, 6); // Cavern (same theme, different seed)
    expect(themeForLevel(6).name).toBe('Cavern');
    expect(JSON.stringify(a.tiles)).not.toBe(JSON.stringify(b.tiles));
  });
});
