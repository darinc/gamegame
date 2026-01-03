// Tile types for the level
export const TileType = {
  EMPTY: 0,
  GROUND: 1,
  BRICK: 2,
  QUESTION: 3,
  PLATFORM: 4,
  SPIKE: 5,
  PIPE: 6,
} as const;

export type TileType = typeof TileType[keyof typeof TileType];

// Enemy types
export const EnemyType = {
  GOOMBA: 'goomba',
  KOOPA: 'koopa',
} as const;

export type EnemyType = typeof EnemyType[keyof typeof EnemyType];

// Spawn point for players/enemies
export interface SpawnPoint {
  x: number;
  y: number;
  type?: EnemyType;
}

// Coin spawn point
export interface CoinSpawn {
  x: number;
  y: number;
}

// Level exit
export interface LevelExit {
  x: number;
  y: number;
  type: 'flagpole' | 'door';
}

// Level data format
export interface LevelData {
  name: string;
  width: number;      // Width in tiles
  height: number;     // Height in tiles
  tileSize: number;   // Pixels per tile
  tiles: number[][];  // 2D array of TileType
  playerSpawns: SpawnPoint[];
  enemySpawns: SpawnPoint[];
  coinSpawns?: CoinSpawn[];
  exit?: LevelExit;
  background?: string;
}

// Helper to create empty level
export function createEmptyLevel(width: number, height: number, tileSize: number = 32): LevelData {
  const tiles: number[][] = [];
  for (let y = 0; y < height; y++) {
    tiles.push(new Array(width).fill(TileType.EMPTY));
  }

  return {
    name: 'Empty Level',
    width,
    height,
    tileSize,
    tiles,
    playerSpawns: [{ x: 2, y: height - 3 }],
    enemySpawns: [],
  };
}
