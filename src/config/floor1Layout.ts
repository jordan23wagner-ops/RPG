// src/config/floor1Layout.ts
import type { DungeonTileId } from '../utils/gameLogic';

export const FLOOR1_COLS = 120;
export const FLOOR1_ROWS = 90;

type Room = {
  x: number;
  y: number;
  w: number;
  h: number;
};

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomFloorTileId(): DungeonTileId {
  const roll = Math.random();
  if (roll < 0.6) return 'floor_stone_main';
  if (roll < 0.85) return 'floor_stone_alt1';
  return 'floor_stone_alt2';
}

function createRandomRoom(cols: number, rows: number): Room {
  // Slightly smaller rooms so we can pack more of them
  const w = randomInt(6, 14);
  const h = randomInt(5, 11);
  const x = randomInt(1, cols - w - 2);
  const y = randomInt(1, rows - h - 2);
  return { x, y, w, h };
}

function roomIntersects(room: Room, others: Room[]): boolean {
  return others.some((r) =>
    room.x < r.x + r.w &&
    room.x + room.w > r.x &&
    room.y < r.y + r.h &&
    room.y + room.h > r.y,
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

// Add extra random connections so the dungeon becomes more interconnected
function connectAdditionalRooms(grid: DungeonTileId[][], rooms: Room[]): void {
  // If there are fewer than 3 rooms, nothing extra to do.
  if (rooms.length < 3) return;

  // Add a bunch of extra connections to make the dungeon more interconnected.
  const extraConnections = Math.min(rooms.length * 2, 30);

  for (let i = 0; i < extraConnections; i++) {
    const aIndex = randomInt(0, rooms.length - 1);
    const bIndex = randomInt(0, rooms.length - 1);
    if (aIndex === bIndex) continue;

    const a = rooms[aIndex];
    const b = rooms[bIndex];

    connectRooms(grid, roomCenter(a), roomCenter(b));
  }
}

function carveCorridorCell(grid: DungeonTileId[][], x: number, y: number): void {
  const rows = grid.length;
  const cols = grid[0].length;
  if (y <= 0 || y >= rows - 1 || x <= 0 || x >= cols - 1) return;

  // Carve a 3-tile wide corridor: center + up/down and left/right when possible
  const positions: { x: number; y: number }[] = [
    { x, y },
    { x: x, y: y - 1 },
    { x: x, y: y + 1 },
    { x: x - 1, y },
    { x: x + 1, y },
  ];

  for (const pos of positions) {
    if (pos.x <= 0 || pos.x >= cols - 1 || pos.y <= 0 || pos.y >= rows - 1) continue;
    const current = grid[pos.y][pos.x];
    if (
      current === 'wall_top' ||
      current === 'wall_inner' ||
      current === 'wall_side' ||
      current === 'wall_corner_inner' ||
      current === 'wall_corner_outer'
    ) {
      grid[pos.y][pos.x] = randomFloorTileId();
    }
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
  // Keep rooms readable: very few props per room
  const maxProps = randomInt(0, 2);
  let placed = 0;

  for (let iy = y + 1; iy < y + h - 1; iy++) {
    for (let ix = x + 1; ix < x + w - 1; ix++) {
      if (placed >= maxProps) return;
      const tile = grid[iy][ix];
      if (!isFloorTile(tile)) continue;
      if (Math.random() < 0.05) {
        const prop = pickRoomProp();
        grid[iy][ix] = prop;
        placed++;
      }
    }
  }
}

function addBarsAndGrates(grid: DungeonTileId[][], rooms: Room[]): void {
  // Add a short bars section somewhere near the middle of the map
  if (Math.random() < 0.3) {
    const y = randomInt(2, grid.length - 3);
    const xStart = randomInt(2, grid[0].length - 6);
    const length = randomInt(2, 4);
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

function cleanInteriorWalls(grid: DungeonTileId[][], rooms: Room[]): void {
  const rows = grid.length;
  const cols = grid[0].length;

  // Build a quick boolean mask of room-border positions
  const isBorder: boolean[][] = Array.from({ length: rows }, () =>
    Array.from({ length: cols }, () => false),
  );

  for (const room of rooms) {
    const { x, y, w, h } = room;
    for (let iy = y; iy < y + h; iy++) {
      for (let ix = x; ix < x + w; ix++) {
        const border = ix === x || ix === x + w - 1 || iy === y || iy === y + h - 1;
        if (border) {
          isBorder[iy][ix] = true;
        }
      }
    }
  }

  for (let y = 1; y < rows - 1; y++) {
    for (let x = 1; x < cols - 1; x++) {
      const tile = grid[y][x];
      if (isBorder[y][x]) continue; // keep room borders intact
      if (
        tile === 'wall_top' ||
        tile === 'wall_inner' ||
        tile === 'wall_side' ||
        tile === 'wall_corner_inner' ||
        tile === 'wall_corner_outer'
      ) {
        // Convert any interior wall_* to stone floor
        grid[y][x] = randomFloorTileId();
      }
    }
  }
}

function addPillars(grid: DungeonTileId[][], rooms: Room[]): void {
  for (const room of rooms) {
    const { x, y, w, h } = room;
    // Only add pillars to medium/large rooms
    if (w < 8 || h < 7) continue;

    const innerX1 = x + 2;
    const innerY1 = y + 2;
    const innerX2 = x + w - 3;
    const innerY2 = y + h - 3;

    const positions: { x: number; y: number }[] = [
      { x: innerX1, y: innerY1 },
      { x: innerX2, y: innerY1 },
      { x: innerX1, y: innerY2 },
      { x: innerX2, y: innerY2 },
    ];

    for (const pos of positions) {
      const tile = grid[pos.y]?.[pos.x];
      if (tile && isFloorTile(tile)) {
        grid[pos.y][pos.x] = 'wall_column';
      }
    }
  }
}

function addHazards(grid: DungeonTileId[][], rooms: Room[]): void {
  if (rooms.length === 0) return;

  // Pick 1–2 rooms to receive hazards
  const hazardRoomCount = Math.min(2, rooms.length);
  const picked: Set<number> = new Set();

  while (picked.size < hazardRoomCount) {
    picked.add(randomInt(0, rooms.length - 1));
  }

  for (const idx of picked) {
    const room = rooms[idx];
    const { x, y, w, h } = room;
    if (w < 6 || h < 6) continue;

    const patchW = randomInt(2, 4);
    const patchH = randomInt(2, 4);
    const startX = randomInt(x + 2, x + w - patchW - 2);
    const startY = randomInt(y + 2, y + h - patchH - 2);

    const useWater = Math.random() < 0.5;
    const hazardTile: DungeonTileId = useWater ? 'water' : 'pit';

    for (let iy = startY; iy < startY + patchH; iy++) {
      for (let ix = startX; ix < startX + patchW; ix++) {
        const current = grid[iy][ix];
        // Don't overwrite stairs or non-floor special tiles
        if (!isFloorTile(current)) continue;
        if (current === 'stairs_down' || current === 'torch_wall') continue;
        grid[iy][ix] = hazardTile;
      }
    }
  }
}

function isFloorTile(tile: DungeonTileId): boolean {
  return (
    tile === 'floor_stone_main' ||
    tile === 'floor_stone_alt1' ||
    tile === 'floor_stone_alt2' ||
    tile === 'grate_floor'
  );
}

function pickRoomProp(): DungeonTileId {
  const choices: DungeonTileId[] = [
    'crate',
    'barrel',
    'table',
    'wall_column',
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

// Build floor layout only after helpers are declared to avoid TDZ/cycle issues
export function buildFloor1Layout(): DungeonTileId[][] {
  const cols = FLOOR1_COLS;
  const rows = FLOOR1_ROWS;

  // Start with stone floors and a wall_top border so the default interior is clean stone
  const grid: DungeonTileId[][] = Array.from({ length: rows }, (_, y) =>
    Array.from({ length: cols }, (_, x) => {
      if (x === 0 || y === 0 || x === cols - 1 || y === rows - 1) {
        return 'wall_top';
      }
      return 'floor_stone_main';
    }),
  );

  const rooms: Room[] = [];

  // Many rooms so Floor 1 uses most of the 120x90 space
  const roomCount = randomInt(20, 35);
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

  // Connect rooms with simple L-shaped corridors in a chain
  for (let i = 0; i < rooms.length - 1; i++) {
    const a = rooms[i];
    const b = rooms[i + 1];
    connectRooms(grid, roomCenter(a), roomCenter(b));
  }

  // Add extra random connections so more of the map gets carved
  connectAdditionalRooms(grid, rooms);

  // Cleanup pass: convert any interior wall_* that aren't borders into floors
  cleanInteriorWalls(grid, rooms);

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

  // Add pillars and environmental hazards (pits, water)
  addPillars(grid, rooms);
  addHazards(grid, rooms);

  // Final cleanup: convert isolated wall tiles that look like loose rocks back into floor
  for (let y = 1; y < rows - 1; y++) {
    for (let x = 1; x < cols - 1; x++) {
      const tile = grid[y][x];
      if (
        (tile === 'wall_top' || tile === 'wall_side' || tile === 'wall_column') &&
        isFloorTile(grid[y][x - 1]) &&
        isFloorTile(grid[y][x + 1]) &&
        isFloorTile(grid[y - 1][x]) &&
        isFloorTile(grid[y + 1][x])
      ) {
        grid[y][x] = randomFloorTileId();
      }
    }
  }

  return grid;
}

// Randomized Floor 1: multiple rooms, corridors, and decorations
export function createFloor1Layout(): DungeonTileId[][] {
  return buildFloor1Layout();
}
