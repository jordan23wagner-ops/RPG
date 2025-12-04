// src/config/floor1Layout.ts
import type { DungeonTileId } from '../utils/gameLogic';

export const FLOOR1_COLS = 120;
export const FLOOR1_ROWS = 90;

// Generate Floor 1 lazily to avoid any top-level evaluation or TDZ surprises
export function createFloor1Layout(): DungeonTileId[][] {
  // Minimal, deterministic, helper-free layout to avoid any TDZ/minifier surprises
  const cols = FLOOR1_COLS;
  const rows = FLOOR1_ROWS;

  const grid: DungeonTileId[][] = Array.from({ length: rows }, (_, y) =>
    Array.from({ length: cols }, (_, x) => {
      if (x === 0 || y === 0 || x === cols - 1 || y === rows - 1) return 'wall_top';
      return 'floor_stone_main';
    }),
  );

  // Place a single stairs_down near center so progression works
  const centerX = Math.floor(cols / 2);
  const centerY = Math.floor(rows / 2);
  grid[centerY][centerX] = 'stairs_down';

  return grid;
}
