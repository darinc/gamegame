import { describe, it, expect } from 'vitest';
import {
  difficultyScalar,
  difficultyParams,
  difficultyParamsFor,
  IDENTITY_PARAMS,
} from './difficulty';

// Menu tiers (mirrors TitleScene): Easy/Normal/Hard map onto the shared `difficulty` field.
const EASY = 1;
const NORMAL = 2;
const HARD = 4;

describe('difficultyScalar (R1/R2/R4)', () => {
  it('is monotonically non-decreasing in levelNumber at a fixed difficulty', () => {
    for (const diff of [EASY, NORMAL, HARD]) {
      let prev = -Infinity;
      for (let lvl = 1; lvl <= 50; lvl++) {
        const d = difficultyScalar(lvl, diff);
        expect(d).toBeGreaterThanOrEqual(prev);
        prev = d;
      }
    }
  });

  it('floors level 1 to the gentlest d at every tier (R4/KTD6)', () => {
    expect(difficultyScalar(1, EASY)).toBe(0);
    expect(difficultyScalar(1, NORMAL)).toBe(0);
    expect(difficultyScalar(1, HARD)).toBe(0);
  });

  it('orders the tiers Easy < Normal < Hard at a fixed mid-game level', () => {
    const lvl = 6;
    expect(difficultyScalar(lvl, EASY)).toBeLessThan(difficultyScalar(lvl, NORMAL));
    expect(difficultyScalar(lvl, NORMAL)).toBeLessThan(difficultyScalar(lvl, HARD));
  });

  it('keeps the early levels gentle and reaches real challenge by ~level 8-10 at Normal', () => {
    // "gentle through ~level 4": well below the knee.
    expect(difficultyScalar(4, NORMAL)).toBeLessThan(0.3);
    // "real challenge by ~level 8-10": climbing toward the knee.
    expect(difficultyScalar(9, NORMAL)).toBeGreaterThan(0.5);
  });

  it('keeps creeping past the knee with no hard plateau (endless run)', () => {
    expect(difficultyScalar(80, NORMAL)).toBeGreaterThan(difficultyScalar(40, NORMAL));
  });

  it('is pure: identical inputs return an identical value', () => {
    expect(difficultyScalar(13, HARD)).toBe(difficultyScalar(13, HARD));
  });
});

describe('difficultyParams (R3/R7)', () => {
  it('each multiplier is monotonically non-decreasing in d', () => {
    let prev = { densityScale: -1, gapWeight: -1, koopaBias: -1 };
    for (let i = 0; i <= 30; i++) {
      const d = i / 10;
      const p = difficultyParams(d);
      expect(p.densityScale).toBeGreaterThanOrEqual(prev.densityScale);
      expect(p.gapWeight).toBeGreaterThanOrEqual(prev.gapWeight);
      expect(p.koopaBias).toBeGreaterThanOrEqual(prev.koopaBias);
      prev = p;
    }
  });

  it('raises the baseline above 1 even at d = 0 (early peaks get teeth, R3)', () => {
    const p = difficultyParams(0);
    expect(p.densityScale).toBeGreaterThan(1);
    expect(p.gapWeight).toBe(1); // gaps stay neutral at the floor
    expect(p.koopaBias).toBe(0); // theme mix unchanged at the floor
  });

  it('clamps the multipliers so reroll pressure stays bounded (KTD7)', () => {
    const p = difficultyParams(100);
    expect(p.densityScale).toBeLessThanOrEqual(3.0);
    expect(p.gapWeight).toBeLessThanOrEqual(4.0);
  });
});

describe('difficultyParamsFor (the realize-layer entry point, R2)', () => {
  it('returns identity (no-op) params when difficulty is undefined — legacy path unchanged', () => {
    expect(difficultyParamsFor(20, undefined)).toEqual(IDENTITY_PARAMS);
    expect(IDENTITY_PARAMS).toEqual({ densityScale: 1, gapWeight: 1, koopaBias: 0 });
  });

  it('scales by level and tier when difficulty is provided', () => {
    const early = difficultyParamsFor(2, NORMAL);
    const late = difficultyParamsFor(20, NORMAL);
    expect(late.densityScale).toBeGreaterThan(early.densityScale);
    const normal = difficultyParamsFor(10, NORMAL);
    const hard = difficultyParamsFor(10, HARD);
    expect(hard.densityScale).toBeGreaterThan(normal.densityScale);
  });
});
