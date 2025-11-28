// src/components/InventoryGrid.tsx
import { Item } from '../types/game';
import { ItemTooltip } from './ItemTooltip';
import { getRarityBorderColor } from '../utils/gameLogic';

interface InventoryGridProps {
  items: Item[];
  onClickItem?: (item: Item) => void;
  maxSlots?: number;
}

export function InventoryGrid({ items, onClickItem, maxSlots = 40 }: InventoryGridProps) {
  const slots = Array.from({ length: maxSlots }, (_, i) => items[i] ?? null);

  return (
    <div className="rounded-xl border border-red-900/40 bg-black/50 p-3 shadow-md">
      <div className="mb-2 flex items-center justify-between text-xs uppercase tracking-wide text-red-300/80">
        <span>Inventory</span>
        <span>{items.length}/{maxSlots}</span>
      </div>

      <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 gap-2">
        {slots.map((item, index) => (
          <InventorySlot
            key={index}
            item={item}
            onClickItem={onClickItem}
          />
        ))}
      </div>
    </div>
  );
}

interface InventorySlotProps {
  item: Item | null;
  onClickItem?: (item: Item) => void;
}

function InventorySlot({ item, onClickItem }: InventorySlotProps) {
  if (!item) {
    // empty slot placeholder
    return (
      <div className="aspect-square rounded-md border border-dashed border-red-900/40 bg-black/40 shadow-inner" />
    );
  }

  const borderColor = getRarityBorderColor(item.rarity);

  return (
    <button
      type="button"
      onClick={() => onClickItem?.(item)}
      className={`group relative aspect-square rounded-md border ${borderColor} bg-black/70 shadow-inner flex items-center justify-center`}
    >
      {/* you can render icon or first letters here */}
      <span className="text-[10px] sm:text-xs text-center px-1 leading-tight">
        {item.name}
      </span>

      <ItemTooltipWrapper item={item} />
    </button>
  );
}

function ItemTooltipWrapper({ item }: { item: Item }) {
  return (
    <div className="pointer-events-none absolute inset-0">
      <div className="absolute left-1/2 top-0 z-20 hidden w-56 -translate-x-1/2 -translate-y-full transform pb-2 group-hover:block">
        <ItemTooltip item={item} />
      </div>
    </div>
  );
}
