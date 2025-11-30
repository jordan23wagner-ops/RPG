// src/components/Inventory.tsx
import { ItemTooltip } from './ItemTooltip';
import { Package, Sword, Shield, FlaskConical, User2 } from 'lucide-react';
import { Item } from '../types/game';
import {
  getRarityColor,
  getEquipmentSlot,
  isTwoHanded,
  EquipmentSlot,
} from '../utils/gameLogic';

interface InventoryProps {
  items: Item[];
  onEquip: (itemId: string) => void;
  onUsePotion: (itemId: string) => void;
}

// UI-only slots (Diablo-style layout)
type EquipmentUISlotId =
  | 'helmet'
  | 'amulet'
  | 'mainHand'
  | 'offHand'
  | 'chest'
  | 'belt'
  | 'gloves'
  | 'boots'
  | 'ring1'
  | 'ring2'
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
      return <Sword className="w-4 h-4" />;
    case 'helmet':
    case 'chest':
    case 'boots':
    case 'gloves':
    case 'belt':
      return <Shield className="w-4 h-4" />;
    case 'ring1':
    case 'ring2':
    case 'amulet':
    case 'trinket':
    default:
      return <Package className="w-4 h-4" />;
  }
};

// Tailwind layout for a 3×5 gear grid
const SLOT_LAYOUT: Record<EquipmentUISlotId, string> = {
  // row 1
  helmet: 'row-start-1 col-start-2',
  // row 2 (rings + amulet)
  ring1: 'row-start-2 col-start-1',
  amulet: 'row-start-2 col-start-2',
  ring2: 'row-start-2 col-start-3',
  // row 3 (hands + chest)
  mainHand: 'row-start-3 col-start-1',
  chest: 'row-start-3 col-start-2',
  offHand: 'row-start-3 col-start-3',
  // row 4 (gloves + belt)
  gloves: 'row-start-4 col-start-1',
  belt: 'row-start-4 col-start-2',
  // row 5 (boots + trinket)
  boots: 'row-start-5 col-start-2',
  trinket: 'row-start-5 col-start-3',
};

export function Inventory({ items, onEquip, onUsePotion }: InventoryProps) {
  const getItemIcon = (type: string) => {
    switch (type) {
      case 'weapon':
      case 'melee_weapon':
      case 'ranged_weapon':
      case 'mage_weapon':
        return <Sword className="w-5 h-5" />;
      case 'potion':
        return <FlaskConical className="w-5 h-5" />;
      default:
        return <Shield className="w-5 h-5" />;
    }
  };

  const equippedItems = items.filter(i => i.equipped);
  const unequippedItems = items.filter(i => !i.equipped && i.type !== 'potion');

  // Map equipped items by logical equipment slot
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
        // Show 2H weapon in both hands visually
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

  const renderEquipmentSlot = (slotId: EquipmentUISlotId, label: string) => {
    const item = getItemForUISlot(slotId);

    if (!item) {
      return (
        <div
          className={`bg-gray-900/60 border border-gray-700 rounded-md p-2 flex flex-col items-center justify-center text-[10px] text-gray-400 gap-1 ${SLOT_LAYOUT[slotId]}`}
        >
          <div className="opacity-60">{equipmentSlotIcon(slotId)}</div>
          <div className="uppercase tracking-wide">{label}</div>
        </div>
      );
    }

    // Equipped slot WITH item + tooltip
    return (
      <div
        className={`relative group bg-gray-800 border border-yellow-500/70 rounded-md p-2 flex flex-col gap-1 text-[11px] ${SLOT_LAYOUT[slotId]}`}
      >
        <div className="flex items-center justify-between gap-1">
          <span className="flex items-center gap-1 text-gray-300">
            {equipmentSlotIcon(slotId)}
            <span className="uppercase tracking-wide text-[9px] text-gray-400">
              {label}
            </span>
          </span>
          <button
            onClick={() => onEquip(item.id)}
            className="px-2 py-0.5 bg-red-600 hover:bg-red-700 text-white text-[9px] rounded"
          >
            Unequip
          </button>
        </div>
        <div className="flex items-center gap-2">
          <div className={getRarityColor(item.rarity || 'common')}>
            {getItemIcon(item.type)}
          </div>
          <div>
            {(() => {
              const typeDisplay = item.type.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
              return (
                <div
                  className={`font-semibold leading-tight ${getRarityColor(
                    item.rarity || 'common',
                  )} flex items-center gap-2`}
                >
                  <span>{item.name}</span>
                  <span className="text-gray-400 text-[10px] lowercase">{item.rarity} <span className="capitalize">{typeDisplay}</span></span>
                </div>
              );
            })()}
            <div className="text-[10px] text-gray-400">
              {item.damage && `+${item.damage} Damage`}
              {item.damage && item.armor && ' • '}
              {item.armor && `+${item.armor} Armor`}
            </div>
          </div>
        </div>

        {/* Tooltip overlay for equipped item */}
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute left-1/2 top-0 z-20 hidden w-56 -translate-x-1/2 -translate-y-full pb-2 group-hover:block">
            <ItemTooltip item={item} />
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="bg-gray-900 border-2 border-yellow-600 rounded-md p-3 text-[13px]">
      <div className="flex items-center gap-1 mb-3">
        <Package className="w-4 h-4 text-yellow-500" />
        <h3 className="text-sm font-semibold text-yellow-500 tracking-wide">Inventory</h3>
      </div>

      {/* EQUIPMENT GRID */}
      <div className="mb-3">
        <h4 className="text-xs font-semibold text-gray-400 mb-1 uppercase tracking-wide">Equipped Gear</h4>
        <div className="relative border border-gray-700 rounded-md p-2 bg-gray-950/70">
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center opacity-5">
            <User2 className="w-20 h-20 text-gray-400" />
          </div>
          <div className="grid grid-cols-3 auto-rows-[64px] gap-1.5 relative z-10">
            {EQUIPMENT_UI_SLOTS.map(slot => (
              <div key={slot.id}>{renderEquipmentSlot(slot.id, slot.label)}</div>
            ))}
          </div>
        </div>
      </div>

      {/* BACKPACK / POTIONS */}
      <div>
        <h4 className="text-xs font-semibold text-gray-400 mb-1 uppercase tracking-wide">Backpack</h4>
        {unequippedItems.length === 0 ? (
          <div className="text-center py-6 text-gray-500 text-[12px]">No items in backpack</div>
        ) : (
          <div className="space-y-1.5 max-h-80 overflow-y-auto border border-gray-700 rounded-md p-2 bg-gray-950/50">
            {unequippedItems.map(item => (
              <div
                key={item.id}
                className="relative group bg-gray-800 border border-gray-700 rounded-sm p-1.5 flex items-center justify-between hover:border-gray-600 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <div className={getRarityColor(item.rarity || 'common')}>
                    {getItemIcon(item.type)}
                  </div>
                  <div>
                    <div
                      className={`font-semibold text-[12px] leading-tight ${getRarityColor(item.rarity || 'common')}`}
                    >
                      {(() => {
                        const typeDisplay = item.type.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
                        return (
                          <span className="flex items-center gap-1">
                            <span>{item.name}</span>
                            <span className="text-gray-400 text-[9px] lowercase font-normal">{item.rarity} <span className="capitalize">{typeDisplay}</span></span>
                          </span>
                        );
                      })()}
                    </div>
                    <div className="text-[10px] text-gray-400 leading-tight">
                      {item.damage && `+${item.damage} Damage`}
                      {item.damage && item.armor && ' • '}
                      {item.armor && `+${item.armor} Armor`}
                      {item.type === 'potion' && 'Restores 50 HP'}
                    </div>
                    <div className="text-[10px] text-yellow-500 leading-tight">
                      Value: {item.value}g
                    </div>
                  </div>
                </div>

                {item.type === 'potion' ? (
                  <button
                    onClick={() => onUsePotion(item.id)}
                    className="px-2 py-0.5 bg-green-600 hover:bg-green-700 text-white text-[11px] rounded transition-colors"
                  >
                    Use
                  </button>
                ) : (
                  <button
                    onClick={() => onEquip(item.id)}
                    className="px-2 py-0.5 bg-blue-600 hover:bg-blue-700 text-white text-[11px] rounded transition-colors"
                  >
                    Equip
                  </button>
                )}

                {/* Tooltip overlay for backpack item */}
                <div className="pointer-events-none absolute inset-0">
                  <div className="absolute left-1/2 top-0 z-20 hidden w-56 -translate-x-1/2 -translate-y-full pb-2 group-hover:block">
                    <ItemTooltip item={item} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
