// src/components/ItemTooltip.tsx
import { Item } from '../types/game';
import {
  getRarityColor,
  getRarityBgColor,
} from '../utils/gameLogic';

interface ItemTooltipProps {
  item: Item;
}

export function ItemTooltip({ item }: ItemTooltipProps) {
  const rarityColor = getRarityColor(item.rarity);
  const rarityBg = getRarityBgColor(item.rarity);

  return (
    <div className="rounded-lg border border-gray-800 bg-black/95 px-3 py-2 text-xs shadow-2xl">
      {/* Top: name + rarity */}
      <div className={`mb-1 text-sm font-semibold ${rarityColor}`}>
        {item.name}
      </div>
      <div className={`mb-2 text-[10px] uppercase tracking-wide inline-block px-1.5 py-0.5 rounded ${rarityBg}`}>
        {item.rarity}
      </div>

      {/* Slot + type */}
      <div className="mb-2 text-[10px] text-gray-300/80">
        {item.slot} {item.itemType ? `• ${item.itemType}` : null}
      </div>

      {/* Base stats */}
      {item.baseStats && (
        <div className="mb-2 space-y-0.5">
          {Object.entries(item.baseStats).map(([stat, value]) => (
            <div key={stat} className="flex justify-between text-[11px] text-gray-100">
              <span className="capitalize text-gray-300/90">
                {stat.replace(/_/g, ' ')}
              </span>
              <span>{value}</span>
            </div>
          ))}
        </div>
      )}

      {/* Affixes */}
      {item.affixes && item.affixes.length > 0 && (
        <div className="mt-1 border-t border-gray-800 pt-1.5 space-y-0.5">
          {item.affixes.map((affix) => (
            <div key={affix.id ?? affix.name} className="text-[11px] text-emerald-300">
              +{affix.value} {affix.name}
            </div>
          ))}
        </div>
      )}

      {/* Unique / legendary effect */}
      {item.uniqueEffect && (
        <div className="mt-2 border-t border-gray-800 pt-1.5 text-[11px] text-amber-300">
          {item.uniqueEffect}
        </div>
      )}

      {/* Requirements / misc */}
      <div className="mt-2 text-[10px] text-gray-500">
        {item.levelRequirement && <div>Requires Level {item.levelRequirement}</div>}
        {item.classRestriction && <div>Class: {item.classRestriction}</div>}
      </div>
    </div>
  );
}
