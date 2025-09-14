import { Unit } from '../models/Types';

// Deterministic reading order: row1 col1→3, row2 col1→3, row3 col1→3
// We expose utilities to map 3 active slots to reading order positions.

export type BoardSide = (Unit | null)[]; // length 9; indexes 0..8

export function makeEmptyBoardSide(): BoardSide {
  return new Array(9).fill(null);
}

export function readingOrderIndices(): number[] {
  return [0, 1, 2, 3, 4, 5, 6, 7, 8];
}

export function activeSlotsToBoard(active: (Unit | null)[]): BoardSide {
  // Map three active slots into the front row (indices 0,1,2) for simplicity
  const b = makeEmptyBoardSide();
  b[0] = active[0] || null;
  b[1] = active[1] || null;
  b[2] = active[2] || null;
  return b;
}

export function countAlive(board: BoardSide): number {
  return board.filter(u => u && u.stats.hp > 0).length;
}

export function firstAliveIndex(board: BoardSide): number | null {
  for (const i of readingOrderIndices()) {
    const u = board[i];
    if (u && u.stats.hp > 0) return i;
  }
  return null;
}

