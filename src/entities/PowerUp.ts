import Phaser from 'phaser';

const POWERUP_SPEED = 100;

export class PowerUp extends Phaser.Physics.Arcade.Sprite {
  private collected: boolean = false;

  constructor(scene: Phaser.Scene, x: number, y: number, moveDirection: number = 1) {
    super(scene, x, y, 'mushroom');

    scene.add.existing(this);
    scene.physics.add.existing(this);

    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setCollideWorldBounds(false); // Can fall out of world
    body.setSize(28, 28);
    body.setOffset(2, 2);
    body.setBounce(0, 0);
    body.setAllowGravity(true);

    // Move in the specified direction
    body.setVelocityX(POWERUP_SPEED * moveDirection);

    this.setDepth(5);
  }

  update(): void {
    // Guard against missing body
    if (!this.body) return;

    const body = this.body as Phaser.Physics.Arcade.Body;

    // Bounce off walls
    if (body.blocked.left) {
      body.setVelocityX(POWERUP_SPEED);
    } else if (body.blocked.right) {
      body.setVelocityX(-POWERUP_SPEED);
    }
  }

  collect(): boolean {
    if (this.collected) return false;

    this.collected = true;

    // Quick scale-up effect before destroying
    this.scene.tweens.add({
      targets: this,
      scaleX: 1.5,
      scaleY: 1.5,
      alpha: 0,
      duration: 200,
      ease: 'Quad.easeOut',
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
