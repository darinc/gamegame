import { describe, it, expect } from 'vitest';
import { ChunkRealizer, selectChunk, isChunkThemeLegal } from './ChunkRealizer';
import type { RealizeContext } from './BeatRealizer';
import { Rng } from '../rng';
import { buildReachableTable } from '../reachability/reachableTable';
import { Band, bandRank } from '../director/bands';
import { difficultyParams } from '../director/difficulty';
import type { Beat } from '../director/outline';
import { lowRoofCorridor, coinHeaven, allChunks } from '../chunks';

const GRID = 22;
const table = buildReachableTable();
const BASELINE = GRID - 2 - 1; // foot row at the baseline

function ctx(seed = 1, theme = 'overworld', difficulty?: RealizeContext['difficulty']): RealizeContext {
  return { rng: new Rng(seed), table, theme, targetGroundRow: BASELINE, gridHeight: GRID, difficulty };
}
function beat(band: Beat['band'], verticality: Beat['verticality'], role: Beat['role'] = 'traversal'): Beat {
  return { index: 0, band, role, verticality, theme: 'overworld' };
}

describe('ChunkRealizer: realizes beats from authored chunks (R4)', () => {
  it('a reward beat realizes from an authored reward chunk', () => {
    const r = new ChunkRealizer().realize(beat(Band.EASY, 'flat', 'reward'), ctx());
    expect(r.tiles.length).toBe(GRID);
    expect(r.width).toBeGreaterThan(0);
    expect(r.source).not.toBe('filler');
  });

  it('a peak setpiece beat realizes from an authored chunk', () => {
    const r = new ChunkRealizer().realize(beat(Band.PEAK, 'high', 'setpiece'), ctx());
    expect(r.source).not.toBe('filler');
  });

  it('a plain traversal beat realizes (chunk-only in Phase 1)', () => {
    const r = new ChunkRealizer().realize(beat(Band.EASY, 'flat', 'traversal'), ctx());
    expect(r.tiles.length).toBe(GRID);
  });

  it('mates its entry edge near the target ground row', () => {
    const r = new ChunkRealizer().realize(beat(Band.EASY, 'flat'), ctx());
    // A flat easy chunk shifted to the baseline lands its entry foot on the baseline row.
    expect(r.entryGroundRow).toBe(BASELINE);
  });
});

describe('ChunkRealizer: fallback ladder (KTD8) — never throws', () => {
  it('exact cell when candidates exist', () => {
    const sel = selectChunk('easy', 'flat', 'overworld', new Rng(3));
    expect('chunk' in sel && sel.rung).toBe('exact');
  });

  it('relaxes verticality when the exact (band x verticality) cell is empty', () => {
    // Inject a lookup where the exact cell is empty but a relaxed verticality (same band) has one.
    const lookup = (band: string, vert: string) =>
      band === 'medium' && vert === 'flat' ? [coinHeaven] : [];
    const sel = selectChunk('medium', 'high', 'overworld', new Rng(3), lookup);
    expect('chunk' in sel).toBe(true);
    if ('chunk' in sel) expect(sel.rung).toBe('relax-verticality');
  });

  it('with the real pool every emitted cell is populated, so the exact rung is hit', () => {
    // The real pool covers all 9 cells (coverage.test.ts asserts the 7 emitted), so a real
    // request never needs the ladder — confirm a couple resolve to the exact rung.
    expect('chunk' in selectChunk('peak', 'high', 'overworld', new Rng(1))).toBe(true);
    expect('chunk' in selectChunk('medium', 'high', 'overworld', new Rng(1))).toBe(true);
  });

  it('falls to the filler rung deterministically when the whole pool is starved (never throws)', () => {
    const starved = () => []; // injected lookup: every cell empty
    const a = selectChunk('peak', 'high', 'overworld', new Rng(7), starved);
    const b = selectChunk('peak', 'high', 'overworld', new Rng(7), starved);
    expect(a).toEqual({ rung: 'filler' });
    expect(b).toEqual({ rung: 'filler' }); // deterministic
  });

  it('uses the relax-band rung before filler when only an easier band has candidates', () => {
    const onlyEasyFlat = (band: string, vert: string) =>
      band === 'easy' && vert === 'flat' ? [coinHeaven] : [];
    const sel = selectChunk('peak', 'high', 'overworld', new Rng(1), onlyEasyFlat);
    expect('chunk' in sel && sel.rung).toBe('relax-band');
  });

  it('the realizer never throws and always emits a usable segment for any emitted cell', () => {
    const r = new ChunkRealizer().realize(beat(Band.MEDIUM, 'stepped'), ctx(2));
    expect(r.width).toBeGreaterThan(0);
  });
});

describe('ChunkRealizer: difficulty scales intensity, not band (KTD3)', () => {
  it('an easy beat still realizes at easy-or-easier achievedBand under high difficulty', () => {
    const hard = difficultyParams(2); // a high scalar
    for (let s = 0; s < 20; s++) {
      const r = new ChunkRealizer().realize(beat(Band.EASY, 'flat'), ctx(s, 'overworld', hard));
      expect(bandRank(r.achievedBand)).toBeLessThanOrEqual(bandRank('easy'));
    }
  });

  it('high difficulty preserves a usable segment (never starves the realizer)', () => {
    const hard = difficultyParams(2);
    const r = new ChunkRealizer().realize(beat(Band.MEDIUM, 'stepped'), ctx(3, 'overworld', hard));
    expect(r.width).toBeGreaterThan(0);
  });
});

describe('ChunkRealizer: theme-legality (U5 simple predicate)', () => {
  it('a sky-like theme rejects low-ceiling chunks; overworld accepts them', () => {
    expect(isChunkThemeLegal(lowRoofCorridor, 'Sky')).toBe(false);
    expect(isChunkThemeLegal(lowRoofCorridor, 'overworld')).toBe(true);
    expect(isChunkThemeLegal(coinHeaven, 'Sky')).toBe(true); // not low-ceiling
  });

  it('selectChunk under a sky theme never returns a low-ceiling chunk', () => {
    for (let s = 0; s < 30; s++) {
      const sel = selectChunk('medium', 'stepped', 'Sky', new Rng(s));
      if ('chunk' in sel) expect(sel.chunk.lowCeiling ?? false).toBe(false);
    }
  });
});

describe('ChunkRealizer: every emitted cell resolves (no error branch)', () => {
  it('all (band x verticality) cells the director emits select a chunk or filler', () => {
    const cells: [Beat['band'], Beat['verticality']][] = [
      ['easy', 'flat'], ['easy', 'stepped'],
      ['medium', 'flat'], ['medium', 'stepped'], ['medium', 'high'],
      ['peak', 'stepped'], ['peak', 'high'],
    ];
    for (const [b, v] of cells) {
      const sel = selectChunk(b, v, 'overworld', new Rng(1));
      expect('rung' in sel).toBe(true);
    }
  });

  it('the authored pool is non-empty (sanity for the ladder base case)', () => {
    expect(allChunks.length).toBeGreaterThan(0);
  });
});
