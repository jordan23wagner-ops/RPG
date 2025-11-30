import { useGame } from '../contexts/GameContext';
import { Sparkles, RefreshCcw } from 'lucide-react';

export function AffixStatsPanel() {
  const { affixStats, resetAffixStats } = useGame();
  const { total, withAffixes, percentage } = affixStats;

  return (
    <div className="mt-4 p-3 rounded-lg border border-yellow-700/40 bg-black/40">
      <div className="flex items-center gap-2 mb-2">
        <Sparkles className="w-4 h-4 text-yellow-500" />
        <div className="text-xs font-semibold text-yellow-400 uppercase tracking-wide">Affix Drop Stats</div>
      </div>
      <div className="grid grid-cols-3 gap-2 text-[11px] mb-2">
        <div className="bg-gray-800 rounded p-1.5 text-center">
          <div className="text-gray-400">Items</div>
          <div className="font-bold text-white">{total}</div>
        </div>
        <div className="bg-gray-800 rounded p-1.5 text-center">
          <div className="text-gray-400">With Affix</div>
          <div className="font-bold text-white">{withAffixes}</div>
        </div>
        <div className="bg-gray-800 rounded p-1.5 text-center">
          <div className="text-gray-400">%</div>
          <div className="font-bold text-white">{percentage.toFixed(1)}</div>
        </div>
      </div>
      <button
        type="button"
        onClick={resetAffixStats}
        disabled={total === 0}
        className={`w-full flex items-center justify-center gap-1 rounded px-2 py-1 text-xs font-medium transition-colors ${total === 0 ? 'bg-gray-700 text-gray-400 cursor-not-allowed' : 'bg-yellow-600 hover:bg-yellow-500 text-black'}`}
      >
        <RefreshCcw className="w-3 h-3" /> Reset Counters
      </button>
      {total > 0 && (
        <div className="mt-2 text-[10px] text-gray-400 leading-snug">
          Sampling live since last reset. Target baseline ≈5% then rarity/context scaling. Use this to monitor tuning.
        </div>
      )}
    </div>
  );
}
