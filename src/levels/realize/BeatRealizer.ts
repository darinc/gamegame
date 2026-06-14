// The realization strategy interface (KTD2, U5).
//
// Phaser-free / Node-importable: the whole generation path runs under vitest in node and (later)
// is imported by GameScene (U9). Do NOT import Phaser or anything under src/scenes / src/entities.
//
// A `BeatRealizer` turns one outline `Beat` into a `RealizedSegment`. Phase 1 ships exactly one
// implementation (`ChunkRealizer`); Phase 2's `SynthRealizer` slots in behind the same interface
// without a director change. To keep that extension honest the contract is defined NOW as an
// EDGE-PROFILE + SEMANTIC-PLACEMENT contract, not a scalar-height contract (KTD2/KTD11):
//
//   - Edge profile: the connector mates to the segment's standable entry/exit surface ROWS (grid
//     rows, NOT "tiles from bottom"), plus a flag for whether that edge is an open gap. For a flat
//     authored chunk the profile degenerates to a constant row; a Phase-2 undulated/gap edge is the
//     general case and assembles through the exact same connector path.
//   - Placement requests: entity/reward placement is returned SEMANTICALLY (enemy-of-role-here,
//     coin-route-cells, question-here) in segment-local coordinates, so the placement layer
//     (placement.ts) resolves them under typed validity rules. The synthesizer never has to
//     fabricate chunk-shaped spawn metadata.

import type { Rng } from '../rng';
import type { ReachableTable } from '../reachability/reachableTable';
import type { Beat } from '../director/outline';
import type { EnemyType, RewardKind } from '../types';

// --- Semantic placement requests ------------------------------------------------------------
// Coordinates are SEGMENT-LOCAL (col within the segment, row within the full grid height the
// segment was realized at). The assembler offsets `atCol`/cells by the segment's x-origin before
// handing them to placement.ts (which resolves them to concrete spawns under per-entity rules).

export interface EnemyPlacement {
  kind: 'enemy';
  enemyType: EnemyType;
  atCol: number; // segment-local column
  atRow: number; // grid row of the standing foot cell (informational; placement re-resolves to floor)
  role: 'patrol' | 'charger'; // charger => bull => needs a bounded charge lane both directions
}

export interface CoinPlacement {
  kind: 'coin-route' | 'cache';
  // Coin cells in {col, row} segment-local coords. `cache` coins may start buried (inside a brick
  // shell) and are lifted/repositioned rather than dropped (reward-beat coins are content, KTD13).
  cells: { col: number; row: number }[];
}

export interface QuestionPlacement {
  kind: 'question';
  atCol: number; // segment-local column of the QUESTION tile
  atRow: number; // grid row of the QUESTION tile
  containsPowerUp: boolean;
}

export type PlacementRequest = EnemyPlacement | CoinPlacement | QuestionPlacement;

// --- The realized segment -------------------------------------------------------------------

export interface RealizedSegment {
  // The terrain stamp, full grid height (tiles[row][col]); EMPTY where the segment is open.
  tiles: number[][];
  width: number;
  // Standable surface ROW at the left/right edge (grid row of the foot cell — the EMPTY cell whose
  // tile below is solid). The connector mates to these exactly. For a flat chunk both equal the
  // baseline foot row; an open/gap edge sets the corresponding `*EdgeOpen` flag.
  entryGroundRow: number;
  exitGroundRow: number;
  entryEdgeOpen: boolean; // true if the left edge is a pit/gap (no standable surface to mate to)
  exitEdgeOpen: boolean;
  placements: PlacementRequest[];
  // Provenance for tests/debug: which authored chunk (if any) and reward kind this came from.
  source: string;
  reward?: RewardKind;
}

// --- The strategy context -------------------------------------------------------------------

export interface RealizeContext {
  rng: Rng;            // a per-beat fork (stable selection regardless of sibling draw counts)
  table: ReachableTable;
  theme: string;
  // The grid row the segment's baseline floor surface should sit at (foot cell row). The realizer
  // height-shifts a chunk so its entry edge lands on (or near) this row, so the connector has a
  // small height delta to bridge rather than a chunk-coordinate offset.
  targetGroundRow: number;
  // Total grid height the segment is stamped into (so a chunk shorter than the level bottom-aligns
  // into a full-height stamp and edge rows are expressed in grid coordinates).
  gridHeight: number;
}

export interface BeatRealizer {
  realize(beat: Beat, ctx: RealizeContext): RealizedSegment;
}
