// src/components/DungeonView.tsx
import { useRef, useEffect } from 'react';
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

export function DungeonView({ enemy, floor, onAttack, damageNumbers, character, zoneHeat }: DungeonViewProps) {
  const { enemiesInWorld, ladderPos, onEngageEnemy } = useGame();
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const zoneHeatRef = useRef<number | undefined>(undefined);
  const minimapEnabledRef = useRef<boolean>(true);
  const ladderDiscoveredRef = useRef<boolean>(false);

  // Floor theme palette helper
  const getFloorTheme = (f: number) => {
    const themes = [
      { // dungeon
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
      { // lava / volcano
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
      { // ice / snow
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
      { // jungle
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
  const CANVAS_WIDTH = 1000;
  const CANVAS_HEIGHT = 600;
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

  // ========== Ref Storage for Game State ==========
  // Using refs to avoid 60fps React re-renders and maintain state across frames

  // Player and enemy positions (updated each frame)
  // World positions
  const playerPosRef = useRef({ x: 400, y: 450 });
  const enemyPosRef = useRef({ x: 900, y: 600 });

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

  // --- keep refs in sync with props ---

  useEffect(() => {
    enemyRef.current = enemy || null;
  }, [enemy]);

  useEffect(() => {
    floorRef.current = floor;
  }, [floor]);

  useEffect(() => {
    onAttackRef.current = onAttack;
  }, [onAttack]);

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
  useEffect(() => {
    if (!enemy) return;

    enemyPosRef.current = {
      x: 600,
      y: 220,
    };
  }, [enemy?.id, floor]);

  // ---------- drawing helpers ----------

  const drawCharacter = (
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    isPlayer: boolean,
  ) => {
    ctx.fillStyle = isPlayer ? '#4f46e5' : '#dc2626';
    ctx.shadowColor = 'rgba(0,0,0,0.7)';
    ctx.shadowBlur = 15;
    ctx.shadowOffsetY = 8;

    // Head
    ctx.beginPath();
    ctx.arc(x, y - 15, 20, 0, Math.PI * 2);
    ctx.fill();

    // Body
    ctx.fillStyle = isPlayer ? '#6366f1' : '#ef4444';
    ctx.fillRect(x - 20, y + 5, 40, 35);

    // Legs
    ctx.fillStyle = isPlayer ? '#4f46e5' : '#dc2626';
    ctx.fillRect(x - 25, y + 5, 12, 30);
    ctx.fillRect(x + 13, y + 5, 12, 30);

    ctx.shadowColor = 'transparent';
  };

  // Torch drawing helper removed

  const drawStone = (
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    width: number,
    height: number,
  ) => {
    ctx.fillStyle = '#3a3a3a';
    ctx.fillRect(x, y, width, height);
    ctx.strokeStyle = '#2a2a2a';
    ctx.lineWidth = 2;
    ctx.strokeRect(x, y, width, height);
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

      // Update camera to center on player (clamped to world bounds)
      const camX = Math.max(0, Math.min(WORLD_WIDTH - CANVAS_WIDTH, playerPos.x - CANVAS_WIDTH / 2));
      const camY = Math.max(0, Math.min(WORLD_HEIGHT - CANVAS_HEIGHT, playerPos.y - CANVAS_HEIGHT / 2));
      cameraRef.current = { x: camX, y: camY };

      // Background themed
      const theme = getFloorTheme(currentFloor);
      ctx.fillStyle = theme.bg;
      ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

      // Stones tiled across the world; render only those within camera view
      const tileSize = 100;
      const cols = Math.ceil(WORLD_WIDTH / tileSize);
      const rows = Math.ceil(WORLD_HEIGHT / tileSize);
      const startCol = Math.max(0, Math.floor(camX / tileSize) - 1);
      const endCol = Math.min(cols, Math.ceil((camX + CANVAS_WIDTH) / tileSize) + 1);
      const startRow = Math.max(0, Math.floor(camY / tileSize) - 1);
      const endRow = Math.min(rows, Math.ceil((camY + CANVAS_HEIGHT) / tileSize) + 1);
      for (let r = startRow; r < endRow; r++) {
        for (let c = startCol; c < endCol; c++) {
          const worldX = c * tileSize + 20;
          const worldY = r * tileSize + 40;
          const screenX = worldX - camX;
          const screenY = worldY - camY;
          // Themed tiles
          ctx.fillStyle = theme.tileFill;
          // Temporarily adjust stone stroke via context
          const prevStroke = ctx.strokeStyle;
          ctx.strokeStyle = theme.tileStroke as any;
          drawStone(ctx, screenX, screenY, 60, 80);
          ctx.strokeStyle = prevStroke;
        }
      }

      // Torches removed for a cleaner canvas per request

      // Draw world enemies as markers when not engaged
      if (!enemy && enemiesInWorld && enemiesInWorld.length > 0) {
        enemiesInWorld.forEach((ew: Enemy & { id: string; x: number; y: number }) => {
          const sx = ew.x - camX;
          const sy = ew.y - camY;
          if (sx < -50 || sy < -50 || sx > CANVAS_WIDTH + 50 || sy > CANVAS_HEIGHT + 50) return;
          ctx.fillStyle = '#7f1d1d';
          ctx.beginPath();
          ctx.arc(sx, sy, 12, 0, Math.PI * 2);
          ctx.fill();
          ctx.font = '10px Arial';
          ctx.fillStyle = theme.hudAccent;
          ctx.textAlign = 'center';
          ctx.fillText(ew.name, sx, sy - 16);
          // Auto-engage if close
          const dx = playerPos.x - ew.x;
          const dy = playerPos.y - ew.y;
          const d = Math.sqrt(dx*dx + dy*dy);
          if (d < 140) {
            // Set enemy position to world enemy position for combat
            enemyPosRef.current = { x: ew.x, y: ew.y };
            onEngageEnemy(ew.id);
          }
        });
      }

      // Draw ladder marker
      if (ladderPos) {
        const lx = ladderPos.x - camX;
        const ly = ladderPos.y - camY;
        ctx.fillStyle = '#065f46';
        ctx.fillRect(lx - 8, ly - 20, 16, 40);
        ctx.strokeStyle = theme.hudAccent as any;
        ctx.lineWidth = 2;
        ctx.strokeRect(lx - 8, ly - 20, 16, 40);
        ctx.font = '11px Arial';
        ctx.fillStyle = theme.hudAccent;
        ctx.textAlign = 'center';
        ctx.fillText('Ladder', lx, ly - 28);
        // Prompt when near ladder
        const dxL = playerPos.x - ladderPos.x;
        const dyL = playerPos.y - ladderPos.y;
        const dL = Math.sqrt(dxL*dxL + dyL*dyL);
        if (dL < 160) {
          ladderDiscoveredRef.current = true;
        }
        if (dL < 140) {
          ctx.font = 'bold 14px Arial';
          ctx.fillStyle = theme.hudAccent;
          ctx.textAlign = 'center';
          ctx.fillText('Press E to descend', lx, ly + 40);
        }

        // Screen-edge indicator pointing to discovered ladder when off-screen
        const offscreen = lx < 0 || ly < 0 || lx > CANVAS_WIDTH || ly > CANVAS_HEIGHT;
        if (offscreen && ladderDiscoveredRef.current) {
          const centerX = CANVAS_WIDTH / 2;
          const centerY = CANVAS_HEIGHT / 2;
          const dirX = lx - centerX;
          const dirY = ly - centerY;
          const len = Math.max(1, Math.sqrt(dirX*dirX + dirY*dirY));
          const nx = dirX / len;
          const ny = dirY / len;
          // Position arrow slightly inside the edge
          let ax = centerX + nx * (Math.min(CANVAS_WIDTH, CANVAS_HEIGHT) / 2 - 30);
          let ay = centerY + ny * (Math.min(CANVAS_WIDTH, CANVAS_HEIGHT) / 2 - 30);
          // Clamp within canvas bounds
          ax = Math.max(20, Math.min(CANVAS_WIDTH - 20, ax));
          ay = Math.max(20, Math.min(CANVAS_HEIGHT - 20, ay));
          // Draw arrow triangle pointing towards ladder
          ctx.fillStyle = theme.hudAccent;
          ctx.strokeStyle = theme.hudAccent as any;
          ctx.lineWidth = 2;
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
      }

      // Player (apply camera offset)
      drawCharacter(ctx, playerPos.x - camX, playerPos.y - camY, true);

      // Enemy + health bar
      if (enemy && enemy.health > 0) {
        drawCharacter(ctx, enemyPos.x - camX, enemyPos.y - camY, false);

        ctx.font = 'bold 18px Arial';
        let rarityColor = '#ef4444';
        if (enemy.rarity === 'rare') rarityColor = '#3b82f6';
        else if (enemy.rarity === 'elite') rarityColor = '#f59e0b';
        else if (enemy.rarity === 'boss') rarityColor = '#a855f7';

        ctx.fillStyle = rarityColor;
        ctx.textAlign = 'center';
        ctx.fillText(enemy.name, enemyPos.x - camX, enemyPos.y - camY - 60);

        const healthPercent = (enemy.health / enemy.max_health) * 100;
        ctx.fillStyle = '#1f2937';
        ctx.fillRect(enemyPos.x - camX - 60, enemyPos.y - camY - 35, 120, 10);
        ctx.fillStyle = healthPercent > 30 ? '#22c55e' : '#ef4444';
        ctx.fillRect(
          enemyPos.x - camX - 60,
          enemyPos.y - camY - 35,
          (healthPercent / 100) * 120,
          10,
        );
        ctx.strokeStyle = '#fbbf24';
        ctx.lineWidth = 2;
        ctx.strokeRect(enemyPos.x - camX - 60, enemyPos.y - camY - 35, 120, 10);

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
      ctx.strokeStyle = theme.hudAccent as any;
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
      ctx.fillText(`Heat ${Math.round(heatPercent)}%`, groupX + groupWidth / 2, heatY + barHeight - 2);
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
      ctx.fillText(remaining > 0 ? 'Cooling...' : 'Ready', groupX + groupWidth / 2, cdY + barHeight - 2);
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
        ctx.strokeStyle = theme.minimapViewport as any;
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
        ctx.strokeStyle = theme.minimapViewport as any;
        ctx.lineWidth = 2;
        ctx.strokeRect(vpX, vpY, vpW, vpH);
        // Player dot
        const pMiniX = miniX + (playerPos.x / WORLD_WIDTH) * miniW;
        const pMiniY = miniY + (playerPos.y / WORLD_HEIGHT) * miniH;
        ctx.fillStyle = theme.player;
        ctx.beginPath();
        ctx.arc(pMiniX, pMiniY, 3, 0, Math.PI * 2);
        ctx.fill();
        // Ladder icon only if discovered
        if (ladderPos && ladderDiscoveredRef.current) {
          const lMiniX = miniX + (ladderPos.x / WORLD_WIDTH) * miniW;
          const lMiniY = miniY + (ladderPos.y / WORLD_HEIGHT) * miniH;
          ctx.fillStyle = theme.hudAccent;
          ctx.beginPath();
          ctx.arc(lMiniX, lMiniY, 3, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // Draw damage numbers
      const currentTime = Date.now();
      damageNumbersRef.current.forEach((dmg: DamageNumber) => {
        const age = currentTime - dmg.createdAt;
        const progress = age / 1500; // 1500ms total duration
        const opacity = Math.max(0, 1 - progress);
        const yOffset = progress * 50; // Move up over time

        ctx.font = 'bold 24px Arial';
        ctx.fillStyle = `rgba(255, 100, 100, ${opacity})`;
        ctx.textAlign = 'center';
        ctx.shadowColor = `rgba(0, 0, 0, ${opacity * 0.8})`;
        ctx.shadowBlur = 10;
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

  // ---------- Player movement loop ----------

  useEffect(() => {
    let animationFrameId: number;

    const movePlayer = () => {
      const prev = playerPosRef.current;
      let newX = prev.x;
      let newY = prev.y;

      const keys = keysPressed.current;

      if (keys['ArrowUp'] || keys['w'] || keys['W']) {
        newY = Math.max(0, prev.y - MOVE_SPEED);
      }
      if (keys['ArrowDown'] || keys['s'] || keys['S']) {
        newY = Math.min(WORLD_HEIGHT, prev.y + MOVE_SPEED);
      }
      if (keys['ArrowLeft'] || keys['a'] || keys['A']) {
        newX = Math.max(0, prev.x - MOVE_SPEED);
      }
      if (keys['ArrowRight'] || keys['d'] || keys['D']) {
        newX = Math.min(WORLD_WIDTH, prev.x + MOVE_SPEED);
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

    // Descend ladder with 'E' when near
    if (e.key === 'e' || e.key === 'E') {
      const playerPos = playerPosRef.current;
      if (ladderPos) {
        const dxL = playerPos.x - ladderPos.x;
        const dyL = playerPos.y - ladderPos.y;
        const dL = Math.sqrt(dxL*dxL + dyL*dyL);
        if (dL < 140) {
          const evt = new CustomEvent('dungeon-descend');
          window.dispatchEvent(evt);
        }
      }
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
