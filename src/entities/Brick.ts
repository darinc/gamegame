import Phaser from 'phaser';
import { audio } from '../systems/AudioSynth';

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
    audio.brick();

    // Create break particles
    const particles = this.scene.add.particles(this.x, this.y, 'brick', {
      speed: { min: 100, max: 240 },
      angle: { min: 200, max: 340 },
      scale: { start: 0.45, end: 0 },
      lifespan: 600,
      gravityY: 900,
      rotate: { min: 0, max: 360 },
      quantity: 8,
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
