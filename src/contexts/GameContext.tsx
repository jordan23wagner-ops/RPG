import {
  createContext,
  useContext,
  useState,
  useEffect,
  useRef,
  ReactNode,
} from 'react';
import { supabase } from '../lib/supabase';
import { Character, Item, Enemy, FloorMap, FloorRoom, RoomEventType } from '../types/game';
import { generateEnemyVariant } from '../utils/gameLogic';
import {
  generateEnemy,
  generateLoot,
  getEquipmentSlot,
  computeSetBonuses,
  isTwoHanded,
} from '../utils/gameLogic';

export interface DamageNumber {
  id: string;
  damage: number;
  x: number;
  y: number;
  createdAt: number;
}

interface GameContextType {
  character: Character | null;
  items: Item[];
  currentEnemy: Enemy | null;
  floor: number;
  floorMap: FloorMap | null;
  currentRoomId: string | null;
  loading: boolean;
  damageNumbers: DamageNumber[];
  zoneHeat: number;
  rarityFilter: Set<string>;
  increaseZoneHeat: (amount?: number) => void;
  resetZoneHeat: () => void;
  toggleRarityFilter: (rarity: string) => void;
  createCharacter: (name: string) => Promise<void>;
  loadCharacter: () => Promise<void>;
  attack: () => Promise<void>;
  usePotion: (itemId: string) => Promise<void>;
  equipItem: (itemId: string) => Promise<void>;
  nextFloor: () => void;
  exploreRoom: (roomId: string) => void;
  updateCharacter: (updates: Partial<Character>) => Promise<void>;
  sellItem: (itemId: string) => Promise<void>;
  sellAllItems: () => Promise<void>;
  buyPotion: () => Promise<void>;
  notifyDrop?: (rarity: string, itemName: string) => void;
}

const GameContext = createContext<GameContextType | undefined>(undefined);

export function GameProvider({ children, notifyDrop }: { children: ReactNode; notifyDrop?: (rarity: string, itemName: string) => void }) {
  const [character, setCharacter] = useState<Character | null>(null);
  const [items, setItems] = useState<Item[]>([]);
  const [currentEnemy, setCurrentEnemy] = useState<Enemy | null>(null);
  const [floor, setFloor] = useState(1);
  const [floorMap, setFloorMap] = useState<FloorMap | null>(null);
  const [currentRoomId, setCurrentRoomId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [damageNumbers, setDamageNumbers] = useState<DamageNumber[]>([]);
  const [zoneHeat, setZoneHeat] = useState<number>(0); // 0..100
  const [rarityFilter, setRarityFilter] = useState<Set<string>>(new Set()); // rarities to exclude from pickup
  // No waves: encounters are single per room; respawns only for non-boss rooms
  
  const toggleRarityFilter = (rarity: string) => {
    setRarityFilter((prev: Set<string>) => {
      const newFilter = new Set(prev);
      if (newFilter.has(rarity)) newFilter.delete(rarity); else newFilter.add(rarity);
      return newFilter;
    });
  };
  
  const increaseZoneHeat = (amount: number = 5) => {
    setZoneHeat((prev: number) => Math.min(100, (prev || 0) + amount));
  };
  const resetZoneHeat = () => setZoneHeat(0);

  // Gradual decay: heat reduces over time to encourage active play to keep it high
  useEffect(() => {
    const interval = setInterval(() => {
      setZoneHeat((prev: number) => Math.max(0, (prev || 0) - 1));
    }, 15000);
    return () => clearInterval(interval);
  }, []);

  // Potion cooldown tracking
  const potionCooldownRef = useRef(Date.now());
  const POTION_COOLDOWN_MS = 3000;

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
      // Try to get the user, but don’t require it
let userId: string | null = null;

try {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    userId = user.id;
  } else {
    console.warn('No authenticated user — creating guest character');
  }
} catch (e) {
  console.warn('Failed to fetch user — creating guest character', e);
}

// IMPORTANT: no more "Not authenticated" error
// if (!user) throw new Error('Not authenticated');  <-- REMOVE THIS


      const { data, error } = await supabase
        .from('characters')
        .insert([
          {
            user_id: userId,
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
          required_level: 1,
          required_stats: { strength: 1 },
        },
      ]);

      await loadItems(char.id);
    } catch (err) {
      console.error('Error creating character:', err);
    }
  };

  const generateNewEnemy = (playerLevel: number) => {
    const enemy = generateEnemy(floor, playerLevel, zoneHeat);
    setCurrentEnemy(enemy);
  };

  // --------------- Floor Generation / Exploration ---------------

  const generateFloorMap = (floorNumber: number): FloorMap => {
    const roomCount = 9; // simple 3x3 conceptual map
    const rooms: FloorRoom[] = [];
    const mimicChance = 0.05; // fixed 5% mimic chance
    const miniBossChance = Math.min(0.01 + Math.floor(floorNumber / 5) * 0.01, 0.08); // up to 8%
    const rareEnemyChance = Math.min(0.15 + floorNumber * 0.01, 0.35); // scales with depth
    const isBossFloor = floorNumber % 10 === 0;

    for (let i = 0; i < roomCount; i++) {
      const id = `room-${floorNumber}-${i}`;
      let type: RoomEventType = 'enemy';

      const roll = Math.random();
      if (roll < mimicChance) type = 'mimic';
      else if (roll < mimicChance + miniBossChance) type = 'miniBoss';
      else if (roll < mimicChance + miniBossChance + rareEnemyChance) type = 'rareEnemy';
      else if (roll > 0.85) type = 'empty'; // some empty dead-ends

      rooms.push({ id, index: i, type, explored: i === 0, cleared: false });
    }
  // Place ladder in a random non-start room, not adjacent to spawn (index 0)
  const forbiddenIndices = new Set<number>([0, 1, 3]); // avoid right and down from spawn
  const candidates: number[] = Array.from({ length: roomCount }, (_, i) => i).filter(i => !forbiddenIndices.has(i));
  const ladderIndex = candidates[Math.floor(Math.random() * candidates.length)];
    // Boss floor: ensure one dedicated boss room distinct from ladder & start
    if (isBossFloor) {
      let bossIndex = Math.floor(Math.random() * roomCount);
      if (bossIndex === 0) bossIndex = (bossIndex + 1) % roomCount;
      if (bossIndex === ladderIndex) bossIndex = (bossIndex + 1) % roomCount;
      rooms[bossIndex].type = 'boss';
      rooms[ladderIndex].type = 'ladder';
    } else {
      rooms[ladderIndex].type = 'ladder';
    }

    // Ensure a reasonable number of combat rooms (min 5, max 10)
    const isCombat = (t: RoomEventType) => ['enemy','rareEnemy','miniBoss','mimic','boss'].includes(t);
    let combatIndices = rooms.map((r, idx) => ({ idx, r })).filter(({ r }) => isCombat(r.type)).map(({ idx }) => idx);
    const minCombat = 5;
    const maxCombat = 10;
    // Add enemies if below minimum
    if (combatIndices.length < minCombat) {
      const empties = rooms.map((r, idx) => ({ idx, r })).filter(({ r }) => r.type === 'empty').map(({ idx }) => idx);
      while (combatIndices.length < minCombat && empties.length > 0) {
        const pick = empties.splice(Math.floor(Math.random() * empties.length), 1)[0];
        if (pick !== 0 && pick !== ladderIndex) {
          rooms[pick].type = 'enemy';
          combatIndices.push(pick);
        }
      }
    }
    // Reduce enemies if above maximum (prefer turning plain enemy to empty)
    if (combatIndices.length > maxCombat) {
      const removable = rooms.map((r, idx) => ({ idx, r }))
        .filter(({ r, idx }) => r.type === 'enemy' && idx !== ladderIndex && idx !== 0)
        .map(({ idx }) => idx);
      while (combatIndices.length > maxCombat && removable.length > 0) {
        const pick = removable.splice(Math.floor(Math.random() * removable.length), 1)[0];
        rooms[pick].type = 'empty';
        combatIndices = combatIndices.filter(i => i !== pick);
      }
    }

    return {
      floor: floorNumber,
      rooms,
      ladderRoomId: rooms[ladderIndex].id,
      startedAt: new Date().toISOString(),
    };
  };

  const initFloorIfNeeded = () => {
    setFloorMap((prev: FloorMap | null) => prev ?? generateFloorMap(floor));
    if (!currentRoomId) {
      // start in first room
      setCurrentRoomId(`room-${floor}-0`);
    }
  };

  useEffect(() => {
    initFloorIfNeeded();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [floor]);

  const exploreRoom = (roomId: string) => {
    if (!floorMap) return;
    const room = floorMap.rooms.find((r: FloorRoom) => r.id === roomId);
    if (!room) return;
    setCurrentRoomId(roomId);
    if (!room.explored) {
      room.explored = true;
    }
    // Single encounter per room; respawn only for non-boss rooms
    if (['enemy','rareEnemy','miniBoss','mimic','boss'].includes(room.type)) {
      if (room.type === 'boss' && room.cleared) {
        setCurrentEnemy(null);
      } else {
        // Mimic trap on first exploration
        if (!room.cleared && room.type === 'mimic' && character) {
          const trapPct = 0.2;
          const trapDamage = Math.floor(character.max_health * trapPct);
          const newHealth = Math.max(1, character.health - trapDamage);
          updateCharacter({ health: newHealth });
          console.log(`[Trap] Mimic chest bit you for ${trapDamage} HP!`);
        }
        const spawnType = room.cleared && room.type !== 'boss' ? 'enemy' : (room.type as any);
        const variantEnemy = generateEnemyVariant(spawnType, floor, character?.level || 1, zoneHeat);
        setCurrentEnemy(variantEnemy);
      }
    } else if (room.type === 'empty') {
      setCurrentEnemy(null);
    } else if (room.type === 'ladder') {
      setCurrentEnemy(null);
    }
    // Force re-render map update
    setFloorMap({ ...floorMap, rooms: [...floorMap.rooms] });
  };

  const addDamageNumber = (damage: number, x: number, y: number) => {
    const id = `damage-${Date.now()}-${Math.random()}`;
    const newDamage: DamageNumber = { id, damage, x, y, createdAt: Date.now() };
    setDamageNumbers((prev: DamageNumber[]) => [...prev, newDamage]);
    // Auto-remove after 1.5 seconds
    setTimeout(() => {
      setDamageNumbers((prev: DamageNumber[]) => prev.filter((d: DamageNumber) => d.id !== id));
    }, 1500);
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
      (i: Item) =>
        i.equipped &&
        (i.type === 'weapon' ||
          i.type === 'melee_weapon' ||
          i.type === 'ranged_weapon' ||
          i.type === 'mage_weapon'),
    );

    const weaponDamage = equippedWeapon?.damage || 0;
    // Compute set bonuses from all equipped items. These bonuses can add
    // flat damage, armor or core stats such as strength/dexterity/intelligence.
    const setBonuses = computeSetBonuses(items.filter((i: Item) => i.equipped));
    const effectiveStrength = character.strength + setBonuses.strength;
    const baseDamage = effectiveStrength * 0.5 + weaponDamage;
    const playerDamage = Math.floor(
      baseDamage + setBonuses.damage + Math.random() * 10,
    );

    const newEnemyHealth = Math.max(0, currentEnemy.health - playerDamage);
    const enemyAfterHit: Enemy = { ...currentEnemy, health: newEnemyHealth };
    setCurrentEnemy(enemyAfterHit);

    // Add damage number at enemy position
    addDamageNumber(playerDamage, 600, 220);

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

      // Determine room context for special loot logic
      const room = floorMap?.rooms.find((r: FloorRoom) => r.id === currentRoomId);
      const isBossRoom = room?.type === 'boss';
      const isMimicRoom = room?.type === 'mimic';

      let lootDrops: Partial<Item>[] = [];
      if (isBossRoom) {
        // Boss: multiple guaranteed rare+ drops
        const { generateBossLoot } = await import('../utils/gameLogic');
        lootDrops = generateBossLoot(currentEnemy.level, floor, zoneHeat);
      } else if (isMimicRoom) {
        // Mimic: magic+ guaranteed, chance second drop
        const { generateMimicLoot } = await import('../utils/gameLogic');
        lootDrops = generateMimicLoot(currentEnemy.level, floor, zoneHeat);
      } else {
        // Standard single roll
        const single = generateLoot(
          currentEnemy.level,
          floor,
          currentEnemy.rarity,
          zoneHeat,
        );
        if (single) lootDrops = [single];
      }

      // Filter drops & provide fallback if empty
      lootDrops = lootDrops.filter(ld => !rarityFilter.has(ld.rarity));
      if (lootDrops.length === 0) {
        lootDrops = [{
          name: 'Tarnished Trinket',
          type: 'melee_armor',
          rarity: 'common',
          armor: 1,
          value: 5,
          equipped: false,
          required_level: 1,
        }];
      }

      // Insert all drops
      const rows = lootDrops.map(ld => ({
        character_id: character.id,
        name: ld.name,
        type: ld.type,
        rarity: ld.rarity,
        damage: ld.damage,
        armor: ld.armor,
        value: ld.value,
        equipped: ld.equipped,
        required_level: (ld as any).required_level,
        required_stats: (ld as any).required_stats,
      }));

      if (notifyDrop) {
        lootDrops.forEach(ld => {
          if (['epic','legendary','mythic','radiant','set'].includes(ld.rarity || '')) {
            console.log(`[Drop] ${ld.rarity}: ${ld.name}`);
            notifyDrop(ld.rarity!, ld.name || 'Unknown Item');
          }
        });
      }

      const { error } = await supabase.from('items').insert(rows);
      if (error) {
        console.error('[DB Error] Failed to insert loot batch:', error.message, { rows });
      } else {
        console.log(`[Inventory] Added ${rows.length} item(s): ${rows.map(r => r.name).join(', ')}`);
        await loadItems(character.id);
      }

      // Increase zone heat based on enemy rarity
      const heatGainMap: Record<string, number> = {
        normal: 3,
        rare: 8,
        elite: 15,
        boss: 30,
      };
      const gainedHeat = heatGainMap[currentEnemy.rarity] || 3;
      setZoneHeat((prev: number) => Math.min(100, prev + gainedHeat));

      // Mark room cleared after kill; respawns only if revisited (non-boss)
      if (floorMap && currentRoomId) {
        const room = floorMap.rooms.find((r: FloorRoom) => r.id === currentRoomId);
        if (room) {
          room.cleared = true;
          setFloorMap({ ...floorMap, rooms: [...floorMap.rooms] });
        }
        setCurrentEnemy(null);
      } else {
        setTimeout(
          () => generateNewEnemy(leveled ? newLevel : character.level),
          800,
        );
      }
    } else {
      // Enemy counter-attack
      setTimeout(() => {
        if (!character || !currentEnemy) return;

        // Recompute set bonuses for defense. Armor bonuses from sets reduce
        // damage taken. Damage bonuses from sets do not apply here.
        const enemyDamage = Math.floor(
          currentEnemy.damage + Math.random() * 5,
        );
        const totalArmor = items
          .filter((i: Item) => i.equipped && i.armor)
          .reduce((sum: number, i: Item) => sum + (i.armor || 0), 0);
        const setBonusDef = computeSetBonuses(items.filter((i: Item) => i.equipped));
        const effectiveArmor = totalArmor + setBonusDef.armor;

        const actualDamage = Math.max(1, enemyDamage - effectiveArmor);
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

    // Enforce potion cooldown
    const now = Date.now();
    if (now < potionCooldownRef.current) return;

    const potion = items.find((i: Item) => i.id === itemId && i.type === 'potion');
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

    // Update next allowed potion time
    potionCooldownRef.current = now + POTION_COOLDOWN_MS;
  };

  const equipItem = async (itemId: string) => {
    if (!character) return;

    const item = items.find((i: Item) => i.id === itemId);
    if (!item || item.type === 'potion') return;

    let slot = getEquipmentSlot(item);

    try {
      if (item.equipped) {
        // Toggle off
        await supabase
          .from('items')
          .update({ equipped: false })
          .eq('id', itemId);
      } else {
        // Enforce 2H rules: if equipping off-hand while a 2H weapon is equipped, block
        if (slot === 'amulet') {
          const twoHandedEquipped = items.some((i: Item) => i.equipped && (i.type === 'melee_weapon' || i.type === 'ranged_weapon' || i.type === 'mage_weapon') && isTwoHanded(i as Item));
          if (twoHandedEquipped) {
            console.warn('Cannot equip off-hand while a two-handed weapon is equipped');
            return;
          }
        }

        // If equipping a 2H weapon, unequip any off-hand items
        if ((item.type === 'melee_weapon' || item.type === 'ranged_weapon' || item.type === 'mage_weapon') && isTwoHanded(item as Item)) {
          const offhandIds = items
            .filter((equippedItem: Item) => equippedItem.equipped && getEquipmentSlot(equippedItem) === 'amulet')
            .map((i: Item) => i.id);
          if (offhandIds.length > 0) {
            await supabase
              .from('items')
              .update({ equipped: false })
              .in('id', offhandIds);
          }
        }

        // Special handling for rings: allow two rings by checking if ring1 is taken
        if (item.type === 'ring' && slot === 'ring1') {
          const ring1Equipped = items.some(
            (i: Item) => i.equipped && getEquipmentSlot(i) === 'ring1'
          );
          if (ring1Equipped) {
            // Try ring2 instead
            slot = 'ring2';
          }
        }

        // Find any equipped items that conflict with this slot
        let conflictingIds: string[] = [];

        if (slot) {
          conflictingIds = items
            .filter((equippedItem: Item) => {
              if (!equippedItem.equipped) return false;
              const eqSlot = getEquipmentSlot(equippedItem);
              if (slot === 'weapon' && eqSlot === 'weapon') return true;
              if (eqSlot === slot) return true;
              return false;
            })
            .map((i: Item) => i.id);
        }

        if (conflictingIds.length > 0) {
          await supabase
            .from('items')
            .update({ equipped: false })
            .in('id', conflictingIds);
        }

        await supabase
          .from('items')
          .update({ equipped: true })
          .eq('id', itemId);
      }
    } catch (err) {
      console.error('Error equipping item:', err);
    }

    await loadItems(character.id);
  };

  const nextFloor = () => {
    // Only allow if ladder room explored
    if (floorMap) {
      const ladderRoom = floorMap.rooms.find((r: FloorRoom) => r.id === floorMap.ladderRoomId);
      if (!ladderRoom || !ladderRoom.explored) return;
      // Boss floor requirement: boss room cleared
      const needsBossClear = floor % 10 === 0;
      if (needsBossClear) {
        const bossRoom = floorMap.rooms.find((r: FloorRoom) => r.type === 'boss');
        if (bossRoom && !bossRoom.cleared) return;
      }
    }
    const newFloor = floor + 1;
    setFloor(newFloor);
    // Reset map state for new floor
    const newMap = generateFloorMap(newFloor);
    setFloorMap(newMap);
    setCurrentRoomId(`room-${newFloor}-0`);
    setCurrentEnemy(null);
    if (character) {
      // Enemy spawns only when entering combat room, so none here
    }
  };

  const sellItem = async (itemId: string) => {
    if (!character) return;

    const item = items.find((i: Item) => i.id === itemId);
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
    const sellable = items.filter((i: Item) => !i.equipped && i.type !== 'potion');

    if (sellable.length === 0) return;

    const totalValue = sellable.reduce(
      (sum: number, i: Item) => sum + (i.value || 0),
      0,
    );
    const ids = sellable.map((i: Item) => i.id);

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
        required_level: 1,
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
        floorMap,
        currentRoomId,
        loading,
        damageNumbers,
        zoneHeat,
        rarityFilter,
        increaseZoneHeat,
        resetZoneHeat,
        toggleRarityFilter,
        createCharacter,
        loadCharacter,
        attack,
        usePotion,
        equipItem,
        nextFloor,
        exploreRoom,
        updateCharacter,
        sellItem,
        sellAllItems,
        buyPotion,
        notifyDrop,
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
