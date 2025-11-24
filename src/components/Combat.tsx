import { Skull, Swords, ArrowDown } from 'lucide-react';
import { Enemy } from '../types/game';

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

  const healthPercent = (enemy.health / enemy.max_health) * 100;
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
          <div className={`p-4 rounded-full ${isDead ? 'bg-gray-800' : 'bg-red-900'} transition-colors`}>
            <Skull className={`w-16 h-16 ${isDead ? 'text-gray-600' : 'text-red-500'} transition-colors`} />
          </div>
        </div>

        <h4 className="text-2xl font-bold text-center text-red-400 mb-2">
          {enemy.name}
        </h4>

        <div className="mb-2">
          <div className="flex items-center justify-between text-sm mb-1">
            <span className="text-gray-400">Health</span>
            <span className="text-red-400">{Math.max(0, enemy.health)}/{enemy.max_health}</span>
          </div>
          <div className="w-full bg-gray-800 rounded-full h-4 overflow-hidden border border-gray-700">
            <div
              className="bg-gradient-to-r from-red-600 to-red-500 h-full transition-all duration-300"
              style={{ width: `${healthPercent}%` }}
            />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2 mt-4 text-center text-sm">
          <div className="bg-gray-800 rounded p-2">
            <div className="text-gray-400">Damage</div>
            <div className="text-red-400 font-bold">{enemy.damage}</div>
          </div>
          <div className="bg-gray-800 rounded p-2">
            <div className="text-gray-400">XP</div>
            <div className="text-green-400 font-bold">{enemy.experience}</div>
          </div>
          <div className="bg-gray-800 rounded p-2">
            <div className="text-gray-400">Gold</div>
            <div className="text-yellow-400 font-bold">{enemy.gold}</div>
          </div>
        </div>
      </div>

      <div className="space-y-3">
        {isDead ? (
          <>
            <div className="bg-green-900 border border-green-600 rounded p-3 text-center">
              <p className="text-green-400 font-bold">Enemy Defeated!</p>
              <p className="text-sm text-gray-400">Waiting for next enemy...</p>
            </div>
            <button
              onClick={onNextFloor}
              className="w-full bg-gradient-to-r from-yellow-600 to-yellow-500 hover:from-yellow-500 hover:to-yellow-400 text-gray-900 font-bold py-3 rounded-lg transition-all flex items-center justify-center gap-2"
            >
              <ArrowDown className="w-5 h-5" />
              Descend to Floor {floor + 1}
            </button>
          </>
        ) : (
          <button
            onClick={onAttack}
            className="w-full bg-gradient-to-r from-red-600 to-red-500 hover:from-red-500 hover:to-red-400 text-white font-bold py-4 rounded-lg transition-all flex items-center justify-center gap-2 shadow-lg hover:shadow-red-500/50"
          >
            <Swords className="w-6 h-6" />
            Attack
          </button>
        )}
      </div>
    </div>
  );
}
