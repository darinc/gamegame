import Phaser from 'phaser';

export class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: 'BootScene' });
  }

  preload(): void {
    // Show loading progress
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;

    const progressBar = this.add.graphics();
    const progressBox = this.add.graphics();
    progressBox.fillStyle(0x222222, 0.8);
    progressBox.fillRect(width / 2 - 160, height / 2 - 25, 320, 50);

    const loadingText = this.add.text(width / 2, height / 2 - 50, 'Loading...', {
      fontSize: '20px',
      color: '#ffffff',
    });
    loadingText.setOrigin(0.5, 0.5);

    this.load.on('progress', (value: number) => {
      progressBar.clear();
      progressBar.fillStyle(0x88ff88, 1);
      progressBar.fillRect(width / 2 - 150, height / 2 - 15, 300 * value, 30);
    });

    this.load.on('complete', () => {
      progressBar.destroy();
      progressBox.destroy();
      loadingText.destroy();
    });

    // Generate placeholder sprites programmatically
    this.createPlaceholderSprites();
  }

  create(): void {
    console.log('BootScene complete, starting GameScene');
    this.scene.start('GameScene');
  }

  private createPlaceholderSprites(): void {
    // Player 1 sprite (orange)
    const player1Graphics = this.make.graphics({ x: 0, y: 0 });
    player1Graphics.fillStyle(0xFF8C00); // Dark orange
    player1Graphics.fillRoundedRect(0, 0, 32, 48, 4);
    player1Graphics.fillStyle(0xffffff);
    player1Graphics.fillCircle(10, 12, 4); // Left eye
    player1Graphics.fillCircle(22, 12, 4); // Right eye
    player1Graphics.generateTexture('player1', 32, 48);
    player1Graphics.destroy();

    // Player 2 sprite (green)
    const player2Graphics = this.make.graphics({ x: 0, y: 0 });
    player2Graphics.fillStyle(0x44ff88);
    player2Graphics.fillRoundedRect(0, 0, 32, 48, 4);
    player2Graphics.fillStyle(0xffffff);
    player2Graphics.fillCircle(10, 12, 4);
    player2Graphics.fillCircle(22, 12, 4);
    player2Graphics.generateTexture('player2', 32, 48);
    player2Graphics.destroy();

    // Ground tile (brown)
    const groundGraphics = this.make.graphics({ x: 0, y: 0 });
    groundGraphics.fillStyle(0x8B4513);
    groundGraphics.fillRect(0, 0, 32, 32);
    groundGraphics.lineStyle(2, 0x654321);
    groundGraphics.strokeRect(0, 0, 32, 32);
    groundGraphics.fillStyle(0x228B22);
    groundGraphics.fillRect(0, 0, 32, 8); // Grass top
    groundGraphics.generateTexture('ground', 32, 32);
    groundGraphics.destroy();

    // Bubble sprite (for when player gets too far)
    const bubbleGraphics = this.make.graphics({ x: 0, y: 0 });
    bubbleGraphics.fillStyle(0xffffff, 0.3);
    bubbleGraphics.fillCircle(24, 24, 24);
    bubbleGraphics.lineStyle(2, 0xffffff, 0.6);
    bubbleGraphics.strokeCircle(24, 24, 24);
    bubbleGraphics.generateTexture('bubble', 48, 48);
    bubbleGraphics.destroy();

    // Brick tile (orange/brown)
    const brickGraphics = this.make.graphics({ x: 0, y: 0 });
    brickGraphics.fillStyle(0xD2691E);
    brickGraphics.fillRect(0, 0, 32, 32);
    brickGraphics.lineStyle(2, 0x8B4513);
    brickGraphics.strokeRect(0, 0, 32, 32);
    brickGraphics.lineStyle(1, 0x8B4513);
    brickGraphics.lineBetween(16, 0, 16, 32);
    brickGraphics.lineBetween(0, 16, 32, 16);
    brickGraphics.generateTexture('brick', 32, 32);
    brickGraphics.destroy();

    // Question block (yellow with ?)
    const questionGraphics = this.make.graphics({ x: 0, y: 0 });
    questionGraphics.fillStyle(0xFFD700);
    questionGraphics.fillRect(0, 0, 32, 32);
    questionGraphics.lineStyle(2, 0xDAA520);
    questionGraphics.strokeRect(0, 0, 32, 32);
    questionGraphics.generateTexture('question', 32, 32);
    questionGraphics.destroy();

    // Spike tile (red triangles)
    const spikeGraphics = this.make.graphics({ x: 0, y: 0 });
    spikeGraphics.fillStyle(0xFF4444);
    spikeGraphics.fillTriangle(0, 32, 16, 0, 32, 32);
    spikeGraphics.lineStyle(2, 0xAA0000);
    spikeGraphics.strokeTriangle(0, 32, 16, 0, 32, 32);
    spikeGraphics.generateTexture('spike', 32, 32);
    spikeGraphics.destroy();

    // Goomba enemy (brown mushroom-like)
    const goombaGraphics = this.make.graphics({ x: 0, y: 0 });
    goombaGraphics.fillStyle(0x8B4513);
    goombaGraphics.fillRoundedRect(2, 8, 28, 24, 6);
    goombaGraphics.fillStyle(0xDEB887);
    goombaGraphics.fillRect(6, 24, 8, 8); // Left foot
    goombaGraphics.fillRect(18, 24, 8, 8); // Right foot
    goombaGraphics.fillStyle(0xffffff);
    goombaGraphics.fillCircle(10, 16, 4); // Left eye
    goombaGraphics.fillCircle(22, 16, 4); // Right eye
    goombaGraphics.fillStyle(0x000000);
    goombaGraphics.fillCircle(11, 16, 2); // Left pupil
    goombaGraphics.fillCircle(23, 16, 2); // Right pupil
    goombaGraphics.generateTexture('goomba', 32, 32);
    goombaGraphics.destroy();

    // Coin (yellow circle with shine)
    const coinGraphics = this.make.graphics({ x: 0, y: 0 });
    coinGraphics.fillStyle(0xFFD700);
    coinGraphics.fillCircle(16, 16, 12);
    coinGraphics.lineStyle(2, 0xDAA520);
    coinGraphics.strokeCircle(16, 16, 12);
    coinGraphics.fillStyle(0xFFFF00, 0.5);
    coinGraphics.fillCircle(12, 12, 4); // Shine
    coinGraphics.generateTexture('coin', 32, 32);
    coinGraphics.destroy();

    // Flagpole (tall pole with flag)
    const flagpoleGraphics = this.make.graphics({ x: 0, y: 0 });
    // Pole
    flagpoleGraphics.fillStyle(0x888888);
    flagpoleGraphics.fillRect(14, 0, 4, 128);
    // Ball on top
    flagpoleGraphics.fillStyle(0xFFD700);
    flagpoleGraphics.fillCircle(16, 6, 6);
    // Flag
    flagpoleGraphics.fillStyle(0x00AA00);
    flagpoleGraphics.fillTriangle(18, 10, 18, 40, 48, 25);
    flagpoleGraphics.generateTexture('flagpole', 48, 128);
    flagpoleGraphics.destroy();

    // Door
    const doorGraphics = this.make.graphics({ x: 0, y: 0 });
    doorGraphics.fillStyle(0x8B4513);
    doorGraphics.fillRect(0, 0, 32, 64);
    doorGraphics.lineStyle(3, 0x654321);
    doorGraphics.strokeRect(2, 2, 28, 60);
    doorGraphics.fillStyle(0xFFD700);
    doorGraphics.fillCircle(24, 32, 3); // Door knob
    doorGraphics.generateTexture('door', 32, 64);
    doorGraphics.destroy();

    // Pipe (green SMB-style pipe)
    const pipeGraphics = this.make.graphics({ x: 0, y: 0 });
    // Main body (darker green)
    pipeGraphics.fillStyle(0x228B22);
    pipeGraphics.fillRect(0, 0, 32, 32);
    // Left highlight
    pipeGraphics.fillStyle(0x32CD32);
    pipeGraphics.fillRect(2, 0, 6, 32);
    // Right shadow
    pipeGraphics.fillStyle(0x006400);
    pipeGraphics.fillRect(26, 0, 4, 32);
    // Border
    pipeGraphics.lineStyle(1, 0x004400);
    pipeGraphics.strokeRect(0, 0, 32, 32);
    pipeGraphics.generateTexture('pipe', 32, 32);
    pipeGraphics.destroy();

    // Pipe top (slightly wider lip)
    const pipeTopGraphics = this.make.graphics({ x: 0, y: 0 });
    pipeTopGraphics.fillStyle(0x228B22);
    pipeTopGraphics.fillRect(0, 4, 32, 28);
    // Top lip extends slightly
    pipeTopGraphics.fillStyle(0x32CD32);
    pipeTopGraphics.fillRect(0, 0, 32, 8);
    pipeTopGraphics.fillStyle(0x228B22);
    pipeTopGraphics.fillRect(2, 2, 28, 4);
    // Highlight
    pipeTopGraphics.fillStyle(0x32CD32);
    pipeTopGraphics.fillRect(2, 8, 6, 24);
    // Shadow
    pipeTopGraphics.fillStyle(0x006400);
    pipeTopGraphics.fillRect(26, 8, 4, 24);
    pipeTopGraphics.lineStyle(1, 0x004400);
    pipeTopGraphics.strokeRect(0, 0, 32, 32);
    pipeTopGraphics.generateTexture('pipe_top', 32, 32);
    pipeTopGraphics.destroy();

    // Platform tile (for floating platforms - lighter brown)
    const platformGraphics = this.make.graphics({ x: 0, y: 0 });
    platformGraphics.fillStyle(0xCD853F);
    platformGraphics.fillRect(0, 0, 32, 32);
    platformGraphics.lineStyle(2, 0x8B4513);
    platformGraphics.strokeRect(0, 0, 32, 32);
    platformGraphics.fillStyle(0xDEB887);
    platformGraphics.fillRect(2, 2, 28, 6); // Top highlight
    platformGraphics.generateTexture('platform', 32, 32);
    platformGraphics.destroy();
  }
}
