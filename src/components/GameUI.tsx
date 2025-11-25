import { Heart, Zap, TrendingUp, Coins, Package, ArrowDown } from 'lucide-react';
import { Character, Item } from '../types/game';
import { getRarityColor } from '../utils/gameLogic';

interface GameUIProps {
  character: Character;
  items: Item[];
  floor: number;
  onEquip: (itemId: string) => void;
  onUsePotion: (itemId: string) => void;
  onNextFloor: () => void;
  enemyDefeated: boolean;
}

export function GameUI({
  character,
  items,
  floor,
  onEquip,
  onUsePotion,
  onNextFloor,
  enemyDefeated
}: GameUIProps) {
  const healthPercent = (character.health / character.max_health) * 100;
  const manaPercent = (character.mana / character.max_mana) * 100;
  const expToNext = character.level * 100;
  const expPercent = (character.experience / expToNext) * 100;

  const potions = items.filter(i => i.type === 'potion');
  const equippedItems = items.filter(i => i.equipped);
  const unequippedItems = items.filter(i => !i.equipped && i.type !== 'potion');

  return (
    <div className="flex gap-4 max-w-7xl mx-auto">
      <div className="w-80 space-y-4">
        <div className="bg-gray-900 border-2 border-yellow-600 rounded p-4">
          <h2 className="text-xl font-bold text-yellow-500 mb-3">{character.name}</h2>
          <div className="text-sm text-gray-300 mb-3">Level {character.level}</div>

          <div className="space-y-2 mb-4">
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-1">
                <Heart className="w-3 h-3 text-red-500" />
                <span>HP</span>
              </div>
              <span className="text-red-400">{character.health}/{character.max_health}</span>
            </div>
            <div className="w-full bg-gray-800 rounded h-2 overflow-hidden">
              <div
                className="bg-red-600 h-full transition-all duration-300"
                style={{ width: `${healthPercent}%` }}
              />
            </div>

            <div className="flex items-center justify-between text-xs pt-2">
              <div className="flex items-center gap-1">
                <Zap className="w-3 h-3 text-blue-500" />
                <span>Mana</span>
              </div>
              <span className="text-blue-400">{character.mana}/{character.max_mana}</span>
            </div>
            <div className="w-full bg-gray-800 rounded h-2 overflow-hidden">
              <div
                className="bg-blue-600 h-full transition-all duration-300"
                style={{ width: `${manaPercent}%` }}
              />
            </div>

            <div className="flex items-center justify-between text-xs pt-2">
              <div className="flex items-center gap-1">
                <TrendingUp className="w-3 h-3 text-green-500" />
                <span>XP</span>
              </div>
              <span className="text-green-400">{character.experience}/{expToNext}</span>
            </div>
            <div className="w-full bg-gray-800 rounded h-2 overflow-hidden">
              <div
                className="bg-green-600 h-full transition-all duration-300"
                style={{ width: `${expPercent}%` }}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="bg-gray-800 rounded p-2">
              <div className="text-gray-400">STR</div>
              <div className="font-bold text-white">{character.strength}</div>
            </div>
            <div className="bg-gray-800 rounded p-2">
              <div className="text-gray-400">DEX</div>
              <div className="font-bold text-white">{character.dexterity}</div>
            </div>
            <div className="bg-gray-800 rounded p-2">
              <div className="text-gray-400">INT</div>
              <div className="font-bold text-white">{character.intelligence}</div>
            </div>
            <div className="bg-gray-800 rounded p-2 flex items-center gap-1">
              <Coins className="w-3 h-3 text-yellow-400" />
              <div>
                <div className="text-gray-400">Gold</div>
                <div className="font-bold text-yellow-500">{character.gold}</div>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-gray-900 border-2 border-yellow-600 rounded p-4">
          <div className="flex items-center gap-2 mb-3">
            <Package className="w-4 h-4 text-yellow-500" />
            <h3 className="font-bold text-yellow-500">Equipped</h3>
          </div>
          {equippedItems.length === 0 ? (
            <div className="text-xs text-gray-500">No equipped items</div>
          ) : (
            <div className="space-y-1">
              {equippedItems.map(item => (
                <div
                  key={item.id}
                  className="bg-gray-800 border border-green-600 rounded px-2 py-1 text-xs flex justify-between items-center"
                >
                  <div>
                    <div className={`font-semibold ${getRarityColor(item.rarity)}`}>
                      {item.name}
                    </div>
                    {item.damage && <div className="text-red-400">+{item.damage} DMG</div>}
                    {item.armor && <div className="text-blue-400">+{item.armor} ARM</div>}
                  </div>
                  <button
                    onClick={() => onEquip(item.id)}
                    className="px-2 py-0.5 bg-red-600 hover:bg-red-700 text-white text-xs rounded"
                  >
                    Unequip
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {potions.length > 0 && (
          <div className="bg-gray-900 border-2 border-yellow-600 rounded p-4">
            <h3 className="font-bold text-yellow-500 mb-2 text-sm">Potions</h3>
            <div className="space-y-1">
              {potions.map(potion => (
                <div key={potion.id} className="flex items-center justify-between bg-gray-800 rounded p-2">
                  <div className="text-xs">
                    <div className="text-green-400">Health Potion</div>
                    <div className="text-gray-500">+50 HP</div>
                  </div>
                  <button
                    onClick={() => onUsePotion(potion.id)}
                    className="px-2 py-1 bg-green-600 hover:bg-green-700 text-white text-xs rounded"
                  >
                    Use
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {unequippedItems.length > 0 && (
          <div className="bg-gray-900 border-2 border-yellow-600 rounded p-4">
            <h3 className="font-bold text-yellow-500 mb-2 text-sm">Backpack</h3>
            <div className="space-y-1 max-h-48 overflow-y-auto">
              {unequippedItems.map(item => (
                <div
                  key={item.id}
                  className="bg-gray-800 border border-gray-700 rounded px-2 py-1 text-xs flex justify-between items-center hover:border-gray-600"
                >
                  <div>
                    <div className={`font-semibold ${getRarityColor(item.rarity)}`}>
                      {item.name}
                    </div>
                    {item.damage && <div className="text-red-400">+{item.damage} DMG</div>}
                    {item.armor && <div className="text-blue-400">+{item.armor} ARM</div>}
                  </div>
                  <button
                    onClick={() => onEquip(item.id)}
                    className="px-2 py-0.5 bg-blue-600 hover:bg-blue-700 text-white text-xs rounded whitespace-nowrap"
                  >
                    Equip
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="flex-1 flex flex-col items-center justify-center">
        {enemyDefeated && (
          <button
            onClick={onNextFloor}
            className="mb-4 px-6 py-3 bg-gradient-to-r from-yellow-600 to-yellow-500 hover:from-yellow-500 hover:to-yellow-400 text-gray-900 font-bold rounded-lg transition-all"
          >
            <div className="flex items-center gap-2">
              <ArrowDown className="w-5 h-5" />
              Descend to Floor {floor + 1}
            </div>
          </button>
        )}
      </div>
    </div>
  );
}
