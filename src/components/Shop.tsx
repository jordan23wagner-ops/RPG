import { ShoppingBag, X } from 'lucide-react';
import { Character, Item } from '../types/game';
import { getRarityColor, getRarityBgColor } from '../utils/gameLogic';

interface ShopProps {
  character: Character;
  items: Item[];
  onClose: () => void;
  onSellItem: (itemId: string) => void;
  onBuyPotion: () => void;
}

const POTION_COST = 75;

export function Shop({ character, items, onClose, onSellItem, onBuyPotion }: ShopProps) {
  const sellableItems = items.filter(i => !i.equipped);
  const totalSellValue = sellableItems.reduce((sum, item) => sum + item.value, 0);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-gray-900 border-4 border-yellow-600 rounded-lg p-6 w-full max-w-2xl max-h-96 overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <ShoppingBag className="w-6 h-6 text-yellow-500" />
            <h2 className="text-2xl font-bold text-yellow-500">Merchant's Shop</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-800 rounded transition-colors"
          >
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="border-r border-gray-700 pr-6">
            <h3 className="text-lg font-bold text-yellow-500 mb-3">Buy Potions</h3>
            <div className="bg-gray-800 border-2 border-green-600 rounded p-4 mb-4">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <div className="text-green-400 font-semibold">Health Potion</div>
                  <div className="text-gray-400 text-sm">Restores 50 HP</div>
                </div>
                <div className="text-right">
                  <div className="text-yellow-500 font-bold text-lg">{POTION_COST} Gold</div>
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={onBuyPotion}
                  disabled={character.gold < POTION_COST}
                  className={`flex-1 px-3 py-2 rounded font-semibold transition-colors ${
                    character.gold >= POTION_COST
                      ? 'bg-green-600 hover:bg-green-700 text-white'
                      : 'bg-gray-700 text-gray-500 cursor-not-allowed'
                  }`}
                >
                  Buy Potion
                </button>
              </div>
              {character.gold < POTION_COST && (
                <div className="text-red-400 text-xs mt-2">
                  Need {POTION_COST - character.gold} more gold
                </div>
              )}
            </div>
            <div className="bg-gray-800 rounded p-3 text-sm">
              <div className="text-gray-300 mb-2">Your Gold: <span className="text-yellow-500 font-bold text-lg">{character.gold}</span></div>
            </div>
          </div>

          <div className="lg:border-l border-gray-700 lg:pl-6">
            <h3 className="text-lg font-bold text-yellow-500 mb-3">Sell Items</h3>
            {sellableItems.length === 0 ? (
              <div className="text-gray-400 text-center py-8">No items to sell</div>
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {sellableItems.map(item => (
                  <div
                    key={item.id}
                    className={`${getRarityBgColor(item.rarity)} border rounded px-3 py-2 flex items-center justify-between`}
                  >
                    <div>
                      <div className={`font-semibold text-sm ${getRarityColor(item.rarity)}`}>
                        {item.name}
                      </div>
                      <div className="text-yellow-500 text-xs font-semibold">
                        {item.value} Gold
                      </div>
                    </div>
                    <button
                      onClick={() => onSellItem(item.id)}
                      className="px-2 py-1 bg-orange-600 hover:bg-orange-700 text-white text-xs rounded transition-colors"
                    >
                      Sell
                    </button>
                  </div>
                ))}
              </div>
            )}
            {sellableItems.length > 0 && (
              <div className="mt-3 bg-gray-800 rounded p-3 text-sm border border-gray-700">
                <div className="text-gray-300 mb-2">Total Value:</div>
                <div className="text-yellow-500 font-bold text-lg">{totalSellValue} Gold</div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
