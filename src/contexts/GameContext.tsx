import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '../lib/supabase';
import { Character, Item, Enemy, rollLoot } from '../types/game';
import { generateEnemy } from '../utils/gameLogic';

interface GameContextType {
  character: Character | null;
  items: Item[];
  currentEnemy: Enemy | null;
  floor: number;
  loading: boolean;
  createCharacter: (name: string) => Promise<void>;
  loadCharacter: () => Promise<void>;
  attack: () => Promise<void>;
  usePotion: (itemId: string) => Promise<void>;
  equipItem: (itemId: string) => Promise<void>;
  nextFloor: () => void;
  updateCharacter: (updates: Partial<Character>) => Promise<void>;
  sellItem: (itemId: string) => Promise<void>;
  buyPotion: () => Promise<void>;
}

const GameContext = createContext<GameContextType | undefined>(undefined);

export function GameProvider({ children }: { children: ReactNode }) {
  const [character, setCharacter] = useState<Character | null>(null);
  const [items, setItems] = useState<Item[]>([]);
  const [currentEnemy, setCurrentEnemy] = useState<Enemy | null>(null);
  const [floor, setFloor] = useState(1);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadCharacter();
  }, []);

  const loadItems = async (characterId: string) => {
    const { data } = await supabase
      .from('items')
      .select('*')
      .eq('character_id', characterId);

    if (data) {
      setItems(data as Item[]);
    }
  };

  const loadCharacter = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }

      const { data: chars } = await supabase
        .from('characters')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1);

      if (chars && chars.
