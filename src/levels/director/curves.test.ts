import { describe, it, expect } from 'vitest';
import {
  CURVE_ARCHETYPES,
  GENTLE_OPENER,
  ARCHETYPE_NAMES,
  archetypeByName,
  bandSequenceFor,
} from './curves';
import { Band } from './bands';

function countPeaks(seq: readonly string[]): number {
  return seq.filter((b) => b === Band.PEAK).length;
}

describe('curve archetype vocabulary (R2/AE1)', () => {
  it('every selectable archetype has exactly one dominant peak band', () => {
    for (const a of CURVE_ARCHETYPES) {
      expect(countPeaks(a.base)).toBe(1);
    }
  });

  it('the gentle opener has NO peak band (level-1 opener, KTD10)', () => {
    expect(countPeaks(GENTLE_OPENER.base)).toBe(0);
  });

  it('ARCHETYPE_NAMES lists the selectable archetypes and excludes the gentle opener', () => {
    expect(ARCHETYPE_NAMES.length).toBe(CURVE_ARCHETYPES.length);
    expect(ARCHETYPE_NAMES).not.toContain(GENTLE_OPENER.name);
    expect(new Set(ARCHETYPE_NAMES).size).toBe(ARCHETYPE_NAMES.length); // names unique
  });

  it('archetypeByName resolves selectable archetypes and the gentle opener', () => {
    for (const name of ARCHETYPE_NAMES) {
      expect(archetypeByName(name)?.name).toBe(name);
    }
    expect(archetypeByName(GENTLE_OPENER.name)?.name).toBe(GENTLE_OPENER.name);
    expect(archetypeByName('nonsense')).toBeUndefined();
  });
});

describe('bandSequenceFor scaling preserves the single-peak shape', () => {
  it('outputs the requested length and exactly one peak across all beat counts', () => {
    for (const a of CURVE_ARCHETYPES) {
      for (let n = 4; n <= 12; n++) {
        const seq = bandSequenceFor(a, n);
        expect(seq.length).toBe(n);
        expect(countPeaks(seq)).toBe(1);
      }
    }
  });

  it('the gentle opener never gains a peak when scaled', () => {
    for (let n = 4; n <= 12; n++) {
      expect(countPeaks(bandSequenceFor(GENTLE_OPENER, n))).toBe(0);
    }
  });

  it('is deterministic for a given (archetype, beatCount)', () => {
    expect(bandSequenceFor(CURVE_ARCHETYPES[0], 7)).toEqual(
      bandSequenceFor(CURVE_ARCHETYPES[0], 7),
    );
  });
});
