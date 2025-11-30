import { Heart, Zap, Shield, Sword, TrendingUp, Coins } from 'lucide-react';
import { Character } from '../types/game';

interface CharacterStatsProps {
  character: Character;
}

export function CharacterStats({ character }: CharacterStatsProps) {
  const healthPercent = (character.health / character.max_health) * 100;
  const manaPercent = (character.mana / character.max_mana) * 100;
  const expToNext = character.level * 100;
  const expPercent = (character.experience / expToNext) * 100;

  return (
    <div className="bg-gray-900 border-2 border-yellow-600 rounded-lg p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-yellow-500">{character.name}</h2>
        <span className="text-lg text-yellow-400">Level {character.level}</span>
      </div>

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
          <div>
            <div className="text-xs text-gray-400">Strength</div>
            <div className="text-lg font-bold text-white">{character.strength}</div>
          </div>
        </div>
        <div className="flex items-center gap-2 bg-gray-800 rounded p-2">
          <Shield className="w-5 h-5 text-blue-400" />
          <div>
            <div className="text-xs text-gray-400">Dexterity</div>
            <div className="text-lg font-bold text-white">{character.dexterity}</div>
          </div>
        </div>
        <div className="flex items-center gap-2 bg-gray-800 rounded p-2">
          <Zap className="w-5 h-5 text-purple-400" />
          <div>
            <div className="text-xs text-gray-400">Intelligence</div>
            <div className="text-lg font-bold text-white">{character.intelligence}</div>
          </div>
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
