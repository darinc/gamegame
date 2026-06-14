import Phaser from 'phaser';
import type { LevelData, SpawnPoint, CoinSpawn, LevelExit } from './types';
import { TileType } from './types';
import { Brick } from '../entities/Brick';
import { QuestionBlock } from '../entities/QuestionBlock';

// Legacy fallback only: levels generated without a questionBlockContents sidecar
// (hybrid/procedural/named) keep their original ~35% power-up behavior. The director path
// always supplies the sidecar, so its blocks are seed-deterministic (KTD4).
const LEGACY_POWERUP_CHANCE = 0.35;

export class LevelLoader {
  private scene: Phaser.Scene;
  private groundGroup!: Phaser.Physics.Arcade.StaticGroup;
  private platformGroup!: Phaser.Physics.Arcade.StaticGroup;
  private hazardGroup!: Phaser.Physics.Arcade.StaticGroup;
  private bricks: Brick[] = [];
  private questionBlocks: QuestionBlock[] = [];
  private levelData: LevelData | null = null;
  private questionContent: Map<string, boolean> = new Map();

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  load(levelData: LevelData): void {
    this.levelData = levelData;

    // Index generation-time question-block contents by grid coords (KTD4).
    this.questionContent = new Map();
    for (const c of levelData.questionBlockContents ?? []) {
      this.questionContent.set(`${c.x},${c.y}`, c.containsPowerUp);
    }

    // Create physics groups
    this.groundGroup = this.scene.physics.add.staticGroup();
    this.platformGroup = this.scene.physics.add.staticGroup();
    this.hazardGroup = this.scene.physics.add.staticGroup();

    // Set world bounds
    const worldWidth = levelData.width * levelData.tileSize;
    const worldHeight = levelData.height * levelData.tileSize;
    this.scene.physics.world.setBounds(0, 0, worldWidth, worldHeight);

    // Render tiles
    for (let y = 0; y < levelData.height; y++) {
      for (let x = 0; x < levelData.width; x++) {
        const tileType = levelData.tiles[y][x];
        this.createTile(x, y, tileType, levelData.tileSize);
      }
    }
  }

  private createTile(gridX: number, gridY: number, tileType: number, tileSize: number): void {
    if (tileType === TileType.EMPTY) return;

    const pixelX = gridX * tileSize + tileSize / 2;
    const pixelY = gridY * tileSize + tileSize / 2;

    // Handle brick tiles specially
    if (tileType === TileType.BRICK) {
      const brick = new Brick(this.scene, pixelX, pixelY);
      this.bricks.push(brick);
      return;
    }

    // Handle question blocks specially
    if (tileType === TileType.QUESTION) {
      const key = `${gridX},${gridY}`;
      const containsPowerUp = this.questionContent.has(key)
        ? this.questionContent.get(key)!
        : Math.random() < LEGACY_POWERUP_CHANCE; // legacy levels without a sidecar
      const questionBlock = new QuestionBlock(this.scene, pixelX, pixelY, containsPowerUp);
      this.questionBlocks.push(questionBlock);
      return;
    }

    let texture: string;
    let group: Phaser.Physics.Arcade.StaticGroup;

    switch (tileType) {
      case TileType.GROUND:
        texture = 'ground';
        group = this.groundGroup;
        break;
      case TileType.PLATFORM:
        texture = 'platform';
        group = this.platformGroup;
        break;
      case TileType.SPIKE:
        texture = 'spike';
        group = this.hazardGroup;
        break;
      case TileType.PIPE:
        // Check if this is the top of a pipe (empty above or different tile)
        {
          const isTop = gridY === 0 ||
            (this.levelData && this.levelData.tiles[gridY - 1][gridX] !== TileType.PIPE);
          texture = isTop ? 'pipe_top' : 'pipe';
          group = this.groundGroup;
        }
        break;
      default:
        return;
    }

    const tile = group.create(pixelX, pixelY, texture);
    tile.setOrigin(0.5, 0.5);
    tile.refreshBody();
  }

  getGroundGroup(): Phaser.Physics.Arcade.StaticGroup {
    return this.groundGroup;
  }

  getPlatformGroup(): Phaser.Physics.Arcade.StaticGroup {
    return this.platformGroup;
  }

  getHazardGroup(): Phaser.Physics.Arcade.StaticGroup {
    return this.hazardGroup;
  }

  getBricks(): Brick[] {
    return this.bricks;
  }

  getQuestionBlocks(): QuestionBlock[] {
    return this.questionBlocks;
  }

  getPlayerSpawns(): SpawnPoint[] {
    return this.levelData?.playerSpawns ?? [{ x: 2, y: 10 }];
  }

  getEnemySpawns(): SpawnPoint[] {
    return this.levelData?.enemySpawns ?? [];
  }

  getCoinSpawns(): CoinSpawn[] {
    return this.levelData?.coinSpawns ?? [];
  }

  getExit(): LevelExit | null {
    return this.levelData?.exit ?? null;
  }

  getWorldSize(): { width: number; height: number } {
    if (!this.levelData) return { width: 1280, height: 720 };
    return {
      width: this.levelData.width * this.levelData.tileSize,
      height: this.levelData.height * this.levelData.tileSize,
    };
  }

  gridToPixel(gridX: number, gridY: number): { x: number; y: number } {
    const tileSize = this.levelData?.tileSize ?? 32;
    return {
      x: gridX * tileSize + tileSize / 2,
      y: gridY * tileSize + tileSize / 2,
    };
  }
}
