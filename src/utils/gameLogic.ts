// src/utils/gameLogic.ts

import { Enemy, Item } from '../types/game';

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

// ---------------- Enemy Generation ----------------

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

// ---------------- Rarity Helpers ----------------
// These are used by GameUI for text / background / border styling

export function getRarityColor(rarity: Item['rarity']): string {
  switch (rarity) {
    case 'radiant':
      return 'text-red-400';
    case 'mythic':
      return 'text-purple-400';
    case 'legendary':
      return 'text-orange-400';
    case 'rare':
      return 'text-yellow-300';
    case 'magic':
      return 'text-blue-300';
    case 'common':
    default:
      return 'text-gray-300';
  }
}

export function getRarityBgColor(rarity: Item['rarity']): string {
  switch (rarity) {
    case 'radiant':
      return 'bg-gray-900'; // dark so the red border pops
    case 'mythic':
      return 'bg-purple-900/40';
    case 'legendary':
      return 'bg-amber-900/40';
    case 'rare':
      return 'bg-amber-800/30';
    case 'magic':
      return 'bg-blue-900/30';
    case 'common':
    default:
      return 'bg-gray-800';
  }
}

export function getRarityBorderColor(rarity: Item['rarity']): string {
  switch (rarity) {
    case 'radiant':
      return 'border-red-500';
    case 'mythic':
      return 'border-purple-500';
    case 'legendary':
      return 'border-orange-500';
    case 'rare':
      return 'border-yellow-400';
    case 'magic':
      return 'border-blue-400';
    case 'common':
    default:
      return 'border-gray-700';
  }
}
