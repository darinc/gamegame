import type { LevelData } from './types';
import { TileType, EnemyType } from './types';

const _ = TileType.EMPTY;
const G = TileType.GROUND;
const B = TileType.BRICK;
const Q = TileType.QUESTION;
const P = TileType.PIPE;

// Super Mario Bros World 1-1 Recreation
// Traced from the classic NES level
// 212 tiles wide x 22 tiles tall
export const smb1_1: LevelData = {
  name: 'World 1-1',
  width: 212,
  height: 22,
  tileSize: 32,
  tiles: [
    // Row 0-7 (sky - empty)
    Array(212).fill(_),
    Array(212).fill(_),
    Array(212).fill(_),
    Array(212).fill(_),
    Array(212).fill(_),
    Array(212).fill(_),
    Array(212).fill(_),
    Array(212).fill(_),
    // Row 8-9 (high block area - mostly empty)
    Array(212).fill(_),
    Array(212).fill(_),
    // Row 10-11 (upper platforms/blocks)
    Array(212).fill(_),
    Array(212).fill(_),
    // Rows 12-21 will be built programmatically below
    Array(212).fill(_),
    Array(212).fill(_),
    Array(212).fill(_),
    Array(212).fill(_),
    Array(212).fill(_),
    Array(212).fill(_),
    Array(212).fill(_),
    Array(212).fill(_),
    Array(212).fill(G), // Row 20 - main ground
    Array(212).fill(G), // Row 21 - sub ground
  ],
  playerSpawns: [
    { x: 3, y: 18 },
    { x: 5, y: 18 },
  ],
  enemySpawns: [
    // Goombas placed at key positions like original
    { x: 22, y: 19, type: EnemyType.GOOMBA },
    { x: 40, y: 19, type: EnemyType.GOOMBA },
    { x: 51, y: 19, type: EnemyType.GOOMBA },
    { x: 52, y: 19, type: EnemyType.GOOMBA },
    { x: 80, y: 19, type: EnemyType.GOOMBA },
    { x: 82, y: 19, type: EnemyType.GOOMBA },
    { x: 97, y: 19, type: EnemyType.GOOMBA },
    { x: 99, y: 19, type: EnemyType.GOOMBA },
    { x: 114, y: 19, type: EnemyType.GOOMBA },
    { x: 116, y: 19, type: EnemyType.GOOMBA },
    { x: 124, y: 19, type: EnemyType.GOOMBA },
    { x: 126, y: 19, type: EnemyType.GOOMBA },
    { x: 128, y: 19, type: EnemyType.GOOMBA },
    { x: 130, y: 19, type: EnemyType.GOOMBA },
    { x: 174, y: 19, type: EnemyType.GOOMBA },
    { x: 176, y: 19, type: EnemyType.GOOMBA },
  ],
  coinSpawns: [
    // Coins that appear from question blocks (decorative - blocks have their own)
    { x: 22, y: 14 },
    { x: 23, y: 14 },
    { x: 24, y: 14 },
  ],
  exit: {
    x: 198,
    y: 10,
    type: 'flagpole',
  },
};

// Build the level programmatically for cleaner code
function buildLevel(): void {
  const tiles = smb1_1.tiles;
  const W = smb1_1.width;
  const H = smb1_1.height;

  // Helper to set a tile
  const set = (x: number, y: number, tile: number) => {
    if (x >= 0 && x < W && y >= 0 && y < H) {
      tiles[y][x] = tile;
    }
  };

  // Helper to create a pipe (2 tiles wide, height in tiles from ground)
  const pipe = (x: number, height: number) => {
    const groundY = H - 2;
    for (let h = 0; h < height; h++) {
      set(x, groundY - 1 - h, P);
      set(x + 1, groundY - 1 - h, P);
    }
  };

  // Helper to create stairs going up (left to right)
  const stairsUp = (startX: number, steps: number) => {
    const groundY = H - 2;
    for (let step = 0; step < steps; step++) {
      for (let h = 0; h <= step; h++) {
        set(startX + step, groundY - 1 - h, G);
      }
    }
  };

  // Helper to create stairs going down (left to right)
  const stairsDown = (startX: number, steps: number) => {
    const groundY = H - 2;
    for (let step = 0; step < steps; step++) {
      for (let h = 0; h < steps - step; h++) {
        set(startX + step, groundY - 1 - h, G);
      }
    }
  };

  // Clear ground for gaps
  const gap = (x1: number, x2: number) => {
    for (let x = x1; x <= x2; x++) {
      set(x, H - 2, _);
      set(x, H - 1, _);
    }
  };

  // === BUILD THE LEVEL ===

  // Question block at x=16 (first power-up)
  set(16, 14, Q);

  // First brick/question row at x=20-24
  set(20, 14, B);
  set(21, 14, Q);
  set(22, 14, B);
  set(23, 14, Q);
  set(24, 14, B);

  // Hidden 1-UP block (represented as brick)
  set(21, 10, B);

  // First pipe (small, 2 tall) at x=28
  pipe(28, 2);

  // Second pipe (medium, 3 tall) at x=38
  pipe(38, 3);

  // Third pipe (tall, 4 tall) at x=46
  pipe(46, 4);

  // Fourth pipe (tall, 4 tall) at x=57 - warp zone entrance
  pipe(57, 4);

  // First gap at x=69-70
  gap(69, 70);

  // Floating block row at x=77-84
  set(77, 14, B);
  set(78, 14, Q);
  set(79, 14, B);

  // Higher row at x=80-87
  set(80, 10, B);
  set(81, 10, B);
  set(82, 10, B);
  set(83, 10, B);
  set(84, 10, B);
  set(85, 10, B);
  set(86, 10, B);
  set(87, 10, B);

  // Second gap at x=86-88
  gap(86, 88);

  // Blocks after gap
  set(91, 10, B);
  set(92, 10, B);
  set(93, 10, B);

  set(94, 14, B);
  set(94, 10, Q);

  set(100, 14, B);
  set(101, 14, B);

  // Third gap at x=102-104 (2 tile gap)
  gap(103, 104);

  // Question block
  set(106, 14, Q);

  set(109, 14, B);
  set(110, 14, Q);
  set(112, 14, Q);

  // Brick row
  set(118, 14, B);
  set(119, 14, B);
  set(120, 14, B);
  set(121, 14, Q);

  // Another brick row
  set(128, 14, Q);
  set(129, 14, B);
  set(130, 14, B);
  set(131, 14, Q);

  // High block
  set(129, 10, B);

  // Single brick
  set(134, 14, B);

  // Small pipe at x=163
  pipe(163, 2);

  // Blocks before stairs
  set(168, 14, B);
  set(169, 14, B);
  set(170, 14, Q);
  set(171, 14, B);

  // Pipe at x=179
  pipe(179, 2);

  // Gap before final section
  gap(152, 153);

  // Final staircase at x=181 (8 steps up)
  stairsUp(181, 8);

  // Small gap after first stairs
  gap(189, 189);

  // Final staircase down at x=190 (4 steps)
  stairsDown(190, 4);

  // Flagpole base
  set(198, 19, G);
  set(198, 18, G);

  // Ground continues to end after flagpole
  // (already filled by default)
}

// Execute the level builder
buildLevel();
