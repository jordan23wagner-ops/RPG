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

// UI-only slots (visual layout)
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
  { id: 'trinket', label: 'Trinket' },
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

// Layout for a wider, bottom panel (4 columns x 3 rows)
const SLOT_LAYOUT: Record<EquipmentUISlotId, string> = {
  // row 1
  helmet: 'row-start-1 col-start-1',
  amulet: 'row-start-1 col-start-2',
  ring1: 'row-start-1 col-start-3',
  ring2: 'row-start-1 col-start-4',
  // row 2 – hands + chest
  mainHand: 'row-start-2 col-start-1',
  chest: 'row-start-2 col-start-2 col-span-2',
  offHand: 'row-start-2 col-start-4',
  // row 3 – gloves/belt/boots/trinket
  gloves: 'row-start-3 col-start-1',
  belt: 'row-start-3 col-start-2',
  boots: 'row-start-3 col-start-3',
  trinket: 'row-start-3 col-start-4',
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
      case 'chest':
        return equippedBySlot.chest;
      case 'boots':
        return equippedBySlot.boots;
      case 'trinket':
        return equippedBySlot.trinket;
      case 'mainHand':
        return weaponItem;
      case 'offHand':
        if (weaponItem && isTwoHanded(weaponItem)) return weaponItem;
        return undefined;
      // amulet / gloves / belt / rings: not implemented yet
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
          <div className={`font-semibold ${getRarityColor(item.rarity)}`}>
            {item.name}
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
    <div className="mt-6 bg-gray-900 border-2 border-yellow-600 rounded p-4">
      <div className="flex items-center gap-2 mb-3">
        <Package className="w-4 h-4 text-yellow-500" />
        <h3 className="font-bold text-yellow-500 text-sm">Equipped Gear</h3>
      </div>

      <div className="relative border border-gray-700 rounded-lg p-4 bg-gray-950/70">
        {/* character silhouette in the middle */}
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center opacity-10">
          <User2 className="w-24 h-24 text-gray-400" />
        </div>

        <div className="grid grid-cols-4 auto-rows-[110px] gap-3 relative z-10">
          {EQUIPMENT_UI_SLOTS.map(slot => (
            <div key={slot.id}>{renderSlot(slot.id, slot.label)}</div>
          ))}
        </div>
      </div>
    </div>
  );
}
