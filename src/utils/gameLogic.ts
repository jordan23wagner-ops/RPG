// src/utils/gameLogic.ts
import { Enemy, Item, Affix } from '../types/game';

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

const weaponPrefixes = {
  melee: ["Brutal", "Savage", "Executioner's", "Berserker's", 'Demon'],
  ranged: ["Piercing", "Swift", "Sniper's", "Ranger's", 'Phantom'],
  mage: ['Arcane', 'Mystic', "Spellweaver's", "Wizard's", 'Ethereal'],
};

const armorPrefixes = {
  melee: ['Plate', 'Dragon', 'Titanium', 'Obsidian', 'Indestructible'],
  ranged: ['Leather', 'Shadow', 'Swift', "Assassin's", 'Phantom'],
  mage: ['Silk', 'Enchanted', 'Mystic', 'Arcane', 'Celestial'],
};

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
  const setBonuses: SetBonus[] = setDef.bonuses.map(b => ({
    piecesRequired: b.piecesRequired,
    effect: b.effect,
    stats: { ...b.stats },
  }));

  const { requiredLevel, requiredStats } = calculateItemRequirements(piece.type, 'set', enemyLevel, floor);

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

const affixPools = {
  melee_weapon: [
    { name: 'of Strength', stat: 'strength' as const, value: 5 },
    { name: 'of Power', stat: 'damage' as const, value: 8 },
    { name: 'Lifesteal', stat: 'health' as const, value: 3 },
    { name: 'of Rending', stat: 'damage' as const, value: 5 },
    { name: 'Crushing', stat: 'strength' as const, value: 3 },
  ],
  ranged_weapon: [
    { name: 'of Dexterity', stat: 'dexterity' as const, value: 5 },
    { name: 'of Precision', stat: 'damage' as const, value: 8 },
    { name: 'of Swiftness', stat: 'dexterity' as const, value: 3 },
    { name: 'Piercing', stat: 'damage' as const, value: 5 },
    { name: 'of Accuracy', stat: 'dexterity' as const, value: 4 },
  ],
  mage_weapon: [
    { name: 'of Intelligence', stat: 'intelligence' as const, value: 5 },
    { name: 'of Spellpower', stat: 'damage' as const, value: 8 },
    { name: 'of Mana', stat: 'mana' as const, value: 10 },
    { name: 'Arcane', stat: 'intelligence' as const, value: 3 },
    { name: 'of Wisdom', stat: 'intelligence' as const, value: 4 },
  ],
  melee_armor: [
    { name: 'of Protection', stat: 'armor' as const, value: 5 },
    { name: 'of Fortitude', stat: 'health' as const, value: 15 },
    { name: 'of the Titan', stat: 'armor' as const, value: 8 },
    { name: 'Ironbound', stat: 'armor' as const, value: 3 },
  ],
  ranged_armor: [
    { name: 'of Evasion', stat: 'dexterity' as const, value: 4 },
    { name: 'of Agility', stat: 'dexterity' as const, value: 5 },
    { name: 'of Shadows', stat: 'armor' as const, value: 4 },
    { name: 'of Speed', stat: 'dexterity' as const, value: 3 },
  ],
  mage_armor: [
    { name: 'of Insight', stat: 'intelligence' as const, value: 4 },
    { name: 'of Mana Shield', stat: 'mana' as const, value: 15 },
    { name: 'of Sorcery', stat: 'intelligence' as const, value: 5 },
    { name: 'of the Archmage', stat: 'mana' as const, value: 10 },
  ],
};

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

  // Slightly shift rarity thresholds upward as heat increases (more rares/elites/bosses)
  // Rebalanced: normal enemies significantly more common, rare/elite much less frequent
  const normalThreshold = 0.85 - heatBoost * 0.08; // normal chance decreases with heat
  const rareThreshold = 0.96 - heatBoost * 0.04;
  const eliteThreshold = 0.995 - heatBoost * 0.015;

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
  const gold = Math.floor((10 + level * 5 + floor * 5 + Math.random() * 20) * multiplier);

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
export function generateEnemyVariant(kind: 'enemy' | 'rareEnemy' | 'miniBoss' | 'mimic' | 'boss', floor: number, playerLevel: number, zoneHeat: number = 0): Enemy {
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

const BASE_RARITY_WEIGHTS = {
  common: 55,
  magic: 30,
  rare: 10,
  epic: 3,
  legendary: 1,
  mythic: 0.5,
  set: 0.3,
  radiant: 0.2,
};

type RarityKey = keyof typeof BASE_RARITY_WEIGHTS;

function pickRarity(enemyRarity: RarityKey, zoneHeat: number = 0): RarityKey {
  const weights = { ...BASE_RARITY_WEIGHTS };

  if (enemyRarity === 'magic') {
    weights.magic += 5;
    weights.rare += 3;
  } else if (enemyRarity === 'rare') {
    weights.rare += 6;
    weights.epic += 3;
  } else if (enemyRarity === 'epic') {
    weights.epic += 5;
    weights.legendary += 3;
  } else if (enemyRarity === 'legendary') {
    weights.rare += 5;
    weights.epic += 7;
    weights.legendary += 5;
    weights.mythic += 2;
    weights.common -= 10;
  }

  // Apply zone heat boost to favor higher rarities. zoneHeat 0..100
  const heatBoost = Math.max(0, Math.min(100, zoneHeat)) / 100;
  if (heatBoost > 0) {
    // Moderate boosts for mid rarities, stronger boost for higher tiers
    weights.magic = Math.round(weights.magic * (1 + heatBoost * 0.15));
    weights.rare = Math.round(weights.rare * (1 + heatBoost * 0.45));
    weights.epic = Math.round(weights.epic * (1 + heatBoost * 0.9));
    weights.legendary = Math.round(weights.legendary * (1 + heatBoost * 1.8));
    weights.mythic = Math.round(weights.mythic * (1 + heatBoost * 2.5));
    weights.set = Math.round(weights.set * (1 + heatBoost * 2.0));
    weights.radiant = Math.round(weights.radiant * (1 + heatBoost * 3.0));
  }

  const total = Object.values(weights).reduce((s, v) => s + v, 0);
  let roll = Math.random() * total;

  for (const key of Object.keys(weights) as RarityKey[]) {
    if (roll < weights[key]) return key;
    roll -= weights[key];
  }
  return 'common';
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

function rollBaseStats(
  itemType: string,
  level: number,
  floor: number,
  rarity: RarityKey,
) {
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
): { requiredLevel?: number; requiredStats?: { strength?: number; dexterity?: number; intelligence?: number } } {
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
    case 'fire_damage': return 'of Flames';
    case 'ice_damage': return 'of Frost';
    case 'lightning_damage': return 'of Storms';
    case 'crit_chance': return 'of Precision';
    case 'crit_damage': return 'of Cruelty';
    case 'speed': return 'of Swiftness';
    case 'mana': return 'of Mana';
    case 'health': return 'of Vitality';
    case 'strength': return 'of Strength';
    case 'dexterity': return 'of Dexterity';
    case 'intelligence': return 'of Intelligence';
    case 'damage': return 'of Power';
    case 'armor': return 'of Protection';
    default: return 'Enchanted';
  }
}

export function generateAffixesForItem(
  rarity: RarityKey,
  itemType: Item['type'],
  context: 'normal' | 'set' | 'boss' = 'normal'
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
  const isWeapon = ['melee_weapon','ranged_weapon','mage_weapon'].includes(itemType as string);
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
  enemyRarity: RarityKey = 'common',
  zoneHeat: number = 0,
): Partial<Item> | null {
  // Reduce chance of no-drop as heat increases (more loot at higher heat)
  const heatBoost = Math.max(0, Math.min(100, zoneHeat)) / 100;
  let noDrop = enemyRarity === 'legendary' ? 0.02 : 0.15;
  noDrop = Math.max(0.01, noDrop * (1 - heatBoost * 0.5));
  if (Math.random() < noDrop) return null;

  // Chance to drop a set item independent of normal rarity. Set items are
  // extremely rare but provide powerful bonuses when multiple pieces are
  // equipped. If a set item drops, normal loot generation is skipped.
  const SET_DROP_CHANCE = 0.015 + heatBoost * 0.02; // increases with heat
  if (Math.random() < SET_DROP_CHANCE) {
    return generateSetItem(enemyLevel, floor);
  }

  const rarity = pickRarity(enemyRarity, zoneHeat);
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
      weighted.push('melee_weapon','melee_weapon','melee_weapon','ranged_weapon','mage_weapon');
    } else if (theme === 'ice') {
      weighted.push('mage_weapon','mage_weapon','ranged_weapon','melee_weapon');
    } else if (theme === 'jungle') {
      weighted.push('ranged_weapon','ranged_weapon','melee_weapon','mage_weapon');
    } else {
      weighted.push('melee_weapon','ranged_weapon','mage_weapon');
    }
    type = randomFrom(weighted);
  } else {
    const weighted: Item['type'][] = [] as any;
    if (theme === 'lava') {
      weighted.push('melee_armor','gloves','belt','boots','ring');
    } else if (theme === 'ice') {
      weighted.push('mage_armor','amulet','ring','boots');
    } else if (theme === 'jungle') {
      weighted.push('ranged_armor','boots','gloves','belt');
    } else {
      weighted.push('melee_armor','boots','gloves','belt','ring','amulet');
    }
    type = randomFrom(weighted as any);
  }
  const { damage, armor } = rollBaseStats(type, enemyLevel, floor, rarity);

  // Theme-influenced name prefixes
  const prefixes =
    type === 'melee_weapon'
      ? (theme === 'lava' ? ['Molten','Blazing','Charred','Infernal'] : theme === 'ice' ? ['Frosted','Glacial','Icy','Snowbound'] : theme === 'jungle' ? ['Vinewoven','Hunter','Wild','Primal'] : ['Rusty', 'Jagged', 'Savage', 'Dread'])
      : type === 'ranged_weapon'
      ? (theme === 'jungle' ? ['Hunter\'s','Stalker\'s','Sharpshot','Wild'] : theme === 'ice' ? ['Cold','Aurora','Storm','Glacial'] : theme === 'lava' ? ['Smoldering','Ashen','Storm','Scorching'] : ['Cracked', 'Hunter\'s', 'Sharpshot', 'Storm'])
      : type === 'mage_weapon'
      ? (theme === 'ice' ? ['Frostweaver','Mystic','Arcane','Eldritch'] : theme === 'lava' ? ['Pyromancer\'s','Mystic','Infernal','Eldritch'] : ['Apprentice', 'Mystic', 'Arcane', 'Eldritch'])
      : type === 'ring'
      ? ['Mystic', 'Arcane', 'Enchanted', 'Ethereal']
      : type === 'gloves'
      ? ['Leather', 'Iron', 'Reinforced', 'Blessed']
      : type === 'belt'
      ? ['Sturdy', 'Reinforced', 'Guardian\'s', 'Warden\'s']
      : type === 'boots'
      ? ['Worn', 'Sturdy', 'Swift', 'Guardian\'s']
      : ['Worn', 'Sturdy', 'Guardian\'s', 'Ward'];

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

  const suffixes = theme === 'lava'
    ? ['of Embers','of Flames','of Ash','of the Furnace']
    : theme === 'ice'
    ? ['of Frost','of the Glacier','of Snow','of the Aurora']
    : theme === 'jungle'
    ? ['of the Hunt','of Vines','of the Wild','of the Canopy']
    : ['of Might', 'of the Fox', 'of Embers', 'of the Depths'];

  let name = `${randomFrom(prefixes)} ${randomFrom(bases)}`;
  if (rarity !== 'common' && Math.random() < 0.7) {
    name += ` ${randomFrom(suffixes)}`;
  }

  const rawValue = (damage || armor || 1);
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

  const { requiredLevel, requiredStats } = calculateItemRequirements(type, rarity, enemyLevel, floor);
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

const RARITY_ORDER: RarityKey[] = ['common','magic','rare','epic','legendary','mythic','set','radiant'];
function rarityIndex(r: RarityKey) { return RARITY_ORDER.indexOf(r); }

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
  { name: "Shadowfang Blade", type: 'melee_weapon', rarity: 'mythic', damageBonus: 2.0 },
  { name: "Voidcrusher Hammer", type: 'melee_weapon', rarity: 'legendary', damageBonus: 1.6 },
  { name: "Deathwhisper Bow", type: 'ranged_weapon', rarity: 'legendary', damageBonus: 1.4 },
  { name: "Stormcaller Crossbow", type: 'ranged_weapon', rarity: 'mythic', damageBonus: 1.8 },
  { name: "Soulreaver Staff", type: 'mage_weapon', rarity: 'legendary', damageBonus: 1.5 },
  { name: "Netherstorm Scepter", type: 'mage_weapon', rarity: 'mythic', damageBonus: 1.9 },
  { name: "Dreadplate Armor", type: 'melee_armor', rarity: 'legendary', armorBonus: 1.5 },
  { name: "Dragonscale Cuirass", type: 'melee_armor', rarity: 'mythic', armorBonus: 2.0 },
  { name: "Phantom Cloak", type: 'ranged_armor', rarity: 'legendary', armorBonus: 1.4 },
  { name: "Voidweave Robes", type: 'mage_armor', rarity: 'legendary', armorBonus: 1.3 },
  { name: "Celestial Vestments", type: 'mage_armor', rarity: 'mythic', armorBonus: 1.7 },
  { name: "Crown of the Damned", type: 'helmet', rarity: 'radiant', armorBonus: 2.2 },
  { name: "Ring of Eternal Fire", type: 'ring', rarity: 'legendary', armorBonus: 1.0 },
  { name: "Amulet of the Abyss", type: 'amulet', rarity: 'mythic', armorBonus: 1.2 },
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

  const { requiredLevel, requiredStats } = calculateItemRequirements(template.type, template.rarity, enemyLevel, floor);
  const value = Math.round((damage || armor || 1) * (template.rarity === 'radiant' ? 10 : template.rarity === 'mythic' ? 8 : 6));
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

function generateGuaranteedLoot(enemyLevel: number, floor: number, zoneHeat: number, minRarity: RarityKey): Partial<Item> {
  let attempts = 0;
  let loot: Partial<Item> | null = null;
  while (attempts < 10) {
    loot = generateLoot(enemyLevel, floor, 'legendary', zoneHeat); // pass high enemy rarity to bias upward
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
  if ((loot as any).requiredLevel && !(loot as any).required_level) {
    (loot as any).required_level = (loot as any).requiredLevel;
  }
  if ((loot as any).requiredStats && !(loot as any).required_stats) {
    (loot as any).required_stats = (loot as any).requiredStats;
  }
  return loot;
}

export function generateBossLoot(enemyLevel: number, floor: number, zoneHeat: number): Partial<Item>[] {
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

export function generateMimicLoot(enemyLevel: number, floor: number, zoneHeat: number): Partial<Item>[] {
  const drops: Partial<Item>[] = [];
  // One guaranteed magic+ item
  drops.push(generateGuaranteedLoot(enemyLevel, floor, zoneHeat, 'magic'));
  // Reduced to 25% chance for second rare+ item
  if (Math.random() < 0.25) {
    drops.push(generateGuaranteedLoot(enemyLevel, floor, zoneHeat, 'rare'));
  }
  return drops;
}

// ----------------- RARITY COLORS -----------------

export function getRarityColor(rarity: string): string {
  switch (rarity) {
    case 'common': return 'text-gray-400';
    case 'magic': return 'text-blue-400';
    case 'rare': return 'text-yellow-400';
    case 'legendary': return 'text-orange-500';
    case 'epic': return 'text-purple-500';
    case 'mythic': return 'text-red-500';
    case 'radiant': return 'text-pink-400';
    case 'set': return 'text-green-400';
    case 'unique': return 'bg-gradient-to-r from-red-400 via-yellow-400 to-blue-400 bg-clip-text text-transparent';
    default: return 'text-gray-400';
  }
}

export function getRarityBgColor(rarity: string): string {
  switch (rarity) {
    case 'common': return 'bg-gray-700';
    case 'magic': return 'bg-blue-900';
    case 'rare': return 'bg-yellow-900';
    case 'legendary': return 'bg-orange-900';
    case 'epic': return 'bg-purple-900';
    case 'mythic': return 'bg-red-900';
    case 'radiant': return 'bg-pink-900';
    case 'set': return 'bg-green-900';
    case 'unique': return 'bg-gradient-to-r from-red-900 via-yellow-900 to-blue-900';
    default: return 'bg-gray-700';
  }
}

export function getRarityBorderColor(rarity: string): string {
  switch (rarity) {
    case 'common': return 'border-gray-600';
    case 'magic': return 'border-blue-500';
    case 'rare': return 'border-yellow-500';
    case 'legendary': return 'border-orange-500';
    case 'epic': return 'border-purple-500';
    case 'mythic': return 'border-red-500';
    case 'radiant': return 'border-pink-400';
    case 'set': return 'border-green-500';
    case 'unique': return 'border-transparent';
    default: return 'border-gray-600';
  }
}

// ----------------- ITEM SPRITES -----------------

/**
 * Lightweight sprite mapping for items. Returns an emoji or short glyph
 * representing the item visually without requiring external assets.
 */
export function getItemSprite(item: Item | Partial<Item>): string {
  const type = (item as any).type as Item['type'] | undefined;
  const name = ((item as any).name as string | undefined)?.toLowerCase() || '';

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

export type EquipmentSlot = 'helmet' | 'chest' | 'boots' | 'weapon' | 'trinket' | 'amulet' | 'ring1' | 'ring2' | 'gloves' | 'belt';

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

  if (
    item.type === 'melee_armor' ||
    item.type === 'ranged_armor' ||
    item.type === 'mage_armor'
  ) {
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
  return [
    'bow',
    'longbow',
    'shortbow',
    'crossbow',
    'staff',
    'warhammer',
  ].includes(last);
}
