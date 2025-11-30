// src/components/ItemTooltip.tsx
import React from 'react';
import { Item, Affix } from '../types/game';
import {
  getRarityColor,
  getRarityBgColor,
  getEquipmentSlot,
  getItemSprite,
} from '../utils/gameLogic';

interface ItemTooltipProps {
  item: Item;
}

export function ItemTooltip({ item }: ItemTooltipProps) {
  const rarityColor = getRarityColor(item.rarity);
  const rarityBg = getRarityBgColor(item.rarity);
  const typeDisplay = item.type.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  const slot = getEquipmentSlot(item);

  return (
    <div className="rounded-lg border border-gray-800 bg-black/95 px-3 py-2 text-xs shadow-2xl max-w-xs">
      <div className={`mb-2 text-sm font-semibold ${rarityColor} flex items-center gap-2`}>
        <span className="text-base">{getItemSprite(item)}</span>
        <span>{item.name}</span>
        <span className={`text-[10px] font-normal tracking-wide px-1.5 py-0.5 rounded ${rarityBg} lowercase text-gray-200`}>
          {item.rarity} <span className="capitalize">{typeDisplay}</span>
        </span>
      </div>
      <div className="mb-2 text-[10px] text-gray-300/80">
        {slot && <span className="capitalize">{slot}</span>}
      </div>

      {/* Base stats */}
      {(item.damage || item.armor) && (
        <div className="mb-2 space-y-0.5">
          {item.damage && (
            <div className="flex justify-between text-[11px] text-gray-100">
              <span className="text-gray-300/90">Damage</span>
              <span>+{item.damage}</span>
            </div>
          )}
          {item.armor && (
            <div className="flex justify-between text-[11px] text-gray-100">
              <span className="text-gray-300/90">Armor</span>
              <span>+{item.armor}</span>
            </div>
          )}
        </div>
      )}

      {/* Affixes */}
      {item.affixes && item.affixes.length > 0 && (
        <div className="mt-1 border-t border-gray-800 pt-1.5 space-y-0.5">
          {item.affixes.map((affix: Affix, idx: number) => {
            const stat = affix.stat;
            const val = affix.value;
            let label = '';
            let color = 'text-emerald-300';
            switch (stat) {
              case 'fire_damage': label = `+${val} Fire Damage`; color = 'text-orange-400'; break;
              case 'ice_damage': label = `+${val} Ice Damage`; color = 'text-sky-300'; break;
              case 'lightning_damage': label = `+${val} Lightning Damage`; color = 'text-yellow-300'; break;
              case 'crit_chance': label = `+${val}% Crit Chance`; color = 'text-purple-300'; break;
              case 'crit_damage': label = `+${val}% Crit Damage`; color = 'text-fuchsia-300'; break;
              case 'speed': label = `+${val} Speed`; color = 'text-teal-300'; break;
              case 'strength': label = `+${val} Strength`; break;
              case 'dexterity': label = `+${val} Dexterity`; break;
              case 'intelligence': label = `+${val} Intelligence`; break;
              case 'health': label = `+${val} Health`; color = 'text-green-300'; break;
              case 'mana': label = `+${val} Mana`; color = 'text-cyan-300'; break;
              case 'damage': label = `+${val} Damage`; color = 'text-red-400'; break;
              case 'armor': label = `+${val} Armor`; color = 'text-gray-300'; break;
              default: label = `+${val} ${affix.name}`; break;
            }
            return (
              <div key={`${affix.stat}-${idx}`} className={`text-[11px] ${color}`}>{label}</div>
            );
          })}
        </div>
      )}

      {/* Unique effects removed: not present on Item type */}

      {/* Set bonuses */}
      {item.setName && item.setBonuses && (
        <div className="mt-2 border-t border-gray-800 pt-1.5 text-[11px]">
          <div className="text-green-400 font-semibold mb-0.5">{item.setName} Set</div>
          {item.setBonuses.map((bonus, idx) => (
            <div
              key={idx}
              className="text-green-300 flex justify-between text-[11px]"
            >
              <span>{bonus.piecesRequired}-Set</span>
              <span>{bonus.effect}</span>
            </div>
          ))}
        </div>
      )}

      {/* Requirements / misc */}
      <div className="mt-2 text-[10px] text-gray-500 space-y-0.5">
        {item.requiredLevel && <div className="text-gray-400">Requires Level {item.requiredLevel}</div>}
        
        {item.requiredStats && (
          <div className="mt-1 space-y-0.5 border-t border-gray-700 pt-1">
            {item.requiredStats.strength && <div>Requires {item.requiredStats.strength} Strength</div>}
            {item.requiredStats.dexterity && <div>Requires {item.requiredStats.dexterity} Dexterity</div>}
            {item.requiredStats.intelligence && <div>Requires {item.requiredStats.intelligence} Intelligence</div>}
          </div>
        )}
        
        {item.value != null && <div className="border-t border-gray-700 pt-1">Value: {item.value}g</div>}
      </div>
    </div>
  );
}
