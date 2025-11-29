import { useState, useEffect } from 'react';
import { Swords } from 'lucide-react';

interface CreateCharacterProps {
  onCreate: (name: string) => void;
  autoStart?: boolean;
}

const HERO_NAMES = [
  'Arion', 'Kael', 'Soren', 'Thorgrim', 'Vex', 'Lysander', 'Ronan', 'Cipher',
  'Aldric', 'Blaze', 'Crow', 'Drax', 'Ember', 'Fenrir', 'Grim', 'Hunter',
  'Icarus', 'Jax', 'Kraven', 'Lancer', 'Magnus', 'Nyx', 'Onyx', 'Phoenix',
  'Raven', 'Slayer', 'Torven', 'Ulric', 'Venom', 'Wraith', 'Xander', 'Zephyr'
];

export function CreateCharacter({ onCreate, autoStart = false }: CreateCharacterProps) {
  const [name, setName] = useState('');

  // Auto-start if requested
  useEffect(() => {
    if (autoStart) {
      const randomName = HERO_NAMES[Math.floor(Math.random() * HERO_NAMES.length)];
      onCreate(randomName);
    }
  }, [autoStart, onCreate]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim()) {
      onCreate(name.trim());
    }
  };

  const handleQuickStart = () => {
    const randomName = HERO_NAMES[Math.floor(Math.random() * HERO_NAMES.length)];
    onCreate(randomName);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 via-red-950 to-gray-900 flex items-center justify-center p-4">
      <div className="bg-gray-900 border-4 border-yellow-600 rounded-lg p-8 max-w-md w-full shadow-2xl">
        <div className="flex items-center justify-center mb-6">
          <div className="p-4 bg-red-900 rounded-full">
            <Swords className="w-16 h-16 text-yellow-500" />
          </div>
        </div>

        <h1 className="text-4xl font-bold text-center text-yellow-500 mb-2">
          Dark Dungeon
        </h1>
        <p className="text-center text-gray-400 mb-8">
          Enter the depths and face the darkness
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-300 mb-2">
              Hero Name
            </label>
            <input
              type="text"
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter your hero's name"
              className="w-full px-4 py-3 bg-gray-800 border-2 border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-yellow-600 transition-colors"
              maxLength={20}
              required
            />
          </div>

          <button
            type="submit"
            className="w-full bg-gradient-to-r from-red-600 to-red-500 hover:from-red-500 hover:to-red-400 text-white font-bold py-4 rounded-lg transition-all shadow-lg hover:shadow-red-500/50"
          >
            Begin Your Journey
          </button>

          <button
            type="button"
            onClick={handleQuickStart}
            className="w-full bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white font-bold py-3 rounded-lg transition-all shadow-lg hover:shadow-blue-500/50"
          >
            Quick Start →
          </button>
        </form>

        <div className="mt-8 p-4 bg-gray-800 border border-gray-700 rounded-lg">
          <h3 className="text-sm font-semibold text-yellow-500 mb-2">Game Features:</h3>
          <ul className="text-xs text-gray-400 space-y-1">
            <li>• Battle fierce enemies in dungeon depths</li>
            <li>• Collect powerful weapons and armor</li>
            <li>• Level up and grow stronger</li>
            <li>• Descend through endless floors</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
