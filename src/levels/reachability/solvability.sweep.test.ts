// U10 — Offline solvability sweep: the headline Success Criterion proven at scale (R8, R9).
//
// Phaser-free / Node-importable: the whole generation path (rng -> director -> realize ->
// validate) is pure, so this runs under vitest in a plain Node environment with no DOM.
//
// What this proves, and — just as importantly — what it does NOT:
//   - SELF-CONSISTENCY (proven here): every directed level passes the same reachability
//     validator the generator builds its spine against. The generator and the validator read
//     the SAME reachable table (reachableTable.ts), so a green sweep proves the two agree —
//     the spine is solvable by construction and the gate confirms it across 1,000 seeds.
//   - PHYSICAL SOLVABILITY (NOT proven here, see the BOT GATE section at the bottom): because
//     generator and validator share the table, a table-fidelity bug would pass BOTH. The
//     independent physics-grounded evidence is (a) the arc-trajectory conformance fixture in
//     reachableTable.test.ts and (b) a DEFERRED sampled bot-completes gate that must run as a
//     separate non-vitest harness (the bot needs the live Phaser physics world — KTD6/F9,
//     plan Open Question "Headless bot invocation"). This test deliberately does NOT claim
//     physical solvability the sweep cannot prove.

import { describe, it, expect } from 'vitest';
import { generateDirectedLevel } from './../realize/realizeLevel';
import { generateDirectedLevel as fromDirector, deriveLevelOutline } from '../director/Director';
import { themeForLevel } from '../themes';
import { Band, bandRank } from '../director/bands';
import type { Band as BandT } from '../director/bands';
import { validate } from './validator';
import { buildReachableTable } from './reachableTable';
import type { ReachableTable } from './reachableTable';
import type { LevelData } from '../types';

const table: ReachableTable = buildReachableTable();

// Generous budget for synchronous generation+validation (KTD7). Measured p99/max are ~22/33ms
// on the dev target; 150ms leaves a wide margin so the reroll loop can never hang the load.
const GEN_BUDGET_MS = 150;

// --- The sweep plan -------------------------------------------------------------------------
// ~1,100 generations total to stay comfortably under the 30s vitest timeout (generation +
// validation is ~20ms/level): 1,000 seeds at level 1 (the default path) PLUS a smaller spread
// across levels 1..5 for arc/theme variety. The 1,000 level-1 generations are the priority.

const SOLVABILITY_SEEDS = 1000; // seeds 1..1000 at level 1
const SPREAD: [number, number][] = []; // (seed, level) — ~100 extra across levels 1..5
for (let seed = 1; seed <= 20; seed++) {
  for (let lvl = 1; lvl <= 5; lvl++) SPREAD.push([seed, lvl]);
}

function percentile(sorted: number[], q: number): number {
  if (sorted.length === 0) return 0;
  const i = Math.min(sorted.length - 1, Math.floor(q * sorted.length));
  return sorted[i];
}

describe('U10 solvability sweep: every generated level passes the validator (R8)', () => {
  // Shared timing accumulator — populated by the solvability sweep, read by the budget test so
  // we measure the SAME generations rather than running the sweep twice.
  const timings: number[] = [];

  it(`${SOLVABILITY_SEEDS} seeds x level 1 + ${SPREAD.length} spread: ZERO validator rejections`, () => {
    const failures: string[] = [];
    let pass = 0;
    let total = 0;

    // Warm up the pipeline once (pays the lazy reachable-table build + JIT) so the measured
    // per-level timings reflect STEADY-STATE generation cost — the thing the synchronous-load
    // budget is actually about — rather than a one-time cold-start outlier.
    generateDirectedLevel(0x9e3779b9, 1);

    const sweepOne = (seed: number, lvl: number) => {
      total++;
      const t0 = performance.now();
      const level = generateDirectedLevel(seed, lvl);
      const result = validate(level, { table });
      const t1 = performance.now();
      timings.push(t1 - t0);

      // Self-consistency invariant + the co-op shape contract (2 spawns + an exit).
      if (!result.ok) {
        failures.push(`(seed=${seed}, lvl=${lvl}): ${result.reason}`);
        return;
      }
      if (level.playerSpawns.length !== 2) {
        failures.push(`(seed=${seed}, lvl=${lvl}): expected 2 player spawns, got ${level.playerSpawns.length}`);
        return;
      }
      if (!level.exit) {
        failures.push(`(seed=${seed}, lvl=${lvl}): level has no exit`);
        return;
      }
      pass++;
    };

    for (let seed = 1; seed <= SOLVABILITY_SEEDS; seed++) sweepOne(seed, 1);
    for (const [seed, lvl] of SPREAD) sweepOne(seed, lvl);

    // Surface the first few failing seeds in the assertion message (zero is required).
    expect(failures.slice(0, 10), `${failures.length}/${total} levels FAILED the validator`).toEqual([]);
    expect(pass).toBe(total);
  });

  it('generation budget: p99 + max generation-and-validation time stay under budget (KTD7)', () => {
    expect(timings.length).toBeGreaterThan(0); // the solvability sweep must have run first
    const sorted = [...timings].sort((a, b) => a - b);
    const p50 = percentile(sorted, 0.5);
    const p99 = percentile(sorted, 0.99);
    const max = sorted[sorted.length - 1];

    // Empirically grounded, not assumed: report the measured distribution.
    // eslint-disable-next-line no-console
    console.log(
      `[U10 sweep] generation+validation over ${sorted.length} levels: ` +
        `p50=${p50.toFixed(2)}ms p99=${p99.toFixed(2)}ms max=${max.toFixed(2)}ms (budget ${GEN_BUDGET_MS}ms)`
    );

    // The synchronous reroll loop must never hang the load: max under a generous ceiling.
    expect(max).toBeLessThan(GEN_BUDGET_MS);
  });
});

describe('U10 sweep: full-pipeline determinism (R9)', () => {
  it('re-generating a sampled subset yields byte-identical LevelData (deep equal)', () => {
    const sample: [number, number][] = [
      [1, 1], [7, 1], [42, 1], [500, 1], [999, 1],
      [3, 2], [11, 3], [17, 4], [23, 5], [1000, 1],
    ];
    for (const [seed, lvl] of sample) {
      const a = generateDirectedLevel(seed, lvl);
      const b = generateDirectedLevel(seed, lvl);
      expect(b, `non-determinism at (seed=${seed}, lvl=${lvl})`).toEqual(a);
    }
  });

  it('the director re-export is the same pure pipeline', () => {
    expect(fromDirector(4, 2)).toEqual(generateDirectedLevel(4, 2));
  });
});

// --- Arc legibility (Verifiable-arc Success Criterion) --------------------------------------
// The realized band sequence must read as a SINGLE dominant peak with easier shoulders. We
// derive the band sequence from the director outline's beats' bands (the simplest, sufficient
// source — the outline IS the intended arc, and the realizer/connectors are subordinate to it).
// Level 1 is the gentle opener (no peak by design, KTD10) and is exempt from the peak check.

interface ArcCheck {
  ok: boolean;
  reason?: string;
  peakRuns: number;
  hasPeak: boolean;
}

function bandsForLevel(seed: number, lvl: number): BandT[] {
  const theme = themeForLevel(lvl).name;
  const outline = deriveLevelOutline(seed, lvl, theme);
  return outline.beats.map((b) => b.band);
}

/**
 * A legible arc has EXACTLY ONE contiguous run of the peak band, and the beats before/after that
 * run are no harder than the peak (trivially true since 'peak' is the max band, but we assert it
 * explicitly so a future band added above 'peak' can't silently break legibility). Level 1 has
 * no peak by design and is handled by the caller (exempt).
 */
function checkArc(bands: BandT[]): ArcCheck {
  const peakRank = bandRank(Band.PEAK);
  // Count contiguous runs of the peak band.
  let peakRuns = 0;
  let inPeak = false;
  let firstPeak = -1;
  let lastPeak = -1;
  for (let i = 0; i < bands.length; i++) {
    const isPeak = bands[i] === Band.PEAK;
    if (isPeak && !inPeak) peakRuns++;
    if (isPeak) {
      if (firstPeak < 0) firstPeak = i;
      lastPeak = i;
    }
    inPeak = isPeak;
  }
  const hasPeak = peakRuns > 0;
  if (peakRuns !== 1) {
    return { ok: false, reason: `expected exactly 1 peak run, found ${peakRuns}`, peakRuns, hasPeak };
  }
  // Shoulders before/after the single peak run must not be HARDER than the peak.
  for (let i = 0; i < bands.length; i++) {
    if (i >= firstPeak && i <= lastPeak) continue; // the peak run itself
    if (bandRank(bands[i]) > peakRank) {
      return {
        ok: false,
        reason: `shoulder beat ${i} (${bands[i]}) is harder than the peak`,
        peakRuns,
        hasPeak,
      };
    }
  }
  return { ok: true, peakRuns, hasPeak };
}

describe('U10 sweep: arc legibility (single dominant peak with easier shoulders)', () => {
  it('a sample of non-level-1 levels each have exactly one dominant peak run', () => {
    const sample: [number, number][] = [];
    for (let seed = 1; seed <= 30; seed++) for (let lvl = 2; lvl <= 5; lvl++) sample.push([seed, lvl]);

    const failures: string[] = [];
    for (const [seed, lvl] of sample) {
      const arc = checkArc(bandsForLevel(seed, lvl));
      if (!arc.ok) failures.push(`(seed=${seed}, lvl=${lvl}): ${arc.reason} [${bandsForLevel(seed, lvl).join(',')}]`);
    }
    expect(failures.slice(0, 10)).toEqual([]);
  });

  it('level 1 is the gentle opener: no peak band (exempt from the peak check), reproducibly', () => {
    for (let seed = 1; seed <= 30; seed++) {
      const arc = checkArc(bandsForLevel(seed, 1));
      expect(arc.hasPeak, `level 1 (seed=${seed}) should have no peak`).toBe(false);
    }
  });
});

// --- Variety surface (Success Criterion) ----------------------------------------------------
// A TYPICAL single run surfaces >1 enemy type across its enemySpawns AND at least one
// non-static element. In Phase 1, non-static = a generator-placed bull (a bull in enemySpawns
// satisfies it). We assert on the AGGREGATE over a sample (a typical level, not every level),
// and report the observed distribution so the claim is empirically grounded.

describe('U10 sweep: variety surface (>1 enemy type + a non-static element)', () => {
  it('a typical level surfaces more than one enemy type and bulls appear across the sample', () => {
    const sample: [number, number][] = [];
    for (let seed = 1; seed <= 60; seed++) for (let lvl = 2; lvl <= 4; lvl++) sample.push([seed, lvl]);

    const typeCounts: Record<string, number> = {};
    let multiType = 0;
    let withBull = 0;
    let withAnyEnemy = 0;

    for (const [seed, lvl] of sample) {
      const level: LevelData = generateDirectedLevel(seed, lvl);
      const types = new Set(level.enemySpawns.map((e) => e.type ?? 'goomba'));
      for (const t of types) typeCounts[t] = (typeCounts[t] ?? 0) + 1;
      if (level.enemySpawns.length > 0) withAnyEnemy++;
      if (types.size > 1) multiType++;
      if (level.enemySpawns.some((e) => e.type === 'bull')) withBull++;
    }

    // eslint-disable-next-line no-console
    console.log(
      `[U10 sweep] variety over ${sample.length} levels: ` +
        `multiType=${multiType} withBull=${withBull} withAnyEnemy=${withAnyEnemy} ` +
        `typeDistribution=${JSON.stringify(typeCounts)}`
    );

    // The full roster (Goomba, Koopa, Bull) is exercised across the sample (R12).
    expect(typeCounts['goomba'] ?? 0).toBeGreaterThan(0);
    expect(typeCounts['koopa'] ?? 0).toBeGreaterThan(0);
    expect(typeCounts['bull'] ?? 0).toBeGreaterThan(0);

    // A TYPICAL level (the majority) surfaces >1 enemy type and a non-static bull element.
    expect(multiType).toBeGreaterThan(sample.length / 2);
    expect(withBull).toBeGreaterThan(sample.length / 2);
  });
});

// =============================================================================================
// BOT GATE (KTD6 / F9) — DEFERRED, NOT IMPLEMENTED HERE. Read before trusting "solvable".
// =============================================================================================
//
// This sweep proves validator SELF-CONSISTENCY only: the generator builds the spine from the
// reachable table and the validator confirms a spawn->exit path using the SAME table. A
// table-fidelity bug (the plan's highest risk, "Shared-table blind spot") would pass BOTH the
// generator and this sweep — so the green result above is NOT, by itself, proof of physical
// solvability.
//
// The independent, physics-grounded evidence is split across two places:
//   (a) Arc-trajectory conformance fixture — reachableTable.test.ts ("jump-arc conformance
//       (KTD5)"): asserts the offline integrator reproduces the REAL Player jump arc within
//       tolerance, catching per-frame integration drift the table is built on.
//   (b) Sampled bot-completes gate — DEFERRED. The BotController (src/systems/BotController.ts)
//       is the live-play regression oracle, but it reads the live Phaser physics world, which
//       cannot run under vitest/node. Per the plan's Open Question "Headless bot invocation",
//       this runs as a SEPARATE non-vitest harness (browser/Electron bot-sweep script) or as
//       manual QA — not here. Failure protocol (plan U10): a bot non-completion on a
//       validator-passing seed triggers MANUAL human verification before it is treated as a
//       table bug or a bot false positive — never auto-pass by widening the timeout.
//
// Until that harness lands, do NOT cite this sweep as proof that levels are physically
// beatable — only that the generator and validator agree.
