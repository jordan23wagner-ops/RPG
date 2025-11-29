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

export function generateEnemy(floor: number, playerLevel: number): Enemy {
  // Scale enemy level more aggressively based on floor
  const level = playerLevel + Math.floor(floor * 0.5);
  const baseName = enemyNames[Math.floor(Math.random() * enemyNames.length)];

  const rarityRoll = Math.random();
  let rarity: 'normal' | 'rare' | 'elite' | 'boss';
  let multiplier = 1;
  let titlePrefix = '';

  if (rarityRoll < 0.7) {
    rarity = 'normal';
  } else if (rarityRoll < 0.9) {
    rarity = 'rare';
    multiplier = 1.5;
    titlePrefix = 'Rare ';
  } else if (rarityRoll < 0.98) {
    rarity = 'elite';
    multiplier = 2.5;
    titlePrefix = 'Elite ';
  } else {
    rarity = 'boss';
    multiplier = 4;
    titlePrefix = 'Boss ';
  }

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

// ----------------- LOOT GENERATION (NEW SYSTEM) -----------------

const BASE_RARITY_WEIGHTS = {
  common: 55,
  magic: 30,
  rare: 10,
  epic: 4,
  legendary: 1,
};

type RarityKey = keyof typeof BASE_RARITY_WEIGHTS;

function pickRarity(enemyRarity: RarityKey): RarityKey {
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
    weights.common -= 10;
  }

  const total = Object.values(weights).reduce((s, v) => s + v, 0);
  let roll = Math.random() * total;

  for (const key of Object.keys(weights) as RarityKey[]) {
    if (roll < weights[key]) return key;
    roll -= weights[key];
  }
  return 'common';
}

const WEAPON_TYPES = ['melee_weapon', 'ranged_weapon', 'mage_weapon'] as const;
const ARMOR_TYPES = ['melee_armor', 'amulet', 'ring', 'gloves', 'belt', 'boots'] as const;

function randomFrom<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
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

export function generateLoot(
  enemyLevel: number,
  floor: number,
  enemyRarity: RarityKey = 'common',
): Partial<Item> | null {
  const noDrop = enemyRarity === 'legendary' ? 0.02 : 0.15;
  if (Math.random() < noDrop) return null;

  // Chance to drop a set item independent of normal rarity. Set items are
  // extremely rare but provide powerful bonuses when multiple pieces are
  // equipped. If a set item drops, normal loot generation is skipped.
  const SET_DROP_CHANCE = 0.015; // 1.5% chance
  if (Math.random() < SET_DROP_CHANCE) {
    return generateSetItem(enemyLevel, floor);
  }

  const rarity = pickRarity(enemyRarity);
  const isWeapon = Math.random() < 0.6;

  const type = isWeapon ? randomFrom(WEAPON_TYPES) : randomFrom(ARMOR_TYPES);
  const { damage, armor } = rollBaseStats(type, enemyLevel, floor, rarity);

  const prefixes =
    type === 'melee_weapon'
      ? ['Rusty', 'Jagged', 'Savage', 'Dread']
      : type === 'ranged_weapon'
      ? ['Cracked', 'Hunter\'s', 'Sharpshot', 'Storm']
      : type === 'mage_weapon'
      ? ['Apprentice', 'Mystic', 'Arcane', 'Eldritch']
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

  const suffixes = ['of Might', 'of the Fox', 'of Embers', 'of the Depths'];

  let name = `${randomFrom(prefixes)} ${randomFrom(bases)}`;
  if (rarity !== 'common' && Math.random() < 0.7) {
    name += ` ${randomFrom(suffixes)}`;
  }

  const rawValue = (damage || armor || 1);
  const multiplier =
    rarity === 'legendary'
      ? 6
      : rarity === 'epic'
      ? 4
      : rarity === 'rare'
      ? 3
      : rarity === 'magic'
      ? 2
      : 1.2;

  const value = Math.round(rawValue * multiplier);

  return {
    name,
    type,
    rarity,
    damage,
    armor,
    value,
    equipped: false,
  };
}

// ----------------- RARITY COLORS -----------------

export function getRarityColor(rarity: string): string {
  switch (rarity) {
    case 'common': return 'text-gray-400';
    case 'magic': return 'text-blue-400';
    case 'rare': return 'text-yellow-400';
    case 'legendary': return 'text-orange-500';
    case 'epic': return 'text-fuchsia-500';
    case 'mythic': return 'text-purple-500';
    case 'radiant': return 'text-yellow-300';
    case 'set': return 'text-green-400';
    case 'unique': return 'text-red-500';
    default: return 'text-gray-400';
  }
}

export function getRarityBgColor(rarity: string): string {
  switch (rarity) {
    case 'common': return 'bg-gray-700';
    case 'magic': return 'bg-blue-900';
    case 'rare': return 'bg-yellow-900';
    case 'legendary': return 'bg-orange-900';
    case 'epic': return 'bg-fuchsia-900';
    case 'mythic': return 'bg-purple-900';
    case 'radiant': return 'bg-yellow-800';
    case 'set': return 'bg-green-900';
    case 'unique': return 'bg-red-900';
    default: return 'bg-gray-700';
  }
}

export function getRarityBorderColor(rarity: string): string {
  switch (rarity) {
    case 'common': return 'border-gray-600';
    case 'magic': return 'border-blue-500';
    case 'rare': return 'border-yellow-500';
    case 'legendary': return 'border-orange-500';
    case 'epic': return 'border-fuchsia-500';
    case 'mythic': return 'border-purple-500';
    case 'radiant': return 'border-yellow-400';
    case 'set': return 'border-green-500';
    case 'unique': return 'border-red-500';
    default: return 'border-gray-600';
  }
}

// ----------------- EQUIPMENT SLOT HELPERS -----------------

export type EquipmentSlot = 'helmet' | 'chest' | 'boots' | 'weapon' | 'trinket' | 'amulet' | 'ring1' | 'ring2' | 'gloves' | 'belt';

export function getEquipmentSlot(item: Item): EquipmentSlot | null {
  if (item.type === 'potion') return null;

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
