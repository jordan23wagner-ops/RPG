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
    | 'mage_armor'
    | 'amulet'
    | 'ring'
    | 'gloves'
    | 'belt';
  // NOTE: Rarity now includes additional tiers beyond the classic common→legendary
  // progression. We support 'epic' between rare and legendary as well as
  // 'set' items, which have special bonuses when multiple pieces are equipped.
  // Mythic and Radiant remain for backwards compatibility with older loot
  // logic but are not used by the new generator.
  rarity:
    | 'common'
    | 'magic'
    | 'rare'
    | 'epic'
    | 'legendary'
    | 'mythic'
    | 'radiant'
    | 'set';
  damage?: number;
  armor?: number;
  value: number;
  equipped: boolean;
  affixes?: Affix[];
  created_at: string;

  /**
   * Level requirement to equip this item. Scales with rarity and floor.
   */
  requiredLevel?: number;

  /**
   * Stat requirements to equip this item. Varies by item type and rarity.
   * At least one requirement may be present depending on the item.
   */
  requiredStats?: {
    strength?: number;
    dexterity?: number;
    intelligence?: number;
  };

  /**
   * Optional name of the set this item belongs to. Set items confer
   * additional bonuses when multiple pieces from the same set are equipped.
   */
  setName?: string;

  /**
   * List of set bonuses for this item. Each entry specifies the number
   * of pieces required to activate the associated bonus along with
   * a human‑readable description and a collection of numeric stat
   * modifiers. These modifiers are aggregated across all equipped set
   * pieces and applied during combat.
   */
  setBonuses?: {
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
  }[];
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

// simple ID generator so we don't need the "uuid" package
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
    weight: 4,
  },
  // New Mythic + Radiant examples
  {
    name: 'Celestial Aegis',
    type: 'armor',
    baseArmor: 16,
    baseValue: 800,
    rarity: 'mythic',
    weight: 1,
  },
  {
    name: 'Radiant Edge',
    type: 'melee_weapon',
    baseDamage: 18,
    baseValue: 1200,
    rarity: 'radiant',
    weight: 1,
  },
];

// ---------- Loot Helpers ----------

function getDropChance(enemy: Enemy): number {
  // You still have 100% drop chance; we can tune this later
  return 1.0;
}

function rollRarity(enemy: Enemy): LootRarity | null {
  const roll = Math.random();
  const dropChance = getDropChance(enemy);

  if (roll > dropChance) {
    console.log('No loot dropped. roll=', roll, 'chance=', dropChance);
    return null;
  }

  // Rarity distribution: tweak as you like
  // Common > Magic > Rare > Legendary > Mythic > Radiant
  const levelFactor = Math.min(enemy.level / 30, 1); // 0–1

  const radiantChance = 0.002 + 0.008 * levelFactor;   // 0.2% – 1%
  const mythicChance = 0.004 + 0.016 * levelFactor;    // 0.4% – 2%
  const legendaryChance = 0.01 + 0.04 * levelFactor;   // 1% – 5%
  const rareChance = 0.04 + 0.10 * levelFactor;        // 4% – 14%
  const magicChance = 0.20 + 0.15 * levelFactor;       // 20% – 35%
  const commonChance =
    1 - (radiantChance + mythicChance + legendaryChance + rareChance + magicChance);

  const r = Math.random();

  if (r < radiantChance) return 'radiant';
  if (r < radiantChance + mythicChance) return 'mythic';
  if (r < radiantChance + mythicChance + legendaryChance) return 'legendary';
  if (r < radiantChance + mythicChance + legendaryChance + rareChance) return 'rare';
  if (
    r <
    radiantChance +
      mythicChance +
      legendaryChance +
      rareChance +
      magicChance
  )
    return 'magic';
  return 'common';
}

function pickLootEntry(rarity: LootRarity): LootEntry | null {
  let candidates = LOOT_TABLE.filter(entry => entry.rarity === rarity);

  // If we somehow have no items of that rarity, fall back one tier
  if (candidates.length === 0) {
    const downgradeOrder: LootRarity[] = [
      'radiant',
      'mythic',
      'legendary',
      'rare',
      'magic',
      'common',
    ];
    const idx = downgradeOrder.indexOf(rarity);
    for (let i = idx + 1; i < downgradeOrder.length; i++) {
      candidates = LOOT_TABLE.filter(e => e.rarity === downgradeOrder[i]);
      if (candidates.length > 0) break;
    }
  }

  if (candidates.length === 0) {
    console.warn('No loot entries at all for rarity', rarity);
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
    radiant: 5,
  };

  const count = rarityAffixCount[rarity] ?? 0;
  const affixes: Affix[] = [];

  for (let i = 0; i < count; i++) {
    const base =
      possibleAffixes[Math.floor(Math.random() * possibleAffixes.length)];
    const value = 2 + Math.floor(Math.random() * (6 + i * 4)); // scales up per affix

    affixes.push({
      name: base.name,
      stat: base.stat,
      value,
    });
  }

  return affixes;
}

// ---------- Public Loot API ----------

export function rollLoot(enemy: Enemy, character: Character): Item | null {
  const rarity = rollRarity(enemy);
  if (!rarity) return null;

  const blueprint = pickLootEntry(rarity);
  if (!blueprint) return null;

  const now = new Date().toISOString();
  const affixes = generateAffixes(rarity);

  const item: Item = {
    id: generateId(),
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
