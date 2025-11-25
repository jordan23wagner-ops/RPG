import { useRef, useEffect } from 'react';
import { Enemy } from '../types/game';

interface DungeonViewProps {
  enemy: Enemy | null;
  floor: number;
  onAttack: () => void;
}

export function DungeonView({ enemy, floor, onAttack }: DungeonViewProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const drawCharacter = (x: number, y: number, isPlayer: boolean) => {
      ctx.fillStyle = isPlayer ? '#4f46e5' : '#dc2626';
      ctx.shadowColor = 'rgba(0,0,0,0.5)';
      ctx.shadowBlur = 10;
      ctx.shadowOffsetY = 5;

      ctx.beginPath();
      ctx.arc(x, y - 15, 20, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = isPlayer ? '#6366f1' : '#ef4444';
      ctx.fillRect(x - 20, y + 5, 40, 35);

      ctx.fillStyle = isPlayer ? '#4f46e5' : '#dc2626';
      ctx.fillRect(x - 25, y + 5, 12, 30);
      ctx.fillRect(x + 13, y + 5, 12, 30);

      ctx.shadowColor = 'transparent';
    };

    const render = () => {
      ctx.fillStyle = '#1f2937';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      for (let x = 0; x < 10; x++) {
        for (let y = 0; y < 8; y++) {
          ctx.fillStyle = (x + y) % 2 === 0 ? '#374151' : '#2d3748';
          ctx.fillRect(x * 80, y * 75, 80, 75);
          ctx.strokeStyle = 'rgba(0,0,0,0.3)';
          ctx.lineWidth = 1;
          ctx.strokeRect(x * 80, y * 75, 80, 75);
        }
      }

      const playerX = 200;
      const playerY = 400;
      drawCharacter(playerX, playerY, true);

      if (enemy && enemy.health > 0) {
        const enemyX = 600;
        const enemyY = 200;
        drawCharacter(enemyX, enemyY, false);

        ctx.font = 'bold 16px Arial';
        ctx.fillStyle = '#ef4444';
        ctx.textAlign = 'center';
        ctx.fillText(enemy.name, enemyX, enemyY - 50);

        const healthPercent = (enemy.health / enemy.max_health) * 100;
        ctx.fillStyle = '#1f2937';
        ctx.fillRect(enemyX - 50, enemyY - 30, 100, 8);
        ctx.fillStyle = healthPercent > 30 ? '#22c55e' : '#ef4444';
        ctx.fillRect(enemyX - 50, enemyY - 30, (healthPercent / 100) * 100, 8);
        ctx.strokeStyle = '#fbbf24';
        ctx.lineWidth = 2;
        ctx.strokeRect(enemyX - 50, enemyY - 30, 100, 8);
      }

      ctx.font = 'bold 14px Arial';
      ctx.fillStyle = '#fbbf24';
      ctx.textAlign = 'left';
      ctx.fillText(`Floor ${floor}`, 20, 30);

      ctx.fillStyle = 'rgba(200,200,200,0.8)';
      ctx.font = '14px Arial';
      ctx.fillText('Click enemy or press SPACE to attack', 20, 60);
    };

    render();
  }, [enemy, floor]);

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas || !enemy || enemy.health <= 0) return;

    const rect = canvas.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;

    const enemyX = 600;
    const enemyY = 200;

    const distX = clickX - enemyX;
    const distY = clickY - enemyY;
    const distance = Math.sqrt(distX * distX + distY * distY);

    if (distance < 60) {
      onAttack();
    }
  };

  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        e.preventDefault();
        if (enemy && enemy.health > 0) {
          onAttack();
        }
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [enemy, onAttack]);

  return (
    <div className="flex flex-col gap-4 items-center">
      <canvas
        ref={canvasRef}
        width={800}
        height={600}
        onClick={handleCanvasClick}
        className="bg-gray-800 border-4 border-yellow-600 rounded-lg cursor-crosshair"
      />
    </div>
  );
}
