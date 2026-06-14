// Difficulty-profile tool (U5, R9): prints the realized difficulty curve across levels x tiers so
// the ramp is provable (before/after) and re-tunable from the playtest loop.
//
// Like sweep.ts this is a TOOL, not app code: Phaser-free, never imported by the Vite app graph, so
// it stays out of the browser bundle. It reuses ONLY the pure generation path (generateDirectedLevel).
//
//   npx tsx src/levels/tools/difficulty-profile.ts          # default 60 seeds/cell
//   npx tsx src/levels/tools/difficulty-profile.ts 120      # 120 seeds/cell
//
// Read it as: WITHIN a tier, mean enemies/gaps should RISE with level (the ramp); ACROSS tiers at a
// fixed level, Hard > Normal > Easy. The 'legacy' tier (no difficulty arg) is today's flat baseline.

import { generateDirectedLevel } from '../realize/realizeLevel';
import { COLLIDABLE_SOLID, EnemyType } from '../types';
import type { LevelData } from '../types';

declare const process: { argv: string[]; exit(code?: number): never };

const SOLID = COLLIDABLE_SOLID;

const LEVELS = [1, 2, 4, 6, 8, 12, 20, 40];
// undefined = the legacy no-scaling baseline; 1/2/4 = the Easy/Normal/Hard menu tiers.
const TIERS: { label: string; difficulty?: number }[] = [
  { label: 'legacy', difficulty: undefined },
  { label: 'easy(1)', difficulty: 1 },
  { label: 'normal(2)', difficulty: 2 },
  { label: 'hard(4)', difficulty: 4 },
];

interface Row {
  enemies: number;
  bull: number;
  koopaPct: number;
  gaps: number;
  maxGap: number;
}

function gapStats(lvl: LevelData): { gaps: number; maxGap: number } {
  const bottom = lvl.tiles[lvl.tiles.length - 1];
  let gaps = 0, maxGap = 0, run = 0;
  for (let x = 0; x < bottom.length; x++) {
    if (!SOLID.has(bottom[x])) {
      run++;
      if (run > maxGap) maxGap = run;
    } else {
      if (run > 0) gaps++;
      run = 0;
    }
  }
  if (run > 0) gaps++;
  return { gaps, maxGap };
}

function profile(level: number, difficulty: number | undefined, seeds: number): Row {
  let enemies = 0, bull = 0, koopa = 0, nonBull = 0, gaps = 0, maxGap = 0;
  for (let seed = 1; seed <= seeds; seed++) {
    const lvl = generateDirectedLevel(seed, level, undefined, difficulty);
    enemies += lvl.enemySpawns.length;
    for (const e of lvl.enemySpawns) {
      if (e.type === EnemyType.BULL) bull++;
      else {
        nonBull++;
        if (e.type === EnemyType.KOOPA) koopa++;
      }
    }
    const g = gapStats(lvl);
    gaps += g.gaps;
    maxGap += g.maxGap;
  }
  return {
    enemies: enemies / seeds,
    bull: bull / seeds,
    koopaPct: nonBull > 0 ? (100 * koopa) / nonBull : 0,
    gaps: gaps / seeds,
    maxGap: maxGap / seeds,
  };
}

function main(): void {
  const seeds = Number.parseInt(process.argv[2] ?? '', 10) || 60;
  console.log(`Difficulty profile (mean over ${seeds} seeds/cell)\n`);

  for (const tier of TIERS) {
    console.log(`Tier: ${tier.label}`);
    console.log(' lvl | enemies | bull | koopa% | gaps | maxGap');
    console.log(' ----|---------|------|--------|------|-------');
    for (const lvl of LEVELS) {
      const r = profile(lvl, tier.difficulty, seeds);
      console.log(
        ` ${String(lvl).padStart(3)} | ${r.enemies.toFixed(1).padStart(7)} | ` +
          `${r.bull.toFixed(2).padStart(4)} | ${r.koopaPct.toFixed(0).padStart(5)}% | ` +
          `${r.gaps.toFixed(1).padStart(4)} | ${r.maxGap.toFixed(1).padStart(6)}`
      );
    }
    console.log('');
  }
}

const entry = process.argv[1] ?? '';
if (entry && import.meta.url.endsWith(entry.replace(/\\/g, '/'))) {
  main();
}
