// src/components/GameShell.tsx
import { ReactNode } from 'react';

interface GameShellProps {
  header?: ReactNode;
  left?: ReactNode;     // canvas / gameplay
  right?: ReactNode;    // equipment + inventory
  bottom?: ReactNode;   // future skill/action bar
  children?: ReactNode; // fallback content (for your existing usage)
}

export default function GameShell({
  header,
  left,
  right,
  bottom,
  children,
}: GameShellProps) {
  // Fallbacks so your existing <GameShell><Game /></GameShell> still works:
  const mainLeft = left ?? children;
  const mainRight = right ?? null;

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 via-red-950 to-gray-900 text-gray-100">
      {/* Top header */}
      <header className="border-b border-red-900/40 bg-black/40 backdrop-blur-sm">
        <div className="mx-auto max-w-6xl px-4 py-3">
          {header ?? (
            <div className="text-lg font-semibold tracking-wide">
              Dungeon ARPG
            </div>
          )}
        </div>
      </header>

      {/* Main content */}
      <main className="mx-auto flex min-h-[calc(100vh-9rem)] max-w-6xl flex-col px-4 py-4 gap-4">
        {/* On md+ → side-by-side. On small → stacked. */}
        <div className="flex flex-1 flex-col gap-4 md:flex-row">
          {/* Left: gameplay / canvas */}
          <section className="md:flex-[3] rounded-xl border border-red-900/40 bg-black/40 shadow-lg overflow-hidden">
            <div className="h-full min-h-[320px] md:min-h-[480px]">
              {mainLeft}
            </div>
          </section>

          {/* Right: equipment + inventory */}
          {mainRight && (
            <aside className="md:flex-[2] flex flex-col gap-4">
              {mainRight}
            </aside>
          )}
        </div>

        {/* Bottom: skill bar / future action bar */}
        {bottom && (
          <section className="h-[80px] rounded-xl border border-red-900/40 bg-black/60 shadow-lg flex items-center justify-center">
            {bottom}
          </section>
        )}
      </main>
    </div>
  );
}
