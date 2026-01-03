import Phaser from 'phaser';
import type { PlayerInput } from '../systems/InputManager';

// Physics constants for Mario-like feel
const WALK_SPEED = 200;
const RUN_SPEED = 350;
const ACCELERATION = 1200;
const DECELERATION = 1500;
const AIR_ACCELERATION = 600;
const AIR_DECELERATION = 400;

const JUMP_VELOCITY = -420; // Balanced for ~4 tile jump height
const JUMP_HOLD_FORCE = -25; // Hold for extra height
const MAX_JUMP_HOLD_TIME = 250; // ms
const COYOTE_TIME = 80; // ms - can still jump after leaving ground
const JUMP_BUFFER_TIME = 100; // ms - remember jump press before landing

// Ground pound settings
const GROUND_POUND_VELOCITY = 800; // Fast downward velocity
const GROUND_POUND_STALL_TIME = 150; // ms of hovering before pound

// Bubble seek settings
const BUBBLE_SEEK_SPEED = 120;
const BUBBLE_WOBBLE_AMOUNT = 30;
const BUBBLE_WOBBLE_SPEED = 0.003;

// Damage settings
const ENEMY_DAMAGE = 0.25; // Configurable damage per hit
// const INVINCIBILITY_TIME = 1500; // ms of invincibility after hit (handled by tween)

export class Player extends Phaser.Physics.Arcade.Sprite {
  public playerIndex: number;
  private isInBubble: boolean = false;
  private bubble: Phaser.GameObjects.Sprite | null = null;
  private seekTarget: Phaser.Math.Vector2 | null = null;
  private bubbleTime: number = 0;

  // Jump state
  private lastGroundedTime: number = 0;
  private jumpBufferTime: number = 0;
  private jumpHoldTime: number = 0;
  private isJumping: boolean = false;

  // Ground pound state
  private isGroundPounding: boolean = false;
  private groundPoundStallTime: number = 0;
  private groundPoundStarted: boolean = false;

  // Facing direction
  private facingRight: boolean = true;

  // Health system
  private health: number = 1.0;
  private isInvincible: boolean = false;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    playerIndex: number
  ) {
    const textureKey = playerIndex === 0 ? 'player1' : 'player2';
    super(scene, x, y, textureKey);

    this.playerIndex = playerIndex;

    // Add to scene and enable physics
    scene.add.existing(this);
    scene.physics.add.existing(this);

    // Configure physics body
    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setCollideWorldBounds(false); // Allow falling out for death/respawn
    body.setSize(28, 44);  // Slightly smaller than sprite for better feel
    body.setOffset(2, 4);
    body.setMaxVelocityX(RUN_SPEED);
    body.setDragX(0); // We handle deceleration manually

    // Set depth based on player index
    this.setDepth(10 + playerIndex);
  }

  update(input: PlayerInput, time: number, delta: number): void {
    // Guard against missing physics body (can happen during scene transitions)
    if (!this.body) return;

    if (this.isInBubble) {
      this.updateBubble(input, time, delta);
      return;
    }

    const body = this.body as Phaser.Physics.Arcade.Body;
    const onGround = body.blocked.down || body.touching.down;

    // Track grounded state for coyote time
    if (onGround) {
      this.lastGroundedTime = time;
      this.isJumping = false;
      // Reset ground pound on landing
      if (this.isGroundPounding) {
        this.isGroundPounding = false;
        this.groundPoundStarted = false;
        // Landing impact effect
        this.setScale(1.3, 0.7);
        this.scene.tweens.add({
          targets: this,
          scaleX: 1,
          scaleY: 1,
          duration: 150,
          ease: 'Back.easeOut',
        });
      }
    }

    // Ground pound logic
    if (!onGround && input.downJustPressed && !this.isGroundPounding) {
      // Start ground pound
      this.isGroundPounding = true;
      this.groundPoundStarted = false;
      this.groundPoundStallTime = 0;
      body.setVelocity(0, 0); // Stop all momentum
      body.setAllowGravity(false); // Hover briefly
    }

    if (this.isGroundPounding) {
      if (!this.groundPoundStarted) {
        // Stall phase - hovering
        this.groundPoundStallTime += delta;
        this.setScale(0.8, 1.2); // Stretch vertically
        if (this.groundPoundStallTime >= GROUND_POUND_STALL_TIME) {
          // Start the pound
          this.groundPoundStarted = true;
          body.setAllowGravity(true);
          body.setVelocityY(GROUND_POUND_VELOCITY);
        }
      } else {
        // Pounding down - maintain fast speed, keep horizontal momentum
        if (body.velocity.y < GROUND_POUND_VELOCITY) {
          body.setVelocityY(GROUND_POUND_VELOCITY);
        }
        this.setScale(0.9, 1.1); // Slight vertical stretch
      }
      return; // Skip normal movement during ground pound
    }

    const canCoyoteJump = time - this.lastGroundedTime < COYOTE_TIME;

    // Buffer jump input
    if (input.jumpJustPressed) {
      this.jumpBufferTime = time;
    }

    const hasBufferedJump = time - this.jumpBufferTime < JUMP_BUFFER_TIME;

    // Handle jumping
    if ((input.jumpJustPressed || hasBufferedJump) && (onGround || canCoyoteJump) && !this.isJumping) {
      body.setVelocityY(JUMP_VELOCITY);
      this.isJumping = true;
      this.jumpHoldTime = 0;
      this.jumpBufferTime = 0; // Clear buffer
    }

    // Variable jump height - hold jump for higher
    if (this.isJumping && input.jump && this.jumpHoldTime < MAX_JUMP_HOLD_TIME) {
      body.velocity.y += JUMP_HOLD_FORCE * (delta / 16.67);
      this.jumpHoldTime += delta;
    }

    // Release jump early = cut velocity
    if (this.isJumping && !input.jump && body.velocity.y < 0) {
      body.velocity.y *= 0.5;
      this.isJumping = false;
    }

    // Horizontal movement
    const targetSpeed = input.run ? RUN_SPEED : WALK_SPEED;
    const accel = onGround ? ACCELERATION : AIR_ACCELERATION;
    const decel = onGround ? DECELERATION : AIR_DECELERATION;

    if (input.left) {
      if (body.velocity.x > 0) {
        // Turning around - faster decel
        body.velocity.x -= decel * 1.5 * (delta / 1000);
      } else {
        body.velocity.x -= accel * (delta / 1000);
      }
      body.velocity.x = Math.max(body.velocity.x, -targetSpeed);
      this.facingRight = false;
    } else if (input.right) {
      if (body.velocity.x < 0) {
        body.velocity.x += decel * 1.5 * (delta / 1000);
      } else {
        body.velocity.x += accel * (delta / 1000);
      }
      body.velocity.x = Math.min(body.velocity.x, targetSpeed);
      this.facingRight = true;
    } else {
      // No input - decelerate
      if (Math.abs(body.velocity.x) < 10) {
        body.velocity.x = 0;
      } else if (body.velocity.x > 0) {
        body.velocity.x -= decel * (delta / 1000);
        body.velocity.x = Math.max(0, body.velocity.x);
      } else {
        body.velocity.x += decel * (delta / 1000);
        body.velocity.x = Math.min(0, body.velocity.x);
      }
    }

    // Update sprite direction
    this.setFlipX(!this.facingRight);

    // Squash/stretch animation based on velocity
    const velocityStretch = Math.abs(body.velocity.y) / 1000;
    const stretchY = 1 + velocityStretch * 0.15;
    const squashX = 1 - velocityStretch * 0.1;

    // Landing squash
    if (onGround && Math.abs(body.velocity.y) < 50) {
      this.setScale(1.1, 0.9);
      this.scene.tweens.add({
        targets: this,
        scaleX: 1,
        scaleY: 1,
        duration: 100,
        ease: 'Back.easeOut',
      });
    } else if (!onGround) {
      // In air - stretch based on vertical velocity
      this.setScale(Math.max(0.85, squashX), Math.min(1.2, stretchY));
    }
  }

  enterBubble(): void {
    if (this.isInBubble) return;

    this.isInBubble = true;
    this.bubbleTime = 0;
    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setVelocity(0, 0);
    body.setAllowGravity(false);

    // Create bubble sprite
    this.bubble = this.scene.add.sprite(this.x, this.y, 'bubble');
    this.bubble.setDepth(this.depth - 1);
    this.bubble.setAlpha(0.7);

    // Make player semi-transparent
    this.setAlpha(0.6);

    // Initial float upward (brief)
    this.scene.tweens.add({
      targets: this,
      y: this.y - 50,
      duration: 500,
      ease: 'Sine.easeOut',
    });
  }

  setSeekTarget(target: Phaser.Math.Vector2 | null): void {
    this.seekTarget = target;
  }

  exitBubble(): void {
    if (!this.isInBubble) return;

    this.isInBubble = false;
    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setAllowGravity(true);

    // Remove bubble sprite
    if (this.bubble) {
      this.bubble.destroy();
      this.bubble = null;
    }

    this.setAlpha(1);
    this.scene.tweens.killTweensOf(this);
  }

  private updateBubble(input: PlayerInput, time: number, delta: number): void {
    this.bubbleTime += delta;

    // Auto-seek toward target player with wobble
    if (this.seekTarget) {
      const dx = this.seekTarget.x - this.x;
      const dy = (this.seekTarget.y - 50) - this.y; // Float slightly above target

      const distance = Math.sqrt(dx * dx + dy * dy);

      if (distance > 10) {
        // Normalize and apply speed
        const speed = BUBBLE_SEEK_SPEED * (delta / 1000);
        const moveX = (dx / distance) * speed;
        const moveY = (dy / distance) * speed;

        // Add wobble for organic floating feel
        const wobbleX = Math.sin(time * BUBBLE_WOBBLE_SPEED) * BUBBLE_WOBBLE_AMOUNT * (delta / 1000);
        const wobbleY = Math.cos(time * BUBBLE_WOBBLE_SPEED * 1.3) * BUBBLE_WOBBLE_AMOUNT * 0.5 * (delta / 1000);

        this.x += moveX + wobbleX;
        this.y += moveY + wobbleY;
      }
    }

    // Player can also nudge with input
    const nudgeSpeed = 40 * (delta / 1000);
    if (input.left) {
      this.x -= nudgeSpeed;
    }
    if (input.right) {
      this.x += nudgeSpeed;
    }

    // Update bubble position
    if (this.bubble) {
      this.bubble.x = this.x;
      this.bubble.y = this.y;

      // Gentle scale pulsing
      const pulse = 1 + Math.sin(time * 0.005) * 0.05;
      this.bubble.setScale(pulse);
    }

    // Pop bubble with jump button (requires another player nearby in full game)
    if (input.jumpJustPressed) {
      this.exitBubble();
    }
  }

  getIsInBubble(): boolean {
    return this.isInBubble;
  }

  takeDamage(_time: number, damage: number = ENEMY_DAMAGE): boolean {
    if (this.isInvincible || this.isInBubble) return false;

    this.health -= damage;
    this.isInvincible = true;

    // Flash effect
    this.scene.tweens.add({
      targets: this,
      alpha: 0.3,
      duration: 100,
      yoyo: true,
      repeat: 7,
      onComplete: () => {
        this.setAlpha(1);
        this.isInvincible = false;
      },
    });

    // Knockback
    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setVelocityY(-200);

    return this.health <= 0;
  }

  getHealth(): number {
    return this.health;
  }

  resetHealth(): void {
    this.health = 1.0;
    this.isInvincible = false;
  }

  isPlayerInvincible(): boolean {
    return this.isInvincible;
  }

  isPlayerGroundPounding(): boolean {
    return this.isGroundPounding && this.groundPoundStarted;
  }
}
