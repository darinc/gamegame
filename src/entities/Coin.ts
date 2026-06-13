import Phaser from 'phaser';
import { audio } from '../systems/AudioSynth';

export class Coin extends Phaser.Physics.Arcade.Sprite {
  private collected: boolean = false;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y, 'coin');

    scene.add.existing(this);
    scene.physics.add.existing(this);

    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setAllowGravity(false);
    body.setImmovable(true);
    body.setSize(24, 24);

    this.setDepth(4);

    // Spinning shimmer
    if (scene.anims.exists('coin-spin')) this.play('coin-spin');

    // Floating animation
    scene.tweens.add({
      targets: this,
      y: y - 6,
      duration: 800,
      ease: 'Sine.easeInOut',
      yoyo: true,
      repeat: -1,
    });
  }

  collect(): boolean {
    if (this.collected) return false;

    this.collected = true;
    audio.coin();
    this.sparkle();

    // Quick collect animation - scale up and fade
    this.scene.tweens.add({
      targets: this,
      scaleX: 1.6,
      scaleY: 1.6,
      alpha: 0,
      y: this.y - 24,
      duration: 220,
      onComplete: () => {
        this.destroy();
      },
    });

    return true;
  }

  private sparkle(): void {
    if (!this.scene.textures.exists('spark')) return;
    const p = this.scene.add.particles(this.x, this.y, 'spark', {
      speed: { min: 40, max: 140 },
      angle: { min: 0, max: 360 },
      scale: { start: 1, end: 0 },
      lifespan: 360,
      quantity: 6,
      tint: [0xffe892, 0xffffff],
    });
    p.setDepth(this.depth + 1);
    p.explode(6);
    this.scene.time.delayedCall(420, () => p.destroy());
  }

  isCollected(): boolean {
    return this.collected;
  }
}
