import Phaser from 'phaser';

const LEDGE_CHECK_DISTANCE = 20; // How far ahead to check for ground

// Patrol variants. Koopa is a RESKINNED patrol enemy (KTD15) — distinct texture + a slightly
// faster patrol so it reads as its own threat — NOT a shell-kick enemy (that is deferred).
export type EnemyVariant = 'goomba' | 'koopa';

// Per-variant patrol speed (px/s). Keeping this a plain map (not branching constants) makes the
// behavioral distinction a single source of truth that a unit test can assert in Node.
export const VARIANT_SPEED: Record<EnemyVariant, number> = {
  goomba: 60,
  koopa: 75,
};

export const EnemyState = {
  WALKING: 'walking',
  STOMPED: 'stomped',
  DEAD: 'dead',
} as const;

export type EnemyState = typeof EnemyState[keyof typeof EnemyState];

export class Enemy extends Phaser.Physics.Arcade.Sprite {
  private enemyState: EnemyState = EnemyState.WALKING;
  private walkDirection: number = -1; // -1 = left, 1 = right
  private stompedTime: number = 0;
  private readonly STOMPED_DURATION = 500; // ms before disappearing
  private groundGroup: Phaser.Physics.Arcade.StaticGroup | null = null;
  private readonly speed: number;

  constructor(scene: Phaser.Scene, x: number, y: number, variant: EnemyVariant = 'goomba') {
    super(scene, x, y, variant);

    this.speed = VARIANT_SPEED[variant];

    scene.add.existing(this);
    scene.physics.add.existing(this);

    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setCollideWorldBounds(false); // Allow falling off edges for death check
    body.setSize(28, 28);
    body.setOffset(2, 4);

    // Start moving
    body.setVelocityX(this.speed * this.walkDirection);

    this.setDepth(5);

    const walkAnim = `${variant}-walk`;
    if (scene.anims.exists(walkAnim)) this.play(walkAnim);
  }

  setGroundGroup(group: Phaser.Physics.Arcade.StaticGroup): void {
    this.groundGroup = group;
  }

  update(time: number, _delta: number): void {
    // Guard against missing body (destroyed or during scene transition)
    if (!this.body) return;

    if (this.enemyState === EnemyState.DEAD) {
      return;
    }

    if (this.enemyState === EnemyState.STOMPED) {
      if (time - this.stompedTime > this.STOMPED_DURATION) {
        this.die();
      }
      return;
    }

    const body = this.body as Phaser.Physics.Arcade.Body;

    // Check if on ground before doing ledge detection
    const onGround = body.blocked.down || body.touching.down;

    // Turn around when hitting a wall
    if (body.blocked.left) {
      this.turnAround(1);
    } else if (body.blocked.right) {
      this.turnAround(-1);
    }
    // Check for ledges only when on ground
    else if (onGround && this.groundGroup) {
      const hasGroundAhead = this.checkGroundAhead();
      if (!hasGroundAhead) {
        // No ground ahead - turn around!
        this.turnAround(this.walkDirection * -1);
      }
    }

    // Walking bob animation
    const bobAmount = Math.sin(time * 0.01) * 0.05;
    this.setScale(1 + bobAmount, 1 - bobAmount);
  }

  private turnAround(newDirection: number): void {
    if (this.walkDirection === newDirection) return;

    this.walkDirection = newDirection;
    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setVelocityX(this.speed * this.walkDirection);
    this.setFlipX(this.walkDirection > 0);
  }

  private checkGroundAhead(): boolean {
    if (!this.groundGroup) return true; // Assume ground if no group set

    const body = this.body as Phaser.Physics.Arcade.Body;

    // Check point ahead and below the enemy
    const checkX = this.x + (this.walkDirection * LEDGE_CHECK_DISTANCE);
    const checkY = body.bottom + 8; // Just below the enemy's feet

    // Check if any ground tile overlaps this point
    let foundGround = false;
    this.groundGroup.getChildren().forEach((child) => {
      const tile = child as Phaser.Physics.Arcade.Sprite;
      const tileBody = tile.body as Phaser.Physics.Arcade.StaticBody;

      if (tileBody &&
          checkX >= tileBody.left &&
          checkX <= tileBody.right &&
          checkY >= tileBody.top &&
          checkY <= tileBody.bottom) {
        foundGround = true;
      }
    });

    return foundGround;
  }

  stomp(time: number): void {
    if (this.enemyState !== EnemyState.WALKING) return;

    this.enemyState = EnemyState.STOMPED;
    this.stompedTime = time;

    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setVelocity(0, 0);
    body.setAllowGravity(false);
    body.setImmovable(true);

    // Squash effect (freeze the walk cycle first)
    this.anims.stop();
    this.setScale(1.2, 0.4);
    this.setAlpha(0.7);
  }

  die(): void {
    this.enemyState = EnemyState.DEAD;
    this.setActive(false);
    this.setVisible(false);
    this.body?.destroy();
  }

  getEnemyState(): EnemyState {
    return this.enemyState;
  }

  isAlive(): boolean {
    return this.enemyState === EnemyState.WALKING;
  }

  canBeStomped(playerBody: Phaser.Physics.Arcade.Body): boolean {
    if (this.enemyState !== EnemyState.WALKING) return false;

    const enemyBody = this.body as Phaser.Physics.Arcade.Body;

    const playerFalling = playerBody.velocity.y > 0;
    const playerAbove = playerBody.bottom <= enemyBody.center.y;

    return playerFalling && playerAbove;
  }
}
