import { useEffect, useRef } from 'react';
import { useGame } from '../contexts/GameContext';

interface TownSceneProps {
  onRequestDungeonEntry: () => void; // opens floor selection UI
  onOpenShop: () => void;
}

export default function TownScene({ onEnterDungeon, onOpenShop }: TownSceneProps) {
  export default function TownScene({ onRequestDungeonEntry, onOpenShop }: TownSceneProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { character, updateCharacter } = useGame();

  // World and player state
  const WORLD_WIDTH = 1600;
  const WORLD_HEIGHT = 1200;
  const CANVAS_WIDTH = 800;
  const CANVAS_HEIGHT = 480;
  const MOVE_SPEED = 5;

  const playerPosRef = useRef({ x: 300, y: 700 });
  const cameraRef = useRef({ x: 0, y: 0 });
  const keysPressed = useRef<Record<string, boolean>>({});

  const MERCHANT_POS = { x: 520, y: 680 };
  const ORB_POS = { x: 900, y: 660 };
  const GATE_POS = { x: 1400, y: 720 };
  const EVIL_ORB_POS = { x: 1400, y: 720 };

  // Render loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let raf = 0 as number;

    const drawBuilding = (x: number, y: number, w: number, h: number, label: string) => {
      ctx.fillStyle = '#374151';
      ctx.fillRect(x, y, w, h);
      ctx.strokeStyle = '#fbbf24';
      ctx.lineWidth = 2;
      ctx.strokeRect(x, y, w, h);
      ctx.fillStyle = '#fbbf24';
      ctx.font = '12px Arial';
      ctx.textAlign = 'center';
      ctx.fillText(label, x + w / 2, y - 8);
    };

    const drawNPC = (x: number, y: number) => {
      ctx.fillStyle = '#fcd7b6';
      ctx.fillRect(x - 4, y - 18, 8, 8);
      ctx.fillStyle = '#6b4f1d';
      ctx.fillRect(x - 4, y - 18, 8, 4);
      ctx.fillStyle = '#92400e';
      ctx.fillRect(x - 4, y - 10, 8, 10);
      ctx.fillStyle = '#92400e';
      ctx.fillRect(x - 7, y - 10, 3, 9);
      ctx.fillRect(x + 4, y - 10, 3, 9);
      ctx.fillStyle = '#374151';
      ctx.fillRect(x - 4, y, 3, 8);
      ctx.fillRect(x + 1, y, 3, 8);
    };

    const drawOrb = (x: number, y: number, t: number) => {
      const pulse = Math.sin(t / 300) * 2;
      ctx.save();
      // glow
      ctx.fillStyle = 'rgba(14,165,233,0.15)';
      ctx.beginPath();
      ctx.arc(x, y, 28 + pulse, 0, Math.PI * 2);
      ctx.fill();
      // ring
      ctx.strokeStyle = '#67e8f9';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(x, y, 22 + pulse, 0, Math.PI * 2);
      ctx.stroke();
      // core
      ctx.fillStyle = '#22d3ee';
      ctx.beginPath();
      ctx.arc(x, y, 14, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    };

    const render = () => {
      const now = Date.now();
      const player = playerPosRef.current;

      // Camera center on player
      const camX = Math.max(0, Math.min(WORLD_WIDTH - CANVAS_WIDTH, player.x - CANVAS_WIDTH / 2));
      const camY = Math.max(0, Math.min(WORLD_HEIGHT - CANVAS_HEIGHT, player.y - CANVAS_HEIGHT / 2));
      cameraRef.current = { x: camX, y: camY };

      // ground
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
      // plaza tiles
      const tile = 80;
      const cols = Math.ceil(WORLD_WIDTH / tile);
      const rows = Math.ceil(WORLD_HEIGHT / tile);
      const startC = Math.max(0, Math.floor(camX / tile) - 1);
      const endC = Math.min(cols, Math.ceil((camX + CANVAS_WIDTH) / tile) + 1);
      const startR = Math.max(0, Math.floor(camY / tile) - 1);
      const endR = Math.min(rows, Math.ceil((camY + CANVAS_HEIGHT) / tile) + 1);
      for (let r = startR; r < endR; r++) {
        for (let c = startC; c < endC; c++) {
          const wx = c * tile;
          const wy = r * tile;
          const sx = wx - camX;
          const sy = wy - camY;
          ctx.fillStyle = (r + c) % 2 === 0 ? '#172554' : '#1e293b';
          ctx.fillRect(sx, sy, tile - 2, tile - 2);
        }
      }

      // Buildings (background scenery)
      drawBuilding(300 - camX, 520 - camY, 180, 120, 'Inn');
      drawBuilding(700 - camX, 500 - camY, 220, 140, 'Guild');

      // Merchant stall
      drawBuilding(460 - camX, 710 - camY, 120, 12, '');
      drawNPC(MERCHANT_POS.x - camX, MERCHANT_POS.y - camY);
      ctx.fillStyle = '#fbbf24';
      ctx.font = '12px Arial';
      ctx.textAlign = 'center';
      ctx.fillText('Shopkeeper', MERCHANT_POS.x - camX, MERCHANT_POS.y - camY - 24);

      // Orb of Refreshment
      drawOrb(ORB_POS.x - camX, ORB_POS.y - camY, now);
      ctx.fillStyle = '#67e8f9';
      ctx.fillText('Orb of Refreshment', ORB_POS.x - camX, ORB_POS.y - camY - 26);

      // Dungeon gate
      // Evil dungeon entrance orb
      const orbX = EVIL_ORB_POS.x - camX;
      const orbY = EVIL_ORB_POS.y - camY;
      const timePulse = Math.sin(now / 600);
      // Outer dark aura
      ctx.save();
      ctx.beginPath();
      ctx.arc(orbX, orbY, 70 + timePulse * 4, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(88,0,120,0.25)';
      ctx.fill();
      // Middle swirling ring
      ctx.strokeStyle = 'rgba(180,0,255,0.6)';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(orbX, orbY, 42 + timePulse * 3, 0, Math.PI * 2);
      ctx.stroke();
      // Core
      ctx.beginPath();
      ctx.arc(orbX, orbY, 26 + timePulse * 2, 0, Math.PI * 2);
      ctx.fillStyle = '#2d0a3d';
      ctx.fill();
      ctx.beginPath();
      ctx.arc(orbX, orbY, 18 + timePulse * 1.5, 0, Math.PI * 2);
      ctx.fillStyle = '#6a0dad';
      ctx.fill();
      ctx.restore();
      ctx.fillStyle = '#c084fc';
      ctx.font = '13px Arial';
      ctx.textAlign = 'center';
      ctx.fillText('Dungeon Orb', orbX, orbY - 60);

      // Player
      const drawPlayer = (x: number, y: number) => {
        ctx.fillStyle = '#fcd7b6';
        ctx.fillRect(x - 4, y - 18, 8, 8);
        ctx.fillStyle = '#4f46e5';
        ctx.fillRect(x - 4, y - 10, 8, 10);
        ctx.fillStyle = '#4f46e5';
        ctx.fillRect(x - 7, y - 10, 3, 9);
        ctx.fillRect(x + 4, y - 10, 3, 9);
        ctx.fillStyle = '#22223b';
        ctx.fillRect(x - 4, y, 3, 8);
        ctx.fillRect(x + 1, y, 3, 8);
      };
      drawPlayer(player.x - camX, player.y - camY);

      // Interaction hints
      const dist = (a: {x:number;y:number}, b:{x:number;y:number}) => Math.hypot(a.x - b.x, a.y - b.y);
      const nearMerchant = dist(player, MERCHANT_POS) < 120;
      const nearOrb = dist(player, ORB_POS) < 120;
      const nearGate = dist(player, EVIL_ORB_POS) < 160;
      ctx.fillStyle = '#fbbf24';
      ctx.font = 'bold 14px Arial';
      ctx.textAlign = 'center';
      if (nearMerchant) ctx.fillText('Press E to trade', MERCHANT_POS.x - camX, MERCHANT_POS.y - camY + 40);
      if (nearOrb) ctx.fillText('Press E to refresh', ORB_POS.x - camX, ORB_POS.y - camY + 40);
      if (nearGate) ctx.fillText('Press E to enter', GATE_POS.x - camX, GATE_POS.y - camY + 46);
  if (nearGate) ctx.fillText('Press E to commune', EVIL_ORB_POS.x - camX, EVIL_ORB_POS.y - camY + 60);

      raf = requestAnimationFrame(render);
    };

    render();
    return () => cancelAnimationFrame(raf);
  }, []);

  // Movement loop
  useEffect(() => {
    let raf = 0 as number;
    const move = () => {
      const keys = keysPressed.current;
      const p = playerPosRef.current;
      let x = p.x, y = p.y;
      if (keys['ArrowUp'] || keys['w'] || keys['W']) y = Math.max(0, y - MOVE_SPEED);
      if (keys['ArrowDown'] || keys['s'] || keys['S']) y = Math.min(WORLD_HEIGHT, y + MOVE_SPEED);
      if (keys['ArrowLeft'] || keys['a'] || keys['A']) x = Math.max(0, x - MOVE_SPEED);
      if (keys['ArrowRight'] || keys['d'] || keys['D']) x = Math.min(WORLD_WIDTH, x + MOVE_SPEED);
      playerPosRef.current = { x, y };
      raf = requestAnimationFrame(move);
    };
    raf = requestAnimationFrame(move);
    return () => cancelAnimationFrame(raf);
  }, []);

  // Input handlers
  useEffect(() => {
    const handleDown = (e: KeyboardEvent) => {
      keysPressed.current[e.key] = true;
      if (e.key === 'e' || e.key === 'E') {
        const p = playerPosRef.current;
        const d = (a:{x:number;y:number}, b:{x:number;y:number}) => Math.hypot(a.x-b.x, a.y-b.y);
        
        // Check merchant first (priority order matters)
        if (d(p, MERCHANT_POS) < 130) {
          e.preventDefault();
          e.stopPropagation();
          onOpenShop();
          return;
        }
        // Check orb second
        if (d(p, ORB_POS) < 130) {
          e.preventDefault();
          e.stopPropagation();
          if (character) {
            void updateCharacter({ health: character.max_health, mana: character.max_mana });
          }
          return;
        }
        // Check dungeon gate last
        if (d(p, GATE_POS) < 150) {
          e.preventDefault();
          e.stopPropagation();
          e.preventDefault();
          e.stopPropagation();
          onRequestDungeonEntry();
          return;
        }
      }
    };
    const handleUp = (e: KeyboardEvent) => { keysPressed.current[e.key] = false; };
    window.addEventListener('keydown', handleDown);
    window.addEventListener('keyup', handleUp);
    return () => { window.removeEventListener('keydown', handleDown); window.removeEventListener('keyup', handleUp); };
  }, [character, onEnterDungeon, onOpenShop, updateCharacter]);
  }, [character, onRequestDungeonEntry, onOpenShop, updateCharacter]);

  return (
    <canvas
      ref={canvasRef}
      width={CANVAS_WIDTH}
      height={CANVAS_HEIGHT}
      className="bg-gray-900 border-4 border-yellow-600 rounded-lg w-[1000px] h-[600px]"
    />
  );
}
