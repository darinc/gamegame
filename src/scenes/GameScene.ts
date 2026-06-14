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
import { getLevel } from '../levels/index';
import { generateLevel } from '../levels/ProceduralGenerator';
import { generateHybridLevel } from '../levels/HybridGenerator';
import { EnemyType } from '../levels/types';
import { GAME_WIDTH, GAME_HEIGHT } from '../config';
import { BotController } from '../systems/BotController';
import type { Threat } from '../systems/BotController';
import { buildSettings, parseSettingsFromURL } from '../settings';
import type { GameSettings, PlayerState } from '../settings';
import { audio } from '../systems/AudioSynth';
import { themeForLevel } from '../levels/themes';
import type { Theme } from '../levels/themes';

// Tethered camera settings
const MAX_PLAYER_DISTANCE = 900;
const CAMERA_LERP = 0.1;
const MIN_ZOOM = 0.6;
const MAX_ZOOM = 1.35; // tighter framing so the heroes feel present, not tiny
const ZOOM_DISTANCE_THRESHOLD = 420;

// Stomp bounce velocity
const STOMP_BOUNCE = -300;

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
  private settings!: GameSettings;
  private theme!: Theme;
  private botControllers: (BotController | null)[] = [];
  private playerCount: number = 1; // Default to 1 player
  private initialPlayerStates: PlayerState[] = []; // For level persistence

  // Game state
  private coinCount: number = 0;
  private lives: number = 3;
  private score: number = 0;
  private combo: number = 0;
  private lastStompTime: number = -9999;

  // UI (the persistent HUD lives in HudScene; this is just the dev overlay)
  private debugText!: Phaser.GameObjects.Text;
  private debugVisible: boolean = false;

  // Level exit
  private exitSprite: Phaser.GameObjects.Sprite | null = null;
  private exitTrigger: Phaser.GameObjects.GameObject | null = null;
  private playersFinished: Set<Player> = new Set();
  private levelCompleteCountdown: number = -1;

  // Camera state
  private cameraTarget: Phaser.Math.Vector2 = new Phaser.Math.Vector2();

  constructor() {
    super({ key: 'GameScene' });
  }

  init(data: Partial<GameSettings>): void {
    // Settings arrive from the title screen / level transition. If the scene was
    // entered directly (old URL, hot reload), fall back to URL params / defaults.
    this.settings = (data && typeof data.playerCount === 'number')
      ? buildSettings(data)
      : buildSettings(parseSettingsFromURL());

    this.playerCount = this.settings.playerCount;

    // Reset level completion state
    this.playersFinished = new Set();
    this.levelCompleteCountdown = -1;

    // Reset all game object arrays (important when scene restarts)
    this.players = [];
    this.enemies = [];
    this.bulls = [];
    this.coins = [];
    this.bricks = [];
    this.questionBlocks = [];
    this.powerUps = [];
    this.botControllers = [];
    this.exitSprite = null;
    this.exitTrigger = null;

    // Reset camera target to avoid stale position from previous level
    this.cameraTarget = new Phaser.Math.Vector2();

    // Use persisted game state if coming from level complete, otherwise reset
    this.coinCount = this.settings.coins;
    this.lives = this.settings.lives;
    this.score = this.settings.score;
    this.combo = 0;
    this.lastStompTime = -9999;
    this.initialPlayerStates = this.settings.playerStates;

    console.log(
      `Level ${this.settings.levelNumber}: ${this.playerCount}p, ` +
      `mode=${this.settings.genMode}, bots=[${this.settings.botMask}]`,
    );
  }

  create(): void {
    // Seed (if any) still comes from the URL for reproducible levels.
    const urlParams = new URLSearchParams(window.location.search);
    const seedParam = urlParams.get('seed');
    // Vary the seed by level number so an endless run keeps producing fresh levels
    // even when a fixed seed is supplied.
    const seed = seedParam !== null
      ? parseInt(seedParam, 10) + this.settings.levelNumber * 1000
      : undefined;

    // Initialize level loader and load level
    this.levelLoader = new LevelLoader(this);

    if (this.settings.genMode === 'procedural') {
      this.levelLoader.load(generateLevel(seed, { difficulty: this.settings.difficulty }));
      console.log('Loaded procedural level');
    } else if (this.settings.genMode === 'named') {
      const level = getLevel(this.settings.levelName || 'level1');
      this.levelLoader.load(level);
      console.log(`Loaded level: ${level.name}`);
    } else {
      // Default: hybrid generation (hand-crafted moments + procedural bridges)
      this.levelLoader.load(
        generateHybridLevel(seed, { difficulty: this.settings.difficulty }),
      );
      console.log('Loaded hybrid level');
    }

    // Per-level visual theme (sky + scenery + terrain tint).
    this.theme = themeForLevel(this.settings.levelNumber);

    // Decorative parallax background (clouds, hills, bushes)
    this.createBackground();

    // Initialize input manager
    this.inputManager = new InputManager(this);

    // Create players at spawn points
    this.createPlayers();

    // Attach AI controllers to any bot-controlled players
    this.createBots();

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

    // Recolor terrain to the level theme (after all tiles exist).
    this.applyTerrainTint();

    // Music (the level-intro banner is drawn by HudScene).
    audio.startMusic();

    console.log('GameScene created');
  }

  // ---- juice helpers -------------------------------------------------------

  private addScore(points: number, x?: number, y?: number, label?: string): void {
    this.score += points;
    this.registry.set('hud.score', this.score);
    if (x !== undefined && y !== undefined) {
      this.popText(x, y, label ?? `+${points}`, '#ffe892');
    }
  }

  // Floating text that rises and fades (score popups, combos).
  private popText(x: number, y: number, text: string, color: string): void {
    const t = this.add.text(x, y, text, {
      fontSize: '22px',
      color,
      fontStyle: 'bold',
      stroke: '#161325',
      strokeThickness: 4,
    }).setOrigin(0.5).setDepth(150);
    this.tweens.add({
      targets: t,
      y: y - 46,
      alpha: 0,
      duration: 750,
      ease: 'Quad.easeOut',
      onComplete: () => t.destroy(),
    });
  }

  // Burst of stars/dust where an enemy was squashed.
  private poof(x: number, y: number): void {
    if (!this.textures.exists('star')) return;
    const p = this.add.particles(x, y, 'star', {
      speed: { min: 60, max: 180 },
      angle: { min: 200, max: 340 },
      scale: { start: 0.9, end: 0 },
      lifespan: 420,
      gravityY: 500,
      quantity: 7,
      rotate: { min: 0, max: 360 },
      tint: [0xffffff, 0xffe892],
    });
    p.setDepth(20);
    p.explode(7);
    this.time.delayedCall(500, () => p.destroy());
  }

  // Stomp scoring with a short time-window combo for chained bounces.
  private registerStomp(x: number, y: number): void {
    audio.stomp();
    this.poof(x, y);
    this.cameras.main.shake(90, 0.006);

    const now = this.time.now;
    this.combo = (now - this.lastStompTime < 900) ? this.combo + 1 : 1;
    this.lastStompTime = now;

    const points = 100 * this.combo;
    this.addScore(points, x, y - 20, this.combo > 1 ? `${this.combo}x  +${points}` : `+${points}`);
    if (this.combo === 5) {
      this.lives++;
      this.updateLivesUI();
      audio.oneUp();
      this.popText(x, y - 50, '1UP!', '#7CFC6A');
    }
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
        // Patrol enemy: dispatch on type so KOOPA renders/behaves as its own variant instead of
        // falling through to the goomba sprite. KOOPA is a reskinned patrol enemy (KTD15) — same
        // wiring as a goomba, only a distinct texture + slightly faster patrol speed.
        const variant = spawn.type === EnemyType.KOOPA ? 'koopa' : 'goomba';
        const enemy = new Enemy(this, pos.x, pos.y, variant);
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

      this.registerStomp(enemy.x, enemy.y);
    } else {
      // Player got hit - take damage
      const knockbackDir = player.x < enemy.x ? -1 : 1;
      playerBody.setVelocityX(knockbackDir * 200);

      const isDead = player.takeDamage(this.time.now);
      this.updateHealthUI();

      if (isDead) {
        this.loseLife(player, this.players.indexOf(player));
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

      this.registerStomp(bull.x, bull.y);
      this.addScore(150);
    } else {
      // Player got hit - take damage (extra knockback if bull is charging)
      const knockbackDir = player.x < bull.x ? -1 : 1;
      const knockbackForce = bull.isCharging() ? 350 : 200;
      playerBody.setVelocityX(knockbackDir * knockbackForce);

      const isDead = player.takeDamage(this.time.now);
      this.updateHealthUI();

      if (isDead) {
        this.loseLife(player, this.players.indexOf(player));
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
              this.addScore(200, coin.x, coin.y - 10, '+200');
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
      // setupBricks runs after createEnemies and REASSIGNS this.bricks to a fresh array, so the
      // empty array passed at spawn time is stale. Re-hand the live bricks here so charging bulls
      // (level1 AND generator-placed) can actually break bricks.
      bull.setBricks(this.bricks);
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
              this.addScore(1000, powerUp.x, powerUp.y - 16, '+1000');
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
      audio.coin();
      this.addScore(200, coin.x, coin.y - 10, '+200');
      coin.destroy();
    }
  }

  private createExit(): void {
    const exit = this.levelLoader.getExit();
    if (!exit) return;

    const pos = this.levelLoader.gridToPixel(exit.x, exit.y);

    if (exit.type === 'flagpole') {
      // Stand the flagpole ON the ground so it reads as reachable. Scan down from
      // the exit cell to find the surface beneath it.
      const worldH = this.levelLoader.getWorldSize().height;
      let surfaceY = worldH - 64;
      for (let y = pos.y; y < worldH; y += 8) {
        if (this.isSolidAt(pos.x, y)) { surfaceY = y; break; }
      }
      // Flagpole texture is 128 tall with a centered origin; base rests at surface.
      this.exitSprite = this.add.sprite(pos.x, surfaceY - 64, 'flagpole');
      this.exitSprite.setDepth(3);

      // The trigger is a TALL invisible column from the ground up past the end
      // staircase, so a player completes whether they walk into the flag at ground
      // level OR sail off the top of the staircase above it.
      const zoneH = 13 * 32;
      const zone = this.add.rectangle(pos.x, surfaceY - zoneH / 2, 36, zoneH, 0x00ff00, 0);
      this.physics.add.existing(zone, true);
      this.exitTrigger = zone;
    } else {
      this.exitSprite = this.add.sprite(pos.x, pos.y - 16, 'door');
      this.exitSprite.setDepth(3);
      this.physics.add.existing(this.exitSprite, true);
      this.exitTrigger = this.exitSprite;
    }

    // Set up player-exit overlap
    this.players.forEach((player) => {
      this.physics.add.overlap(
        player,
        this.exitTrigger!,
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
      this.registry.set('hud.countdown', this.levelCompleteCountdown);
    }
  }

  private updateLevelCountdown(delta: number): void {
    if (this.levelCompleteCountdown < 0) return;

    this.levelCompleteCountdown -= delta / 1000;
    this.registry.set('hud.countdown', this.levelCompleteCountdown);

    if (this.levelCompleteCountdown <= 0) {
      this.completeLevel();
    }
  }

  private completeLevel(): void {
    // Prevent multiple triggers
    this.levelCompleteCountdown = -1;
    this.registry.set('hud.countdown', -1);
    audio.fanfare();
    if (this.exitTrigger && this.exitTrigger !== this.exitSprite) {
      this.exitTrigger.destroy();
    }
    this.exitTrigger = null;
    if (this.exitSprite) {
      this.exitSprite.destroy();
      this.exitSprite = null;
    }

    // Advance the endless run to the next level.
    this.scene.start('LevelCompleteScene', {
      coins: this.coinCount,
      lives: this.lives,
      settings: this.buildCarrySettings(true),
    });
  }

  private createBackground(): void {
    const { width, height } = this.levelLoader.getWorldSize();
    const groundTop = height - 64; // top of the 2-tile ground band
    const theme = this.theme;
    const skyKey = this.textures.exists(theme.sky) ? theme.sky : 'sky';

    // Sky gradient pinned to the camera (covers the whole view).
    this.add.image(GAME_WIDTH / 2, GAME_HEIGHT / 2, skyKey)
      .setScrollFactor(0).setDepth(-20).setDisplaySize(GAME_WIDTH + 4, GAME_HEIGHT + 4);

    // Sun (slow parallax; hidden at night/in caves).
    if (theme.sunAlpha > 0 && this.textures.exists('sun')) {
      this.add.image(180, 140, 'sun').setScrollFactor(0.08).setDepth(-19).setScale(1.1).setAlpha(theme.sunAlpha);
    }

    // Clouds (far parallax)
    for (let x = 120; x < width; x += 340) {
      const step = Math.floor(x / 340);
      this.add.image(x, 60 + (step % 3) * 46, 'cloud')
        .setScrollFactor(0.35).setDepth(-12).setAlpha(0.95).setTint(theme.cloud)
        .setScale(0.8 + (step % 2) * 0.5);
    }
    // Hills (mid parallax)
    for (let x = 220; x < width; x += 540) {
      this.add.image(x, groundTop, 'hill')
        .setOrigin(0.5, 1).setScrollFactor(0.6).setDepth(-11).setScale(2.6).setTint(theme.hill);
    }
    // Bushes planted on actual ground (near, moves with the world)
    for (let x = 360; x < width; x += 280) {
      if (!this.isSolidAt(x, groundTop + 16)) continue;
      this.add.image(x, groundTop, 'bush')
        .setOrigin(0.5, 1).setScrollFactor(1).setDepth(-10).setTint(theme.bush);
    }
  }

  // Tint the ground + platform tiles to the level's theme (pipes keep their green
  // identity; bricks/blocks/coins keep theirs).
  private applyTerrainTint(): void {
    const tint = this.theme.ground;
    this.levelLoader.getGroundGroup().getChildren().forEach((child) => {
      const s = child as Phaser.Physics.Arcade.Sprite;
      if (s.texture && s.texture.key === 'ground') s.setTint(tint);
    });
    this.levelLoader.getPlatformGroup().getChildren().forEach((child) => {
      (child as Phaser.Physics.Arcade.Sprite).setTint(tint);
    });
  }

  private createBots(): void {
    const exit = this.levelLoader.getExit();
    const worldSize = this.levelLoader.getWorldSize();
    const exitX = exit
      ? this.levelLoader.gridToPixel(exit.x, exit.y).x
      : worldSize.width;

    this.players.forEach((player, index) => {
      if (!this.settings.botMask[index]) {
        this.botControllers[index] = null;
        return;
      }
      this.botControllers[index] = new BotController(player, {
        isSolidAt: (x, y) => this.isSolidAt(x, y),
        getThreats: () => this.getThreats(),
        exitX,
        worldHeight: worldSize.height,
        getLeader: () => this.getHumanLeader(player),
        isInBubble: () => player.getIsInBubble(),
      });
    });
  }

  // The CPU buddy follows the first human player so it never bullies them
  // off-screen. Returns null when there's no human to follow (e.g. bot demo).
  private getHumanLeader(self: Player): Phaser.GameObjects.Components.Transform | null {
    for (let i = 0; i < this.players.length; i++) {
      if (this.settings.botMask[i]) continue;
      const p = this.players[i];
      if (p !== self && p.active) return p;
    }
    return null;
  }

  private getThreats(): Threat[] {
    const out: Threat[] = [];
    for (const e of this.enemies) out.push({ x: e.x, y: e.y, alive: e.isAlive() });
    for (const b of this.bulls) out.push({ x: b.x, y: b.y, alive: b.isAlive() });
    return out;
  }

  // Is there solid level geometry at this world point? Used by the bot to sniff
  // gaps and walls. Queries static physics bodies (ground/platforms/pipes/bricks/
  // question blocks) and ignores the exit sprite.
  private isSolidAt(x: number, y: number): boolean {
    const bodies = this.physics.overlapRect(x - 1, y - 1, 2, 2, false, true) as
      Phaser.Physics.Arcade.Body[];
    for (const b of bodies) {
      if (this.exitTrigger && b.gameObject === this.exitTrigger) continue;
      return true;
    }
    return false;
  }

  private setupCamera(): void {
    const worldSize = this.levelLoader.getWorldSize();
    this.cameras.main.setBounds(0, 0, worldSize.width, worldSize.height);
    this.cameraTarget.set(GAME_WIDTH / 2, GAME_HEIGHT / 2);
  }

  private createUI(): void {
    // The persistent HUD runs as a parallel scene with its own un-zoomed camera,
    // so the gameplay camera's zoom/pan can't distort it. We publish state into
    // the shared registry and HudScene renders it.
    this.publishHud();
    this.scene.launch('HudScene');
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.scene.stop('HudScene'));

    // Debug overlay (dev only, off by default).
    this.debugText = this.add.text(10, 120, '', {
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

    // Mute toggle (M)
    this.input.keyboard?.addKey(Phaser.Input.Keyboard.KeyCodes.M)
      .on('down', () => {
        const muted = audio.toggleMute();
        this.popText(this.cameras.main.midPoint.x, this.cameras.main.midPoint.y - 120,
          muted ? '🔇 Muted' : '🔊 Sound on', '#ffffff');
      });
  }

  // Publish the full HUD state into the shared registry for HudScene to render.
  private publishHud(): void {
    const r = this.registry;
    r.set('hud.lives', this.lives);
    r.set('hud.coins', this.coinCount);
    r.set('hud.score', this.score);
    r.set('hud.level', this.settings.levelNumber);
    r.set('hud.players', this.playerCount);
    r.set('hud.health', this.players.map(p => p.getHealth()));
    // Match each bar to its hero's cap (P1 red, P2 green) for instant ownership.
    r.set('hud.colors', this.players.map((_p, i) => (i === 0 ? 0xe83b32 : 0x39c46a)));
    r.set('hud.countdown', this.levelCompleteCountdown);
  }

  private updateCoinUI(): void {
    this.registry.set('hud.coins', this.coinCount);
  }

  private updateLivesUI(): void {
    this.registry.set('hud.lives', this.lives);
  }

  private updateHealthUI(): void {
    this.registry.set('hud.health', this.players.map(p => p.getHealth()));
  }

  // Snapshot the running state to carry into the next scene (level / game over).
  private buildCarrySettings(advanceLevel: boolean): GameSettings {
    const playerStates: PlayerState[] = this.players.map(p => ({
      health: p.getHealth(),
      isPoweredUp: p.getIsPoweredUp(),
    }));
    return {
      ...this.settings,
      botMask: this.settings.botMask.slice(),
      lives: this.lives,
      coins: this.coinCount,
      score: this.score,
      playerStates,
      levelNumber: this.settings.levelNumber + (advanceLevel ? 1 : 0),
    };
  }

  private repositionToSpawn(player: Player, index: number): void {
    const spawns = this.levelLoader.getPlayerSpawns();
    const spawn = spawns[index] || spawns[0];
    const pos = this.levelLoader.gridToPixel(spawn.x, spawn.y);
    player.setPosition(pos.x, pos.y);
    (player.body as Phaser.Physics.Arcade.Body).setVelocity(0, 0);
    if (player.getIsInBubble()) player.exitBubble();
  }

  private loseLife(player: Player, index: number): void {
    this.lives--;
    this.updateLivesUI();
    audio.die();

    if (this.lives <= 0) {
      this.scene.start('GameOverScene', {
        coins: this.coinCount,
        settings: this.buildCarrySettings(false),
      });
      return;
    }

    player.resetHealth();
    this.repositionToSpawn(player, index);
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
      const bot = this.botControllers[index];
      const input = bot ? bot.getInput(time) : this.inputManager.getInput(index);

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
      if (!player.active || player.getIsInBubble()) return;
      if (player.y <= deathY) return;

      // Forgiving co-op: if a partner is still in play, the fallen player pops
      // back in a bubble right next to them — no life lost (classic NSMB rescue).
      const anchor = this.findRescueAnchor(player);
      if (anchor) {
        player.setPosition(anchor.x, anchor.y - 90);
        (player.body as Phaser.Physics.Arcade.Body).setVelocity(0, 0);
        player.enterBubble();
      } else {
        // Solo, or everyone is down — costs a life.
        this.loseLife(player, index);
      }
    });
  }

  // A partner that can rescue a fallen player: alive, on-screen (not fallen),
  // not bubbled, and not already finished.
  private findRescueAnchor(self: Player): Player | null {
    const deathY = this.levelLoader.getWorldSize().height + 100;
    for (const p of this.players) {
      if (p === self || !p.active) continue;
      if (p.getIsInBubble() || this.playersFinished.has(p)) continue;
      if (p.y > deathY) continue;
      return p;
    }
    return null;
  }

  // Players who are live and on the field: active, not bubbled, not finished.
  // Used for camera follow and as bubble-rescue seek targets so we never track a
  // frozen player parked at the exit flag.
  private livePlayers(): Player[] {
    return this.players.filter(
      p => p.active && !p.getIsInBubble() && !this.playersFinished.has(p),
    );
  }

  private updateBubbleTargets(): void {
    const live = this.livePlayers();
    const bubbledPlayers = this.players.filter(p => p.getIsInBubble());

    if (live.length > 0 && bubbledPlayers.length > 0) {
      const target = new Phaser.Math.Vector2(live[0].x, live[0].y);
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
    let targetX = 0;
    let targetY = 0;
    let count = 0;
    let minX = Infinity;
    let maxX = -Infinity;

    // Follow the live players; fall back to all of them if none are live yet.
    const live = this.livePlayers();
    const playersToFollow = live.length > 0 ? live : this.players;

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
