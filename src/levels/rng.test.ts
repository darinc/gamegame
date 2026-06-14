import { describe, it, expect } from 'vitest';
import { Rng, rngForLevel, mixSeed } from './rng';

function draws(rng: Rng, n: number): number[] {
  const out: number[] = [];
  for (let i = 0; i < n; i++) out.push(rng.next());
  return out;
}

describe('Rng determinism (R9)', () => {
  it('same seed yields an identical sequence', () => {
    const a = draws(new Rng(12345), 1000);
    const b = draws(new Rng(12345), 1000);
    expect(a).toEqual(b);
  });

  it('different seeds diverge immediately', () => {
    expect(new Rng(1).next()).not.toBe(new Rng(2).next());
  });

  it('a zero seed does not collapse to a degenerate stream', () => {
    const seq = draws(new Rng(0), 10);
    // Not all identical, and within range.
    expect(new Set(seq).size).toBeGreaterThan(1);
    for (const v of seq) {
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });
});

describe('rngForLevel — adjacent-level separation (KTD3)', () => {
  it('same (seed, level) reproduces; level N and N+1 are well separated', () => {
    const l5a = draws(rngForLevel(777, 5), 5);
    const l5b = draws(rngForLevel(777, 5), 5);
    expect(l5a).toEqual(l5b); // reproducible

    const l6 = draws(rngForLevel(777, 6), 5);
    expect(l5a[0]).not.toBe(l6[0]); // guards the +level*1000 low-bit-mixing problem
  });

  it('mixSeed spreads adjacent inputs (no obvious correlation)', () => {
    const s5 = mixSeed(777, 5);
    const s6 = mixSeed(777, 6);
    // A good mix changes many bits between adjacent inputs.
    const diffBits = (s5 ^ s6).toString(2).split('').filter((c) => c === '1').length;
    expect(diffBits).toBeGreaterThan(5);
  });
});

describe('Rng.fork — independent, stable child streams (KTD3)', () => {
  it('distinct labels give independent streams', () => {
    const parent = new Rng(42);
    const a = draws(parent.fork('a'), 5);
    const b = draws(parent.fork('b'), 5);
    expect(a).not.toEqual(b);
  });

  it('fork is stable regardless of how many draws the parent has made', () => {
    const p1 = new Rng(42);
    const beforeAnyDraws = draws(p1.fork('curve'), 5);

    const p2 = new Rng(42);
    p2.next();
    p2.next();
    p2.next(); // parent advanced — must not shift the fork
    const afterDraws = draws(p2.fork('curve'), 5);

    expect(afterDraws).toEqual(beforeAnyDraws);
  });

  it('same label from same root reproduces', () => {
    expect(draws(new Rng(99).fork('x'), 5)).toEqual(draws(new Rng(99).fork('x'), 5));
  });
});

describe('Rng helpers', () => {
  it('int(n) stays in [0, n) and never returns n', () => {
    const rng = new Rng(7);
    let max = -1;
    for (let i = 0; i < 5000; i++) {
      const v = rng.int(6);
      expect(Number.isInteger(v)).toBe(true);
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(6);
      if (v > max) max = v;
    }
    expect(max).toBe(5); // full range observed
  });

  it('int(1) is always 0; int(0) and int(-3) are 0', () => {
    const rng = new Rng(7);
    for (let i = 0; i < 50; i++) expect(rng.int(1)).toBe(0);
    expect(rng.int(0)).toBe(0);
    expect(rng.int(-3)).toBe(0);
  });

  it('int(n) is roughly uniform (chi-square sanity)', () => {
    const rng = new Rng(123);
    const bins = 10;
    const samples = 20000;
    const counts = new Array(bins).fill(0);
    for (let i = 0; i < samples; i++) counts[rng.int(bins)]++;
    const expected = samples / bins;
    const chi = counts.reduce((s, c) => s + (c - expected) ** 2 / expected, 0);
    // 9 dof, chi-square 0.999 critical ~27.9 — generous bound to avoid flakiness.
    expect(chi).toBeLessThan(27.9);
  });

  it('rangeInt is inclusive on both ends and respects degenerate ranges', () => {
    const rng = new Rng(5);
    let lo = Infinity;
    let hi = -Infinity;
    for (let i = 0; i < 5000; i++) {
      const v = rng.rangeInt(3, 7);
      lo = Math.min(lo, v);
      hi = Math.max(hi, v);
    }
    expect(lo).toBe(3);
    expect(hi).toBe(7);
    expect(rng.rangeInt(4, 4)).toBe(4);
    expect(rng.rangeInt(9, 2)).toBe(9); // max <= min
  });

  it('chance(0) is always false, chance(1) is always true', () => {
    const rng = new Rng(5);
    for (let i = 0; i < 50; i++) {
      expect(rng.chance(0)).toBe(false);
      expect(rng.chance(1)).toBe(true);
    }
  });

  it('pick returns an element and covers the array over many draws', () => {
    const rng = new Rng(5);
    const arr = ['a', 'b', 'c'] as const;
    const seen = new Set<string>();
    for (let i = 0; i < 200; i++) seen.add(rng.pick(arr));
    expect(seen).toEqual(new Set(arr));
  });
});
