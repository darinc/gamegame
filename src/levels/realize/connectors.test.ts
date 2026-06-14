import { describe, it, expect } from 'vitest';
import { buildConnector, firstIllegalStep } from './connectors';
import { buildReachableTable } from '../reachability/reachableTable';

const GRID = 22;
const table = buildReachableTable();

describe('connectors: table-valid transitions (R7)', () => {
  it('a connector between differing heights uses only table-reachable steps and mates exactly', () => {
    // Entry surface low (foot row 19), exit surface high (foot row 13 => climb 6 rows).
    const entryRow = 19;
    const exitRow = 13;
    const conn = buildConnector(table, GRID, entryRow, exitRow, 4);
    // Mates exactly to both edges.
    expect(conn.exitGroundRow).toBe(exitRow);
    expect(conn.entryGroundRow).toBe(entryRow);
    // Every adjacent-column UP step is table.canReach('stand', 1, dy).
    expect(firstIllegalStep(table, conn)).toBeNull();
  });

  it('widens beyond the requested width when a steep climb needs more columns (no unjumpable wall)', () => {
    // Request width 1 for a 6-row climb: must widen.
    const conn = buildConnector(table, GRID, 19, 13, 1);
    expect(conn.width).toBeGreaterThan(1);
    expect(firstIllegalStep(table, conn)).toBeNull();
    expect(conn.exitGroundRow).toBe(13);
  });

  it('descents may be steep (a fall) and remain legal; mates exactly', () => {
    const conn = buildConnector(table, GRID, 13, 19, 4); // drop 6 rows
    expect(conn.exitGroundRow).toBe(19);
    expect(firstIllegalStep(table, conn)).toBeNull(); // a descent is never an illegal UP step
  });

  it('flat mate is a plain floor of the requested width', () => {
    const conn = buildConnector(table, GRID, 19, 19, 5);
    expect(conn.width).toBe(5);
    expect(conn.entryGroundRow).toBe(19);
    expect(conn.exitGroundRow).toBe(19);
    expect(firstIllegalStep(table, conn)).toBeNull();
  });

  it('every adjacent step in a climb is within the table single-column rise limit', () => {
    const conn = buildConnector(table, GRID, 20, 11, 3); // climb 9 rows -> must staircase
    expect(firstIllegalStep(table, conn)).toBeNull();
    expect(conn.exitGroundRow).toBe(11);
  });
});
