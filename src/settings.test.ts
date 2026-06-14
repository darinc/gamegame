import { describe, it, expect } from 'vitest';
import {
  buildSettings,
  DEFAULT_SETTINGS,
  DIFFICULTY_TIERS,
  DEFAULT_DIFFICULTY_TIER,
  MODE_PRESETS,
} from './settings';

describe('difficulty tiers (U3, R5/R6)', () => {
  it('the default tier is Normal and equals the out-of-the-box difficulty', () => {
    const normal = DIFFICULTY_TIERS[DEFAULT_DIFFICULTY_TIER];
    expect(normal.label).toBe('Normal');
    expect(normal.value).toBe(DEFAULT_SETTINGS.difficulty);
  });

  it('tiers ascend Easy < Normal < Hard and stay inside the 1-10 URL clamp', () => {
    const values = DIFFICULTY_TIERS.map((t) => t.value);
    expect(values).toEqual([...values].sort((a, b) => a - b));
    for (const v of values) expect(v).toBeGreaterThanOrEqual(1);
    for (const v of values) expect(v).toBeLessThanOrEqual(10);
  });
});

describe('buildSettings threads difficulty (U3, R5)', () => {
  it('preserves a difficulty override', () => {
    expect(buildSettings({ difficulty: 4 }).difficulty).toBe(4);
  });

  it('keeps both the mode preset and the chosen difficulty (the confirm() shape)', () => {
    const s = buildSettings({ ...MODE_PRESETS.coop, difficulty: 4 });
    expect(s.difficulty).toBe(4);
    expect(s.playerCount).toBe(2); // coop preset survives the merge
  });

  it('survives a Title -> Game -> LevelComplete -> Game round-trip (cross-level persistence)', () => {
    // LevelCompleteScene re-runs buildSettings on the forwarded settings; difficulty must persist.
    const run = buildSettings({ ...MODE_PRESETS.coop, difficulty: 4 });
    const next = buildSettings(run);
    expect(next.difficulty).toBe(4);
  });
});

describe('difficulty is a generation-only knob (U3, R6)', () => {
  it('changing difficulty does not change lives or player state vs defaults', () => {
    const easy = buildSettings({ difficulty: 1 });
    const hard = buildSettings({ difficulty: 4 });
    expect(easy.lives).toBe(DEFAULT_SETTINGS.lives);
    expect(hard.lives).toBe(DEFAULT_SETTINGS.lives);
    expect(hard.playerStates).toEqual([]);
  });
});
