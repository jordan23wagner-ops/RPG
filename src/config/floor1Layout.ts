// src/config/floor1Layout.ts
import type { DungeonTileId } from '../utils/gameLogic';

export const FLOOR1_COLS = 30;
export const FLOOR1_ROWS = 20;

// Returns a random floor tileId with weighted probability
// 60% floor_basic, 25% floor_cracked, 15% floor_moss
function randomFloorTileId(): DungeonTileId {
  const r = Math.random();
  if (r < 0.6) return 'floor_basic';       // 60%
  if (r < 0.85) return 'floor_cracked';    // next 25%
  return 'floor_moss';                     // remaining 15%
}

// Floor 1 layout:
// - Solid wall border
// - Central vertical corridor
// - Left-side room
// - A pit area and a water area near the bottom
export const floor1Layout: DungeonTileId[][] = (() => {
  const rows: DungeonTileId[][] = [];

  for (let y = 0; y < FLOOR1_ROWS; y++) {
    const row: DungeonTileId[] = [];

    for (let x = 0; x < FLOOR1_COLS; x++) {
      let tile: DungeonTileId = randomFloorTileId();

      const isBorder =
        x === 0 ||
        y === 0 ||
        x === FLOOR1_COLS - 1 ||
        y === FLOOR1_ROWS - 1;

      if (isBorder) {
        tile = 'wall_top';
      } else {
        // --- central vertical corridor ---
        const midX = Math.floor(FLOOR1_COLS / 2);
        if (x === midX || x === midX - 1) {
          tile = randomFloorTileId();
        }

        // --- left side room (y: 5–10, x: 3–8) ---
        if (x >= 3 && x <= 8 && y >= 5 && y <= 10) {
          const isRoomBorder =
            x === 3 || x === 8 || y === 5 || y === 10;
          tile = isRoomBorder ? 'floor_cracked' : randomFloorTileId();
        }

        // --- pit cluster near bottom-right ---
        if (
          y >= FLOOR1_ROWS - 5 &&
          y <= FLOOR1_ROWS - 3 &&
          x >= midX + 3 &&
          x <= midX + 7
        ) {
          tile = 'pit';
        }

        // --- water pool near bottom-left ---
        if (
          y >= FLOOR1_ROWS - 7 &&
          y <= FLOOR1_ROWS - 5 &&
          x >= 2 &&
          x <= 6
        ) {
          tile = 'water';
        }
      }

      row.push(tile);
    }

    rows.push(row);
  }

  return rows;
})();
