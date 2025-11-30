// src/components/EquipmentPanel.tsx
import { Package, User2 } from 'lucide-react';
import { Item } from '../types/game';
import {
  getRarityColor,
  getEquipmentSlot,
  isTwoHanded,
  EquipmentSlot,
} from '../utils/gameLogic';

interface EquipmentPanelProps {
  items: Item[];
  onEquip: (itemId: string) => void;
}

type EquipmentUISlotId =
  | 'helmet'
  | 'amulet'
  | 'ring1'
  | 'ring2'
  | 'mainHand'
  | 'offHand'
  | 'chest'
  | 'gloves'
  | 'belt'
  | 'boots'
  | 'trinket';

const EQUIPMENT_UI_SLOTS: { id: EquipmentUISlotId; label: string }[] = [
  { id: 'trinket', label: 'Trinket' },
  { id: 'helmet', label: 'Helmet' },
  { id: 'amulet', label: 'Amulet' },
  { id: 'ring1', label: 'Ring 1' },
  { id: 'ring2', label: 'Ring 2' },
  { id: 'mainHand', label: 'Main Hand' },
  { id: 'offHand', label: 'Off Hand' },
  { id: 'chest', label: 'Armor' },
  { id: 'gloves', label: 'Gloves' },
  { id: 'belt', label: 'Belt' },
  { id: 'boots', label: 'Boots' },
];

const equipmentSlotIcon = (slotId: EquipmentUISlotId) => {
  switch (slotId) {
    case 'mainHand':
    case 'offHand':
      return <Package className="w-4 h-4" />;
    default:
      return <Package className="w-4 h-4" />;
  }
};

const SLOT_LAYOUT: Record<EquipmentUISlotId, string> = {
  trinket: 'row-start-1 col-start-1',
  helmet: 'row-start-1 col-start-2',
  amulet: 'row-start-1 col-start-3',
  ring1: 'row-start-1 col-start-4',
  ring2: 'row-start-2 col-start-1',
  mainHand: 'row-start-2 col-start-2',
  chest: 'row-start-2 col-start-3 col-span-2',
  offHand: 'row-start-3 col-start-1',
  gloves: 'row-start-3 col-start-2',
  belt: 'row-start-3 col-start-3',
  boots: 'row-start-3 col-start-4',
};

export function EquipmentPanel({ items, onEquip }: EquipmentPanelProps) {
  const equippedItems = items.filter(i => i.equipped);

  const equippedBySlot: Partial<Record<EquipmentSlot, Item>> = {};
  for (const item of equippedItems) {
    const slot = getEquipmentSlot(item);
    if (slot) {
      equippedBySlot[slot] = item;
    }
  }

  const weaponItem = equippedBySlot.weapon;

  const getItemForUISlot = (slotId: EquipmentUISlotId): Item | undefined => {
    switch (slotId) {
      case 'helmet':
        return equippedBySlot.helmet;
      case 'amulet':
        return equippedBySlot.amulet;
      case 'ring1':
        return equippedBySlot.ring1;
      case 'ring2':
        return equippedBySlot.ring2;
      case 'mainHand':
        return weaponItem;
      case 'offHand':
        if (weaponItem && isTwoHanded(weaponItem)) return weaponItem;
        return undefined;
      case 'chest':
        return equippedBySlot.chest;
      case 'gloves':
        return equippedBySlot.gloves;
      case 'belt':
        return equippedBySlot.belt;
      case 'boots':
        return equippedBySlot.boots;
      case 'trinket':
        return equippedBySlot.trinket;
      default:
        return undefined;
    }
  };

  const renderSlot = (slotId: EquipmentUISlotId, label: string) => {
    const item = getItemForUISlot(slotId);

    if (!item) {
      return (
        <div
          className={`bg-gray-900/60 border border-gray-700 rounded-md p-3 flex flex-col items-center justify-center text-[11px] text-gray-400 gap-1 ${SLOT_LAYOUT[slotId]}`}
        >
          <div className="opacity-60">{equipmentSlotIcon(slotId)}</div>
          <div className="uppercase tracking-wide">{label}</div>
        </div>
      );
    }

    // Format type for display (e.g., 'melee_weapon' -> 'Melee Weapon')
    const typeDisplay = item.type.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

    return (
      <div
        className={`bg-gray-800 border border-yellow-500/70 rounded-md p-3 flex flex-col text-[12px] ${SLOT_LAYOUT[slotId]}`}
      >
        <div className="flex items-center gap-2 text-gray-300 mb-1">
          {equipmentSlotIcon(slotId)}
          <span className="uppercase tracking-wide text-[10px] text-gray-400">
            {label}
          </span>
        </div>

        <div className="flex-1">
          <div className={`font-semibold ${getRarityColor(item.rarity)} flex items-center gap-2`}>
            <span>{item.name}</span>
            <span className="text-gray-400 text-xs lowercase">{item.rarity} <span className="capitalize">{typeDisplay}</span></span>
          </div>
          <div className="text-[11px] text-gray-300">
            {item.damage && `+${item.damage} DMG`}
            {item.damage && item.armor && ' • '}
            {item.armor && `+${item.armor} ARM`}
          </div>
        </div>

        <div className="mt-2 flex justify-end">
          <button
            onClick={() => onEquip(item.id)}
            className="px-3 py-0.5 bg-red-600 hover:bg-red-700 text-white text-[10px] rounded"
          >
            Unequip
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="mt-4 bg-gray-900 border-2 border-yellow-600 rounded-md p-3 text-[13px]">
      <div className="flex items-center gap-1 mb-2">
        <Package className="w-4 h-4 text-yellow-500" />
        <h3 className="font-semibold text-yellow-500 text-xs tracking-wide">Equipped Gear</h3>
      </div>
      <div className="relative border border-gray-700 rounded-md p-3 bg-gray-950/70">
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center opacity-5">
          <User2 className="w-20 h-20 text-gray-400" />
        </div>
        <div className="grid grid-cols-4 auto-rows-[96px] gap-2 relative z-10">
          {EQUIPMENT_UI_SLOTS.map(slot => (
            <div key={slot.id}>{renderSlot(slot.id, slot.label)}</div>
          ))}
        </div>
      </div>
    </div>
  );
}

