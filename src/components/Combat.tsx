/**
 * Combat.tsx - Combat panel UI component
 *
 * FIX HISTORY:
 * - Fixed incomplete JSX that caused build errors (file was truncated)
 * - This component displays enemy information during combat
 * - It receives enemy state from GameContext via props
 * - onAttack callback is invoked to trigger damage in GameContext
 *
 * NOTES:
 * - Enemy health state is managed by GameContext, not this component
 * - This is a presentational component; all combat logic lives in GameContext
 */
import { Skull, Swords, ArrowDown } from 'lucide-react';
import type { Enemy } from '../types/game';

interface CombatProps {
  enemy: Enemy | null;
  floor: number;
  onAttack: () => void;
  onNextFloor: () => void;
}

export function Combat({ enemy, floor, onAttack, onNextFloor }: CombatProps) {
  // Show loading state when no enemy is available
  if (!enemy) {
    return (
      <div className="bg-gray-900 border-2 border-yellow-600 rounded-lg p-8 text-center">
        <div className="text-gray-500 mb-4">Loading enemy...</div>
      </div>
    );
  }

  // Calculate health percentage for health bar display
  const healthPercent = Math.max(0, (enemy.health / enemy.max_health) * 100);
  const isDead = enemy.health <= 0;

  return (
    <div className="bg-gray-900 border-2 border-yellow-600 rounded-lg p-6">
      {/* Header with floor indicator */}
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-xl font-bold text-red-500">Battle Arena</h3>
        <div className="flex items-center gap-2 bg-gray-800 px-3 py-1 rounded">
          <ArrowDown className="w-4 h-4 text-yellow-400" />
          <span className="text-yellow-400 font-bold">Floor {floor}</span>
        </div>
      </div>

      {/* Enemy display area */}
      <div className="bg-gradient-to-b from-red-950 to-gray-900 border-2 border-red-800 rounded-lg p-6 mb-6">
        {/* Enemy icon */}
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

        {/* Enemy name */}
        <h4 className="text-2xl font-bold text-center text-red-400 mb-2">
          {enemy.name}
        </h4>

        {/* Enemy level indicator */}
        <p className="text-sm text-center text-gray-400 mb-4">
          Level {enemy.level} {enemy.rarity !== 'normal' && `(${enemy.rarity})`}
        </p>

        {/* Health bar */}
        <div className="mb-2">
          <div className="flex items-center justify-between text-sm mb-1">
            <span className="text-gray-400">HP</span>
            <span className="text-red-400">
              {Math.max(0, enemy.health)} / {enemy.max_health}
            </span>
          </div>
          <div className="w-full bg-gray-800 rounded h-4 overflow-hidden">
            <div
              className={`h-full transition-all duration-300 ${
                healthPercent > 50
                  ? 'bg-green-600'
                  : healthPercent > 25
                    ? 'bg-yellow-600'
                    : 'bg-red-600'
              }`}
              style={{ width: `${healthPercent}%` }}
            />
          </div>
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex gap-4">
        {!isDead ? (
          <button
            onClick={onAttack}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-red-600 hover:bg-red-700 text-white font-bold rounded-lg transition-colors"
          >
            <Swords className="w-5 h-5" />
            Attack
          </button>
        ) : (
          <button
            onClick={onNextFloor}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-green-600 hover:bg-green-700 text-white font-bold rounded-lg transition-colors"
          >
            <ArrowDown className="w-5 h-5" />
            Next Floor
          </button>
        )}
      </div>
    </div>
  );
}
