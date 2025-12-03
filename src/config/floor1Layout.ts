// src/config/floor1Layout.ts
import type { DungeonTileId } from '../utils/gameLogic';
import { dungeonTileMap } from '../utils/gameLogic';

export const FLOOR1_COLS = 40;
export const FLOOR1_ROWS = 30;

type Room = {
  x: number;
  y: number;
  w: number;
  h: number;
};

// Randomized Floor 1: 2–4 rooms, corridors, and decorations
export const floor1Layout: DungeonTileId[][] = (() => {
  const cols = FLOOR1_COLS;
  const rows = FLOOR1_ROWS;

  // Start with solid inner walls and a wall_top border
  const grid: DungeonTileId[][] = Array.from({ length: rows }, (_, y) =>
    Array.from({ length: cols }, (_, x) => {
      if (x === 0 || y === 0 || x === cols - 1 || y === rows - 1) {
        return 'wall_top';
      }
      return 'wall_inner';
    }),
  );

  const rooms: Room[] = [];

  const roomCount = randomInt(2, 4);
  for (let i = 0; i < roomCount; i++) {
    const room = createRandomRoom(cols, rows);
    if (!roomIntersects(room, rooms)) {
      carveRoom(grid, room);
      rooms.push(room);
    }
  }

  // Ensure at least two rooms
  if (rooms.length < 2) {
    while (rooms.length < 2) {
      const room = createRandomRoom(cols, rows);
      if (!roomIntersects(room, rooms)) {
        carveRoom(grid, room);
        rooms.push(room);
      }
    }
  }

  // Connect rooms with simple L-shaped corridors
  for (let i = 0; i < rooms.length - 1; i++) {
    const a = rooms[i];
    const b = rooms[i + 1];
    connectRooms(grid, roomCenter(a), roomCenter(b));
  }

  // Place stairs_down in the last room near its center
  if (rooms.length > 0) {
    const last = rooms[rooms.length - 1];
    const center = roomCenter(last);
    const sx = clamp(center.x, last.x + 1, last.x + last.w - 2);
    const sy = clamp(center.y, last.y + 1, last.y + last.h - 2);
    grid[sy][sx] = 'stairs_down';
  }

  // Decorate rooms: torches and props
  decorateRooms(grid, rooms);

  // Optionally add bars/grates in one corridor or room
  addBarsAndGrates(grid, rooms);

  return grid;
})();

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomFloorTileId(): DungeonTileId {
  const roll = Math.random() * 100;
  if (roll < 60) return 'floor_stone_main';
  if (roll < 85) return 'floor_stone_alt1';
  return 'floor_stone_alt2';
}

function createRandomRoom(cols: number, rows: number): Room {
  const w = randomInt(8, 14);
  const h = randomInt(6, 10);
  const x = randomInt(1, cols - w - 2);
  const y = randomInt(1, rows - h - 2);
  return { x, y, w, h };
}

function roomIntersects(room: Room, others: Room[]): boolean {
  return others.some((r) =>
    room.x < r.x + r.w + 1 &&
    room.x + room.w + 1 > r.x &&
    room.y < r.y + r.h + 1 &&
    room.y + room.h + 1 > r.y,
  );
}

function carveRoom(grid: DungeonTileId[][], room: Room): void {
  const { x, y, w, h } = room;

  for (let iy = y; iy < y + h; iy++) {
    for (let ix = x; ix < x + w; ix++) {
      const isBorder = ix === x || ix === x + w - 1 || iy === y || iy === y + h - 1;
      if (isBorder) {
        if (iy === y || iy === y + h - 1) {
          grid[iy][ix] = 'wall_top';
        } else {
          grid[iy][ix] = 'wall_side';
        }
      } else {
        grid[iy][ix] = randomFloorTileId();
      }
    }
  }
}

function roomCenter(room: Room): { x: number; y: number } {
  return {
    x: Math.floor(room.x + room.w / 2),
    y: Math.floor(room.y + room.h / 2),
  };
}

function connectRooms(
  grid: DungeonTileId[][],
  a: { x: number; y: number },
  b: { x: number; y: number },
): void {
  let x = a.x;
  let y = a.y;

  if (Math.random() < 0.5) {
    // Horizontal then vertical
    while (x !== b.x) {
      carveCorridorCell(grid, x, y);
      x += x < b.x ? 1 : -1;
    }
    while (y !== b.y) {
      carveCorridorCell(grid, x, y);
      y += y < b.y ? 1 : -1;
    }
  } else {
    // Vertical then horizontal
    while (y !== b.y) {
      carveCorridorCell(grid, x, y);
      y += y < b.y ? 1 : -1;
    }
    while (x !== b.x) {
      carveCorridorCell(grid, x, y);
      x += x < b.x ? 1 : -1;
    }
  }

  carveCorridorCell(grid, b.x, b.y);
}

function carveCorridorCell(grid: DungeonTileId[][], x: number, y: number): void {
  if (y <= 0 || y >= grid.length - 1 || x <= 0 || x >= grid[0].length - 1) return;
  const current = grid[y][x];
  if (
    current === 'wall_top' ||
    current === 'wall_inner' ||
    current === 'wall_side' ||
    current === 'wall_corner_inner' ||
    current === 'wall_corner_outer'
  ) {
    grid[y][x] = randomFloorTileId();
  }
}

function decorateRooms(grid: DungeonTileId[][], rooms: Room[]): void {
  for (const room of rooms) {
    addTorchesToRoom(grid, room);
    addPropsToRoom(grid, room);
  }
}

function addTorchesToRoom(grid: DungeonTileId[][], room: Room): void {
  const { x, y, w, h } = room;
  const torchCount = randomInt(2, 4);
  let placed = 0;

  const wallPositions: { x: number; y: number }[] = [];

  // Collect candidate wall tiles along the inside boundary (avoid corners)
  for (let ix = x + 1; ix < x + w - 1; ix++) {
    wallPositions.push({ x: ix, y: y });
    wallPositions.push({ x: ix, y: y + h - 1 });
  }
  for (let iy = y + 1; iy < y + h - 1; iy++) {
    wallPositions.push({ x, y: iy });
    wallPositions.push({ x: x + w - 1, y: iy });
  }

  shuffle(wallPositions);

  for (const pos of wallPositions) {
    if (placed >= torchCount) break;
    const tile = grid[pos.y][pos.x];
    if (
      (tile === 'wall_side' || tile === 'wall_inner' || tile === 'wall_top') &&
      tile !== 'door_closed'
    ) {
      grid[pos.y][pos.x] = 'torch_wall';
      placed++;
    }
  }
}

function addPropsToRoom(grid: DungeonTileId[][], room: Room): void {
  const { x, y, w, h } = room;
  const maxProps = randomInt(2, 5);
  let placed = 0;

  for (let iy = y + 1; iy < y + h - 1; iy++) {
    for (let ix = x + 1; ix < x + w - 1; ix++) {
      if (placed >= maxProps) return;
      const tile = grid[iy][ix];
      if (!isFloorTile(tile)) continue;
      if (Math.random() < 0.12) {
        const prop = pickRoomProp();
        grid[iy][ix] = prop;
        placed++;
      }
    }
  }
}

function addBarsAndGrates(grid: DungeonTileId[][], rooms: Room[]): void {
  // Add a short bars section somewhere near the middle of the map
  if (Math.random() < 0.7) {
    const y = randomInt(2, grid.length - 3);
    const xStart = randomInt(2, grid[0].length - 6);
    const length = randomInt(3, 6);
    for (let i = 0; i < length; i++) {
      const x = xStart + i;
      if (isFloorTile(grid[y][x])) {
        grid[y][x] = 'bars_vertical';
      }
    }
  }

  // Place 1–2 floor grates on walkable tiles
  const grateCount = randomInt(1, 2);
  let placed = 0;
  while (placed < grateCount) {
    const y = randomInt(2, grid.length - 3);
    const x = randomInt(2, grid[0].length - 3);
    if (isFloorTile(grid[y][x])) {
      grid[y][x] = 'grate_floor';
      placed++;
    }
  }
}

function isFloorTile(tile: DungeonTileId): boolean {
  return (
    tile === 'floor_basic' ||
    tile === 'floor_cracked' ||
    tile === 'floor_moss' ||
    tile === 'floor_stone_main' ||
    tile === 'floor_stone_alt1' ||
    tile === 'floor_stone_alt2' ||
    tile === 'grate_floor'
  );
}

function pickRoomProp(): DungeonTileId {
  const choices: DungeonTileId[] = [
    'rubble_small',
    'rubble_large',
    'crate',
    'barrel',
    'table',
  ];
  return choices[Math.floor(Math.random() * choices.length)];
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function shuffle<T>(arr: T[]): void {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
}
