import { useState } from 'react';
import { Settings, X } from 'lucide-react';
import { AffixStatsPanel } from './AffixStatsPanel';
import { useGame } from '../contexts/GameContext';

export function SettingsPanel() {
  const [isOpen, setIsOpen] = useState(false);
  const { rarityFilter, toggleRarityFilter } = useGame();

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed top-4 right-4 p-2 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg transition-colors z-50"
        title="Settings"
      >
        <Settings className="w-5 h-5" />
      </button>
    );
  }

  return (
    <div className="fixed top-4 right-4 w-80 bg-gray-900 border-2 border-yellow-600 rounded-lg p-4 z-50 shadow-2xl">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Settings className="w-5 h-5 text-yellow-500" />
          <h3 className="text-lg font-bold text-yellow-500">Settings</h3>
        </div>
        <button
          onClick={() => setIsOpen(false)}
          className="p-1 hover:bg-gray-800 rounded transition-colors"
        >
          <X className="w-4 h-4 text-gray-400" />
        </button>
      </div>

      {/* Rarity Filter */}
      <div className="mb-4 p-3 rounded-lg border border-purple-900/40 bg-black/40">
        <div className="text-xs text-gray-300 uppercase font-semibold mb-2">Skip Rarities</div>
        <div className="grid grid-cols-2 gap-1">
          {['common', 'magic', 'rare', 'epic', 'legendary', 'mythic', 'set', 'radiant'].map(rarity => (
            <button
              key={rarity}
              onClick={() => toggleRarityFilter(rarity)}
              className={`px-2 py-1 text-xs rounded font-medium transition-colors ${
                rarityFilter.has(rarity)
                  ? 'bg-purple-600 text-white'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              {rarity.charAt(0).toUpperCase() + rarity.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Affix Stats Panel */}
      <AffixStatsPanel />
    </div>
  );
}
