// import { Inventory } from './Inventory';
import { useState, useCallback, useEffect } from 'react';
import { GameProvider, useGame } from '../contexts/GameContext';
import { Item } from '../types/game';
import { DungeonView } from './DungeonView';
import TownScene from './TownScene.tsx';
import Tooltip from './Tooltip';
import { Shop } from './Shop';
import { CreateCharacter } from './CreateCharacter';
import { LogOut, FlaskConical, Package, Sword, Coins } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { NotificationBar } from './NotificationBar';
import { SettingsPanel } from './SettingsPanel';
import { ItemTooltip } from './ItemTooltip';
import { TooltipPortal } from './TooltipPortal';
import { getRarityColor, getRarityBgColor, getRarityBorderColor } from '../utils/gameLogic';

export function Game() {
  const [notification, setNotification] = useState<{
    message: string;
    color: string;
  } | null>(null);
  const [shopOpen, setShopOpen] = useState(false);
  const [autoStart, setAutoStart] = useState(false);
  const [localOnly, setLocalOnly] = useState(false);

  // Check for auto-start flag on mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.has('quickstart')) {
      setAutoStart(true);
      setLocalOnly(true);
    }
  }, []);

  // Helper to show notification with rarity-specific styling
  const showNotification = useCallback((rarity: string, itemName: string) => {
    let color = 'bg-yellow-500';
    let label = 'Epic';
    if (rarity === 'legendary') {
      color = 'bg-yellow-500';
      label = 'Legendary';
    } else if (rarity === 'mythic') {
      color = 'bg-red-600';
      label = 'Mythic';
    } else if (rarity === 'radiant') {
      color = 'bg-pink-500';
      label = 'Radiant';
    } else if (rarity === 'set') {
      color = 'bg-green-600';
      label = 'Set';
    } else if (rarity === 'epic') {
      color = 'bg-purple-600';
      label = 'Epic';
    }
    setNotification({ message: `You found a ${label} item: ${itemName}!`, color });
    setTimeout(() => setNotification(null), 4000);
  }, []);

  return (
    <GameProvider notifyDrop={showNotification} localOnly={localOnly}>
      <GameContent notification={notification} setNotification={setNotification} shopOpen={shopOpen} setShopOpen={setShopOpen} autoStart={autoStart} />
    </GameProvider>
  );
}

function FloorSelectOverlay({ currentFloor, maxUnlocked, onSelect, onClose }: { currentFloor: number; maxUnlocked: number; onSelect: (f: number) => void; onClose: () => void }) {
  const options: number[] = [1];
  for (let f = 5; f <= (maxUnlocked || 1); f += 5) options.push(f);
  const floors = Array.from(new Set(options)).sort((a, b) => a - b);
  const nextMilestone = (Math.floor((maxUnlocked || 1) / 5) + 1) * 5;
  const difficultyHint = (f: number) => `+${((f - 1) * 8)}% enemy strength`;
  const lootHint = (f: number) => {
    if (f >= 25) return 'Epic/Legendary+';
    if (f >= 20) return 'Epic+';
    if (f >= 15) return 'Rare/Epic';
    if (f >= 10) return 'Rare+';
    if (f >= 5) return 'Rare';
    return 'Starter';
  };
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/70" onClick={onClose} />
      <div className="relative w-[380px] bg-gray-900 border border-purple-600 rounded-md shadow-xl p-5 animate-fade-in-down">
        <h3 className="text-lg font-semibold text-purple-300 mb-2">Evil Dungeon Orb</h3>
        <p className="text-xs text-gray-300 mb-4 leading-relaxed">
          The orb hums with stored anguish. Choose a depth you have conquered. Each milestone (every 5 floors) amplifies power & loot.
        </p>
        <div className="grid grid-cols-4 gap-2 mb-4">
          {floors.map(f => (
            <button
              key={f}
              onClick={() => onSelect(f)}
              title={`Floor ${f} – ${difficultyHint(f)} | Loot: ${lootHint(f)}`}
              className={`px-2 py-2 rounded text-[11px] font-semibold transition border border-purple-700/40 bg-gray-800 hover:bg-purple-700/40 hover:text-white relative ${f === currentFloor ? 'ring-2 ring-purple-500' : ''}`}
            >
              <span>F{f}</span>
              {f % 5 === 0 && <span className="absolute -top-1 -right-1 text-[9px] bg-purple-600 text-white px-1 rounded">★</span>}
              <div className="mt-1 text-[9px] font-normal tracking-tight text-gray-300">{lootHint(f)}</div>
            </button>
          ))}
          {/* Locked preview of next milestone */}
          <button
            disabled
            title={`Clear Floor ${nextMilestone} to unlock (future milestone)`}
            className="px-2 py-2 rounded text-[11px] font-semibold border border-gray-700 bg-gray-800 text-gray-500 cursor-not-allowed relative"
          >
            F{nextMilestone}
            <span className="absolute -top-1 -right-1 text-[9px] bg-gray-600 text-gray-200 px-1 rounded">LOCK</span>
            <div className="mt-1 text-[9px] font-normal tracking-tight text-gray-500">{lootHint(nextMilestone)}</div>
          </button>
        </div>
        <div className="text-[10px] text-gray-400 mb-3 space-y-1">
          <div>Scaling: +8% enemy strength per floor. Zone Heat further boosts difficulty & loot quality.</div>
          <div>Milestones (5,10,15...): unlock direct descent targets.</div>
        </div>
        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="px-3 py-1.5 text-sm rounded bg-gray-800 hover:bg-gray-700 text-gray-300">Cancel</button>
        </div>
      </div>
    </div>
  );
}

function GameContent({ notification, setNotification, shopOpen, setShopOpen, autoStart }: {
  notification: { message: string; color: string } | null;
  setNotification: (n: { message: string; color: string } | null) => void;
  shopOpen: boolean;
  setShopOpen: (open: boolean) => void;
  autoStart: boolean;
}) {
  // Local tooltip hover state (was previously in parent; moved here to prevent ReferenceError)
  const [hoveredItem, setHoveredItem] = useState<Item | null>(null);
  const [tooltipPos, setTooltipPos] = useState<{x:number;y:number}>({ x: 0, y: 0 });
  const [showTooltip, setShowTooltip] = useState(false);
  const [tooltipTimer, setTooltipTimer] = useState<number | null>(null);
  const [mode, setMode] = useState<'town' | 'dungeon'>('town');
  const [showFloorSelect, setShowFloorSelect] = useState(false);
  const [milestoneFlash, setMilestoneFlash] = useState(false);
  const [levelUpFlash, setLevelUpFlash] = useState<{ active: boolean; level?: number } | null>(
    null,
  );
  const {
    character,
    items,
    currentEnemy,
    floor,
    loading,
    damageNumbers,
    zoneHeat,
    createCharacter,
    attack,
    consumePotion,
    equipItem,
    sellItem,
    buyPotion,
    sellAllItems,
    nextFloor,
    setFloorDirect,
    merchantInventory,
    buyMerchantItem,
    respawnWorldEnemies,
  } = useGame();

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    window.location.reload();
  };

  // Respawn world enemies whenever re-entering the dungeon mode
  useEffect(() => {
    if (mode === 'dungeon') {
      respawnWorldEnemies();
    }
  }, [mode, respawnWorldEnemies]);

  // Listen for dungeon-descend custom event from canvas to trigger nextFloor (must be top-level hook)
  useEffect(() => {
    const handler = () => nextFloor();
    window.addEventListener('dungeon-descend', handler as EventListener);
    return () => window.removeEventListener('dungeon-descend', handler as EventListener);
  }, [nextFloor]);

  // Listen for return-to-town from canvas
  useEffect(() => {
    const toTown = () => setMode('town');
    window.addEventListener('return-to-town', toTown as EventListener);
    return () => window.removeEventListener('return-to-town', toTown as EventListener);
  }, []);

  // Always spawn in town by default; quickstart no longer auto-jumps
  // to the dungeon. Players must explicitly enter via UI/orb.
  useEffect(() => {
    // intentionally empty – reserved for future startup behaviors
  }, [autoStart, character]);

  // Listen for milestone unlock visual effect
  useEffect(() => {
    const handler = () => {
      setMilestoneFlash(true);
      setTimeout(() => setMilestoneFlash(false), 3000);
    };
    window.addEventListener('milestone-unlocked', handler as EventListener);
    return () => window.removeEventListener('milestone-unlocked', handler as EventListener);
  }, []);

  // Listen for level-up events from GameContext for a quick celebratory flash
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail as { level?: number } | undefined;
      setLevelUpFlash({ active: true, level: detail?.level });
      setTimeout(() => setLevelUpFlash(null), 2200);
    };
    window.addEventListener('level-up', handler as EventListener);
    return () => window.removeEventListener('level-up', handler as EventListener);
  }, []);

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

  // Quick access potion info for the bottom bar
  const potionItems = items.filter((i: Item) => i.type === 'potion');
  const potionCount = potionItems.length;
  const firstPotion = potionItems[0];
  const maxFloor = character?.max_floor ?? 1;

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 via-red-950 to-gray-900 p-3 text-[13px]">
      <SettingsPanel />
      {notification && (
        <NotificationBar
          message={notification.message}
          color={notification.color}
          onClose={() => setNotification(null)}
        />
      )}
      <div className="flex items-center justify-between mb-4 max-w-6xl mx-auto">
        <div className="flex items-center gap-3">
          <h1 className="text-3xl font-bold text-yellow-500 tracking-tight">Dark Dungeon</h1>
          <div className="text-sm text-gray-300">
            <Tooltip text={"Zone Heat mechanics:\n• Kills add Heat: Normal +3, Rare +8, Elite +15, Boss +30.\n• Heat decays 1 every 15s.\n• Heat scales enemy difficulty (up to +100% at 100 heat) and increases loot quality: higher chances for rare/epic/legendary and slightly higher set-drop chance. High risk, high reward."} />
          </div>
        </div>
        <div className="flex items-center gap-3">
          {mode === 'dungeon' ? (
            <button
              onClick={() => setMode('town')}
              className="flex items-center gap-2 px-3 py-1.5 bg-gray-800 hover:bg-gray-700 text-gray-200 rounded-md transition-colors font-semibold text-sm"
              title="Return to town"
            >
              🏘️ Town
            </button>
          ) : (
            <button
              onClick={() => setMode('dungeon')}
              className="flex items-center gap-2 px-3 py-1.5 bg-indigo-800 hover:bg-indigo-700 text-white rounded-md transition-colors font-semibold text-sm"
              title="Enter the dungeon"
            >
              🗝️ Enter Dungeon
            </button>
          )}
          <button
            onClick={handleSignOut}
            className="flex items-center gap-2 px-3 py-1.5 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-md transition-colors text-sm"
          >
            <LogOut className="w-4 h-4" />
            Sign Out
          </button>
        </div>
      </div>

      {/* Main row: backpack (left) - dungeon (center) - gear (right) */}
      <div className="flex justify-center gap-3 mt-2 max-w-6xl mx-auto">
        {/* Left: Character + Backpack */}
        <div className="flex-shrink-0 w-64 bg-gray-900 border-2 border-yellow-600 rounded-md p-2">
          {/* Character Stats */}
          <div className="mb-3">
            <h3 className="text-base font-bold text-yellow-500 mb-1 leading-tight truncate flex items-baseline gap-2">
              <span>{character.name}</span>
              <span className="text-xs font-semibold text-gray-300">Lv {character.level}</span>
            </h3>
            <div className="grid grid-cols-3 gap-1 text-[11px] mb-1">
              <div className="bg-gray-800 rounded p-1.5">
                <div className="text-gray-400">STR</div>
                <div className="font-bold text-white">{character.strength}</div>
              </div>
              <div className="bg-gray-800 rounded p-1.5">
                <div className="text-gray-400">DEX</div>
                <div className="font-bold text-white">{character.dexterity}</div>
              </div>
              <div className="bg-gray-800 rounded p-1.5">
                <div className="text-gray-400">INT</div>
                <div className="font-bold text-white">{character.intelligence}</div>
              </div>
            </div>
            <div className="space-y-0.5">
              <div className="flex justify-between text-xs">
                <span className="text-gray-300">HP</span>
                <span className="text-red-400">{character.health}/{character.max_health}</span>
              </div>
              <div className="w-full bg-gray-800 rounded h-1.5 overflow-hidden">
                <div className="bg-red-600 h-full" style={{ width: `${Math.max(0, Math.min(100, (character.health/character.max_health)*100))}%` }} />
              </div>
              <div className="flex justify-between text-xs pt-1">
                <span className="text-gray-300">Mana</span>
                <span className="text-blue-400">{character.mana}/{character.max_mana}</span>
              </div>
              <div className="w-full bg-gray-800 rounded h-1.5 overflow-hidden">
                <div className="bg-blue-600 h-full" style={{ width: `${Math.max(0, Math.min(100, (character.mana/character.max_mana)*100))}%` }} />
              </div>
              <div className="flex justify-between text-xs pt-1">
                <span className="text-gray-300">XP</span>
                <span className="text-green-400">{character.experience}/{character.level*100}</span>
              </div>
              <div className="w-full bg-gray-800 rounded h-1.5 overflow-hidden">
                <div className="bg-green-600 h-full" style={{ width: `${Math.max(0, Math.min(100, (character.experience/(character.level*100))*100))}%` }} />
              </div>
            </div>
          </div>
          <div className="flex items-center justify-between gap-2 mb-2">
            <div className="flex items-center gap-1">
              <Package className="w-4 h-4 text-yellow-500" />
              <h3 className="text-sm font-semibold text-yellow-500">Backpack</h3>
            </div>
            <div className="flex items-center gap-1 px-2 py-0.5 rounded bg-gray-900/90 border border-yellow-700/70">
              <Coins className="w-3.5 h-3.5 text-yellow-300" />
              <span className="text-[11px] font-semibold text-yellow-200">{character.gold}</span>
            </div>
          </div>
          <div className="mb-2 text-[11px] text-gray-300 flex justify-between"><span>Floor {floor}</span><span>Max {maxFloor}</span></div>
          <div className="h-72 overflow-y-auto border border-gray-700 rounded-md p-1.5 bg-gray-950/50 space-y-1">
            {items.filter((i: Item) => !i.equipped && i.type !== 'potion').length === 0 ? (
              <div className="text-center py-8 text-gray-500 text-sm">No items</div>
            ) : (
              items
                .filter((i: Item) => !i.equipped && i.type !== 'potion')
                .reverse()
                .map(item => (
                  <div
                    key={item.id}
                    className={`relative group border rounded-sm p-1 flex items-center justify-between hover:border-opacity-100 transition-colors text-[12px] ${getRarityBgColor(item.rarity)} border ${getRarityBorderColor(item.rarity)}`}
                    onMouseEnter={(e) => {
                      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                      setHoveredItem(item);
                      // Edge-aware positioning: prefer right, flip to left if near screen edge
                      const preferRightX = rect.right + 8;
                      const preferLeftX = rect.left - 8;
                      const spaceRight = window.innerWidth - rect.right;
                      const x = spaceRight < 280 ? Math.max(8, preferLeftX - 260) : preferRightX;
                      setTooltipPos({ x, y: Math.max(8, rect.top) });
                      // Small delay to reduce flicker
                      const t = window.setTimeout(() => setShowTooltip(true), 90);
                      setTooltipTimer(t);
                    }}
                    onMouseLeave={() => {
                      setHoveredItem(null);
                      setShowTooltip(false);
                      if (tooltipTimer) window.clearTimeout(tooltipTimer);
                      setTooltipTimer(null);
                    }}
                  >
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <div>
                        <div className={`font-semibold truncate text-[11px] ${getRarityColor(item.rarity)}`}>{item.name}</div>
                        {(() => {
                          const typeDisplay = item.type.replace(/_/g, ' ');
                          return (
                            <div className={`text-[10px] ${getRarityColor(item.rarity)} opacity-70 lowercase leading-tight`}>
                              {item.rarity} <span className="capitalize">{typeDisplay}</span>
                            </div>
                          );
                        })()}
                        {(item.damage || item.armor) && (
                          <div className={`text-[10px] ${getRarityColor(item.rarity)} opacity-70 mt-0.5 leading-tight`}>
                            {item.damage && `+${item.damage} Dmg`}
                            {item.damage && item.armor && ' • '}
                            {item.armor && `+${item.armor} Arm`}
                          </div>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() => equipItem(item.id)}
                      className="px-2 py-0.5 bg-blue-600 hover:bg-blue-700 text-white text-[11px] rounded flex-shrink-0"
                    >
                      Equip
                    </button>
                  </div>
                ))
            )}
          </div>
          <div className="mt-2 flex items-center gap-2 p-2 rounded-md border border-red-900/40 bg-black/40">
            <FlaskConical className="w-3 h-3 text-green-400" />
            <span className="text-[11px] text-gray-300 uppercase">Potions</span>
            <button
              type="button"
              disabled={!firstPotion}
              onClick={() => { if (firstPotion) void consumePotion(firstPotion.id); }}
              className={`ml-auto px-2 py-0.5 rounded text-[11px] font-medium ${firstPotion ? 'bg-green-600 hover:bg-green-700 text-white' : 'bg-gray-700 text-gray-400 cursor-not-allowed'}`}
            >
              {firstPotion ? `Use (${potionCount})` : 'None'}
            </button>
          </div>
        </div>

        {/* Center: Town or Dungeon */}
        <div className="flex-shrink-0">
          {mode === 'dungeon' ? (
            <DungeonView enemy={currentEnemy} floor={floor} onAttack={attack} damageNumbers={damageNumbers} character={character} zoneHeat={zoneHeat} />
          ) : (
            <TownScene onRequestDungeonEntry={() => setShowFloorSelect(true)} onOpenShop={() => setShopOpen(true)} />
          )}
        </div>

        {/* Right: Equipped Gear Grid */}
        <div className="flex-shrink-0 w-64 bg-gray-900 border-2 border-yellow-600 rounded-md p-2">
          <div className="flex items-center gap-1 mb-2">
            <Sword className="w-4 h-4 text-yellow-500" />
            <h3 className="text-sm font-semibold text-yellow-500">Equipment</h3>
          </div>
          <div className="bg-gray-950 border border-gray-700 rounded p-2">
            {(() => {
              const equippedBySlot: Record<string, Item> = {};
              items.filter((i: Item) => i.equipped).forEach(item => {
                const slot = (() => {
                  if (item.type === 'weapon' || item.type === 'melee_weapon' || item.type === 'ranged_weapon' || item.type === 'mage_weapon') return 'weapon';
                  if (item.type === 'helmet') return 'helmet';
                  if (item.type === 'trinket') return 'trinket';
                  if (item.type === 'gloves') return 'gloves';
                  if (item.type === 'boots') return 'boots';
                  if (item.type === 'belt') return 'belt';
                  if (item.type === 'ring') return 'ring';
                  if (item.type === 'amulet') return 'amulet';
                  if (item.type === 'melee_armor' || item.type === 'ranged_armor' || item.type === 'mage_armor') return 'armor';
                  return 'other';
                })();
                if (!equippedBySlot[slot]) equippedBySlot[slot] = [];
                equippedBySlot[slot].push(item);
              });

              // Detect two-handed weapon to mirror in off-hand slot visually
              const twoHandedWeapon = (() => {
                const w = (equippedBySlot['weapon'] || [])[0];
                if (!w) return null;
                const nameLast = String(w.name || '').split(' ').slice(-1)[0].toLowerCase();
                const twoHandedList = ['bow','longbow','shortbow','crossbow','staff','warhammer'];
                return twoHandedList.includes(nameLast) ? w : null;
              })();

              const slotConfig: Record<number, { key: string; label: string }> = {
                1: { key: 'gloves', label: 'Gloves' },
                2: { key: 'helmet', label: 'Head' },
                3: { key: 'trinket', label: 'Trinket' },
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

                let item = (equippedBySlot[slot.key] || [])[0];
                // If off-hand empty but two-handed weapon equipped, show mirrored weapon
                const isOffHand = slot.key === 'amulet';
                if (!item && isOffHand && twoHandedWeapon) {
                  item = { ...twoHandedWeapon, _mirroredTwoHand: true };
                }
                const borderClass = item ? `border-2 ${getRarityBorderColor(item.rarity)}` : 'border-2 border-dashed border-gray-600';
                const bgClass = item ? getRarityBgColor(item.rarity) : 'bg-gray-950';

                return (
                  <div
                    key={slot.key}
                    className={`relative group aspect-square rounded-lg p-1.5 flex flex-col items-center justify-center cursor-pointer transition-all hover:shadow-lg ${borderClass} ${bgClass}`}
                    title={item ? item.name : slot.label}
                    onMouseEnter={(e) => {
                      if (!item || item._mirroredTwoHand) return;
                      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                      setHoveredItem(item);
                      const preferRightX = rect.right + 8;
                      const preferLeftX = rect.left - 8;
                      const spaceRight = window.innerWidth - rect.right;
                      const x = spaceRight < 280 ? Math.max(8, preferLeftX - 260) : preferRightX;
                      setTooltipPos({ x, y: Math.max(8, rect.top) });
                      const t = window.setTimeout(() => setShowTooltip(true), 90);
                      setTooltipTimer(t);
                    }}
                    onMouseLeave={() => {
                      setHoveredItem(null);
                      setShowTooltip(false);
                      if (tooltipTimer) window.clearTimeout(tooltipTimer);
                      setTooltipTimer(null);
                    }}
                  >
                    {item ? (
                      <div className="text-center w-full">
                        <div className={`text-[10px] font-semibold truncate ${getRarityColor(item.rarity)}`}>{item.name}</div>
                        {item.damage && <div className="text-[10px] font-bold mt-0.5" style={{color: '#fbbf24'}}>+{item.damage}</div>}
                        {item.armor && <div className="text-[10px] font-bold" style={{color: '#60a5fa'}}>+{item.armor}</div>}
                        {item._mirroredTwoHand && (
                          <div className="mt-0.5 text-[9px] text-gray-300">2H</div>
                        )}
                      </div>
                    ) : (
                      <div className="text-[10px] text-gray-600 text-center font-medium">{slot.label}</div>
                    )}
                  </div>
                );
              };

              return (
                <div className="grid grid-cols-3 gap-1">
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
          merchantInventory={merchantInventory}
          onClose={() => setShopOpen(false)}
          onSellItem={sellItem}
          onBuyPotion={buyPotion}
          onSellAll={sellAllItems}
          onBuyMerchantItem={buyMerchantItem}
        />
      )}

      {showFloorSelect && (
        <FloorSelectOverlay
          currentFloor={floor}
          maxUnlocked={maxFloor}
          onClose={() => setShowFloorSelect(false)}
          onSelect={(target) => {
            setShowFloorSelect(false);
            setFloorDirect(target);
            setMode('dungeon');
          }}
        />
      )}

      {/* Global tooltip portal */}
      {hoveredItem && showTooltip && (
        <TooltipPortal x={tooltipPos.x} y={tooltipPos.y}>
          <ItemTooltip item={hoveredItem} />
        </TooltipPortal>
      )}
      {milestoneFlash && (
        <div className="fixed inset-0 pointer-events-none flex items-center justify-center z-40">
          <div className="absolute inset-0 bg-black/70 animate-pulse" />
          <div className="relative bg-gradient-to-br from-purple-800 via-red-700 to-yellow-600 px-8 py-6 rounded-lg border-2 border-yellow-400 shadow-2xl animate-fade-in-down">
            <div className="text-2xl font-extrabold text-yellow-300 tracking-wide mb-2">Milestone Unlocked!</div>
            <div className="text-xs text-gray-200">New depth remembered by the Orb.</div>
          </div>
        </div>
      )}
      {levelUpFlash?.active && (
        <div className="fixed inset-0 pointer-events-none flex items-center justify-center z-40">
          <div className="absolute inset-0 bg-black/60 animate-fade-in" />
          <div className="relative bg-gradient-to-br from-yellow-500 via-orange-500 to-red-600 px-7 py-4 rounded-lg border-2 border-yellow-300 shadow-2xl animate-fade-in-up">
            <div className="text-2xl font-extrabold text-yellow-100 tracking-wide mb-1 text-center">
              Level Up!
            </div>
            {typeof levelUpFlash.level === 'number' && (
              <div className="text-xs text-yellow-50 text-center">
                You reached level {levelUpFlash.level}.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
