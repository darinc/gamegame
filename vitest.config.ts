import { defineConfig } from 'vitest/config';

// The generation path (rng, director, realize, reachability) is pure and Phaser-free,
// so these tests run in a plain Node environment with no DOM/jsdom. Anything that
// imports Phaser must NOT be reachable from a test file (see the determinism guard in U9).
export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
    // The 1,000-seed solvability sweep is heavier than a unit test.
    testTimeout: 30_000,
  },
});
