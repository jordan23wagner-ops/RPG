// src/lib/sprites.ts
// Helper for loading enemy sprites. This follows the guidance that
// `/sprites/...` URLs are served from `public/`.

const ENEMY_SPRITE_PATHS: Record<string, string> = {
  common: '/sprites/enemies/common.png',
  rare: '/sprites/enemies/rare.png',
  elite: '/sprites/enemies/elite.png',
  boss: '/sprites/enemies/boss.png',
  mimic: '/sprites/enemies/mimic.png',
};

const enemySpriteCache: Map<string, HTMLImageElement> = new Map();

export function preloadEnemySprites(rarities: string[]): void {
  rarities.forEach((rarity) => {
    const key = rarity.toLowerCase();
    const src = ENEMY_SPRITE_PATHS[key];
    if (!src) return;
    if (enemySpriteCache.has(key)) return;

    const img = new Image();
    img.src = src;
    enemySpriteCache.set(key, img);
  });
}

export function getEnemySprite(rarity: string): HTMLImageElement | null {
  const key = rarity.toLowerCase();
  return enemySpriteCache.get(key) ?? null;
}

// Sprite manager for enemy images with fallback logic.
// Looks for /public/sprites/enemies/<key>.png then <key>.svg.
// Suggested files: common, rare, elite, boss, mimic.

const spriteCache: Record<string, HTMLImageElement | null> = {};
const pendingLoads: Record<string, Promise<HTMLImageElement>> = {};

function loadSprite(key: string, src: string): Promise<HTMLImageElement> {
  if (spriteCache[key]) return Promise.resolve(spriteCache[key]!);
  if (pendingLoads[key]) return pendingLoads[key];
  pendingLoads[key] = new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      spriteCache[key] = img;
      resolve(img);
    };
    img.onerror = (e) => {
      console.warn(`[Sprite] Failed to load ${src}`, e);
      spriteCache[key] = null;
      resolve(img); // resolve anyway so we can chain fallbacks
    };
    img.src = src;
  });
  return pendingLoads[key];
}

// Map enemy rarity or name hints to sprite file names
function resolveSpriteKey(enemy: { name: string; rarity: string }): string {
  if (/mimic/i.test(enemy.name)) return 'mimic';
  switch (enemy.rarity) {
    case 'rare': return 'rare';
    case 'elite': return 'elite';
    case 'boss': return 'boss';
    default: return 'common';
  }
}

export async function ensureEnemySprite(enemy: { name: string; rarity: string }): Promise<HTMLImageElement | null> {
  const key = resolveSpriteKey(enemy);
  // Try png first
  const pngImg = await loadSprite(key, `/sprites/enemies/${key}.png`);
  if (pngImg && pngImg.complete && pngImg.naturalWidth > 0) return pngImg;
  // Fallback to svg if png missing
  const svgKey = `${key}-svg`;
  const svgImg = await loadSprite(svgKey, `/sprites/enemies/${key}.svg`);
  if (svgImg && svgImg.complete && svgImg.naturalWidth > 0) return svgImg;
  return null;
}

export function getCachedEnemySprite(enemy: { name: string; rarity: string }): HTMLImageElement | null {
  const key = resolveSpriteKey(enemy);
  const png = spriteCache[key];
  if (png) return png;
  const svg = spriteCache[`${key}-svg`];
  return svg || null;
}

// Preload a set of enemy rarity keys (including mimic special case)
export async function preloadEnemySprites(keys: string[]) {
  for (const k of keys) {
    await ensureEnemySprite({ name: k === 'mimic' ? 'Mimic Chest' : k, rarity: k === 'mimic' ? 'common' : k });
  }
}
