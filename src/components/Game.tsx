import { useState } from 'react';
import { useGame } from '../contexts/GameContext';
import { DungeonView } from './DungeonView';
import { GameUI } from './GameUI';
import { Shop } from './Shop';
import { CreateCharacter } from './CreateCharacter';
import { LogOut } from 'lucide-react';
import { supabase } from '../lib/supabase';

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
    buyPotion
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

      <div className="flex gap-6">
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
          />
        </div>

        <div className="flex-1 flex justify-center">
          <DungeonView
            enemy={currentEnemy}
            floor={floor}
            onAttack={attack}
          />
        </div>
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
