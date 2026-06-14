// U10 — Node-runnable solvability sweep CLI (optional, ad-hoc larger sweeps).
//
// A Phaser-free entry point that runs a configurable sweep and prints a pass/fail + timing
// summary, reusing the exact same generator + validator the vitest sweep
// (../reachability/solvability.sweep.test.ts) uses. Run it for a larger spread than the test's
// 1,000:
//
//   npx tsx src/levels/tools/sweep.ts            # default 1000 seeds at level 1
//   npx tsx src/levels/tools/sweep.ts 5000       # 5000 seeds at level 1
//   npx tsx src/levels/tools/sweep.ts 2000 3     # 2000 seeds at level 3
//   npx tsx src/levels/tools/sweep.ts 2000 8 4   # 2000 seeds at level 8, difficulty tier 4 (Hard)
//
// This is a TOOL, not app code: it is never imported by GameScene / the Vite app graph (Vite's
// bundle only includes modules reachable from index.html), so it stays out of the browser
// bundle. It imports ONLY the pure generation path — no Phaser.
//
// IMPORTANT — what this proves (KTD6 / F9, plan Open Question "Headless bot invocation"):
//   This sweep proves validator SELF-CONSISTENCY — the generator builds the spine from the
//   reachable table and the validator confirms a path using the SAME table. It does NOT prove
//   physical solvability (a table-fidelity bug would pass both). The independent, physics-
//   grounded checks are (a) the arc-trajectory conformance fixture in
//   ../reachability/reachableTable.test.ts and (b) a DEFERRED sampled bot-completes gate that
//   must run as a separate non-vitest harness (the BotController needs the live Phaser physics
//   world). Do not cite this sweep alone as proof that levels are physically beatable.

import { generateDirectedLevel } from '../realize/realizeLevel';
import { validate } from '../reachability/validator';
import { buildReachableTable } from '../reachability/reachableTable';

// Minimal ambient Node declarations so the tool type-checks without adding @types/node (the
// project pins types to ["vite/client"]). Type-only `declare` is erasable (erasableSyntaxOnly).
declare const process: {
  argv: string[];
  exit(code?: number): never;
};

interface SweepSummary {
  count: number;
  level: number;
  difficulty?: number;
  passed: number;
  failed: number;
  failures: string[];
  p50: number;
  p99: number;
  max: number;
}

function percentile(sorted: number[], q: number): number {
  if (sorted.length === 0) return 0;
  const i = Math.min(sorted.length - 1, Math.floor(q * sorted.length));
  return sorted[i];
}

export function runSweep(count: number, level: number, difficulty?: number): SweepSummary {
  const table = buildReachableTable();
  const timings: number[] = [];
  const failures: string[] = [];
  let passed = 0;

  for (let seed = 1; seed <= count; seed++) {
    const t0 = performance.now();
    const lvl = generateDirectedLevel(seed, level, undefined, difficulty);
    const result = validate(lvl, { table });
    const t1 = performance.now();
    timings.push(t1 - t0);

    if (result.ok && lvl.playerSpawns.length === 2 && lvl.exit) {
      passed++;
    } else {
      const reason = result.ok
        ? `bad shape (spawns=${lvl.playerSpawns.length}, exit=${!!lvl.exit})`
        : result.reason;
      if (failures.length < 20) failures.push(`seed=${seed} lvl=${level}: ${reason}`);
    }
  }

  const sorted = timings.sort((a, b) => a - b);
  return {
    count,
    level,
    difficulty,
    passed,
    failed: count - passed,
    failures,
    p50: percentile(sorted, 0.5),
    p99: percentile(sorted, 0.99),
    max: sorted[sorted.length - 1] ?? 0,
  };
}

function main(): void {
  const count = Number.parseInt(process.argv[2] ?? '', 10) || 1000;
  const level = Number.parseInt(process.argv[3] ?? '', 10) || 1;
  const difficultyArg = Number.parseInt(process.argv[4] ?? '', 10);
  const difficulty = Number.isNaN(difficultyArg) ? undefined : difficultyArg;

  const diffLabel = difficulty === undefined ? 'default (no scaling)' : `tier ${difficulty}`;
  console.log(`Running solvability sweep: ${count} seeds at level ${level}, difficulty ${diffLabel}...`);
  const s = runSweep(count, level, difficulty);

  console.log('');
  console.log(`  passed:  ${s.passed}/${s.count}`);
  console.log(`  failed:  ${s.failed}`);
  console.log(`  timing:  p50=${s.p50.toFixed(2)}ms p99=${s.p99.toFixed(2)}ms max=${s.max.toFixed(2)}ms`);
  if (s.failures.length > 0) {
    console.log('');
    console.log('  first failures:');
    for (const f of s.failures) console.log(`    - ${f}`);
  }
  console.log('');
  console.log(
    s.failed === 0
      ? 'SELF-CONSISTENCY OK (generator + validator agree). NOTE: not physical-solvability proof — see file header / the deferred bot gate.'
      : 'SWEEP FAILED — some levels did not pass the validator.'
  );

  process.exit(s.failed === 0 ? 0 : 1);
}

// Run main() only when this module is the direct entry point (tsx/node), never when imported
// (e.g. a test importing runSweep) — so an import can't trigger process.exit. We compare the
// module URL to the executed script path. Kept Phaser-free either way.
const entry = process.argv[1] ?? '';
if (entry && import.meta.url.endsWith(entry.replace(/\\/g, '/'))) {
  main();
}
