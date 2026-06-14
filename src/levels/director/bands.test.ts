import { describe, it, expect } from 'vitest';
import { Band, scoreBand, bandRank, BAND_ORDER } from './bands';
import type { SegmentFeatures } from './bands';

function features(overrides: Partial<SegmentFeatures> = {}): SegmentFeatures {
  return {
    gapCount: 0,
    maxGapWidth: 0,
    enemyCount: 0,
    maxHeightStep: 0,
    lowCeiling: false,
    ...overrides,
  };
}

describe('scoreBand verification rubric (KTD9, R3)', () => {
  it('scores 3 gaps + 4 enemies + a 2-tile step as peak', () => {
    const f = features({ gapCount: 3, maxGapWidth: 3, enemyCount: 4, maxHeightStep: 2 });
    expect(scoreBand(f)).toBe(Band.PEAK);
  });

  it('scores a flat 1-enemy low-feature segment as easy', () => {
    const f = features({ enemyCount: 1 });
    expect(scoreBand(f)).toBe(Band.EASY);
  });

  it('scores an in-between segment as medium', () => {
    // 1 gap + 2 enemies: above easy, below every peak threshold.
    const f = features({ gapCount: 1, maxGapWidth: 2, enemyCount: 2 });
    expect(scoreBand(f)).toBe(Band.MEDIUM);
  });

  it('a fully empty segment is easy', () => {
    expect(scoreBand(features())).toBe(Band.EASY);
  });

  it('any single peak-threshold feature alone forces peak', () => {
    expect(scoreBand(features({ gapCount: 3 }))).toBe(Band.PEAK);
    expect(scoreBand(features({ maxGapWidth: 4 }))).toBe(Band.PEAK);
    expect(scoreBand(features({ enemyCount: 4 }))).toBe(Band.PEAK);
  });

  it('a 2-tile step alone is only medium; with a gap or enemy it is peak (compound)', () => {
    expect(scoreBand(features({ maxHeightStep: 2 }))).toBe(Band.MEDIUM);
    expect(scoreBand(features({ maxHeightStep: 2, gapCount: 1 }))).toBe(Band.PEAK);
    expect(scoreBand(features({ maxHeightStep: 2, enemyCount: 1 }))).toBe(Band.PEAK);
  });

  it('a low ceiling alone is medium', () => {
    expect(scoreBand(features({ lowCeiling: true }))).toBe(Band.MEDIUM);
  });

  it('is monotonic: adding threat never lowers the band', () => {
    const base = features({ enemyCount: 1 });
    const harder = features({ enemyCount: 1, gapCount: 1 });
    expect(bandRank(scoreBand(harder))).toBeGreaterThanOrEqual(bandRank(scoreBand(base)));
  });
});

describe('band ordering', () => {
  it('BAND_ORDER is easy < medium < peak', () => {
    expect(BAND_ORDER).toEqual([Band.EASY, Band.MEDIUM, Band.PEAK]);
    expect(bandRank(Band.EASY)).toBe(0);
    expect(bandRank(Band.MEDIUM)).toBe(1);
    expect(bandRank(Band.PEAK)).toBe(2);
  });
});
