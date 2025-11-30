import { useState, useEffect } from 'react';
import { supabase } from './lib/supabase';
import { GameProvider } from './contexts/GameContext';
import { AuthFlow } from './components/AuthFlow';
import { Game } from './components/Game';

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
      <Game />
    </GameProvider>
  );
}

export default App;
