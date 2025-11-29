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

  // ========== GAME CONSTANTS ==========
  // Canvas rendering dimensions
  const CANVAS_WIDTH = 1000;
  const CANVAS_HEIGHT = 600;
  // Player movement configuration
  const MOVE_SPEED = 5;
  const BOUNDARY_PADDING = 50;
  // Combat system configuration
  const ATTACK_COOLDOWN_MS = 400;
  const ATTACK_RANGE = 120;
  // Enemy AI configuration
  const MAX_CHASE_DISTANCE = 450;
  const ENEMY_SPEED = 2.2;
  const MIN_PLAYER_ENEMY_DISTANCE = 10; // Prevents overlap when chasing

  // ========== GAME STATE (Using refs to avoid 60fps React re-renders) ==========
  // Character positions - updated each frame in game loops
  const playerPosRef = useRef({ x: 400, y: 450 });
  const enemyPosRef = useRef({ x: 600, y: 220 });
  // Input tracking - tracks which keys are currently pressed
  const keysPressed = useRef<{ [key: string]: boolean }>({});
  // Attack cooldown - stores the next allowed attack time in milliseconds
  const nextAttackTimeRef = useRef(Date.now());
  // Prop refs - keeps latest props without triggering effect dependencies
  const enemyRef = useRef<Enemy | null>(enemy);
  const floorRef = useRef(floor);
  const onAttackRef = useRef(onAttack);

  // ========== PROP SYNCHRONIZATION ==========
  // These effects keep refs in sync with props, allowing effects to run without 
  // including props in their dependencies (which would cause unnecessary re-runs)

  useEffect(() => {
    enemyRef.current = enemy || null;
  }, [enemy]);

  useEffect(() => {
    floorRef.current = floor;
  }, [floor]);

  useEffect(() => {
    onAttackRef.current = onAttack;
  }, [onAttack]);

  // Reset enemy position when a NEW enemy spawns (id changes) or floor changes
  // This does NOT run on every health update, preventing unnecessary resets
  useEffect(() => {
    if (!enemy) return;
    enemyPosRef.current = { x: 600, y: 220 };
  }, [enemy?.id, floor]);

  // ========== DRAWING HELPERS ==========

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

  // ========== MAIN RENDER LOOP ==========
  // Runs every frame (~60fps) to render the game scene
  // Uses refs for all state to avoid React re-renders on each frame
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;

    const render = () => {
      const playerPos = playerPosRef.current;
      const enemyPos = enemyPosRef.current;
      const currentEnemy = enemyRef.current;
      const currentFloor = floorRef.current;

      // === Background ===
      ctx.fillStyle = '#1a1a2e';
      ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

      // === Environment (decorative stones) ===
      ctx.fillStyle = '#16213e';
      for (let i = 0; i < 20; i++) {
        const x = (i * 80) % CANVAS_WIDTH;
        const y = Math.sin(i) * 50 + 300;
        drawStone(ctx, x, y, 60, 80);
      }

      // === Ambient torches ===
      drawTorch(ctx, 100, 100);
      drawTorch(ctx, CANVAS_WIDTH - 100, 100);
      drawTorch(ctx, 150, CANVAS_HEIGHT - 80);
      drawTorch(ctx, CANVAS_WIDTH - 150, CANVAS_HEIGHT - 80);

      // === Player character ===
      drawCharacter(ctx, playerPos.x, playerPos.y, true);

      // === Enemy (if alive) and combat UI ===
      if (currentEnemy && currentEnemy.health > 0) {
        drawCharacter(ctx, enemyPos.x, enemyPos.y, false);

        // Enemy name with rarity-based coloring
        ctx.font = 'bold 18px Arial';
        let rarityColor = '#ef4444'; // normal
        if (currentEnemy.rarity === 'rare') rarityColor = '#3b82f6';
        else if (currentEnemy.rarity === 'elite') rarityColor = '#f59e0b';
        else if (currentEnemy.rarity === 'boss') rarityColor = '#a855f7';

        ctx.fillStyle = rarityColor;
        ctx.textAlign = 'center';
        ctx.fillText(currentEnemy.name, enemyPos.x, enemyPos.y - 60);

        // Health bar with dynamic coloring (red when low, green when high)
        const healthPercent = (currentEnemy.health / currentEnemy.max_health) * 100;
        ctx.fillStyle = '#1f2937'; // background bar
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

        // Distance indicator and attack hint
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

      // === HUD Text ===
      ctx.font = 'bold 16px Arial';
      ctx.fillStyle = '#fbbf24';
      ctx.textAlign = 'left';
      ctx.fillText(`Floor ${currentFloor}`, 20, 30);

      ctx.fillStyle = 'rgba(200,200,200,0.8)';
      ctx.font = '12px Arial';
      ctx.fillText('Use Arrow Keys to move', 20, 60);

      // === Attack cooldown indicator ===
      const now = Date.now();
      const remaining = Math.max(0, nextAttackTimeRef.current - now);
      const cooldownPercent = remaining / ATTACK_COOLDOWN_MS;
      const barWidth = 120;
      const barHeight = 5;
      const barX = 20;
      const barY = 65;

      ctx.fillStyle = '#444444'; // background bar
      ctx.fillRect(barX, barY, barWidth, barHeight);
      ctx.fillStyle = '#4f46e5'; // filled portion (ready state)
      ctx.fillRect(barX, barY, barWidth * (1 - cooldownPercent), barHeight);

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  // ========== PLAYER MOVEMENT LOOP ==========
  // Runs every frame to update player position based on currently pressed keys
  useEffect(() => {
    let animationFrameId: number;

    const movePlayer = () => {
      const prev = playerPosRef.current;
      let newX = prev.x;
      let newY = prev.y;

      const keys = keysPressed.current;

      // Arrow keys or WASD for movement
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

  // ========== ENEMY AI LOOP ==========
  // Runs every frame to update enemy position with simple chase AI
  useEffect(() => {
    let frameId: number;

    const updateEnemy = () => {
      const currentEnemy = enemyRef.current;
      if (!currentEnemy || currentEnemy.health <= 0) {
        frameId = requestAnimationFrame(updateEnemy);
        return;
      }

      const playerPos = playerPosRef.current;
      const enemyPos = enemyPosRef.current;

      const dx = playerPos.x - enemyPos.x;
      const dy = playerPos.y - enemyPos.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      // Chase logic: move toward player if in range and not already colliding
      if (distance > MIN_PLAYER_ENEMY_DISTANCE && distance < MAX_CHASE_DISTANCE) {
        const nx = dx / distance; // normalize x
        const ny = dy / distance; // normalize y

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

  // ========== KEYBOARD INPUT HANDLER ==========
  // Tracks key presses for movement and handles Space key for attacks
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Track movement keys in ref for smooth movement loop
      keysPressed.current[e.key] = true;

      // Handle Space (attack) separately from movement
      if (e.code === 'Space') {
        // Ignore key-repeat events when holding Space to prevent rapid repeated attacks
        if (e.repeat) return;

        const now = Date.now();
        // Only allow attack if cooldown has elapsed
        if (now < nextAttackTimeRef.current) return;

        e.preventDefault();

        const currentEnemy = enemyRef.current;
        if (!currentEnemy || currentEnemy.health <= 0) return;

        const playerPos = playerPosRef.current;
        const enemyPos = enemyPosRef.current;

        const distX = playerPos.x - enemyPos.x;
        const distY = playerPos.y - enemyPos.y;
        const distance = Math.sqrt(distX * distX + distY * distY);

        // Only allow attack if player is in melee range
        if (distance < ATTACK_RANGE) {
          nextAttackTimeRef.current = now + ATTACK_COOLDOWN_MS;
          onAttackRef.current();
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

  // ========== COMPONENT RENDER ==========
  return (
    <canvas
      ref={canvasRef}
      width={CANVAS_WIDTH}
      height={CANVAS_HEIGHT}
      className="bg-gray-900 border-4 border-yellow-600 rounded-lg w-[1000px] h-[600px]"
    />
  );
}
