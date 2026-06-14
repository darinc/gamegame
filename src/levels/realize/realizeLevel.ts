// The realization core: turn an outline into a solvable LevelData (U5, R4/R5/R7/R8/R11, KTD7).
//
// Phaser-free / Node-importable. This is the highest-risk integration — the chunk<->connector
// seam — so the spine is solvable BY CONSTRUCTION (connectors use only table-valid transitions) and
// the result is then proven with the U3 validator. On validator failure we reroll the realization
// within the seeded stream up to a hard cap, then DEGRADE to a bare flat spine that is guaranteed
// to pass (KTD7 — never fall back to HybridGenerator).
//
// Pipeline (matches Director.ts's documented plan):
//   rngForLevel -> deriveOutline -> realize each beat (ChunkRealizer)
//   -> connectors between beats -> start zone (2 spawns) + end zone (exit)
//   -> assemble full tiles -> resolve typed placements -> emit LevelData (incl. questionBlockContents)
//   -> validate; on fail reroll (deterministic counter) up to cap; else degrade to bare spine.

import { TileType } from '../types';
import type { LevelData, SpawnPoint, CoinSpawn, QuestionBlockContent, LevelExit } from '../types';
import { rngForLevel, Rng } from '../rng';
import { themeForLevel } from '../themes';
import { deriveOutline } from '../director/outline';
import type { Outline } from '../director/outline';
import { buildReachableTable } from '../reachability/reachableTable';
import type { ReachableTable } from '../reachability/reachableTable';
import { validate } from '../reachability/validator';
import { ChunkRealizer } from './ChunkRealizer';
import type { RealizedSegment, PlacementRequest } from './BeatRealizer';
import { buildConnector } from './connectors';
import { resolveCoins, resolveEnemies, resolveQuestions } from './placement';
import type { PlacementGrid } from './placement';

const GRID_HEIGHT = 22;
const TILE_SIZE = 32;
// Baseline standable surface 2 tiles from the bottom (matches chunk floors + HybridGenerator).
const BASELINE_GROUND_HEIGHT = 2;
const BASELINE_GROUND_ROW = GRID_HEIGHT - BASELINE_GROUND_HEIGHT - 1; // foot row at the baseline

const START_RESERVE = 18;
const END_RESERVE = 18;
const MAX_REROLLS = 8;

// A built-up column accumulator: we append segment/connector tile-blocks left to right, tracking
// the running x-origin so semantic placements can be offset to global coords.
interface Block {
  tiles: number[][]; // GRID_HEIGHT rows
  width: number;
  placements?: PlacementRequest[]; // segment-local; offset by the block's x-origin
}

/** A flat solid floor block of `width` columns with its surface at `footRow`. */
function flatBlock(width: number, footRow: number): Block {
  const tiles: number[][] = [];
  for (let y = 0; y < GRID_HEIGHT; y++) tiles.push(new Array<number>(width).fill(TileType.EMPTY));
  for (let col = 0; col < width; col++) {
    for (let y = footRow + 1; y < GRID_HEIGHT; y++) tiles[y][col] = TileType.GROUND;
  }
  return { tiles, width };
}

function realizeBeats(outline: Outline, rng: Rng, table: ReachableTable): RealizedSegment[] {
  const realizer = new ChunkRealizer();
  return outline.beats.map((beat) => {
    const ctx = {
      rng: rng.fork(`realize:beat:${beat.index}`),
      table,
      theme: outline.theme,
      targetGroundRow: BASELINE_GROUND_ROW,
      gridHeight: GRID_HEIGHT,
    };
    return realizer.realize(beat, ctx);
  });
}

/**
 * Assemble the ordered blocks into one full-width tile grid, returning the grid plus the global
 * placement requests (offset to grid coords) and the start/end x-origins for spawns/exit.
 */
function assemble(blocks: Block[]): {
  tiles: number[][];
  width: number;
  globalPlacements: { req: PlacementRequest; xOrigin: number }[];
} {
  const width = blocks.reduce((s, b) => s + b.width, 0);
  const tiles: number[][] = [];
  for (let y = 0; y < GRID_HEIGHT; y++) tiles.push(new Array<number>(width).fill(TileType.EMPTY));

  const globalPlacements: { req: PlacementRequest; xOrigin: number }[] = [];
  let x = 0;
  for (const block of blocks) {
    for (let by = 0; by < GRID_HEIGHT; by++) {
      for (let bx = 0; bx < block.width; bx++) {
        const t = block.tiles[by][bx];
        if (t !== TileType.EMPTY) tiles[by][x + bx] = t;
      }
    }
    if (block.placements) {
      for (const req of block.placements) globalPlacements.push({ req, xOrigin: x });
    }
    x += block.width;
  }
  return { tiles, width, globalPlacements };
}

/** Distribute connector widths so the assembled level lands near outline.widthTiles. */
function connectorBudget(outline: Outline, segWidths: number[]): number {
  const segTotal = segWidths.reduce((s, w) => s + w, 0);
  const usable = outline.widthTiles - START_RESERVE - END_RESERVE;
  const slots = segWidths.length + 1; // a connector before each beat + one to the end zone
  const remaining = usable - segTotal;
  return Math.max(2, Math.floor(remaining / slots));
}

/** One realization attempt (no validation): build the blocks + assemble + resolve placements. */
function buildAttempt(outline: Outline, rng: Rng, table: ReachableTable): LevelData {
  const segments = realizeBeats(outline, rng, table);
  const perConnector = connectorBudget(outline, segments.map((s) => s.width));

  const blocks: Block[] = [];

  // Start zone: flat baseline spine carrying the two player spawns.
  blocks.push(flatBlock(START_RESERVE, BASELINE_GROUND_ROW));
  let prevExitRow = BASELINE_GROUND_ROW;

  for (const seg of segments) {
    // Connector from the previous edge to this segment's entry edge (mates exactly).
    const conn = buildConnector(table, GRID_HEIGHT, prevExitRow, seg.entryGroundRow, perConnector);
    blocks.push({ tiles: conn.tiles, width: conn.width });
    // The segment itself, carrying its semantic placements.
    blocks.push({ tiles: seg.tiles, width: seg.width, placements: seg.placements });
    prevExitRow = seg.exitGroundRow;
  }

  // Final connector down to the end-zone baseline, then the end zone (flat, holds the exit).
  const endConn = buildConnector(table, GRID_HEIGHT, prevExitRow, BASELINE_GROUND_ROW, perConnector);
  blocks.push({ tiles: endConn.tiles, width: endConn.width });
  blocks.push(flatBlock(END_RESERVE, BASELINE_GROUND_ROW));

  const { tiles, width, globalPlacements } = assemble(blocks);

  // Player spawns on the start-zone flat spine (foot row = baseline).
  const playerSpawns: SpawnPoint[] = [
    { x: 3, y: BASELINE_GROUND_ROW },
    { x: 5, y: BASELINE_GROUND_ROW },
  ];

  // Exit in the end zone, on the flat spine.
  const exit: LevelExit = { x: width - 5, y: BASELINE_GROUND_ROW, type: 'flagpole' };

  // Resolve semantic placements to concrete spawns under typed validity (placement.ts).
  const grid: PlacementGrid = { tiles, width, height: GRID_HEIGHT };
  const rawCoins: CoinSpawn[] = [];
  const rawEnemies: SpawnPoint[] = [];
  const rawQuestions: QuestionBlockContent[] = [];
  for (const { req, xOrigin } of globalPlacements) {
    if (req.kind === 'enemy') {
      rawEnemies.push({ x: req.atCol + xOrigin, y: req.atRow, type: req.enemyType });
    } else if (req.kind === 'question') {
      rawQuestions.push({ x: req.atCol + xOrigin, y: req.atRow, containsPowerUp: req.containsPowerUp });
    } else {
      // coin-route | cache
      for (const c of req.cells) rawCoins.push({ x: c.col + xOrigin, y: c.row });
    }
  }

  const coinSpawns = resolveCoins(grid, rawCoins);
  const enemySpawns = resolveEnemies(grid, rawEnemies);
  const questionBlockContents = resolveQuestions(grid, rawQuestions);

  return {
    name: `Directed Level ${outline.levelNumber}`,
    width,
    height: GRID_HEIGHT,
    tileSize: TILE_SIZE,
    tiles,
    playerSpawns,
    enemySpawns,
    coinSpawns,
    questionBlockContents,
    exit,
  };
}

/** The terminal degrade: a bare flat solvable spine end-to-end with the exit (KTD7). */
function bareSpine(outline: Outline): LevelData {
  const width = Math.max(
    START_RESERVE + END_RESERVE + 4,
    Math.min(outline.widthTiles, 400)
  );
  const block = flatBlock(width, BASELINE_GROUND_ROW);
  return {
    name: `Directed Level ${outline.levelNumber} (spine)`,
    width,
    height: GRID_HEIGHT,
    tileSize: TILE_SIZE,
    tiles: block.tiles,
    playerSpawns: [
      { x: 3, y: BASELINE_GROUND_ROW },
      { x: 5, y: BASELINE_GROUND_ROW },
    ],
    enemySpawns: [],
    coinSpawns: [],
    questionBlockContents: [],
    exit: { x: width - 5, y: BASELINE_GROUND_ROW, type: 'flagpole' },
  };
}

// Cache the table — it is pure/deterministic and somewhat costly to rebuild per call.
let cachedTable: ReachableTable | null = null;
function getTable(): ReachableTable {
  if (!cachedTable) cachedTable = buildReachableTable();
  return cachedTable;
}

/**
 * Generate a fully realized, solvable LevelData for (seed, levelNumber). Deterministic: same inputs
 * -> byte-identical output (the reroll counter advances within the seeded stream). Always returns a
 * level that passes `validate(level, { table }).ok === true` (the bare spine is the terminal
 * guarantee).
 */
export function generateDirectedLevel(seed: number, levelNumber: number, theme?: string): LevelData {
  const table = getTable();
  // Outline derivation uses the BASE-seed Rng so the stateless previous-level exclusion matches
  // (see Director.ts / outline.ts). The realization substreams fork off the per-level Rng.
  const base = new Rng(seed >>> 0);
  // Theme is level-LOCKED (KTD14): when no explicit theme is given, use the deterministic
  // themeForLevel selection so each level realizes with its structural recipe (Cavern, Sky, ...).
  const themeName = theme ?? themeForLevel(levelNumber).name;
  const outline = deriveOutline(base, levelNumber, themeName);

  const levelRng = rngForLevel(seed, levelNumber);

  for (let attempt = 0; attempt <= MAX_REROLLS; attempt++) {
    // Each attempt forks a distinct substream keyed by the attempt counter (deterministic reroll).
    const attemptRng = levelRng.fork(`attempt:${attempt}`);
    const level = buildAttempt(outline, attemptRng, table);
    if (validate(level, { table }).ok) return level;
  }

  // Terminal degrade: a bare flat spine is solvable by construction.
  return bareSpine(outline);
}
