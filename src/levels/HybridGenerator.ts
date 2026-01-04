import type { LevelData, LevelChunk, CoinSpawn, SpawnPoint, LevelExit } from './types';
import { TileType, EnemyType } from './types';
import { getChunksByDifficulty } from './chunks';

interface HybridConfig {
  width: number;
  height: number;
  tileSize: number;
  chunkCount: number;      // Number of "moments" to place (4-6)
  difficulty: number;      // 1-10, affects chunk selection
  bridgeDensity: number;   // How dense the procedural bridges are
}

const DEFAULT_CONFIG: HybridConfig = {
  width: 300,
  height: 22,
  tileSize: 32,
  chunkCount: 5,
  difficulty: 5,
  bridgeDensity: 0.6,
};

export class HybridGenerator {
  private config: HybridConfig;
  private tiles: number[][] = [];
  private coinSpawns: CoinSpawn[] = [];
  private enemySpawns: SpawnPoint[] = [];

  constructor(config: Partial<HybridConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  generate(): LevelData {
    this.initializeTiles();

    // Select and place chunks
    const chunks = this.selectChunks();
    const placements = this.calculateChunkPlacements(chunks);

    // Place chunks and generate bridges between them
    this.placeChunksWithBridges(chunks, placements);

    // Generate start zone and end zone
    this.generateStartZone();
    this.generateEndZone();

    const exit = this.generateExit();

    return {
      name: 'Hybrid Level',
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

  private selectChunks(): LevelChunk[] {
    const selected: LevelChunk[] = [];
    const maxDifficulty = this.config.difficulty;

    // Get eligible chunks based on difficulty
    const eligible = getChunksByDifficulty(maxDifficulty + 2); // Allow slightly harder chunks

    // Shuffle and pick
    const shuffled = [...eligible].sort(() => Math.random() - 0.5);

    // Select chunks with difficulty curve (easier early, harder later)
    for (let i = 0; i < this.config.chunkCount && shuffled.length > 0; i++) {
      const progressDifficulty = Math.floor((i / this.config.chunkCount) * maxDifficulty) + 1;

      // Find a chunk appropriate for this point in the level
      const appropriate = shuffled.filter(c =>
        c.difficulty >= progressDifficulty - 2 &&
        c.difficulty <= progressDifficulty + 2
      );

      if (appropriate.length > 0) {
        const chunk = appropriate[Math.floor(Math.random() * appropriate.length)];
        selected.push(chunk);
        // Remove from pool to avoid duplicates
        const idx = shuffled.indexOf(chunk);
        if (idx > -1) shuffled.splice(idx, 1);
      } else if (shuffled.length > 0) {
        // Fallback to any available chunk
        selected.push(shuffled.pop()!);
      }
    }

    return selected;
  }

  private calculateChunkPlacements(chunks: LevelChunk[]): number[] {
    const placements: number[] = [];
    const startZone = 20;
    const endZone = 25;
    const usableWidth = this.config.width - startZone - endZone;

    // Total width of all chunks
    const totalChunkWidth = chunks.reduce((sum, c) => sum + c.width, 0);

    // Available space for bridges
    const bridgeSpace = usableWidth - totalChunkWidth;
    const bridgeWidth = Math.floor(bridgeSpace / (chunks.length + 1));

    let currentX = startZone + bridgeWidth;

    for (const chunk of chunks) {
      placements.push(currentX);
      currentX += chunk.width + bridgeWidth;
    }

    return placements;
  }

  private placeChunksWithBridges(chunks: LevelChunk[], placements: number[]): void {
    let previousExitHeight = 2; // Start with ground level
    let previousEndX = 20;

    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      const startX = placements[i];

      // Generate bridge from previous section to this chunk
      this.generateBridge(previousEndX, startX, previousExitHeight, chunk.entryHeight);

      // Place the chunk
      this.placeChunk(chunk, startX);

      // Update for next iteration
      previousExitHeight = chunk.exitHeight;
      previousEndX = startX + chunk.width;
    }

    // Final bridge to end zone
    this.generateBridge(previousEndX, this.config.width - 25, previousExitHeight, 2);
  }

  private placeChunk(chunk: LevelChunk, startX: number): void {
    const chunkHeight = chunk.tiles.length;
    const offsetY = this.config.height - chunkHeight;

    // Copy chunk tiles into level
    for (let y = 0; y < chunkHeight; y++) {
      for (let x = 0; x < chunk.width; x++) {
        const tile = chunk.tiles[y][x];
        const levelX = startX + x;
        const levelY = offsetY + y;

        if (levelX < this.config.width && levelY >= 0 && levelY < this.config.height) {
          if (tile !== TileType.EMPTY) {
            this.tiles[levelY][levelX] = tile;
          }
        }
      }
    }

    // Copy coin spawns (offset to level coordinates)
    if (chunk.coinSpawns) {
      for (const coin of chunk.coinSpawns) {
        this.coinSpawns.push({
          x: startX + coin.x,
          y: offsetY + coin.y,
        });
      }
    }

    // Copy enemy spawns (offset to level coordinates)
    if (chunk.enemySpawns) {
      for (const enemy of chunk.enemySpawns) {
        this.enemySpawns.push({
          x: startX + enemy.x,
          y: offsetY + enemy.y,
          type: enemy.type,
        });
      }
    }
  }

  private generateBridge(startX: number, endX: number, startHeight: number, endHeight: number): void {
    if (startX >= endX) return;

    const bridgeWidth = endX - startX;

    // Create ground that transitions between heights
    const heightDiff = endHeight - startHeight;
    const transitionWidth = Math.min(4, Math.floor(bridgeWidth / 2));

    for (let i = 0; i < bridgeWidth; i++) {
      const x = startX + i;
      if (x >= this.config.width) break;

      // Calculate ground height at this position
      let groundLevel = startHeight;
      if (i < transitionWidth && heightDiff !== 0) {
        // Transition zone at start
        groundLevel = startHeight + Math.floor((heightDiff * i) / transitionWidth / 2);
      } else if (i > bridgeWidth - transitionWidth && heightDiff !== 0) {
        // Transition zone at end
        const distFromEnd = bridgeWidth - i;
        groundLevel = endHeight - Math.floor((heightDiff * distFromEnd) / transitionWidth / 2);
      } else {
        // Middle section - interpolate
        const progress = i / bridgeWidth;
        groundLevel = Math.floor(startHeight + heightDiff * progress);
      }

      // Place ground tiles up to the calculated height
      for (let h = 0; h < 2 + groundLevel; h++) {
        const y = this.config.height - 1 - h;
        if (y >= 0) {
          this.tiles[y][x] = TileType.GROUND;
        }
      }
    }

    // Add some variety to the bridge
    if (bridgeWidth > 8 && Math.random() < this.config.bridgeDensity) {
      this.addBridgeFeatures(startX, endX);
    }
  }

  private addBridgeFeatures(startX: number, endX: number): void {
    const bridgeWidth = endX - startX;
    const midX = startX + Math.floor(bridgeWidth / 2);
    const groundY = this.config.height - 2;

    // Add a small gap sometimes
    if (bridgeWidth > 15 && Math.random() < 0.3) {
      const gapX = midX - 1;
      for (let i = 0; i < 3; i++) {
        if (gapX + i < endX - 3 && gapX + i > startX + 3) {
          this.tiles[groundY][gapX + i] = TileType.EMPTY;
          this.tiles[groundY + 1][gapX + i] = TileType.EMPTY;
        }
      }
      // Add coin arc over gap
      this.coinSpawns.push({ x: gapX, y: groundY - 3 });
      this.coinSpawns.push({ x: gapX + 1.5, y: groundY - 4 });
      this.coinSpawns.push({ x: gapX + 3, y: groundY - 3 });
    }

    // Add floating coins
    if (Math.random() < 0.5) {
      const coinX = startX + 3 + Math.floor(Math.random() * (bridgeWidth - 6));
      for (let i = 0; i < 3; i++) {
        this.coinSpawns.push({ x: coinX + i, y: groundY - 4 });
      }
    }

    // Maybe add an enemy
    if (Math.random() < 0.4) {
      const enemyX = startX + 4 + Math.floor(Math.random() * (bridgeWidth - 8));
      if (this.tiles[groundY][enemyX] === TileType.GROUND) {
        this.enemySpawns.push({
          x: enemyX,
          y: this.config.height - 3,
          type: EnemyType.GOOMBA,
        });
      }
    }

    // Maybe add a brick formation
    if (Math.random() < 0.4) {
      const brickX = startX + 5 + Math.floor(Math.random() * (bridgeWidth - 10));
      const brickY = groundY - 4;
      if (brickY > 3) {
        for (let i = 0; i < 3; i++) {
          if (brickX + i < endX) {
            this.tiles[brickY][brickX + i] = i === 1 ? TileType.QUESTION : TileType.BRICK;
          }
        }
      }
    }
  }

  private generateStartZone(): void {
    const groundY = this.config.height - 2;
    const baseY = this.config.height - 1;

    // Flat ground for safe start
    for (let x = 0; x < 20; x++) {
      this.tiles[groundY][x] = TileType.GROUND;
      this.tiles[baseY][x] = TileType.GROUND;
    }

    // Welcome coins
    this.coinSpawns.push({ x: 8, y: groundY - 3 });
    this.coinSpawns.push({ x: 10, y: groundY - 3 });
    this.coinSpawns.push({ x: 12, y: groundY - 3 });
  }

  private generateEndZone(): void {
    const groundY = this.config.height - 2;
    const baseY = this.config.height - 1;
    const stairStartX = this.config.width - 15;

    // Ground under staircase
    for (let x = stairStartX - 5; x < this.config.width; x++) {
      this.tiles[groundY][x] = TileType.GROUND;
      this.tiles[baseY][x] = TileType.GROUND;
    }

    // Classic ascending staircase
    const maxStairHeight = 8;
    for (let step = 0; step < maxStairHeight; step++) {
      const stepX = stairStartX + step;
      if (stepX >= this.config.width - 3) break;

      for (let h = 0; h <= step; h++) {
        const y = groundY - 1 - h;
        if (y >= 0) {
          this.tiles[y][stepX] = TileType.GROUND;
        }
      }
    }
  }

  private generateExit(): LevelExit {
    return {
      x: this.config.width - 5,
      y: this.config.height - 10,
      type: 'flagpole',
    };
  }
}

export function generateHybridLevel(seed?: number, config: Partial<HybridConfig> = {}): LevelData {
  if (seed !== undefined) {
    let currentSeed = seed;
    const seededRandom = () => {
      currentSeed = (currentSeed * 9301 + 49297) % 233280;
      return currentSeed / 233280;
    };
    const originalRandom = Math.random;
    Math.random = seededRandom;
    const generator = new HybridGenerator(config);
    const level = generator.generate();
    Math.random = originalRandom;
    return level;
  }

  const generator = new HybridGenerator(config);
  return generator.generate();
}
