import { Heart, Zap, Shield, Sword, TrendingUp, Coins } from 'lucide-react';
import { Character } from '../types/game';
import { useGame } from '../contexts/GameContext';

interface CharacterStatsProps {
  character: Character;
}

export function CharacterStats({ character }: CharacterStatsProps) {
  const { allocateStatPoint } = useGame();
  const healthPercent = (character.health / character.max_health) * 100;
  const manaPercent = (character.mana / character.max_mana) * 100;
  const expToNext = character.level * 100;
  const expPercent = (character.experience / expToNext) * 100;
  const hasStatPoints = (character.stat_points || 0) > 0;

  return (
    <div className="bg-gray-900 border-2 border-yellow-600 rounded-lg p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-yellow-500">{character.name}</h2>
        <span className="text-lg text-yellow-400">Level {character.level}</span>
      </div>

      {hasStatPoints && (
        <div className="bg-green-900/30 border border-green-500 rounded p-2 text-center">
          <span className="text-sm font-bold text-green-400">
            {character.stat_points} Stat Point{character.stat_points !== 1 ? 's' : ''} Available
          </span>
        </div>
      )}

      <div className="space-y-2">
        <div>
          <div className="flex items-center justify-between text-sm mb-1">
            <div className="flex items-center gap-1">
              <Heart className="w-4 h-4 text-red-500" />
              <span className="text-gray-300">Health</span>
            </div>
            <span className="text-red-400">{character.health}/{character.max_health}</span>
          </div>
          <div className="w-full bg-gray-800 rounded-full h-3 overflow-hidden">
            <div
              className="bg-gradient-to-r from-red-600 to-red-500 h-full transition-all duration-300"
              style={{ width: `${healthPercent}%` }}
            />
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between text-sm mb-1">
            <div className="flex items-center gap-1">
              <Zap className="w-4 h-4 text-blue-500" />
              <span className="text-gray-300">Mana</span>
            </div>
            <span className="text-blue-400">{character.mana}/{character.max_mana}</span>
          </div>
          <div className="w-full bg-gray-800 rounded-full h-3 overflow-hidden">
            <div
              className="bg-gradient-to-r from-blue-600 to-blue-500 h-full transition-all duration-300"
              style={{ width: `${manaPercent}%` }}
            />
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between text-sm mb-1">
            <div className="flex items-center gap-1">
              <TrendingUp className="w-4 h-4 text-green-500" />
              <span className="text-gray-300">Experience</span>
            </div>
            <span className="text-green-400">{character.experience}/{expToNext}</span>
          </div>
          <div className="w-full bg-gray-800 rounded-full h-3 overflow-hidden">
            <div
              className="bg-gradient-to-r from-green-600 to-green-500 h-full transition-all duration-300"
              style={{ width: `${expPercent}%` }}
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 pt-2 border-t border-gray-700">
        <div className="flex items-center gap-2 bg-gray-800 rounded p-2">
          <Sword className="w-5 h-5 text-red-400" />
          <div className="flex-1">
            <div className="text-xs text-gray-400">Strength</div>
            <div className="text-lg font-bold text-white">{character.strength}</div>
          </div>
          {hasStatPoints && (
            <button
              onClick={() => allocateStatPoint('strength')}
              className="px-2 py-1 bg-green-600 hover:bg-green-500 text-white text-xs rounded font-bold transition-colors"
            >
              +
            </button>
          )}
        </div>
        <div className="flex items-center gap-2 bg-gray-800 rounded p-2">
          <Shield className="w-5 h-5 text-blue-400" />
          <div className="flex-1">
            <div className="text-xs text-gray-400">Dexterity</div>
            <div className="text-lg font-bold text-white">{character.dexterity}</div>
          </div>
          {hasStatPoints && (
            <button
              onClick={() => allocateStatPoint('dexterity')}
              className="px-2 py-1 bg-green-600 hover:bg-green-500 text-white text-xs rounded font-bold transition-colors"
            >
              +
            </button>
          )}
        </div>
        <div className="flex items-center gap-2 bg-gray-800 rounded p-2">
          <Zap className="w-5 h-5 text-purple-400" />
          <div className="flex-1">
            <div className="text-xs text-gray-400">Intelligence</div>
            <div className="text-lg font-bold text-white">{character.intelligence}</div>
          </div>
          {hasStatPoints && (
            <button
              onClick={() => allocateStatPoint('intelligence')}
              className="px-2 py-1 bg-green-600 hover:bg-green-500 text-white text-xs rounded font-bold transition-colors"
            >
              +
            </button>
          )}
        </div>
        <div className="flex items-center gap-2 bg-gray-800 rounded p-2">
          <Coins className="w-5 h-5 text-yellow-400" />
          <div>
            <div className="text-xs text-gray-400">Gold</div>
            <div className="text-lg font-bold text-yellow-500">{character.gold}</div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 pt-2 border-t border-gray-700">
        <div className="bg-gray-800 rounded p-2 text-center">
          <div className="text-xs text-gray-400">Speed</div>
          <div className="text-sm font-bold text-green-400">{character.speed || 5}</div>
        </div>
        <div className="bg-gray-800 rounded p-2 text-center">
          <div className="text-xs text-gray-400">Crit %</div>
          <div className="text-sm font-bold text-orange-400">{character.crit_chance || 5}%</div>
        </div>
        <div className="bg-gray-800 rounded p-2 text-center">
          <div className="text-xs text-gray-400">Crit Dmg</div>
          <div className="text-sm font-bold text-red-400">{character.crit_damage || 150}%</div>
        </div>
      </div>
    </div>
  );
}
