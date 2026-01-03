import Phaser from 'phaser';

export class Brick extends Phaser.Physics.Arcade.Sprite {
  private broken: boolean = false;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y, 'brick');

    scene.add.existing(this);
    scene.physics.add.existing(this, true); // Static body

    this.setOrigin(0.5, 0.5);
    this.setDepth(2);
  }

  break(): void {
    if (this.broken) return;
    this.broken = true;

    // Create break particles
    const particles = this.scene.add.particles(this.x, this.y, 'brick', {
      speed: { min: 100, max: 200 },
      angle: { min: 220, max: 320 },
      scale: { start: 0.4, end: 0 },
      lifespan: 500,
      gravityY: 800,
      quantity: 6,
    });

    // Stop emitting after burst
    this.scene.time.delayedCall(50, () => {
      particles.stop();
    });

    // Clean up particles
    this.scene.time.delayedCall(600, () => {
      particles.destroy();
    });

    // Destroy the brick
    this.destroy();
  }

  isBroken(): boolean {
    return this.broken;
  }
}
