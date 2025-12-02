// src/components/DungeonView.tsx
import { useRef, useEffect } from 'react';
import { EQUIPMENT_VISUALS, ITEM_TYPE_TO_SLOT } from '../utils/equipmentVisuals';
import {
  TILE_SIZE,
  loadDungeonTileset,
  generateFloor1,
  drawDungeon,
  canMoveTo,
  type DungeonGrid,
} from '../dungeonConfig';
import { preloadEnemySprites } from '../lib/sprites';
import { Enemy, Character } from '../types/game';
import { DamageNumber } from '../contexts/GameContext';
import { useGame } from '../contexts/GameContext';

interface DungeonViewProps {
  enemy: Enemy | null;
  floor: number;
  onAttack: () => void;
  damageNumbers: DamageNumber[];
  character?: Character | null;
  zoneHeat?: number;
}

export function DungeonView({
  enemy,
  floor,
  onAttack,
  damageNumbers,
  character,
  zoneHeat,
}: DungeonViewProps) {
  const {
    enemiesInWorld,
    killedEnemyIds,
    killedWorldEnemiesRef,
    entryLadderPos,
    exitLadderPos,
    onEngageEnemy,
    items,
  } = useGame();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const tilesetImageRef = useRef<HTMLImageElement | null>(null);
  const dungeonGridRef = useRef<DungeonGrid | null>(null);

  const zoneHeatRef = useRef<number | undefined>(undefined);
  const minimapEnabledRef = useRef<boolean>(true);
  const ladderDiscoveredRef = useRef<boolean>(false);
  const currentlyEngagedIdRef = useRef<string | null>(null);

  // Floor theme palette helper
  const getFloorTheme = (f: number) => {
    const themes = [
      {
        // dungeon
        name: 'dungeon',
        bg: '#1a1a2e',
        tileFill: '#16213e',
        tileStroke: '#0b132b',
        hudAccent: '#fbbf24',
        player: '#4f46e5',
        enemy: '#dc2626',
        minimapPanel: 'rgba(0,0,0,0.55)',
        minimapWorld: '#0f172a',
        minimapViewport: '#fbbf24',
      },
      {
        // lava / volcano
        name: 'lava',
        bg: '#2b1d1b',
        tileFill: '#3b241f',
        tileStroke: '#4a2a22',
        hudAccent: '#fb923c',
        player: '#ef4444',
        enemy: '#7f1d1d',
        minimapPanel: 'rgba(20,8,6,0.6)',
        minimapWorld: '#1c1412',
        minimapViewport: '#fb923c',
      },
      {
        // ice / snow
        name: 'ice',
        bg: '#0b1b2b',
        tileFill: '#133b5c',
        tileStroke: '#0f2a44',
        hudAccent: '#60a5fa',
        player: '#60a5fa',
        enemy: '#1f6feb',
        minimapPanel: 'rgba(6,12,18,0.6)',
        minimapWorld: '#0a1826',
        minimapViewport: '#60a5fa',
      },
      {
        // jungle
        name: 'jungle',
        bg: '#0d1f12',
        tileFill: '#163d22',
        tileStroke: '#0f2a18',
        hudAccent: '#10b981',
        player: '#22c55e',
        enemy: '#065f46',
        minimapPanel: 'rgba(7,18,12,0.6)',
        minimapWorld: '#0a1d14',
        minimapViewport: '#10b981',
      },
    ];
    const idx = f % 4; // cycle themes every floor
    return themes[idx];
  };

  // keep zoneHeat prop in sync (set below via props)

  // ========== Constants ==========
  const CANVAS_WIDTH = 800;
  const CANVAS_HEIGHT = 480;
  // Large world dimensions for camera to pan around
  const WORLD_WIDTH = 4000;
  const WORLD_HEIGHT = 3000;
  const MOVE_SPEED = 5;
  // const BOUNDARY_PADDING = 50; // deprecated with world bounds
  const ATTACK_COOLDOWN_MS = 400;
  const MAX_CHASE_DISTANCE = 450;
  const ENEMY_SPEED = 2.2;
  const ATTACK_RANGE = 120;
  const MIN_PLAYER_ENEMY_DISTANCE = 10; // Prevents overlap
  // Town gate world position (near initial spawn)
  const TOWN_GATE_POS = { x: 340, y: 450 };

  // ========== Ref Storage for Game State ==========
  // Using refs to avoid 60fps React re-renders and maintain state across frames

  // Player and enemy positions (updated each frame)
  // World positions
  const playerPosRef = useRef({ x: 400, y: 450 });
  const enemyPosRef = useRef({ x: 900, y: 600 });
  const hasSpawnedThisFloorRef = useRef(false);

  // Camera state: top-left world coordinates of the visible viewport
  const cameraRef = useRef({ x: 0, y: 0 });

  // Input tracking
  const keysPressed = useRef<{ [key: string]: boolean }>({});

  // Attack cooldown tracking (stores next allowed attack time in ms)
  const nextAttackTimeRef = useRef(Date.now());

  // Keep latest props in refs so effects don't depend on them (prevents unnecessary re-runs)
  const enemyRef = useRef<Enemy | null>(enemy);
  const floorRef = useRef(floor);
  const onAttackRef = useRef(onAttack);
  const damageNumbersRef = useRef(damageNumbers);
  const characterRef = useRef(character);

  // Initialize dungeon tileset + grid once
  useEffect(() => {
    let cancelled = false;
    const initDungeon = async () => {
      try {
        const img = await loadDungeonTileset();
        if (cancelled) return;
        tilesetImageRef.current = img;
        dungeonGridRef.current = generateFloor1();
      } catch (err) {
        console.error('Failed to init dungeon', err);
      }
    };
    initDungeon();
    return () => {
      cancelled = true;
    };
  }, []);

  // --- keep refs in sync with props ---

  useEffect(() => {
    enemyRef.current = enemy || null;
  }, [enemy]);

  useEffect(() => {
    floorRef.current = floor;
    hasSpawnedThisFloorRef.current = false; // Reset spawn flag on floor change
    // Spawn player at entry ladder if it exists (floor > 1), else at default spawn
    if (entryLadderPos && floor > 1) {
      playerPosRef.current = { x: entryLadderPos.x, y: entryLadderPos.y };
    } else {
      playerPosRef.current = { x: 400, y: 450 };
    }
    hasSpawnedThisFloorRef.current = true;
  }, [floor, entryLadderPos]);

  useEffect(() => {
    onAttackRef.current = onAttack;
  }, [onAttack]);

  useEffect(() => {
    // Track current enemy engagement status
    if (enemy) {
      currentlyEngagedIdRef.current = enemy.id || null;
    } else {
      currentlyEngagedIdRef.current = null;
    }
  }, [enemy]);

  useEffect(() => {
    damageNumbersRef.current = damageNumbers;
  }, [damageNumbers]);

  useEffect(() => {
    zoneHeatRef.current = zoneHeat;
  }, [zoneHeat]);

  useEffect(() => {
    characterRef.current = character || null;
  }, [character]);

  // ✅ Reset enemy position only when a NEW enemy spawns
  // (id changes) – not on every health update
  // BUT: Don't reset for world enemies (their position is set by auto-engage)
  useEffect(() => {
    if (!enemy) return;

    // World enemies have IDs like "floor1-pos37-5", room enemies don't
    const isWorldEnemy = typeof enemy.id === 'string' && enemy.id.startsWith('floor');
    if (isWorldEnemy) return; // Position already set by auto-engage

    enemyPosRef.current = {
      x: 600,
      y: 220,
    };
  }, [enemy?.id, floor]);

  // ---------- drawing helpers ----------

  // --- Modular drawing helpers ---
  const drawHead = (
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    equipped: Record<string, boolean>,
  ) => {
    ctx.fillStyle = '#fcd7b6'; // skin
    ctx.fillRect(x - 4, y - 18, 8, 8);
    // Helmet overlay
    if (equipped.helmet) {
      ctx.fillStyle = EQUIPMENT_VISUALS.helmet.color;
      ctx.fillRect(x - 4, y - 18, 8, 5);
    }
    // Hair
    ctx.fillStyle = '#7c4700';
    ctx.fillRect(x - 4, y - 18, 8, 4);
    // Eyes
    ctx.fillStyle = '#222';
    ctx.fillRect(x - 2, y - 15, 2, 2);
    ctx.fillRect(x + 1, y - 15, 2, 2);
    // Mouth
    ctx.fillStyle = '#a94442';
    ctx.fillRect(x - 1, y - 11, 2, 1);
  };

  const drawBody = (
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    isPlayer: boolean,
    equipped: Record<string, boolean>,
  ) => {
    const shirt = isPlayer ? '#4f46e5' : '#dc2626';
    ctx.fillStyle = shirt;
    ctx.fillRect(x - 4, y - 10, 8, 10);
    // Chest overlay
    if (equipped.chest) {
      ctx.fillStyle = EQUIPMENT_VISUALS.chest.color;
      ctx.fillRect(x - 4, y - 10, 8, 10);
    }
  };

  const drawArms = (
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    isPlayer: boolean,
    equipped: Record<string, boolean>,
  ) => {
    const shirt = isPlayer ? '#4f46e5' : '#dc2626';
    ctx.fillStyle = shirt;
    ctx.fillRect(x - 7, y - 10, 3, 9); // Left arm
    ctx.fillRect(x + 4, y - 10, 3, 9); // Right arm
    // Gloves overlay
    if (equipped.gloves) {
      ctx.fillStyle = EQUIPMENT_VISUALS.gloves.color;
      ctx.fillRect(x - 7, y - 1, 3, 3); // Left glove
      ctx.fillRect(x + 4, y - 1, 3, 3); // Right glove
    }
  };

  const drawLegs = (
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    equipped: Record<string, boolean>,
  ) => {
    ctx.fillStyle = '#22223b';
    ctx.fillRect(x - 4, y, 3, 8); // Left leg
    ctx.fillRect(x + 1, y, 3, 8); // Right leg
    // Legs overlay
    if (equipped.legs) {
      ctx.fillStyle = EQUIPMENT_VISUALS.legs.color;
      ctx.fillRect(x - 4, y, 3, 8);
      ctx.fillRect(x + 1, y, 3, 8);
    }
  };

  const drawBoots = (
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    equipped: Record<string, boolean>,
  ) => {
    if (equipped.boots) {
      ctx.fillStyle = EQUIPMENT_VISUALS.boots.color;
      ctx.fillRect(x - 4, y + 8, 3, 3);
      ctx.fillRect(x + 1, y + 8, 3, 3);
    } else {
      ctx.fillStyle = '#444444';
      ctx.fillRect(x - 4, y + 8, 3, 3);
      ctx.fillRect(x + 1, y + 8, 3, 3);
    }
  };

  const drawEquipmentOverlay = (
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    equipped: Record<string, boolean>,
  ) => {
    // Weapon (right hand)
    if (equipped.weapon) {
      ctx.fillStyle = EQUIPMENT_VISUALS.weapon.color;
      ctx.fillRect(x + 6, y - 2, 2, 12);
      ctx.fillStyle = '#f3f4f6';
      ctx.fillRect(x + 6, y - 2, 2, 3);
    }
    // Shield (left hand)
    if (equipped.shield) {
      ctx.fillStyle = EQUIPMENT_VISUALS.shield.color;
      ctx.beginPath();
      ctx.ellipse(x - 8, y - 2, 3, 6, 0, 0, 2 * Math.PI);
      ctx.fill();
    }
    // Add more overlays for amulet, ring, etc. as needed
  };

  const drawCharacter = (
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    isPlayer: boolean,
    equipped: Record<string, boolean>,
  ) => {
    drawEquipmentOverlay(ctx, x, y, equipped); // weapon/shield first
    drawHead(ctx, x, y, equipped);
    drawBody(ctx, x, y, isPlayer, equipped);
    drawArms(ctx, x, y, isPlayer, equipped);
    drawLegs(ctx, x, y, equipped);
    drawBoots(ctx, x, y, equipped);
  };

  type EnemyArchetype =
    | 'skeleton'
    | 'necromancer'
    | 'zombie'
    | 'brute'
    | 'spirit'
    | 'mimic'
    | 'shadow_beast'
    | 'generic';

  const getEnemyArchetype = (enemy: Enemy): EnemyArchetype => {
    const n = enemy.name.toLowerCase();
    if (n.includes('mimic')) return 'mimic';
    if (n.includes('shadow beast')) return 'shadow_beast';
    if (n.includes('skeleton')) return 'skeleton';
    if (n.includes('zombie') || n.includes('fallen')) return 'zombie';
    if (n.includes('necromancer') || n.includes('cultist')) return 'necromancer';
    if (n.includes('wraith') || n.includes('spirit')) return 'spirit';
    if (n.includes('demon') || n.includes('brute') || n.includes('warrior')) return 'brute';
    return 'generic';
  };

  const getEnemyVisual = (enemy: Enemy) => {
    const archetype = getEnemyArchetype(enemy);
    let auraColor = 'rgba(248, 250, 252, 0.35)';
    let accent = '#facc15';
    let coreColor = '#dc2626';
    switch (archetype) {
      case 'skeleton':
        coreColor = '#e5e7eb';
        accent = '#f9fafb';
        auraColor = 'rgba(249, 250, 251, 0.35)';
        break;
      case 'necromancer':
        coreColor = '#111827';
        accent = '#6366f1';
        auraColor = 'rgba(129, 140, 248, 0.4)';
        break;
      case 'zombie':
        coreColor = '#065f46';
        accent = '#bbf7d0';
        auraColor = 'rgba(16, 185, 129, 0.4)';
        break;
      case 'brute':
        coreColor = '#7f1d1d';
        accent = '#f97316';
        auraColor = 'rgba(248, 113, 113, 0.4)';
        break;
      case 'spirit':
        coreColor = '#0f172a';
        accent = '#a855f7';
        auraColor = 'rgba(129, 140, 248, 0.45)';
        break;
      case 'mimic':
        coreColor = '#8b5a2b';
        accent = '#fbbf24';
        auraColor = 'rgba(217, 119, 6, 0.4)';
        break;
      default:
        break;
    }

    // Rarity adjusts aura strength and sprite size slightly
    let size = 22;
    if (enemy.rarity === 'rare') size = 26;
    else if (enemy.rarity === 'elite') size = 30;
    else if (enemy.rarity === 'boss') size = 36;

    return { archetype, coreColor, accent, auraColor, size };
  };

  const drawEnemyBody = (
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    v: ReturnType<typeof getEnemyVisual>,
  ) => {
    const { archetype, coreColor, accent } = v;
    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,0.7)';
    ctx.shadowBlur = 10;
    ctx.shadowOffsetY = 4;

    switch (archetype) {
      case 'skeleton': {
        // Skull
        ctx.fillStyle = coreColor;
        ctx.fillRect(x - 6, y - 18, 12, 8);
        ctx.fillStyle = '#000000';
        ctx.fillRect(x - 4, y - 15, 3, 3);
        ctx.fillRect(x + 1, y - 15, 3, 3);
        // Ribcage
        ctx.fillStyle = coreColor;
        ctx.fillRect(x - 5, y - 10, 10, 8);
        ctx.fillStyle = '#111827';
        ctx.fillRect(x - 4, y - 8, 8, 1);
        ctx.fillRect(x - 4, y - 6, 8, 1);
        // Legs (bones)
        ctx.fillStyle = coreColor;
        ctx.fillRect(x - 3, y - 2, 3, 10);
        ctx.fillRect(x + 0, y - 2, 3, 10);
        break;
      }
      case 'necromancer': {
        // Robe body
        ctx.fillStyle = coreColor;
        ctx.fillRect(x - 7, y - 16, 14, 18);
        // Hooded head
        ctx.fillStyle = coreColor;
        ctx.fillRect(x - 6, y - 24, 12, 10);
        ctx.fillStyle = '#0b1120';
        ctx.fillRect(x - 4, y - 20, 8, 6);
        ctx.fillStyle = accent;
        ctx.fillRect(x - 2, y - 19, 4, 2); // eyes glow
        // Staff
        ctx.fillStyle = '#4b5563';
        ctx.fillRect(x + 7, y - 18, 2, 20);
        ctx.fillStyle = accent;
        ctx.beginPath();
        ctx.arc(x + 8, y - 20, 3, 0, Math.PI * 2);
        ctx.fill();
        break;
      }
      case 'zombie': {
        ctx.fillStyle = '#374151';
        ctx.fillRect(x - 6, y - 14, 12, 12); // torso
        ctx.fillStyle = '#047857';
        ctx.fillRect(x - 5, y - 22, 10, 8); // head
        ctx.fillStyle = '#000000';
        ctx.fillRect(x - 3, y - 19, 3, 2);
        ctx.fillRect(x + 1, y - 18, 2, 2);
        ctx.fillStyle = '#4b5563';
        ctx.fillRect(x - 8, y - 12, 4, 9);
        ctx.fillRect(x + 4, y - 10, 4, 9);
        break;
      }
      case 'brute': {
        ctx.fillStyle = coreColor;
        ctx.fillRect(x - 9, y - 16, 18, 18);
        ctx.fillStyle = '#b45309';
        ctx.fillRect(x - 9, y - 10, 18, 4); // belt
        ctx.fillStyle = '#fecaca';
        ctx.fillRect(x - 6, y - 22, 12, 8); // head
        ctx.fillStyle = '#000000';
        ctx.fillRect(x - 3, y - 19, 3, 2);
        ctx.fillRect(x + 1, y - 19, 3, 2);
        // Shoulder plates
        ctx.fillStyle = accent;
        ctx.fillRect(x - 11, y - 16, 4, 6);
        ctx.fillRect(x + 7, y - 16, 4, 6);
        break;
      }
      case 'spirit': {
        ctx.fillStyle = coreColor;
        ctx.beginPath();
        ctx.ellipse(x, y - 10, 10, 14, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = accent;
        ctx.fillRect(x - 3, y - 14, 2, 3);
        ctx.fillRect(x + 1, y - 14, 2, 3);
        ctx.fillStyle = 'rgba(15,23,42,0.9)';
        ctx.beginPath();
        ctx.moveTo(x - 8, y);
        ctx.quadraticCurveTo(x, y + 8, x + 8, y);
        ctx.lineTo(x + 4, y + 10);
        ctx.quadraticCurveTo(x, y + 14, x - 4, y + 10);
        ctx.closePath();
        ctx.fill();
        break;
      }
      case 'mimic': {
        ctx.fillStyle = coreColor;
        ctx.fillRect(x - 10, y - 10, 20, 16);
        ctx.fillStyle = '#7c2d12';
        ctx.fillRect(x - 10, y - 10, 20, 4);
        ctx.fillStyle = accent;
        ctx.fillRect(x - 3, y - 4, 6, 3); // latch
        ctx.fillStyle = '#000000';
        ctx.fillRect(x - 5, y - 6, 4, 2);
        ctx.fillRect(x + 1, y - 6, 4, 2);
        break;
      }
      case 'shadow_beast': {
        // Hunched dark brute silhouette: low, wide body with small head and long arms
        ctx.fillStyle = coreColor;
        // Torso / bulk
        ctx.fillRect(x - 10, y - 10, 20, 14);
        // Hunched back
        ctx.fillRect(x - 8, y - 18, 16, 8);
        // Small head tucked forward
        ctx.fillStyle = '#111827';
        ctx.fillRect(x - 4, y - 20, 8, 5);
        ctx.fillStyle = accent;
        ctx.fillRect(x - 2, y - 19, 3, 2);
        ctx.fillRect(x + 0, y - 18, 3, 2);
        // Long arms reaching down
        ctx.fillStyle = coreColor;
        ctx.fillRect(x - 12, y - 8, 4, 14);
        ctx.fillRect(x + 8, y - 8, 4, 14);
        // Clawed hands
        ctx.fillStyle = accent;
        ctx.fillRect(x - 13, y + 5, 6, 3);
        ctx.fillRect(x + 7, y + 5, 6, 3);
        break;
      }
      default: {
        ctx.fillStyle = coreColor;
        ctx.beginPath();
        ctx.arc(x, y - 6, 10, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = accent;
        ctx.fillRect(x - 2, y - 10, 4, 3);
        break;
      }
    }

    ctx.restore();
  };

  const drawEnemy = (
    ctx: CanvasRenderingContext2D,
    enemy: Enemy,
    x: number,
    y: number,
    time: number,
  ) => {
    const v = getEnemyVisual(enemy);
    // Pulsing aura
    const pulse = (Math.sin(time / 500) + 1) / 2; // 0..1
    const auraRadius = v.size + 18 + pulse * 6;
    ctx.save();
    ctx.beginPath();
    ctx.arc(x, y, auraRadius, 0, Math.PI * 2);
    ctx.fillStyle = v.auraColor.replace(/0\.\d+\)/, `${(0.18 + pulse * 0.4).toFixed(2)})`);
    ctx.fill();
    ctx.restore();

    // Archetype-specific small sprite inside the aura
    drawEnemyBody(ctx, x, y, v);

    // Accent ring
    ctx.beginPath();
    ctx.strokeStyle = v.accent;
    ctx.lineWidth = 3;
    ctx.arc(x, y, v.size + 4, 0, Math.PI * 2);
    ctx.stroke();
  };

  // Torch drawing helper removed

  // Ambient dungeon props
  const drawGrassPatch = (ctx: CanvasRenderingContext2D, x: number, y: number) => {
    ctx.save();
    ctx.fillStyle = '#16a34a';
    ctx.beginPath();
    ctx.ellipse(x, y, 10, 4, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#22c55e';
    ctx.beginPath();
    ctx.ellipse(x + 6, y - 2, 7, 3, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  };

  const drawTree = (ctx: CanvasRenderingContext2D, x: number, y: number) => {
    ctx.save();
    // Trunk
    ctx.fillStyle = '#78350f';
    ctx.fillRect(x - 3, y, 6, 16);
    // Canopy
    ctx.fillStyle = '#166534';
    ctx.beginPath();
    ctx.arc(x, y - 4, 11, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#22c55e';
    ctx.beginPath();
    ctx.arc(x - 4, y - 6, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  };

  const drawRockProp = (ctx: CanvasRenderingContext2D, x: number, y: number) => {
    ctx.save();
    ctx.fillStyle = '#4b5563';
    ctx.beginPath();
    ctx.moveTo(x - 8, y);
    ctx.lineTo(x, y - 6);
    ctx.lineTo(x + 9, y);
    ctx.lineTo(x + 4, y + 5);
    ctx.lineTo(x - 5, y + 4);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#9ca3af';
    ctx.beginPath();
    ctx.moveTo(x - 2, y - 3);
    ctx.lineTo(x + 3, y - 1);
    ctx.lineTo(x, y + 1);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  };

  const drawTorch = (ctx: CanvasRenderingContext2D, x: number, y: number, time: number) => {
    ctx.save();
    // Bracket
    ctx.fillStyle = '#4b5563';
    ctx.fillRect(x - 2, y + 4, 4, 10);

    // Flickering flame with glow
    const flicker = (Math.sin(time / 120 + x * 0.3) + 1) / 2; // 0..1
    const radiusY = 7 + flicker * 2;
    ctx.shadowColor = 'rgba(252, 211, 77, 0.95)';
    ctx.shadowBlur = 20 + flicker * 6;
    ctx.fillStyle = '#fde68a';
    ctx.beginPath();
    ctx.ellipse(x, y, 4, radiusY, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  };

  // (Removed legacy character HUD drawing; handled in main UI panels.)

  // ---------- Render loop ----------

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;

    const render = () => {
      const playerPos = playerPosRef.current;
      const enemyPos = enemyPosRef.current;
      const enemy = enemyRef.current;
      const currentFloor = floorRef.current;
      const nowTime = Date.now();

      // Update camera to center on player (clamped to dungeon grid bounds)
      const cameraGrid = dungeonGridRef.current;
      const worldWidthPx = cameraGrid && cameraGrid[0]
        ? cameraGrid[0].length * TILE_SIZE
        : WORLD_WIDTH;
      const worldHeightPx = cameraGrid ? cameraGrid.length * TILE_SIZE : WORLD_HEIGHT;

      const camX = Math.max(
        0,
        Math.min(worldWidthPx - CANVAS_WIDTH, playerPos.x - CANVAS_WIDTH / 2),
      );
      const camY = Math.max(
        0,
        Math.min(worldHeightPx - CANVAS_HEIGHT, playerPos.y - CANVAS_HEIGHT / 2),
      );
      cameraRef.current = { x: camX, y: camY };

      // Background themed
      const theme = getFloorTheme(currentFloor);
      ctx.fillStyle = theme.bg;
      ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

      // ---- Central ritual chamber (carpet + altar) in world space ----
      const centerX = WORLD_WIDTH / 2;
      const centerY = WORLD_HEIGHT / 2;
      const rugWidth = 520;
      const rugHeight = 360;
      const rugX = centerX - rugWidth / 2;
      const rugY = centerY - rugHeight / 2;

      // Convert center chamber to screen space once per frame
      const rugScreenX = rugX - camX;
      const rugScreenY = rugY - camY;

      // Dark stone platform under rug
      ctx.fillStyle = '#020617';
      ctx.fillRect(rugScreenX - 40, rugScreenY - 40, rugWidth + 80, rugHeight + 80);

      // Outer border stones for chamber (chunky walls)
      ctx.strokeStyle = '#020617';
      ctx.lineWidth = 10;
      ctx.strokeRect(rugScreenX - 42, rugScreenY - 42, rugWidth + 84, rugHeight + 84);

      // Main carpet body
      ctx.fillStyle = '#7f1d1d';
      ctx.fillRect(rugScreenX, rugScreenY, rugWidth, rugHeight);

      // Inner glowing border
      ctx.strokeStyle = '#f97316';
      ctx.lineWidth = 6;
      ctx.strokeRect(rugScreenX + 12, rugScreenY + 12, rugWidth - 24, rugHeight - 24);

      // Subtle cross pattern on rug
      ctx.strokeStyle = 'rgba(248, 250, 252, 0.12)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(rugScreenX + rugWidth / 2, rugScreenY + 18);
      ctx.lineTo(rugScreenX + rugWidth / 2, rugScreenY + rugHeight - 18);
      ctx.moveTo(rugScreenX + 18, rugScreenY + rugHeight / 2);
      ctx.lineTo(rugScreenX + rugWidth - 18, rugScreenY + rugHeight / 2);
      ctx.stroke();

      // Altar block at top of rug
      const altarWidth = 180;
      const altarHeight = 80;
      const altarX = rugScreenX + rugWidth / 2 - altarWidth / 2;
      const altarY = rugScreenY + 38;
      ctx.fillStyle = '#111827';
      ctx.fillRect(altarX, altarY, altarWidth, altarHeight);
      ctx.strokeStyle = '#9ca3af';
      ctx.lineWidth = 3;
      ctx.strokeRect(altarX, altarY, altarWidth, altarHeight);

      // Small glowing circle on altar center (summoning focus)
      ctx.save();
      ctx.shadowColor = 'rgba(248, 250, 252, 0.55)';
      ctx.shadowBlur = 18;
      ctx.fillStyle = '#facc15';
      ctx.beginPath();
      ctx.arc(altarX + altarWidth / 2, altarY + altarHeight / 2, 14, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      // Side statues flanking the altar
      const statueOffsetX = 140;
      const statueY = altarY + altarHeight + 24;
      const drawStatue = (sx: number) => {
        ctx.save();
        ctx.fillStyle = '#4b5563';
        ctx.fillRect(sx - 10, statueY - 52, 20, 40);
        ctx.fillRect(sx - 7, statueY - 70, 14, 18); // head
        ctx.fillStyle = '#9ca3af';
        ctx.fillRect(sx - 3, statueY - 65, 6, 3); // eyes glow
        ctx.restore();
      };
      drawStatue(rugScreenX + rugWidth / 2 - statueOffsetX);
      drawStatue(rugScreenX + rugWidth / 2 + statueOffsetX);

      // Bone piles at bottom corners
      const drawBones = (bx: number, by: number) => {
        ctx.save();
        ctx.strokeStyle = 'rgba(249, 250, 251, 0.9)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(bx - 10, by);
        ctx.lineTo(bx + 10, by + 4);
        ctx.moveTo(bx - 11, by + 5);
        ctx.lineTo(bx + 9, by + 1);
        ctx.stroke();
        ctx.restore();
      };
      drawBones(rugScreenX + 40, rugScreenY + rugHeight - 36);
      drawBones(rugScreenX + rugWidth - 40, rugScreenY + rugHeight - 48);

      // Draw dungeon grid from atlas if loaded
      const grid = dungeonGridRef.current;
      const tilesetImage = tilesetImageRef.current;
      if (grid && tilesetImage) {
        drawDungeon(ctx, tilesetImage, grid, camX, camY);
      }

      // Deterministic pseudo-random per tile for ambient props over rug area
      const cols = grid ? grid[0]?.length ?? 0 : 0;
      const rows = grid ? grid.length : 0;
      const startCol = Math.max(0, Math.floor(camX / TILE_SIZE) - 1);
      const endCol = Math.min(cols, Math.ceil((camX + CANVAS_WIDTH) / TILE_SIZE) + 1);
      const startRow = Math.max(0, Math.floor(camY / TILE_SIZE) - 1);
      const endRow = Math.min(rows, Math.ceil((camY + CANVAS_HEIGHT) / TILE_SIZE) + 1);
      for (let r = startRow; r < endRow; r++) {
        for (let c = startCol; c < endCol; c++) {
          const worldX = c * TILE_SIZE;
          const worldY = r * TILE_SIZE;
          const screenX = worldX - camX;
          const screenY = worldY - camY;

          const seed = floorRef.current * 73856093 ^ (r * 19349663) ^ (c * 83492791);
          const pr = Math.abs(Math.sin(seed)) % 1;

          if (theme.name === 'jungle') {
            if (pr < 0.04) {
              drawTree(ctx, screenX + 36, screenY + 18);
            } else if (pr < 0.12) {
              drawGrassPatch(ctx, screenX + 30, screenY + 60);
            } else if (pr < 0.16) {
              drawRockProp(ctx, screenX + 40, screenY + 58);
            }
          } else if (theme.name === 'lava') {
            if (pr < 0.08) {
              drawRockProp(ctx, screenX + 40, screenY + 56);
            }
          } else if (theme.name === 'ice') {
            if (pr < 0.06) {
              drawRockProp(ctx, screenX + 38, screenY + 55);
            }
          } else {
            // Classic dungeon: sparse rocks and occasional mossy patch
            if (pr < 0.08) {
              drawRockProp(ctx, screenX + 38, screenY + 58);
            } else if (pr < 0.11) {
              drawGrassPatch(ctx, screenX + 28, screenY + 62);
            }
          }

          // Wall torches along some upper tiles to avoid UI overlap
          if (r <= startRow + 1 && pr > 0.65 && pr < 0.75) {
            const torchWorldX = worldX + 30;
            const torchWorldY = worldY - 10;
            const tx = torchWorldX - camX;
            const ty = torchWorldY - camY;
            if (ty > 40 && ty < CANVAS_HEIGHT - 80) {
              drawTorch(ctx, tx, ty, nowTime);
            }
          }
        }
      }

      // Draw world enemies as markers when not engaged
      if (!enemy && enemiesInWorld && enemiesInWorld.length > 0) {
        // Filter out killed enemies and currently engaged enemy using ref for immediate updates
        const killedSet = killedWorldEnemiesRef?.current.get(floor) || new Set<string>();
        const visibleEnemies = enemiesInWorld.filter(
          (e: Enemy & { id: string; x: number; y: number }) =>
            !killedSet.has(e.id) && e.id !== currentlyEngagedIdRef.current,
        );

        if (killedEnemyIds.size > 0) {
          console.log(
            `[Render] Total enemies: ${enemiesInWorld.length}, Killed: ${killedEnemyIds.size}, Visible: ${visibleEnemies.length}, KilledIds: ${Array.from(killedEnemyIds).join(', ')}`,
          );
        }

        // Track if we've engaged an enemy this frame
        let engagedThisFrame = false;

        for (const ew of visibleEnemies) {
          if (engagedThisFrame) break; // Only engage one enemy per frame

          const sx = ew.x - camX;
          const sy = ew.y - camY;
          if (sx < -50 || sy < -50 || sx > CANVAS_WIDTH + 50 || sy > CANVAS_HEIGHT + 50) continue;

          // Use same archetype-driven sprite as combat, but slightly smaller and without aura
          const markerEnemy = { ...ew, health: Math.max(1, ew.health) } as Enemy;
          const vMarker = getEnemyVisual(markerEnemy);
          ctx.save();
          // Light shadow so it still pops off the floor
          ctx.shadowColor = 'rgba(0,0,0,0.45)';
          ctx.shadowBlur = 6;
          ctx.shadowOffsetY = 3;
          // Draw the full pixel-art body at a reduced Y so feet sit on tile
          drawEnemyBody(ctx, sx, sy, vMarker);
          ctx.restore();
          ctx.font = '10px Arial';
          ctx.fillStyle = theme.hudAccent;
          ctx.textAlign = 'center';
          ctx.fillText(ew.name, sx, sy - 16);
          // Auto-engage if close (only after initial floor spawn is complete)
          if (!hasSpawnedThisFloorRef.current) continue; // Wait for floor to fully load
          // Don't engage if already in combat or if this specific enemy is already engaged
          if (currentlyEngagedIdRef.current !== null) continue;
          const dx = playerPos.x - ew.x;
          const dy = playerPos.y - ew.y;
          const d = Math.sqrt(dx * dx + dy * dy);
          if (d < 140) {
            console.log(`[AutoEngage] Attempting to engage ${ew.id} at distance ${d.toFixed(0)}px`);
            // Set enemy position to world enemy position for combat
            enemyPosRef.current = { x: ew.x, y: ew.y };
            currentlyEngagedIdRef.current = ew.id; // Mark as engaged immediately
            onEngageEnemy(ew.id);
            engagedThisFrame = true; // Prevent engaging multiple enemies
            break; // Exit the loop immediately
          }
        }
      }

      // Draw entry (non-interactive) and exit (interactive) ladders
      const drawLadder = (
        worldPos: { x: number; y: number } | null,
        label: string,
        interactive: boolean,
      ) => {
        if (!worldPos) return;
        const lx = worldPos.x - camX;
        const ly = worldPos.y - camY;
        ctx.fillStyle = interactive ? '#065f46' : '#374151';
        ctx.fillRect(lx - 8, ly - 20, 16, 40);
        ctx.strokeStyle = theme.hudAccent;
        ctx.lineWidth = 2;
        ctx.strokeRect(lx - 8, ly - 20, 16, 40);
        ctx.font = '11px Arial';
        ctx.fillStyle = theme.hudAccent;
        ctx.textAlign = 'center';
        ctx.fillText(label, lx, ly - 28);
        if (!interactive) return;
        const dxL = playerPos.x - worldPos.x;
        const dyL = playerPos.y - worldPos.y;
        const dL = Math.sqrt(dxL * dxL + dyL * dyL);
        if (dL < 160) ladderDiscoveredRef.current = true;
        if (dL < 140) {
          ctx.font = 'bold 14px Arial';
          ctx.fillStyle = theme.hudAccent;
          ctx.fillText('Press E to descend', lx, ly + 40);
        }
        const offscreen = lx < 0 || ly < 0 || lx > CANVAS_WIDTH || ly > CANVAS_HEIGHT;
        if (offscreen && ladderDiscoveredRef.current) {
          const centerX = CANVAS_WIDTH / 2;
          const centerY = CANVAS_HEIGHT / 2;
          const dirX = lx - centerX;
          const dirY = ly - centerY;
          const len = Math.max(1, Math.sqrt(dirX * dirX + dirY * dirY));
          const nx = dirX / len;
          const ny = dirY / len;
          let ax = centerX + nx * (Math.min(CANVAS_WIDTH, CANVAS_HEIGHT) / 2 - 30);
          let ay = centerY + ny * (Math.min(CANVAS_WIDTH, CANVAS_HEIGHT) / 2 - 30);
          ax = Math.max(20, Math.min(CANVAS_WIDTH - 20, ax));
          ay = Math.max(20, Math.min(CANVAS_HEIGHT - 20, ay));
          ctx.fillStyle = theme.hudAccent;
          ctx.save();
          ctx.translate(ax, ay);
          const angle = Math.atan2(dirY, dirX);
          ctx.rotate(angle);
          ctx.beginPath();
          ctx.moveTo(0, 0);
          ctx.lineTo(-12, 6);
          ctx.lineTo(-12, -6);
          ctx.closePath();
          ctx.fill();
          ctx.restore();
        }
      };
      drawLadder(entryLadderPos, 'Entry', false);
      drawLadder(exitLadderPos, 'Ladder', true);

      // Draw Town Gate (interactive)
      const drawTownGate = (worldPos: { x: number; y: number }) => {
        const gx = worldPos.x - camX;
        const gy = worldPos.y - camY;
        ctx.fillStyle = '#1f2937';
        ctx.fillRect(gx - 14, gy - 28, 28, 56);
        ctx.strokeStyle = theme.hudAccent;
        ctx.lineWidth = 2;
        ctx.strokeRect(gx - 14, gy - 28, 28, 56);
        // Arch
        ctx.beginPath();
        ctx.arc(gx, gy - 28, 14, Math.PI, 0);
        ctx.stroke();
        // Label
        ctx.font = '11px Arial';
        ctx.fillStyle = theme.hudAccent;
        ctx.textAlign = 'center';
        ctx.fillText('Town', gx, gy - 38);
        // Hint when close
        const dx = playerPos.x - worldPos.x;
        const dy = playerPos.y - worldPos.y;
        const d = Math.sqrt(dx * dx + dy * dy);
        if (d < 150) {
          ctx.font = 'bold 14px Arial';
          ctx.fillStyle = theme.hudAccent;
          ctx.fillText('Press E or T to return', gx, gy + 40);
        }
      };
      drawTownGate(TOWN_GATE_POS);

      // Player (apply camera offset)
      const equippedMap: Record<string, boolean> = {};
      if (character) {
        for (const slot of Object.keys(EQUIPMENT_VISUALS)) {
          equippedMap[slot] = items.some((i) => {
            if (!i.equipped) return false;
            const slotMapping =
              i.type in ITEM_TYPE_TO_SLOT
                ? ITEM_TYPE_TO_SLOT[i.type as keyof typeof ITEM_TYPE_TO_SLOT]
                : undefined;
            return slotMapping === slot || i.type === (slot as any);
          });
        }
      }
      drawCharacter(ctx, playerPos.x - camX, playerPos.y - camY, true, equippedMap);

      // Enemy + health bar
      if (enemy && enemy.health > 0) {
        const ex = enemyPos.x - camX;
        // Idle bob animation (safe seed even if id missing)
        const seed = typeof enemy.id === 'string' ? enemy.id.length : enemy.name?.length || 0;
        const bob = Math.sin(nowTime / 450 + seed) * 8;
        const ey = enemyPos.y - camY + bob;

        // Always draw procedural fallback first (sprites are 404 right now)
        drawEnemy(ctx, enemy, ex, ey, nowTime);

        // Optionally try sprite overlay if available (currently disabled due to missing assets)
        // const sprite = getCachedEnemySprite(enemy);
        // if (sprite && sprite.complete && sprite.naturalWidth > 0) {
        //   const baseSize = 64;
        //   ctx.save();
        //   ctx.shadowColor = 'rgba(0,0,0,0.6)';
        //   ctx.shadowBlur = 12;
        //   ctx.drawImage(sprite, ex - baseSize / 2, ey - baseSize / 2, baseSize, baseSize);
        //   ctx.restore();
        // } else {
        //   ensureEnemySprite(enemy).then(() => { /* next frame will use sprite */ });
        // }

        ctx.font = 'bold 18px Arial';
        let rarityColor = '#ef4444';
        if (enemy.rarity === 'rare') rarityColor = '#3b82f6';
        else if (enemy.rarity === 'elite') rarityColor = '#f59e0b';
        else if (enemy.rarity === 'boss') rarityColor = '#a855f7';

        ctx.fillStyle = rarityColor;
        ctx.textAlign = 'center';
        ctx.fillText(enemy.name, enemyPos.x - camX, enemyPos.y - camY - 60 + bob);

        const healthPercent = (enemy.health / enemy.max_health) * 100;
        ctx.fillStyle = '#1f2937';
        ctx.fillRect(enemyPos.x - camX - 60, enemyPos.y - camY - 35 + bob, 120, 10);
        ctx.fillStyle = healthPercent > 30 ? '#22c55e' : '#ef4444';
        ctx.fillRect(
          enemyPos.x - camX - 60,
          enemyPos.y - camY - 35 + bob,
          (healthPercent / 100) * 120,
          10,
        );
        ctx.strokeStyle = '#fbbf24';
        ctx.lineWidth = 2;
        ctx.strokeRect(enemyPos.x - camX - 60, enemyPos.y - camY - 35 + bob, 120, 10);

        const distX = playerPos.x - enemyPos.x;
        const distY = playerPos.y - enemyPos.y;
        const distance = Math.sqrt(distX * distX + distY * distY);

        ctx.font = '12px Arial';
        ctx.fillStyle = distance < 100 ? '#fbbf24' : '#999999';
        ctx.textAlign = 'center';
        ctx.fillText(
          `[SPACE to attack] (Distance: ${Math.round(distance)}px)`,
          CANVAS_WIDTH / 2,
          30,
        );
      }

      // HUD text
      ctx.font = 'bold 16px Arial';
      ctx.fillStyle = theme.hudAccent;
      ctx.textAlign = 'left';
      ctx.fillText(`Floor ${currentFloor}`, 20, 30);

      ctx.fillStyle = 'rgba(200,200,200,0.8)';
      ctx.font = '12px Arial';
      ctx.fillText('Use Arrow Keys to move across the world', 20, 60);

      // Draw character HUD (HP, Mana, EXP)
      // Draw simplified action area: Heat bar + cooldown bar grouped at bottom center
      const padding = 18;
      const barHeight = 12;
      const heatPercent = Math.max(0, Math.min(100, zoneHeatRef.current || 0));
      const groupWidth = 300;
      const groupX = Math.round(CANVAS_WIDTH / 2 - groupWidth / 2);
      const groupY = CANVAS_HEIGHT - padding - barHeight * 2 - 28; // allow space for two bars + label
      // Background panel
      ctx.fillStyle = 'rgba(0,0,0,0.55)';
      ctx.fillRect(groupX - 10, groupY - 10, groupWidth + 20, barHeight * 2 + 40);
      ctx.strokeStyle = theme.hudAccent;
      ctx.lineWidth = 1;
      ctx.strokeRect(groupX - 10, groupY - 10, groupWidth + 20, barHeight * 2 + 40);
      ctx.font = '12px Arial';
      ctx.fillStyle = '#ffffff';
      ctx.textAlign = 'center';
      ctx.fillText('Action', groupX + groupWidth / 2, groupY + 2);
      // Heat bar
      const heatY = groupY + 14;
      ctx.fillStyle = '#1f2937';
      ctx.fillRect(groupX, heatY, groupWidth, barHeight);
      ctx.fillStyle = '#ff6b6b';
      ctx.fillRect(groupX, heatY, (heatPercent / 100) * groupWidth, barHeight);
      ctx.font = '10px Arial';
      ctx.fillStyle = '#ffffff';
      ctx.textAlign = 'center';
      ctx.fillText(
        `Heat ${Math.round(heatPercent)}%`,
        groupX + groupWidth / 2,
        heatY + barHeight - 2,
      );
      // Cooldown bar
      const now = Date.now();
      const remaining = Math.max(0, nextAttackTimeRef.current - now);
      const percent = remaining / ATTACK_COOLDOWN_MS;
      const cdY = heatY + barHeight + 10;
      ctx.fillStyle = '#1f2937';
      ctx.fillRect(groupX, cdY, groupWidth, barHeight);
      ctx.fillStyle = '#60a5fa';
      ctx.fillRect(groupX, cdY, groupWidth * (1 - percent), barHeight);
      ctx.font = '10px Arial';
      ctx.fillStyle = '#ffffff';
      ctx.textAlign = 'center';
      ctx.fillText(
        remaining > 0 ? 'Cooling...' : 'Ready',
        groupX + groupWidth / 2,
        cdY + barHeight - 2,
      );
      // Attack hint
      ctx.font = '11px Arial';
      ctx.fillStyle = theme.hudAccent;
      ctx.fillText('Press SPACE in range to attack', groupX + groupWidth / 2, cdY + barHeight + 16);

      // Minimap overlay: world bounds, viewport, player (toggleable)
      if (minimapEnabledRef.current) {
        const miniW = 200;
        const miniH = 150;
        const miniX = CANVAS_WIDTH - miniW - 20;
        const miniY = 20;
        // Panel background
        ctx.fillStyle = theme.minimapPanel;
        ctx.fillRect(miniX - 6, miniY - 6, miniW + 12, miniH + 12);
        ctx.strokeStyle = theme.minimapViewport;
        ctx.lineWidth = 1;
        ctx.strokeRect(miniX - 6, miniY - 6, miniW + 12, miniH + 12);
        // World area
        ctx.fillStyle = theme.minimapWorld;
        ctx.fillRect(miniX, miniY, miniW, miniH);
        ctx.strokeStyle = '#334155';
        ctx.strokeRect(miniX, miniY, miniW, miniH);
        // Viewport rectangle based on camera
        const vpW = (CANVAS_WIDTH / WORLD_WIDTH) * miniW;
        const vpH = (CANVAS_HEIGHT / WORLD_HEIGHT) * miniH;
        const vpX = miniX + (cameraRef.current.x / WORLD_WIDTH) * miniW;
        const vpY = miniY + (cameraRef.current.y / WORLD_HEIGHT) * miniH;
        ctx.strokeStyle = theme.minimapViewport;
        ctx.lineWidth = 2;
        ctx.strokeRect(vpX, vpY, vpW, vpH);
        // Player dot
        const pMiniX = miniX + (playerPos.x / WORLD_WIDTH) * miniW;
        const pMiniY = miniY + (playerPos.y / WORLD_HEIGHT) * miniH;
        ctx.fillStyle = theme.player;
        ctx.beginPath();
        ctx.arc(pMiniX, pMiniY, 3, 0, Math.PI * 2);
        ctx.fill();
        // Town Gate marker
        const tMiniX = miniX + (TOWN_GATE_POS.x / WORLD_WIDTH) * miniW;
        const tMiniY = miniY + (TOWN_GATE_POS.y / WORLD_HEIGHT) * miniH;
        ctx.fillStyle = '#f59e0b';
        ctx.beginPath();
        ctx.arc(tMiniX, tMiniY, 3, 0, Math.PI * 2);
        ctx.fill();
        // Ladder icon only if discovered
        if (exitLadderPos && ladderDiscoveredRef.current) {
          const lMiniX = miniX + (exitLadderPos.x / WORLD_WIDTH) * miniW;
          const lMiniY = miniY + (exitLadderPos.y / WORLD_HEIGHT) * miniH;
          ctx.fillStyle = theme.hudAccent;
          ctx.beginPath();
          ctx.arc(lMiniX, lMiniY, 3, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // Draw damage numbers (crits larger + different color)
      const currentTime = Date.now();
      damageNumbersRef.current.forEach((dmg: DamageNumber) => {
        const age = currentTime - dmg.createdAt;
        const progress = age / 1500; // 1500ms total duration
        const opacity = Math.max(0, 1 - progress);
        const yOffset = progress * 50; // Move up over time

        const isCrit = !!dmg.isCrit;
        const fontSize = isCrit ? 30 : 22;
        const color = isCrit
          ? `rgba(255, 215, 0, ${opacity})` // gold for crits
          : `rgba(255, 100, 100, ${opacity})`;

        ctx.font = `bold ${fontSize}px Arial`;
        ctx.fillStyle = color;
        ctx.textAlign = 'center';
        ctx.shadowColor = `rgba(0, 0, 0, ${opacity * 0.8})`;
        ctx.shadowBlur = isCrit ? 14 : 10;
        ctx.shadowOffsetY = 3;

        // Convert world-space damage positions to screen-space using camera
        ctx.fillText(`-${dmg.damage}`, dmg.x - camX, dmg.y - camY - yOffset);
        ctx.shadowColor = 'transparent';
      });

      // (Removed legacy separate cooldown bar; unified in action panel.)

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  // Preload enemy rarity sprites when floor changes or new world enemies appear
  useEffect(() => {
    const rarities = new Set<string>();
    enemiesInWorld?.forEach((e: Enemy & { id: string; x: number; y: number }) =>
      rarities.add(/mimic/i.test(e.name) ? 'mimic' : e.rarity),
    );
    // Always include core rarities to smooth first encounters
    ['common', 'rare', 'elite', 'boss', 'mimic'].forEach((r) => rarities.add(r));
    preloadEnemySprites(Array.from(rarities));
  }, [floor, enemiesInWorld]);

  // ---------- Player movement loop ----------

  useEffect(() => {
    let animationFrameId: number;

    const movePlayer = () => {
      const prev = playerPosRef.current;
      let newX = prev.x;
      let newY = prev.y;

      const keys = keysPressed.current;

      if (keys['ArrowUp'] || keys['w'] || keys['W']) {
        newY = prev.y - MOVE_SPEED;
      }
      if (keys['ArrowDown'] || keys['s'] || keys['S']) {
        newY = prev.y + MOVE_SPEED;
      }
      if (keys['ArrowLeft'] || keys['a'] || keys['A']) {
        newX = prev.x - MOVE_SPEED;
      }
      if (keys['ArrowRight'] || keys['d'] || keys['D']) {
        newX = prev.x + MOVE_SPEED;
      }

      // Coarse tile-based collision using a virtual grid that matches the
      // old 4000x3000 world. This keeps most of the space walkable while
      // still respecting obvious walls, pits, and water.
      const grid = dungeonGridRef.current;
      if (grid) {
        const worldWidthPx = grid[0].length * TILE_SIZE;
        const worldHeightPx = grid.length * TILE_SIZE;

        // Sample collision at the player's "feet" (bottom-center of sprite)
        const PLAYER_WIDTH = 32;
        const PLAYER_HEIGHT = 48;
        const collisionX = newX + PLAYER_WIDTH / 2;
        const collisionY = newY + PLAYER_HEIGHT;

        const tileX = Math.floor(collisionX / TILE_SIZE);
        const tileY = Math.floor(collisionY / TILE_SIZE);

        // Clamp against dungeon bounds and apply collision
        if (
          collisionX < 0 ||
          collisionY < 0 ||
          collisionX >= worldWidthPx ||
          collisionY >= worldHeightPx ||
          !canMoveTo(grid, tileX, tileY)
        ) {
          newX = prev.x;
          newY = prev.y;
        }
      }

      playerPosRef.current = { x: newX, y: newY };

      animationFrameId = requestAnimationFrame(movePlayer);
    };

    animationFrameId = requestAnimationFrame(movePlayer);

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  // ---------- Enemy chase loop ----------

  useEffect(() => {
    let frameId: number;

    const updateEnemy = () => {
      const enemy = enemyRef.current;
      if (!enemy || enemy.health <= 0) {
        frameId = requestAnimationFrame(updateEnemy);
        return;
      }

      const playerPos = playerPosRef.current;
      const enemyPos = enemyPosRef.current;

      const dx = playerPos.x - enemyPos.x;
      const dy = playerPos.y - enemyPos.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      // Move toward player if within chase range and not already overlapping
      if (distance > MIN_PLAYER_ENEMY_DISTANCE && distance < MAX_CHASE_DISTANCE) {
        const nx = dx / distance;
        const ny = dy / distance;

        enemyPosRef.current = {
          x: enemyPos.x + nx * ENEMY_SPEED,
          y: enemyPos.y + ny * ENEMY_SPEED,
        };
      }

      frameId = requestAnimationFrame(updateEnemy);
    };

    frameId = requestAnimationFrame(updateEnemy);

    return () => {
      cancelAnimationFrame(frameId);
    };
  }, []);

  // ---------- Keyboard handlers ----------
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Track movement keys
      keysPressed.current[e.key] = true;

      // Handle attacks separately
      if (e.code === 'Space') {
        // ❗ Ignore key-repeat when holding Space
        if (e.repeat) return;

        const now = Date.now();
        // Only attack if cooldown has elapsed
        if (now < nextAttackTimeRef.current) return;

        e.preventDefault();

        const enemy = enemyRef.current;
        if (!enemy || enemy.health <= 0) return;

        const playerPos = playerPosRef.current;
        const enemyPos = enemyPosRef.current;

        const distX = playerPos.x - enemyPos.x;
        const distY = playerPos.y - enemyPos.y;
        const distance = Math.sqrt(distX * distX + distY * distY);

        // Only attack if you're actually in melee range
        if (distance < ATTACK_RANGE) {
          nextAttackTimeRef.current = now + ATTACK_COOLDOWN_MS;
          onAttackRef.current();
        }

        // Don’t do anything else for Space
        return;
      }

      // Toggle minimap with 'm' or 'M'
      if (e.key === 'm' || e.key === 'M') {
        minimapEnabledRef.current = !minimapEnabledRef.current;
        return;
      }

      // Descend ladder with 'E' when near EXIT ladder only (not entry)
      if (e.key === 'e' || e.key === 'E') {
        const playerPos = playerPosRef.current;
        // First: if near Town Gate, return to town
        {
          const dxT = playerPos.x - TOWN_GATE_POS.x;
          const dyT = playerPos.y - TOWN_GATE_POS.y;
          const dT = Math.sqrt(dxT * dxT + dyT * dyT);
          if (dT < 140) {
            const evt = new CustomEvent('return-to-town');
            window.dispatchEvent(evt);
            return;
          }
        }
        if (exitLadderPos) {
          const dxL = playerPos.x - exitLadderPos.x;
          const dyL = playerPos.y - exitLadderPos.y;
          const dL = Math.sqrt(dxL * dxL + dyL * dyL);
          // Only descend if near exit ladder AND far from entry ladder (prevent instant re-descent)
          if (dL < 140) {
            // Extra check: if near entry ladder too, ignore (player just spawned)
            if (entryLadderPos) {
              const dxE = playerPos.x - entryLadderPos.x;
              const dyE = playerPos.y - entryLadderPos.y;
              const dE = Math.sqrt(dxE * dxE + dyE * dyE);
              if (dE < 80) return; // Too close to entry, ignore E press
            }
            const evt = new CustomEvent('dungeon-descend');
            window.dispatchEvent(evt);
          }
        }
        return;
      }

      // Return to town via hotkey 'T'
      if (e.key === 't' || e.key === 'T') {
        const evt = new CustomEvent('return-to-town');
        window.dispatchEvent(evt);
        return;
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      keysPressed.current[e.key] = false;
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  // ---------- Component render ----------
  return (
    <canvas
      ref={canvasRef}
      width={CANVAS_WIDTH}
      height={CANVAS_HEIGHT}
      className="bg-gray-900 border-4 border-yellow-600 rounded-lg w-[1000px] h-[600px]"
    />
  );
}
