// src/utils/equipmentVisuals.ts
// Centralized mapping of equipment slots/types to visual properties for DungeonView
import { EquipmentSlot, EquippableItemType } from '../types/game';

export interface EquipmentVisual {
  color: string;
  shape?: 'rect' | 'oval' | 'sword' | 'wand' | 'bow' | 'shield';
  // Add more as needed
}

export const EQUIPMENT_VISUALS: Record<EquipmentSlot, EquipmentVisual> = {
  helmet: { color: '#b0b0b0', shape: 'rect' },
  chest: { color: '#ffd700', shape: 'rect' },
  legs: { color: '#22c55e', shape: 'rect' },
  boots: { color: '#60a5fa', shape: 'rect' },
  gloves: { color: '#dc2626', shape: 'rect' },
  weapon: { color: '#a16207', shape: 'sword' },
  shield: { color: '#6b7280', shape: 'oval' },
  amulet: { color: '#f472b6', shape: 'oval' },
  ring: { color: '#fbbf24', shape: 'oval' },
  belt: { color: '#a3e635', shape: 'rect' },
  trinket: { color: '#818cf8', shape: 'rect' },
};

// Optionally, map item types to slots for visuals
export const ITEM_TYPE_TO_SLOT: Partial<Record<EquippableItemType, EquipmentSlot>> = {
  helmet: 'helmet',
  chest: 'chest',
  legs: 'legs',
  boots: 'boots',
  gloves: 'gloves',
  weapon: 'weapon',
  shield: 'shield',
  amulet: 'amulet',
  ring: 'ring',
  belt: 'belt',
  trinket: 'trinket',
  melee_weapon: 'weapon',
  ranged_weapon: 'weapon',
  mage_weapon: 'weapon',
  melee_armor: 'chest',
  ranged_armor: 'chest',
  mage_armor: 'chest',
};
