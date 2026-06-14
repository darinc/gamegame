// Build-time coverage + metadata assertions for the authored chunk pool (U6, KTD8, KTD11).
//
// Two guarantees, both run under vitest in node (the pool is Phaser-free):
//   1. COVERAGE (KTD8): every (band x verticality) cell the director ACTUALLY emits at the
//      default difficulty has >= MIN_CANDIDATES_PER_CELL non-repeating AUTHORED chunks. Coverage
//      counts authored chunks only — transforms (mirror/height-shift/enemy-swap, U5) do NOT count
//      toward the minimum — so this assertion is verifiable before U5's transform logic lands.
//   2. METADATA-vs-GEOMETRY (KTD11): every chunk's declared entryHeight/exitHeight, band,
//      verticality, and lowCeiling match what its tiles actually measure to (annotations can't
//      drift). Plus: the R13 reward-variety chunks (coin-route, hidden-cache, risk/reward path)
//      exist and are tagged 'reward'.

import { describe, it, expect } from 'vitest';
import { allChunks } from './index';
import {
  deriveBand,
  deriveVerticality,
  hasLowCeiling,
  entryGroundHeight,
  exitGroundHeight,
} from './analysis';
import { deriveLevelOutline } from '../director/Director';
import type { BandName, VerticalityClass } from '../types';

// Minimum non-repeating authored candidates required per emitted cell (KTD8's N).
const MIN_CANDIDATES_PER_CELL = 2;

/**
 * The (band x verticality) cells the director actually emits, derived EMPIRICALLY the same way
 * the authoring pass was: sample deriveLevelOutline across many base seeds and levels and collect
 * the distinct cells. This is not a 9-cell cross product — easy never asks for 'high' and peak
 * never asks for 'flat' (see director/outline.ts verticalityForBeat), so ~7 cells appear. Deriving
 * it here (rather than hardcoding) means the assertion tracks the director if its emission changes.
 */
function emittedCells(): Set<string> {
  const cells = new Set<string>();
  for (let seed = 0; seed < 60; seed++) {
    for (let level = 1; level <= 12; level++) {
      const outline = deriveLevelOutline(seed, level, 'overworld');
      for (const beat of outline.beats) {
        cells.add(`${beat.band}|${beat.verticality}`);
      }
    }
  }
  return cells;
}

function chunkCell(band: BandName, verticality: VerticalityClass): string {
  return `${band}|${verticality}`;
}

describe('chunk pool coverage (KTD8)', () => {
  const emitted = emittedCells();

  // Sanity: the empirical sweep finds the verified 7-cell matrix (easy never high, peak never
  // flat). If the director's emission changes this, the explicit list below should be revisited.
  it('the director emits the verified 7-cell (band x verticality) matrix', () => {
    expect([...emitted].sort()).toEqual([
      'easy|flat',
      'easy|stepped',
      'medium|flat',
      'medium|high',
      'medium|stepped',
      'peak|high',
      'peak|stepped',
    ]);
  });

  it(`every emitted cell has >= ${MIN_CANDIDATES_PER_CELL} non-repeating authored chunks`, () => {
    // Count authored chunks per cell using each chunk's OWN annotations (validated against
    // geometry by the metadata tests below), and require uniqueness by name (non-repeating).
    const byCell = new Map<string, Set<string>>();
    for (const c of allChunks) {
      const band = c.band ?? 'easy';
      const verticality = c.verticality ?? 'flat';
      const cell = chunkCell(band, verticality);
      if (!byCell.has(cell)) byCell.set(cell, new Set());
      byCell.get(cell)!.add(c.name);
    }

    const shortfalls: string[] = [];
    for (const cell of emitted) {
      const count = byCell.get(cell)?.size ?? 0;
      if (count < MIN_CANDIDATES_PER_CELL) {
        shortfalls.push(`${cell}: ${count} (need ${MIN_CANDIDATES_PER_CELL})`);
      }
    }

    // A real assertion: removing/mis-annotating a chunk that drops a cell below the minimum fails
    // the build. (Tested non-destructively — we just assert the live pool clears the bar.)
    expect(shortfalls, `under-covered cells: ${shortfalls.join('; ')}`).toEqual([]);
  });
});

describe('chunk metadata vs geometry (KTD11)', () => {
  it('declared entryHeight/exitHeight equal the actual edge ground rows', () => {
    const drift: string[] = [];
    for (const c of allChunks) {
      const actualEntry = entryGroundHeight(c.tiles);
      const actualExit = exitGroundHeight(c.tiles);
      if (c.entryHeight !== actualEntry) {
        drift.push(`${c.name}: entryHeight=${c.entryHeight} but left-edge ground=${actualEntry}`);
      }
      if (c.exitHeight !== actualExit) {
        drift.push(`${c.name}: exitHeight=${c.exitHeight} but right-edge ground=${actualExit}`);
      }
    }
    expect(drift, drift.join('; ')).toEqual([]);
  });

  it('declared band equals scoreBand of geometry-derived features', () => {
    const drift: string[] = [];
    for (const c of allChunks) {
      const measured = deriveBand(c);
      if ((c.band ?? 'easy') !== measured) {
        drift.push(`${c.name}: band=${c.band ?? 'easy'} but geometry scores ${measured}`);
      }
    }
    expect(drift, drift.join('; ')).toEqual([]);
  });

  it('declared verticality and lowCeiling match geometry', () => {
    const drift: string[] = [];
    for (const c of allChunks) {
      const v = deriveVerticality(c);
      const lc = hasLowCeiling(c.tiles);
      if ((c.verticality ?? 'flat') !== v) {
        drift.push(`${c.name}: verticality=${c.verticality ?? 'flat'} but geometry is ${v}`);
      }
      if ((c.lowCeiling ?? false) !== lc) {
        drift.push(`${c.name}: lowCeiling=${c.lowCeiling ?? false} but geometry is ${lc}`);
      }
    }
    expect(drift, drift.join('; ')).toEqual([]);
  });

  it('chunk dimensions are self-consistent (width/height match the tile grid)', () => {
    for (const c of allChunks) {
      expect(c.tiles.length, `${c.name} height`).toBe(c.height);
      for (const row of c.tiles) {
        expect(row.length, `${c.name} width`).toBe(c.width);
      }
    }
  });
});

describe('reward variety (R13, KTD11)', () => {
  it('has >= 1 coin-route, >= 1 hidden-cache, and >= 1 risk/reward side-path, all tagged reward', () => {
    const byKind = (kind: string) =>
      allChunks.filter((c) => c.reward === kind && c.tags.includes('reward'));

    expect(byKind('coin-route').length, 'coin-route reward chunks').toBeGreaterThanOrEqual(1);
    expect(byKind('hidden-cache').length, 'hidden-cache reward chunks').toBeGreaterThanOrEqual(1);
    expect(
      byKind('risk-reward-path').length,
      'risk/reward side-path chunks',
    ).toBeGreaterThanOrEqual(1);
  });

  it('every reward-kind-marked chunk carries the reward tag', () => {
    for (const c of allChunks) {
      if (c.reward !== undefined) {
        expect(c.tags, `${c.name} should be tagged reward`).toContain('reward');
      }
    }
  });
});
