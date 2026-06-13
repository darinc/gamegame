import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT } from '../config';
import { buildSettings, DEFAULT_SETTINGS } from '../settings';
import type { GameSettings } from '../settings';

interface LevelCompleteData {
  coins: number;
  lives: number;
  settings: GameSettings;
}

export class LevelCompleteScene extends Phaser.Scene {
  private coins: number = 0;
  private lives: number = 0;
  private settings: GameSettings = DEFAULT_SETTINGS;
  private canContinue: boolean = false;

  constructor() {
    super({ key: 'LevelCompleteScene' });
  }

  init(data: LevelCompleteData): void {
    this.coins = data.coins || 0;
    this.lives = data.lives || 0;
    this.settings = data.settings ? buildSettings(data.settings) : buildSettings({});
  }

  create(): void {
    this.canContinue = false;

    // Green overlay
    this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x0d5a2a, 0.88);

    // Confetti rain
    if (this.textures.exists('star')) {
      this.add.particles(0, -20, 'star', {
        x: { min: 0, max: GAME_WIDTH },
        y: -20,
        quantity: 2,
        frequency: 90,
        lifespan: 3200,
        speedY: { min: 120, max: 260 },
        speedX: { min: -40, max: 40 },
        scale: { start: 1.1, end: 0.4 },
        rotate: { min: 0, max: 360 },
        tint: [0xffd23f, 0xff6b6b, 0x39c46a, 0x4f8ef7, 0xffffff],
      }).setDepth(1);
    }

    // The two heroes celebrating at the bottom.
    [['player1', GAME_WIDTH / 2 - 70], ['player2', GAME_WIDTH / 2 + 70]].forEach(([key, x], i) => {
      if (!this.textures.exists(key as string)) return;
      const hero = this.add.sprite(x as number, GAME_HEIGHT - 110, key as string).setScale(2.4).setDepth(5);
      const walk = key === 'player1' ? 'p1-walk' : 'p2-walk';
      if (this.anims.exists(walk)) hero.play(walk);
      this.tweens.add({
        targets: hero, y: hero.y - 26, duration: 360, yoyo: true, repeat: -1,
        delay: i * 180, ease: 'Sine.easeOut',
      });
    });

    // Level Complete text (shows which level was just cleared)
    const cleared = Math.max(1, this.settings.levelNumber - 1);
    const completeText = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2 - 100, `LEVEL ${cleared} COMPLETE!`, {
      fontSize: '56px',
      color: '#44FF44',
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 6,
    });
    completeText.setOrigin(0.5);

    // Celebration effect
    this.tweens.add({
      targets: completeText,
      scaleX: 1.1,
      scaleY: 1.1,
      duration: 300,
      yoyo: true,
      repeat: -1,
    });

    // Stats
    const scoreText = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2 - 26, `Score: ${this.settings.score}`, {
      fontSize: '34px',
      color: '#ffffff',
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 5,
    });
    scoreText.setOrigin(0.5);

    const coinsText = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2 + 22, `Coins: ${this.coins}     Lives: ${this.lives}`, {
      fontSize: '26px',
      color: '#FFD700',
      stroke: '#000000',
      strokeThickness: 4,
    });
    coinsText.setOrigin(0.5);

    // Continue prompt
    const continueText = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2 + 100, `Press JUMP for Level ${this.settings.levelNumber}`, {
      fontSize: '24px',
      color: '#ffffff',
      stroke: '#000000',
      strokeThickness: 3,
    });
    continueText.setOrigin(0.5);

    // Blink effect
    this.tweens.add({
      targets: continueText,
      alpha: 0.3,
      duration: 500,
      yoyo: true,
      repeat: -1,
    });

    // Setup keyboard input using scene-level keydown event
    this.input.keyboard?.on('keydown', (event: KeyboardEvent) => {
      if (!this.canContinue) return;

      // Accept: Space, Enter, W (P1 jump), Up Arrow (P2 jump)
      if (event.code === 'Space' || event.code === 'Enter' ||
          event.code === 'KeyW' || event.code === 'ArrowUp') {
        this.continueGame();
      }
    });

    // Small delay to prevent accidental skip
    this.time.delayedCall(500, () => {
      this.canContinue = true;
    });

    // Bot demo (no humans): auto-advance so the show goes on.
    const allBots = this.settings.botMask
      .slice(0, this.settings.playerCount)
      .every(Boolean);
    if (allBots) {
      this.time.delayedCall(2500, () => this.continueGame());
    }
  }

  update(): void {
    if (!this.canContinue) return;

    // Check gamepad jump button (button 0)
    if (this.input.gamepad) {
      const gamepads = this.input.gamepad.gamepads;
      for (const pad of gamepads) {
        if (pad && pad.buttons[0] && pad.buttons[0].pressed) {
          this.continueGame();
          return;
        }
      }
    }
  }

  private continueGame(): void {
    this.canContinue = false; // Prevent double-trigger
    this.scene.start('GameScene', this.settings);
  }
}
