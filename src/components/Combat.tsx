import { Skull, Swords, ArrowDown } from 'lucide-react';
import type { Enemy } from '../types/game';

/**
 * Combat Component
 * 
 * NOTE: This component is currently not used in the main game flow.
 * Combat rendering is handled directly in DungeonView.tsx's canvas render loop.
 * This file is kept for potential future use or as a reference implementation.
 * 
 * The main combat logic (damage calculation, state management) is in GameContext.tsx.
 */

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
        <div className="text-gray-500 mb-4">No enemy in combat</div>
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
            <span className="text-gray-400">Health</span>
            <span className="text-red-400">
              {enemy.health} / {enemy.max_health}
            </span>
          </div>
          <div className="w-full bg-gray-800 rounded-full h-4 overflow-hidden">
            <div
              className={`h-full transition-all duration-300 ${
                healthPercent > 50
                  ? 'bg-green-500'
                  : healthPercent > 25
                    ? 'bg-yellow-500'
                    : 'bg-red-500'
              }`}
              style={{ width: `${healthPercent}%` }}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 text-sm mt-4">
          <div className="bg-gray-800 rounded p-2 text-center">
            <div className="text-gray-400">Damage</div>
            <div className="text-red-400 font-bold">{enemy.damage}</div>
          </div>
          <div className="bg-gray-800 rounded p-2 text-center">
            <div className="text-gray-400">Experience</div>
            <div className="text-yellow-400 font-bold">{enemy.experience}</div>
          </div>
        </div>
      </div>

      <div className="flex gap-3">
        {!isDead ? (
          <button
            onClick={onAttack}
            className="flex-1 flex items-center justify-center gap-2 py-3 bg-red-600 hover:bg-red-700 rounded-lg font-bold text-lg transition-colors"
          >
            <Swords className="w-5 h-5" />
            Attack
          </button>
        ) : (
          <button
            onClick={onNextFloor}
            className="flex-1 flex items-center justify-center gap-2 py-3 bg-green-600 hover:bg-green-700 rounded-lg font-bold text-lg transition-colors"
          >
            <ArrowDown className="w-5 h-5" />
            Next Floor
          </button>
        )}
      </div>
    </div>
  );
}
