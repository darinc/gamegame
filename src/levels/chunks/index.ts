import type { LevelChunk } from '../types';
import { EnemyType } from '../types';

// Classic ascending staircase (SMB 1-1 finale style)
export const stairClimb: LevelChunk = {
  name: 'stair_climb',
  width: 10,
  height: 12,
  entryHeight: 2,
  exitHeight: 6,
  difficulty: 2,
  tags: ['transition'],
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

// Descending staircase
export const stairDescend: LevelChunk = {
  name: 'stair_descend',
  width: 10,
  height: 12,
  entryHeight: 6,
  exitHeight: 2,
  difficulty: 2,
  tags: ['transition'],
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
];

// Get chunks by tag
export function getChunksByTag(tag: string): LevelChunk[] {
  return allChunks.filter(chunk => chunk.tags.includes(tag as any));
}

// Get chunks by max difficulty
export function getChunksByDifficulty(maxDifficulty: number): LevelChunk[] {
  return allChunks.filter(chunk => chunk.difficulty <= maxDifficulty);
}
