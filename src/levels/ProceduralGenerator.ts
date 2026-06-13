import type { LevelData, CoinSpawn, SpawnPoint, LevelExit } from './types';
import { TileType, EnemyType } from './types';

// Generation parameters
interface GeneratorConfig {
  width: number;
  height: number;
  tileSize: number;
  gapChance: number;        // Chance of a gap in ground (0-1)
  platformDensity: number;  // How many platforms per section
  brickDensity: number;     // How many brick formations
  pipeDensity: number;      // How many pipes
  coinDensity: number;      // Coins per section
  enemyDensity: number;     // Enemies per section
  difficulty: number;       // 1-10, affects gap size and enemy count
}

// Level should be 15x height for proper SMB feel
const DEFAULT_CONFIG: GeneratorConfig = {
  width: 330,              // 15x height of 22
  height: 22,
  tileSize: 32,
  gapChance: 0.12,
  platformDensity: 0.35,
  brickDensity: 0.4,
  pipeDensity: 0.25,
  coinDensity: 0.5,
  enemyDensity: 0.3,
  difficulty: 5,
};

// SMB-style brick formation heights (tiles from bottom)
const BRICK_HEIGHT_LOW = 4;   // Low bricks - jump from ground
const BRICK_HEIGHT_HIGH = 8;  // High bricks - need platform or running jump

export class ProceduralGenerator {
  private config: GeneratorConfig;
  private tiles: number[][] = [];
  private coinSpawns: CoinSpawn[] = [];
  private enemySpawns: SpawnPoint[] = [];

  constructor(config: Partial<GeneratorConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  generate(): LevelData {
    this.initializeTiles();
    this.generateGround();
    this.generatePipes();
    this.generatePlatforms();
    this.generateBrickFormations();
    this.generateStaircase();
    this.generateCoins();
    this.generateEnemies();

    const exit = this.generateExit();

    return {
      name: 'Procedural Level',
      width: this.config.width,
      height: this.config.height,
      tileSize: this.config.tileSize,
      tiles: this.tiles,
      playerSpawns: [
        { x: 3, y: this.config.height - 3 },
        { x: 5, y: this.config.height - 3 },
      ],
      enemySpawns: this.enemySpawns,
      coinSpawns: this.coinSpawns,
      exit,
    };
  }

  private initializeTiles(): void {
    this.tiles = [];
    this.coinSpawns = [];
    this.enemySpawns = [];

    for (let y = 0; y < this.config.height; y++) {
      this.tiles.push(new Array(this.config.width).fill(TileType.EMPTY));
    }
  }

  private generateGround(): void {
    const groundY = this.config.height - 2;
    const baseY = this.config.height - 1;

    let x = 0;
    const safeZoneStart = 15; // Safe zone at start
    const safeZoneEnd = this.config.width - 20; // Safe zone at end for stairs

    while (x < this.config.width) {
      const inSafeZone = x < safeZoneStart || x >= safeZoneEnd;
      const shouldGap = !inSafeZone && Math.random() < this.config.gapChance;

      if (shouldGap) {
        // Create gap (2-4 tiles wide based on difficulty)
        const minGap = 2;
        const maxGap = Math.min(4, 2 + Math.floor(this.config.difficulty / 3));
        const gapWidth = minGap + Math.floor(Math.random() * (maxGap - minGap + 1));
        x += gapWidth;
      } else {
        // Create ground section (longer sections for better gameplay)
        const minSection = 8;
        const maxSection = 25;
        const sectionWidth = minSection + Math.floor(Math.random() * (maxSection - minSection));
        for (let i = 0; i < sectionWidth && x < this.config.width; i++, x++) {
          this.tiles[groundY][x] = TileType.GROUND;
          this.tiles[baseY][x] = TileType.GROUND;
        }
      }
    }
  }

  private generatePipes(): void {
    // SMB pipes are typically placed every 30-50 tiles
    const pipeInterval = 35;
    const sections = Math.floor((this.config.width - 40) / pipeInterval);

    for (let section = 0; section < sections; section++) {
      if (Math.random() > this.config.pipeDensity) continue;

      const baseX = 20 + section * pipeInterval + Math.floor(Math.random() * 15);

      // Check if there's ground here
      const groundY = this.config.height - 2;
      if (this.tiles[groundY][baseX] !== TileType.GROUND) continue;
      if (this.tiles[groundY][baseX + 1] !== TileType.GROUND) continue;

      // Pipe heights: 2, 3, or 4 tiles tall
      const pipeHeight = 2 + Math.floor(Math.random() * 3);

      // Place pipe (2 tiles wide)
      for (let h = 0; h < pipeHeight; h++) {
        const pipeY = groundY - 1 - h;
        if (pipeY >= 0) {
          this.tiles[pipeY][baseX] = TileType.PIPE;
          this.tiles[pipeY][baseX + 1] = TileType.PIPE;
        }
      }
    }
  }

  private generatePlatforms(): void {
    // SMB-style floating platforms
    const sectionWidth = 30;
    const sections = Math.floor(this.config.width / sectionWidth);

    for (let section = 1; section < sections - 1; section++) {
      if (Math.random() > this.config.platformDensity) continue;

      const startX = section * sectionWidth + Math.floor(Math.random() * 15);
      const platformWidth = 3 + Math.floor(Math.random() * 5);

      // Platform heights - either mid-level or high
      const heightChoice = Math.random();
      let platformY: number;
      if (heightChoice < 0.6) {
        // Mid-level platforms (around 6-8 tiles from bottom)
        platformY = this.config.height - 7 - Math.floor(Math.random() * 3);
      } else {
        // High platforms (around 10-12 tiles from bottom)
        platformY = this.config.height - 11 - Math.floor(Math.random() * 3);
      }

      if (platformY < 3 || platformY >= this.config.height - 4) continue;

      // Check for collisions with pipes
      let canPlace = true;
      for (let i = 0; i < platformWidth && startX + i < this.config.width; i++) {
        if (this.tiles[platformY][startX + i] !== TileType.EMPTY) {
          canPlace = false;
          break;
        }
      }

      if (canPlace) {
        for (let i = 0; i < platformWidth && startX + i < this.config.width; i++) {
          this.tiles[platformY][startX + i] = TileType.PLATFORM;
        }

        // Sometimes add stepping stones
        if (Math.random() < 0.3 && platformY < this.config.height - 8) {
          const stepY = platformY + 3;
          const stepX = startX - 2;
          if (stepX > 0 && this.tiles[stepY][stepX] === TileType.EMPTY) {
            this.tiles[stepY][stepX] = TileType.PLATFORM;
            this.tiles[stepY][stepX + 1] = TileType.PLATFORM;
          }
        }
      }
    }
  }

  private generateBrickFormations(): void {
    // SMB has specific brick/question patterns
    const sectionWidth = 20;
    const sections = Math.floor(this.config.width / sectionWidth);

    for (let section = 1; section < sections - 2; section++) {
      if (Math.random() > this.config.brickDensity) continue;

      const startX = section * sectionWidth + 3 + Math.floor(Math.random() * 10);

      // Alternate between low and high formations
      const isHighFormation = Math.random() < 0.4;
      const formationY = isHighFormation
        ? this.config.height - 2 - BRICK_HEIGHT_HIGH
        : this.config.height - 2 - BRICK_HEIGHT_LOW;

      if (formationY < 3) continue;

      // Check for collisions
      let canPlace = true;
      for (let i = 0; i < 5 && startX + i < this.config.width; i++) {
        if (this.tiles[formationY][startX + i] !== TileType.EMPTY) {
          canPlace = false;
          break;
        }
      }

      if (!canPlace) continue;

      // SMB-style formation patterns
      const pattern = Math.floor(Math.random() * 6);

      switch (pattern) {
        case 0: // Classic: B Q B Q B
          for (let i = 0; i < 5 && startX + i < this.config.width; i++) {
            this.tiles[formationY][startX + i] = i % 2 === 0 ? TileType.BRICK : TileType.QUESTION;
          }
          break;
        case 1: // All bricks row
          for (let i = 0; i < 4 + Math.floor(Math.random() * 3) && startX + i < this.config.width; i++) {
            this.tiles[formationY][startX + i] = TileType.BRICK;
          }
          break;
        case 2: // Single question block (iconic powerup spot)
          this.tiles[formationY][startX] = TileType.QUESTION;
          break;
        case 3: // Hidden in bricks: B B Q B B
          for (let i = 0; i < 5 && startX + i < this.config.width; i++) {
            this.tiles[formationY][startX + i] = i === 2 ? TileType.QUESTION : TileType.BRICK;
          }
          break;
        case 4: // Double question: Q B Q
          this.tiles[formationY][startX] = TileType.QUESTION;
          if (startX + 1 < this.config.width) this.tiles[formationY][startX + 1] = TileType.BRICK;
          if (startX + 2 < this.config.width) this.tiles[formationY][startX + 2] = TileType.QUESTION;
          break;
        case 5: // Stacked (two rows)
          for (let i = 0; i < 3 && startX + i < this.config.width; i++) {
            this.tiles[formationY][startX + i] = TileType.BRICK;
            if (formationY - 1 >= 0) {
              this.tiles[formationY - 1][startX + i] = TileType.BRICK;
            }
          }
          break;
      }
    }
  }

  private generateStaircase(): void {
    // Classic SMB end-of-level staircase leading to flagpole
    const stairStartX = this.config.width - 15;
    const groundY = this.config.height - 2;

    // Make sure there's ground under the staircase
    for (let x = stairStartX - 2; x < this.config.width; x++) {
      this.tiles[groundY][x] = TileType.GROUND;
      this.tiles[this.config.height - 1][x] = TileType.GROUND;
    }

    // Build ascending staircase (8 steps like SMB)
    const maxStairHeight = 8;
    for (let step = 0; step < maxStairHeight; step++) {
      const stepX = stairStartX + step;
      if (stepX >= this.config.width - 3) break;

      // Each step goes from ground up to current height
      for (let h = 0; h <= step; h++) {
        const y = groundY - 1 - h;
        if (y >= 0) {
          this.tiles[y][stepX] = TileType.GROUND;
        }
      }
    }
  }

  private generateCoins(): void {
    const sectionWidth = 20;
    const sections = Math.floor(this.config.width / sectionWidth);

    for (let section = 1; section < sections - 1; section++) {
      if (Math.random() > this.config.coinDensity) continue;

      const baseX = section * sectionWidth + Math.floor(Math.random() * 12);

      // Coin patterns
      const pattern = Math.floor(Math.random() * 4);

      switch (pattern) {
        case 0: // Horizontal line above ground
          {
            const coinY = this.config.height - 5;
            const count = 3 + Math.floor(Math.random() * 4);
            for (let i = 0; i < count && baseX + i < this.config.width - 5; i++) {
              if (this.tiles[coinY][baseX + i] === TileType.EMPTY) {
                this.coinSpawns.push({ x: baseX + i, y: coinY });
              }
            }
          }
          break;
        case 1: // Arc pattern (rising and falling)
          {
            const arcCoins = [
              { dx: 0, dy: 0 },
              { dx: 1, dy: -1 },
              { dx: 2, dy: -2 },
              { dx: 3, dy: -2 },
              { dx: 4, dy: -1 },
              { dx: 5, dy: 0 },
            ];
            const baseY = this.config.height - 5;
            for (const coin of arcCoins) {
              const x = baseX + coin.dx;
              const y = baseY + coin.dy;
              if (x < this.config.width - 5 && y > 0 && this.tiles[y][x] === TileType.EMPTY) {
                this.coinSpawns.push({ x, y });
              }
            }
          }
          break;
        case 2: // Above brick formation
          {
            // Find a brick formation above this X
            for (let y = 5; y < this.config.height - 5; y++) {
              if (this.tiles[y][baseX] === TileType.BRICK || this.tiles[y][baseX] === TileType.QUESTION) {
                // Place coins above
                const coinY = y - 2;
                for (let i = 0; i < 3 && baseX + i < this.config.width; i++) {
                  if (this.tiles[coinY][baseX + i] === TileType.EMPTY) {
                    this.coinSpawns.push({ x: baseX + i, y: coinY });
                  }
                }
                break;
              }
            }
          }
          break;
        case 3: // Vertical line (above gap or special area)
          {
            const coinX = baseX;
            for (let i = 0; i < 4; i++) {
              const coinY = this.config.height - 6 - i;
              if (coinY > 0 && this.tiles[coinY][coinX] === TileType.EMPTY) {
                this.coinSpawns.push({ x: coinX, y: coinY });
              }
            }
          }
          break;
      }
    }
  }

  private generateEnemies(): void {
    const sectionWidth = 25;
    const sections = Math.floor(this.config.width / sectionWidth);
    const groundY = this.config.height - 2;

    for (let section = 1; section < sections - 2; section++) {
      if (Math.random() > this.config.enemyDensity) continue;

      const enemyX = section * sectionWidth + 8 + Math.floor(Math.random() * 12);

      // Check for valid ground placement
      if (enemyX >= this.config.width - 20) continue;
      if (this.tiles[groundY][enemyX] !== TileType.GROUND) continue;

      // Make sure not on a pipe
      const aboveGround = groundY - 1;
      if (this.tiles[aboveGround][enemyX] === TileType.PIPE) continue;

      this.enemySpawns.push({
        x: enemyX,
        y: this.config.height - 3,
        type: EnemyType.GOOMBA,
      });

      // Sometimes add a pair of enemies
      if (Math.random() < 0.3) {
        const pairX = enemyX + 2;
        if (pairX < this.config.width - 20 &&
            this.tiles[groundY][pairX] === TileType.GROUND &&
            this.tiles[aboveGround][pairX] !== TileType.PIPE) {
          this.enemySpawns.push({
            x: pairX,
            y: this.config.height - 3,
            type: EnemyType.GOOMBA,
          });
        }
      }
    }

    // Add extra enemies based on difficulty
    const extraEnemies = Math.floor(this.config.difficulty / 2);
    for (let i = 0; i < extraEnemies; i++) {
      const x = 30 + Math.floor(Math.random() * (this.config.width - 60));
      if (this.tiles[groundY][x] === TileType.GROUND &&
          this.tiles[groundY - 1][x] !== TileType.PIPE) {
        this.enemySpawns.push({ x, y: this.config.height - 3, type: EnemyType.GOOMBA });
      }
    }
  }

  private generateExit(): LevelExit {
    // Place flagpole at end of staircase
    return {
      x: this.config.width - 5,
      y: this.config.height - 10, // Top of staircase
      type: 'flagpole',
    };
  }
}

// Build a config from a difficulty (1-10). Lower difficulty => fewer/smaller
// gaps, fewer enemies, more coins. This makes "easy" levels genuinely easy.
function configForDifficulty(difficulty: number): Partial<GeneratorConfig> {
  const d = Math.max(1, Math.min(10, difficulty));
  const t = (d - 1) / 9; // 0 (easiest) .. 1 (hardest)
  return {
    difficulty: d,
    gapChance: 0.05 + t * 0.15,     // 0.05 easy -> 0.20 hard
    enemyDensity: 0.12 + t * 0.33,  // sparse when easy
    coinDensity: 0.7 - t * 0.3,     // generous when easy
    platformDensity: 0.3 + t * 0.2,
  };
}

// Helper function to generate a level with a seed-like configuration
export function generateLevel(
  seed?: number,
  options: { difficulty?: number } = {},
): LevelData {
  const config = configForDifficulty(options.difficulty ?? DEFAULT_CONFIG.difficulty);

  if (seed !== undefined) {
    let currentSeed = seed;
    const seededRandom = () => {
      currentSeed = (currentSeed * 9301 + 49297) % 233280;
      return currentSeed / 233280;
    };
    const originalRandom = Math.random;
    Math.random = seededRandom;
    const generator = new ProceduralGenerator(config);
    const level = generator.generate();
    Math.random = originalRandom;
    return level;
  }

  const generator = new ProceduralGenerator(config);
  return generator.generate();
}
