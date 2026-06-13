import Phaser from 'phaser';
import { GAME_WIDTH } from '../config';

// HUD overlay rendered in its own scene so it is immune to the gameplay camera's
// zoom/pan. GameScene publishes state into the shared registry; this scene polls
// it each frame and draws the readouts, health bars, and transient banners.
//
// Registry contract (all under the `hud.` prefix):
//   hud.lives, hud.coins, hud.score, hud.level, hud.players (numbers)
//   hud.health  -> number[] per player (0..1)
//   hud.countdown -> seconds remaining, or -1 when hidden
//   hud.colors  -> number[] health-bar colors per player
export class HudScene extends Phaser.Scene {
  private coinText!: Phaser.GameObjects.Text;
  private scoreText!: Phaser.GameObjects.Text;
  private livesText!: Phaser.GameObjects.Text;
  private levelText!: Phaser.GameObjects.Text;
  private countdownText!: Phaser.GameObjects.Text;
  private healthBars: Phaser.GameObjects.Graphics[] = [];
  private lastLevel = -1;

  constructor() {
    super({ key: 'HudScene' });
  }

  create(): void {
    this.healthBars = [];

    this.livesText = this.add.text(20, 18, '', {
      fontSize: '24px', color: '#FF6B6B', fontStyle: 'bold', stroke: '#000000', strokeThickness: 4,
    }).setDepth(100);

    this.coinText = this.add.text(GAME_WIDTH - 20, 16, '', {
      fontSize: '24px', color: '#FFD23F', fontStyle: 'bold', stroke: '#000000', strokeThickness: 4,
    }).setOrigin(1, 0).setDepth(100);

    this.scoreText = this.add.text(GAME_WIDTH - 20, 48, '', {
      fontSize: '22px', color: '#ffffff', fontStyle: 'bold', stroke: '#000000', strokeThickness: 4,
    }).setOrigin(1, 0).setDepth(100);

    this.levelText = this.add.text(GAME_WIDTH / 2, 46, '', {
      fontSize: '22px', color: '#ffffff', fontStyle: 'bold', stroke: '#000000', strokeThickness: 4,
    }).setOrigin(0.5, 0).setDepth(100);

    this.countdownText = this.add.text(GAME_WIDTH / 2, 86, '', {
      fontSize: '40px', color: '#FFD23F', fontStyle: 'bold', stroke: '#000000', strokeThickness: 6,
    }).setOrigin(0.5).setDepth(100);

    const players = (this.registry.get('hud.players') as number) ?? 1;
    for (let i = 0; i < players; i++) {
      this.healthBars.push(this.add.graphics().setDepth(100));
    }

    this.render();
    this.showLevelBanner();
  }

  update(): void {
    this.render();
    const level = (this.registry.get('hud.level') as number) ?? 1;
    if (level !== this.lastLevel) this.showLevelBanner();
  }

  private render(): void {
    const lives = (this.registry.get('hud.lives') as number) ?? 0;
    const coins = (this.registry.get('hud.coins') as number) ?? 0;
    const score = (this.registry.get('hud.score') as number) ?? 0;
    const level = (this.registry.get('hud.level') as number) ?? 1;
    const health = (this.registry.get('hud.health') as number[]) ?? [];
    const colors = (this.registry.get('hud.colors') as number[]) ?? [];
    const countdown = (this.registry.get('hud.countdown') as number) ?? -1;

    this.livesText.setText(`Lives: ${lives}`);
    this.coinText.setText(`Coins: ${coins}`);
    this.scoreText.setText(`Score: ${score}`);
    this.levelText.setText(`Level ${level}`);

    if (countdown >= 0) {
      this.countdownText.setText(`Hurry! ${Math.ceil(countdown)}`).setVisible(true);
    } else {
      this.countdownText.setVisible(false);
    }

    const barWidth = 100;
    const barHeight = 12;
    const count = this.healthBars.length;
    const startX = GAME_WIDTH / 2 - (count * (barWidth + 20)) / 2 + 10;
    const startY = 18;
    this.healthBars.forEach((bar, i) => {
      const x = startX + i * (barWidth + 20);
      bar.clear();
      bar.fillStyle(0x222433);
      bar.fillRect(x, startY, barWidth, barHeight);
      bar.fillStyle(colors[i] ?? 0xffffff);
      bar.fillRect(x, startY, barWidth * Math.max(0, health[i] ?? 0), barHeight);
      bar.lineStyle(2, 0xffffff);
      bar.strokeRect(x, startY, barWidth, barHeight);
    });
  }

  private showLevelBanner(): void {
    const level = (this.registry.get('hud.level') as number) ?? 1;
    this.lastLevel = level;
    const banner = this.add.text(GAME_WIDTH / 2, 300, `LEVEL ${level}`, {
      fontSize: '64px', color: '#ffffff', fontStyle: 'bold', stroke: '#161325', strokeThickness: 8,
    }).setOrigin(0.5).setDepth(200).setScale(0.6).setAlpha(0);

    this.tweens.add({
      targets: banner,
      alpha: 1,
      scale: 1,
      duration: 280,
      ease: 'Back.easeOut',
      yoyo: true,
      hold: 700,
      onComplete: () => banner.destroy(),
    });
  }
}
