// src/components/DungeonView.tsx
import { useRef, useEffect } from 'react';
import { Enemy, Character } from '../types/game';
import { DamageNumber } from '../contexts/GameContext';

interface DungeonViewProps {
  enemy: Enemy | null;
  floor: number;
  onAttack: () => void;
  damageNumbers: DamageNumber[];
  character?: Character | null;
  zoneHeat?: number;
}

export function DungeonView({ enemy, floor, onAttack, damageNumbers, character, zoneHeat }: DungeonViewProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const zoneHeatRef = useRef<number | undefined>(undefined);

  // keep zoneHeat prop in sync (set below via props)

  // ========== Constants ==========
  const CANVAS_WIDTH = 1000;
  const CANVAS_HEIGHT = 600;
  const MOVE_SPEED = 5;
  const BOUNDARY_PADDING = 50;
  const ATTACK_COOLDOWN_MS = 400;
  const MAX_CHASE_DISTANCE = 450;
  const ENEMY_SPEED = 2.2;
  const ATTACK_RANGE = 120;
  const MIN_PLAYER_ENEMY_DISTANCE = 10; // Prevents overlap

  // ========== Ref Storage for Game State ==========
  // Using refs to avoid 60fps React re-renders and maintain state across frames

  // Player and enemy positions (updated each frame)
  const playerPosRef = useRef({ x: 400, y: 450 });
  const enemyPosRef = useRef({ x: 600, y: 220 });

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

  const drawTorch = (
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
  ) => {
    ctx.fillStyle = '#8b7355';
    ctx.fillRect(x - 3, y - 20, 6, 25);

    ctx.fillStyle = 'rgba(255, 140, 0, 0.8)';
    ctx.beginPath();
    ctx.arc(x, y - 20, 15, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = 'rgba(255, 200, 0, 0.5)';
    ctx.beginPath();
    ctx.arc(x, y - 20, 10, 0, Math.PI * 2);
    ctx.fill();
  };

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

  const drawCharacterHUD = (ctx: CanvasRenderingContext2D) => {
    const c = characterRef.current;
    if (!c) return;

    // Draw compact bottom HUD bars to avoid covering top-left UI
    const padding = 18;
    const barHeight = 14;
    const barWidth = 300;
    const smallGap = 12;

    // HP: bottom-left
    const hpX = padding;
    const hpY = CANVAS_HEIGHT - padding - barHeight;
    const hpPercent = Math.max(0, Math.min(1, c.health / c.max_health));
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fillRect(hpX - 6, hpY - 6, barWidth + 12, barHeight + 12);
    ctx.strokeStyle = '#fbbf24';
    ctx.lineWidth = 1;
    ctx.strokeRect(hpX - 6, hpY - 6, barWidth + 12, barHeight + 12);
    ctx.fillStyle = '#1f2937';
    ctx.fillRect(hpX, hpY, barWidth, barHeight);
    ctx.fillStyle = hpPercent > 0.3 ? '#22c55e' : '#ef4444';
    ctx.fillRect(hpX, hpY, hpPercent * barWidth, barHeight);
    ctx.font = '12px Arial';
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'left';
    ctx.fillText(`HP ${Math.floor(c.health)}/${c.max_health}`, hpX + 6, hpY + barHeight - 2);

    // EXP: bottom-center
    const expToNext = c.level * 100;
    const expPercent = Math.max(0, Math.min(1, c.experience / expToNext));
    const expW = 360;
    const expX = Math.round(CANVAS_WIDTH / 2 - expW / 2);
    const expY = CANVAS_HEIGHT - padding - barHeight;
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fillRect(expX - 6, expY - 6, expW + 12, barHeight + 12);
    ctx.strokeStyle = '#fbbf24';
    ctx.lineWidth = 1;
    ctx.strokeRect(expX - 6, expY - 6, expW + 12, barHeight + 12);
    ctx.fillStyle = '#1f2937';
    ctx.fillRect(expX, expY, expW, barHeight);
    ctx.fillStyle = '#a855f7';
    ctx.fillRect(expX, expY, expPercent * expW, barHeight);
    ctx.font = '12px Arial';
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.fillText(`EXP ${Math.floor(c.experience)}/${expToNext}`, expX + expW / 2, expY + barHeight - 2);

    // Mana: bottom-right
    const manaW = 300;
    const manaX = CANVAS_WIDTH - padding - manaW;
    const manaY = CANVAS_HEIGHT - padding - barHeight;
    const manaPercent = Math.max(0, Math.min(1, c.mana / c.max_mana));
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fillRect(manaX - 6, manaY - 6, manaW + 12, barHeight + 12);
    ctx.strokeStyle = '#fbbf24';
    ctx.lineWidth = 1;
    ctx.strokeRect(manaX - 6, manaY - 6, manaW + 12, barHeight + 12);
    ctx.fillStyle = '#1f2937';
    ctx.fillRect(manaX, manaY, manaW, barHeight);
    ctx.fillStyle = '#3b82f6';
    ctx.fillRect(manaX, manaY, manaPercent * manaW, barHeight);
    ctx.font = '12px Arial';
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'right';
    ctx.fillText(`${Math.floor(c.mana)}/${c.max_mana} Mana`, manaX + manaW - 6, manaY + barHeight - 2);

    // Gold: small element above mana bar on the right
    const goldW = 140;
    const goldH = 28;
    const goldX = CANVAS_WIDTH - padding - goldW;
    const goldY = manaY - smallGap - goldH;
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect(goldX, goldY, goldW, goldH);
    ctx.strokeStyle = '#fbbf24';
    ctx.lineWidth = 1;
    ctx.strokeRect(goldX, goldY, goldW, goldH);
    // gold icon
    ctx.fillStyle = '#fbbf24';
    ctx.beginPath();
    ctx.arc(goldX + 18, goldY + goldH / 2, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#111827';
    ctx.font = '12px Arial';
    ctx.textAlign = 'left';
    ctx.fillText(`Gold: ${c.gold}`, goldX + 36, goldY + goldH / 2 + 4);

    // Zone Heat display (reads latest from zoneHeatRef)
    const finalHeat = zoneHeatRef.current;
    if (typeof finalHeat === 'number') {
      const heatPercent = Math.max(0, Math.min(100, finalHeat));
      ctx.fillStyle = '#111827';
      ctx.fillRect(310, 10, 180, 24);
      ctx.strokeStyle = '#ff6b6b';
      ctx.lineWidth = 2;
      ctx.strokeRect(310, 10, 180, 24);
      ctx.fillStyle = '#2b2b2b';
      ctx.fillRect(316, 16, 168, 12);
      ctx.fillStyle = '#ff6b6b';
      ctx.fillRect(316, 16, (heatPercent / 100) * 168, 12);
      ctx.font = '12px Arial';
      ctx.fillStyle = '#ffffff';
      ctx.textAlign = 'center';
      ctx.fillText(`Zone Heat: ${Math.round(heatPercent)}%`, 400, 28);
    }
  };

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

      // Background
      ctx.fillStyle = '#1a1a2e';
      ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

      // Stones
      ctx.fillStyle = '#16213e';
      for (let i = 0; i < 20; i++) {
        const x = (i * 80) % CANVAS_WIDTH;
        const y = Math.sin(i) * 50 + 300;
        drawStone(ctx, x, y, 60, 80);
      }

      // Torches
      drawTorch(ctx, 100, 100);
      drawTorch(ctx, CANVAS_WIDTH - 100, 100);
      drawTorch(ctx, 150, CANVAS_HEIGHT - 80);
      drawTorch(ctx, CANVAS_WIDTH - 150, CANVAS_HEIGHT - 80);

      // Player
      drawCharacter(ctx, playerPos.x, playerPos.y, true);

      // Enemy + health bar
      if (enemy && enemy.health > 0) {
        drawCharacter(ctx, enemyPos.x, enemyPos.y, false);

        ctx.font = 'bold 18px Arial';
        let rarityColor = '#ef4444';
        if (enemy.rarity === 'rare') rarityColor = '#3b82f6';
        else if (enemy.rarity === 'elite') rarityColor = '#f59e0b';
        else if (enemy.rarity === 'boss') rarityColor = '#a855f7';

        ctx.fillStyle = rarityColor;
        ctx.textAlign = 'center';
        ctx.fillText(enemy.name, enemyPos.x, enemyPos.y - 60);

        const healthPercent = (enemy.health / enemy.max_health) * 100;
        ctx.fillStyle = '#1f2937';
        ctx.fillRect(enemyPos.x - 60, enemyPos.y - 35, 120, 10);
        ctx.fillStyle = healthPercent > 30 ? '#22c55e' : '#ef4444';
        ctx.fillRect(
          enemyPos.x - 60,
          enemyPos.y - 35,
          (healthPercent / 100) * 120,
          10,
        );
        ctx.strokeStyle = '#fbbf24';
        ctx.lineWidth = 2;
        ctx.strokeRect(enemyPos.x - 60, enemyPos.y - 35, 120, 10);

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
      ctx.fillStyle = '#fbbf24';
      ctx.textAlign = 'left';
      ctx.fillText(`Floor ${currentFloor}`, 20, 30);

      ctx.fillStyle = 'rgba(200,200,200,0.8)';
      ctx.font = '12px Arial';
      ctx.fillText('Use Arrow Keys to move', 20, 60);

      // Draw character HUD (HP, Mana, EXP)
      drawCharacterHUD(ctx);

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
        ctx.fillText(`-${dmg.damage}`, dmg.x, dmg.y - yOffset);
        ctx.shadowColor = 'transparent';
      });

      // Draw attack cooldown indicator bar
      const now = Date.now();
      const remaining = Math.max(0, nextAttackTimeRef.current - now);
      const percent = remaining / ATTACK_COOLDOWN_MS;
      const barWidth = 120;
      const barHeight = 5;
      const barX = 20;
      const barY = 65;
      // background bar
      ctx.fillStyle = '#444444';
      ctx.fillRect(barX, barY, barWidth, barHeight);
      // fill bar representing ready portion
      ctx.fillStyle = '#4f46e5';
      ctx.fillRect(barX, barY, barWidth * (1 - percent), barHeight);

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
        newY = Math.max(BOUNDARY_PADDING, prev.y - MOVE_SPEED);
      }
      if (keys['ArrowDown'] || keys['s'] || keys['S']) {
        newY = Math.min(CANVAS_HEIGHT - BOUNDARY_PADDING, prev.y + MOVE_SPEED);
      }
      if (keys['ArrowLeft'] || keys['a'] || keys['A']) {
        newX = Math.max(BOUNDARY_PADDING, prev.x - MOVE_SPEED);
      }
      if (keys['ArrowRight'] || keys['d'] || keys['D']) {
        newX = Math.min(CANVAS_WIDTH - BOUNDARY_PADDING, prev.x + MOVE_SPEED);
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
