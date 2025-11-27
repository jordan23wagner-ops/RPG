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
      const {
        data: { user },
      } = await supabase.auth.getUser();
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

      if (chars && chars.length > 0) {
        const char = chars[0] as Character;
        setCharacter(char);
        await loadItems(char.id);
        generateNewEnemy(char.level);
      }
    } catch (error) {
      console.error('Error loading character:', error);
    } finally {
      setLoading(false);
    }
  };

  const createCharacter = async (name: string) => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('characters')
        .insert([
          {
            user_id: user.id,
            name,
            level: 1,
            experience: 0,
            health: 100,
            max_health: 100,
            mana: 50,
            max_mana: 50,
            strength: 10,
            dexterity: 10,
            intelligence: 10,
            gold: 0,
          },
        ])
        .select()
        .single();

      if (error) throw error;

      const char = data as Character;

      setCharacter(char);
      generateNewEnemy(1);

      await supabase.from('items').insert([
        {
          character_id: char.id,
          name: 'Rusty Sword',
          type: 'weapon',
          rarity: 'common',
          damage: 5,
          value: 10,
          equipped: true,
        },
      ]);

      await loadItems(char.id);
    } catch (error) {
      console.error('Error creating character:', error);
    }
  };

  const generateNewEnemy = (playerLevel: number) => {
    const enemy = generateEnemy(floor, playerLevel);
    setCurrentEnemy(enemy);
  };

  const updateCharacter = async (updates: Partial<Character>) => {
    if (!character) return;

    const newChar: Character = {
      ...character,
      ...updates,
      updated_at: new Date().toISOString(),
    };
    setCharacter(newChar);

    await supabase
      .from('characters')
      .update(updates)
      .eq('id', character.id);
  };

  const attack = async () => {
    if (!character || !currentEnemy) return;

const equippedWeapon = items.find(i => i.type === 'weapon' && i.equipped);
const weaponDamage = equippedWeapon?.damage || 0;
const playerDamage = Math.floor(
  character.strength * 0.5 +
  weaponDamage +
  Math.random() * 10
);
