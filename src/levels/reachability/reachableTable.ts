// Physics-derived jump-reachability table (KTD5, U2).
//
// Built by forward-simulating the real jump integrator (src/physics.ts) — never by an
// analytic formula — so it stays faithful to the engine. The table answers, for a takeoff
// speed-class: "can the player reach a landing tile at offset (dx, dy)?" and "how much
// headroom does that move need?". Both the connector synthesizer (build by construction) and
// the validator BFS read this one table, so generated levels and the solvability check agree.
//
// Conventions: dx = tiles horizontally from takeoff (>= 0). dy = tiles vertically, UP-positive
// (climb up = +, drop down = -). Reach is capped at the conservative DESIGN_APEX_TILES upward
// (the real full-hold jump reaches ~4; we design to 3 for margin).

import {
  TILE,
  GRAVITY,
  DESIGN_APEX_TILES,
  MAX_JUMP_HOLD_TIME,
  speedFor,
  simulateJumpArc,
  type SpeedClass,
  type ArcSample,
} from '../../physics';

export type { SpeedClass } from '../../physics';

// Standing-body headroom required at any standable position on a required path. The big
// (powered) body is ~44px ~= 2 tiles; designing to 2 keeps a standing path under the KTD6
// no-ducking invariant. Jumps that rise higher need more clearance (computed per arc).
export const STAND_CLEARANCE_TILES = 2;

// The real jump is floatier than the brainstorm's ~4-tile estimate (full hold measures ~6.7
// tiles; see reachableTable.test.ts), so horizontal airtime — and thus reach — is generous.
// We trim accepted horizontal reach by this factor so connectors and the gate never demand a
// pixel-perfect max-effort jump (under-claiming reach is the safe direction for solvability).
export const REACH_SAFETY = 0.85;

export const MAX_DX = 12;
export const MAX_FALL = 8;

// Jump profiles spanning the achievable envelope: a tiny early-release hop through a full hold.
// canReach unions them (farthest reach); requiredClearance takes the min across reaching arcs
// (the player can pick the lowest jump that still makes the move — so a short pit under a low
// ceiling stays passable).
const ARC_PROFILES = [
  { holdMs: 0, earlyReleaseAtMs: 0 }, // tiny hop (~0.5 tile)
  { holdMs: 0 }, // tap launch (~2.3 tiles)
  { holdMs: 120 },
  { holdMs: MAX_JUMP_HOLD_TIME }, // full hold (~4 tiles)
];

interface ArcProbe {
  // Height (px, up-positive) when the arc's horizontal distance first reaches D px, or null
  // if the arc never travels that far while airborne above the start level.
  heightAtX(d: number): number | null;
  // Max height (px) reached from takeoff up to horizontal distance D px.
  maxHeightUpToX(d: number): number;
  // Horizontal distance (px) at which the arc returns to start level (height crosses 0 down).
  levelReachPx: number;
}

function probeArc(samples: ArcSample[]): ArcProbe {
  const heightAtX = (d: number): number | null => {
    if (d <= 0) return 0;
    for (let i = 1; i < samples.length; i++) {
      if (samples[i].x >= d) {
        const a = samples[i - 1];
        const b = samples[i];
        const span = b.x - a.x;
        const f = span > 0 ? (d - a.x) / span : 0;
        return a.height + (b.height - a.height) * f;
      }
    }
    return null; // arc never reached this far
  };
  const maxHeightUpToX = (d: number): number => {
    let m = 0;
    for (const s of samples) {
      if (s.x > d) break;
      if (s.height > m) m = s.height;
    }
    return m;
  };
  // Level reach: last x where height is still >= 0 (player can land on a same-level ledge).
  let levelReachPx = 0;
  for (const s of samples) {
    if (s.height >= 0) levelReachPx = s.x;
    else break;
  }
  return { heightAtX, maxHeightUpToX, levelReachPx };
}

export interface ReachableTable {
  readonly designApexTiles: number;
  readonly maxDx: number;
  readonly maxFall: number;
  /** Can a takeoff at `speed` reach a landing tile at offset (dx, dy)? dy up-positive. */
  canReach(speed: SpeedClass, dx: number, dy: number): boolean;
  /** Headroom (tiles, above takeoff foot) the cheapest reaching move needs. 0 if unreachable. */
  requiredClearanceTiles(speed: SpeedClass, dx: number, dy: number): number;
}

function key(dx: number, dy: number): string {
  return `${dx},${dy}`;
}

export function buildReachableTable(): ReachableTable {
  // Per speed class: map of reachable "dx,dy" -> required clearance in tiles.
  const tables: Record<SpeedClass, Map<string, number>> = {
    stand: new Map(),
    run: new Map(),
  };

  for (const speed of ['stand', 'run'] as SpeedClass[]) {
    const hspeed = speedFor(speed);
    const clearance = tables[speed];

    const set = (dx: number, dy: number, clr: number) => {
      const k = key(dx, dy);
      const prev = clearance.get(k);
      const v = Math.max(STAND_CLEARANCE_TILES, clr);
      if (prev === undefined || v < prev) clearance.set(k, v);
    };

    // Walk: same tile and adjacent level tile.
    set(0, 0, STAND_CLEARANCE_TILES);
    set(1, 0, STAND_CLEARANCE_TILES);

    // Climbs and level gaps via the jump arcs.
    const probes = ARC_PROFILES.map((p) =>
      probeArc(simulateJumpArc({ horizontalSpeed: hspeed, maxFallPx: MAX_FALL * TILE, ...p }))
    );

    // Conservative horizontal reach cap (the longest-airtime arc determines level reach; run
    // gets a larger cap than stand, naturally). Climbs and gaps can't exceed it.
    const maxLevelReachPx = Math.max(...probes.map((p) => p.levelReachPx));
    const horizCapTiles = Math.min(MAX_DX, Math.floor((maxLevelReachPx * REACH_SAFETY) / TILE));

    for (let dx = 0; dx <= horizCapTiles; dx++) {
      const dPx = dx * TILE;
      for (const probe of probes) {
        const h = probe.heightAtX(dPx);
        if (h === null) continue;
        const clrTiles = Math.ceil(probe.maxHeightUpToX(dPx) / TILE);

        // Climbs: land on a higher ledge the arc clears (capped at the design apex).
        for (let dy = 1; dy <= DESIGN_APEX_TILES; dy++) {
          if (h >= dy * TILE) set(dx, dy, clrTiles);
        }
        // Level gaps (dx >= 2): the arc is at/above start level over that column.
        if (dx >= 2 && h >= 0) set(dx, 0, clrTiles);
      }
    }

    // Drops: run off the ledge and fall. Reach = speed * sqrt(2h/g). Achievable by construction.
    for (let dyDown = 1; dyDown <= MAX_FALL; dyDown++) {
      const hPx = dyDown * TILE;
      const reachPx = hspeed * Math.sqrt((2 * hPx) / GRAVITY);
      const reachTiles = Math.floor(reachPx / TILE);
      for (let dx = 0; dx <= reachTiles && dx <= MAX_DX; dx++) {
        set(dx, -dyDown, STAND_CLEARANCE_TILES);
      }
    }
  }

  return {
    designApexTiles: DESIGN_APEX_TILES,
    maxDx: MAX_DX,
    maxFall: MAX_FALL,
    canReach(speed, dx, dy) {
      return tables[speed].has(key(dx, dy));
    },
    requiredClearanceTiles(speed, dx, dy) {
      return tables[speed].get(key(dx, dy)) ?? 0;
    },
  };
}
