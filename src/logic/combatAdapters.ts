// src/logic/combatAdapters.ts
// Bridges existing game types to the pure combat engine.

import { Character, Enemy, Item } from '../types/game';
import { CombatantSnapshot, WeaponSnapshot } from './combat';
import { DamageType } from '../types/combat';

const clamp = (value: number, min: number, max: number): number =>
  Math.max(min, Math.min(max, value));

const inferDamageTypeFromItem = (item: Item): DamageType => {
  switch (item.type) {
    case 'mage_weapon':
      return 'fire';
    case 'ranged_weapon':
      return 'physical';
    case 'melee_weapon':
    case 'weapon':
      return 'physical';
    default:
      return 'physical';
  }
};

export function createPlayerCombatant(character: Character): CombatantSnapshot {
  const critChance = character.crit_chance ?? 0;
  const critDamage = character.crit_damage ?? 50; // percent bonus

  const evasionFromDex = (character.dexterity ?? 0) * 0.002; // 0.2% per dex

  return {
    id: character.id,
    name: character.name,
    level: character.level,
    currentLife: character.health,
    stats: {
      life: character.max_health,
      armor: 0,
      evasionChance: clamp(evasionFromDex, 0, 0.5),
      critChance: clamp(critChance / 100, 0, 0.8),
      critMultiplier: 1 + critDamage / 100,
      resistances: {},
    },
  };
}

export function createEnemyCombatant(enemy: Enemy): CombatantSnapshot {
  return {
    id: enemy.id,
    name: enemy.name,
    level: enemy.level,
    currentLife: enemy.health,
    stats: {
      life: enemy.max_health,
      armor: 0,
      evasionChance: 0.02,
      critChance: 0.05,
      critMultiplier: 1.5,
      resistances: {},
    },
  };
}

export function createWeaponSnapshotFromItem(
  item: Item | null | undefined
): WeaponSnapshot | null {
  if (!item) return null;
  const baseDamage = item.damage ?? 0;
  if (baseDamage <= 0) return null;

  const damageType = inferDamageTypeFromItem(item);

  return {
    minDamage: Math.max(1, Math.floor(baseDamage * 0.8)),
    maxDamage: Math.max(1, Math.ceil(baseDamage * 1.2)),
    damageType,
  };
}

export function createWeaponSnapshotFromEnemy(enemy: Enemy): WeaponSnapshot {
  const baseDamage = enemy.damage;
  const minDamage = Math.max(1, Math.floor(baseDamage * 0.8));
  const maxDamage = Math.max(minDamage, Math.ceil(baseDamage * 1.2));

  return {
    minDamage,
    maxDamage,
    damageType: 'physical',
  };
}
