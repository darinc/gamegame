import { describe, it, expect } from 'vitest';
import {
  simulateJumpArc,
  TILE,
  RUN_SPEED,
  WALK_SPEED,
  MAX_JUMP_HOLD_TIME,
  DESIGN_APEX_TILES,
  runwayTilesForRunSpeed,
} from '../../physics';
import { buildReachableTable, MAX_DX, MAX_FALL } from './reachableTable';

function apexTiles(samples: { height: number }[]): number {
  return Math.max(...samples.map((s) => s.height)) / TILE;
}

// The load-bearing fidelity test (KTD5): the simulated arc must match the documented physics
// envelope, since a drifted integrator would let the gate certify unbeatable levels.
describe('jump-arc conformance (KTD5)', () => {
  it('no-hold tap jump apex is ~2.3 tiles (the exact no-hold floor: 420^2/2g = 2.3 tiles)', () => {
    // This is the precise anchor that confirms the launch + gravity integration is faithful.
    const arc = simulateJumpArc({ horizontalSpeed: RUN_SPEED, holdMs: 0 });
    const apex = apexTiles(arc);
    expect(apex).toBeGreaterThan(2.0);
    expect(apex).toBeLessThan(2.7);
  });

  it('full-hold jump is much floatier than no-hold and clears the 3-tile design apex', () => {
    // Measured ~6.7 tiles — the code's hold force (-25/frame over 250ms) is floatier than the
    // brainstorm's rough ~4-tile estimate. The reachable table caps climbs at DESIGN_APEX_TILES
    // (3), so this generous real reach only widens the safety margin.
    const arc = simulateJumpArc({ horizontalSpeed: RUN_SPEED, holdMs: MAX_JUMP_HOLD_TIME });
    const apex = apexTiles(arc);
    expect(apex).toBeGreaterThan(DESIGN_APEX_TILES);
    expect(apex).toBeGreaterThan(5.5);
    expect(apex).toBeLessThan(8);
  });

  it('immediate-release hop apex is under 1 tile', () => {
    const arc = simulateJumpArc({ horizontalSpeed: RUN_SPEED, holdMs: 0, earlyReleaseAtMs: 0 });
    expect(apexTiles(arc)).toBeLessThan(1.0);
  });

  it('horizontal speed does not change apex height (vertical is independent)', () => {
    const run = apexTiles(simulateJumpArc({ horizontalSpeed: RUN_SPEED, holdMs: MAX_JUMP_HOLD_TIME }));
    const stand = apexTiles(simulateJumpArc({ horizontalSpeed: WALK_SPEED, holdMs: MAX_JUMP_HOLD_TIME }));
    expect(Math.abs(run - stand)).toBeLessThan(0.05);
  });

  it('simulation is deterministic', () => {
    const a = simulateJumpArc({ horizontalSpeed: RUN_SPEED, holdMs: 120 });
    const b = simulateJumpArc({ horizontalSpeed: RUN_SPEED, holdMs: 120 });
    expect(a).toEqual(b);
  });
});

describe('reachable table (U2)', () => {
  const table = buildReachableTable();

  it('walking neighbors are reachable at standing clearance', () => {
    expect(table.canReach('stand', 0, 0)).toBe(true);
    expect(table.canReach('run', 1, 0)).toBe(true);
    expect(table.requiredClearanceTiles('run', 1, 0)).toBe(2);
  });

  it('run reaches farther horizontally than stand at level', () => {
    let runMax = 0;
    let standMax = 0;
    for (let dx = 0; dx <= MAX_DX; dx++) {
      if (table.canReach('run', dx, 0)) runMax = dx;
      if (table.canReach('stand', dx, 0)) standMax = dx;
    }
    expect(runMax).toBeGreaterThan(standMax);
  });

  it('caps climbs at the conservative design apex', () => {
    const reachesApex = Array.from({ length: MAX_DX + 1 }, (_, dx) => dx).some((dx) =>
      table.canReach('run', dx, DESIGN_APEX_TILES)
    );
    expect(reachesApex).toBe(true);

    const reachesAboveApex = Array.from({ length: MAX_DX + 1 }, (_, dx) => dx).some((dx) =>
      table.canReach('run', dx, DESIGN_APEX_TILES + 1)
    );
    expect(reachesAboveApex).toBe(false);
  });

  it('a 3-tile climb needs at least 3 tiles of clearance', () => {
    const dx = Array.from({ length: MAX_DX + 1 }, (_, i) => i).find((d) =>
      table.canReach('run', d, 3)
    );
    expect(dx).toBeDefined();
    expect(table.requiredClearanceTiles('run', dx!, 3)).toBeGreaterThanOrEqual(3);
  });

  it('a short level gap stays passable under a low ceiling (min-clearance modeling)', () => {
    // A 1-tile pit (dx=2 at level) must be crossable with a small hop, not a full jump —
    // otherwise low-ceiling Cavern corridors with pits would always be rejected.
    expect(table.canReach('run', 2, 0)).toBe(true);
    expect(table.requiredClearanceTiles('run', 2, 0)).toBeLessThanOrEqual(2);
  });

  it('drops reach progressively farther the deeper they fall', () => {
    expect(table.canReach('run', 1, -1)).toBe(true);
    let shallow = 0;
    let deep = 0;
    for (let dx = 0; dx <= MAX_DX; dx++) {
      if (table.canReach('run', dx, -1)) shallow = dx;
      if (table.canReach('run', dx, -MAX_FALL)) deep = dx;
    }
    expect(deep).toBeGreaterThan(shallow);
  });

  it('is deterministic across builds', () => {
    const a = buildReachableTable();
    const b = buildReachableTable();
    for (const speed of ['stand', 'run'] as const) {
      for (let dx = 0; dx <= MAX_DX; dx++) {
        for (let dy = -MAX_FALL; dy <= DESIGN_APEX_TILES; dy++) {
          expect(a.canReach(speed, dx, dy)).toBe(b.canReach(speed, dx, dy));
          expect(a.requiredClearanceTiles(speed, dx, dy)).toBe(
            b.requiredClearanceTiles(speed, dx, dy)
          );
        }
      }
    }
  });
});

describe('runway precondition (U3 input)', () => {
  it('reaching run speed needs a small but non-zero runway', () => {
    const n = runwayTilesForRunSpeed();
    expect(n).toBeGreaterThanOrEqual(1);
    expect(n).toBeLessThanOrEqual(3);
  });
});
