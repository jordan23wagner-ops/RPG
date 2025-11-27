export function generateEnemy(floor: number, playerLevel: number): Enemy {
  const level = playerLevel + Math.floor(floor / 3);
  const baseName = enemyNames[Math.floor(Math.random() * enemyNames.length)];

  const rarityRoll = Math.random();
  let rarity: 'normal' | 'rare' | 'elite' | 'boss';
  let multiplier = 1;
  let titlePrefix = '';

  if (rarityRoll < 0.7) {
    rarity = 'normal';
    multiplier = 1;
  } else if (rarityRoll < 0.9) {
    rarity = 'rare';
    multiplier = 1.5;
    titlePrefix = 'Rare ';
  } else if (rarityRoll < 0.98) {
    rarity = 'elite';
    multiplier = 2.5;
    titlePrefix = 'Elite ';
  } else {
    rarity = 'boss';
    multiplier = 4;
    titlePrefix = 'Boss ';
  }

  const maxHealth = Math.floor(
    (30 + level * 15 + Math.floor(Math.random() * 20)) * multiplier,
  );
  const damage = Math.floor((5 + level * 3) * multiplier);
  const experience = Math.floor((20 + level * 10) * multiplier);
  const gold = Math.floor(
    (10 + level * 5 + Math.floor(Math.random() * 20)) * multiplier,
  );

  return {
    id: Math.random().toString(36).substr(2, 9),
    name: `${titlePrefix}${baseName} (Lvl ${level})`,
    health: maxHealth,
    max_health: maxHealth,
    damage,
    experience,
    gold,
    level,
    rarity,
  };
}
