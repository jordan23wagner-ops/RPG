import { Enemy, Item } from '../types/game';

const enemyNames = [
  'Fallen', 'Zombie', 'Skeleton', 'Dark Cultist', 'Corrupted Warrior',
  'Shadow Beast', 'Demon', 'Wraith', 'Necromancer', 'Hell Spawn'
];

const weaponPrefixes = ['Rusty', 'Sharp', 'Heavy', 'Ancient', 'Blessed', 'Cursed', 'Legendary'];
const weaponNames = ['Sword', 'Axe', 'Mace', 'Dagger', 'Spear', 'Bow'];
const armorPrefixes = ['Leather', 'Chain', 'Plate', 'Dragon', 'Shadow', 'Divine'];
const armorTypes = ['Armor', 'Helmet', 'Boots'];

export function generateEnemy(floor: number, playerLevel: number): Enemy {
  const level = playerLevel + Math.floor(floor / 3);
  const name = enemyNames[Math.floor(Math.random() * enemyNames.length)];
  const maxHealth = 30 + level * 15 + Math.floor(Math.random() * 20);

  return {
    id: Math.random().toString(36).substr(2, 9),
    name: `${name} (Lvl ${level})`,
    health: maxHealth,
    max_health: maxHealth,
    damage: 5 + level * 3,
    experience: 20 + level * 10,
    gold: 10 + level * 5 + Math.floor(Math.random() * 20),
    level
  };
}

export function generateLoot(enemyLevel: number, floor: number): Partial<Item> | null {
  const dropChance = Math.random();

  if (dropChance > 0.4) return null;

  const rarityRoll = Math.random();
  let rarity: 'common' | 'magic' | 'rare' | 'legendary';

  if (rarityRoll < 0.6) rarity = 'common';
  else if (rarityRoll < 0.85) rarity = 'magic';
  else if (rarityRoll < 0.97) rarity = 'rare';
  else rarity = 'legendary';

  const rarityMultiplier = {
    common: 1,
    magic: 1.5,
    rare: 2.5,
    legendary: 4
  }[rarity];

  const isWeapon = Math.random() > 0.4;

  if (isWeapon) {
    const prefix = weaponPrefixes[Math.floor(Math.random() * weaponPrefixes.length)];
    const weaponType = weaponNames[Math.floor(Math.random() * weaponNames.length)];
    const damage = Math.floor((5 + enemyLevel * 2 + Math.random() * 10) * rarityMultiplier);

    return {
      name: `${prefix} ${weaponType}`,
      type: 'weapon',
      rarity,
      damage,
      value: damage * 5,
      equipped: false
    };
  } else {
    const isPotion = Math.random() > 0.7;

    if (isPotion) {
      return {
        name: 'Health Potion',
        type: 'potion',
        rarity: 'common',
        value: 50,
        equipped: false
      };
    }

    const prefix = armorPrefixes[Math.floor(Math.random() * armorPrefixes.length)];
    const armorType = armorTypes[Math.floor(Math.random() * armorTypes.length)];
    const armor = Math.floor((3 + enemyLevel * 1.5 + Math.random() * 5) * rarityMultiplier);

    return {
      name: `${prefix} ${armorType}`,
      type: armorType.toLowerCase() as 'armor' | 'helmet' | 'boots',
      rarity,
      armor,
      value: armor * 8,
      equipped: false
    };
  }
}

export function getRarityColor(rarity: string): string {
  switch (rarity) {
    case 'common': return 'text-gray-400';
    case 'magic': return 'text-blue-400';
    case 'rare': return 'text-yellow-400';
    case 'legendary': return 'text-orange-500';
    default: return 'text-gray-400';
  }
}
