// Shared, Phaser-free physics constants and the jump-arc simulator (KTD5).
//
// This is the single source of truth for the movement/jump numbers. `Player.ts` imports the
// constants for the live game; `config.ts` imports GRAVITY for the Arcade world; the reachable
// table (reachability/reachableTable.ts) imports the simulator. One integrator, no drift.
//
// Coordinate convention here matches Phaser: y is DOWN-positive, so an upward velocity is
// negative and "height above takeoff" is reported as a positive number for readability.

export const GRAVITY = 1200; // px/s^2 (mirrors config.ts arcade gravity)

export const WALK_SPEED = 200;
export const RUN_SPEED = 350;
export const ACCELERATION = 1200;
export const DECELERATION = 1500;
export const AIR_ACCELERATION = 600;
export const AIR_DECELERATION = 400;

export const JUMP_VELOCITY = -420; // launch velocity (up)
export const JUMP_HOLD_FORCE = -25; // per-frame extra-height force while holding
export const MAX_JUMP_HOLD_TIME = 250; // ms
export const COYOTE_TIME = 80; // ms
export const JUMP_BUFFER_TIME = 100; // ms

export const GROUND_POUND_VELOCITY = 800;
export const GROUND_POUND_STALL_TIME = 150;

export const TILE = 32; // px per tile

// Conservative jump-apex the generator designs to. The real full-hold jump reaches ~4 tiles
// (no-hold floor ~2.3); designing connectors to 3 leaves margin (R8, KTD5/KTD6).
export const DESIGN_APEX_TILES = 3;

// Standing-body headroom (tiles) required at any standable position under the no-ducking
// invariant (KTD6). Single source of truth: the reachable table, the validator, and chunk
// geometry analysis all import this so their notion of "passable while standing" can't diverge.
export const STAND_CLEARANCE_TILES = 2;

// Phaser arcade runs a fixed 60fps step by default; the live game's variable-jump hold force
// is scaled by delta/16.67, which is ~1.0 per 60fps frame.
const FIXED_STEP_MS = 1000 / 60;

export type SpeedClass = 'stand' | 'run';

/** Horizontal air speed for a takeoff speed-class (the air-speed cap, Player.ts:159). */
export function speedFor(speedClass: SpeedClass): number {
  // A standing/walking jump caps at WALK_SPEED; a running jump at RUN_SPEED.
  return speedClass === 'run' ? RUN_SPEED : WALK_SPEED;
}

/**
 * Runway (in tiles) needed to accelerate from a standing start to RUN_SPEED on the ground,
 * so a `run`-class jump is actually achievable. d = v^2 / (2a). Used by the validator's
 * run-class edge precondition (U3, KTD6).
 */
export function runwayTilesForRunSpeed(): number {
  const px = (RUN_SPEED * RUN_SPEED) / (2 * ACCELERATION);
  return Math.ceil(px / TILE);
}

export interface ArcSample {
  t: number; // ms since takeoff
  x: number; // horizontal distance from takeoff (px, always >= 0)
  height: number; // height above takeoff foot level (px, up-positive)
}

/**
 * Forward-simulate one jump arc using the real integrator (semi-implicit Euler at the fixed
 * 60fps step), faithful to Player.update()'s jump section: launch at JUMP_VELOCITY, add
 * JUMP_HOLD_FORCE per frame while held (up to MAX_JUMP_HOLD_TIME), gravity each step.
 *
 * Returns the foot trajectory sampled per step, from takeoff until the foot has fallen
 * `maxFallPx` below takeoff level (or a hard time cap). Height is up-positive.
 */
export function simulateJumpArc(opts: {
  horizontalSpeed: number;
  holdMs: number;
  earlyReleaseAtMs?: number; // halve upward velocity once at this time (models an early release)
  maxFallPx?: number;
  stepMs?: number;
}): ArcSample[] {
  const { horizontalSpeed, holdMs } = opts;
  const maxFallPx = opts.maxFallPx ?? 12 * TILE;
  const stepMs = opts.stepMs ?? FIXED_STEP_MS;
  const earlyReleaseAtMs = opts.earlyReleaseAtMs ?? Infinity;
  const dt = stepMs / 1000;
  const holdFactor = stepMs / 16.67;

  let vy = JUMP_VELOCITY; // up-negative
  let y = 0; // down-positive position relative to takeoff
  let x = 0;
  let t = 0;
  let holdElapsed = 0;
  let released = false;

  const samples: ArcSample[] = [{ t: 0, x: 0, height: 0 }];
  const cappedHold = Math.min(holdMs, MAX_JUMP_HOLD_TIME);
  const maxT = 4000; // safety cap (ms)

  while (t < maxT) {
    // Early release cuts upward velocity in half once (matches Player.ts: vy *= 0.5).
    if (!released && t >= earlyReleaseAtMs && vy < 0) {
      vy *= 0.5;
      released = true;
    }
    // Variable-jump hold force (matches Player.ts: applied before the gravity/position step).
    if (!released && holdElapsed < cappedHold) {
      vy += JUMP_HOLD_FORCE * holdFactor;
      holdElapsed += stepMs;
    }
    // Gravity, then position (semi-implicit Euler, as Phaser arcade integrates).
    vy += GRAVITY * dt;
    y += vy * dt;
    x += horizontalSpeed * dt;
    t += stepMs;

    samples.push({ t, x, height: -y });

    // Stop once we've descended maxFallPx below takeoff while moving downward.
    if (y > maxFallPx && vy > 0) break;
  }

  return samples;
}
