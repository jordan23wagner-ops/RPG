import { Inventory } from './Inventory';
import { useState } from 'react';
import { useGame } from '../contexts/GameContext';
import { DungeonView } from './DungeonView';
import { GameUI } from './GameUI';
import { Shop } from './Shop';
import { CreateCharacter } from './CreateCharacter';
import { LogOut, FlaskConical } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { EquipmentPanel } from './EquipmentPanel';

export function Game() {
  const [shopOpen, setShopOpen] = useState(false);

  const {
    character,
    items,
    currentEnemy,
    floor,
    loading,
    createCharacter,
    attack,
    usePotion,
    equipItem,
    nextFloor,
    sellItem,
    buyPotion,
    sellAllItems,
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
    return <CreateCharacter onCreate={createCharacter} />;
  }
  
  const enemyDefeated = currentEnemy ? currentEnemy.health <= 0 : false;
  // Quick access potion info for the bottom bar
  const potionItems = items.filter(i => i.type === 'potion');
  const potionCount = potionItems.length;
  const firstPotion = potionItems[0];

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 via-red-950 to-gray-900 p-4">
      <div className="flex items-center justify-between mb-6 max-w-7xl mx-auto">
        <h1 className="text-4xl font-bold text-yellow-500">Dark Dungeon</h1>
        <button
          onClick={handleSignOut}
          className="flex items-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg transition-colors"
        >
          <LogOut className="w-4 h-4" />
          Sign Out
        </button>
      </div>

      {/* Main row: left HUD + dungeon */}
      <div className="flex gap-6 max-w-7xl mx-auto">
        <div className="w-80 flex-shrink-0">
          <GameUI
            character={character}
            items={items}
            floor={floor}
            onEquip={equipItem}
            onUsePotion={usePotion}
            onNextFloor={nextFloor}
            enemyDefeated={enemyDefeated}
            onOpenShop={() => setShopOpen(true)}
            onSellAll={sellAllItems}
          />
        </div>

        <div className="flex-1 flex justify-center">
          <DungeonView enemy={currentEnemy} floor={floor} onAttack={attack} />
        </div>
      </div>

      {/* Potion quick bar under the dungeon */}
      <div className="max-w-7xl mx-auto mt-4 flex justify-center">
        <div className="w-full md:w-auto flex items-center justify-center gap-4 rounded-lg border border-red-900/40 bg-black/40 px-4 py-2">
          <div className="flex items-center gap-2 text-sm text-gray-300 uppercase tracking-wide">
            <FlaskConical className="w-4 h-4 text-green-400" />
            <span>Quick Potions</span>
          </div>
          <button
            type="button"
            disabled={!firstPotion}
            onClick={() => {
              if (firstPotion) {
                void usePotion(firstPotion.id);
              }
            }}
            className={`px-4 py-1.5 rounded text-sm font-medium transition-colors
              ${firstPotion
                ? 'bg-green-600 hover:bg-green-700 text-white'
                : 'bg-gray-700 text-gray-400 cursor-not-allowed'
              }`}
          >
            {firstPotion
              ? `Use Potion${potionCount > 1 ? ` (${potionCount})` : ''}`
              : 'No Potions'}
          </button>
        </div>
      </div>

      {/* Wide gear + backpack panel under the dungeon */}
      <div className="max-w-7xl mx-auto mt-6">
        <Inventory
          items={items}
          onEquip={equipItem}
          onUsePotion={usePotion}
        />
      </div>

      {shopOpen && (
        <Shop
          character={character}
          items={items}
          onClose={() => setShopOpen(false)}
          onSellItem={sellItem}
          onBuyPotion={buyPotion}
        />
      )}
    </div>
  );
}
