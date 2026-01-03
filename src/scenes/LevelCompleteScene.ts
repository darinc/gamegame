import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT } from '../config';

interface LevelCompleteData {
  coins: number;
  lives: number;
}

export class LevelCompleteScene extends Phaser.Scene {
  private coins: number = 0;
  private lives: number = 0;
  private canContinue: boolean = false;

  constructor() {
    super({ key: 'LevelCompleteScene' });
  }

  init(data: LevelCompleteData): void {
    this.coins = data.coins || 0;
    this.lives = data.lives || 0;
  }

  create(): void {
    this.canContinue = false;

    // Green overlay
    this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x004400, 0.8);

    // Level Complete text
    const completeText = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2 - 100, 'LEVEL COMPLETE!', {
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
    const coinsText = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2 - 20, `Coins: ${this.coins}`, {
      fontSize: '32px',
      color: '#FFD700',
      stroke: '#000000',
      strokeThickness: 4,
    });
    coinsText.setOrigin(0.5);

    const livesText = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2 + 30, `Lives remaining: ${this.lives}`, {
      fontSize: '32px',
      color: '#FF4444',
      stroke: '#000000',
      strokeThickness: 4,
    });
    livesText.setOrigin(0.5);

    // Continue prompt
    const continueText = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2 + 100, 'Press JUMP to continue', {
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
    this.scene.start('GameScene');
  }
}
