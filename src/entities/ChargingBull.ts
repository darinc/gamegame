import Phaser from 'phaser';
import { Player } from './Player';
import { Brick } from './Brick';
import { audio } from '../systems/AudioSynth';

// Movement constants
const PATROL_SPEED = 30;
const CHARGE_SPEED = 200;

// Timing constants
const ALERT_DURATION = 1000;  // 1 second wind-up
const STUN_DURATION = 1500;   // 1.5 seconds vulnerable
const STOMPED_DURATION = 500; // Time before disappearing after stomp

// Detection constants
const DETECTION_RANGE = 200;  // Horizontal pixels
const DETECTION_HEIGHT = 48;  // Vertical tolerance (about 1.5 tiles)

export const BullState = {
  PATROL: 'patrol',
  ALERT: 'alert',
  CHARGING: 'charging',
  STUNNED: 'stunned',
  STOMPED: 'stomped',
  DEAD: 'dead',
} as const;

export type BullState = typeof BullState[keyof typeof BullState];

export class ChargingBull extends Phaser.Physics.Arcade.Sprite {
  private bullState: BullState = BullState.PATROL;
  private walkDirection: number = -1; // -1 = left, 1 = right
  private stateStartTime: number = 0;
  private players: Player[] = [];
  private bricks: Brick[] = [];
  private groundGroup: Phaser.Physics.Arcade.StaticGroup | null = null;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y, 'bull');

    scene.add.existing(this);
    scene.physics.add.existing(this);

    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setCollideWorldBounds(false);
    body.setSize(36, 24);
    body.setOffset(2, 6);

    // Start patrolling
    body.setVelocityX(PATROL_SPEED * this.walkDirection);

    this.setDepth(5);
  }

  setPlayers(players: Player[]): void {
    this.players = players;
  }

  setBricks(bricks: Brick[]): void {
    this.bricks = bricks;
  }

  setGroundGroup(group: Phaser.Physics.Arcade.StaticGroup): void {
    this.groundGroup = group;
  }

  update(time: number, _delta: number): void {
    if (!this.body) return;

    const body = this.body as Phaser.Physics.Arcade.Body;

    switch (this.bullState) {
      case BullState.DEAD:
        return;

      case BullState.STOMPED:
        if (time - this.stateStartTime > STOMPED_DURATION) {
          this.die();
        }
        return;

      case BullState.PATROL:
        this.updatePatrol(time, body);
        break;

      case BullState.ALERT:
        this.updateAlert(time, body);
        break;

      case BullState.CHARGING:
        this.updateCharging(time, body);
        break;

      case BullState.STUNNED:
        this.updateStunned(time, body);
        break;
    }
  }

  private updatePatrol(time: number, body: Phaser.Physics.Arcade.Body): void {
    // Check for walls
    if (body.blocked.left) {
      this.turnAround(1);
    } else if (body.blocked.right) {
      this.turnAround(-1);
    }
    // Check for ledges
    else if ((body.blocked.down || body.touching.down) && this.groundGroup) {
      if (!this.checkGroundAhead()) {
        this.turnAround(this.walkDirection * -1);
      }
    }

    // Check for player in sight
    const targetPlayer = this.checkPlayerInSight();
    if (targetPlayer) {
      this.enterAlertState(time, targetPlayer);
    }

    // Walking animation - slow bob
    const bobAmount = Math.sin(time * 0.005) * 0.03;
    this.setScale(1 + bobAmount, 1 - bobAmount);
  }

  private updateAlert(time: number, body: Phaser.Physics.Arcade.Body): void {
    body.setVelocity(0, body.velocity.y);

    // Pulsing scale effect during wind-up
    const progress = (time - this.stateStartTime) / ALERT_DURATION;
    const pulse = 1 + Math.sin(progress * Math.PI * 6) * 0.1;
    this.setScale(pulse, pulse);

    // Slight red tint
    this.setTint(0xFF8866);

    // After wind-up, start charging
    if (time - this.stateStartTime >= ALERT_DURATION) {
      this.enterChargingState(time);
    }
  }

  private updateCharging(_time: number, body: Phaser.Physics.Arcade.Body): void {
    // Stretch effect while charging
    this.setScale(1.3, 0.9);

    // Check for wall hit
    if ((this.walkDirection < 0 && body.blocked.left) ||
        (this.walkDirection > 0 && body.blocked.right)) {
      this.enterStunnedState(_time);
      return;
    }

    // Check for brick collisions - break them!
    this.checkBrickCollisions();
  }

  private updateStunned(time: number, body: Phaser.Physics.Arcade.Body): void {
    body.setVelocity(0, body.velocity.y);

    // Wobble effect
    const wobble = Math.sin((time - this.stateStartTime) * 0.02) * 0.15;
    this.setScale(1 + wobble, 1 - wobble);
    this.setAlpha(0.7);

    // Stars effect (rotation wobble)
    this.setRotation(Math.sin((time - this.stateStartTime) * 0.01) * 0.1);

    // After stun duration, return to patrol
    if (time - this.stateStartTime >= STUN_DURATION) {
      this.exitStunnedState();
    }
  }

  private enterAlertState(time: number, targetPlayer: Player): void {
    this.bullState = BullState.ALERT;
    this.stateStartTime = time;
    audio.charge();

    // Face the player
    const newDirection = targetPlayer.x < this.x ? -1 : 1;
    this.walkDirection = newDirection;
    this.setFlipX(this.walkDirection > 0);
  }

  private enterChargingState(time: number): void {
    this.bullState = BullState.CHARGING;
    this.stateStartTime = time;
    this.clearTint();

    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setVelocityX(CHARGE_SPEED * this.walkDirection);
  }

  private enterStunnedState(time: number): void {
    this.bullState = BullState.STUNNED;
    this.stateStartTime = time;

    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setVelocityX(0);

    // Small knockback from wall
    body.setVelocityX(-this.walkDirection * 30);
  }

  private exitStunnedState(): void {
    this.bullState = BullState.PATROL;
    this.setAlpha(1);
    this.setRotation(0);
    this.setScale(1, 1);
    this.clearTint();

    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setVelocityX(PATROL_SPEED * this.walkDirection);
  }

  private turnAround(newDirection: number): void {
    if (this.walkDirection === newDirection) return;

    this.walkDirection = newDirection;
    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setVelocityX(PATROL_SPEED * this.walkDirection);
    this.setFlipX(this.walkDirection > 0);
  }

  private checkGroundAhead(): boolean {
    if (!this.groundGroup) return true;

    const body = this.body as Phaser.Physics.Arcade.Body;
    const checkX = this.x + (this.walkDirection * 24);
    const checkY = body.bottom + 8;

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

  private checkPlayerInSight(): Player | null {
    for (const player of this.players) {
      if (player.getIsInBubble()) continue;

      const dx = player.x - this.x;
      const dy = Math.abs(player.y - this.y);

      // Check if player is in front (based on facing direction)
      const inFront = (this.walkDirection < 0 && dx < 0) ||
                      (this.walkDirection > 0 && dx > 0);

      // Check distance constraints
      const inRange = Math.abs(dx) <= DETECTION_RANGE;
      const sameLevel = dy <= DETECTION_HEIGHT;

      if (inFront && inRange && sameLevel) {
        return player;
      }
    }
    return null;
  }

  private checkBrickCollisions(): void {
    const body = this.body as Phaser.Physics.Arcade.Body;

    for (const brick of this.bricks) {
      if (brick.isBroken()) continue;

      const brickBody = brick.body as Phaser.Physics.Arcade.StaticBody;
      if (!brickBody) continue;

      // Check overlap
      if (body.right > brickBody.left &&
          body.left < brickBody.right &&
          body.bottom > brickBody.top &&
          body.top < brickBody.bottom) {
        brick.break();
      }
    }
  }

  stomp(time: number): void {
    // Can only stomp during patrol or stunned states
    if (this.bullState !== BullState.PATROL &&
        this.bullState !== BullState.STUNNED) {
      return;
    }

    this.bullState = BullState.STOMPED;
    this.stateStartTime = time;

    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setVelocity(0, 0);
    body.setAllowGravity(false);
    body.setImmovable(true);

    // Squash effect
    this.setScale(1.4, 0.3);
    this.setAlpha(0.7);
    this.clearTint();
    this.setRotation(0);
  }

  die(): void {
    this.bullState = BullState.DEAD;
    this.setActive(false);
    this.setVisible(false);
    this.body?.destroy();
  }

  getBullState(): BullState {
    return this.bullState;
  }

  isAlive(): boolean {
    return this.bullState !== BullState.DEAD && this.bullState !== BullState.STOMPED;
  }

  canBeStomped(playerBody: Phaser.Physics.Arcade.Body): boolean {
    // Cannot stomp while charging!
    if (this.bullState === BullState.CHARGING) return false;
    if (this.bullState === BullState.ALERT) return false;
    if (this.bullState === BullState.DEAD) return false;
    if (this.bullState === BullState.STOMPED) return false;

    const bullBody = this.body as Phaser.Physics.Arcade.Body;

    const playerFalling = playerBody.velocity.y > 0;
    const playerAbove = playerBody.bottom <= bullBody.center.y;

    return playerFalling && playerAbove;
  }

  isCharging(): boolean {
    return this.bullState === BullState.CHARGING;
  }
}
