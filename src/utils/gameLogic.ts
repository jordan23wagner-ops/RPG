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
  const level = playerLevel + Math.floor(floor / 3);
  const baseName = enemyNames[Math.floor(Math.random() * enemyNames.length)];

  const rarityRoll = Math.random();
  let rarity: 'normal' | 'rare' | 'elite' | 'boss';
  let multiplier = 1;
  let titlePrefix = '';

  if (rarityRoll < 0.7) {
    rarity = 'normal';
    multiplier = 1;
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

  const maxHealth = Math.floor(
    (30 + level * 15 + Math.floor(Math.random() * 20)) * multiplier,
  );
  const damage = Math.floor((5 + level * 3) * multiplier);
  const experience = Math.floor((20 + level * 10) * multiplier);
  const gold = Math.floor(
    (10 + level * 5 + Math.floor(Math.random() * 20)) * multiplier,
  );

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

// ----------------- AFFIX HELPER -----------------

function getRandomAffixes(itemType: string, rarity: string): Affix[] {
  const affixPool = affixPools[itemType as keyof typeof affixPools] || [];
  if (!affixPool.length) return [];

  const affixCount =
    {
      common: 0,
      magic: 1,
      rare: 2,
      legendary: 3,
      mythic: 4,
      unique: 5,
    }[rarity] || 0;

  const affixes: Affix[] = [];
  const used = new Set<number>();

  for (let i = 0; i < affixCount; i++) {
    let idx = Math.floor(Math.random() * affixPool.length);
    while (used.has(idx) && used.size < affixPool.length) {
      idx = Math.floor(Math.random() * affixPool.length);
    }
    if (!used.has(idx)) {
      used.add(idx);
      const affix = affixPool[idx];
      affixes.push({
        ...affix,
        value: Math.floor(affix.value * (1 + Math.random() * 0.3)),
      });
    }
  }

  return affixes;
}

// ----------------- LOOT GENERATION -----------------

export function generateLoot(
  enemyLevel: number,
  floor: number,
  enemyRarity: 'normal' | 'rare' | 'elite' | 'boss' = 'normal',
): Partial<Item> | null {
  // Always generate some loot; rarity is biased by enemy rarity.

  const rarityRoll = Math.random();
  let rarity: 'common' | 'magic' | 'rare' | 'legendary' | 'mythic' | 'unique';

  if (enemyRarity === 'normal') {
    if (rarityRoll < 0.5) rarity = 'common';
    else if (rarityRoll < 0.75) rarity = 'magic';
    else if (rarityRoll < 0.9) rarity = 'rare';
    else if (rarityRoll < 0.98) rarity = 'legendary';
    else if (rarityRoll < 0.99) rarity = 'mythic';
    else rarity = 'unique';
  } else if (enemyRarity === 'rare') {
    if (rarityRoll < 0.2) rarity = 'common';
    else if (rarityRoll < 0.5) rarity = 'magic';
    else if (rarityRoll < 0.8) rarity = 'rare';
    else if (rarityRoll < 0.95) rarity = 'legendary';
    else if (rarityRoll < 0.99) rarity = 'mythic';
    else rarity = 'unique';
  } else if (enemyRarity === 'elite') {
    if (rarityRoll < 0.1) rarity = 'common';
    else if (rarityRoll < 0.3) rarity = 'magic';
    else if (rarityRoll < 0.65) rarity = 'rare';
    else if (rarityRoll < 0.92) rarity = 'legendary';
    else if (rarityRoll < 0.98) rarity = 'mythic';
    else rarity = 'unique';
  } else {
    // boss
    if (rarityRoll < 0.05) rarity = 'common';
    else if (rarityRoll < 0.15) rarity = 'magic';
    else if (rarityRoll < 0.5) rarity = 'rare';
    else if (rarityRoll < 0.8) rarity = 'legendary';
    else if (rarityRoll < 0.95) rarity = 'mythic';
    else rarity = 'unique';
  }

  const rarityMultiplier = {
    common: 1,
    magic: 1.3,
    rare: 1.8,
    legendary: 2.5,
    mythic: 3.5,
    unique: 5,
  }[rarity];

  const isWeapon = Math.random() > 0.4;

  if (isWeapon) {
    const weaponClassRoll = Math.random();
    let weaponType: 'melee_weapon' | 'ranged_weapon' | 'mage_weapon';
    let weaponList: string[];
    let prefixList: string[];

    if (weaponClassRoll < 0.5) {
      weaponType = 'melee_weapon';
      weaponList = meleeWeapons;
      prefixList = weaponPrefixes.melee;
    } else if (weaponClassRoll < 0.75) {
      weaponType = 'ranged_weapon';
      weaponList = rangedWeapons;
      prefixList = weaponPrefixes.ranged;
    } else {
      weaponType = 'mage_weapon';
      weaponList = mageWeapons;
      prefixList = weaponPrefixes.mage;
    }

    const prefix = prefixList[Math.floor(Math.random() * prefixList.length)];
    const weapon = weaponList[Math.floor(Math.random() * weaponList.length)];
    const damage = Math.floor(
      (5 + enemyLevel * 2 + Math.random() * 10) * rarityMultiplier,
    );
    const affixes = getRandomAffixes(weaponType, rarity);

    return {
      name: `${prefix} ${weapon}`,
      type: weaponType,
      rarity,
      damage,
      value: Math.floor(damage * 5 * rarityMultiplier),
      equipped: false,
      affixes,
    };
  } else {
    const isPotion = Math.random() > 0.7;

    if (isPotion) {
      return {
        name: 'Health Potion',
        type: 'potion',
        rarity: 'common',
        value: 50,
        equipped: false,
      };
    }

    const armorClassRoll = Math.random();
    let armorType: 'melee_armor' | 'ranged_armor' | 'mage_armor';
    let prefixList: string[];
    let armorSlot: 'armor' | 'helmet' | 'boots';

    const slotRoll = Math.random();
    if (slotRoll < 0.33) armorSlot = 'armor';
    else if (slotRoll < 0.66) armorSlot = 'helmet';
    else armorSlot = 'boots';

    if (armorClassRoll < 0.5) {
      armorType = 'melee_armor';
      prefixList = armorPrefixes.melee;
    } else if (armorClassRoll < 0.75) {
      armorType = 'ranged_armor';
      prefixList = armorPrefixes.ranged;
    } else {
      armorType = 'mage_armor';
      prefixList = armorPrefixes.mage;
    }

    const prefix = prefixList[Math.floor(Math.random() * prefixList.length)];
    const armor = Math.floor(
      (3 + enemyLevel * 1.5 + Math.random() * 5) * rarityMultiplier,
    );
    const affixes = getRandomAffixes(armorType, rarity);

    return {
      name: `${prefix} ${armorSlot.charAt(0).toUpperCase()}${armorSlot.slice(
        1,
      )}`,
      type: armorType,
      rarity,
      armor,
      value: Math.floor(armor * 8 * rarityMultiplier),
      equipped: false,
      affixes,
    };
  }
}

// ----------------- RARITY COLORS (UI helpers) -----------------

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
    case 'mythic':
      return 'text-purple-500';
    case 'unique': // Radiant
      return 'text-red-500';
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
    case 'mythic':
      return 'bg-purple-900';
    case 'unique': // Radiant
      return 'bg-red-900';
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
    case 'mythic':
      return 'border-purple-500';
    case 'unique': // Radiant
      return 'border-red-500';
    default:
      return 'border-gray-600';
  }
}
