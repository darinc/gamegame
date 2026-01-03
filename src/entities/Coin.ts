import Phaser from 'phaser';

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

    // Quick collect animation - scale up and fade
    this.scene.tweens.add({
      targets: this,
      scaleX: 1.5,
      scaleY: 1.5,
      alpha: 0,
      y: this.y - 20,
      duration: 200,
      onComplete: () => {
        this.destroy();
      },
    });

    return true;
  }

  isCollected(): boolean {
    return this.collected;
  }
}
