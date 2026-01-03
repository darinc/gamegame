import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT } from '../config';

interface GameOverData {
  coins: number;
}

export class GameOverScene extends Phaser.Scene {
  private coins: number = 0;
  private canRestart: boolean = false;

  constructor() {
    super({ key: 'GameOverScene' });
  }

  init(data: GameOverData): void {
    this.coins = data.coins || 0;
  }

  create(): void {
    this.canRestart = false;

    // Dark overlay
    this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x000000, 0.8);

    // Game Over text
    const gameOverText = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2 - 80, 'GAME OVER', {
      fontSize: '64px',
      color: '#FF4444',
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 6,
    });
    gameOverText.setOrigin(0.5);

    // Stats
    const statsText = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2, `Coins collected: ${this.coins}`, {
      fontSize: '32px',
      color: '#FFD700',
      stroke: '#000000',
      strokeThickness: 4,
    });
    statsText.setOrigin(0.5);

    // Restart prompt
    const restartText = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2 + 80, 'Press JUMP to restart', {
      fontSize: '24px',
      color: '#ffffff',
      stroke: '#000000',
      strokeThickness: 3,
    });
    restartText.setOrigin(0.5);

    // Blink effect
    this.tweens.add({
      targets: restartText,
      alpha: 0.3,
      duration: 500,
      yoyo: true,
      repeat: -1,
    });

    // Setup keyboard input using scene-level keydown event
    this.input.keyboard?.on('keydown', (event: KeyboardEvent) => {
      if (!this.canRestart) return;

      // Accept: Space, Enter, W (P1 jump), Up Arrow (P2 jump)
      if (event.code === 'Space' || event.code === 'Enter' ||
          event.code === 'KeyW' || event.code === 'ArrowUp') {
        this.restartGame();
      }
    });

    // Small delay to prevent accidental restart
    this.time.delayedCall(500, () => {
      this.canRestart = true;
    });
  }

  update(): void {
    if (!this.canRestart) return;

    // Check gamepad jump button (button 0)
    if (this.input.gamepad) {
      const gamepads = this.input.gamepad.gamepads;
      for (const pad of gamepads) {
        if (pad && pad.buttons[0] && pad.buttons[0].pressed) {
          this.restartGame();
          return;
        }
      }
    }
  }

  private restartGame(): void {
    this.canRestart = false; // Prevent double-trigger
    this.scene.start('GameScene');
  }
}
