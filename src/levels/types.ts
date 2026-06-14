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
  BULL: 'bull',
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

// Generation-time decision for a question block's contents (KTD4). Carried as a sidecar
// array on LevelData (keyed by grid coords) rather than widening TileType, so the tile grid
// stays a pure terrain array and contents are seed-reproducible.
export interface QuestionBlockContent {
  x: number;
  y: number;
  containsPowerUp: boolean;
}

// Level exit
export interface LevelExit {
  x: number;
  y: number;
  type: 'flagpole' | 'door';
}

// Level chunk for hybrid generation
export interface LevelChunk {
  name: string;
  width: number;
  height: number;
  tiles: number[][];           // 2D array of TileType
  entryHeight: number;         // Ground level at left edge (tiles from bottom)
  exitHeight: number;          // Ground level at right edge (tiles from bottom)
  difficulty: number;          // 1-10 scale (legacy; selection now uses `band`, not this)
  tags: ChunkTag[];
  coinSpawns?: CoinSpawn[];
  enemySpawns?: SpawnPoint[];

  // --- Director annotations (U6) -------------------------------------------------------------
  // The director realizes a beat by matching its requested (band x verticality) cell to chunks
  // carrying the same annotations. These are OPTIONAL so the older chunk literals still
  // type-check, but every chunk in `allChunks` is in fact annotated, and the coverage test
  // (chunks/coverage.test.ts) asserts each annotation matches the chunk's actual geometry
  // (KTD11 — annotations can't drift). When absent, treat as: band=easy, verticality=flat,
  // lowCeiling=false.
  band?: BandName;             // rubric-measured difficulty band (scoreBand of its geometry)
  verticality?: VerticalityClass; // flat / stepped / high — its vertical-traversal demand
  lowCeiling?: boolean;        // true if a standable surface has solid tiles within stand height
  // Reward-variety marker (R13). Distinguishes the kind of reward a `reward`-tagged chunk is:
  //   coin-route       — a coin trail that rewards a precise traversal line
  //   hidden-cache     — a concealed stash (in/behind blocks) the player must discover
  //   risk-reward-path — an optional harder side path that pays out
  reward?: RewardKind;
}

export type RewardKind = 'coin-route' | 'hidden-cache' | 'risk-reward-path';

export type ChunkTag = 'platforming' | 'combat' | 'reward' | 'transition';

// Difficulty-band and verticality string unions live HERE (the Phaser-free leaf module) so
// both the chunk pool and the director can annotate against the same vocabulary without an
// import cycle (chunks/index.ts <-> director). The director's bands.ts/outline.ts import these
// as TYPE-only and pair them with their runtime `Band` const object.
//   BandName       — the rubric-measured difficulty band of a chunk (see director/bands.ts).
//   VerticalityClass — how much vertical traversal the chunk demands (see director/outline.ts).
export type BandName = 'easy' | 'medium' | 'peak';
export type VerticalityClass = 'flat' | 'stepped' | 'high';

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
  questionBlockContents?: QuestionBlockContent[];
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
