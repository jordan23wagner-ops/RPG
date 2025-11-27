import { Package, Sword, Shield, FlaskConical } from 'lucide-react';
import { Item } from '../types/game';
import { getRarityColor } from '../utils/gameLogic';

interface InventoryProps {
  items: Item[];
  onEquip: (itemId: string) => void;
  onUsePotion: (itemId: string) => void;
  onSellAll: () => void; // 👈 NEW
}

export function Inventory({ items, onEquip, onUsePotion, onSellAll }: InventoryProps) {
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

  // Only sell unequipped, non-potion items (matches sellAllItems in context)
  const sellableCount = unequippedItems.filter(i => i.type !== 'potion').length;

  const handleSellAllClick = () => {
    if (sellableCount === 0) return;
    const confirmed = window.confirm(
      `Sell all ${sellableCount} unequipped non-potion items?`
    );
    if (!confirmed) return;
    onSellAll();
  };

  return (
    <div className="bg-gray-900 border-2 border-yellow-600 rounded-lg p-4">
      <div className="flex items-center justify-between gap-2 mb-4">
        <div className="flex items-center gap-2">
          <Package className="w-5 h-5 text-yellow-500" />
          <h3 className="text-xl font-bold text-yellow-500">Inventory</h3>
        </div>

        {/* Sell All button */}
        <button
          onClick={handleSellAllClick}
          disabled={sellableCount === 0}
          className={`px-3 py-1 text-xs rounded transition-colors border
            ${
              sellableCount === 0
                ? 'bg-gray-700 text-gray-500 border-gray-700 cursor-not-allowed'
                : 'bg-red-600 hover:bg-red-700 text-white border-red-500'
            }`}
        >
          Sell All
        </button>
      </div>

      {equippedItems.length > 0 && (
        <div className="mb-4">
          <h4 className="text-sm font-semibold text-gray-400 mb-2">Equipped</h4>
          <div className="space-y-2">
            {equippedItems.map(item => (
              <div
                key={item.id}
                className="bg-gray-800 border border-green-600 rounded p-2 flex items-center justify-between"
              >
                <div className="flex items-center gap-2">
                  <div className="text-green-400">
                    {getItemIcon(item.type)}
                  </div>
                  <div>
                    <div className={`font-semibold ${getRarityColor(item.rarity)}`}>
                      {item.name}
                    </div>
                    <div className="text-xs text-gray-400">
                      {item.damage && `+${item.damage} Damage`}
                      {item.armor && `+${item.armor} Armor`}
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => onEquip(item.id)}
                  className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white text-xs rounded transition-colors"
                >
                  Unequip
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      <div>
        <h4 className="text-sm font-semibold text-gray-400 mb-2">
          {equippedItems.length > 0 ? 'Backpack' : 'Items'}
        </h4>
        {unequippedItems.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            No items in inventory
          </div>
        ) : (
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {unequippedItems.map(item => (
              <div
                key={item.id}
                className="bg-gray-800 border border-gray-700 rounded p-2 flex items-center justify-between hover:border-gray-600 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <div className={getRarityColor(item.rarity)}>
                    {getItemIcon(item.type)}
                  </div>
                  <div>
                    <div className={`font-semibold ${getRarityColor(item.rarity)}`}>
                      {item.name}
                    </div>
                    <div className="text-xs text-gray-400">
                      {item.damage && `+${item.damage} Damage`}
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
