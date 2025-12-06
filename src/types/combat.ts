/**
 * Combat type definitions for the RPG game.
 *
 * FIX HISTORY:
 * - Created this file to resolve missing module errors in combat.ts and combatAdapters.ts
 * - DamageType and CombatStats are used throughout the combat system
 */

/** The type of damage dealt by attacks */
export type DamageType =
  | 'physical'
  | 'fire'
  | 'ice'
  | 'lightning'
  | 'poison'
  | 'shadow';

/** Resistances map: percentage resistance to each damage type (0 to 0.9 = 0% to 90%) */
export type Resistances = Partial<Record<DamageType, number>>;

/** Combat statistics for a combatant (player or enemy) */
export interface CombatStats {
  /** Maximum life / hit points */
  life: number;
  /** Armor rating - reduces physical damage taken */
  armor: number;
  /** Chance to evade attacks (0 to 1, e.g., 0.1 = 10%) */
  evasionChance: number;
  /** Chance to land a critical hit (0 to 1, e.g., 0.05 = 5%) */
  critChance: number;
  /** Critical hit damage multiplier (e.g., 1.5 = 150% damage) */
  critMultiplier: number;
  /** Resistances to different damage types */
  resistances: Resistances;
}
