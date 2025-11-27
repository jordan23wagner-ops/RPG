import {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from 'react';
import { supabase } from '../lib/supabase';
import { Character, Item, Enemy } from '../types/game';
import { generateEnemy, generateLoot } from '../utils/gameLogic';

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
  sellAllItems: () => Promise<void>;
  buyPotion: () => Promise<void>;
}

const GameContext = createContext<GameContextType | undefined>(undefined);

// groupings for equipment logic
const WEAPON_TYPES = ['melee_weapon', 'ranged_weapon', 'mage_weapon'] as const;
const ARMOR_TYPES = ['melee_armor', 'ranged_armor', 'mage_armor'] as const;

export function GameProvider({ children }: { children: ReactNode }) {
  const [character, setCharacter] = useState<Character | null>(null);
  const [items, setItems] = useState<Item[]>([]);
  const [currentEnemy, setCurrentEnemy] = useState<Enemy | null>(null);
  const [floor, setFloor] = useState(1);
  const [loading, setLoading] = useState(true);

  // --------------- Init ---------------

  useEffect(() => {
    loadCharacter();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadItems = async (characterId: string) => {
    const { data, error } = await supabase
      .from('items')
      .select('*')
      .eq('character_id', characterId)
      .order('created_at', { ascending: true });

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
        console.error('Error fetching character:', error);
        setLoading(false);
        return;
      }

      if (chars && chars.length > 0) {
        const char = chars[0] as Character;
        setCharacter(char);
        await loadItems(char.id);
        generateNewEnemy(char.level);
      } else {
        setLoading(false);
      }
    } catch (err) {
      console.error('Error loading character:', err);
      setLoading(false);
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
          type: 'melee_weapon',
          rarity: 'common',
          damage: 5,
          value: 10,
          equipped: true,
        },
      ]);

      await loadItems(char.id);
    } catch (err) {
      console.error('Error creating character:', err);
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

  // --------------- Combat / Loot ---------------

  const attack = async () => {
    if (!character || !currentEnemy) return;

    const equippedWeapon = items.find(
      i =>
        i.equipped &&
        (i.type === 'weapon' ||
          i.type === 'melee_weapon' ||
          i.type === 'ranged_weapon' ||
          i.type === 'mage_weapon'),
    );

    const weaponDamage = equippedWeapon?.damage || 0;
    const playerDamage = Math.floor(
      character.strength * 0.5 + weaponDamage + Math.random() * 10,
    );

    const newEnemyHealth = Math.max(0, currentEnemy.health - playerDamage);
    const enemyAfterHit: Enemy = { ...currentEnemy, health: newEnemyHealth };
    setCurrentEnemy(enemyAfterHit);

    // Enemy died
    if (newEnemyHealth <= 0) {
      const gainedExp = currentEnemy.experience;
      const gainedGold = currentEnemy.gold;

      const expForNextLevel = character.level * 100;
      const rawExp = character.experience + gainedExp;

      let newLevel = character.level;
      let finalExp = rawExp;
      let leveled = false;

      if (rawExp >= expForNextLevel) {
        leveled = true;
        newLevel = character.level + 1;
        finalExp = rawExp - expForNextLevel;
      }

      const updates: Partial<Character> = {
        experience: finalExp,
        gold: character.gold + gainedGold,
      };

      if (leveled) {
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

      // Generate loot (always returns something now)
      let loot = generateLoot(
        currentEnemy.level,
        floor,
        currentEnemy.rarity,
      );

      if (!loot) {
        loot = {
          name: 'Tarnished Trinket',
          type: 'melee_armor',
          rarity: 'common',
          armor: 1,
          value: 5,
          equipped: false,
        };
      }

      if (loot) {
        const { error } = await supabase.from('items').insert([
          {
            character_id: character.id,
            ...loot,
          },
        ]);

        if (error) {
          console.error('Error inserting loot:', error);
        } else {
          await loadItems(character.id);
        }
      }

      // Spawn a new enemy after a short delay
      setTimeout(
        () => generateNewEnemy(leveled ? newLevel : character.level),
        800,
      );
    } else {
      // Enemy counter-attack
      setTimeout(() => {
        if (!character || !currentEnemy) return;

        const enemyDamage = Math.floor(
          currentEnemy.damage + Math.random() * 5,
        );
        const totalArmor = items
          .filter(i => i.equipped && i.armor)
          .reduce((sum, i) => sum + (i.armor || 0), 0);

        const actualDamage = Math.max(1, enemyDamage - totalArmor);
        const newHealth = Math.max(0, character.health - actualDamage);

        if (newHealth <= 0) {
          // "death" penalty: lose half gold, restore HP, same floor
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

  // --------------- Items / Potions / Shop ---------------

  const usePotion = async (itemId: string) => {
    if (!character) return;

    const potion = items.find(i => i.id === itemId && i.type === 'potion');
    if (!potion) return;

    const healAmount = 50;
    const newHealth = Math.min(
      character.max_health,
      character.health + healAmount,
    );

    await updateCharacter({ health: newHealth });

    const { error } = await supabase.from('items').delete().eq('id', itemId);
    if (error) {
      console.error('Error consuming potion:', error);
    } else {
      await loadItems(character.id);
    }
  };

  const equipItem = async (itemId: string) => {
    if (!character) return;

    const item = items.find(i => i.id === itemId);
    if (!item || item.type === 'potion') return;

    const isWeapon = WEAPON_TYPES.includes(item.type as any);
    const isArmor = ARMOR_TYPES.includes(item.type as any);

    try {
      if (item.equipped) {
        // Simple toggle off
        await supabase
          .from('items')
          .update({ equipped: false })
          .eq('id', itemId);
      } else if (isWeapon) {
        // Unequip all other weapons, then equip this one
        const equippedWeapons = items.filter(
          i =>
            i.equipped &&
            WEAPON_TYPES.includes(i.type as any),
        );
        if (equippedWeapons.length) {
          await supabase
            .from('items')
            .update({ equipped: false })
            .in(
              'id',
              equippedWeapons.map(i => i.id),
            );
        }
        await supabase
          .from('items')
          .update({ equipped: true })
          .eq('id', itemId);
      } else if (isArmor) {
        // Unequip all other armor, then equip this one
        const equippedArmor = items.filter(
          i =>
            i.equipped &&
            ARMOR_TYPES.includes(i.type as any),
        );
        if (equippedArmor.length) {
          await supabase
            .from('items')
            .update({ equipped: false })
            .in(
              'id',
              equippedArmor.map(i => i.id),
            );
        }
        await supabase
          .from('items')
          .update({ equipped: true })
          .eq('id', itemId);
      } else {
        // Fallback: behave like old logic (one per exact type)
        const sameTypeEquipped = items.find(
          i => i.equipped && i.type === item.type,
        );
        if (sameTypeEquipped) {
          await supabase
            .from('items')
            .update({ equipped: false })
            .eq('id', sameTypeEquipped.id);
        }
        await supabase
          .from('items')
          .update({ equipped: !item.equipped })
          .eq('id', itemId);
      }
    } catch (err) {
      console.error('Error equipping item:', err);
    }

    await loadItems(character.id);
  };

  const nextFloor = () => {
    const newFloor = floor + 1;
    setFloor(newFloor);
    if (character) {
      generateNewEnemy(character.level);
    }
  };

  const sellItem = async (itemId: string) => {
    if (!character) return;

    const item = items.find(i => i.id === itemId);
    if (!item) return;

    const newGold = character.gold + (item.value || 0);
    await updateCharacter({ gold: newGold });

    const { error } = await supabase.from('items').delete().eq('id', itemId);
    if (error) {
      console.error('Error selling item:', error);
    } else {
      await loadItems(character.id);
    }
  };

  const sellAllItems = async () => {
    if (!character) return;

    // Sell all unequipped, non-potion items
    const sellable = items.filter(i => !i.equipped && i.type !== 'potion');

    if (sellable.length === 0) return;

    const totalValue = sellable.reduce(
      (sum, i) => sum + (i.value || 0),
      0,
    );
    const ids = sellable.map(i => i.id);

    await updateCharacter({ gold: character.gold + totalValue });

    const { error } = await supabase.from('items').delete().in('id', ids);

    if (error) {
      console.error('Error selling all items:', error);
    } else {
      await loadItems(character.id);
    }
  };

  const buyPotion = async () => {
    if (!character) return;

    const POTION_COST = 75;
    if (character.gold < POTION_COST) return;

    await updateCharacter({ gold: character.gold - POTION_COST });

    const { error } = await supabase.from('items').insert([
      {
        character_id: character.id,
        name: 'Health Potion',
        type: 'potion',
        rarity: 'common',
        value: POTION_COST,
        equipped: false,
      },
    ]);

    if (error) {
      console.error('Error buying potion:', error);
    } else {
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
        sellAllItems,
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
