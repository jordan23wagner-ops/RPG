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
  stat: 'strength' | 'dexterity' | 'intelligence' | 'health' | 'mana' | 'damage' | 'armor';
}

export interface Item {
  id: string;
  character_id: string;
  name: string;
  type: 'weapon' | 'armor' | 'helmet' | 'boots' | 'potion' | 'melee_weapon' | 'ranged_weapon' | 'mage_weapon' | 'melee_armor' | 'ranged_armor' | 'mage_armor';
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
type LootRarity = Item['rarity'];

interface LootEntry {
  name: string;
  type: Item['type'];
  baseDamage?: number;
  baseArmor?: number;
  baseValue: number;
  rarity: LootRarity;
  weight: number;

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
    name: 'Knight’s Helm',
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

function getDropChance(enemy: Enemy): number {
  switch (enemy.rarity) {
    case 'normal':
      return 0.15; // 15%
    case 'rare':
      return 0.35; // 35%
    case 'elite':
      return 0.65; // 65%
    case 'boss':
      return 1.0; // always drop
    default:
      return 0.1;
  }
}

function rollRarity(enemy: Enemy): LootRarity | null {
  const roll = Math.random(); // 0–1
  const dropChance = getDropChance(enemy);

  if (roll > dropChance) {
    // No loot drop at all
    console.log('No loot dropped. roll=', roll, 'chance=', dropChance);
    return null;
  }

  // Within a drop, bias higher rarities for higher-level enemies
  const levelFactor = Math.min(enemy.level / 20, 1); // 0–1

  const legendaryChance = 0.01 + 0.04 * levelFactor;
  const rareChance = 0.05 + 0.10 * levelFactor;
  const magicChance = 0.25 + 0.20 * levelFactor;
  const commonChance = 1 - (legendaryChance + rareChance + magicChance);

  const r = Math.random();

  if (r < legendaryChance) return 'legendary';
  if (r < legendaryChance + rareChance) return 'rare';
  if (r < legendaryChance + rareChance + magicChance) return 'magic';
  return 'common';
}

function pickLootEntry(rarity: LootRarity): LootEntry | null {
  const candidates = LOOT_TABLE.filter((entry) => entry.rarity === rarity);
  if (candidates.length === 0) {
    console.warn('No loot entries for rarity', rarity);
    return null;
  }

  const totalWeight = candidates.reduce((sum, e) => sum + e.weight, 0);
  let roll = Math.random() * totalWeight;

  for (const entry of candidates) {
    if (roll < entry.weight) {
      return entry;
    }
    roll -= entry.weight;
  }

  // Fallback
  return candidates[candidates.length - 1];
}

function generateAffixes(rarity: LootRarity): Affix[] {
  const possibleAffixes: Omit<Affix, 'value'>[] = [
    { name: 'of Strength', stat: 'strength' },
    { name: 'of Dexterity', stat: 'dexterity' },
    { name: 'of Intelligence', stat: 'intelligence' },
    { name: 'of Health', stat: 'health' },
    { name: 'of Mana', stat: 'mana' },
    { name: 'of Power', stat: 'damage' },
    { name: 'of Protection', stat: 'armor' },
  ];

  const rarityAffixCount: Record<LootRarity, number> = {
    common: 0,
    magic: 1,
    rare: 2,
    legendary: 3,
    mythic: 4,
    unique: 2, // tweak as you like
  };

  const count = rarityAffixCount[rarity] ?? 0;
  const affixes: Affix[] = [];

  for (let i = 0; i < count; i++) {
    const base = possibleAffixes[Math.floor(Math.random() * possibleAffixes.length)];
    const value = 1 + Math.floor(Math.random() * (5 + i * 3)); // small scaling
    affixes.push({
      name: base.name,
      stat: base.stat,
      value,
    });
  }

  return affixes;
}

import { v4 as uuidv4 } from 'uuid'; // or whatever ID generator you use

export function rollLoot(enemy: Enemy, character: Character): Item | null {
  const rarity = rollRarity(enemy);
  if (!rarity) return null;

  const blueprint = pickLootEntry(rarity);
  if (!blueprint) return null;

  const now = new Date().toISOString();
  const affixes = generateAffixes(rarity);

  const item: Item = {
    id: uuidv4(),
    character_id: character.id,
    name: blueprint.name,
    type: blueprint.type,
    rarity,
    damage: blueprint.baseDamage,
    armor: blueprint.baseArmor,
    value: blueprint.baseValue,
    equipped: false,
    affixes,
    created_at: now,
  };

  console.log('Loot dropped:', item);

  return item;
}

function onEnemyDeath(enemy: Enemy, character: Character) {
  // existing stuff:
  // - give XP
  // - give gold
  // - increment enemies_killed, etc.

  const droppedItem = rollLoot(enemy, character);

  if (droppedItem) {
    // 1) Save to DB (Supabase or whatever)
    // await supabase.from('items').insert(droppedItem);

    // 2) AND/OR update in-memory inventory state
    // characterInventory.push(droppedItem);

    // 3) AND/OR send message to UI
    // sendToClient({ type: 'loot_drop', item: droppedItem });
  } else {
    console.log('Enemy died, no loot drop.');
  }
}
