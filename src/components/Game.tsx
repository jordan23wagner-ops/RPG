import { useGame } from '../contexts/GameContext';
import { CharacterStats } from './CharacterStats';
import { Inventory } from './Inventory';
import { Combat } from './Combat';
import { CreateCharacter } from './CreateCharacter';
import { LogOut } from 'lucide-react';
import { supabase } from '../lib/supabase';

export function Game() {
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
    nextFloor
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

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 via-red-950 to-gray-900 p-4">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-4xl font-bold text-yellow-500">Dark Dungeon</h1>
          <button
            onClick={handleSignOut}
            className="flex items-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg transition-colors"
          >
            <LogOut className="w-4 h-4" />
            Sign Out
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-1 space-y-4">
            <CharacterStats character={character} />
            <Inventory
              items={items}
              onEquip={equipItem}
              onUsePotion={usePotion}
            />
          </div>

          <div className="lg:col-span-2">
            <Combat
              enemy={currentEnemy}
              floor={floor}
              onAttack={attack}
              onNextFloor={nextFloor}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
