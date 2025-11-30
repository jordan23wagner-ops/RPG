import React, { useRef, useEffect, useState } from 'react';
import { EQUIPMENT_VISUALS, ITEM_TYPE_TO_SLOT } from '../utils/equipmentVisuals';
import { Item, Character } from '../types/game';
import { useGame } from '../contexts/GameContext';

// Minimal pixel art character renderer (copied from DungeonView modular version)
function drawCharacter(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  equipped: Record<string, boolean>,
  isPlayer: boolean,
) {
  // Modularized helpers (inline for test harness)
  const drawHead = () => {
    ctx.fillStyle = '#fcd7b6';
    ctx.fillRect(x - 4, y - 18, 8, 8);
    if (equipped.helmet) {
      ctx.fillStyle = EQUIPMENT_VISUALS.helmet.color;
      ctx.fillRect(x - 4, y - 18, 8, 5);
    }
    ctx.fillStyle = '#7c4700';
    ctx.fillRect(x - 4, y - 18, 8, 4);
    ctx.fillStyle = '#222';
    ctx.fillRect(x - 2, y - 15, 2, 2);
    ctx.fillRect(x + 1, y - 15, 2, 2);
    ctx.fillStyle = '#a94442';
    ctx.fillRect(x - 1, y - 11, 2, 1);
  };
  const drawBody = () => {
    ctx.fillStyle = isPlayer ? '#4f46e5' : '#dc2626';
    ctx.fillRect(x - 4, y - 10, 8, 10);
    if (equipped.chest) {
      ctx.fillStyle = EQUIPMENT_VISUALS.chest.color;
      ctx.fillRect(x - 4, y - 10, 8, 10);
    }
  };
  const drawArms = () => {
    ctx.fillStyle = isPlayer ? '#4f46e5' : '#dc2626';
    ctx.fillRect(x - 7, y - 10, 3, 9);
    ctx.fillRect(x + 4, y - 10, 3, 9);
    if (equipped.gloves) {
      ctx.fillStyle = EQUIPMENT_VISUALS.gloves.color;
      ctx.fillRect(x - 7, y - 1, 3, 3);
      ctx.fillRect(x + 4, y - 1, 3, 3);
    }
  };
  const drawLegs = () => {
    ctx.fillStyle = '#22223b';
    ctx.fillRect(x - 4, y, 3, 8);
    ctx.fillRect(x + 1, y, 3, 8);
    if (equipped.legs) {
      ctx.fillStyle = EQUIPMENT_VISUALS.legs.color;
      ctx.fillRect(x - 4, y, 3, 8);
      ctx.fillRect(x + 1, y, 3, 8);
    }
  };
  const drawBoots = () => {
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
  const drawEquipmentOverlay = () => {
    if (equipped.weapon) {
      ctx.fillStyle = EQUIPMENT_VISUALS.weapon.color;
      ctx.fillRect(x + 6, y - 2, 2, 12);
      ctx.fillStyle = '#f3f4f6';
      ctx.fillRect(x + 6, y - 2, 2, 3);
    }
    if (equipped.shield) {
      ctx.fillStyle = EQUIPMENT_VISUALS.shield.color;
      ctx.beginPath();
      ctx.ellipse(x - 8, y - 2, 3, 6, 0, 0, 2 * Math.PI);
      ctx.fill();
    }
  };
  drawEquipmentOverlay();
  drawHead();
  drawBody();
  drawArms();
  drawLegs();
  drawBoots();
}

// Test harness component
export default function CharacterVisualTest() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { items } = useGame();
  const [equipped, setEquipped] = useState<Record<string, boolean>>({});

  // Generate all slot combinations for test
  const slots = Object.keys(EQUIPMENT_VISUALS);

  // Redraw on equipped change
  useEffect(() => {
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, 120, 120);
    drawCharacter(ctx, 60, 70, equipped, true);
  }, [equipped]);

  // UI: toggle each slot
  return (
    <div>
      <canvas ref={canvasRef} width={120} height={120} className="bg-gray-800 rounded mb-3 border border-gray-700" />
      <div className="flex flex-wrap gap-2 mb-2">
        {slots.map(slot => (
          <button
            key={slot}
            onClick={() => setEquipped(e => ({ ...e, [slot]: !e[slot] }))}
            className={`px-2 py-1 rounded text-[10px] tracking-wide font-semibold transition ${equipped[slot] ? 'bg-blue-600 text-white shadow' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}`}
          >
            {slot}
          </button>
        ))}
      </div>
      <div className="text-[10px] text-gray-400">Toggle equipment slots to preview overlays.</div>
    </div>
  );
}
