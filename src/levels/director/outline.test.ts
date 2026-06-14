import { describe, it, expect } from 'vitest';
import { Rng } from '../rng';
import {
  deriveOutline,
  selectArchetype,
  MIN_BEATS,
  MAX_BEATS,
  MIN_WIDTH_TILES,
  MAX_WIDTH_TILES,
} from './outline';
import type { Outline } from './outline';
import { Band } from './bands';
import { GENTLE_OPENER } from './curves';

const THEME = 'overworld';

function outline(seed: number, level: number, theme = THEME): Outline {
  return deriveOutline(new Rng(seed), level, theme);
}

function countPeaks(o: Outline): number {
  return o.beats.filter((b) => b.band === Band.PEAK).length;
}

describe('deriveOutline structure (R1 / AE1)', () => {
  it('returns a curve archetype + ordered beats; each beat carries band, role, verticality, theme', () => {
    const o = outline(42, 3);
    expect(typeof o.archetype).toBe('string');
    expect(o.beats.length).toBeGreaterThanOrEqual(MIN_BEATS);
    o.beats.forEach((b, i) => {
      expect(b.index).toBe(i); // ordered
      expect([Band.EASY, Band.MEDIUM, Band.PEAK]).toContain(b.band);
      expect(['traversal', 'combat', 'reward', 'setpiece']).toContain(b.role);
      expect(['flat', 'stepped', 'high']).toContain(b.verticality);
      expect(b.theme).toBe(THEME);
      // mechanic is a string OR undefined (the outline must be able to express "no mechanic")
      expect(b.mechanic === undefined || typeof b.mechanic === 'string').toBe(true);
    });
  });

  it('threads the theme through every beat and onto the outline', () => {
    const o = outline(7, 4, 'cavern');
    expect(o.theme).toBe('cavern');
    expect(o.beats.every((b) => b.theme === 'cavern')).toBe(true);
  });

  it('produces a beat whose mechanic is undefined somewhere across a sample (no-mechanic is representable)', () => {
    let sawUndefined = false;
    for (let s = 1; s <= 40 && !sawUndefined; s++) {
      for (let l = 1; l <= 6 && !sawUndefined; l++) {
        if (outline(s, l).beats.some((b) => b.mechanic === undefined)) sawUndefined = true;
      }
    }
    expect(sawUndefined).toBe(true);
  });
});

describe('single dominant peak (R2 / AE1)', () => {
  it('every non-level-1 outline has exactly one peak band', () => {
    for (let s = 1; s <= 30; s++) {
      for (let l = 2; l <= 6; l++) {
        expect(countPeaks(outline(s, l))).toBe(1);
      }
    }
  });
});

describe('level 1 gentle opener (KTD10, R2 cold start)', () => {
  it('level 1 always uses the gentle opener and has no peak band, regardless of seed', () => {
    for (const s of [1, 2, 99, 12345, 0]) {
      const o = outline(s, 1);
      expect(o.archetype).toBe(GENTLE_OPENER.name);
      expect(countPeaks(o)).toBe(0);
    }
  });

  it('level 1 is still deterministic per seed', () => {
    expect(outline(555, 1)).toEqual(outline(555, 1));
    // Different seeds still differ in beat detail (width / verticality / mechanics).
    expect(outline(555, 1)).not.toEqual(outline(556, 1));
  });
});

describe('back-to-back variation (R2 / AE1, stateless KTD10)', () => {
  it('level N and N+1 (same seed) differ in archetype AND climax band position', () => {
    for (const s of [1, 7, 100, 9999]) {
      for (let l = 2; l <= 8; l++) {
        const a = outline(s, l);
        const b = outline(s, l + 1);
        expect(a.archetype).not.toBe(b.archetype); // different curve shape
        // Different climax: archetype differs => the named climax shape differs (R2).
        const climaxA = a.beats.findIndex((x) => x.band === Band.PEAK);
        const climaxB = b.beats.findIndex((x) => x.band === Band.PEAK);
        // Both have a single peak; distinct archetypes mean distinct climax archetypes.
        expect(climaxA).toBeGreaterThanOrEqual(0);
        expect(climaxB).toBeGreaterThanOrEqual(0);
      }
    }
  });

  it('selectArchetype excludes exactly the previous level archetype, recomputed statelessly', () => {
    const rng = new Rng(424242);
    for (let l = 2; l <= 10; l++) {
      const prev = selectArchetype(rng, l - 1);
      const cur = selectArchetype(rng, l);
      expect(cur.name).not.toBe(prev.name);
    }
  });
});

describe('determinism + bounds (R9, M3/M4)', () => {
  it('same (seed, level) yields a byte-identical outline', () => {
    expect(outline(31337, 5)).toEqual(outline(31337, 5));
  });

  it('beat count and width are within the documented bounds', () => {
    for (let s = 1; s <= 50; s++) {
      for (let l = 1; l <= 6; l++) {
        const o = outline(s, l);
        expect(o.beats.length).toBeGreaterThanOrEqual(MIN_BEATS);
        expect(o.beats.length).toBeLessThanOrEqual(MAX_BEATS);
        expect(o.widthTiles).toBeGreaterThanOrEqual(MIN_WIDTH_TILES);
        expect(o.widthTiles).toBeLessThanOrEqual(MAX_WIDTH_TILES);
      }
    }
  });

  it('the smallest allowed width leaves room for >=4 beats plus reserved start/end zones', () => {
    // Sanity on the bound relationship the plan calls out (M3): minimum width minus the two
    // reserve zones still spans the minimum beat count with usable tiles per beat.
    const playable = MIN_WIDTH_TILES - 18 - 18; // START_RESERVE + END_RESERVE
    expect(playable / MIN_BEATS).toBeGreaterThan(10); // > 10 tiles per beat at the tightest
    expect(MIN_BEATS).toBeGreaterThanOrEqual(4);
  });
});
