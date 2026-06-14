import Phaser from 'phaser';

export interface BlockActivationResult {
  x: number;
  y: number;
  isPowerUp: boolean;
}

export class QuestionBlock extends Phaser.Physics.Arcade.Sprite {
  private activated: boolean = false;
  private containsPowerUp: boolean = false;

  // Contents are decided at generation time and passed in (KTD4), not rolled here — so the
  // same seed yields the same blocks and reachability reasoning can depend on power-ups.
  constructor(scene: Phaser.Scene, x: number, y: number, containsPowerUp: boolean = false) {
    super(scene, x, y, 'question');

    scene.add.existing(this);
    scene.physics.add.existing(this, true); // Static body

    this.setOrigin(0.5, 0.5);
    this.setDepth(2);

    this.containsPowerUp = containsPowerUp;
  }

  activate(fromAbove: boolean = false): BlockActivationResult | null {
    if (this.activated) return null;
    this.activated = true;

    // Change appearance to "used" block (darker)
    this.setTint(0x888888);

    // Bump animation (direction depends on hit direction)
    const originalY = this.y;
    const bumpDirection = fromAbove ? 8 : -8;
    this.scene.tweens.add({
      targets: this,
      y: originalY + bumpDirection,
      duration: 80,
      yoyo: true,
      ease: 'Quad.easeOut',
    });

    // Return position and type for spawn
    // Spawn below block if hit from above (ground pound), above if hit from below (head bump)
    return {
      x: this.x,
      y: fromAbove ? this.y + 32 : this.y - 32,
      isPowerUp: this.containsPowerUp,
    };
  }

  isActivated(): boolean {
    return this.activated;
  }
}
