// Top-level orchestrator shell for the outline-first generator (KTD1).
//
// Phaser-free / Node-importable. Do NOT import Phaser or anything under src/scenes /
// src/entities — the whole generation path runs under vitest in node and (later) in the offline
// solvability sweep.
//
// U4 scope: the OUTLINE layer only. This shell exposes `deriveLevelOutline`, which wires the
// seeded RNG (U1) to `deriveOutline` (the curve/beats/bands derivation). Geometry realization —
// turning beats into tiles via the BeatRealizer/ChunkRealizer + connectors + reachability gate —
// is U5/U9 and is intentionally NOT implemented here (see the TODO on generateDirectedLevel).

import { Rng } from '../rng';
import { deriveOutline } from './outline';
import type { Outline } from './outline';

/**
 * Derive the explicit outline (curve archetype + ordered beats) for a level (KTD1, R1, R2, R3).
 *
 * Pure function of (seed, levelNumber): same inputs always produce the same outline, and the
 * previous-level archetype exclusion is recomputed statelessly inside `deriveOutline` (KTD10).
 *
 * Note on the RNG: `deriveOutline` is fed a BASE-seed `Rng` (`new Rng(seed)`), not the per-level
 * `rngForLevel(seed, levelNumber)` stream. That is deliberate — the stateless previous-level
 * exclusion (R2) recomputes level N-1's archetype from the SAME base, which only reproduces
 * level N-1's real choice if both levels share the base-seed root. (`rngForLevel` is still the
 * canonical per-level stream the realization units U5+ consume off this same base.)
 */
export function deriveLevelOutline(seed: number, levelNumber: number, theme: string): Outline {
  const base = new Rng(seed >>> 0);
  return deriveOutline(base, levelNumber, theme);
}

/**
 * TODO(U5/U9): realize the outline into LevelData.
 *
 * The full director pipeline is outline -> realize -> validate -> emit (KTD1, KTD2, KTD7):
 *   1. deriveLevelOutline(seed, levelNumber, theme)            // U4 (this file)
 *   2. for each beat: BeatRealizer.realize(beat, ctx)          // U5 (ChunkRealizer)
 *   3. bridge adjacencies with table-drawn connectors          // U5
 *   4. resolve semantic placements (typed placement validity)  // U5
 *   5. reachability gate from both co-op spawns + reroll/degrade // U3 + U9
 *   6. emit LevelData (incl. questionBlockContents sidecar)    // U9
 *
 * Realization will fork its realizer / overlay-reroll substreams from
 * `rngForLevel(seed, levelNumber)` (the canonical per-level stream, src/levels/rng.ts). That is
 * out of scope for U4 — no geometry is produced here.
 */
