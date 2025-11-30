import { Sword, ShoppingBag, Castle, FlaskConical } from 'lucide-react';

export default function TownView({ onEnterDungeon, onOpenShop }: { onEnterDungeon: () => void; onOpenShop: () => void }) {
  return (
    <div className="w-[760px] h-[520px] bg-gray-900 border-2 border-yellow-600 rounded-md p-4 relative overflow-hidden">
      {/* Stylized header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Castle className="w-5 h-5 text-yellow-500" />
          <h2 className="text-xl font-bold text-yellow-400">Town Square</h2>
        </div>
        <div className="text-xs text-gray-400">Safe zone · Manage gear, buy supplies</div>
      </div>

      {/* Scenic backdrop (simple gradient + grid) */}
      <div className="absolute inset-0 pointer-events-none" aria-hidden>
        <div className="absolute inset-0 opacity-20 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-yellow-900 via-gray-900 to-black" />
        <div className="absolute inset-4 border border-yellow-900/30 rounded" />
      </div>

      {/* Content */}
      <div className="relative z-10 grid grid-cols-3 gap-3 h-full">
        {/* Bulletin / Tips */}
        <div className="col-span-2 bg-black/30 border border-gray-800 rounded p-3">
          <h3 className="text-sm font-semibold text-gray-200 mb-2">Adventurer's Board</h3>
          <ul className="text-xs text-gray-300 space-y-2 list-disc list-inside">
            <li>Buy potions and gear at the Merchant before your run.</li>
            <li>Loot rarer gear as Zone Heat rises in the dungeon.</li>
            <li>Return to town anytime to resupply and manage inventory.</li>
          </ul>
          <div className="mt-4 flex items-center gap-2">
            <button
              onClick={onEnterDungeon}
              className="inline-flex items-center gap-2 px-3 py-2 rounded bg-indigo-700 hover:bg-indigo-600 text-white text-sm font-semibold shadow"
            >
              <Sword className="w-4 h-4" /> Enter the Dungeon
            </button>
            <button
              onClick={onOpenShop}
              className="inline-flex items-center gap-2 px-3 py-2 rounded bg-orange-700 hover:bg-orange-600 text-white text-sm font-semibold shadow"
            >
              <ShoppingBag className="w-4 h-4" /> Visit Merchant
            </button>
          </div>
        </div>

        {/* Services quick access */}
        <div className="bg-black/30 border border-gray-800 rounded p-3">
          <h3 className="text-sm font-semibold text-gray-200 mb-2">Services</h3>
          <div className="space-y-2">
            <button
              onClick={onOpenShop}
              className="w-full flex items-center justify-between px-3 py-2 rounded bg-gray-800 hover:bg-gray-700 text-gray-100 text-sm"
            >
              Merchant <ShoppingBag className="w-4 h-4" />
            </button>
            <button
              onClick={onOpenShop}
              className="w-full flex items-center justify-between px-3 py-2 rounded bg-gray-800 hover:bg-gray-700 text-gray-100 text-sm"
              title="Buy potions in the Merchant for now"
            >
              Healer <FlaskConical className="w-4 h-4" />
            </button>
            <div className="text-[11px] text-gray-400 pt-2">More coming soon: Stash, Blacksmith, Enchanter.</div>
          </div>
        </div>
      </div>
    </div>
  );
}
