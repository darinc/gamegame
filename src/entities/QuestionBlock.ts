import Phaser from 'phaser';

const POWERUP_CHANCE = 0.25; // 25% chance to contain a power-up

export interface BlockActivationResult {
  x: number;
  y: number;
  isPowerUp: boolean;
}

export class QuestionBlock extends Phaser.Physics.Arcade.Sprite {
  private activated: boolean = false;
  private containsPowerUp: boolean = false;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y, 'question');

    scene.add.existing(this);
    scene.physics.add.existing(this, true); // Static body

    this.setOrigin(0.5, 0.5);
    this.setDepth(2);

    // Randomly determine if this block contains a power-up
    this.containsPowerUp = Math.random() < POWERUP_CHANCE;
  }

  activate(): BlockActivationResult | null {
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

    // Return position and type for spawn (above the block)
    return {
      x: this.x,
      y: this.y - 32,
      isPowerUp: this.containsPowerUp,
    };
  }

  isActivated(): boolean {
    return this.activated;
  }
}
