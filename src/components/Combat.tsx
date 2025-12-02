import { Skull, Swords, ArrowDown } from 'lucide-react';
import type { Enemy } from '../types/game';

interface CombatProps {
  enemy: Enemy | null;
  floor: number;
  onAttack: () => void;
  onNextFloor: () => void;
}

export function Combat({ enemy, floor, onAttack, onNextFloor }: CombatProps) {
  if (!enemy) {
    return (
      <div className="bg-gray-900 border-2 border-yellow-600 rounded-lg p-8 text-center">
        <div className="text-gray-500 mb-4">Loading enemy...</div>
      </div>
    );
  }

  const healthPercent = Math.max(0, (enemy.health / enemy.max_health) * 100);
  const isDead = enemy.health <= 0;

  return (
    <div className="bg-gray-900 border-2 border-yellow-600 rounded-lg p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-xl font-bold text-red-500">Battle Arena</h3>
        <div className="flex items-center gap-2 bg-gray-800 px-3 py-1 rounded">
          <ArrowDown className="w-4 h-4 text-yellow-400" />
          <span className="text-yellow-400 font-bold">Floor {floor}</span>
        </div>
      </div>

      <div className="bg-gradient-to-b from-red-950 to-gray-900 border-2 border-red-800 rounded-lg p-6 mb-6">
        <div className="flex items-center justify-center mb-4">
          <div
            className={`p-4 rounded-full ${
              isDead ? 'bg-gray-800' : 'bg-red-900'
            } transition-colors`}
          >
            <Skull
              className={`w-16 h-16 ${
                isDead ? 'text-gray-600' : 'text-red-500'
              } transition-colors`}
            />
          </div>
        </div>

        <h4 className="text-2xl font-bold text-center text-red-400 mb-2">
          {enemy.name}
        </h4>

        <div className="mb-2">
          <div className="flex items-center justify-between text-sm mb-1">
            <span className="text-gray-400">HP</span>
            <span className="text-red-400">
              {enemy.health} / {enemy.max_health}
            </span>
          </div>
          <div className="h-3 bg-gray-800 rounded-full overflow-hidden">
            <div
              className={`h-full transition-all duration-300 ${
                isDead ? 'bg-gray-600' : 'bg-red-500'
              }`}
              style={{ width: `${healthPercent}%` }}
            />
          </div>
        </div>
      </div>

      <div className="flex gap-4">
        {isDead ? (
          <button
            onClick={onNextFloor}
            className="flex-1 flex items-center justify-center gap-2 bg-gradient-to-r from-yellow-600 to-yellow-500 hover:from-yellow-500 hover:to-yellow-400 text-black font-bold py-3 px-6 rounded-lg transition-all shadow-lg"
          >
            <ArrowDown className="w-5 h-5" />
            Next Floor
          </button>
        ) : (
          <button
            onClick={onAttack}
            className="flex-1 flex items-center justify-center gap-2 bg-gradient-to-r from-red-700 to-red-600 hover:from-red-600 hover:to-red-500 text-white font-bold py-3 px-6 rounded-lg transition-all shadow-lg"
          >
            <Swords className="w-5 h-5" />
            Attack
          </button>
        )}
      </div>
    </div>
  );
}
