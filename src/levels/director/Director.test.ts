import { describe, it, expect } from 'vitest';
import { deriveLevelOutline } from './Director';
import { deriveOutline } from './outline';
import { Rng } from '../rng';
import { Band } from './bands';
import { GENTLE_OPENER } from './curves';

describe('deriveLevelOutline orchestration (KTD1)', () => {
  it('wraps deriveOutline with a base-seed Rng (same result as a direct call)', () => {
    const viaDirector = deriveLevelOutline(2024, 4, 'sky');
    const direct = deriveOutline(new Rng(2024), 4, 'sky');
    expect(viaDirector).toEqual(direct);
  });

  it('is a pure function of (seed, levelNumber, theme)', () => {
    expect(deriveLevelOutline(11, 3, 'overworld')).toEqual(
      deriveLevelOutline(11, 3, 'overworld'),
    );
  });

  it('level 1 is the gentle opener regardless of seed', () => {
    for (const s of [0, 1, 777, 654321]) {
      expect(deriveLevelOutline(s, 1, 'overworld').archetype).toBe(GENTLE_OPENER.name);
    }
  });

  it('consecutive levels do not rerun the same archetype', () => {
    const seed = 8675309;
    let prev = deriveLevelOutline(seed, 1, 'overworld').archetype;
    for (let l = 2; l <= 6; l++) {
      const cur = deriveLevelOutline(seed, l, 'overworld').archetype;
      expect(cur).not.toBe(prev);
      prev = cur;
    }
  });

  it('produces a legible single-peak arc for levels > 1', () => {
    const o = deriveLevelOutline(13, 5, 'overworld');
    expect(o.beats.filter((b) => b.band === Band.PEAK).length).toBe(1);
  });
});
