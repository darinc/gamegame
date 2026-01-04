import Phaser from 'phaser';
import { Player } from '../entities/Player';
import { Enemy } from '../entities/Enemy';
import { ChargingBull } from '../entities/ChargingBull';
import { Coin } from '../entities/Coin';
import { Brick } from '../entities/Brick';
import { QuestionBlock } from '../entities/QuestionBlock';
import { PowerUp } from '../entities/PowerUp';
import { InputManager } from '../systems/InputManager';
import { LevelLoader } from '../levels/LevelLoader';
import { level1 } from '../levels/level1';
import { generateLevel } from '../levels/ProceduralGenerator';
import { generateHybridLevel } from '../levels/HybridGenerator';
import { EnemyType } from '../levels/types';
import { GAME_WIDTH, GAME_HEIGHT } from '../config';

// Tethered camera settings
const MAX_PLAYER_DISTANCE = 900;
const CAMERA_LERP = 0.1;
const MIN_ZOOM = 0.6;
const MAX_ZOOM = 1.0;
const ZOOM_DISTANCE_THRESHOLD = 500;

// Stomp bounce velocity
const STOMP_BOUNCE = -300;

// Player state for persistence between levels
interface PlayerState {
  health: number;
  isPoweredUp: boolean;
}

// Game settings - can be passed via scene data
interface GameSettings {
  playerCount?: number;
  playerStates?: PlayerState[];
  lives?: number;
  coins?: number;
}

export class GameScene extends Phaser.Scene {
  private players: Player[] = [];
  private enemies: Enemy[] = [];
  private bulls: ChargingBull[] = [];
  private coins: Coin[] = [];
  private bricks: Brick[] = [];
  private questionBlocks: QuestionBlock[] = [];
  private powerUps: PowerUp[] = [];
  private inputManager!: InputManager;
  private levelLoader!: LevelLoader;
  private playerCount: number = 1; // Default to 1 player
  private initialPlayerStates: PlayerState[] = []; // For level persistence

  // Game state
  private coinCount: number = 0;
  private lives: number = 3;

  // UI
  private debugText!: Phaser.GameObjects.Text;
  private debugVisible: boolean = false;
  private coinText!: Phaser.GameObjects.Text;
  private livesText!: Phaser.GameObjects.Text;
  private healthBars: Phaser.GameObjects.Graphics[] = [];

  // Level exit
  private exitSprite: Phaser.GameObjects.Sprite | null = null;
  private playersFinished: Set<Player> = new Set();
  private levelCompleteCountdown: number = -1;
  private countdownText: Phaser.GameObjects.Text | null = null;

  // Camera state
  private cameraTarget: Phaser.Math.Vector2 = new Phaser.Math.Vector2();

  constructor() {
    super({ key: 'GameScene' });
  }

  init(data: Partial<GameSettings>): void {
    // Get player count from scene data, URL param, or default
    if (data.playerCount) {
      this.playerCount = data.playerCount;
    } else {
      // Check URL parameter: ?players=1 or ?players=2
      const urlParams = new URLSearchParams(window.location.search);
      const playersParam = urlParams.get('players');
      this.playerCount = playersParam ? parseInt(playersParam, 10) : 1;
    }
    this.playerCount = Math.max(1, Math.min(2, this.playerCount)); // Clamp 1-2

    // Reset level completion state
    this.playersFinished = new Set();
    this.levelCompleteCountdown = -1;
    this.countdownText = null;

    // Reset all game object arrays (important when scene restarts)
    this.players = [];
    this.enemies = [];
    this.bulls = [];
    this.coins = [];
    this.bricks = [];
    this.questionBlocks = [];
    this.powerUps = [];
    this.healthBars = [];
    this.exitSprite = null;

    // Reset camera target to avoid stale position from previous level
    this.cameraTarget = new Phaser.Math.Vector2();

    // Use persisted game state if coming from level complete, otherwise reset
    this.coinCount = data.coins ?? 0;
    this.lives = data.lives ?? 3;
    this.initialPlayerStates = data.playerStates ?? [];

    console.log(`Starting game with ${this.playerCount} player(s)`);
  }

  create(): void {
    // Check for generation mode: ?hybrid=true (default) or ?procedural=true (old sparse style)
    const urlParams = new URLSearchParams(window.location.search);
    const useHybrid = urlParams.get('hybrid') === 'true';
    const useProcedural = urlParams.get('procedural') === 'true';
    const seed = urlParams.get('seed');
    const difficulty = urlParams.get('difficulty');

    // Initialize level loader and load level
    this.levelLoader = new LevelLoader(this);

    if (useHybrid) {
      // Hybrid generation: hand-crafted chunks + procedural bridges
      const hybridLevel = generateHybridLevel(
        seed ? parseInt(seed, 10) : undefined,
        { difficulty: difficulty ? parseInt(difficulty, 10) : 5 }
      );
      this.levelLoader.load(hybridLevel);
      console.log('Loaded hybrid level');
    } else if (useProcedural) {
      // Pure procedural generation (sparse, original algorithm)
      const proceduralLevel = generateLevel(seed ? parseInt(seed, 10) : undefined);
      this.levelLoader.load(proceduralLevel);
      console.log('Loaded procedural level');
    } else {
      this.levelLoader.load(level1);
    }

    // Initialize input manager
    this.inputManager = new InputManager(this);

    // Create players at spawn points
    this.createPlayers();

    // Create enemies at spawn points
    this.createEnemies();

    // Create coins
    this.createCoins();

    // Set up bricks
    this.setupBricks();

    // Create level exit
    this.createExit();

    // Set up camera
    this.setupCamera();

    // Create debug UI
    this.createUI();

    console.log('GameScene created with level:', level1.name);
  }

  private createPlayers(): void {
    const spawns = this.levelLoader.getPlayerSpawns();
    const groundGroup = this.levelLoader.getGroundGroup();
    const platformGroup = this.levelLoader.getPlatformGroup();

    spawns.forEach((spawn, index) => {
      if (index >= this.playerCount) return; // Respect player count setting

      const pos = this.levelLoader.gridToPixel(spawn.x, spawn.y);
      const player = new Player(this, pos.x, pos.y, index);
      this.players.push(player);

      // Apply persisted state from previous level if available
      const savedState = this.initialPlayerStates[index];
      if (savedState) {
        player.setInitialState(savedState.health, savedState.isPoweredUp);
      }

      // Set up collisions with level
      this.physics.add.collider(player, groundGroup);
      this.physics.add.collider(player, platformGroup);
    });

    // Player-to-player collision - only if 2 players
    if (this.players.length >= 2) {
      // Solid collision between players
      this.physics.add.collider(this.players[0], this.players[1]);

      // Bubble popping overlap
      this.physics.add.overlap(
        this.players[0],
        this.players[1],
        () => {
          const player1 = this.players[0];
          const player2 = this.players[1];

          if (player1.getIsInBubble() && !player2.getIsInBubble()) {
            player1.exitBubble();
          }
          if (player2.getIsInBubble() && !player1.getIsInBubble()) {
            player2.exitBubble();
          }
        }
      );
    }
  }

  private createEnemies(): void {
    const spawns = this.levelLoader.getEnemySpawns();
    const groundGroup = this.levelLoader.getGroundGroup();
    const platformGroup = this.levelLoader.getPlatformGroup();

    // Combine ground and platforms for ledge detection
    const allGround = this.physics.add.staticGroup();
    groundGroup.getChildren().forEach(child => {
      allGround.add(child);
    });
    platformGroup.getChildren().forEach(child => {
      allGround.add(child);
    });

    spawns.forEach((spawn) => {
      const pos = this.levelLoader.gridToPixel(spawn.x, spawn.y);

      if (spawn.type === EnemyType.BULL) {
        // Create charging bull
        const bull = new ChargingBull(this, pos.x, pos.y);
        this.bulls.push(bull);

        // Give bull references
        bull.setGroundGroup(allGround);
        bull.setPlayers(this.players);
        bull.setBricks(this.bricks);

        // Bull collides with ground/platforms
        this.physics.add.collider(bull, groundGroup);
        this.physics.add.collider(bull, platformGroup);
      } else {
        // Create regular goomba enemy
        const enemy = new Enemy(this, pos.x, pos.y);
        this.enemies.push(enemy);

        // Give enemy reference to ground for ledge detection
        enemy.setGroundGroup(allGround);

        // Enemy collides with ground/platforms
        this.physics.add.collider(enemy, groundGroup);
        this.physics.add.collider(enemy, platformGroup);
      }
    });

    // Set up player-enemy collisions for regular enemies
    this.players.forEach((player) => {
      this.enemies.forEach((enemy) => {
        this.physics.add.overlap(
          player,
          enemy,
          (_playerObj, _enemyObj) => {
            this.handlePlayerEnemyCollision(player, enemy);
          }
        );
      });
    });

    // Set up player-bull collisions
    this.players.forEach((player) => {
      this.bulls.forEach((bull) => {
        this.physics.add.overlap(
          player,
          bull,
          (_playerObj, _bullObj) => {
            this.handlePlayerBullCollision(player, bull);
          }
        );
      });
    });
  }

  private handlePlayerEnemyCollision(player: Player, enemy: Enemy): void {
    // Don't interact if player is in bubble or enemy is dead
    if (player.getIsInBubble()) return;
    if (!enemy.isAlive()) return;

    const playerBody = player.body as Phaser.Physics.Arcade.Body;

    // Check if player can stomp the enemy
    if (enemy.canBeStomped(playerBody)) {
      // Stomp the enemy!
      enemy.stomp(this.time.now);

      // Bounce the player
      playerBody.setVelocityY(STOMP_BOUNCE);

      console.log('Enemy stomped!');
    } else {
      // Player got hit - take damage
      const knockbackDir = player.x < enemy.x ? -1 : 1;
      playerBody.setVelocityX(knockbackDir * 200);

      const isDead = player.takeDamage(this.time.now);
      this.updateHealthUI();

      if (isDead) {
        this.handlePlayerDeath(player);
      }
    }
  }

  private handlePlayerBullCollision(player: Player, bull: ChargingBull): void {
    // Don't interact if player is in bubble or bull is dead
    if (player.getIsInBubble()) return;
    if (!bull.isAlive()) return;

    const playerBody = player.body as Phaser.Physics.Arcade.Body;

    // Check if player can stomp the bull
    if (bull.canBeStomped(playerBody)) {
      // Stomp the bull!
      bull.stomp(this.time.now);

      // Bounce the player
      playerBody.setVelocityY(STOMP_BOUNCE);

      console.log('Bull stomped!');
    } else {
      // Player got hit - take damage (extra knockback if bull is charging)
      const knockbackDir = player.x < bull.x ? -1 : 1;
      const knockbackForce = bull.isCharging() ? 350 : 200;
      playerBody.setVelocityX(knockbackDir * knockbackForce);

      const isDead = player.takeDamage(this.time.now);
      this.updateHealthUI();

      if (isDead) {
        this.handlePlayerDeath(player);
      }
    }
  }

  private createCoins(): void {
    const spawns = this.levelLoader.getCoinSpawns();

    spawns.forEach((spawn) => {
      const pos = this.levelLoader.gridToPixel(spawn.x, spawn.y);
      const coin = new Coin(this, pos.x, pos.y);
      this.coins.push(coin);
    });

    // Set up player-coin collisions
    this.players.forEach((player) => {
      this.coins.forEach((coin) => {
        this.physics.add.overlap(
          player,
          coin,
          () => {
            if (!player.getIsInBubble() && coin.collect()) {
              this.coinCount++;
              this.updateCoinUI();
            }
          }
        );
      });
    });
  }

  private setupBricks(): void {
    this.bricks = this.levelLoader.getBricks();
    this.questionBlocks = this.levelLoader.getQuestionBlocks();

    // Set up player-brick collisions
    // Process callback returns false during ground pound to allow passing through
    this.players.forEach((player) => {
      this.bricks.forEach((brick) => {
        this.physics.add.collider(
          player,
          brick,
          () => {
            this.checkHeadBump(player);
            this.checkGroundPound(player);
          },
          () => {
            // Allow passing through bricks while ground pounding (breaks them)
            if (player.isPlayerGroundPounding() && !brick.isBroken()) {
              brick.break();
              return false; // Don't collide - pass through
            }
            return !brick.isBroken(); // Normal collision if not broken
          },
          this
        );
      });
      this.questionBlocks.forEach((qBlock) => {
        this.physics.add.collider(
          player,
          qBlock,
          () => {
            this.checkHeadBump(player);
            // Activate question block on ground pound but stay solid
            if (player.isPlayerGroundPounding() && !qBlock.isActivated()) {
              const result = qBlock.activate(true); // true = from above (ground pound)
              if (result) {
                if (result.isPowerUp) {
                  this.spawnPowerUpFromBlock(result.x, result.y);
                } else {
                  this.spawnCoinFromBlock(result.x, result.y);
                }
              }
            }
          },
          undefined, // No process callback - question blocks are always solid
          this
        );
      });
    });

    // Enemies also collide with bricks and question blocks
    this.enemies.forEach((enemy) => {
      this.bricks.forEach((brick) => {
        this.physics.add.collider(enemy, brick);
      });
      this.questionBlocks.forEach((qBlock) => {
        this.physics.add.collider(enemy, qBlock);
      });
    });

    // Bulls collide with question blocks (but break bricks while charging - handled in ChargingBull)
    this.bulls.forEach((bull) => {
      this.questionBlocks.forEach((qBlock) => {
        this.physics.add.collider(bull, qBlock);
      });
    });
  }

  private checkHeadBump(player: Player): void {
    const playerBody = player.body as Phaser.Physics.Arcade.Body;
    if (!playerBody) return;

    // Only process if player hit their head
    const hitHead = playerBody.blocked.up || playerBody.touching.up;
    if (!hitHead) return;

    // Get player's head position (top center)
    const headX = playerBody.center.x;
    const headY = playerBody.top;
    const hitRadius = 20; // How far left/right to check for blocks

    // Check all bricks near the head
    for (const brick of this.bricks) {
      if (brick.isBroken()) continue;
      const brickBody = brick.body as Phaser.Physics.Arcade.StaticBody;
      if (!brickBody) continue;

      // Check if brick is above player and within horizontal range
      const brickBottom = brickBody.bottom;
      const brickCenterX = brickBody.center.x;

      const verticallyAligned = Math.abs(headY - brickBottom) < 10;
      const horizontallyNear = Math.abs(headX - brickCenterX) < (brickBody.width / 2 + hitRadius);

      if (verticallyAligned && horizontallyNear) {
        brick.break();
      }
    }

    // Check all question blocks near the head
    for (const qBlock of this.questionBlocks) {
      if (qBlock.isActivated()) continue;
      const qBlockBody = qBlock.body as Phaser.Physics.Arcade.StaticBody;
      if (!qBlockBody) continue;

      const qBlockBottom = qBlockBody.bottom;
      const qBlockCenterX = qBlockBody.center.x;

      const verticallyAligned = Math.abs(headY - qBlockBottom) < 10;
      const horizontallyNear = Math.abs(headX - qBlockCenterX) < (qBlockBody.width / 2 + hitRadius);

      if (verticallyAligned && horizontallyNear) {
        const result = qBlock.activate();
        if (result) {
          if (result.isPowerUp) {
            this.spawnPowerUpFromBlock(result.x, result.y);
          } else {
            this.spawnCoinFromBlock(result.x, result.y);
          }
        }
      }
    }

    // Bounce player back down
    playerBody.setVelocityY(100);
  }

  private checkGroundPound(player: Player): void {
    // Only process if player is actively ground pounding
    if (!player.isPlayerGroundPounding()) return;

    const playerBody = player.body as Phaser.Physics.Arcade.Body;
    if (!playerBody) return;

    // Check if player landed on top of a block (feet touching)
    const hitGround = playerBody.blocked.down || playerBody.touching.down;
    if (!hitGround) return;

    // Get player's feet position (bottom center)
    const feetX = playerBody.center.x;
    const feetY = playerBody.bottom;
    const hitRadius = 20; // How far left/right to check for blocks

    let brokeAnyBlock = false;

    // Check all bricks near the feet
    for (const brick of this.bricks) {
      if (brick.isBroken()) continue;
      const brickBody = brick.body as Phaser.Physics.Arcade.StaticBody;
      if (!brickBody) continue;

      // Check if brick is below player and within horizontal range
      const brickTop = brickBody.top;
      const brickCenterX = brickBody.center.x;

      const verticallyAligned = Math.abs(feetY - brickTop) < 10;
      const horizontallyNear = Math.abs(feetX - brickCenterX) < (brickBody.width / 2 + hitRadius);

      if (verticallyAligned && horizontallyNear) {
        brick.break();
        brokeAnyBlock = true;
      }
    }

    // Check all question blocks near the feet
    for (const qBlock of this.questionBlocks) {
      if (qBlock.isActivated()) continue;
      const qBlockBody = qBlock.body as Phaser.Physics.Arcade.StaticBody;
      if (!qBlockBody) continue;

      const qBlockTop = qBlockBody.top;
      const qBlockCenterX = qBlockBody.center.x;

      const verticallyAligned = Math.abs(feetY - qBlockTop) < 10;
      const horizontallyNear = Math.abs(feetX - qBlockCenterX) < (qBlockBody.width / 2 + hitRadius);

      if (verticallyAligned && horizontallyNear) {
        const result = qBlock.activate(true); // true = from above (ground pound)
        brokeAnyBlock = true;
        if (result) {
          if (result.isPowerUp) {
            this.spawnPowerUpFromBlock(result.x, result.y);
          } else {
            this.spawnCoinFromBlock(result.x, result.y);
          }
        }
      }
    }

    // If we broke any blocks, maintain ground pound momentum
    // This prevents the collision from killing the player's speed
    if (brokeAnyBlock) {
      playerBody.setVelocityY(800); // GROUND_POUND_VELOCITY
    }
  }

  private spawnCoinFromBlock(x: number, y: number): void {
    const coin = new Coin(this, x, y);
    this.coins.push(coin);

    // Animate coin popping out
    this.tweens.add({
      targets: coin,
      y: y - 48,
      duration: 300,
      ease: 'Quad.easeOut',
      onComplete: () => {
        // Auto-collect the coin after animation
        this.collectCoin(coin);
      }
    });
  }

  private spawnPowerUpFromBlock(x: number, y: number): void {
    // Determine direction: move away from nearest player
    let moveDirection = 1;
    if (this.players.length > 0) {
      const nearestPlayer = this.players.reduce((nearest, player) => {
        const distToCurrent = Math.abs(player.x - x);
        const distToNearest = Math.abs(nearest.x - x);
        return distToCurrent < distToNearest ? player : nearest;
      });
      moveDirection = nearestPlayer.x < x ? 1 : -1;
    }

    const powerUp = new PowerUp(this, x, y, moveDirection);
    this.powerUps.push(powerUp);

    // Set up collision with ground/platforms
    const groundGroup = this.levelLoader.getGroundGroup();
    const platformGroup = this.levelLoader.getPlatformGroup();
    this.physics.add.collider(powerUp, groundGroup);
    this.physics.add.collider(powerUp, platformGroup);

    // Set up collision with bricks
    this.bricks.forEach((brick) => {
      this.physics.add.collider(powerUp, brick);
    });

    // Set up player overlap for collection
    this.players.forEach((player) => {
      this.physics.add.overlap(
        player,
        powerUp,
        () => {
          if (!player.getIsInBubble() && !powerUp.isCollected()) {
            if (powerUp.collect()) {
              player.powerUp();
              this.updateHealthUI();
              this.powerUps = this.powerUps.filter(p => p !== powerUp);
            }
          }
        }
      );
    });
  }

  private collectCoin(coin: Coin): void {
    if (this.coins.includes(coin)) {
      this.coinCount++;
      this.coins = this.coins.filter(c => c !== coin);
      coin.destroy();
    }
  }

  private createExit(): void {
    const exit = this.levelLoader.getExit();
    if (!exit) return;

    const pos = this.levelLoader.gridToPixel(exit.x, exit.y);
    const texture = exit.type === 'flagpole' ? 'flagpole' : 'door';

    // Adjust Y position based on exit type
    const yOffset = exit.type === 'flagpole' ? -48 : -16;
    this.exitSprite = this.add.sprite(pos.x, pos.y + yOffset, texture);
    this.exitSprite.setDepth(3);

    // Add physics for overlap detection
    this.physics.add.existing(this.exitSprite, true);

    // Set up player-exit overlap
    this.players.forEach((player) => {
      this.physics.add.overlap(
        player,
        this.exitSprite!,
        () => {
          if (!player.getIsInBubble()) {
            this.handlePlayerReachedExit(player);
          }
        }
      );
    });
  }

  private handlePlayerReachedExit(player: Player): void {
    // Already finished?
    if (this.playersFinished.has(player)) return;

    this.playersFinished.add(player);

    // Put the finished player in a "finished" state (hide them or freeze)
    player.setVisible(false);
    player.setActive(false);
    (player.body as Phaser.Physics.Arcade.Body).enable = false;

    // Check if all players have finished
    if (this.playersFinished.size >= this.playerCount) {
      this.completeLevel();
      return;
    }

    // Start countdown for remaining players (3 seconds)
    if (this.levelCompleteCountdown < 0) {
      this.levelCompleteCountdown = 3;
      this.createCountdownUI();
    }
  }

  private createCountdownUI(): void {
    this.countdownText = this.add.text(GAME_WIDTH / 2, 80, '', {
      fontSize: '48px',
      color: '#FFD700',
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 6,
    });
    this.countdownText.setOrigin(0.5);
    this.countdownText.setScrollFactor(0);
    this.countdownText.setDepth(100);
    this.updateCountdownUI();
  }

  private updateCountdownUI(): void {
    if (this.countdownText && this.levelCompleteCountdown >= 0) {
      const seconds = Math.ceil(this.levelCompleteCountdown);
      this.countdownText.setText(`Hurry! ${seconds}`);
    }
  }

  private updateLevelCountdown(delta: number): void {
    if (this.levelCompleteCountdown < 0) return;

    this.levelCompleteCountdown -= delta / 1000;
    this.updateCountdownUI();

    if (this.levelCompleteCountdown <= 0) {
      this.completeLevel();
    }
  }

  private completeLevel(): void {
    // Prevent multiple triggers
    this.levelCompleteCountdown = -1;
    if (this.exitSprite) {
      this.exitSprite.destroy();
      this.exitSprite = null;
    }

    // Gather player states for persistence
    const playerStates = this.players.map(player => ({
      health: player.getHealth(),
      isPoweredUp: player.getIsPoweredUp(),
    }));

    // Show level complete and go to next level or restart
    this.scene.start('LevelCompleteScene', {
      coins: this.coinCount,
      lives: this.lives,
      playerStates,
    });
  }

  private setupCamera(): void {
    const worldSize = this.levelLoader.getWorldSize();
    this.cameras.main.setBounds(0, 0, worldSize.width, worldSize.height);
    this.cameraTarget.set(GAME_WIDTH / 2, GAME_HEIGHT / 2);
  }

  private createUI(): void {
    // Coin counter (top right)
    this.coinText = this.add.text(GAME_WIDTH - 20, 20, `Coins: ${this.coinCount}`, {
      fontSize: '24px',
      color: '#FFD700',
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 4,
    });
    this.coinText.setOrigin(1, 0);
    this.coinText.setScrollFactor(0);
    this.coinText.setDepth(100);

    // Lives counter (top left)
    this.livesText = this.add.text(20, 20, `Lives: ${this.lives}`, {
      fontSize: '24px',
      color: '#FF4444',
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 4,
    });
    this.livesText.setScrollFactor(0);
    this.livesText.setDepth(100);

    // Debug text (below lives)
    this.debugText = this.add.text(10, 60, '', {
      fontSize: '14px',
      color: '#ffffff',
      backgroundColor: '#000000aa',
      padding: { x: 10, y: 5 },
    });
    this.debugText.setScrollFactor(0);
    this.debugText.setDepth(100);
    this.debugText.setVisible(this.debugVisible);

    // Toggle debug with 0 key
    this.input.keyboard?.addKey(Phaser.Input.Keyboard.KeyCodes.ZERO)
      .on('down', () => {
        this.debugVisible = !this.debugVisible;
        this.debugText.setVisible(this.debugVisible);
      });

    // Health bars for each player
    this.players.forEach(() => {
      const healthBar = this.add.graphics();
      healthBar.setScrollFactor(0);
      healthBar.setDepth(100);
      this.healthBars.push(healthBar);
    });
    this.updateHealthUI();
  }

  private updateCoinUI(): void {
    this.coinText.setText(`Coins: ${this.coinCount}`);
  }

  private updateLivesUI(): void {
    this.livesText.setText(`Lives: ${this.lives}`);
  }

  private updateHealthUI(): void {
    const barWidth = 100;
    const barHeight = 12;
    const startX = GAME_WIDTH / 2 - (this.playerCount * (barWidth + 20)) / 2 + 10;
    const startY = 20;

    this.players.forEach((player, index) => {
      const healthBar = this.healthBars[index];
      if (!healthBar) return;

      const x = startX + index * (barWidth + 20);
      const health = player.getHealth();

      healthBar.clear();

      // Background
      healthBar.fillStyle(0x333333);
      healthBar.fillRect(x, startY, barWidth, barHeight);

      // Health fill
      const healthColor = index === 0 ? 0xFF8C00 : 0x44ff88;
      healthBar.fillStyle(healthColor);
      healthBar.fillRect(x, startY, barWidth * Math.max(0, health), barHeight);

      // Border
      healthBar.lineStyle(2, 0xffffff);
      healthBar.strokeRect(x, startY, barWidth, barHeight);
    });
  }

  private handlePlayerDeath(player: Player): void {
    const playerIndex = this.players.indexOf(player);
    this.lives--;
    this.updateLivesUI();

    if (this.lives <= 0) {
      // Game over
      this.scene.start('GameOverScene', {
        coins: this.coinCount,
      });
      return;
    }

    // Respawn with full health
    player.resetHealth();
    this.respawnPlayer(player, playerIndex);
    this.updateHealthUI();
  }

  update(time: number, delta: number): void {
    // Guard against updates during scene transition
    if (!this.scene.isActive()) return;

    // Set seek targets for bubbled players
    this.updateBubbleTargets();

    // Update players and handle bubble input
    this.players.forEach((player, index) => {
      if (!player.active) return;
      const input = this.inputManager.getInput(index);

      // Manual bubble: press Q (P1) or / (P2) or X button on controller
      if (input.bubbleJustPressed && !player.getIsInBubble()) {
        player.enterBubble();
      }

      player.update(input, time, delta);
    });

    // Check for players falling out of world
    this.checkPlayerFallDeath();

    // Update enemies
    this.enemies.forEach((enemy) => {
      if (!enemy.active) return;
      enemy.update(time, delta);
    });

    // Update bulls
    this.bulls.forEach((bull) => {
      if (!bull.active) return;
      bull.update(time, delta);
    });

    // Update power-ups
    this.powerUps.forEach((powerUp) => {
      if (!powerUp.active) return;
      powerUp.update();
    });

    // Check for tethering / bubble logic (only for 2 players)
    if (this.playerCount >= 2) {
      this.updateTethering();
    }

    // Update level complete countdown
    this.updateLevelCountdown(delta);

    // Update camera
    this.updateCamera(delta);

    // Update debug UI
    this.updateDebugUI();
  }

  private checkPlayerFallDeath(): void {
    const worldSize = this.levelLoader.getWorldSize();
    const deathY = worldSize.height + 100; // A bit below the world

    this.players.forEach((player, index) => {
      if (player.y > deathY && !player.getIsInBubble()) {
        // Player fell out of the world - respawn them
        this.respawnPlayer(player, index);
      }
    });
  }

  private respawnPlayer(player: Player, index: number): void {
    // Lose a life
    this.lives--;
    this.updateLivesUI();

    if (this.lives <= 0) {
      // Game over - restart scene
      console.log('Game Over!');
      this.scene.restart();
      return;
    }

    const spawns = this.levelLoader.getPlayerSpawns();
    const spawn = spawns[index] || spawns[0];
    const pos = this.levelLoader.gridToPixel(spawn.x, spawn.y);

    // Reset player position and velocity
    player.setPosition(pos.x, pos.y);
    const body = player.body as Phaser.Physics.Arcade.Body;
    body.setVelocity(0, 0);

    // Exit bubble if in one
    if (player.getIsInBubble()) {
      player.exitBubble();
    }

    console.log(`Player ${index + 1} respawned. Lives: ${this.lives}`);
  }

  private updateBubbleTargets(): void {
    const activePlayers = this.players.filter(p => !p.getIsInBubble());
    const bubbledPlayers = this.players.filter(p => p.getIsInBubble());

    if (activePlayers.length > 0 && bubbledPlayers.length > 0) {
      const target = new Phaser.Math.Vector2(activePlayers[0].x, activePlayers[0].y);
      bubbledPlayers.forEach(p => p.setSeekTarget(target));
    } else {
      this.players.forEach(p => p.setSeekTarget(null));
    }
  }

  private updateTethering(): void {
    if (this.players.length < 2) return;

    const player1 = this.players[0];
    const player2 = this.players[1];

    if (player1.getIsInBubble() && player2.getIsInBubble()) return;

    const distance = Phaser.Math.Distance.Between(
      player1.x, player1.y,
      player2.x, player2.y
    );

    if (distance > MAX_PLAYER_DISTANCE) {
      if (!player1.getIsInBubble() && !player2.getIsInBubble()) {
        if (player1.x < player2.x) {
          player1.enterBubble();
        } else {
          player2.enterBubble();
        }
      }
    }
  }

  private updateCamera(delta: number): void {
    const activePlayers = this.players.filter(p => !p.getIsInBubble());

    let targetX = 0;
    let targetY = 0;
    let count = 0;
    let minX = Infinity;
    let maxX = -Infinity;

    const playersToFollow = activePlayers.length > 0 ? activePlayers : this.players;

    playersToFollow.forEach((player) => {
      targetX += player.x;
      targetY += player.y;
      minX = Math.min(minX, player.x);
      maxX = Math.max(maxX, player.x);
      count++;
    });

    if (count > 0) {
      targetX /= count;
      targetY /= count;
    }

    this.cameraTarget.x = Phaser.Math.Linear(
      this.cameraTarget.x,
      targetX,
      CAMERA_LERP * (delta / 16.67)
    );
    this.cameraTarget.y = Phaser.Math.Linear(
      this.cameraTarget.y,
      targetY,
      CAMERA_LERP * (delta / 16.67)
    );

    const playerDistance = maxX - minX;
    let targetZoom = MAX_ZOOM;

    if (playerDistance > ZOOM_DISTANCE_THRESHOLD) {
      const zoomFactor = (playerDistance - ZOOM_DISTANCE_THRESHOLD) /
        (MAX_PLAYER_DISTANCE - ZOOM_DISTANCE_THRESHOLD);
      targetZoom = Phaser.Math.Linear(MAX_ZOOM, MIN_ZOOM, Math.min(1, zoomFactor));
    }

    const currentZoom = this.cameras.main.zoom;
    const newZoom = Phaser.Math.Linear(currentZoom, targetZoom, 0.05);
    this.cameras.main.setZoom(newZoom);

    this.cameras.main.centerOn(this.cameraTarget.x, this.cameraTarget.y);
  }

  private updateDebugUI(): void {
    const gamepads = this.inputManager.getGamepadInfo();
    const gamepadText = gamepads.length > 0
      ? gamepads.join('\n')
      : 'No gamepads (use keyboard)';

    const lines: string[] = [
      `Players: ${this.playerCount} (?players=1 or 2)`,
      '',
      'Controls:',
      gamepadText,
      'P1: WASD + Shift, Q=bubble',
      'P2: Arrows + Space, /=bubble',
      '',
    ];

    // Player positions and status
    this.players.forEach((p, i) => {
      const status: string[] = [];
      if (!p.active) status.push('INACTIVE');
      if (this.playersFinished.has(p)) status.push('FINISHED');
      if (p.getIsInBubble()) status.push('BUBBLE');
      const statusStr = status.length > 0 ? ` [${status.join(', ')}]` : '';
      lines.push(`P${i + 1}: (${Math.round(p.x)}, ${Math.round(p.y)})${statusStr}`);
    });

    // Distance (only show for 2 players)
    if (this.players.length >= 2) {
      const p1 = this.players[0];
      const p2 = this.players[1];
      const distance = Phaser.Math.Distance.Between(p1.x, p1.y, p2.x, p2.y);
      lines.push(`Distance: ${Math.round(distance)} / ${MAX_PLAYER_DISTANCE}`);
    }

    const aliveEnemies = this.enemies.filter(e => e.isAlive()).length;
    const aliveBulls = this.bulls.filter(b => b.isAlive()).length;
    lines.push(`Enemies: ${aliveEnemies}/${this.enemies.length}`);
    lines.push(`Bulls: ${aliveBulls}/${this.bulls.length}`);

    this.debugText.setText(lines.join('\n'));
  }
}
