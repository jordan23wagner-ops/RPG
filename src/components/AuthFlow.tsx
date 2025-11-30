import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { Shield } from 'lucide-react';

interface AuthFlowProps {
  onAuth: () => void;
}

export function AuthFlow({ onAuth }: AuthFlowProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      if (isSignUp) {
        const { error } = await supabase.auth.signUp({
          email,
          password,
        });
        if (error) throw error;
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
      }
      onAuth();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickPlay = () => {
    // Redirect to character creation with autoStart flag
    window.location.href = '/?quickstart=1';
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 via-red-950 to-gray-900 flex items-center justify-center p-4">
      <div className="bg-gray-900 border-4 border-yellow-600 rounded-lg p-8 max-w-md w-full shadow-2xl">
        <div className="flex items-center justify-center mb-6">
          <div className="p-4 bg-red-900 rounded-full">
            <Shield className="w-16 h-16 text-yellow-500" />
          </div>
        </div>

        <h1 className="text-4xl font-bold text-center text-yellow-500 mb-2">
          Dark Dungeon
        </h1>
        <p className="text-center text-gray-400 mb-8">
          {isSignUp ? 'Create your account' : 'Sign in to continue'}
        </p>

        {error && (
          <div className="mb-4 p-3 bg-red-900 border border-red-600 rounded text-red-400 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-300 mb-2">
              Email
            </label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your@email.com"
              className="w-full px-4 py-3 bg-gray-800 border-2 border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-yellow-600 transition-colors"
              required
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-300 mb-2">
              Password
            </label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full px-4 py-3 bg-gray-800 border-2 border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-yellow-600 transition-colors"
              required
              minLength={6}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-red-600 to-red-500 hover:from-red-500 hover:to-red-400 disabled:from-gray-700 disabled:to-gray-600 text-white font-bold py-4 rounded-lg transition-all shadow-lg hover:shadow-red-500/50 disabled:shadow-none"
          >
            {loading ? 'Loading...' : isSignUp ? 'Create Account' : 'Sign In'}
          </button>
        </form>

        <div className="mt-4">
          <button
            onClick={handleQuickPlay}
            className="w-full bg-gradient-to-r from-yellow-600 to-amber-600 hover:from-yellow-500 hover:to-amber-500 text-white font-bold py-4 rounded-lg transition-all shadow-lg hover:shadow-yellow-500/50"
          >
            Quick Play (Guest)
          </button>
        </div>

        <div className="mt-6 text-center">
          <button
            onClick={() => {
              setIsSignUp(!isSignUp);
              setError('');
            }}
            className="text-yellow-500 hover:text-yellow-400 text-sm transition-colors"
          >
            {isSignUp ? 'Already have an account? Sign In' : "Don't have an account? Sign Up"}
          </button>
        </div>
      </div>
    </div>
  );
}
