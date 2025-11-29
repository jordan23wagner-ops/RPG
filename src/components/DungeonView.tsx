// src/components/DungeonView.tsx
import { useRef, useEffect } from 'react';
import { Enemy } from '../types/game';

interface DungeonViewProps {
  enemy: Enemy | null;
  floor: number;
  onAttack: () => void;
}

export function DungeonView({ enemy, floor, onAttack }: DungeonViewProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Positions & input stored in refs (no 60fps React re-renders)
  const playerPosRef = useRef({ x: 400, y: 450 });
  const enemyPosRef = useRef({ x: 600, y: 220 });
  const keysPressed = useRef<{ [key: string]: boolean }>({});

  // Keep latest props in refs so effects don't depend on them
  const enemyRef = useRef<Enemy | null>(enemy);
  const floorRef = useRef(floor);
  const onAttackRef = useRef(onAttack);

  const MOVE_SPEED = 5;
  const CANVAS_WIDTH = 1000;
  const CANVAS_HEIGHT = 600;
  const BOUNDARY_PADDING = 50;

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

      const MAX_CHASE_DISTANCE = 450;
      const ENEMY_SPEED = 2.2;

      // Move toward player if within chase range and not already overlapping
      if (distance > 10 && distance < MAX_CHASE_DISTANCE) {
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
        // Ignore key-repeat when the key is held down
        if (e.repeat) return;

        e.preventDefault();
        const enemy = enemyRef.current;
        if (!enemy || enemy.health <= 0) return;

        const playerPos = playerPosRef.current;
        const enemyPos = enemyPosRef.current;

        const distX = playerPos.x - enemyPos.x;
        const distY = playerPos.y - enemyPos.y;
        const distance = Math.sqrt(distX * distX + distY * distY);

        // Only attack if you're actually in melee range
        if (distance < 120) {
          onAttackRef.current();
        }

        return; // don’t do anything else for Space
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

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      width={CANVAS_WIDTH}
      height={CANVAS_HEIGHT}
      className="bg-gray-900 border-4 border-yellow-600 rounded-lg w-[1000px] h-[600px]"
    />
  );
}
