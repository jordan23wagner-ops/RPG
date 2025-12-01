import { useEffect, useRef } from 'react';
import { useGame } from '../contexts/GameContext';

interface TownSceneProps {
  onRequestDungeonEntry: () => void; // opens floor selection UI
  onOpenShop: () => void;
}

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

    const drawBuilding = (
      x: number,
      y: number,
      w: number,
      h: number,
      label: string,
      theme: 'inn' | 'guild' | 'shop',
    ) => {
      // Base body
      ctx.save();
      if (theme === 'inn') {
        ctx.fillStyle = '#1f2937';
      } else if (theme === 'guild') {
        ctx.fillStyle = '#111827';
      } else {
        ctx.fillStyle = '#1e293b';
      }
      ctx.fillRect(x, y, w, h);

      // Roof
      if (theme === 'inn') {
        ctx.fillStyle = '#7c2d12';
      } else if (theme === 'guild') {
        ctx.fillStyle = '#4c1d95';
      } else {
        ctx.fillStyle = '#92400e';
      }
      ctx.fillRect(x - 4, y - 16, w + 8, 16);

      // Windows
      const windowColor = theme === 'guild' ? '#93c5fd' : '#fbbf24';
      ctx.fillStyle = windowColor;
      const cols = Math.max(2, Math.floor(w / 50));
      const rows = 2;
      const padX = w / (cols + 1);
      const padY = (h - 30) / (rows + 1);
      for (let ry = 0; ry < rows; ry++) {
        for (let cx = 0; cx < cols; cx++) {
          const wx = x + padX * (cx + 1) - 10;
          const wy = y + padY * (ry + 1) - 8;
          ctx.fillRect(wx, wy, 18, 14);
          ctx.fillStyle = 'rgba(15,23,42,0.4)';
          ctx.fillRect(wx, wy, 18, 7);
          ctx.fillStyle = windowColor;
        }
      }

      // Door
      ctx.fillStyle = '#78350f';
      const doorWidth = Math.max(22, Math.min(40, w * 0.2));
      const doorX = x + w / 2 - doorWidth / 2;
      const doorY = y + h - 34;
      ctx.fillRect(doorX, doorY, doorWidth, 34);
      ctx.fillStyle = '#facc15';
      ctx.fillRect(doorX + doorWidth - 8, doorY + 16, 4, 4);

      // Sign/label
      ctx.fillStyle = '#fbbf24';
      ctx.font = '12px Arial';
      ctx.textAlign = 'center';
      ctx.fillText(label, x + w / 2, y - 8);
      ctx.restore();
    };

    const drawTree = (x: number, y: number, scale: number = 1) => {
      ctx.save();
      ctx.translate(x, y);
      ctx.scale(scale, scale);
      ctx.fillStyle = '#4b3715';
      ctx.fillRect(-4, 0, 8, 18);
      ctx.beginPath();
      ctx.fillStyle = '#166534';
      ctx.arc(0, -4, 14, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.fillStyle = '#22c55e';
      ctx.arc(-5, -8, 8, 0, Math.PI * 2);
      ctx.arc(6, -10, 7, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    };

    const drawLampPost = (x: number, y: number, t: number) => {
      ctx.save();
      ctx.fillStyle = '#020617';
      ctx.fillRect(x - 2, y - 26, 4, 26);
      const flicker = 0.6 + Math.sin(t / 250) * 0.1;
      ctx.fillStyle = `rgba(250, 204, 21, ${0.7 * flicker})`;
      ctx.beginPath();
      ctx.arc(x, y - 30, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.fillStyle = `rgba(250, 204, 21, ${0.25 * flicker})`;
      ctx.arc(x, y - 30, 16, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    };

    const drawCrates = (x: number, y: number) => {
      ctx.save();
      ctx.fillStyle = '#78350f';
      ctx.fillRect(x, y, 22, 18);
      ctx.strokeStyle = '#92400e';
      ctx.strokeRect(x, y, 22, 18);
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + 22, y + 18);
      ctx.moveTo(x + 22, y);
      ctx.lineTo(x, y + 18);
      ctx.stroke();
      ctx.fillStyle = '#92400e';
      ctx.fillRect(x + 16, y - 14, 18, 14);
      ctx.strokeRect(x + 16, y - 14, 18, 14);
      ctx.restore();
    };

    const drawFountain = (x: number, y: number, t: number) => {
      ctx.save();
      ctx.translate(x, y);
      ctx.fillStyle = '#1f2937';
      ctx.beginPath();
      ctx.arc(0, 0, 34, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#0ea5e9';
      ctx.beginPath();
      ctx.arc(0, 0, 26, 0, Math.PI * 2);
      ctx.fill();
      const wave = Math.sin(t / 400) * 2;
      ctx.fillStyle = '#38bdf8';
      ctx.beginPath();
      ctx.ellipse(0, wave * 0.4, 22, 10 + wave, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#e5e7eb';
      ctx.fillRect(-4, -22, 8, 18);
      ctx.beginPath();
      ctx.arc(0, -26, 8, 0, Math.PI * 2);
      ctx.fillStyle = '#0ea5e9';
      ctx.fill();
      ctx.restore();
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
      const camY = Math.max(
        0,
        Math.min(WORLD_HEIGHT - CANVAS_HEIGHT, player.y - CANVAS_HEIGHT / 2),
      );
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
      drawBuilding(260 - camX, 520 - camY, 200, 130, 'Restless Lantern Inn', 'inn');
      drawBuilding(720 - camX, 500 - camY, 230, 150, "Adventurer's Guild", 'guild');

      // Merchant stall & town square props
      drawBuilding(460 - camX, 710 - camY, 120, 60, 'Market', 'shop');
      drawCrates(430 - camX, 732 - camY);
      drawCrates(610 - camX, 738 - camY);
      drawFountain(600 - camX, 620 - camY, now);
      drawLampPost(360 - camX, 560 - camY, now);
      drawLampPost(840 - camX, 560 - camY, now);
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
      const dist = (a: { x: number; y: number }, b: { x: number; y: number }) =>
        Math.hypot(a.x - b.x, a.y - b.y);
      const nearMerchant = dist(player, MERCHANT_POS) < 120;
      const nearOrb = dist(player, ORB_POS) < 140;
      const nearGate = dist(player, EVIL_ORB_POS) < 90;
      ctx.fillStyle = '#fbbf24';
      ctx.font = 'bold 14px Arial';
      ctx.textAlign = 'center';
      if (nearMerchant)
        ctx.fillText('Press E to trade', MERCHANT_POS.x - camX, MERCHANT_POS.y - camY + 40);
      if (nearOrb) ctx.fillText('Press E to refresh', ORB_POS.x - camX, ORB_POS.y - camY + 40);
      if (nearGate)
        ctx.fillText('Press E to commune', EVIL_ORB_POS.x - camX, EVIL_ORB_POS.y - camY + 60);

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
      let x = p.x,
        y = p.y;
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
        const dist = (a: { x: number; y: number }, b: { x: number; y: number }) =>
          Math.hypot(a.x - b.x, a.y - b.y);
        // Keep interaction zones clearly separated to avoid overlap.
        const REFRESH_RADIUS = 150; // generous bubble around refresh orb
        const DUNGEON_RADIUS = 80; // slightly tighter so it never overlaps refresh zone
        const MERCHANT_RADIUS = 120;

        const refreshDistance = dist(p, ORB_POS);

        // Absolute rule: if within refresh radius, ONLY refresh (never enter dungeon)
        if (refreshDistance <= REFRESH_RADIUS) {
          if (character) {
            e.preventDefault();
            e.stopPropagation();
            void updateCharacter({ health: character.max_health, mana: character.max_mana });
          }
          return;
        }

        // Otherwise, choose between merchant and dungeon by nearest within their radii.
        // If the player is still closer to the refresh orb than the dungeon orb,
        // we intentionally do NOTHING to avoid accidental dungeon teleports when
        // skirting the edge of the circles.
        const interactions: Array<{
          kind: 'merchant' | 'dungeon';
          pos: { x: number; y: number };
          radius: number;
          handler: () => void;
        }> = [
          { kind: 'merchant', pos: MERCHANT_POS, radius: MERCHANT_RADIUS, handler: () => onOpenShop() },
          { kind: 'dungeon', pos: EVIL_ORB_POS, radius: DUNGEON_RADIUS, handler: () => onRequestDungeonEntry() },
        ];

        let nearest: (typeof interactions)[number] | null = null;
        let nearestDist = Infinity;
        for (const it of interactions) {
          const d = dist(p, it.pos);
          if (d <= it.radius && d < nearestDist) {
            nearest = it;
            nearestDist = d;
          }
        }

        // Extra safety: if the dungeon would be chosen but the player is
        // actually closer to the refresh orb than the dungeon orb, do nothing.
        if (nearest?.kind === 'dungeon') {
          const dungeonDist = dist(p, EVIL_ORB_POS);
          const refreshDist = dist(p, ORB_POS);
          if (refreshDist < dungeonDist + 40) {
            return;
          }
        }

        if (nearest) {
          e.preventDefault();
          e.stopPropagation();
          nearest.handler();
          return;
        }
      }
    };
    const handleUp = (e: KeyboardEvent) => {
      keysPressed.current[e.key] = false;
    };
    window.addEventListener('keydown', handleDown);
    window.addEventListener('keyup', handleUp);
    return () => {
      window.removeEventListener('keydown', handleDown);
      window.removeEventListener('keyup', handleUp);
    };
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
