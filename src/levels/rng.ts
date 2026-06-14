// Injected, seeded pseudo-random number generator for deterministic level generation.
//
// This module is intentionally Phaser-free and Node-importable so the whole generation
// path (director, realizers, reachability) can run in the offline solvability sweep.
// It replaces the global `Math.random` monkeypatch the legacy generators used (R9, KTD3).
//
// Determinism contract:
//   - Same seed -> same draw sequence, forever.
//   - `fork(label)` derives an INDEPENDENT child stream from the ROOT seed (not the running
//     state), so subsystems that fork with distinct labels never desync when one changes its
//     draw count. This is what lets the curve, beats, realizer, and overlay-reroll loops each
//     own a stable stream (KTD3, KTD7).

// FNV-1a 32-bit string hash — used to turn a fork label into a seed offset.
function hashString(str: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

// Mix two 32-bit integers into a well-distributed uint32. Avoids the low-bit correlation of
// the legacy `baseSeed + levelNumber * 1000` scheme (adjacent levels got near-identical early
// output). Based on the murmur3 finalizer.
export function mixSeed(a: number, b: number): number {
  let h = ((a >>> 0) ^ Math.imul(b >>> 0, 0x9e3779b9)) >>> 0;
  h = Math.imul(h ^ (h >>> 16), 0x45d9f3b) >>> 0;
  h = Math.imul(h ^ (h >>> 16), 0x45d9f3b) >>> 0;
  h = (h ^ (h >>> 16)) >>> 0;
  return h;
}

export class Rng {
  private readonly rootSeed: number;
  private state: number;

  constructor(seed: number) {
    // Avoid a degenerate all-zero state.
    this.rootSeed = (seed >>> 0) || 0x9e3779b9;
    this.state = this.rootSeed;
  }

  /** Next float in [0, 1). mulberry32. */
  next(): number {
    this.state = (this.state + 0x6d2b79f5) | 0;
    let t = Math.imul(this.state ^ (this.state >>> 15), 1 | this.state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  /** Integer in [0, n). Returns 0 for n <= 0. Never returns n. */
  int(n: number): number {
    if (n <= 0) return 0;
    return Math.floor(this.next() * n);
  }

  /** Float in [min, max). */
  range(min: number, max: number): number {
    return min + this.next() * (max - min);
  }

  /** Integer in [min, max] inclusive. */
  rangeInt(min: number, max: number): number {
    if (max <= min) return min;
    return min + Math.floor(this.next() * (max - min + 1));
  }

  /** Uniformly pick an element. */
  pick<T>(arr: readonly T[]): T {
    return arr[this.int(arr.length)];
  }

  /** True with probability p. chance(0) is always false; chance(1) is always true. */
  chance(p: number): boolean {
    if (p <= 0) return false;
    if (p >= 1) return true;
    return this.next() < p;
  }

  /**
   * Independent child stream seeded from the root seed + label. Stable regardless of how many
   * draws this Rng has made, so forking subsystems never desync each other (KTD3).
   */
  fork(label: string): Rng {
    return new Rng(mixSeed(this.rootSeed, hashString(label)));
  }
}

/** Per-level Rng: a well-mixed hash of (baseSeed, levelNumber) per KTD3/R9. */
export function rngForLevel(baseSeed: number, levelNumber: number): Rng {
  return new Rng(mixSeed(baseSeed >>> 0, (levelNumber >>> 0) ^ 0x85ebca6b));
}
