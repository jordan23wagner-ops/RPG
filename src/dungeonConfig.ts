// src/dungeonConfig.ts
// -----------------------------------------------------
// Dark Dungeon tileset + layout + rendering helpers
// -----------------------------------------------------
//
// 1) Make sure this file exists in your project.
// 2) Put your atlas in: public/darkdungeon_tileset_allinone_v2.png
// 3) Import and use:
//    - loadDungeonTileset()
//    - generateFloor1()
//    - drawDungeon(ctx, tilesetImage, grid)
//    - canMoveTo(grid, tileX, tileY)
//
// Example integration (pseudo-code):
//
//   const tilesetImage = await loadDungeonTileset();
//   const dungeonGrid = generateFloor1();
//
//   function render() {
//     drawDungeon(ctx, tilesetImage, dungeonGrid);
//     // draw player, enemies, etc.
//   }
//
//   function tryMove(dx: number, dy: number) {
//     const nextTileX = Math.floor((player.x + dx) / TILE_SIZE);
//     const nextTileY = Math.floor((player.y + dy) / TILE_SIZE);
//     if (canMoveTo(dungeonGrid, nextTileX, nextTileY)) {
//       player.x += dx;
//       player.y += dy;
//     }
//   }
// -----------------------------------------------------

// --- Dungeon tileset config ------------------------

import type { DungeonTileId } from './utils/gameLogic';
import { dungeonTileMap, isWalkableTile as isWalkableDungeonTile } from './utils/gameLogic';

// 16×16 tiles in a 336×624 atlas (21×39 grid)
export const TILE_SIZE = 16;

// Alias TileId to the extended DungeonTileId so there is a single source of truth
export type TileId = DungeonTileId;

export interface TileSprite {
  sx: number;
  sy: number;
  sw: number;
  sh: number;
}

// Helper: convert (col,row) in the 21×39 grid to pixel rect
const fromGrid = (col: number, row: number): TileSprite => ({
  sx: col * TILE_SIZE,
  sy: row * TILE_SIZE,
  sw: TILE_SIZE,
  sh: TILE_SIZE,
});

// Main tileset image (already loading correctly for you)
export const DUNGEON_TILESET_URL = '/darkdungeon_tileset_allinone_v2.png';

// Sprite rects for each logical tile id, derived from the extended dungeonTileMap
export const DUNGEON_TILE_SPRITES: Record<TileId, TileSprite> = Object.fromEntries(
  Object.entries(dungeonTileMap).map(([key, { sx, sy }]) => [
    key,
    { sx, sy, sw: TILE_SIZE, sh: TILE_SIZE },
  ]),
) as Record<TileId, TileSprite>;

// -----------------------------------------------------
// Tileset loader (uses DUNGEON_TILESET_URL)
// -----------------------------------------------------

export function loadDungeonTileset(): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.src = DUNGEON_TILESET_URL;
    img.onload = () => resolve(img);
    img.onerror = (err) => reject(err);
  });
}

// -----------------------------------------------------
// Dungeon layout — Floor 1 (random rooms + corridors)
// -----------------------------------------------------

import { floor1Layout } from './config/floor1Layout';

export type DungeonGrid = TileId[][];

// Unified Floor 1 generator: uses the randomized layout from config/floor1Layout
export function generateFloor1(): DungeonGrid {
  return floor1Layout;
}

// -----------------------------------------------------
// Rendering
// -----------------------------------------------------

/**
 * Draws the entire dungeon grid, including floors, walls, props, doors, and stairs.
 * Simply renders whatever tile ID is in the grid.
 */
export function drawDungeon(
  ctx: CanvasRenderingContext2D,
  tilesetImage: HTMLImageElement,
  grid: DungeonGrid,
  camX: number,
  camY: number,
) {
  const rows = grid.length;
  if (rows === 0) return;
  const cols = grid[0].length;

  for (let y = 0; y < rows; y++) {
    const row = grid[y];
    for (let x = 0; x < cols; x++) {
      const tileId = row[x];
      const sprite = DUNGEON_TILE_SPRITES[tileId];
      if (!sprite) continue;

      const screenX = x * TILE_SIZE - camX;
      const screenY = y * TILE_SIZE - camY;

      ctx.drawImage(
        tilesetImage,
        sprite.sx,
        sprite.sy,
        TILE_SIZE,
        TILE_SIZE,
        screenX,
        screenY,
        TILE_SIZE,
        TILE_SIZE
      );
    }
  }
}

// -----------------------------------------------------
// Movement / collision helpers
// -----------------------------------------------------

// Helper: is this tile walkable? (delegates to the unified extended rules)
export function canMoveTo(
  grid: DungeonGrid,
  tileX: number,
  tileY: number,
): boolean {
  if (tileY < 0 || tileY >= grid.length) return false;
  if (tileX < 0 || tileX >= grid[0].length) return false;
  const tile = grid[tileY][tileX];
  return isWalkableDungeonTile(tile as DungeonTileId);
}
