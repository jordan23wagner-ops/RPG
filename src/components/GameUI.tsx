import {
  Heart,
  Zap,
  TrendingUp,
  Coins,
  Package,
  ArrowDown,
  Sparkles,
  ShoppingBag,
  User2,
} from 'lucide-react';
import { Character, Item } from '../types/game';
import {
  getRarityColor,
  getRarityBgColor,
  getRarityBorderColor,
  getEquipmentSlot,
  isTwoHanded,
  EquipmentSlot,
} from '../utils/gameLogic';

interface GameUIProps {
  character: Character;
  items: Item[];
  floor: number;
  onEquip: (itemId: string) => void;
  onUsePotion: (itemId: string) => void;
  onNextFloor: () => void;
  enemyDefeated: boolean;
  onOpenShop: () => void;
  onSellAll: () => void;
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
    case 'helmet':
    case 'chest':
    case 'boots':
    case 'gloves':
    case 'belt':
      return <Package className="w-4 h-4" />;
    case 'ring1':
    case 'ring2':
    case 'amulet':
    case 'trinket':
    default:
      return <Package className="w-4 h-4" />;
  }
};

// Tailwind grid positioning for a 3×5 gear grid
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

export function GameUI({
  character,
  items,
  floor,
  onEquip,
  onUsePotion,
  onNextFloor,
  enemyDefeated,
  onOpenShop,
  onSellAll,
}: GameUIProps) {
  const healthPercent = (character.health / character.max_health) * 100;
  const manaPercent = (character.mana / character.max_mana) * 100;
  const expToNext = character.level * 100;
  const expPercent = (character.experience / expToNext) * 100;

  const potions = items.filter(i => i.type === 'potion');
  const equippedItems = items.filter(i => i.equipped);
  const unequippedItems = items.filter(
    i => !i.equipped && i.type !== 'potion',
  );

  // ----- equipment mapping for grid -----

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
      // amulet / gloves / belt / rings: no items yet
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

    return (
      <div
        className={`bg-gray-800 border border-yellow-500/70 rounded-md p-2 flex flex-col gap-1 text-[11px] ${SLOT_LAYOUT[slotId]}`}
      >
        <div className="flex items-center justify-between gap-1 mb-1">
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
        <div>
          <div
            className={`font-semibold leading-tight ${getRarityColor(
              item.rarity,
            )}`}
          >
            {item.name}
          </div>
          <div className="text-[10px] text-gray-300">
            {item.damage && `+${item.damage} DMG`}
            {item.damage && item.armor && ' • '}
            {item.armor && `+${item.armor} ARM`}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {/* Character panel */}
      <div className="bg-gray-900 border-2 border-yellow-600 rounded p-3">
        <h2 className="text-lg font-bold text-yellow-500 mb-2">
          {character.name}
        </h2>
        <div className="text-xs text-gray-300 mb-2">
          Level {character.level}
        </div>

        {/* Bars */}
        <div className="space-y-1 mb-3">
          {/* HP */}
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-1">
              <Heart className="w-3 h-3 text-red-500" />
              <span>HP</span>
            </div>
            <span className="text-red-400 text-xs">
              {character.health}/{character.max_health}
            </span>
          </div>
          <div className="w-full bg-gray-800 rounded h-1.5 overflow-hidden">
            <div
              className="bg-red-600 h-full transition-all duration-300"
              style={{ width: `${healthPercent}%` }}
            />
          </div>

          {/* Mana */}
          <div className="flex items-center justify-between text-xs pt-1">
            <div className="flex items-center gap-1">
              <Zap className="w-3 h-3 text-blue-500" />
              <span>Mana</span>
            </div>
            <span className="text-blue-400 text-xs">
              {character.mana}/{character.max_mana}
            </span>
          </div>
          <div className="w-full bg-gray-800 rounded h-1.5 overflow-hidden">
            <div
              className="bg-blue-600 h-full transition-all duration-300"
              style={{ width: `${manaPercent}%` }}
            />
          </div>

          {/* XP */}
          <div className="flex items-center justify-between text-xs pt-1">
            <div className="flex items-center gap-1">
              <TrendingUp className="w-3 h-3 text-green-500" />
              <span>XP</span>
            </div>
            <span className="text-green-400 text-xs">
              {character.experience}/{expToNext}
            </span>
          </div>
          <div className="w-full bg-gray-800 rounded h-1.5 overflow-hidden">
            <div
              className="bg-green-600 h-full transition-all duration-300"
              style={{ width: `${expPercent}%` }}
            />
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-1 text-xs">
          <div className="bg-gray-800 rounded p-1.5">
            <div className="text-gray-400 text-xs">STR</div>
            <div className="font-bold text-white">{character.strength}</div>
          </div>
          <div className="bg-gray-800 rounded p-1.5">
            <div className="text-gray-400 text-xs">DEX</div>
            <div className="font-bold text-white">{character.dexterity}</div>
          </div>
          <div className="bg-gray-800 rounded p-1.5">
            <div className="text-gray-400 text-xs">INT</div>
            <div className="font-bold text-white">
              {character.intelligence}
            </div>
          </div>
          <div className="bg-gray-800 rounded p-1.5 flex items-center gap-1">
            <Coins className="w-3 h-3 text-yellow-400" />
            <div>
              <div className="text-gray-400 text-xs">Gold</div>
              <div className="font-bold text-yellow-500 text-xs">
                {character.gold}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Equipped gear grid */}
      <div className="bg-gray-900 border-2 border-yellow-600 rounded p-3">
        <div className="flex items-center gap-2 mb-2">
          <Package className="w-4 h-4 text-yellow-500" />
          <h3 className="font-bold text-yellow-500 text-sm">Equipped Gear</h3>
        </div>

        <div className="relative border border-gray-700 rounded-lg p-3 bg-gray-950/70">
          {/* Character silhouette */}
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center opacity-10">
            <User2 className="w-20 h-20 text-gray-400" />
          </div>

          <div className="grid grid-cols-3 auto-rows-[90px] gap-2 relative z-10">
            {EQUIPMENT_UI_SLOTS.map(slot => (
              <div key={slot.id}>
                {renderEquipmentSlot(slot.id, slot.label)}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Potions */}
      {potions.length > 0 && (
        <div className="bg-gray-900 border-2 border-yellow-600 rounded p-3">
          <h3 className="font-bold text-yellow-500 mb-1 text-sm">Potions</h3>
          <div className="space-y-1">
            {potions.map(potion => (
              <div
                key={potion.id}
                className="flex items-center justify-between bg-gray-800 rounded p-1.5"
              >
                <div className="text-xs">
                  <div className="text-green-400">Health Potion</div>
                  <div className="text-gray-500 text-xs">+50 HP</div>
                </div>
                <button
                  onClick={() => onUsePotion(potion.id)}
                  className="px-1.5 py-0.5 bg-green-600 hover:bg-green-700 text-white text-xs rounded flex-shrink-0"
                >
                  Use
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Backpack */}
      {unequippedItems.length > 0 && (
        <div className="bg-gray-900 border-2 border-yellow-600 rounded p-3">
          <h3 className="font-bold text-yellow-500 mb-1 text-sm">Backpack</h3>
          <div className="space-y-1 max-h-32 overflow-y-auto mb-2">
            {unequippedItems.map(item => (
              <div
                key={item.id}
                className={`${getRarityBgColor(
                  item.rarity,
                )} border ${getRarityBorderColor(
                  item.rarity,
                )} rounded px-2 py-0.5 text-xs hover:opacity-80 transition-opacity`}
              >
                <div className="flex justify-between items-start">
                  <div>
                    <div
                      className={`font-semibold text-xs ${getRarityColor(
                        item.rarity,
                      )}`}
                    >
                      {item.name}
                    </div>
                    {item.damage && (
                      <div className="text-red-400 text-xs">
                        +{item.damage} DMG
                      </div>
                    )}
                    {item.armor && (
                      <div className="text-blue-400 text-xs">
                        +{item.armor} ARM
                      </div>
                    )}
                  </div>
                  <button
                    onClick={() => onEquip(item.id)}
                    className="px-1 py-0.5 bg-blue-600 hover:bg-blue-700 text-white text-xs rounded whitespace-nowrap flex-shrink-0 ml-1"
                  >
                    Equip
                  </button>
                </div>
                {item.affixes && item.affixes.length > 0 && (
                  <div className="mt-0.5 space-y-0 border-t border-gray-700 pt-0.5">
                    {item.affixes.slice(0, 2).map((affix, idx) => (
                      <div
                        key={idx}
                        className="text-gray-300 text-xs flex items-center gap-1"
                      >
                        <Sparkles className="w-2 h-2" />
                        {affix.name} +{affix.value}
                      </div>
                    ))}
                    {item.affixes.length > 2 && (
                      <div className="text-gray-400 text-xs">
                        +{item.affixes.length - 2} more
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>

          <button
            onClick={onSellAll}
            className="w-full px-2 py-1.5 bg-red-700 hover:bg-red-600 text-white text-xs font-bold rounded-lg transition-colors"
          >
            Sell All Un-equipped Items
          </button>
        </div>
      )}

      {/* Merchant button */}
      <button
        onClick={onOpenShop}
        className="w-full px-3 py-2 bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 text-white font-bold rounded-lg transition-all text-sm flex items-center justify-center gap-2"
      >
        <ShoppingBag className="w-4 h-4" />
        Visit Merchant
      </button>

      {/* Floor / next floor */}
      {enemyDefeated && (
        <button
          onClick={onNextFloor}
          className="w-full px-3 py-2 bg-gradient-to-r from-yellow-600 to-yellow-500 hover:from-yellow-500 hover:to-yellow-400 text-gray-900 font-bold rounded-lg transition-all text-sm"
        >
          <div className="flex items-center justify-center gap-1">
            <ArrowDown className="w-4 h-4" />
            Descend Floor {floor + 1}
          </div>
        </button>
      )}
    </div>
  );
}
