// src/utils/gameLogic.ts
import { Enemy, Item, Affix } from '../types/game';

// ----------------- DUNGEON TILESET HELPER -----------------

/**
 * Lightweight helper for drawing top-down dungeon tiles from a spritesheet.
 *
 * The sheet is expected at `/darkdungeon_tileset_allinone.png` (served from
 * your Vite `/public` folder). Adjust the URL below if your dev server
 * serves from a different base, but keep the same filename, and
 * organized as a grid of 16x16 pixel tiles.
 */
export class DungeonTileset {
  private image: HTMLImageElement | null = null;
  private readonly tileWidth: number;
  private readonly tileHeight: number;
  private _isLoaded = false;
  private loadPromise: Promise<void> | null = null;

  constructor(
    /** Optional override for the tilesheet URL. Defaults to `/darkdungeon_tileset_allinone.png`. */
    private readonly src: string = '/darkdungeon_tileset_allinone.png',
    tileWidth = 16,
    tileHeight = 16,
  ) {
    this.tileWidth = tileWidth;
    this.tileHeight = tileHeight;
  }

  /** True once the underlying image has finished loading successfully. */
  get isLoaded(): boolean {
    return this._isLoaded;
  }

  /**
   * Returns a Promise that resolves when the tileset image has loaded.
   * Safe to call multiple times; returns the same in-flight Promise.
   */
  load(): Promise<void> {
    if (this._isLoaded) return Promise.resolve();
    if (this.loadPromise) return this.loadPromise;

    this.loadPromise = new Promise<void>((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        console.log('Tileset loaded:', img.src, img.width, img.height);
        this.image = img;
        this._isLoaded = true;
        resolve();
      };
      img.onerror = (err) => {
        console.error('Failed to load dungeon tileset:', err);
        reject(err instanceof Error ? err : new Error('Failed to load dungeon tileset'));
      };
      img.src = this.src;
    });

    return this.loadPromise;
  }

  /**
   * Draws a tile from the spritesheet to screenX/screenY.
   * `sx`/`sy` are PIXEL offsets into the big sheet (not indices).
   * Does nothing if the image is not yet loaded.
   */
  drawTile(
    ctx: CanvasRenderingContext2D,
    sx: number,
    sy: number,
    screenX: number,
    screenY: number,
    scale = 1,
  ): void {
    if (!this.image || !this._isLoaded) return;

    const sw = this.tileWidth;
    const sh = this.tileHeight;
    const dw = this.tileWidth * scale;
    const dh = this.tileHeight * scale;

    ctx.drawImage(this.image, sx, sy, sw, sh, screenX, screenY, dw, dh);
  }
}

// Optional debug helper: render the entire tileset with (col,row) labels so
// you can map logical tile IDs to sheet indices.
export function drawTilesetDebug(
  ctx: CanvasRenderingContext2D,
  tilesetImage: HTMLImageElement,
  tileSize: number = TILE_SIZE,
): void {
  const cols = Math.floor(tilesetImage.width / tileSize);
  const rows = Math.floor(tilesetImage.height / tileSize);

  ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);

  ctx.font = '8px monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = 'white';

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const sx = col * tileSize;
      const sy = row * tileSize;
      const dx = col * tileSize;
      const dy = row * tileSize;

      ctx.drawImage(tilesetImage, sx, sy, tileSize, tileSize, dx, dy, tileSize, tileSize);

      ctx.fillText(`${col},${row}`, dx + tileSize / 2, dy + tileSize / 2);
    }
  }
}

// ----------------- DUNGEON TILE CONFIG -----------------

// ------------------------------------------------------------
// Dungeon tiles: logical IDs used by the layout + their sheet coords
// Sheet: public/darkdungeon_tileset_allinone.png (16x16 tiles, 336×624 full sheet)
// sx / sy are PIXEL offsets on the big sheet.
// ------------------------------------------------------------

export const TILE_SIZE = 16;

export type DungeonTileId =
  | 'floor_basic'
  | 'floor_cracked'
  | 'floor_moss'
  | 'floor_stone_main'
  | 'floor_stone_alt1'
  | 'floor_stone_alt2'
  | 'wall_inner'
  | 'wall_top'
  | 'wall_side'
  | 'wall_corner_inner'
  | 'wall_corner_outer'
  | 'wall_column'
  | 'door_closed'
  | 'pit'
  | 'water'
  | 'bars_vertical'
  | 'grate_floor'
  | 'stairs_down'
  | 'torch_wall'
  | 'rubble_small'
  | 'rubble_large'
  | 'crate'
  | 'barrel'
  | 'table';

function fromGrid(col: number, row: number) {
  return {
    sx: col * TILE_SIZE,
    sy: row * TILE_SIZE,
  };
}

export const dungeonTileMap: Record<DungeonTileId, { sx: number; sy: number }> = {
  // Floors – all mapped to the grey stone floor row (no colored pads or carpets)
  // main stone floor row
  floor_stone_main:  fromGrid(11, 15),
  floor_stone_alt1:  fromGrid(12, 15),
  floor_stone_alt2:  fromGrid(13, 15),

  // legacy names reused so nothing looks like carpet
  floor_basic:       fromGrid(11, 15),
  floor_cracked:     fromGrid(12, 15),
  floor_moss:        fromGrid(13, 15),

  // Walls
  wall_top:          fromGrid(0, 3),  // (0,3) top wall cap
  wall_inner:        fromGrid(0, 4),  // (0,4) solid inner wall
  wall_side:         fromGrid(1, 4),  // (1,4) vertical wall / side
  wall_corner_inner: fromGrid(2, 4),  // (2,4) inner corner
  wall_corner_outer: fromGrid(3, 4),  // (3,4) outer corner
  wall_column:       fromGrid(6, 7),  // (6,7) column

  // Door
  door_closed:       fromGrid(7, 4),  // (7,4) closed door

  // Hazards / liquids
  pit:               fromGrid(10, 19), // (10,19) pit
  water:             fromGrid(2, 17),  // (2,17) water

  // Bars / grates / stairs
  bars_vertical:     fromGrid(9, 12),  // (9,12) jail bars
  grate_floor:       fromGrid(10, 12), // (10,12) floor grate
  stairs_down:       fromGrid(5, 23),  // (5,23) stairs down

  // Deco
  torch_wall:        fromGrid(9, 30),  // (9,30) wall torch
  rubble_small:      fromGrid(4, 27),  // (4,27) small rubble/skulls
  rubble_large:      fromGrid(5, 27),  // (5,27) larger rubble
  crate:             fromGrid(6, 37),  // (6,37) crate
  barrel:            fromGrid(10, 37), // (10,37) barrel
  table:             fromGrid(8, 36),  // (8,36) table / furniture
};

const enemyNames = [
  'Fallen',
  'Zombie',
  'Skeleton',
  'Dark Cultist',
  'Corrupted Warrior',
  'Shadow Beast',
  'Demon',
  'Wraith',
  'Necromancer',
  'Hell Spawn',
];

const meleeWeapons = ['Sword', 'Axe', 'Mace', 'Cleaver', 'Warhammer', 'Flail'];
const rangedWeapons = ['Bow', 'Crossbow', 'Longbow', 'Shortbow'];
const mageWeapons = ['Staff', 'Wand', 'Orb', 'Scepter', 'Tome'];

// ----------------- SET ITEMS -----------------

/**
 * A definition of a set bonus. Each bonus is activated when the character
 * equips at least the specified number of pieces from the given set. The
 * `effect` field is a human readable description and the `stats` field
 * contains numeric modifiers that will be aggregated during combat.
 */
interface SetBonus {
  piecesRequired: number;
  effect: string;
  stats: {
    damage?: number;
    armor?: number;
    strength?: number;
    dexterity?: number;
    intelligence?: number;
    mana?: number;
  };
}

/**
 * A set definition enumerates all of the items within the set along with
 * baseline stats for each item and the bonus thresholds. New sets can be
 * added here without modifying the rest of the loot generator.
 */
interface SetDefinition {
  items: Array<{ name: string; type: Item['type']; baseDamage?: number; baseArmor?: number }>;
  bonuses: SetBonus[];
}

const SET_DEFINITIONS: Record<string, SetDefinition> = {
  // Berserker's Fury – strength/armor focused set for melee builds
  "Berserker's Fury": {
    items: [
      { name: "Berserker's Helm", type: 'helmet', baseArmor: 5 },
      { name: "Berserker's Plate", type: 'melee_armor', baseArmor: 9 },
      { name: "Berserker's Greaves", type: 'boots', baseArmor: 4 },
      { name: "Berserker's Axe", type: 'melee_weapon', baseDamage: 12 },
    ],
    bonuses: [
      {
        piecesRequired: 2,
        effect: '+5 Strength',
        stats: { strength: 5 },
      },
      {
        piecesRequired: 3,
        effect: '+10% Damage',
        stats: { damage: 5 },
      },
      {
        piecesRequired: 4,
        effect: '+5 Armor',
        stats: { armor: 5 },
      },
    ],
  },
  // Ranger's Focus – dexterity based set for ranged builds
  "Ranger's Focus": {
    items: [
      { name: "Ranger's Hood", type: 'helmet', baseArmor: 4 },
      { name: "Ranger's Jacket", type: 'ranged_armor', baseArmor: 8 },
      { name: "Ranger's Boots", type: 'boots', baseArmor: 4 },
      { name: "Ranger's Bow", type: 'ranged_weapon', baseDamage: 10 },
    ],
    bonuses: [
      {
        piecesRequired: 2,
        effect: '+5 Dexterity',
        stats: { dexterity: 5 },
      },
      {
        piecesRequired: 3,
        effect: '+10% Damage',
        stats: { damage: 4 },
      },
      {
        piecesRequired: 4,
        effect: '+5 Armor',
        stats: { armor: 4 },
      },
    ],
  },
  // Archmage's Regalia – intelligence/mana focused set
  "Archmage's Regalia": {
    items: [
      { name: "Archmage's Circlet", type: 'helmet', baseArmor: 3 },
      { name: "Archmage's Robes", type: 'mage_armor', baseArmor: 7 },
      { name: "Archmage's Slippers", type: 'boots', baseArmor: 3 },
      { name: "Archmage's Staff", type: 'mage_weapon', baseDamage: 11 },
    ],
    bonuses: [
      {
        piecesRequired: 2,
        effect: '+5 Intelligence',
        stats: { intelligence: 5 },
      },
      {
        piecesRequired: 3,
        effect: '+20 Mana',
        stats: { mana: 20 },
      },
      {
        piecesRequired: 4,
        effect: '+10% Damage',
        stats: { damage: 5 },
      },
    ],
  },
};

/**
 * Generate a random set item from any of the defined sets. The item will
 * include its set name and a copy of the bonuses defined in the set
 * definition. Damage/armor values are scaled based on floor and enemy
 * level similarly to ordinary items.
 */
export function generateSetItem(enemyLevel: number, floor: number): Partial<Item> {
  // Pick a random set
  const setNames = Object.keys(SET_DEFINITIONS);
  const setName = setNames[Math.floor(Math.random() * setNames.length)];
  const setDef = SET_DEFINITIONS[setName];

  // Choose a random item within the set
  const piece = setDef.items[Math.floor(Math.random() * setDef.items.length)];

  // Scale base stats in a similar way to normal items
  const factor = enemyLevel + floor * 0.5;
  let damage: number | undefined;
  let armor: number | undefined;
  if (piece.baseDamage !== undefined) {
    const base = piece.baseDamage + factor * 1.5;
    const spread = factor;
    damage = Math.round(base + Math.random() * spread);
  } else if (piece.baseArmor !== undefined) {
    const base = piece.baseArmor + factor;
    const spread = factor * 0.8;
    armor = Math.round(base + Math.random() * spread);
  }

  // Copy bonuses to avoid accidental mutation
  const setBonuses: SetBonus[] = setDef.bonuses.map((b) => ({
    piecesRequired: b.piecesRequired,
    effect: b.effect,
    stats: { ...b.stats },
  }));

  const { requiredLevel, requiredStats } = calculateItemRequirements(
    piece.type,
    'set',
    enemyLevel,
    floor,
  );

  const affixes = generateAffixesForItem('set', piece.type, 'set');
  return {
    name: piece.name,
    type: piece.type,
    rarity: 'set',
    damage,
    armor,
    value: Math.round((damage || armor || 1) * 5),
    equipped: false,
    setName,
    setBonuses,
    affixes,
    required_level: requiredLevel,
    required_stats: requiredStats,
  };
}

/**
 * Compute aggregated set bonuses given a collection of equipped items. This
 * function returns a summary of all stat modifiers granted by active set
 * bonuses. It is up to the caller to apply these modifiers to combat
 * calculations.
 */
export function computeSetBonuses(equippedItems: Item[]): {
  damage: number;
  armor: number;
  strength: number;
  dexterity: number;
  intelligence: number;
  mana: number;
} {
  // Group items by set
  const counts: Record<string, number> = {};
  const bonuses: Record<string, SetBonus[]> = {};

  for (const item of equippedItems) {
    if (item.rarity === 'set' && item.setName && item.setBonuses) {
      counts[item.setName] = (counts[item.setName] || 0) + 1;
      bonuses[item.setName] = item.setBonuses;
    }
  }

  const total = {
    damage: 0,
    armor: 0,
    strength: 0,
    dexterity: 0,
    intelligence: 0,
    mana: 0,
  };

  for (const setName of Object.keys(counts)) {
    const pieceCount = counts[setName];
    const setBonuses = bonuses[setName];
    if (!setBonuses) continue;
    for (const bonus of setBonuses) {
      if (pieceCount >= bonus.piecesRequired) {
        const stats = bonus.stats;
        if (stats.damage) total.damage += stats.damage;
        if (stats.armor) total.armor += stats.armor;
        if (stats.strength) total.strength += stats.strength;
        if (stats.dexterity) total.dexterity += stats.dexterity;
        if (stats.intelligence) total.intelligence += stats.intelligence;
        if (stats.mana) total.mana += stats.mana;
      }
    }
  }

  return total;
}

// ----------------- ENEMY GENERATION -----------------

export function generateEnemy(floor: number, playerLevel: number, zoneHeat: number = 0): Enemy {
  // Scale enemy level more aggressively based on floor
  const level = playerLevel + Math.floor(floor * 0.5);
  const baseName = enemyNames[Math.floor(Math.random() * enemyNames.length)];

  const rarityRoll = Math.random();
  let rarity: 'normal' | 'rare' | 'elite' | 'boss';
  let multiplier = 1;
  let titlePrefix = '';

  // zoneHeat expected 0..100 — convert to 0..1
  const heatBoost = Math.max(0, Math.min(100, zoneHeat)) / 100;
  // Depth factor: early floors mostly normal, deeper floors see more rare/elite
  const depth = Math.max(0, floor - 1);
  const clampedDepth = Math.min(depth, 30); // cap influence around floor ~31+
  const depthNorm = clampedDepth / 30; // 0..1

  // Base thresholds for low floors
  const baseNormal = 0.93;
  const baseRare = 0.985;
  const baseElite = 0.998;

  // How much thresholds relax by maximum depth
  const normalDrop = 0.18; // normal 0.93 -> ~0.75 at high floors
  const rareDrop = 0.03; // rare 0.985 -> ~0.955
  const eliteDrop = 0.01; // elite 0.998 -> ~0.988

  const depthFactor = depthNorm;

  // Shift rarity thresholds upward as heat increases (more rares/elites/bosses)
  const normalThreshold = baseNormal - normalDrop * depthFactor - heatBoost * 0.05;
  const rareThreshold = baseRare - rareDrop * depthFactor - heatBoost * 0.03;
  const eliteThreshold = baseElite - eliteDrop * depthFactor - heatBoost * 0.01;

  if (rarityRoll < normalThreshold) {
    rarity = 'normal';
  } else if (rarityRoll < rareThreshold) {
    rarity = 'rare';
    multiplier = 1.5;
    titlePrefix = 'Rare ';
  } else if (rarityRoll < eliteThreshold) {
    rarity = 'elite';
    multiplier = 2.5;
    titlePrefix = 'Elite ';
  } else {
    rarity = 'boss';
    multiplier = 4;
    titlePrefix = 'Boss ';
  }

  // Difficulty scales with heat: at 100 heat enemies can be up to +100% stronger
  const difficultyScale = 1 + heatBoost;
  multiplier = multiplier * difficultyScale;

  const maxHealth = Math.floor((30 + level * 15 + floor * 5 + Math.random() * 20) * multiplier);
  const damage = Math.floor((5 + level * 3 + floor * 1.5) * multiplier);
  const experience = Math.floor((20 + level * 10 + floor * 5) * multiplier);
  // Gold scales with floor and rarity more explicitly so that deeper
  // floors and higher rarity enemies feel more rewarding. Early floors
  // guarantee at least a small handful of gold so that players always
  // feel rewarded (roughly 1–4 gold from floor 1 normals).
  const baseGold = 4 + level * 2 + floor * 3;
  const rarityGoldMult =
    rarity === 'normal' ? 1 : rarity === 'rare' ? 1.6 : rarity === 'elite' ? 2.4 : 3.5;
  let gold = Math.floor((baseGold + Math.random() * (4 + floor * 1.5)) * rarityGoldMult);
  if (floor <= 3 && rarity === 'normal') {
    gold = Math.max(1, Math.min(gold, 4));
  }

  return {
    id: Math.random().toString(36).substr(2, 9),
    name: `${titlePrefix}${baseName} (Lvl ${level})`,
    health: maxHealth,
    max_health: maxHealth,
    damage,
    experience,
    gold,
    level,
    rarity,
  };
}

// Variant enemy generator used by floor exploration events
export function generateEnemyVariant(
  kind: 'enemy' | 'rareEnemy' | 'miniBoss' | 'mimic' | 'boss',
  floor: number,
  playerLevel: number,
  zoneHeat: number = 0,
): Enemy {
  if (kind === 'enemy') return generateEnemy(floor, playerLevel, zoneHeat);

  // Base enemy as template
  const base = generateEnemy(floor, playerLevel, zoneHeat);

  switch (kind) {
    case 'rareEnemy': {
      return {
        ...base,
        name: `Rare ${base.name}`,
        health: Math.floor(base.health * 1.3),
        max_health: Math.floor(base.max_health * 1.3),
        damage: Math.floor(base.damage * 1.25),
        experience: Math.floor(base.experience * 1.4),
        gold: Math.floor(base.gold * 1.5),
        rarity: 'rare',
      };
    }
    case 'miniBoss': {
      return {
        ...base,
        name: `Mini Boss ${base.name}`,
        health: Math.floor(base.health * 2.0),
        max_health: Math.floor(base.max_health * 2.0),
        damage: Math.floor(base.damage * 1.8),
        experience: Math.floor(base.experience * 2.2),
        gold: Math.floor(base.gold * 2.0),
        rarity: 'elite',
      };
    }
    case 'mimic': {
      // Mimics: low HP, high damage spike, big loot (gold/exp)
      return {
        ...base,
        name: `Mimic Chest (${playerLevel})`,
        health: Math.floor(base.health * 0.6),
        max_health: Math.floor(base.max_health * 0.6),
        damage: Math.floor(base.damage * 2.2),
        experience: Math.floor(base.experience * 2.5),
        gold: Math.floor(base.gold * 3.0),
        rarity: 'elite',
      };
    }
    case 'boss': {
      // Boss floors every 10: very high stats, ensures tough encounter
      return {
        ...base,
        name: `Floor ${floor} Boss ${base.name}`,
        health: Math.floor(base.health * 3.0),
        max_health: Math.floor(base.max_health * 3.0),
        damage: Math.floor(base.damage * 2.5),
        experience: Math.floor(base.experience * 3.5),
        gold: Math.floor(base.gold * 4.0),
        rarity: 'boss',
      };
    }
    default:
      return base;
  }
}

// ----------------- LOOT GENERATION (NEW SYSTEM) -----------------

// Enemy loot rarity tiers. We keep common/magic reserved for merchants
// and chest-like sources; combat drops are rare+ only.
const BASE_RARITY_WEIGHTS = {
  rare: 1,
  epic: 0.4,
  legendary: 0.08,
  mythic: 0.02,
  set: 0.015,
  radiant: 0.008,
};

type RarityKey = keyof typeof BASE_RARITY_WEIGHTS | 'common' | 'magic';

/**
 * Rarity selection tuned so that:
 * - Normal enemies: rare drop ≈5% on low floors
 * - Rare enemies: ≈10%
 * - Elite enemies: ≈15%
 * - Mini-bosses: ≈25% (treated as "elite" rarity for odds)
 *
 * Higher tiers (epic, legendary, mythic, set, radiant) are strictly
 * rarer than rare and scale modestly with depth and zone heat.
 */
function pickRarity(
  enemyRarity: 'normal' | 'rare' | 'elite' | 'boss',
  zoneHeat: number = 0,
  floor: number = 1,
): RarityKey {
  // Effective "rare+" drop chance baseline per enemy rarity.
  let baseRareChance = 0.05; // normal
  if (enemyRarity === 'rare') baseRareChance = 0.1;
  else if (enemyRarity === 'elite') baseRareChance = 0.15;
  else if (enemyRarity === 'boss') baseRareChance = 0.25; // treat bosses/mini-bosses as 25%+

  // Scale slightly with depth (up to +50% at very deep floors)
  const depth = Math.max(0, floor - 1);
  const depthNorm = Math.min(depth, 40) / 40; // 0..1
  const depthMultiplier = 1 + depthNorm * 0.5;

  // Zone heat 0..100 gives up to +50% more chance
  const heatBoost = Math.max(0, Math.min(100, zoneHeat)) / 100;
  const heatMultiplier = 1 + heatBoost * 0.5;

  let rarePlusChance = baseRareChance * depthMultiplier * heatMultiplier;
  // Never exceed 60% so items remain special
  rarePlusChance = Math.min(0.6, rarePlusChance);

  if (Math.random() >= rarePlusChance) {
    // No item or lower-tier handled by caller; we return 'common' as a sentinel
    return 'common';
  }

  // Within a successful rare+ roll, split across high tiers.
  // These are relative weights and DO NOT affect overall drop chance.
  const weights = { ...BASE_RARITY_WEIGHTS };

  // Enemy rarity biases toward higher tiers without breaking ordering
  if (enemyRarity === 'rare') {
    weights.epic += 0.2;
  } else if (enemyRarity === 'elite') {
    weights.epic += 0.4;
    weights.legendary += 0.1;
  } else if (enemyRarity === 'boss') {
    weights.epic += 0.8;
    weights.legendary += 0.25;
    weights.mythic += 0.05;
    weights.set += 0.03;
  }

  // Depth pushes slightly toward top tiers
  if (depthNorm > 0) {
    const d = depthNorm;
    weights.epic *= 1 + d * 0.4;
    weights.legendary *= 1 + d * 0.7;
    weights.mythic *= 1 + d * 1.0;
    weights.set *= 1 + d * 0.9;
    weights.radiant *= 1 + d * 1.2;
  }

  // Heat boosts jackpots a bit more
  if (heatBoost > 0) {
    const h = heatBoost;
    weights.epic *= 1 + h * 0.6;
    weights.legendary *= 1 + h * 1.0;
    weights.mythic *= 1 + h * 1.4;
    weights.set *= 1 + h * 1.3;
    weights.radiant *= 1 + h * 1.6;
  }

  const total = Object.values(weights).reduce((s, v) => s + v, 0);
  let roll = Math.random() * total;

  for (const key of Object.keys(weights) as (keyof typeof BASE_RARITY_WEIGHTS)[]) {
    if (roll < weights[key]) return key;
    roll -= weights[key];
  }
  return 'rare';
}

// Deprecated direct type pools; theme-aware weighted pools used instead

function randomFrom<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

// Theme helper based on floor (0..3 cycling): 0=dungeon, 1=lava, 2=ice, 3=jungle
export type FloorTheme = 'dungeon' | 'lava' | 'ice' | 'jungle';
export function getFloorThemeByFloor(floor: number): FloorTheme {
  const idx = floor % 4;
  return idx === 1 ? 'lava' : idx === 2 ? 'ice' : idx === 3 ? 'jungle' : 'dungeon';
}

function rollBaseStats(itemType: string, level: number, floor: number, rarity: RarityKey) {
  const factor = level + floor * 0.5;
  const mult =
    rarity === 'common'
      ? 1
      : rarity === 'magic'
        ? 1.25
        : rarity === 'rare'
          ? 1.6
          : rarity === 'epic'
            ? 2.1
            : rarity === 'legendary'
              ? 2.8
              : rarity === 'mythic'
                ? 3.5
                : rarity === 'set'
                  ? 3.2
                  : rarity === 'radiant'
                    ? 4.0
                    : 2.8;

  if (itemType.endsWith('_weapon')) {
    const base = 3 + factor * 2;
    const spread = factor * 1.5;
    const damage = Math.round((base + Math.random() * spread) * mult);
    return { damage, armor: undefined };
  }

  const base = 2 + factor * 1.2;
  const spread = factor;
  const armor = Math.round((base + Math.random() * spread) * mult);
  return { damage: undefined, armor };
}

/**
 * Calculate level and stat requirements for an item based on type, rarity, and floor.
 * Requirements scale with rarity tier and floor level.
 */
function calculateItemRequirements(
  itemType: string,
  rarity: RarityKey,
  level: number,
  floor: number,
): {
  requiredLevel?: number;
  requiredStats?: { strength?: number; dexterity?: number; intelligence?: number };
} {
  const rarityMultiplier: Record<RarityKey, number> = {
    common: 0.5,
    magic: 0.75,
    rare: 1.0,
    epic: 1.3,
    legendary: 1.6,
    mythic: 1.9,
    set: 1.8,
    radiant: 2.1,
  };

  const baseLevel = Math.max(1, Math.floor(level * 0.8 + floor * 0.3));
  const calculatedLevel = Math.ceil(baseLevel * rarityMultiplier[rarity]);

  // Only enforce requirements for items that would be level 5+
  // This allows early game progression without restrictions
  const requiredLevel = calculatedLevel >= 5 ? calculatedLevel : undefined;

  const requiredStats: { strength?: number; dexterity?: number; intelligence?: number } = {};

  // Only add stat requirements if level requirement is being enforced (5+)
  if (requiredLevel && requiredLevel >= 5) {
    // Assign stat requirements based on item type
    if (itemType === 'melee_weapon' || itemType === 'melee_armor') {
      const baseStr = Math.max(1, Math.floor(level * 0.4 + floor * 0.2));
      requiredStats.strength = Math.ceil(baseStr * rarityMultiplier[rarity]);
    } else if (itemType === 'ranged_weapon' || itemType === 'ranged_armor') {
      const baseDex = Math.max(1, Math.floor(level * 0.4 + floor * 0.2));
      requiredStats.dexterity = Math.ceil(baseDex * rarityMultiplier[rarity]);
    } else if (itemType === 'mage_weapon' || itemType === 'mage_armor') {
      const baseInt = Math.max(1, Math.floor(level * 0.4 + floor * 0.2));
      requiredStats.intelligence = Math.ceil(baseInt * rarityMultiplier[rarity]);
    } else if (itemType === 'amulet' || itemType === 'ring') {
      // Trinkets require balanced stats
      const baseStat = Math.max(1, Math.floor(level * 0.3 + floor * 0.15));
      requiredStats.strength = Math.ceil(baseStat * rarityMultiplier[rarity] * 0.7);
      requiredStats.dexterity = Math.ceil(baseStat * rarityMultiplier[rarity] * 0.7);
      requiredStats.intelligence = Math.ceil(baseStat * rarityMultiplier[rarity] * 0.7);
    } else if (itemType === 'gloves' || itemType === 'belt' || itemType === 'boots') {
      // Accessories require moderate stats across the board
      const baseStat = Math.max(1, Math.floor(level * 0.25 + floor * 0.15));
      requiredStats.strength = Math.ceil(baseStat * rarityMultiplier[rarity] * 0.6);
      requiredStats.dexterity = Math.ceil(baseStat * rarityMultiplier[rarity] * 0.6);
    }
  }

  return {
    requiredLevel,
    requiredStats: Object.keys(requiredStats).length > 0 ? requiredStats : undefined,
  };
}

// ----------------- AFFIX GENERATION (NEW SYSTEM) -----------------
// Number of affixes allowed per rarity tier.
const RARITY_AFFIX_CAP: Record<RarityKey, number> = {
  common: 0,
  magic: 1,
  rare: 2,
  epic: 3,
  legendary: 4,
  mythic: 5,
  set: 5,
  radiant: 6,
};

// Scalar multiplier for affix value scaling.
const RARITY_SCALAR: Record<RarityKey, number> = {
  common: 1,
  magic: 1.15,
  rare: 1.35,
  epic: 1.65,
  legendary: 2.0,
  mythic: 2.4,
  set: 2.2,
  radiant: 2.8,
};

const WEAPON_AFFIX_STATS: Affix['stat'][] = [
  'fire_damage',
  'ice_damage',
  'lightning_damage',
  'crit_chance',
  'crit_damage',
  'speed',
];
const ARMOR_AFFIX_STATS: Affix['stat'][] = [
  'crit_chance',
  'crit_damage',
  'speed',
  'mana',
  'health',
];

function rollAffixValue(stat: Affix['stat'], scalar: number): number {
  switch (stat) {
    case 'fire_damage':
    case 'ice_damage':
    case 'lightning_damage':
      return Math.round((3 + Math.random() * 5) * scalar);
    case 'crit_chance':
      return Math.round((1 + Math.random() * 2) * scalar * 10) / 10; // percentage points
    case 'crit_damage':
      return Math.round((5 + Math.random() * 8) * scalar); // percentage points
    case 'speed':
      return Math.round((0.2 + Math.random() * 0.5) * scalar * 10) / 10;
    case 'mana':
      return Math.round((5 + Math.random() * 15) * scalar);
    case 'health':
      return Math.round((10 + Math.random() * 25) * scalar);
    case 'strength':
    case 'dexterity':
    case 'intelligence':
      return Math.round((2 + Math.random() * 6) * scalar);
    case 'damage':
    case 'armor':
      return Math.round((2 + Math.random() * 6) * scalar);
    default:
      return Math.round((2 + Math.random() * 5) * scalar);
  }
}

function affixDisplayName(stat: Affix['stat']): string {
  switch (stat) {
    case 'fire_damage':
      return 'of Flames';
    case 'ice_damage':
      return 'of Frost';
    case 'lightning_damage':
      return 'of Storms';
    case 'crit_chance':
      return 'of Precision';
    case 'crit_damage':
      return 'of Cruelty';
    case 'speed':
      return 'of Swiftness';
    case 'mana':
      return 'of Mana';
    case 'health':
      return 'of Vitality';
    case 'strength':
      return 'of Strength';
    case 'dexterity':
      return 'of Dexterity';
    case 'intelligence':
      return 'of Intelligence';
    case 'damage':
      return 'of Power';
    case 'armor':
      return 'of Protection';
    default:
      return 'Enchanted';
  }
}

export function generateAffixesForItem(
  rarity: RarityKey,
  itemType: Item['type'],
  context: 'normal' | 'set' | 'boss' = 'normal',
): Affix[] {
  // Dynamic chance: base 5%, +1% per rarity tier, elevated for set/boss.
  const base = 0.05;
  const tierIndex = RARITY_ORDER.indexOf(rarity);
  let chance = base + tierIndex * 0.01; // rare (~7%), epic (~8%), legendary (~9%), mythic (~10%), radiant (~12%)
  if (context === 'set') chance = Math.max(chance, 0.25);
  if (context === 'boss') chance = Math.max(chance, 0.35);
  if (Math.random() > chance) return [];

  const cap = RARITY_AFFIX_CAP[rarity] || 0;
  if (cap === 0) return [];
  const scalar = RARITY_SCALAR[rarity] || 1;
  const isWeapon = ['melee_weapon', 'ranged_weapon', 'mage_weapon'].includes(itemType as string);
  const pool = isWeapon ? WEAPON_AFFIX_STATS : ARMOR_AFFIX_STATS;
  const affixes: Affix[] = [];
  const used = new Set<Affix['stat']>();
  while (affixes.length < cap && used.size < pool.length) {
    const stat = pool[Math.floor(Math.random() * pool.length)];
    if (used.has(stat)) continue;
    used.add(stat);
    const value = rollAffixValue(stat, scalar);
    affixes.push({ name: affixDisplayName(stat), stat, value });
  }
  return affixes;
}

export function generateLoot(
  enemyLevel: number,
  floor: number,
  enemyRarity: 'normal' | 'rare' | 'elite' | 'boss' = 'normal',
  zoneHeat: number = 0,
): Partial<Item> | null {
  // Base no-drop chance & gold guarantee:
  // - On early floors (1–3), player should always get some gold
  //   (even if no item drops) to keep progression steady.
  // - Rare+ items are uncommon at low depth (e.g. rare ~5% event).
  const heatBoost = Math.max(0, Math.min(100, zoneHeat)) / 100;
  const depth = Math.max(0, floor - 1);
  const depthNorm = Math.min(depth, 40) / 40; // 0..1 at deep floors

  // Boss/elite variants should have a lower no-drop chance than normals.
  let noDrop = enemyRarity === 'boss' || enemyRarity === 'elite' ? 0.18 : 0.28;
  // Slightly lower no-drop on deeper floors and at higher heat, but
  // never below ~8% so there is always a chance of no loot.
  const dropScale = 1 - depthNorm * 0.3 - heatBoost * 0.35;
  noDrop = Math.max(0.08, noDrop * Math.max(0.5, dropScale));
  if (Math.random() < noDrop) return null;

  // Chance to drop a set item independent of normal rarity. Set items are
  // extremely rare but provide powerful bonuses when multiple pieces are
  // equipped. If a set item drops, normal loot generation is skipped.
  const baseSet = 0.003; // 0.3% at floor1/low heat
  const depthFactor = depthNorm * 0.01; // up to +1% from depth
  const heatFactor = heatBoost * 0.015; // up to +1.5% from heat
  const SET_DROP_CHANCE = baseSet + depthFactor + heatFactor;
  if (Math.random() < SET_DROP_CHANCE) {
    return generateSetItem(enemyLevel, floor);
  }

  const rarity = pickRarity(enemyRarity, zoneHeat, floor);
  if (rarity === 'common' || rarity === 'magic') {
    // Sentinel from pickRarity meaning "no rare+ item"; caller already
    // passed the no-drop roll above, so treat this as "no item".
    return null;
  }
  const theme = getFloorThemeByFloor(floor);
  // Bias weapon vs armor by theme
  let weaponChance = 0.6;
  if (theme === 'lava') weaponChance = 0.7; // more weapons
  if (theme === 'ice') weaponChance = 0.5; // more armor/mana gear
  if (theme === 'jungle') weaponChance = 0.55; // slightly armor heavy
  const isWeapon = Math.random() < weaponChance;

  // Bias type selection within category
  let type: Item['type'];
  if (isWeapon) {
    const weighted: Item['type'][] = [];
    if (theme === 'lava') {
      weighted.push('melee_weapon', 'melee_weapon', 'melee_weapon', 'ranged_weapon', 'mage_weapon');
    } else if (theme === 'ice') {
      weighted.push('mage_weapon', 'mage_weapon', 'ranged_weapon', 'melee_weapon');
    } else if (theme === 'jungle') {
      weighted.push('ranged_weapon', 'ranged_weapon', 'melee_weapon', 'mage_weapon');
    } else {
      weighted.push('melee_weapon', 'ranged_weapon', 'mage_weapon');
    }
    type = randomFrom(weighted);
  } else {
    const weighted: Item['type'][] = [];
    if (theme === 'lava') {
      weighted.push('melee_armor', 'gloves', 'belt', 'boots', 'ring');
    } else if (theme === 'ice') {
      weighted.push('mage_armor', 'amulet', 'ring', 'boots');
    } else if (theme === 'jungle') {
      weighted.push('ranged_armor', 'boots', 'gloves', 'belt');
    } else {
      weighted.push('melee_armor', 'boots', 'gloves', 'belt', 'ring', 'amulet');
    }
    type = randomFrom(weighted);
  }
  const { damage, armor } = rollBaseStats(type, enemyLevel, floor, rarity);

  // Theme-influenced name prefixes
  const prefixes =
    type === 'melee_weapon'
      ? theme === 'lava'
        ? ['Molten', 'Blazing', 'Charred', 'Infernal']
        : theme === 'ice'
          ? ['Frosted', 'Glacial', 'Icy', 'Snowbound']
          : theme === 'jungle'
            ? ['Vinewoven', 'Hunter', 'Wild', 'Primal']
            : ['Rusty', 'Jagged', 'Savage', 'Dread']
      : type === 'ranged_weapon'
        ? theme === 'jungle'
          ? ["Hunter's", "Stalker's", 'Sharpshot', 'Wild']
          : theme === 'ice'
            ? ['Cold', 'Aurora', 'Storm', 'Glacial']
            : theme === 'lava'
              ? ['Smoldering', 'Ashen', 'Storm', 'Scorching']
              : ['Cracked', "Hunter's", 'Sharpshot', 'Storm']
        : type === 'mage_weapon'
          ? theme === 'ice'
            ? ['Frostweaver', 'Mystic', 'Arcane', 'Eldritch']
            : theme === 'lava'
              ? ["Pyromancer's", 'Mystic', 'Infernal', 'Eldritch']
              : ['Apprentice', 'Mystic', 'Arcane', 'Eldritch']
          : type === 'ring'
            ? ['Mystic', 'Arcane', 'Enchanted', 'Ethereal']
            : type === 'gloves'
              ? ['Leather', 'Iron', 'Reinforced', 'Blessed']
              : type === 'belt'
                ? ['Sturdy', 'Reinforced', "Guardian's", "Warden's"]
                : type === 'boots'
                  ? ['Worn', 'Sturdy', 'Swift', "Guardian's"]
                  : ['Worn', 'Sturdy', "Guardian's", 'Ward'];

  const bases =
    type === 'melee_weapon'
      ? ['Sword', 'Axe', 'Mace', 'Warhammer']
      : type === 'ranged_weapon'
        ? ['Bow', 'Crossbow', 'Longbow']
        : type === 'mage_weapon'
          ? ['Wand', 'Staff', 'Tome', 'Scepter']
          : type === 'amulet'
            ? ['Charm', 'Amulet', 'Talisman']
            : type === 'ring'
              ? ['Ring', 'Band', 'Signet', 'Loop']
              : type === 'gloves'
                ? ['Gloves', 'Gauntlets', 'Mitts', 'Bracers']
                : type === 'belt'
                  ? ['Belt', 'Girdle', 'Sash', 'Cinch']
                  : type === 'boots'
                    ? ['Boots', 'Footgear', 'Treads', 'Sabatons']
                    : ['Breastplate', 'Chainmail', 'Plate Armor'];

  const suffixes =
    theme === 'lava'
      ? ['of Embers', 'of Flames', 'of Ash', 'of the Furnace']
      : theme === 'ice'
        ? ['of Frost', 'of the Glacier', 'of Snow', 'of the Aurora']
        : theme === 'jungle'
          ? ['of the Hunt', 'of Vines', 'of the Wild', 'of the Canopy']
          : ['of Might', 'of the Fox', 'of Embers', 'of the Depths'];

  let name = `${randomFrom(prefixes)} ${randomFrom(bases)}`;
  // At this point rarity is rare+, so the check against 'common' is redundant.
  if (Math.random() < 0.7) {
    name += ` ${randomFrom(suffixes)}`;
  }

  const rawValue = damage || armor || 1;
  const multiplier =
    rarity === 'radiant'
      ? 8
      : rarity === 'mythic'
        ? 7
        : rarity === 'set'
          ? 7.5
          : rarity === 'legendary'
            ? 6
            : rarity === 'epic'
              ? 4
              : rarity === 'rare'
                ? 3
                : rarity === 'magic'
                  ? 2
                  : 1.2;

  const value = Math.round(rawValue * multiplier);

  const { requiredLevel, requiredStats } = calculateItemRequirements(
    type,
    rarity,
    enemyLevel,
    floor,
  );
  const affixes = generateAffixesForItem(rarity, type, 'normal');
  return {
    name,
    type,
    rarity,
    damage,
    armor,
    value,
    equipped: false,
    affixes,
    required_level: requiredLevel,
    required_stats: requiredStats,
  };
}

// ----------------- SPECIAL LOOT HELPERS -----------------

const RARITY_ORDER: RarityKey[] = [
  'common',
  'magic',
  'rare',
  'epic',
  'legendary',
  'mythic',
  'set',
  'radiant',
];
function rarityIndex(r: RarityKey) {
  return RARITY_ORDER.indexOf(r);
}

// Boss-exclusive unique loot table (always legendary or higher)
interface BossUniqueItem {
  name: string;
  type: Item['type'];
  rarity: RarityKey;
  damageBonus?: number; // multiplier over baseline
  armorBonus?: number;
}

const BOSS_UNIQUE_ITEMS: BossUniqueItem[] = [
  { name: "Flamebringer's Edge", type: 'melee_weapon', rarity: 'legendary', damageBonus: 1.5 },
  { name: 'Shadowfang Blade', type: 'melee_weapon', rarity: 'mythic', damageBonus: 2.0 },
  { name: 'Voidcrusher Hammer', type: 'melee_weapon', rarity: 'legendary', damageBonus: 1.6 },
  { name: 'Deathwhisper Bow', type: 'ranged_weapon', rarity: 'legendary', damageBonus: 1.4 },
  { name: 'Stormcaller Crossbow', type: 'ranged_weapon', rarity: 'mythic', damageBonus: 1.8 },
  { name: 'Soulreaver Staff', type: 'mage_weapon', rarity: 'legendary', damageBonus: 1.5 },
  { name: 'Netherstorm Scepter', type: 'mage_weapon', rarity: 'mythic', damageBonus: 1.9 },
  { name: 'Dreadplate Armor', type: 'melee_armor', rarity: 'legendary', armorBonus: 1.5 },
  { name: 'Dragonscale Cuirass', type: 'melee_armor', rarity: 'mythic', armorBonus: 2.0 },
  { name: 'Phantom Cloak', type: 'ranged_armor', rarity: 'legendary', armorBonus: 1.4 },
  { name: 'Voidweave Robes', type: 'mage_armor', rarity: 'legendary', armorBonus: 1.3 },
  { name: 'Celestial Vestments', type: 'mage_armor', rarity: 'mythic', armorBonus: 1.7 },
  { name: 'Crown of the Damned', type: 'helmet', rarity: 'radiant', armorBonus: 2.2 },
  { name: 'Ring of Eternal Fire', type: 'ring', rarity: 'legendary', armorBonus: 1.0 },
  { name: 'Amulet of the Abyss', type: 'amulet', rarity: 'mythic', armorBonus: 1.2 },
];

function generateBossUniqueItem(enemyLevel: number, floor: number): Partial<Item> {
  const template = BOSS_UNIQUE_ITEMS[Math.floor(Math.random() * BOSS_UNIQUE_ITEMS.length)];
  const factor = enemyLevel + floor * 0.5;

  let damage: number | undefined;
  let armor: number | undefined;

  if (template.damageBonus) {
    const base = (5 + factor * 2.5) * template.damageBonus;
    damage = Math.round(base + Math.random() * factor);
  }
  if (template.armorBonus) {
    const base = (3 + factor * 1.8) * template.armorBonus;
    armor = Math.round(base + Math.random() * factor * 0.6);
  }

  const { requiredLevel, requiredStats } = calculateItemRequirements(
    template.type,
    template.rarity,
    enemyLevel,
    floor,
  );
  const value = Math.round(
    (damage || armor || 1) *
      (template.rarity === 'radiant' ? 10 : template.rarity === 'mythic' ? 8 : 6),
  );
  const affixes = generateAffixesForItem(template.rarity, template.type, 'boss');

  return {
    name: template.name,
    type: template.type,
    rarity: template.rarity,
    damage,
    armor,
    value,
    equipped: false,
    affixes,
    required_level: requiredLevel,
    required_stats: requiredStats,
  };
}

function generateGuaranteedLoot(
  enemyLevel: number,
  floor: number,
  zoneHeat: number,
  minRarity: RarityKey,
): Partial<Item> {
  let attempts = 0;
  let loot: Partial<Item> | null = null;
  while (attempts < 10) {
    // For guaranteed boss/mimic loot, bias upward but still respect
    // floor depth / heat scaling. On very low floors this will still
    // mostly produce rare/epic, with higher tiers showing up more
    // often only later.
    loot = generateLoot(enemyLevel, floor, 'boss', zoneHeat);
    if (loot && rarityIndex(loot.rarity as RarityKey) >= rarityIndex(minRarity)) break;
    attempts++;
  }
  if (!loot) {
    // Fallback basic item meeting minimum rarity by forcing armor piece
    loot = {
      name: `${minRarity[0].toUpperCase()}${minRarity.slice(1)} Trophy`,
      type: 'melee_armor',
      rarity: minRarity,
      armor: 5 + floor,
      value: 25 + floor * 5,
      equipped: false,
      required_level: Math.max(1, Math.floor(enemyLevel * 0.8)),
    };
  }
  // Ensure snake_case requirement fields exist if coming from generateLoot (which uses required_level etc.)
  const lootWithRequirements = loot as Partial<Item> & {
    requiredLevel?: number;
    requiredStats?: Item['required_stats'];
  };
  if (lootWithRequirements.requiredLevel && !lootWithRequirements.required_level) {
    lootWithRequirements.required_level = lootWithRequirements.requiredLevel;
  }
  if (lootWithRequirements.requiredStats && !lootWithRequirements.required_stats) {
    lootWithRequirements.required_stats = lootWithRequirements.requiredStats;
  }
  return loot;
}

export function generateBossLoot(
  enemyLevel: number,
  floor: number,
  zoneHeat: number,
): Partial<Item>[] {
  const drops: Partial<Item>[] = [];
  // One guaranteed boss-exclusive unique item (legendary+)
  drops.push(generateBossUniqueItem(enemyLevel, floor));
  // One guaranteed rare+ item from regular loot table
  drops.push(generateGuaranteedLoot(enemyLevel, floor, zoneHeat, 'rare'));
  // 40% chance for third epic+ item
  if (Math.random() < 0.4) {
    drops.push(generateGuaranteedLoot(enemyLevel, floor, zoneHeat, 'epic'));
  }
  return drops;
}

export function generateMimicLoot(
  enemyLevel: number,
  floor: number,
  zoneHeat: number,
): Partial<Item>[] {
  const drops: Partial<Item>[] = [];
  // One guaranteed rare+ item (common/magic excluded from combat)
  drops.push(generateGuaranteedLoot(enemyLevel, floor, zoneHeat, 'rare'));
  // 30% chance for second epic+ item
  if (Math.random() < 0.3) {
    drops.push(generateGuaranteedLoot(enemyLevel, floor, zoneHeat, 'epic'));
  }
  return drops;
}
// ----------------- MERCHANT INVENTORY -----------------
export function generateMerchantInventory(playerLevel: number, floor: number): Partial<Item>[] {
  const items: Partial<Item>[] = [];
  const HIGH_TIER_CHANCE = 0.12; // 12% chance one slot is legendary+
  const highSlot = Math.random() < HIGH_TIER_CHANCE ? Math.floor(Math.random() * 3) : -1;
  const highWeights: { rarity: RarityKey; w: number }[] = [
    { rarity: 'epic', w: 50 },
    { rarity: 'legendary', w: 25 },
    { rarity: 'mythic', w: 15 },
    { rarity: 'radiant', w: 5 },
    { rarity: 'set', w: 5 },
  ];
  const totalHigh = highWeights.reduce((s, r) => s + r.w, 0);
  const rollHigh = () => {
    let r = Math.random() * totalHigh;
    for (const e of highWeights) {
      if (r < e.w) return e.rarity;
      r -= e.w;
    }
    return 'epic';
  };
  const lowRarity = () => (Math.random() < 0.65 ? 'common' : 'magic');
  for (let i = 0; i < 3; i++) {
    const rarity: RarityKey = i === highSlot ? rollHigh() : lowRarity();
    const weaponTypes: Item['type'][] = ['melee_weapon', 'ranged_weapon', 'mage_weapon'];
    const armorTypes: Item['type'][] = [
      'melee_armor',
      'ranged_armor',
      'mage_armor',
      'helmet',
      'boots',
      'gloves',
      'belt',
      'ring',
      'amulet',
    ];
    const isWeapon = Math.random() < 0.5;
    const type: Item['type'] = isWeapon
      ? weaponTypes[Math.floor(Math.random() * weaponTypes.length)]
      : armorTypes[Math.floor(Math.random() * armorTypes.length)];
    const { damage, armor } = rollBaseStats(type, playerLevel, floor, rarity);
    const { requiredLevel, requiredStats } = calculateItemRequirements(
      type,
      rarity,
      playerLevel,
      floor,
    );
    const affixes = generateAffixesForItem(rarity, type, 'normal');
    const baseName = isWeapon
      ? randomFrom(meleeWeapons.concat(rangedWeapons, mageWeapons))
      : type.replace(/_/g, ' ');
    const prefix =
      rarity === 'common'
        ? 'Simple'
        : rarity === 'magic'
          ? 'Enchanted'
          : rarity === 'epic'
            ? 'Majestic'
            : rarity === 'legendary'
              ? 'Ancient'
              : rarity === 'mythic'
                ? 'Mythic'
                : rarity === 'radiant'
                  ? 'Radiant'
                  : 'Set';
    const name = `${prefix} ${baseName}`;
    const valueMult =
      rarity === 'common'
        ? 1
        : rarity === 'magic'
          ? 2
          : rarity === 'rare'
            ? 3
            : rarity === 'epic'
              ? 5
              : rarity === 'legendary'
                ? 8
                : rarity === 'mythic'
                  ? 11
                  : rarity === 'radiant'
                    ? 14
                    : 10;
    const value = Math.round((damage || armor || 1) * valueMult);
    items.push({
      id: `merchant-${Date.now()}-${i}-${Math.random().toString(36).slice(2, 6)}`,
      name,
      type,
      rarity,
      damage,
      armor,
      value,
      equipped: false,
      affixes,
      required_level: requiredLevel,
      required_stats: requiredStats,
    });
  }
  return items;
}

// ----------------- RARITY COLORS -----------------

export function getRarityColor(rarity: string): string {
  switch (rarity) {
    case 'common':
      return 'text-gray-400';
    case 'magic':
      return 'text-blue-400';
    case 'rare':
      return 'text-yellow-400';
    case 'legendary':
      return 'text-orange-500';
    case 'epic':
      return 'text-purple-500';
    case 'mythic':
      return 'text-red-500';
    case 'radiant':
      return 'text-pink-400';
    case 'set':
      return 'text-green-400';
    case 'unique':
      return 'bg-gradient-to-r from-red-400 via-yellow-400 to-blue-400 bg-clip-text text-transparent';
    default:
      return 'text-gray-400';
  }
}

export function getRarityBgColor(rarity: string): string {
  switch (rarity) {
    case 'common':
      return 'bg-gray-700';
    case 'magic':
      return 'bg-blue-900';
    case 'rare':
      return 'bg-yellow-900';
    case 'legendary':
      return 'bg-orange-900';
    case 'epic':
      return 'bg-purple-900';
    case 'mythic':
      return 'bg-red-900';
    case 'radiant':
      return 'bg-pink-900';
    case 'set':
      return 'bg-green-900';
    case 'unique':
      return 'bg-gradient-to-r from-red-900 via-yellow-900 to-blue-900';
    default:
      return 'bg-gray-700';
  }
}

export function getRarityBorderColor(rarity: string): string {
  switch (rarity) {
    case 'common':
      return 'border-gray-600';
    case 'magic':
      return 'border-blue-500';
    case 'rare':
      return 'border-yellow-500';
    case 'legendary':
      return 'border-orange-500';
    case 'epic':
      return 'border-purple-500';
    case 'mythic':
      return 'border-red-500';
    case 'radiant':
      return 'border-pink-400';
    case 'set':
      return 'border-green-500';
    case 'unique':
      return 'border-transparent';
    default:
      return 'border-gray-600';
  }
}

// ----------------- ITEM SPRITES -----------------

/**
 * Lightweight sprite mapping for items. Returns an emoji or short glyph
 * representing the item visually without requiring external assets.
 */
export function getItemSprite(item: Item | Partial<Item>): string {
  const type = item.type;
  const name = item.name?.toLowerCase() || '';

  if (!type) return '📦';

  // Weapon sprites
  if (type === 'melee_weapon') {
    if (name.includes('axe')) return '🪓';
    if (name.includes('mace') || name.includes('hammer')) return '⚒️';
    if (name.includes('flail')) return '🔗';
    return '🗡️';
  }
  if (type === 'ranged_weapon') {
    if (name.includes('crossbow')) return '🏹';
    if (name.includes('longbow') || name.includes('bow')) return '🏹';
    return '🏹';
  }
  if (type === 'mage_weapon') {
    if (name.includes('staff')) return '🔮';
    if (name.includes('wand')) return '✨';
    if (name.includes('tome') || name.includes('scepter')) return '📜';
    return '🔮';
  }

  // Armor & gear sprites
  if (type === 'melee_armor') return '🛡️';
  if (type === 'ranged_armor') return '🧥';
  if (type === 'mage_armor') return '🧙‍♂️';
  if (type === 'helmet') return '🥽';
  if (type === 'boots') return '🥾';
  if (type === 'gloves') return '🧤';
  if (type === 'belt') return '🧷';

  // Trinkets
  if (type === 'ring') return '💍';
  if (type === 'amulet') return '📿';
  if (type === 'trinket') return '🎖️';

  // Consumables
  if (type === 'potion') return '🧪';

  // Fallback
  return '📦';
}

// ----------------- EQUIPMENT SLOT HELPERS -----------------

export type EquipmentSlot =
  | 'helmet'
  | 'chest'
  | 'boots'
  | 'weapon'
  | 'trinket'
  | 'amulet'
  | 'ring1'
  | 'ring2'
  | 'gloves'
  | 'belt';

export function getEquipmentSlot(item: Item): EquipmentSlot | null {
  if (item.type === 'potion') return null;

  // Handle trinkets
  if (item.type === 'trinket') {
    return 'trinket';
  }

  // Handle amulets
  if (item.type === 'amulet') {
    return 'amulet';
  }

  // Handle rings
  if (item.type === 'ring') {
    // Try to determine which ring slot based on name
    const nameLower = item.name.toLowerCase();
    if (nameLower.includes('ring') && nameLower.includes('1')) return 'ring1';
    if (nameLower.includes('ring') && nameLower.includes('2')) return 'ring2';
    // Default to first ring slot
    return 'ring1';
  }

  // Handle gloves
  if (item.type === 'gloves') {
    return 'gloves';
  }

  // Handle belt
  if (item.type === 'belt') {
    return 'belt';
  }

  // Handle boots
  if (item.type === 'boots') {
    return 'boots';
  }

  if (
    item.type === 'melee_weapon' ||
    item.type === 'ranged_weapon' ||
    item.type === 'mage_weapon'
  ) {
    return 'weapon';
  }

  if (item.type === 'melee_armor' || item.type === 'ranged_armor' || item.type === 'mage_armor') {
    const last = item.name.split(' ').slice(-1)[0].toLowerCase();
    if (last === 'helmet' || last === 'helm') return 'helmet';
    if (last === 'trinket') return 'trinket';
    return 'chest';
  }

  return null;
}

export function isTwoHanded(item: Item): boolean {
  if (
    item.type !== 'melee_weapon' &&
    item.type !== 'ranged_weapon' &&
    item.type !== 'mage_weapon'
  ) {
    return false;
  }

  const last = item.name.split(' ').slice(-1)[0].toLowerCase();
  return ['bow', 'longbow', 'shortbow', 'crossbow', 'staff', 'warhammer'].includes(last);
}

// ----------------- DUNGEON WALKABILITY -----------------

export function isWalkableTile(tile: DungeonTileId): boolean {
  switch (tile) {
    // All basic and stone floor variants are walkable
    case 'floor_basic':
    case 'floor_cracked':
    case 'floor_moss':
    case 'floor_stone_main':
    case 'floor_stone_alt1':
    case 'floor_stone_alt2':
    case 'grate_floor':
    case 'stairs_down':
      return true;

    // Everything below is blocking / not walkable
    case 'wall_inner':
    case 'wall_top':
    case 'wall_side':
    case 'wall_corner_inner':
    case 'wall_corner_outer':
    case 'wall_column':
    case 'door_closed':
    case 'pit':
    case 'water':
    case 'bars_vertical':
    case 'torch_wall':
    case 'rubble_small':
    case 'rubble_large':
    case 'crate':
    case 'barrel':
    case 'table':
      return false;

    // Fallback: treat unknown as blocking for safety
    default:
      return false;
  }
}
