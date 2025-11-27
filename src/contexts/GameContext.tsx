// src/contexts/GameContext.tsx
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

  // ---------- DATA LOADERS ----------

  const loadItems = async (characterId: string) => {
    const { data, error } = await supabase
      .from('items')
      .select('*')
      .eq('character_id', characterId);

    if (error) {
      console.error('Error loading items:', error);
      return;
    }

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

      const { data: chars, error } = await supabase
        .from('characters')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1);

      if (error) {
        console.error('Error loading character:', error);
        setLoading(false);
        return;
      }

      if (chars && chars.length > 0) {
        const char = chars[0] as Character;
        setCharacter(char);
        await loadItems(char.id);
        generateNewEnemy(char.level);
      }
    } catch (error) {
      console.error('Error in loadCharacter:', error);
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

      // starter weapon
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

    const { error } = await supabase
      .from('characters')
      .update(updates)
      .eq('id', character.id);

    if (error) {
      console.error('Error updating character:', error);
    }
  };

  // ---------- COMBAT & LOOT ----------

  const attack = async () => {
    if (!character || !currentEnemy) return;

    // find a weapon (any equipped item with damage first, then plain weapon)
    const equippedWeapon =
      items.find((i) => i.equipped && i.damage && i.damage > 0) ??
      items.find((i) => i.type === 'weapon' && i.equipped);

    const weaponDamage = equippedWeapon?.damage || 0;
    const playerDamage = Math.floor(
      character.strength * 0.5 + weaponDamage + Math.random() * 10
    );

    const newEnemyHealth = Math.max(0, currentEnemy.health - playerDamage);
    const enemyAfterHit: Enemy = { ...currentEnemy, health: newEnemyHealth };

    setCurrentEnemy(enemyAfterHit);

    // ---- ENEMY DIES ----
    if (newEnemyHealth <= 0) {
      const newExp = character.experience + currentEnemy.experience;
      const newGold = character.gold + currentEnemy.gold;
      const expForNextLevel = character.level * 100;

      let levelUp = false;
      let newLevel = character.level;
      let finalExp = newExp;

      if (newExp >= expForNextLevel) {
        levelUp = true;
        newLevel = character.level + 1;
        finalExp = newExp - expForNextLevel;
      }

      const updates: Partial<Character> = {
        experience: finalExp,
        gold: newGold,
      };

      if (levelUp) {
        updates.level = newLevel;
        updates.max_health = character.max_health + 10;
        updates.health = character.max_health + 10;
        updates.max_mana = character.max_mana + 5;
        updates.mana = character.max_mana + 5;
        updates.strength = character.strength + 2;
        updates.dexterity = character.dexterity + 2;
        updates.intelligence = character.intelligence + 2;
      }

      await updateCharacter(updates);

      // ---------- LOOT DROP ----------
      const loot = rollLoot(enemyAfterHit, character);
      console.log('rollLoot result:', loot);

      if (loot) {
        // Map extended item types to DB enum values
        const dbType =
          loot.type === 'melee_weapon' ||
          loot.type === 'ranged_weapon' ||
          loot.type === 'mage_weapon'
            ? 'weapon'
            : loot.type === 'melee_armor' ||
              loot.type === 'ranged_armor' ||
              loot.type === 'mage_armor'
            ? 'armor'
            : loot.type;

        const { error } = await supabase.from('items').insert([
          {
            character_id: character.id,
            name: loot.name,
            type: dbType,
            rarity: loot.rarity,
            damage: loot.damage ?? null,
            armor: loot.armor ?? null,
            value: loot.value,
            equipped: false,
            // let DB handle id/created_at, and we’re not persisting affixes yet
          },
        ]);

        if (error) {
          console.error(
            'Error inserting loot into Supabase:',
            error.message || error
          );
        } else {
          console.log('Loot successfully inserted into Supabase');
          await loadItems(character.id);
        }
      } else {
        console.log('No loot returned from rollLoot');
      }

      // spawn next enemy
      setTimeout(() => generateNewEnemy(newLevel), 1000);
    } else {
      // ---- ENEMY COUNTER-ATTACK ----
      setTimeout(() => {
        // re-check in case state changed
        if (!character || !currentEnemy) return;

        const enemyDamage = Math.floor(currentEnemy.damage + Math.random() * 5);
        const equippedArmor = items
          .filter((i) => i.equipped && i.armor)
          .reduce((sum, i) => sum + (i.armor || 0), 0);

        const actualDamage = Math.max(1, enemyDamage - equippedArmor);
        const newHealth = Math.max(0, character.health - actualDamage);

        if (newHealth <= 0) {
          updateCharacter({
            health: character.max_health,
            gold: Math.floor(character.gold * 0.5),
          });
          generateNewEnemy(character.level);
        } else {
          updateCharacter({ health: newHealth });
        }
      }, 500);
    }
  };

  // ---------- ITEMS / SHOP ----------

  const usePotion = async (itemId: string) => {
    if (!character) return;

    const potion = items.find((i) => i.id === itemId && i.type === 'potion');
    if (!potion) return;

    const healAmount = 50;
    const newHealth = Math.min(character.max_health, character.health + healAmount);

    await updateCharacter({ health: newHealth });
    await supabase.from('items').delete().eq('id', itemId);
    await loadItems(character.id);
  };

  const equipItem = async (itemId: string) => {
    if (!character) return;

    const item = items.find((i) => i.id === itemId);
    if (!item || item.type === 'potion') return;

    const currentlyEquipped = items.find(
      (i) => i.type === item.type && i.equipped
    );

    if (currentlyEquipped) {
      await supabase
        .from('items')
        .update({ equipped: false })
        .eq('id', currentlyEquipped.id);
    }

    await supabase
      .from('items')
      .update({ equipped: !item.equipped })
      .eq('id', itemId);

    await loadItems(character.id);
  };

  const nextFloor = () => {
    setFloor((prev) => prev + 1);
    if (character) {
      generateNewEnemy(character.level);
    }
  };

  const sellItem = async (itemId: string) => {
    if (!character) return;

    const item = items.find((i) => i.id === itemId);
    if (!item) return;

    const newGold = character.gold + item.value;
    await updateCharacter({ gold: newGold });
    await supabase.from('items').delete().eq('id', itemId);
    await loadItems(character.id);
  };

  const buyPotion = async () => {
    if (!character) return;

    const POTION_COST = 75;
    if (character.gold < POTION_COST) return;

    const newGold = character.gold - POTION_COST;
    await updateCharacter({ gold: newGold });

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      await supabase.from('items').insert([
        {
          character_id: character.id,
          name: 'Health Potion',
          type: 'potion',
          rarity: 'common',
          value: POTION_COST,
          equipped: false,
        },
      ]);
      await loadItems(character.id);
    }
  };

  return (
    <GameContext.Provider
      value={{
        character,
        items,
        currentEnemy,
        floor,
        loading,
        createCharacter,
        loadCharacter,
        attack,
        usePotion,
        equipItem,
        nextFloor,
        updateCharacter,
        sellItem,
        buyPotion,
      }}
    >
      {children}
    </GameContext.Provider>
  );
}

export function useGame() {
  const context = useContext(GameContext);
  if (context === undefined) {
    throw new Error('useGame must be used within a GameProvider');
  }
  return context;
}
