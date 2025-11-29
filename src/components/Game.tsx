import { Inventory } from './Inventory';
import { useState, useCallback, useEffect } from 'react';
import { GameProvider, useGame } from '../contexts/GameContext';
import { DungeonView } from './DungeonView';
import Tooltip from './Tooltip';
import { Shop } from './Shop';
import { CreateCharacter } from './CreateCharacter';
import { LogOut, FlaskConical, Package, Sword, ShoppingBag } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { NotificationBar } from './NotificationBar';

export function Game() {
  const [notification, setNotification] = useState<{
    message: string;
    color: string;
  } | null>(null);
  const [shopOpen, setShopOpen] = useState(false);
  const [autoStart, setAutoStart] = useState(false);

  // Check for auto-start flag on mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.has('quickstart')) {
      setAutoStart(true);
    }
  }, []);

  // Helper to show notification with rarity-specific styling
  const showNotification = useCallback((rarity: string, itemName: string) => {
    let color = 'bg-yellow-500';
    let label = 'Legendary';
    if (rarity === 'mythic') {
      color = 'bg-purple-700';
      label = 'Mythic';
    } else if (rarity === 'radiant') {
      color = 'bg-blue-500';
      label = 'Radiant';
    } else if (rarity === 'set') {
      color = 'bg-green-600';
      label = 'Set';
    }
    setNotification({ message: `You found a ${label} item: ${itemName}!`, color });
    setTimeout(() => setNotification(null), 4000);
  }, []);

  return (
    <GameProvider notifyDrop={showNotification}>
      <GameContent notification={notification} setNotification={setNotification} shopOpen={shopOpen} setShopOpen={setShopOpen} autoStart={autoStart} />
    </GameProvider>
  );
}

function GameContent({ notification, setNotification, shopOpen, setShopOpen, autoStart }: {
  notification: { message: string; color: string } | null;
  setNotification: (n: any) => void;
  shopOpen: boolean;
  setShopOpen: (open: boolean) => void;
  autoStart: boolean;
}) {
  const {
    character,
    items,
    currentEnemy,
    floor,
    loading,
    damageNumbers,
    zoneHeat,
    rarityFilter,
    createCharacter,
    attack,
    usePotion,
    equipItem,
    sellItem,
    buyPotion,
    sellAllItems,
    toggleRarityFilter,
  } = useGame();

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    window.location.reload();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-900 via-red-950 to-gray-900 flex items-center justify-center">
        <div className="text-yellow-500 text-xl">Loading...</div>
      </div>
    );
  }

  if (!character) {
    return <CreateCharacter onCreate={createCharacter} autoStart={autoStart} />;
  }

  const enemyDefeated = currentEnemy ? currentEnemy.health <= 0 : false;
  // Quick access potion info for the bottom bar
  const potionItems = items.filter((i: any) => i.type === 'potion');
  const potionCount = potionItems.length;
  const firstPotion = potionItems[0];

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 via-red-950 to-gray-900 p-4">
      {notification && (
        <NotificationBar
          message={notification.message}
          color={notification.color}
          onClose={() => setNotification(null)}
        />
      )}
      <div className="flex items-center justify-between mb-6 max-w-7xl mx-auto">
        <div className="flex items-center gap-3">
          <h1 className="text-4xl font-bold text-yellow-500">Dark Dungeon</h1>
          <div className="text-sm text-gray-300">
            <Tooltip text={"Zone Heat mechanics:\n• Kills add Heat: Normal +3, Rare +8, Elite +15, Boss +30.\n• Heat decays 1 every 15s.\n• Heat scales enemy difficulty (up to +100% at 100 heat) and increases loot quality: higher chances for rare/epic/legendary and slightly higher set-drop chance. High risk, high reward."} />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShopOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-orange-800 hover:bg-orange-700 text-white rounded-lg transition-colors font-semibold"
          >
            <ShoppingBag className="w-4 h-4" />
            Merchant
          </button>
          <button
            onClick={handleSignOut}
            className="flex items-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg transition-colors"
          >
            <LogOut className="w-4 h-4" />
            Sign Out
          </button>
        </div>
      </div>

      {/* Main row: backpack (left) - dungeon (center) - gear (right) */}
      <div className="flex justify-center gap-4 mt-4 max-w-7xl mx-auto">
        {/* Left: Backpack */}
        <div className="flex-shrink-0 w-80 bg-gray-900 border-2 border-yellow-600 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-4">
            <Package className="w-5 h-5 text-yellow-500" />
            <h3 className="text-lg font-bold text-yellow-500">Backpack</h3>
          </div>
          <div className="h-96 overflow-y-auto border border-gray-700 rounded-lg p-2 bg-gray-950/50 space-y-2">
            {items.filter((i: any) => !i.equipped && i.type !== 'potion').length === 0 ? (
              <div className="text-center py-8 text-gray-500 text-sm">No items</div>
            ) : (
              items
                .filter((i: any) => !i.equipped && i.type !== 'potion')
                .reverse()
                .map(item => (
                  <div
                    key={item.id}
                    className="relative group bg-gray-800 border border-gray-700 rounded p-2 flex items-center justify-between hover:border-gray-600 transition-colors text-sm"
                  >
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <div>
                        <div className="font-semibold text-gray-200 truncate">{item.name}</div>
                        <div className="text-xs text-gray-400">{item.rarity}</div>
                        {(item.damage || item.armor) && (
                          <div className="text-xs text-gray-400 mt-0.5">
                            {item.damage && `+${item.damage} Dmg`}
                            {item.damage && item.armor && ' • '}
                            {item.armor && `+${item.armor} Arm`}
                          </div>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() => equipItem(item.id)}
                      className="px-2 py-1 bg-blue-600 hover:bg-blue-700 text-white text-xs rounded flex-shrink-0"
                    >
                      Equip
                    </button>
                  </div>
                ))
            )}
          </div>
          <div className="mt-4 flex items-center gap-2 p-3 rounded-lg border border-red-900/40 bg-black/40">
            <FlaskConical className="w-4 h-4 text-green-400" />
            <span className="text-xs text-gray-300 uppercase">Potions</span>
            <button
              type="button"
              disabled={!firstPotion}
              onClick={() => { if (firstPotion) void usePotion(firstPotion.id); }}
              className={`ml-auto px-3 py-1 rounded text-xs font-medium ${firstPotion ? 'bg-green-600 hover:bg-green-700 text-white' : 'bg-gray-700 text-gray-400 cursor-not-allowed'}`}
            >
              {firstPotion ? `Use (${potionCount})` : 'None'}
            </button>
          </div>

          {/* Rarity Filter */}
          <div className="mt-4 p-3 rounded-lg border border-purple-900/40 bg-black/40">
            <div className="text-xs text-gray-300 uppercase font-semibold mb-2">Skip Rarities</div>
            <div className="grid grid-cols-2 gap-1">
              {['magic', 'rare', 'epic', 'legendary', 'set', 'mythic'].map(rarity => (
                <button
                  key={rarity}
                  onClick={() => toggleRarityFilter(rarity)}
                  className={`px-2 py-1 text-xs rounded font-medium transition-colors ${
                    rarityFilter.has(rarity)
                      ? 'bg-purple-600 text-white'
                      : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  }`}
                >
                  {rarity.charAt(0).toUpperCase() + rarity.slice(1)}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Center: Dungeon Canvas */}
        <div className="flex-shrink-0">
          <DungeonView enemy={currentEnemy} floor={floor} onAttack={attack} damageNumbers={damageNumbers} character={character} zoneHeat={zoneHeat} />
        </div>

        {/* Right: Equipped Gear Grid */}
        <div className="flex-shrink-0 w-80 bg-gray-900 border-2 border-yellow-600 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-4">
            <Sword className="w-5 h-5 text-yellow-500" />
            <h3 className="text-lg font-bold text-yellow-500">Equipment</h3>
          </div>
          <div className="bg-gray-950 border border-gray-700 rounded p-3">
            {(() => {
              const equippedBySlot: Record<string, any> = {};
              items.filter((i: any) => i.equipped).forEach(item => {
                const slot = (() => {
                  if (item.type === 'weapon' || item.type === 'melee_weapon' || item.type === 'ranged_weapon' || item.type === 'mage_weapon') return 'weapon';
                  if (item.type === 'helmet') return 'helmet';
                  if (item.type === 'melee_armor' || item.type === 'ranged_armor' || item.type === 'mage_armor') return 'armor';
                  if (item.type === 'gloves') return 'gloves';
                  if (item.type === 'boots') return 'boots';
                  if (item.type === 'belt') return 'belt';
                  if (item.type === 'ring') return 'ring';
                  if (item.type === 'amulet') return 'amulet';
                  return 'other';
                })();
                if (!equippedBySlot[slot]) equippedBySlot[slot] = [];
                equippedBySlot[slot].push(item);
              });

              const slotConfig: Record<number, { key: string; label: string }> = {
                2: { key: 'helmet', label: 'Head' },
                4: { key: 'weapon', label: 'Weapon' },
                5: { key: 'armor', label: 'Body' },
                6: { key: 'amulet', label: 'Off-Hand' },
                7: { key: 'ring', label: 'Ring' },
                8: { key: 'boots', label: 'Feet' },
                9: { key: 'belt', label: 'Ring' },
              };

              const renderSlot = (gridNum: number) => {
                const slot = slotConfig[gridNum];
                if (!slot) return <div key={`empty-${gridNum}`} className="aspect-square" />;

                const item = (equippedBySlot[slot.key] || [])[0];
                const rarityColors: Record<string, string> = {
                  normal: 'border-gray-600 bg-gray-800',
                  magic: 'border-blue-500 bg-blue-950',
                  rare: 'border-purple-500 bg-purple-950',
                  epic: 'border-yellow-600 bg-yellow-950',
                  legendary: 'border-red-600 bg-red-950',
                  set: 'border-green-600 bg-green-950',
                  mythic: 'border-indigo-600 bg-indigo-950',
                  radiant: 'border-cyan-500 bg-cyan-950',
                };
                const colorClass = item ? rarityColors[item.rarity] || 'border-gray-600 bg-gray-800' : 'border-dashed border-gray-600 bg-gray-950';

                return (
                  <div
                    key={slot.key}
                    className={`aspect-square border-2 rounded-lg p-2 flex flex-col items-center justify-center cursor-pointer transition-all hover:shadow-lg ${colorClass}`}
                    title={item ? item.name : slot.label}
                  >
                    {item ? (
                      <div className="text-center w-full">
                        <div className="text-xs font-semibold text-gray-200 truncate">{item.name}</div>
                        {item.damage && <div className="text-xs text-yellow-300 font-bold">+{item.damage}</div>}
                        {item.armor && <div className="text-xs text-blue-300 font-bold">+{item.armor}</div>}
                      </div>
                    ) : (
                      <div className="text-xs text-gray-600 text-center font-medium">{slot.label}</div>
                    )}
                  </div>
                );
              };

              return (
                <div className="grid grid-cols-3 gap-2">
                  {Array.from({ length: 9 }, (_, i) => i + 1).map(gridNum => renderSlot(gridNum))}
                </div>
              );
            })()}
          </div>
        </div>
      </div>

      {shopOpen && (
        <Shop
          character={character}
          items={items}
          onClose={() => setShopOpen(false)}
          onSellItem={sellItem}
          onBuyPotion={buyPotion}
          onSellAll={sellAllItems}
        />
      )}
    </div>
  );
}
