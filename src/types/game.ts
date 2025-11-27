// src/types/game.ts

// ---------- Core Types ----------

export interface Character {
  id: string;
  user_id: string;
  name: string;
  level: number;
  experience: number;
  health: number;
  max_health: number;
  mana: number;
  max_mana: number;
  strength: number;
  dexterity: number;
  intelligence: number;
  gold: number;
  created_at: string;
  updated_at: string;
}

export interface Affix {
  name: string;
  value: number;
  stat:
    | 'strength'
    | 'dexterity'
    | 'intelligence'
    | 'health'
    | 'mana'
    | 'damage'
    | 'armor';
}

export interface Item {
  id: string;
  character_id: string;
  name: string;
  type:
    | 'weapon'
    | 'armor'
    | 'helmet'
    | 'boots'
    | 'potion'
    | 'melee_weapon'
    | 'ranged_weapon'
    | 'mage_weapon'
    | 'melee_armor'
    | 'ranged_armor'
    | 'mage_armor';
  rarity: 'common' | 'magic' | 'rare' | 'legendary' | 'mythic' | 'unique';
  damage?: number;
  armor?: number;
  value: number;
  equipped: boolean;
  affixes?: Affix[];
  created_at: string;
}

export interface Enemy {
  id: string;
  name: string;
  health: number;
  max_health: number;
  damage: number;
  experience: number;
  gold: number;
  level: number;
  rarity: 'normal' | 'rare' | 'elite' | 'boss';
}

export interface GameSession {
  id: string;
  character_id: string;
  floor: number;
  enemies_killed: number;
  started_at: string;
  ended_at?: string;
}

// ---------- Loot System Types ----------

type LootRarity = Item['rarity'];

interface LootEntry {
  name: string;
  type: Item['type'];
  baseDamage?: number;
  baseArmor?: number;
  baseValue: number;
  rarity: LootRarity;
  weight: number;
}

// simple id generator since Bolt may not support uuid()
const generateId = () => Math.random().toString(36).substring(2, 10);

// ---------- Loot Table ----------

const LOOT_TABLE: LootEntry[] = [
  {
    name: 'Rusty Sword',
    type: 'melee_weapon',
    baseDamage: 3,
    baseValue: 5,
    rarity: 'common',
    weight: 40,
  },
  {
    name: 'Cracked Leather Armor',
    type: 'melee_armor',
    baseArmor: 2,
    baseValue: 5,
    rarity: 'common',
    weight: 40,
  },
  {
    name: 'Apprentice Wand',
    type: 'mage_weapon',
    baseDamage: 4,
    baseValue: 10,
    rarity: 'magic',
    weight: 20,
  },
  {
    name: 'Hunter Bow',
    type: 'ranged_weapon',
    baseDamage: 5,
    baseValue: 12,
    rarity: 'magic',
    weight: 20,
  },
  {
    name: "Knight's Helm",
    type: 'helmet',
    baseArmor: 5,
    baseValue: 50,
    rarity: 'rare',
    weight: 10,
  },
  {
    name: 'Dragonplate Chest',
    type: 'armor',
    baseArmor: 10,
    baseValue: 200,
    rarity: 'legendary',
    weight: 2,
  },
];

// ---------- Loot Logic (100% drop rate version) ----------

// ALWAYS drop an item (for testing)
function rollRarity(enemy: Enemy): LootRarity {
  const r = Math.random();

  // 5% legendary, 15% rare, 30% magic, rest common
  if (r < 0.05) return 'legendary';
  if (r < 0.20) return 'rare';
  if (r < 0.50) return 'magic';
  return 'common';
}

function pickLootEntry(rarity: LootRarity): LootEntry | null {
  const candidates = LOOT_TABLE.filter((entry) => entry.rarity === rarity);
  if (candidates.length === 0) return null;

  const totalWeight = candidates.reduce((sum, e) => sum + e.weight, 0);
  let roll = Math.random() * totalWeight;

  for (const entry of candidates) {
    if (roll < entry.weight) return entry;
    roll -= entry.weight;
  }

  return candidates[candidates.length - 1];
}

function generateAffixes(rarity: LootRarity): Affix[] {
  const possible: Omit<Affix, 'value'>[] = [
    { name: 'of Strength', stat: 'strength' },
    { name: 'of Dexterity', stat: 'dexterity' },
    { name: 'of Intelligence', stat: 'intelligence' },
    { name: 'of Health', stat: 'health' },
    { name: 'of Mana', stat: 'mana' },
    { name: 'of Power', stat: 'damage' },
    { name: 'of Protection', stat: 'armor' },
  ];

  const affixCount: Record<LootRarity, number> = {
    common: 0,
    magic: 1,
    rare: 2,
    legendary: 3,
    mythic: 4,
    unique: 2,
  };

  const count = affixCount[rarity];
  const result: Affix[] = [];

  for (let i = 0; i < count; i++) {
    const base = possible[Math.floor(Math.random() * possible.length)];
    const value = 1 + Math.floor(Math.random() * (6 + i * 3));

    result.push({
      name: base.name,
      stat: base.stat,
      value,
    });
  }

  return result;
}

// ---------- Public Loot Function ----------

export function rollLoot(enemy: Enemy, character: Character): Item {
  const rarity = rollRarity(enemy);
  const blueprint = pickLootEntry(rarity);

  const now = new Date().toISOString();

  const item: Item = {
    id: generateId(),
    character_id: character.id,
    name: blueprint?.name || 'Unknown Item',
    type: blueprint?.type || 'weapon',
    rarity,
    damage: blueprint?.baseDamage,
    armor: blueprint?.baseArmor,
    value: blueprint?.baseValue ?? 1,
    equipped: false,
    affixes: generateAffixes(rarity),
    created_at: now,
  };

  console.log('FORCED DROP:', item);
  return item;
}
