import type { LevelChunk } from '../types';
import { EnemyType } from '../types';

// Classic ascending staircase (SMB 1-1 finale style). The tall end is a SOLID column to the
// floor, so its standable exit surface is 8 tiles up (NOT 6 — the old declared value undercounted
// the solid run; KTD11's geometry check now binds it). easy/high: a big elevation gain, low threat.
export const stairClimb: LevelChunk = {
  name: 'stair_climb',
  width: 10,
  height: 12,
  entryHeight: 2,
  exitHeight: 8,
  difficulty: 2,
  tags: ['transition'],
  band: 'easy',
  verticality: 'high',
  lowCeiling: false,
  tiles: [
    [0,0,0,0,0,0,0,0,0,0],
    [0,0,0,0,0,0,0,0,0,0],
    [0,0,0,0,0,0,0,0,0,0],
    [0,0,0,0,0,0,0,0,0,0],
    [0,0,0,0,0,0,0,0,0,1],
    [0,0,0,0,0,0,0,0,1,1],
    [0,0,0,0,0,0,0,1,1,1],
    [0,0,0,0,0,0,1,1,1,1],
    [0,0,0,0,0,1,1,1,1,1],
    [0,0,0,0,1,1,1,1,1,1],
    [1,1,1,1,1,1,1,1,1,1],
    [1,1,1,1,1,1,1,1,1,1],
  ],
  coinSpawns: [
    { x: 5, y: 8 },
    { x: 7, y: 6 },
    { x: 9, y: 4 },
  ],
};

// Descending staircase. Tall end is a solid column to the floor, so its entry surface is 8 up.
export const stairDescend: LevelChunk = {
  name: 'stair_descend',
  width: 10,
  height: 12,
  entryHeight: 8,
  exitHeight: 2,
  difficulty: 2,
  tags: ['transition'],
  band: 'easy',
  verticality: 'high',
  lowCeiling: false,
  tiles: [
    [0,0,0,0,0,0,0,0,0,0],
    [0,0,0,0,0,0,0,0,0,0],
    [0,0,0,0,0,0,0,0,0,0],
    [0,0,0,0,0,0,0,0,0,0],
    [1,0,0,0,0,0,0,0,0,0],
    [1,1,0,0,0,0,0,0,0,0],
    [1,1,1,0,0,0,0,0,0,0],
    [1,1,1,1,0,0,0,0,0,0],
    [1,1,1,1,1,0,0,0,0,0],
    [1,1,1,1,1,1,0,0,0,0],
    [1,1,1,1,1,1,1,1,1,1],
    [1,1,1,1,1,1,1,1,1,1],
  ],
};

// Pipe gauntlet with enemies
export const pipeGauntlet: LevelChunk = {
  name: 'pipe_gauntlet',
  width: 16,
  height: 12,
  entryHeight: 2,
  exitHeight: 2,
  difficulty: 4,
  tags: ['combat'],
  band: 'medium',
  verticality: 'flat',
  lowCeiling: false,
  tiles: [
    [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
    [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
    [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
    [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
    [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
    [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
    [0,0,6,6,0,0,0,0,0,0,0,6,6,0,0,0],
    [0,0,6,6,0,0,6,6,0,0,0,6,6,0,0,0],
    [0,0,6,6,0,0,6,6,0,0,0,6,6,0,0,0],
    [0,0,6,6,0,0,6,6,0,0,0,6,6,0,0,0],
    [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
    [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
  ],
  enemySpawns: [
    { x: 5, y: 9, type: EnemyType.GOOMBA },
    { x: 9, y: 9, type: EnemyType.GOOMBA },
    { x: 14, y: 9, type: EnemyType.GOOMBA },
  ],
};

// Coin heaven - high platform dense with coins
export const coinHeaven: LevelChunk = {
  name: 'coin_heaven',
  width: 14,
  height: 12,
  entryHeight: 2,
  exitHeight: 2,
  difficulty: 3,
  tags: ['reward'],
  band: 'easy',
  verticality: 'flat',
  lowCeiling: false,
  reward: 'coin-route',
  tiles: [
    [0,0,0,0,0,0,0,0,0,0,0,0,0,0],
    [0,0,0,0,0,0,0,0,0,0,0,0,0,0],
    [0,0,0,4,4,4,4,4,4,4,4,0,0,0],
    [0,0,0,0,0,0,0,0,0,0,0,0,0,0],
    [0,0,0,0,0,0,0,0,0,0,0,0,0,0],
    [0,0,4,4,0,0,0,0,0,0,4,4,0,0],
    [0,0,0,0,0,0,0,0,0,0,0,0,0,0],
    [0,0,0,0,0,0,0,0,0,0,0,0,0,0],
    [0,0,0,0,0,0,0,0,0,0,0,0,0,0],
    [0,0,0,0,0,0,0,0,0,0,0,0,0,0],
    [1,1,1,1,1,1,1,1,1,1,1,1,1,1],
    [1,1,1,1,1,1,1,1,1,1,1,1,1,1],
  ],
  coinSpawns: [
    // High platform coins
    { x: 4, y: 1 }, { x: 5, y: 1 }, { x: 6, y: 1 },
    { x: 7, y: 1 }, { x: 8, y: 1 }, { x: 9, y: 1 },
    // Mid platform coins
    { x: 2, y: 4 }, { x: 3, y: 4 },
    { x: 10, y: 4 }, { x: 11, y: 4 },
  ],
};

// Classic question block row
export const questionBlockRow: LevelChunk = {
  name: 'question_block_row',
  width: 12,
  height: 12,
  entryHeight: 2,
  exitHeight: 2,
  difficulty: 2,
  tags: ['reward'],
  band: 'easy',
  verticality: 'flat',
  lowCeiling: false,
  tiles: [
    [0,0,0,0,0,0,0,0,0,0,0,0],
    [0,0,0,0,0,0,0,0,0,0,0,0],
    [0,0,0,0,0,0,0,0,0,0,0,0],
    [0,0,0,0,0,0,0,0,0,0,0,0],
    [0,0,0,0,0,0,0,0,0,0,0,0],
    [0,0,0,0,0,0,0,0,0,0,0,0],
    [0,0,0,0,0,0,0,0,0,0,0,0],
    [0,0,2,3,2,3,2,3,2,0,0,0],
    [0,0,0,0,0,0,0,0,0,0,0,0],
    [0,0,0,0,0,0,0,0,0,0,0,0],
    [1,1,1,1,1,1,1,1,1,1,1,1],
    [1,1,1,1,1,1,1,1,1,1,1,1],
  ],
};

// High question blocks - requires running jump
export const highBlocks: LevelChunk = {
  name: 'high_blocks',
  width: 12,
  height: 12,
  entryHeight: 2,
  exitHeight: 2,
  difficulty: 4,
  tags: ['platforming', 'reward'],
  band: 'easy',
  verticality: 'flat',
  lowCeiling: false,
  tiles: [
    [0,0,0,0,0,0,0,0,0,0,0,0],
    [0,0,0,0,0,0,0,0,0,0,0,0],
    [0,0,0,0,0,0,0,0,0,0,0,0],
    [0,0,0,0,3,0,0,3,0,0,0,0],
    [0,0,0,0,0,0,0,0,0,0,0,0],
    [0,0,0,0,0,0,0,0,0,0,0,0],
    [0,0,0,0,0,0,0,0,0,0,0,0],
    [0,0,0,0,0,0,0,0,0,0,0,0],
    [0,0,0,0,0,0,0,0,0,0,0,0],
    [0,0,0,0,0,0,0,0,0,0,0,0],
    [1,1,1,1,1,1,1,1,1,1,1,1],
    [1,1,1,1,1,1,1,1,1,1,1,1],
  ],
};

// Gap jump with coin guide
export const gapJump: LevelChunk = {
  name: 'gap_jump',
  width: 10,
  height: 12,
  entryHeight: 2,
  exitHeight: 2,
  difficulty: 3,
  tags: ['platforming'],
  band: 'peak',
  verticality: 'flat',
  lowCeiling: false,
  tiles: [
    [0,0,0,0,0,0,0,0,0,0],
    [0,0,0,0,0,0,0,0,0,0],
    [0,0,0,0,0,0,0,0,0,0],
    [0,0,0,0,0,0,0,0,0,0],
    [0,0,0,0,0,0,0,0,0,0],
    [0,0,0,0,0,0,0,0,0,0],
    [0,0,0,0,0,0,0,0,0,0],
    [0,0,0,0,0,0,0,0,0,0],
    [0,0,0,0,0,0,0,0,0,0],
    [0,0,0,0,0,0,0,0,0,0],
    [1,1,1,0,0,0,0,1,1,1],
    [1,1,1,0,0,0,0,1,1,1],
  ],
  coinSpawns: [
    // Coin arc to guide the jump
    { x: 3.5, y: 8 },
    { x: 4.5, y: 7 },
    { x: 5.5, y: 7 },
    { x: 6.5, y: 8 },
  ],
};

// Wide gap - harder jump
export const wideGap: LevelChunk = {
  name: 'wide_gap',
  width: 12,
  height: 12,
  entryHeight: 2,
  exitHeight: 2,
  difficulty: 5,
  tags: ['platforming'],
  band: 'peak',
  verticality: 'flat',
  lowCeiling: false,
  tiles: [
    [0,0,0,0,0,0,0,0,0,0,0,0],
    [0,0,0,0,0,0,0,0,0,0,0,0],
    [0,0,0,0,0,0,0,0,0,0,0,0],
    [0,0,0,0,0,0,0,0,0,0,0,0],
    [0,0,0,0,0,0,0,0,0,0,0,0],
    [0,0,0,0,0,0,0,0,0,0,0,0],
    [0,0,0,0,0,0,0,0,0,0,0,0],
    [0,0,0,0,0,0,0,0,0,0,0,0],
    [0,0,0,0,0,0,0,0,0,0,0,0],
    [0,0,0,0,0,0,0,0,0,0,0,0],
    [1,1,1,0,0,0,0,0,0,1,1,1],
    [1,1,1,0,0,0,0,0,0,1,1,1],
  ],
  coinSpawns: [
    { x: 4, y: 7 },
    { x: 5.5, y: 6 },
    { x: 7, y: 7 },
  ],
};

// Brick pyramid
export const brickPyramid: LevelChunk = {
  name: 'brick_pyramid',
  width: 12,
  height: 12,
  entryHeight: 2,
  exitHeight: 2,
  difficulty: 3,
  tags: ['platforming'],
  // The pyramid's lowest bricks sit just above the floor at its base, so a standing player has a
  // brick head-bonk ceiling there (lowCeiling) -> medium. Flat ground edges -> flat verticality.
  band: 'medium',
  verticality: 'flat',
  lowCeiling: true,
  tiles: [
    [0,0,0,0,0,0,0,0,0,0,0,0],
    [0,0,0,0,0,0,0,0,0,0,0,0],
    [0,0,0,0,0,0,0,0,0,0,0,0],
    [0,0,0,0,0,0,0,0,0,0,0,0],
    [0,0,0,0,0,0,0,0,0,0,0,0],
    [0,0,0,0,0,3,0,0,0,0,0,0],
    [0,0,0,0,2,2,2,0,0,0,0,0],
    [0,0,0,2,2,2,2,2,0,0,0,0],
    [0,0,2,2,2,2,2,2,2,0,0,0],
    [0,0,0,0,0,0,0,0,0,0,0,0],
    [1,1,1,1,1,1,1,1,1,1,1,1],
    [1,1,1,1,1,1,1,1,1,1,1,1],
  ],
  coinSpawns: [
    { x: 5.5, y: 4 },
  ],
};

// Platform stepping stones
export const steppingStones: LevelChunk = {
  name: 'stepping_stones',
  width: 14,
  height: 12,
  entryHeight: 2,
  exitHeight: 2,
  difficulty: 4,
  tags: ['platforming'],
  band: 'peak',
  verticality: 'flat',
  lowCeiling: false,
  tiles: [
    [0,0,0,0,0,0,0,0,0,0,0,0,0,0],
    [0,0,0,0,0,0,0,0,0,0,0,0,0,0],
    [0,0,0,0,0,0,0,0,0,0,0,0,0,0],
    [0,0,0,0,0,0,0,0,0,0,0,0,0,0],
    [0,0,0,0,0,0,0,0,0,0,4,4,0,0],
    [0,0,0,0,0,0,0,0,0,0,0,0,0,0],
    [0,0,0,0,0,0,0,4,4,0,0,0,0,0],
    [0,0,0,0,0,0,0,0,0,0,0,0,0,0],
    [0,0,0,0,4,4,0,0,0,0,0,0,0,0],
    [0,0,0,0,0,0,0,0,0,0,0,0,0,0],
    [1,1,1,0,0,0,0,0,0,0,0,0,1,1],
    [1,1,1,0,0,0,0,0,0,0,0,0,1,1],
  ],
  coinSpawns: [
    { x: 4.5, y: 7 },
    { x: 7.5, y: 5 },
    { x: 10.5, y: 3 },
  ],
};

// Enemy rush - multiple goombas
export const enemyRush: LevelChunk = {
  name: 'enemy_rush',
  width: 16,
  height: 12,
  entryHeight: 2,
  exitHeight: 2,
  difficulty: 5,
  tags: ['combat'],
  band: 'peak',
  verticality: 'flat',
  lowCeiling: false,
  tiles: [
    [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
    [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
    [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
    [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
    [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
    [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
    [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
    [0,0,0,0,0,0,0,3,0,0,0,0,0,0,0,0],
    [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
    [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
    [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
    [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
  ],
  enemySpawns: [
    { x: 3, y: 9, type: EnemyType.GOOMBA },
    { x: 6, y: 9, type: EnemyType.GOOMBA },
    { x: 9, y: 9, type: EnemyType.GOOMBA },
    { x: 12, y: 9, type: EnemyType.GOOMBA },
  ],
};

// Gentle rolling bumps — easy walk-over with coins above.
export const gentleHills: LevelChunk = {
  name: 'gentle_hills',
  width: 14,
  height: 12,
  entryHeight: 2,
  exitHeight: 2,
  difficulty: 1,
  tags: ['transition'],
  band: 'medium',
  verticality: 'stepped',
  lowCeiling: false,
  tiles: [
    [0,0,0,0,0,0,0,0,0,0,0,0,0,0],
    [0,0,0,0,0,0,0,0,0,0,0,0,0,0],
    [0,0,0,0,0,0,0,0,0,0,0,0,0,0],
    [0,0,0,0,0,0,0,0,0,0,0,0,0,0],
    [0,0,0,0,0,0,0,0,0,0,0,0,0,0],
    [0,0,0,0,0,0,0,0,0,0,0,0,0,0],
    [0,0,0,0,0,0,0,0,0,0,0,0,0,0],
    [0,0,0,0,0,0,0,0,0,0,0,0,0,0],
    [0,0,0,1,1,0,0,0,0,1,1,1,0,0],
    [0,0,0,1,1,0,0,0,0,1,1,1,0,0],
    [1,1,1,1,1,1,1,1,1,1,1,1,1,1],
    [1,1,1,1,1,1,1,1,1,1,1,1,1,1],
  ],
  coinSpawns: [
    { x: 3.5, y: 6 }, { x: 6.5, y: 7 }, { x: 10, y: 6 },
  ],
};

// A low coin row flanked by two bricks — pure reward, no risk.
export const coinPocket: LevelChunk = {
  name: 'coin_pocket',
  width: 10,
  height: 12,
  entryHeight: 2,
  exitHeight: 2,
  difficulty: 1,
  tags: ['reward'],
  band: 'easy',
  verticality: 'flat',
  lowCeiling: false,
  reward: 'coin-route',
  tiles: [
    [0,0,0,0,0,0,0,0,0,0],
    [0,0,0,0,0,0,0,0,0,0],
    [0,0,0,0,0,0,0,0,0,0],
    [0,0,0,0,0,0,0,0,0,0],
    [0,0,0,0,0,0,0,0,0,0],
    [0,0,0,0,0,0,0,0,0,0],
    [0,0,2,0,0,0,0,2,0,0],
    [0,0,0,0,0,0,0,0,0,0],
    [0,0,0,0,0,0,0,0,0,0],
    [0,0,0,0,0,0,0,0,0,0],
    [1,1,1,1,1,1,1,1,1,1],
    [1,1,1,1,1,1,1,1,1,1],
  ],
  coinSpawns: [
    { x: 3, y: 9 }, { x: 4, y: 9 }, { x: 5, y: 9 }, { x: 6, y: 9 },
  ],
};

// Two friendly stepping platforms with coins to grab.
export const lowPlatforms: LevelChunk = {
  name: 'low_platforms',
  width: 14,
  height: 12,
  entryHeight: 2,
  exitHeight: 2,
  difficulty: 2,
  tags: ['platforming', 'reward'],
  band: 'easy',
  verticality: 'flat',
  lowCeiling: false,
  tiles: [
    [0,0,0,0,0,0,0,0,0,0,0,0,0,0],
    [0,0,0,0,0,0,0,0,0,0,0,0,0,0],
    [0,0,0,0,0,0,0,0,0,0,0,0,0,0],
    [0,0,0,0,0,0,0,0,0,0,0,0,0,0],
    [0,0,0,0,0,0,0,0,0,4,4,4,0,0],
    [0,0,0,0,0,0,0,0,0,0,0,0,0,0],
    [0,0,0,4,4,4,0,0,0,0,0,0,0,0],
    [0,0,0,0,0,0,0,0,0,0,0,0,0,0],
    [0,0,0,0,0,0,0,0,0,0,0,0,0,0],
    [0,0,0,0,0,0,0,0,0,0,0,0,0,0],
    [1,1,1,1,1,1,1,1,1,1,1,1,1,1],
    [1,1,1,1,1,1,1,1,1,1,1,1,1,1],
  ],
  coinSpawns: [
    { x: 4, y: 5 }, { x: 5, y: 5 }, { x: 10, y: 3 }, { x: 11, y: 3 },
  ],
};

// A single short pipe — a gentle hop with a coin reward.
export const singlePipe: LevelChunk = {
  name: 'single_pipe',
  width: 9,
  height: 12,
  entryHeight: 2,
  exitHeight: 2,
  difficulty: 1,
  tags: ['transition'],
  band: 'medium',
  verticality: 'flat',
  lowCeiling: true,
  tiles: [
    [0,0,0,0,0,0,0,0,0],
    [0,0,0,0,0,0,0,0,0],
    [0,0,0,0,0,0,0,0,0],
    [0,0,0,0,0,0,0,0,0],
    [0,0,0,0,0,0,0,0,0],
    [0,0,0,0,0,0,0,0,0],
    [0,0,0,0,0,0,0,0,0],
    [0,0,0,0,6,6,0,0,0],
    [0,0,0,0,6,6,0,0,0],
    [0,0,0,0,0,0,0,0,0],
    [1,1,1,1,1,1,1,1,1],
    [1,1,1,1,1,1,1,1,1],
  ],
  coinSpawns: [
    { x: 2, y: 8 }, { x: 7, y: 8 },
  ],
};

// A pair of reachable question/brick blocks at jump height.
export const questionPair: LevelChunk = {
  name: 'question_pair',
  width: 10,
  height: 12,
  entryHeight: 2,
  exitHeight: 2,
  difficulty: 2,
  tags: ['reward'],
  band: 'easy',
  verticality: 'flat',
  lowCeiling: false,
  tiles: [
    [0,0,0,0,0,0,0,0,0,0],
    [0,0,0,0,0,0,0,0,0,0],
    [0,0,0,0,0,0,0,0,0,0],
    [0,0,0,0,0,0,0,0,0,0],
    [0,0,0,3,0,2,0,3,0,0],
    [0,0,0,0,0,0,0,0,0,0],
    [0,0,0,0,0,0,0,0,0,0],
    [0,0,0,0,0,0,0,0,0,0],
    [0,0,0,0,0,0,0,0,0,0],
    [0,0,0,0,0,0,0,0,0,0],
    [1,1,1,1,1,1,1,1,1,1],
    [1,1,1,1,1,1,1,1,1,1],
  ],
};

// =============================================================================================
// U6 ELEVATION + COVERAGE EXPANSION (R5, R7, R13).
//
// The director (src/levels/director) requests a beat as a (band x verticality) cell. Empirically
// (sampled across 60 base seeds x 12 levels via deriveLevelOutline) it emits exactly 7 cells —
// easy never asks for 'high', peak never asks for 'flat':
//   easy|flat, easy|stepped, medium|flat, medium|stepped, medium|high, peak|stepped, peak|high
// The chunks below give every emitted cell >= 2 NON-repeating authored candidates with REAL
// elevation variety (the core R7 gap: the original 14 flat chunks could not realize stepped/high
// beats). Each is annotated with the band/verticality/lowCeiling its geometry actually measures
// to (coverage.test.ts re-derives and asserts these — KTD11, annotations can't drift).
//
// Band/verticality recap (see chunks/analysis.ts + director/bands.ts):
//   band:        easy < medium < peak, scored from gaps / enemies / ground-step / lowCeiling.
//                NOTE a >=2-tile ground step combined with a gap OR an enemy scores PEAK
//                (compound pressure), so "medium" chunks keep steps to 1 tile when they add threat.
//   verticality: max(ground-step within, |entry-exit|) -> 0 flat / 1-2 stepped / >=3 high.
// =============================================================================================

// --- easy|stepped : gentle 1-tile undulation, no threat --------------------------------------

// A single friendly 1-tile bump up and back down. step=1 -> easy + stepped.
export const gentleSteps: LevelChunk = {
  name: 'gentle_steps',
  width: 14,
  height: 12,
  entryHeight: 2,
  exitHeight: 2,
  difficulty: 1,
  tags: ['transition'],
  band: 'easy',
  verticality: 'stepped',
  lowCeiling: false,
  tiles: [
    [0,0,0,0,0,0,0,0,0,0,0,0,0,0],
    [0,0,0,0,0,0,0,0,0,0,0,0,0,0],
    [0,0,0,0,0,0,0,0,0,0,0,0,0,0],
    [0,0,0,0,0,0,0,0,0,0,0,0,0,0],
    [0,0,0,0,0,0,0,0,0,0,0,0,0,0],
    [0,0,0,0,0,0,0,0,0,0,0,0,0,0],
    [0,0,0,0,0,0,0,0,0,0,0,0,0,0],
    [0,0,0,0,0,0,0,0,0,0,0,0,0,0],
    [0,0,0,0,0,0,0,0,0,0,0,0,0,0],
    [0,0,0,1,1,1,1,1,1,0,0,0,0,0],
    [1,1,1,1,1,1,1,1,1,1,1,1,1,1],
    [1,1,1,1,1,1,1,1,1,1,1,1,1,1],
  ],
  coinSpawns: [
    { x: 4.5, y: 7 }, { x: 7, y: 7 },
  ],
};

// Step up onto a 1-tile-higher exit ledge (entry 2 -> exit 3). step=1, edgeDelta=1 -> easy + stepped.
export const risingLedge: LevelChunk = {
  name: 'rising_ledge',
  width: 10,
  height: 12,
  entryHeight: 2,
  exitHeight: 3,
  difficulty: 1,
  tags: ['transition'],
  band: 'easy',
  verticality: 'stepped',
  lowCeiling: false,
  tiles: [
    [0,0,0,0,0,0,0,0,0,0],
    [0,0,0,0,0,0,0,0,0,0],
    [0,0,0,0,0,0,0,0,0,0],
    [0,0,0,0,0,0,0,0,0,0],
    [0,0,0,0,0,0,0,0,0,0],
    [0,0,0,0,0,0,0,0,0,0],
    [0,0,0,0,0,0,0,0,0,0],
    [0,0,0,0,0,0,0,0,0,0],
    [0,0,0,0,0,0,0,0,0,0],
    [0,0,0,0,0,1,1,1,1,1],
    [1,1,1,1,1,1,1,1,1,1],
    [1,1,1,1,1,1,1,1,1,1],
  ],
  coinSpawns: [
    { x: 6, y: 7 }, { x: 7, y: 7 },
  ],
};

// --- medium|stepped : 2-tile terraces / low corridor, mild pressure --------------------------

// Two 2-tile terraces up and back down, no enemies. step=2 -> medium; verticality stepped.
export const terraceWalk: LevelChunk = {
  name: 'terrace_walk',
  width: 14,
  height: 12,
  entryHeight: 2,
  exitHeight: 2,
  difficulty: 2,
  tags: ['platforming'],
  band: 'medium',
  verticality: 'stepped',
  lowCeiling: false,
  tiles: [
    [0,0,0,0,0,0,0,0,0,0,0,0,0,0],
    [0,0,0,0,0,0,0,0,0,0,0,0,0,0],
    [0,0,0,0,0,0,0,0,0,0,0,0,0,0],
    [0,0,0,0,0,0,0,0,0,0,0,0,0,0],
    [0,0,0,0,0,0,0,0,0,0,0,0,0,0],
    [0,0,0,0,0,0,0,0,0,0,0,0,0,0],
    [0,0,0,0,0,0,0,0,0,0,0,0,0,0],
    [0,0,0,0,0,0,0,0,0,0,0,0,0,0],
    [0,0,0,0,1,1,1,1,1,1,0,0,0,0],
    [0,0,0,0,1,1,1,1,1,1,0,0,0,0],
    [1,1,1,1,1,1,1,1,1,1,1,1,1,1],
    [1,1,1,1,1,1,1,1,1,1,1,1,1,1],
  ],
  coinSpawns: [
    { x: 6.5, y: 6 }, { x: 8.5, y: 6 },
  ],
};

// A 2-tile step up into a brick-roofed corridor (low ceiling). lowCeiling + step=2 -> medium;
// verticality stepped. Doubles as a theme-illegal chunk under Sky (no low ceilings) in U8.
export const lowRoofCorridor: LevelChunk = {
  name: 'low_roof_corridor',
  width: 12,
  height: 12,
  entryHeight: 2,
  exitHeight: 4,
  difficulty: 2,
  tags: ['platforming'],
  band: 'medium',
  verticality: 'stepped',
  lowCeiling: true,
  tiles: [
    [0,0,0,0,0,0,0,0,0,0,0,0],
    [0,0,0,0,0,0,0,0,0,0,0,0],
    [0,0,0,0,0,0,0,0,0,0,0,0],
    [0,0,0,0,0,0,0,0,0,0,0,0],
    [0,0,0,0,0,0,0,0,0,0,0,0],
    [0,0,0,0,0,0,0,0,0,0,0,0],
    [0,0,0,0,0,0,2,2,2,2,0,0],
    [0,0,0,0,0,0,0,0,0,0,0,0],
    [0,0,0,0,0,0,1,1,1,1,1,1],
    [0,0,0,0,0,0,1,1,1,1,1,1],
    [1,1,1,1,1,1,1,1,1,1,1,1],
    [1,1,1,1,1,1,1,1,1,1,1,1],
  ],
  coinSpawns: [
    { x: 8, y: 7 }, { x: 9, y: 7 },
  ],
};

// --- medium|high : reach a high ledge, but only mild per-step / mild threat -------------------

// A gentle 1-tile-per-step climb to a high (exit 5) ledge crossing one 2-wide gap. edgeDelta=3
// -> high; one gap (maxGap=2) -> medium; steps are 1 tile so no compound peak. medium|high.
export const risingGap: LevelChunk = {
  name: 'rising_gap',
  width: 14,
  height: 12,
  entryHeight: 2,
  exitHeight: 6,
  difficulty: 4,
  tags: ['platforming'],
  band: 'medium',
  verticality: 'high',
  lowCeiling: false,
  tiles: [
    [0,0,0,0,0,0,0,0,0,0,0,0,0,0],
    [0,0,0,0,0,0,0,0,0,0,0,0,0,0],
    [0,0,0,0,0,0,0,0,0,0,0,0,0,0],
    [0,0,0,0,0,0,0,0,0,0,0,0,0,0],
    [0,0,0,0,0,0,0,0,0,0,0,0,0,0],
    [0,0,0,0,0,0,0,0,0,0,0,0,0,0],
    [0,0,0,0,0,0,0,0,0,0,0,1,1,1],
    [0,0,0,0,0,0,0,0,0,1,1,1,1,1],
    [0,0,0,0,1,1,1,0,0,1,1,1,1,1],
    [0,0,1,1,1,1,1,0,0,1,1,1,1,1],
    [1,1,1,1,1,1,1,0,0,1,1,1,1,1],
    [1,1,1,1,1,1,1,1,1,1,1,1,1,1],
  ],
  coinSpawns: [
    { x: 7.5, y: 6 }, { x: 11, y: 5 },
  ],
};

// Climb 1-tile steps to a high (exit 5) ledge defended by three Goombas. edgeDelta=3 -> high;
// enemyCount=3 -> medium; 1-tile steps avoid compound peak. medium|high. Koopa adds threat variety.
export const highLedgeFight: LevelChunk = {
  name: 'high_ledge_fight',
  width: 14,
  height: 12,
  entryHeight: 2,
  exitHeight: 6,
  difficulty: 4,
  tags: ['combat'],
  band: 'medium',
  verticality: 'high',
  lowCeiling: false,
  tiles: [
    [0,0,0,0,0,0,0,0,0,0,0,0,0,0],
    [0,0,0,0,0,0,0,0,0,0,0,0,0,0],
    [0,0,0,0,0,0,0,0,0,0,0,0,0,0],
    [0,0,0,0,0,0,0,0,0,0,0,0,0,0],
    [0,0,0,0,0,0,0,0,0,0,0,0,0,0],
    [0,0,0,0,0,0,0,0,0,0,0,0,0,0],
    [0,0,0,0,0,0,0,0,0,0,0,1,1,1],
    [0,0,0,0,0,0,0,0,0,1,1,1,1,1],
    [0,0,0,0,0,0,0,1,1,1,1,1,1,1],
    [0,0,0,0,0,1,1,1,1,1,1,1,1,1],
    [1,1,1,1,1,1,1,1,1,1,1,1,1,1],
    [1,1,1,1,1,1,1,1,1,1,1,1,1,1],
  ],
  enemySpawns: [
    { x: 3, y: 9, type: EnemyType.GOOMBA },
    { x: 8, y: 7, type: EnemyType.KOOPA },
    { x: 12, y: 5, type: EnemyType.GOOMBA },
  ],
};

// --- peak|stepped : heavy threat / many gaps on modest elevation -----------------------------

// A bull set-piece on a 2-tile-stepped arena. step=2 + enemies -> compound PEAK; verticality
// stepped. The bull gets a flat charge lane; Goombas flank. peak|stepped.
export const bullArenaStepped: LevelChunk = {
  name: 'bull_arena_stepped',
  width: 16,
  height: 12,
  entryHeight: 2,
  exitHeight: 2,
  difficulty: 6,
  tags: ['combat'],
  band: 'peak',
  verticality: 'stepped',
  lowCeiling: false,
  tiles: [
    [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
    [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
    [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
    [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
    [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
    [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
    [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
    [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
    [0,0,1,1,0,0,0,0,0,0,0,0,1,1,0,0],
    [0,0,1,1,0,0,0,0,0,0,0,0,1,1,0,0],
    [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
    [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
  ],
  enemySpawns: [
    { x: 8, y: 9, type: EnemyType.BULL },
    { x: 5, y: 9, type: EnemyType.GOOMBA },
    { x: 11, y: 9, type: EnemyType.GOOMBA },
  ],
};

// A goomba-and-koopa ridge over a 2-tile-stepped floor. enemyCount=4 -> peak; verticality
// stepped (2-tile step). peak|stepped.
export const enemyRidge: LevelChunk = {
  name: 'enemy_ridge',
  width: 16,
  height: 12,
  entryHeight: 2,
  exitHeight: 2,
  difficulty: 6,
  tags: ['combat'],
  band: 'peak',
  verticality: 'stepped',
  lowCeiling: false,
  tiles: [
    [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
    [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
    [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
    [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
    [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
    [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
    [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
    [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
    [0,0,0,0,0,1,1,1,1,1,1,0,0,0,0,0],
    [0,0,0,0,0,1,1,1,1,1,1,0,0,0,0,0],
    [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
    [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
  ],
  enemySpawns: [
    { x: 3, y: 9, type: EnemyType.GOOMBA },
    { x: 6, y: 7, type: EnemyType.KOOPA },
    { x: 9, y: 7, type: EnemyType.KOOPA },
    { x: 13, y: 9, type: EnemyType.GOOMBA },
  ],
};

// --- peak|high : the climax — high climb AND heavy threat / wide chasm ------------------------

// The high-intensity BOSS arena (R13): a bull plus a koopa/goomba escort guarding a tiered climb
// to a high (exit 6) reward ledge with a coin cache. enemyCount=4 -> peak; edgeDelta=4 -> high.
// Tagged combat + reward (the summit payoff). peak|high.
export const bossArena: LevelChunk = {
  name: 'boss_arena',
  width: 18,
  height: 12,
  entryHeight: 2,
  exitHeight: 7,
  difficulty: 8,
  tags: ['combat', 'reward'],
  band: 'peak',
  verticality: 'high',
  lowCeiling: false,
  reward: 'risk-reward-path',
  tiles: [
    [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
    [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
    [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
    [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
    [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
    [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1,1],
    [0,0,0,0,0,0,0,0,0,0,0,0,0,1,1,1,1,1],
    [0,0,0,0,0,0,0,0,0,0,0,1,1,1,1,1,1,1],
    [0,0,0,0,0,0,0,0,0,1,1,1,1,1,1,1,1,1],
    [0,0,0,0,0,0,0,1,1,1,1,1,1,1,1,1,1,1],
    [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
    [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
  ],
  enemySpawns: [
    { x: 4, y: 9, type: EnemyType.BULL },
    { x: 2, y: 9, type: EnemyType.GOOMBA },
    { x: 10, y: 6, type: EnemyType.KOOPA },
    { x: 14, y: 4, type: EnemyType.GOOMBA },
  ],
  coinSpawns: [
    { x: 16, y: 4 }, { x: 17, y: 4 }, { x: 16, y: 3 },
  ],
};

// A wide chasm (4-tile gap -> peak) immediately before a stepped climb to a high (exit 5) ledge.
// maxGap=4 -> peak; edgeDelta=3 -> high. peak|high.
export const chasmClimb: LevelChunk = {
  name: 'chasm_climb',
  width: 16,
  height: 12,
  entryHeight: 2,
  exitHeight: 6,
  difficulty: 7,
  tags: ['platforming'],
  band: 'peak',
  verticality: 'high',
  lowCeiling: false,
  tiles: [
    [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
    [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
    [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
    [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
    [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
    [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
    [0,0,0,0,0,0,0,0,0,0,0,0,0,1,1,1],
    [0,0,0,0,0,0,0,0,0,0,0,1,1,1,1,1],
    [0,0,0,0,0,0,0,0,0,1,1,1,1,1,1,1],
    [0,0,0,0,0,0,0,0,1,1,1,1,1,1,1,1],
    [1,1,1,1,1,0,0,0,0,1,1,1,1,1,1,1],
    [1,1,1,1,1,0,0,0,0,1,1,1,1,1,1,1],
  ],
  coinSpawns: [
    { x: 6.5, y: 7 }, { x: 10, y: 5 }, { x: 13, y: 4 },
  ],
};

// --- R13 reward variety : hidden cache + a clean coin-route -----------------------------------

// A hidden cache: a coin stash tucked inside a brick shell the player must break into from below.
// Pure reward (no gaps/enemies/steps) -> easy|flat; reward kind = hidden-cache.
export const hiddenCache: LevelChunk = {
  name: 'hidden_cache',
  width: 12,
  height: 12,
  entryHeight: 2,
  exitHeight: 2,
  difficulty: 3,
  tags: ['reward'],
  band: 'easy',
  verticality: 'flat',
  lowCeiling: false,
  reward: 'hidden-cache',
  tiles: [
    [0,0,0,0,0,0,0,0,0,0,0,0],
    [0,0,0,0,0,0,0,0,0,0,0,0],
    [0,0,0,0,2,2,2,2,0,0,0,0],
    [0,0,0,0,2,0,0,2,0,0,0,0],
    [0,0,0,0,2,3,3,2,0,0,0,0],
    [0,0,0,0,0,0,0,0,0,0,0,0],
    [0,0,0,0,0,0,0,0,0,0,0,0],
    [0,0,0,0,0,0,0,0,0,0,0,0],
    [0,0,0,0,0,0,0,0,0,0,0,0],
    [0,0,0,0,0,0,0,0,0,0,0,0],
    [1,1,1,1,1,1,1,1,1,1,1,1],
    [1,1,1,1,1,1,1,1,1,1,1,1],
  ],
  coinSpawns: [
    { x: 5, y: 3 }, { x: 6, y: 3 },
  ],
};

// A clean coin trail arcing over a 1-tile bump — a coin-route reward beat with a touch of
// elevation. step=1 -> easy + stepped; reward kind = coin-route.
export const coinRouteArc: LevelChunk = {
  name: 'coin_route_arc',
  width: 12,
  height: 12,
  entryHeight: 2,
  exitHeight: 2,
  difficulty: 2,
  tags: ['reward'],
  band: 'easy',
  verticality: 'stepped',
  lowCeiling: false,
  reward: 'coin-route',
  tiles: [
    [0,0,0,0,0,0,0,0,0,0,0,0],
    [0,0,0,0,0,0,0,0,0,0,0,0],
    [0,0,0,0,0,0,0,0,0,0,0,0],
    [0,0,0,0,0,0,0,0,0,0,0,0],
    [0,0,0,0,0,0,0,0,0,0,0,0],
    [0,0,0,0,0,0,0,0,0,0,0,0],
    [0,0,0,0,0,0,0,0,0,0,0,0],
    [0,0,0,0,0,0,0,0,0,0,0,0],
    [0,0,0,0,0,0,0,0,0,0,0,0],
    [0,0,0,0,0,1,1,1,0,0,0,0],
    [1,1,1,1,1,1,1,1,1,1,1,1],
    [1,1,1,1,1,1,1,1,1,1,1,1],
  ],
  coinSpawns: [
    { x: 3, y: 7 }, { x: 4.5, y: 5 }, { x: 6, y: 4 },
    { x: 7.5, y: 5 }, { x: 9, y: 7 },
  ],
};

// All chunks organized by category
export const allChunks: LevelChunk[] = [
  stairClimb,
  stairDescend,
  pipeGauntlet,
  coinHeaven,
  questionBlockRow,
  highBlocks,
  gapJump,
  wideGap,
  brickPyramid,
  steppingStones,
  enemyRush,
  gentleHills,
  coinPocket,
  lowPlatforms,
  singlePipe,
  questionPair,
  // U6 elevation + coverage expansion
  gentleSteps,
  risingLedge,
  terraceWalk,
  lowRoofCorridor,
  risingGap,
  highLedgeFight,
  bullArenaStepped,
  enemyRidge,
  bossArena,
  chasmClimb,
  hiddenCache,
  coinRouteArc,
];

// Get chunks by tag
export function getChunksByTag(tag: string): LevelChunk[] {
  return allChunks.filter(chunk => chunk.tags.includes(tag as any));
}

// Get chunks by max difficulty
export function getChunksByDifficulty(maxDifficulty: number): LevelChunk[] {
  return allChunks.filter(chunk => chunk.difficulty <= maxDifficulty);
}
