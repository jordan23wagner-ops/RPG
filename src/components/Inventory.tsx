import { Package, Sword, Shield, FlaskConical } from 'lucide-react';
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
  { id: 'mainHand', label: 'Main Hand' },
  { id: 'offHand', label: 'Off Hand' },
  { id: 'chest', label: 'Armor' },
  { id: 'belt', label: 'Belt' },
  { id: 'gloves', label: 'Gloves' },
  { id: 'boots', label: 'Boots' },
  { id: 'ring1', label: 'Ring 1' },
  { id: 'ring2', label: 'Ring 2' },
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
  const unequippedItems = items.filter(i => !i.equipped);

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
      case 'chest':
        return equippedBySlot.chest;
      case 'boots':
        return equippedBySlot.boots;
      case 'trinket':
        return equippedBySlot.trinket;
      case 'mainHand':
        return weaponItem;
      case 'offHand':
        // Only show something here if the weapon is two-handed,
        // so 2H weapons visually occupy both slots.
        if (weaponItem && isTwoHanded(weaponItem)) return weaponItem;
        return undefined;
      // amulet / belt / gloves / rings don't have items yet
      default:
        return undefined;
    }
  };

  const renderEquipmentSlot = (slotId: EquipmentUISlotId, label: string) => {
    const item = getItemForUISlot(slotId);

    if (!item) {
      return (
        <div className="bg-gray-900/60 border border-gray-700 rounded-md p-2 flex flex-col items-center justify-center text-[10px] text-gray-400 gap-1">
          <div className="opacity-60">{equipmentSlotIcon(slotId)}</div>
          <div>{label}</div>
        </div>
      );
    }

    return (
      <div className="bg-gray-800 border border-yellow-500/70 rounded-md p-2 flex flex-col gap-1 text-[11px]">
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
            <div
              className={`font-semibold leading-tight ${getRarityColor(
                item.rarity || 'common',
              )}`}
            >
              {item.name}
            </div>
            <div className="text-[10px] text-gray-400">
              {item.damage && `+${item.damage} Damage`}
              {item.damage && item.armor && ' • '}
              {item.armor && `+${item.armor} Armor`}
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="bg-gray-900 border-2 border-yellow-600 rounded-lg p-4">
      <div className="flex items-center gap-2 mb-4">
        <Package className="w-5 h-5 text-yellow-500" />
        <h3 className="text-xl font-bold text-yellow-500">Inventory</h3>
      </div>

      {/* EQUIPMENT GRID */}
      <div className="mb-4">
        <h4 className="text-sm font-semibold text-gray-400 mb-2">
          Equipped Gear
        </h4>
        <div className="grid grid-cols-4 gap-2">
          {EQUIPMENT_UI_SLOTS.map(slot => (
            <div key={slot.id}>{renderEquipmentSlot(slot.id, slot.label)}</div>
          ))}
        </div>
      </div>

      {/* BACKPACK / POTIONS */}
      <div>
        <h4 className="text-sm font-semibold text-gray-400 mb-2">
          Backpack
        </h4>
        {unequippedItems.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            No items in backpack
          </div>
        ) : (
          <div className="space-y-2 max-h-80 overflow-y-auto">
            {unequippedItems.map(item => (
              <div
                key={item.id}
                className="bg-gray-800 border border-gray-700 rounded p-2 flex items-center justify-between hover:border-gray-600 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <div className={getRarityColor(item.rarity || 'common')}>
                    {getItemIcon(item.type)}
                  </div>
                  <div>
                    <div
                      className={`font-semibold ${getRarityColor(
                        item.rarity || 'common',
                      )}`}
                    >
                      {item.name}
                    </div>
                    <div className="text-xs text-gray-400">
                      {item.damage && `+${item.damage} Damage`}
                      {item.damage && item.armor && ' • '}
                      {item.armor && `+${item.armor} Armor`}
                      {item.type === 'potion' && 'Restores 50 HP'}
                    </div>
                    <div className="text-xs text-yellow-500">
                      Value: {item.value}g
                    </div>
                  </div>
                </div>
                {item.type === 'potion' ? (
                  <button
                    onClick={() => onUsePotion(item.id)}
                    className="px-3 py-1 bg-green-600 hover:bg-green-700 text-white text-xs rounded transition-colors"
                  >
                    Use
                  </button>
                ) : (
                  <button
                    onClick={() => onEquip(item.id)}
                    className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-xs rounded transition-colors"
                  >
                    Equip
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
