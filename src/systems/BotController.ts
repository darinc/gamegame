import Phaser from 'phaser';
import type { PlayerInput } from './InputManager';

// A heuristic AI that drives a Player by producing the same PlayerInput a human
// would. It reads the live physics world (not the tile array) so it works on any
// generated level. Used three ways:
//   - "CPU buddy": one human can play co-op solo; the bot follows, doesn't bully.
//   - "Bot demo": watch two bots play (attract mode).
//   - Automated playtester: proves a generated level is actually completable.
//
// Tunables are matched to Player.ts physics (run speed 350, ~4-tile jump w/ hold).

const TILE = 32;
const JUMP_HOLD_MS = 240;          // ~ Player MAX_JUMP_HOLD_TIME, near-max height
const GAP_LOOKAHEAD = TILE * 1.7;  // how far ahead we sniff for a pit
// Sniff for walls/steps far enough ahead that we jump WHILE still running, so the
// jump carries our horizontal momentum up and over (jumping pinned against a wall
// barely moves us sideways and stalls on tall steps).
const OBSTACLE_NEAR = 16;
const OBSTACLE_FAR = 32;
const ENEMY_LOOKAHEAD = TILE * 2.4;
const ENEMY_VERT_BAND = 56;        // only react to enemies roughly at our height
const LEAD_CLAMP = 260;            // how far ahead of a human the CPU buddy may roam
const STUCK_FRAMES = 10;
const NO_PROGRESS_MS = 850;        // no rightward gain this long => back up for a run-up
const BACKUP_MS = 220;             // how long to reverse before charging the step again

export interface Threat {
  x: number;
  y: number;
  alive: boolean;
}

export interface BotContext {
  isSolidAt: (x: number, y: number) => boolean;
  getThreats: () => Threat[];
  exitX: number;
  worldHeight: number;
  // Human partner the bot should stay with (CPU buddy mode), or null to free-run.
  getLeader: () => Phaser.GameObjects.Components.Transform | null;
  // True while this player is bubbled (then the scene auto-floats it; bot idles).
  isInBubble: () => boolean;
}

const NEUTRAL: PlayerInput = {
  left: false, right: false, up: false, down: false, downJustPressed: false,
  jump: false, jumpJustPressed: false, run: false, bubble: false, bubbleJustPressed: false,
};

export class BotController {
  private player: Phaser.Physics.Arcade.Sprite;
  private ctx: BotContext;

  private jumping = false;
  private jumpReleaseAt = 0;
  private stuck = 0;
  private bestX = -Infinity;   // furthest-right progress made
  private bestXTime = 0;       // when we last made progress
  private backupUntil = 0;     // reversing for a running start until this time

  constructor(player: Phaser.Physics.Arcade.Sprite, ctx: BotContext) {
    this.player = player;
    this.ctx = ctx;
  }

  getInput(time: number): PlayerInput {
    const body = this.player.body as Phaser.Physics.Arcade.Body;
    if (!body) return { ...NEUTRAL };

    // While bubbled the scene floats us toward the partner; just sit quietly so
    // the overlap-pop can free us.
    if (this.ctx.isInBubble()) return { ...NEUTRAL };

    const onGround = body.blocked.down || body.touching.down;

    // Backup-and-retry: when we've been pinned against a step that a standing jump
    // can't clear (weak air accel), reverse briefly to get a running start.
    if (time < this.backupUntil) {
      this.stuck = 0;
      this.jumping = false;
      return { ...NEUTRAL, left: true };
    }

    // --- Where do we want to go horizontally? ---
    let right = true;
    const leader = this.ctx.getLeader();
    if (leader && this.player.x > leader.x + LEAD_CLAMP) {
      right = false; // CPU buddy: wait up for the human
    }
    // Keep driving INTO the flag (it completes the level on overlap). Only stop
    // once we're clearly past it, so we never idle a hair short of the trigger.
    if (this.player.x > this.ctx.exitX + 20) {
      right = false;
    }

    // Track rightward progress. If we're trying to advance but haven't gained
    // ground for a while, schedule a backup so we can charge the step with speed.
    if (!right || this.player.x > this.bestX + 8) {
      this.bestX = this.player.x;
      this.bestXTime = time;
    } else if (onGround && time - this.bestXTime > NO_PROGRESS_MS) {
      this.backupUntil = time + BACKUP_MS;
      this.bestXTime = time; // don't immediately re-trigger after the backup
      this.stuck = 0;
      this.jumping = false;
      return { ...NEUTRAL, left: true };
    }

    // --- Probe the world ahead ---
    const gapX = body.right + GAP_LOOKAHEAD;
    const feetY = body.bottom + 4;

    // A gap is "no solid anywhere in the column down to the floor". Require two
    // probe columns to be empty so a thin ledge edge doesn't cause a phantom jump.
    const gapAhead = right
      && !this.solidColumn(gapX, feetY)
      && !this.solidColumn(body.right + TILE, feetY);

    // A wall/step ahead near our feet (pipe, brick, staircase). Checked a little
    // ahead so we leave the ground with momentum intact.
    const stepY = body.bottom - 10;
    const obstacle = right && (
      this.ctx.isSolidAt(body.right + OBSTACLE_NEAR, stepY) ||
      this.ctx.isSolidAt(body.right + OBSTACLE_FAR, stepY) ||
      this.ctx.isSolidAt(body.right + OBSTACLE_NEAR, body.center.y) ||
      body.blocked.right
    );

    // An enemy ahead at roughly our height -> jump (stomp or hop over).
    const enemyAhead = this.threatAhead(body.center.x, body.center.y);

    // Stuck: pushing into something with no horizontal progress.
    if (right && onGround && Math.abs(body.velocity.x) < 25) this.stuck++;
    else this.stuck = 0;

    const wantJump = onGround &&
      (gapAhead || obstacle || enemyAhead || this.stuck > STUCK_FRAMES);

    // --- Jump as a rising edge, then hold for variable height ---
    if (onGround) this.jumping = false;
    let jump = false;
    let jumpJustPressed = false;
    if (!this.jumping && onGround && wantJump) {
      this.jumping = true;
      this.jumpReleaseAt = time + JUMP_HOLD_MS;
      jump = true;
      jumpJustPressed = true;
    } else if (this.jumping && time < this.jumpReleaseAt) {
      jump = true;
    }

    return {
      left: false,
      right,
      up: jump,
      down: false,
      downJustPressed: false,
      jump,
      jumpJustPressed,
      run: true,
      bubble: false,
      bubbleJustPressed: false,
    };
  }

  private solidColumn(x: number, topY: number): boolean {
    for (let y = topY; y < this.ctx.worldHeight; y += TILE * 0.5) {
      if (this.ctx.isSolidAt(x, y)) return true;
    }
    return false;
  }

  private threatAhead(cx: number, cy: number): boolean {
    for (const t of this.ctx.getThreats()) {
      if (!t.alive) continue;
      const dx = t.x - cx;
      if (dx < -TILE * 0.5 || dx > ENEMY_LOOKAHEAD) continue;
      if (Math.abs(t.y - cy) > ENEMY_VERT_BAND) continue;
      return true;
    }
    return false;
  }
}
