import Phaser from 'phaser';

export class QuestionBlock extends Phaser.Physics.Arcade.Sprite {
  private activated: boolean = false;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y, 'question');

    scene.add.existing(this);
    scene.physics.add.existing(this, true); // Static body

    this.setOrigin(0.5, 0.5);
    this.setDepth(2);
  }

  activate(): { x: number; y: number } | null {
    if (this.activated) return null;
    this.activated = true;

    // Change appearance to "used" block (darker)
    this.setTint(0x888888);

    // Bump animation
    const originalY = this.y;
    this.scene.tweens.add({
      targets: this,
      y: originalY - 8,
      duration: 80,
      yoyo: true,
      ease: 'Quad.easeOut',
    });

    // Return position for coin spawn (above the block)
    return { x: this.x, y: this.y - 32 };
  }

  isActivated(): boolean {
    return this.activated;
  }
}
