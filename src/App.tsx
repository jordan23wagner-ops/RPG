import { useState, useEffect } from 'react';
import { supabase } from './lib/supabase';
import { GameProvider } from './contexts/GameContext';
import { AuthFlow } from './components/AuthFlow';
import { Game } from './components/Game';
import CharacterVisualTest from './components/CharacterVisualTest';

function App() {
  const [session, setSession] = useState<boolean | null>(null);
  const [guestMode, setGuestMode] = useState(false);

  useEffect(() => {
    // Check for quickstart flag
    const params = new URLSearchParams(window.location.search);
    if (params.has('quickstart')) {
      setGuestMode(true);
      setSession(true); // Treat guest as authenticated
      return;
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(!!session);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      (async () => {
        setSession(!!session);
      })();
    });

    return () => subscription.unsubscribe();
  }, []);

  if (session === null) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-900 via-red-950 to-gray-900 flex items-center justify-center">
        <div className="text-yellow-500 text-xl">Loading...</div>
      </div>
    );
  }

  if (!session) {
    return <AuthFlow onAuth={() => setSession(true)} />;
  }

  return (
    <GameProvider>
      <div className="relative min-h-screen">
        <Game />
        {/* Settings / Tools floating panel */}
        <SettingsFloating />
      </div>
    </GameProvider>
  );
}

export default App;

function SettingsFloating() {
  const [open, setOpen] = useState(false);
  return (
    <div className="fixed top-3 right-3 z-50">
      <button
        onClick={() => setOpen(o => !o)}
        aria-label="Toggle Settings"
        className="group bg-gray-800/70 backdrop-blur px-3 py-2 rounded-md border border-yellow-600 text-yellow-300 hover:bg-gray-700 flex items-center gap-2 shadow-lg"
      >
        <span className="material-icons text-sm">settings</span>
        <span className="text-xs font-semibold">Tools</span>
      </button>
      {open && (
        <div className="mt-2 w-[320px] bg-gray-900 border border-yellow-600 rounded-md shadow-2xl p-3 animate-fade-in-down">
          <div className="flex justify-between items-center mb-2">
            <h3 className="text-yellow-400 text-sm font-bold">Dev Visual Test</h3>
            <button
              onClick={() => setOpen(false)}
              className="text-xs text-gray-400 hover:text-gray-200"
            >Close</button>
          </div>
          <CharacterVisualTest />
        </div>
      )}
    </div>
  );
}
