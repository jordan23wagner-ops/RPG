import { createContext, useContext, useState, useEffect, useRef, ReactNode } from 'react';
import { supabase } from '../lib/supabase';
import { Character, Item, Enemy, FloorMap, FloorRoom, RoomEventType } from '../types/game';
import { generateEnemyVariant } from '../utils/gameLogic';
import { generateLoot, getEquipmentSlot, computeSetBonuses, isTwoHanded } from '../utils/gameLogic';

// Debug flag for verbose world enemy lifecycle logging
const DEBUG_WORLD_ENEMIES = true;

export interface DamageNumber {
  id: string;
  damage: number;
  isCrit?: boolean;
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
  enemiesInWorld: Array<Enemy & { id: string; x: number; y: number }>;
  entryLadderPos: { x: number; y: number } | null;
  exitLadderPos: { x: number; y: number } | null;
  loading: boolean;
  damageNumbers: DamageNumber[];
  zoneHeat: number;
  rarityFilter: Set<string>;
  killedEnemyIds: Set<string>;
  killedWorldEnemiesRef: React.MutableRefObject<Map<number, Set<string>>>;
  lastEngagedWorldEnemyIdRef: React.MutableRefObject<string | null>;
  inWorldCombatRef: React.MutableRefObject<boolean>;
  increaseZoneHeat: (amount?: number) => void;
  resetZoneHeat: () => void;
  toggleRarityFilter: (rarity: string) => void;
  createCharacter: (name: string) => Promise<void>;
  loadCharacter: () => Promise<void>;
  attack: () => Promise<void>;
  consumePotion: (itemId: string) => Promise<void>;
  equipItem: (itemId: string) => Promise<void>;
  equipAll: () => Promise<void>;
  unequipAll: () => Promise<void>;
  allocateStatPoint: (stat: 'strength' | 'dexterity' | 'intelligence') => Promise<void>;
  nextFloor: () => void;
  setFloorDirect: (target: number) => void;
  exploreRoom: (roomId: string) => void;
  onEngageEnemy: (enemyWorldId: string) => void;
  updateCharacter: (updates: Partial<Character>) => Promise<void>;
  sellItem: (itemId: string) => Promise<void>;
  sellAllItems: () => Promise<void>;
  buyPotion: () => Promise<void>;
  merchantInventory: Partial<Item>[];
  buyMerchantItem: (id: string) => Promise<void>;
  notifyDrop?: (rarity: string, itemName: string) => void;
  affixStats: { total: number; withAffixes: number; percentage: number };
  resetAffixStats: () => void;
}

const GameContext = createContext<GameContextType | undefined>(undefined);

export function GameProvider({
  children,
  notifyDrop,
}: {
  children: ReactNode;
  notifyDrop?: (rarity: string, itemName: string) => void;
}) {
  const [character, setCharacter] = useState<Character | null>(null);
  const [items, setItems] = useState<Item[]>([]);
  const [currentEnemy, setCurrentEnemy] = useState<Enemy | null>(null);
  const [floor, setFloor] = useState(1);
  const [floorMap, setFloorMap] = useState<FloorMap | null>(null);
  const [currentRoomId, setCurrentRoomId] = useState<string | null>(null);
  const [enemiesInWorld, setEnemiesInWorld] = useState<
    Array<Enemy & { id: string; x: number; y: number }>
  >([]);
  const [killedEnemyIds, setKilledEnemyIds] = useState<Set<string>>(new Set());
  const [entryLadderPos, setEntryLadderPos] = useState<{ x: number; y: number } | null>(null);
  const [exitLadderPos, setExitLadderPos] = useState<{ x: number; y: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [damageNumbers, setDamageNumbers] = useState<DamageNumber[]>([]);
  const [zoneHeat, setZoneHeat] = useState<number>(0); // 0..100
  const [rarityFilter, setRarityFilter] = useState<Set<string>>(new Set()); // rarities to exclude from pickup
  const [merchantInventory, setMerchantInventory] = useState<Partial<Item>[]>([]);
  const lastMerchantBucketRef = useRef<number>(-1);
  // Affix drop statistics tracking (in-memory)
  const affixStatsRef = useRef<{ total: number; withAffixes: number }>({
    total: 0,
    withAffixes: 0,
  });
  // Track killed world enemies per floor to prevent respawning
  const killedWorldEnemiesRef = useRef<Map<number, Set<string>>>(new Map());
  // Track the last engaged world enemy id to mark as killed on death
  const lastEngagedWorldEnemyIdRef = useRef<string | null>(null);
  // Flag indicating current combat originated from a world enemy (not a room)
  const inWorldCombatRef = useRef<boolean>(false);
  const previousExitLadderPosRef = useRef<{ x: number; y: number } | null>(null);
  const initializedFloorRef = useRef<number | null>(null);
  const resetAffixStats = () => {
    affixStatsRef.current = { total: 0, withAffixes: 0 };
  };
  // No waves: encounters are single per room; respawns only for non-boss rooms

  const toggleRarityFilter = (rarity: string) => {
    setRarityFilter((prev: Set<string>) => {
      const newFilter = new Set(prev);
      if (newFilter.has(rarity)) newFilter.delete(rarity);
      else newFilter.add(rarity);
      return newFilter;
    });
  };

  // ---------------- Internal Load Helpers ----------------
  async function loadItems(characterId: string) {
    try {
      const { data, error } = await supabase
        .from('items')
        .select('*')
        .eq('character_id', characterId)
        .order('id', { ascending: true });
      if (error) {
        console.error('Error loading items:', error.message);
        return;
      }
      setItems((data || []) as Item[]);
    } catch (e: unknown) {
      console.error('Unexpected error loading items:', e);
    }
  }

  async function loadCharacter() {
    setLoading(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      let char: Character | null = null;

      if (user) {
        const { data, error } = await supabase
          .from('characters')
          .select('*')
          .eq('user_id', user.id)
          .limit(1)
          .maybeSingle();
        if (error && error.code !== 'PGRST116') {
          // ignore no rows
          throw error;
        }
        if (data) char = data as Character;
      }

      // Guest fallback using localStorage
      if (!char) {
        const guestId =
          typeof window !== 'undefined' ? localStorage.getItem('guest_character_id') : null;
        if (guestId) {
          const { data, error } = await supabase
            .from('characters')
            .select('*')
            .eq('id', guestId)
            .limit(1)
            .maybeSingle();
          if (!error && data) {
            char = data as Character;
          }
        }
      }

      // Create new character if none found
      if (!char) {
        const baseChar = {
          user_id: user?.id ?? null,
          name: 'Hero',
          level: 1,
          experience: 0,
          health: 100,
          max_health: 100,
          mana: 50,
          max_mana: 50,
          strength: 10,
          dexterity: 10,
          intelligence: 10,
          speed: 5,
          crit_chance: 5,
          crit_damage: 150,
          stat_points: 0,
          gold: 0,
          max_floor: 1,
        };
        const { data: created, error: createErr } = await supabase
          .from('characters')
          .insert([baseChar as never])
          .select()
          .single();
        if (createErr) throw createErr;
        char = created as Character;
        if (typeof window !== 'undefined') {
          localStorage.setItem('guest_character_id', char.id);
        }
        // Starter weapon
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
            affixes: [],
          },
        ]);
      }

      setCharacter(char);
      await loadItems(char.id);
    } catch (e: unknown) {
      const error = e as { message?: string };
      console.error('Error loading character:', error?.message || e);
    } finally {
      setLoading(false);
    }
  }

  // Debug/dev: Equip all and unequip all items (now correctly scoped inside provider)
  const equipAll = async () => {
    if (!character) return;
    const unequippedIds = items.filter((i) => !i.equipped && i.type !== 'potion').map((i) => i.id);
    if (unequippedIds.length > 0) {
      await supabase
        .from('items')
        .update({ equipped: true } as never)
        .in('id', unequippedIds);
      await loadItems(character.id);
    }
  };

  const unequipAll = async () => {
    if (!character) return;
    const equippedIds = items.filter((i) => i.equipped && i.type !== 'potion').map((i) => i.id);
    if (equippedIds.length > 0) {
      await supabase
        .from('items')
        .update({ equipped: false } as never)
        .in('id', equippedIds);
      await loadItems(character.id);
    }
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

  // Merchant inventory rotation every 15 minutes (time bucket deterministic)
  useEffect(() => {
    if (!character) return;
    const updateInventory = async () => {
      const bucket = Math.floor(Date.now() / (15 * 60 * 1000));
      if (bucket !== lastMerchantBucketRef.current) {
        lastMerchantBucketRef.current = bucket;
        const { generateMerchantInventory } = await import('../utils/lootLogic');
        const inv = generateMerchantInventory(character.level, floor);
        setMerchantInventory(inv);
      }
    };
    void updateInventory();
    const interval = setInterval(() => {
      void updateInventory();
    }, 60 * 1000); // check every minute
    return () => clearInterval(interval);
  }, [character, floor]);

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
            speed: 5,
            crit_chance: 5,
            crit_damage: 150,
            stat_points: 0,
            gold: 0,
          },
        ])
        .select()
        .single();

      if (error) throw error;

      const char = data as Character;
      setCharacter(char);
      // World enemies spawned via floor useEffect

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
          affixes: [],
        },
      ]);

      await loadItems(char.id);
    } catch (err: unknown) {
      console.error('Error creating character:', err);
    }
  };

  // --------------- Floor Generation / Exploration ---------------

  const generateFloorMap = (floorNumber: number): FloorMap => {
    const roomCount = 9; // simple 3x3 conceptual map
    const rooms: FloorRoom[] = [];

    // Rarity-weighted room events: early floors are mostly normal enemies,
    // deeper floors gradually increase mimics, mini-bosses and rare enemies.
    const depth = Math.max(0, floorNumber - 1);

    const mimicChance = Math.min(0.01 + floorNumber * 0.0015, 0.05); // slightly rarer, ~1% -> 5%
    const miniBossChance = Math.min(0.0 + Math.floor(floorNumber / 5) * 0.01, 0.06); // slower ramp, max 6%
    const rareEnemyBase = 0.04 + Math.min(floorNumber, 10) * 0.004; // start lower so floor1 is modest
    const rareEnemyBonus = Math.max(0, floorNumber - 10) * 0.008; // extra after floor 10
    const rareEnemyChance = Math.min(rareEnemyBase + rareEnemyBonus, 0.35); // cap at 35%
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
    const candidates: number[] = Array.from({ length: roomCount }, (_, i) => i).filter(
      (i) => !forbiddenIndices.has(i),
    );
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
    const isCombat = (t: RoomEventType) =>
      ['enemy', 'rareEnemy', 'miniBoss', 'mimic', 'boss'].includes(t);
    let combatIndices = rooms
      .map((r, idx) => ({ idx, r }))
      .filter(({ r }) => isCombat(r.type))
      .map(({ idx }) => idx);
    const minCombat = 5;
    const maxCombat = 10;
    // Add enemies if below minimum
    if (combatIndices.length < minCombat) {
      const empties = rooms
        .map((r, idx) => ({ idx, r }))
        .filter(({ r }) => r.type === 'empty')
        .map(({ idx }) => idx);
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
      const removable = rooms
        .map((r, idx) => ({ idx, r }))
        .filter(({ r, idx }) => r.type === 'enemy' && idx !== ladderIndex && idx !== 0)
        .map(({ idx }) => idx);
      while (combatIndices.length > maxCombat && removable.length > 0) {
        const pick = removable.splice(Math.floor(Math.random() * removable.length), 1)[0];
        rooms[pick].type = 'empty';
        combatIndices = combatIndices.filter((i) => i !== pick);
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
    // Only initialize each floor once to prevent regenerating enemies
    if (initializedFloorRef.current === floor) {
      if (DEBUG_WORLD_ENEMIES) {
        console.log(`[WorldGen] Floor ${floor} already initialized, skipping`);
      }
      return;
    }
    if (DEBUG_WORLD_ENEMIES) {
      console.log(`[WorldGen] Initializing floor ${floor} for the first time`);
    }
    initializedFloorRef.current = floor;

    initFloorIfNeeded();
    // Generate world enemies and ladder position per floor
    const WORLD_WIDTH = 4000;
    const WORLD_HEIGHT = 3000;
    const spawn = { x: 400, y: 450 };
    const dist = (a: { x: number; y: number }, b: { x: number; y: number }) =>
      Math.hypot(a.x - b.x, a.y - b.y);
    const minDistFromSpawn = 300;
    const count = Math.floor(Math.random() * 6) + 5; // 5..10
    let miniBosses = 0;
    const MAX_MINI_BOSSES = 2;
    const arr: Array<Enemy & { id: string; x: number; y: number }> = [];
    // Get or initialize killed enemies for this floor
    if (!killedWorldEnemiesRef.current.has(floor)) {
      killedWorldEnemiesRef.current.set(floor, new Set<string>());
    }
    const killedSet = killedWorldEnemiesRef.current.get(floor)!;
    setKilledEnemyIds(new Set(killedSet)); // Sync state with ref
    // Use seeded random for deterministic enemy positions per floor
    const seededRandom = (seed: number) => {
      const x = Math.sin(seed++) * 10000;
      return x - Math.floor(x);
    };
    for (let i = 0; i < count; i++) {
      // Generate deterministic position based on floor and index
      const seed = floor * 1000 + i;
      let pos = {
        x: Math.floor(seededRandom(seed) * WORLD_WIDTH),
        y: Math.floor(seededRandom(seed + 500) * WORLD_HEIGHT),
      };
      // Keep away from spawn
      let guard = 0;
      while (dist(pos, spawn) < minDistFromSpawn && guard < 50) {
        pos = {
          x: Math.floor(seededRandom(seed + guard * 10) * WORLD_WIDTH),
          y: Math.floor(seededRandom(seed + guard * 10 + 500) * WORLD_HEIGHT),
        };
        guard++;
      }
      // Pick enemy type with deterministic roll
      const roll = seededRandom(seed + 1000);
      let type: RoomEventType = 'enemy';
      // World enemy mix: keep specials quite rare on early floors.
      // Floor 1: ~1% mimics, ~2% mini-bosses max, ~10% rares.
      // Deeper floors slowly ramp these up but with hard caps.
      const isLowFloor = floor <= 3;
      const mimicThreshold = isLowFloor ? 0.01 : 0.03; // up to 3%
      const miniBossSpread = isLowFloor ? 0.02 : 0.05; // extra window for mini-bosses
      const rareSpread = isLowFloor ? 0.10 : 0.22; // extra window for rare enemies

      if (roll < mimicThreshold) type = 'mimic';
      else if (roll < mimicThreshold + miniBossSpread && miniBosses < MAX_MINI_BOSSES) {
        type = 'miniBoss';
        miniBosses++;
      } else if (roll < mimicThreshold + miniBossSpread + rareSpread) type = 'rareEnemy';
      const e = generateEnemyVariant(type, floor, character?.level || 1, zoneHeat);
      // Use sequential ID that's truly unique per floor
      const enemyId = `floor${floor}-enemy${i}`;
      if (!killedSet.has(enemyId)) {
        arr.push({ ...e, id: enemyId, x: pos.x, y: pos.y });
        if (DEBUG_WORLD_ENEMIES) {
          console.log(`[WorldGen] Spawned ${enemyId} type=${type} lvl=${e.level} hp=${e.health}`);
        }
      } else if (DEBUG_WORLD_ENEMIES) {
        console.log(`[WorldGen] Skipped previously killed ${enemyId}`);
      }
    }
    setEnemiesInWorld(arr);
    if (DEBUG_WORLD_ENEMIES) {
      console.log(
        `[WorldGen] Floor ${floor} active enemies=${arr.length}; killedSoFar=${killedSet.size}; enemyIds=${arr.map((e) => e.id).join(', ')}`,
      );
    }
    // Entry ladder: previous floor's exit (if any) or none on floor 1
    if (previousExitLadderPosRef.current && floor > 1) {
      setEntryLadderPos(previousExitLadderPosRef.current);
    } else if (floor === 1) {
      setEntryLadderPos(null);
    } else {
      setEntryLadderPos(spawn);
    }
    // Exit ladder must be far from entry (or spawn if no entry)
    const reference =
      previousExitLadderPosRef.current && floor > 1 ? previousExitLadderPosRef.current : spawn;
    let exitLadder = {
      x: Math.floor(Math.random() * WORLD_WIDTH),
      y: Math.floor(Math.random() * WORLD_HEIGHT),
    };
    let guardL = 0;
    const MIN_DIST_FROM_ENTRY = 600;
    while (dist(exitLadder, reference) < MIN_DIST_FROM_ENTRY && guardL < 150) {
      exitLadder = {
        x: Math.floor(Math.random() * WORLD_WIDTH),
        y: Math.floor(Math.random() * WORLD_HEIGHT),
      };
      guardL++;
    }
    setExitLadderPos(exitLadder);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [floor]);
  const onEngageEnemy = (enemyWorldId: string) => {
    const found = enemiesInWorld.find(
      (e: Enemy & { id: string; x: number; y: number }) => e.id === enemyWorldId,
    );
    if (!found) return;
    // Mark this enemy as killed for current floor
    const killedSet = killedWorldEnemiesRef.current.get(floor) || new Set<string>();
    // Don't mark as killed yet; store ID and mark on actual death to be precise
    lastEngagedWorldEnemyIdRef.current = enemyWorldId;
    killedWorldEnemiesRef.current.set(floor, killedSet);
    inWorldCombatRef.current = true;
    if (DEBUG_WORLD_ENEMIES) {
      console.log(
        `[Engage] Engaged world enemy ${enemyWorldId}; worldCountBeforeRemoval=${enemiesInWorld.length}`,
      );
    }
    // Set currentEnemy and remove from world list
    // Include id so downstream canvas logic (animation seed, sprite cache) does not crash
    const engagedEnemy = {
      id: enemyWorldId,
      name: found.name,
      level: found.level,
      damage: found.damage,
      health: found.health,
      max_health: found.max_health,
      experience: found.experience,
      gold: found.gold,
      rarity: found.rarity,
    } as Enemy;
    console.log(`[Engage] Setting currentEnemy:`, engagedEnemy);
    setCurrentEnemy(engagedEnemy);
    // Don't remove from enemiesInWorld - let rendering filter it out based on engagement status
  };

  const exploreRoom = (roomId: string) => {
    if (!floorMap) return;
    const room = floorMap.rooms.find((r: FloorRoom) => r.id === roomId);
    if (!room) return;
    setCurrentRoomId(roomId);
    // Room exploration resets world combat flag
    inWorldCombatRef.current = false;
    if (!room.explored) {
      room.explored = true;
    }
    // Single encounter per room; no respawns after cleared
    if (['enemy', 'rareEnemy', 'miniBoss', 'mimic', 'boss'].includes(room.type)) {
      if (room.cleared) {
        // Already cleared: no enemy
        setCurrentEnemy(null);
      } else {
        // First exploration: trigger mimic trap if applicable
        if (room.type === 'mimic' && character) {
          const trapPct = 0.2;
          const trapDamage = Math.floor(character.max_health * trapPct);
          const newHealth = Math.max(1, character.health - trapDamage);
          updateCharacter({ health: newHealth });
          console.log(`[Trap] Mimic chest bit you for ${trapDamage} HP!`);
        }
        const variantEnemy = generateEnemyVariant(
          room.type as RoomEventType,
          floor,
          character?.level || 1,
          zoneHeat,
        );
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

  const addDamageNumber = (damage: number, x: number, y: number, isCrit?: boolean) => {
    const id = `damage-${Date.now()}-${Math.random()}`;
    const newDamage: DamageNumber = { id, damage, x, y, createdAt: Date.now(), isCrit };
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
      .update(updates as never)
      .eq('id', character.id);

    if (error) {
      console.error('Error updating character:', error);
    }
  };

  // --------------- Combat / Loot ---------------

  const attack = async () => {
    // Debug: Log attack initiation
    if (DEBUG_WORLD_ENEMIES) {
      console.log(`[Attack] Initiated. character=${!!character}, currentEnemy=${currentEnemy?.id || 'null'}, health=${currentEnemy?.health || 'N/A'}`);
    }

    if (!character || !currentEnemy) {
      if (DEBUG_WORLD_ENEMIES) {
        console.log(`[Attack] Aborted: missing character or currentEnemy`);
      }
      return;
    }

    const equippedWeapon = items.find(
      (i: Item) =>
        i.equipped &&
        (i.type === 'weapon' ||
          i.type === 'melee_weapon' ||
          i.type === 'ranged_weapon' ||
          i.type === 'mage_weapon'),
    );

    const weaponDamage = equippedWeapon?.damage || 0;
    // Equipped items & aggregated affixes
    const equippedItems = items.filter((i: Item) => i.equipped);
    const setBonuses = computeSetBonuses(equippedItems);
    const allAffixes = equippedItems.flatMap((i: Item) => i.affixes || []);
    // Aggregate affix-provided stat bonuses
    const affixStatBonus = {
      strength: 0,
      dexterity: 0,
      intelligence: 0,
      crit_chance: 0,
      crit_damage: 0,
      speed: 0,
      fire_damage: 0,
      ice_damage: 0,
      lightning_damage: 0,
    } as Record<string, number>;
    for (const a of allAffixes) {
      affixStatBonus[a.stat] = (affixStatBonus[a.stat] || 0) + a.value;
    }

    const effectiveStrength =
      character.strength + setBonuses.strength + (affixStatBonus.strength || 0);
    const elementalFlat =
      (affixStatBonus.fire_damage || 0) +
      (affixStatBonus.ice_damage || 0) +
      (affixStatBonus.lightning_damage || 0);
    const baseDamage = effectiveStrength * 0.5 + weaponDamage + elementalFlat;

    // Apply crit mechanics: base 5% crit chance, 150% crit damage
    const critChance = ((character.crit_chance || 5) + (affixStatBonus.crit_chance || 0)) / 100;
    const critDamage = ((character.crit_damage || 150) + (affixStatBonus.crit_damage || 0)) / 100;
    const isCrit = Math.random() < critChance;
    const critMultiplier = isCrit ? critDamage : 1.0;

    const playerDamage = Math.floor(
      (baseDamage + setBonuses.damage + Math.random() * 10) * critMultiplier,
    );

    // Calculate new health and create updated enemy state
    // FIX: Store the enemy ID before creating the new state to maintain reference consistency
    const enemyId = currentEnemy.id;
    const newEnemyHealth = Math.max(0, currentEnemy.health - playerDamage);
    const enemyAfterHit: Enemy = { ...currentEnemy, health: newEnemyHealth };

    // Debug: Log damage calculation
    if (DEBUG_WORLD_ENEMIES) {
      console.log(`[Attack] Damage=${playerDamage} (base=${baseDamage.toFixed(1)}, crit=${isCrit}). Enemy health: ${currentEnemy.health} -> ${newEnemyHealth}`);
    }

    // Update enemy state with new health
    // NOTE: This is an async state update - the new health won't be reflected immediately
    setCurrentEnemy(enemyAfterHit);

    // Add damage number near enemy world position (fallback to center if unknown)
    const enemyWorld = enemiesInWorld.find(
      (e: Enemy & { id: string; x: number; y: number }) => e.id === enemyId,
    );
    const dmgX = enemyWorld ? enemyWorld.x : 600;
    const dmgY = enemyWorld ? enemyWorld.y : 220;
    addDamageNumber(playerDamage, dmgX, dmgY, isCrit);

    // Enemy died
    if (newEnemyHealth <= 0) {
      if (DEBUG_WORLD_ENEMIES) {
        console.log(`[Attack] Enemy ${enemyId} killed! Processing death...`);
      }
      const gainedExp = currentEnemy.experience;
      const gainedGold = currentEnemy.gold;

      const expForNextLevel = character.level * 100;
      const rawExp = character.experience + gainedExp;

      let newLevel = character.level;
      let finalExp = rawExp;
      let leveled = false;

      // Support multiple level-ups at once and only fire the
      // notification when we actually cross at least one threshold.
      while (finalExp >= expForNextLevel) {
        leveled = true;
        finalExp -= expForNextLevel;
        newLevel += 1;
      }

      console.log(
        `[XP] Gained ${gainedExp} from ${currentEnemy.name}. Before=${character.experience}/${expForNextLevel}, raw=${rawExp}, final=${finalExp}, leveled=${leveled}`,
      );

      const updates: Partial<Character> = {
        experience: finalExp,
        gold: character.gold + gainedGold,
      };

      if (leveled) {
        const levelUps = newLevel - character.level;
        updates.level = newLevel;
        updates.max_health = character.max_health + 10 * levelUps;
        updates.health = character.max_health + 10 * levelUps;
        updates.max_mana = character.max_mana + 5 * levelUps;
        updates.mana = character.max_mana + 5 * levelUps;
        updates.stat_points = (character.stat_points || 0) + 3 * levelUps;
        if (typeof window !== 'undefined') {
          window.dispatchEvent(
            new CustomEvent('level-up', {
              detail: {
                level: newLevel,
                gainedExp,
              },
            }),
          );
        }
      }

      await updateCharacter(updates);

      // Determine room context for special loot logic
      const room = floorMap?.rooms.find((r: FloorRoom) => r.id === currentRoomId);
      const isBossRoom = room?.type === 'boss';
      const isMimicRoom = room?.type === 'mimic';

      let lootDrops: Partial<Item>[] = [];
      if (isBossRoom) {
        // Boss: multiple guaranteed rare+ drops
        const { generateBossLoot } = await import('../utils/lootLogic');
        lootDrops = generateBossLoot(currentEnemy.level, floor, zoneHeat);
      } else if (isMimicRoom) {
        // Mimic: magic+ guaranteed, chance second drop
        const { generateMimicLoot } = await import('../utils/lootLogic');
        lootDrops = generateMimicLoot(currentEnemy.level, floor, zoneHeat);
      } else {
        // Standard single roll
        const single = generateLoot(currentEnemy.level, floor, currentEnemy.rarity, zoneHeat);
        if (single) lootDrops = [single];
      }

      // Filter drops by rarity preferences; if this results in none,
      // the enemy simply drops nothing (gold/XP only).
      lootDrops = lootDrops.filter((ld) => ld.rarity && !rarityFilter.has(ld.rarity));

      // Affix stats logging
      affixStatsRef.current.total += lootDrops.length;
      affixStatsRef.current.withAffixes += lootDrops.filter((d) => {
        const itemWithAffixes = d as Partial<Item> & { affixes?: Affix[] };
        return itemWithAffixes.affixes && itemWithAffixes.affixes.length > 0;
      }).length;
      if (affixStatsRef.current.total % 20 === 0) {
        const pct = (affixStatsRef.current.withAffixes / affixStatsRef.current.total) * 100;
        console.log(
          `[AffixStats] ${affixStatsRef.current.withAffixes}/${affixStatsRef.current.total} items (${pct.toFixed(1)}% with affixes)`,
        );
      }

      // Insert all drops
      const rows = lootDrops.map((ld) => {
        const itemWithMeta = ld as Partial<Item> & {
          required_level?: number;
          required_stats?: Item['required_stats'];
          affixes?: Affix[];
        };
        return {
          character_id: character.id,
          name: ld.name,
          type: ld.type,
          rarity: ld.rarity,
          damage: ld.damage,
          armor: ld.armor,
          value: ld.value,
          equipped: ld.equipped,
          required_level: itemWithMeta.required_level,
          required_stats: itemWithMeta.required_stats,
          affixes: itemWithMeta.affixes || [],
        };
      });

      if (notifyDrop) {
        lootDrops.forEach((ld) => {
          if (['epic', 'legendary', 'mythic', 'radiant', 'set'].includes(ld.rarity || '')) {
            console.log(`[Drop] ${ld.rarity}: ${ld.name}`);
            notifyDrop(ld.rarity!, ld.name || 'Unknown Item');
          }
        });
      }

      // Insert all drops with affixes; if "affixes" column missing, retry without affixes
      let insertError: unknown = null;
      let inserted = false;
      try {
        const { error } = await supabase.from('items').insert(rows as never[]);
        insertError = error;
        inserted = !error;
      } catch (e: unknown) {
        insertError = e;
      }
      if (!inserted && insertError) {
        const errorObj = insertError as { message?: string };
        const msg = String(errorObj.message || insertError);
        if (msg.includes('affixes') && msg.includes('column')) {
          const fallbackRows = rows.map((r) => {
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            const { affixes, ...rest } = r;
            return rest;
          });
          const { error: fallbackError } = await supabase
            .from('items')
            .insert(fallbackRows as never[]);
          if (fallbackError) {
            console.error('[DB Error] Fallback insert failed:', fallbackError.message, {
              fallbackRows,
            });
          } else {
            console.warn(
              '[DB] Affixes column missing — inserted items without affixes. Consider running the migration to add affixes jsonb.',
            );
            console.log(
              `[Inventory] Added ${fallbackRows.length} item(s): ${fallbackRows.map((r) => r.name).join(', ')}`,
            );
            await loadItems(character.id);
          }
        } else {
          const errorMessage = errorObj.message || String(insertError);
          console.error('[DB Error] Failed to insert loot batch:', errorMessage, { rows });
        }
      } else {
        console.log(
          `[Inventory] Added ${rows.length} item(s): ${rows.map((r) => r.name).join(', ')}`,
        );
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
      // Distinguish between room combat and world combat explicitly
      if (!inWorldCombatRef.current && floorMap && currentRoomId) {
        const room = floorMap.rooms.find((r: FloorRoom) => r.id === currentRoomId);
        if (room) {
          room.cleared = true;
          setFloorMap({ ...floorMap, rooms: [...floorMap.rooms] });
        }
        setCurrentEnemy(null);
      } else {
        // World encounter finished: mark last engaged world enemy as killed to prevent respawn
        const lastId = lastEngagedWorldEnemyIdRef.current;
        if (lastId) {
          const killedSet = killedWorldEnemiesRef.current.get(floor) || new Set<string>();
          killedSet.add(lastId);
          killedWorldEnemiesRef.current.set(floor, killedSet);
          const newKilledIds = new Set(killedSet);
          setKilledEnemyIds(newKilledIds); // Update state for rendering
          console.log(`[Kill] Updating killedEnemyIds state:`, Array.from(newKilledIds));
          lastEngagedWorldEnemyIdRef.current = null;
          if (DEBUG_WORLD_ENEMIES) {
            console.log(
              `[Kill] World enemy ${lastId} marked killed; killedCount=${killedSet.size}`,
            );
          }
        }
        inWorldCombatRef.current = false;
        setCurrentEnemy(null);
      }
    } else {
      // Enemy counter-attack
      setTimeout(() => {
        if (!character || !currentEnemy) return;

        // Recompute set bonuses for defense. Armor bonuses from sets reduce
        // damage taken. Damage bonuses from sets do not apply here.
        const enemyDamage = Math.floor(currentEnemy.damage + Math.random() * 5);
        const totalArmor = items
          .filter((i: Item) => i.equipped && i.armor)
          .reduce((sum: number, i: Item) => sum + (i.armor || 0), 0);
        const setBonusDef = computeSetBonuses(items.filter((i: Item) => i.equipped));
        const effectiveArmor = totalArmor + setBonusDef.armor;

        const actualDamage = Math.max(1, enemyDamage - effectiveArmor);
        const newHealth = Math.max(0, character.health - actualDamage);

        if (newHealth <= 0) {
          // "death" penalty: lose half gold, restore HP, same floor
          if (DEBUG_WORLD_ENEMIES) {
            console.log(`[Death] Player died. Restoring HP and clearing combat state.`);
          }
          updateCharacter({
            health: character.max_health,
            gold: Math.floor(character.gold * 0.5),
          });
          // FIX: Clear engagement refs when player dies so the enemy can reappear
          // Previously this would leave the enemy filtered out, causing "disappearing enemies"
          lastEngagedWorldEnemyIdRef.current = null;
          inWorldCombatRef.current = false;
          // Don't spawn new enemy; player can explore world to find more
          setCurrentEnemy(null);
        } else {
          updateCharacter({ health: newHealth });
        }
      }, 500);
    }
  };

  // --------------- Items / Potions / Shop ---------------

  const consumePotion = async (itemId: string) => {
    if (!character) return;

    // Enforce potion cooldown
    const now = Date.now();
    if (now < potionCooldownRef.current) return;

    const potion = items.find((i: Item) => i.id === itemId && i.type === 'potion');
    if (!potion) return;

    const healAmount = 50;
    const newHealth = Math.min(character.max_health, character.health + healAmount);

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
          .update({ equipped: false } as never)
          .eq('id', itemId);
      } else {
        // Check requirements (level 5+)
        const reqLevel = item.required_level || item.requiredLevel;
        const reqStats = item.required_stats || item.requiredStats;

        if (reqLevel && character.level < reqLevel) {
          console.warn(`Cannot equip: requires level ${reqLevel}`);
          return;
        }

        if (reqStats) {
          if (reqStats.strength && character.strength < reqStats.strength) {
            console.warn(`Cannot equip: requires ${reqStats.strength} strength`);
            return;
          }
          if (reqStats.dexterity && character.dexterity < reqStats.dexterity) {
            console.warn(`Cannot equip: requires ${reqStats.dexterity} dexterity`);
            return;
          }
          if (reqStats.intelligence && character.intelligence < reqStats.intelligence) {
            console.warn(`Cannot equip: requires ${reqStats.intelligence} intelligence`);
            return;
          }
        }

        // Enforce 2H rules: if equipping off-hand while a 2H weapon is equipped, block
        if (slot === 'amulet') {
          const twoHandedEquipped = items.some(
            (i: Item) =>
              i.equipped &&
              (i.type === 'melee_weapon' ||
                i.type === 'ranged_weapon' ||
                i.type === 'mage_weapon') &&
              isTwoHanded(i as Item),
          );
          if (twoHandedEquipped) {
            console.warn('Cannot equip off-hand while a two-handed weapon is equipped');
            return;
          }
        }

        // If equipping a 2H weapon, unequip any off-hand items
        if (
          (item.type === 'melee_weapon' ||
            item.type === 'ranged_weapon' ||
            item.type === 'mage_weapon') &&
          isTwoHanded(item as Item)
        ) {
          const offhandIds = items
            .filter(
              (equippedItem: Item) =>
                equippedItem.equipped && getEquipmentSlot(equippedItem) === 'amulet',
            )
            .map((i: Item) => i.id);
          if (offhandIds.length > 0) {
            await supabase
              .from('items')
              .update({ equipped: false } as never)
              .in('id', offhandIds);
          }
        }

        // Special handling for rings: allow two rings by checking if ring1 is taken
        if (item.type === 'ring' && slot === 'ring1') {
          const ring1Equipped = items.some(
            (i: Item) => i.equipped && getEquipmentSlot(i) === 'ring1',
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
            .update({ equipped: false } as never)
            .in('id', conflictingIds);
        }

        await supabase
          .from('items')
          .update({ equipped: true } as never)
          .eq('id', itemId);
      }
    } catch (err) {
      console.error('Error equipping item:', err);
    }

    await loadItems(character.id);
  };

  const nextFloor = () => {
    // Unlock milestone if leaving a milestone floor (every 5)
    if (character && floor % 5 === 0) {
      const currentMax = character.max_floor || 1;
      if (currentMax < floor) {
        // Persist new max_floor
        updateCharacter({ max_floor: floor });
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('milestone-unlocked', { detail: { floor } }));
        }
      }
    }
    const newFloor = floor + 1;
    // Store current exit ladder to place as entry ladder next floor
    if (exitLadderPos) previousExitLadderPosRef.current = exitLadderPos;
    setFloor(newFloor);
    const newMap = generateFloorMap(newFloor);
    setFloorMap(newMap);
    setCurrentRoomId(`room-${newFloor}-0`);
    setCurrentEnemy(null);
  };

  const setFloorDirect = (target: number) => {
    if (target < 1) return;
    // Prevent jumping beyond unlocked milestone
    if (character && character.max_floor && target > character.max_floor) {
      return;
    }
    if (exitLadderPos) previousExitLadderPosRef.current = exitLadderPos;
    setFloor(target);
    initializedFloorRef.current = null; // allow regen logic to run
    const newMap = generateFloorMap(target);
    setFloorMap(newMap);
    setCurrentRoomId(`room-${target}-0`);
    setCurrentEnemy(null);
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

    const totalValue = sellable.reduce((sum: number, i: Item) => sum + (i.value || 0), 0);
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
        affixes: [],
      },
    ]);

    if (error) {
      console.error('Error buying potion:', error);
    } else {
      await loadItems(character.id);
    }
  };

  const buyMerchantItem = async (merchantItemId: string) => {
    if (!character) return;
    const item = merchantInventory.find(
      (i) => (i as Partial<Item> & { id?: string }).id === merchantItemId,
    );
    if (!item) return;
    const cost = item.value || 0;
    if (character.gold < cost) return;
    // Deduct gold
    await updateCharacter({ gold: character.gold - cost });
    // Insert into DB
    interface ItemInsertRow {
      character_id: string;
      name: string | undefined;
      type: Item['type'] | undefined;
      rarity: Item['rarity'] | undefined;
      damage: number | undefined;
      armor: number | undefined;
      value: number | undefined;
      equipped: boolean;
      required_level: number | undefined;
      required_stats: Item['required_stats'] | undefined;
      affixes: Affix[] | undefined;
    }
    const itemWithMeta = item as Partial<Item> & {
      required_level?: number;
      required_stats?: Item['required_stats'];
      affixes?: Affix[];
    };
    const row: ItemInsertRow = {
      character_id: character.id,
      name: item.name,
      type: item.type,
      rarity: item.rarity,
      damage: item.damage,
      armor: item.armor,
      value: item.value,
      equipped: false,
      required_level: itemWithMeta.required_level,
      required_stats: itemWithMeta.required_stats,
      affixes: itemWithMeta.affixes || [],
    };
    const { error } = await supabase.from('items').insert([row as never]);
    if (error) {
      console.error('Error purchasing merchant item:', error.message);
      return;
    }
    await loadItems(character.id);
    // Remove purchased item and keep slot empty until next rotation
    setMerchantInventory((prev) =>
      prev.filter((i) => (i as Partial<Item> & { id?: string }).id !== merchantItemId),
    );
  };

  const allocateStatPoint = async (stat: 'strength' | 'dexterity' | 'intelligence') => {
    if (!character || (character.stat_points || 0) < 1) return;

    const updates: Partial<Character> = {
      stat_points: (character.stat_points || 0) - 1,
    };

    // Allocate 1 point to chosen stat
    updates[stat] = character[stat] + 1;

    // Secondary stat bonuses based on allocation
    if (stat === 'strength') {
      // STR increases health and crit damage slightly
      updates.max_health = character.max_health + 5;
      updates.health = Math.min(character.health + 5, updates.max_health as number);
      updates.crit_damage = (character.crit_damage || 150) + 2;
    } else if (stat === 'dexterity') {
      // DEX increases speed and crit chance
      updates.speed = (character.speed || 5) + 0.5;
      updates.crit_chance = (character.crit_chance || 5) + 0.3;
    } else if (stat === 'intelligence') {
      // INT increases mana and crit chance
      updates.max_mana = character.max_mana + 3;
      updates.mana = Math.min(character.mana + 3, updates.max_mana as number);
      updates.crit_chance = (character.crit_chance || 5) + 0.2;
    }

    await updateCharacter(updates);
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
        enemiesInWorld,
        killedEnemyIds,
        killedWorldEnemiesRef,
        lastEngagedWorldEnemyIdRef,
        inWorldCombatRef,
        entryLadderPos,
        exitLadderPos,
        loading,
        damageNumbers,
        zoneHeat,
        rarityFilter,
        increaseZoneHeat,
        resetZoneHeat,
        toggleRarityFilter,
        createCharacter,
        loadCharacter,
        equipAll,
        unequipAll,
        attack,
        consumePotion,
        equipItem,
        nextFloor,
        setFloorDirect,
        exploreRoom,
        onEngageEnemy,
        updateCharacter,
        sellItem,
        sellAllItems,
        buyPotion,
        merchantInventory,
        buyMerchantItem,
        allocateStatPoint,
        notifyDrop,
        affixStats: {
          total: affixStatsRef.current.total,
          withAffixes: affixStatsRef.current.withAffixes,
          percentage:
            affixStatsRef.current.total === 0
              ? 0
              : (affixStatsRef.current.withAffixes / affixStatsRef.current.total) * 100,
        },
        resetAffixStats,
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
