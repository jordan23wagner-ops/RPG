// src/dungeonConfig.ts
// -----------------------------------------------------
// Dark Dungeon tileset + layout + rendering helpers
// -----------------------------------------------------
//
// 1) Make sure this file exists in your project.
// 2) Put your atlas in: public/darkdungeon_tileset_allinone.png
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
// Tileset loader (uses /public/darkdungeon_tileset_allinone.png)
// -----------------------------------------------------

export function loadDungeonTileset(): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.src = '/darkdungeon_tileset_allinone.png'; // served from /public

    img.onload = () => {
      console.log(
        '\ud83e\udde9 Tileset loaded:',
        img.src,
        img.width,
        img.height
      );
      // We expect 336 x 624 here. If not, youre using a different file.
      resolve(img);
    };

    img.onerror = (err) => {
      console.error(' Failed to load dungeon tileset', img.src, err);
      reject(err);
    };
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

// Floor tile source coordinates from the tileset atlas
// These point to a 48x48 region containing the solid stone floor
const FLOOR_TILE_SX = 36;
const FLOOR_TILE_SY = 291;
const FLOOR_TILE_SW = 48;
const FLOOR_TILE_SH = 48;

/**
 * Draws a solid floor layer across the entire dungeon grid.
 * Uses a specific 48x48 tile region from the tileset, scaled to TILE_SIZE.
 * Call this BEFORE drawing walls, objects, enemies, or player.
 */
export function drawFloor(
  ctx: CanvasRenderingContext2D,
  tilesetImage: HTMLImageElement,
  grid: DungeonGrid,
  camX: number,
  camY: number,
) {
  const rows = grid.length;
  const cols = rows > 0 ? grid[0].length : 0;

  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      const screenX = x * TILE_SIZE - camX;
      const screenY = y * TILE_SIZE - camY;

      ctx.drawImage(
        tilesetImage,
        FLOOR_TILE_SX,
        FLOOR_TILE_SY,
        FLOOR_TILE_SW,
        FLOOR_TILE_SH,
        screenX,
        screenY,
        TILE_SIZE,
        TILE_SIZE
      );
    }
  }
}

// Whitelist of structural dungeon tiles that should render as-is.
// Any tile NOT in this list will be normalized to floor_stone_main.
const STRUCTURAL_TILES: DungeonTileId[] = [
  // Walls
  'wall_top',
  'wall_inner',
  'wall_side',
  'wall_corner_inner',
  'wall_corner_outer',
  'wall_column',
  // Doors
  'door_closed',
  // Stairs
  'stairs_down',
  // Hazards (keep visible for gameplay)
  'pit',
  'water',
  // Bars/grates
  'bars_vertical',
  'grate_floor',
  // Decorations that are intentional (torches on walls)
  'torch_wall',
  // Props (crates, barrels, tables) - these are structural/intentional
  'crate',
  'barrel',
  'table',
];

/**
 * Normalize a dungeon tile ID for rendering.
 * If the tile is in the STRUCTURAL_TILES whitelist, it renders as-is.
 * Otherwise, it's skipped (floor is already drawn by drawFloor).
 */
function normalizeDungeonTileIdForRender(tileId: DungeonTileId): DungeonTileId | null {
  if (STRUCTURAL_TILES.includes(tileId)) {
    return tileId;
  }
  return null; // Skip non-structural tiles (floors, rubble, etc.)
}

/**
 * Draws walls, props, doors, stairs, and other non-floor tiles on top of the floor layer.
 * Call this AFTER drawFloor().
 */
export function drawDungeon(
  ctx: CanvasRenderingContext2D,
  tilesetImage: HTMLImageElement,
  grid: DungeonGrid,
  camX: number,
  camY: number,
) {
  const rows = grid.length;
  const cols = rows > 0 ? grid[0].length : 0;

  // Draw walls, props, doors, stairs on top of the floor layer
  for (let y = 0; y < rows; y++) {
    const row = grid[y];
    for (let x = 0; x < cols; x++) {
      const rawId = row[x];

      // Normalize tile ID: only structural tiles render,
      // everything else (floors, rubble, rocks, debris) is skipped
      const safeTileId = normalizeDungeonTileIdForRender(rawId);
      if (!safeTileId) continue;

      const sprite = DUNGEON_TILE_SPRITES[safeTileId];
      if (!sprite) continue;

      const screenX = x * TILE_SIZE - camX;
      const screenY = y * TILE_SIZE - camY;

      ctx.drawImage(
        tilesetImage,
        sprite.sx,
        sprite.sy,
        sprite.sw,
        sprite.sh,
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
