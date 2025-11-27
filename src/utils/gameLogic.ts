export function generateLoot(
  enemyLevel: number,
  floor: number,
  enemyRarity: 'normal' | 'rare' | 'elite' | 'boss' = 'normal',
): Partial<Item> | null {
  // 🔸 No more "no drop" roll here – we always generate *something*

  const rarityRoll = Math.random();
  let rarity: 'common' | 'magic' | 'rare' | 'legendary' | 'mythic' | 'unique';

  if (enemyRarity === 'normal') {
    if (rarityRoll < 0.5) rarity = 'common';
    else if (rarityRoll < 0.75) rarity = 'magic';
    else if (rarityRoll < 0.9) rarity = 'rare';
    else if (rarityRoll < 0.98) rarity = 'legendary';
    else if (rarityRoll < 0.99) rarity = 'mythic';
    else rarity = 'unique';
  } else if (enemyRarity === 'rare') {
    if (rarityRoll < 0.2) rarity = 'common';
    else if (rarityRoll < 0.5) rarity = 'magic';
    else if (rarityRoll < 0.8) rarity = 'rare';
    else if (rarityRoll < 0.95) rarity = 'legendary';
    else if (rarityRoll < 0.99) rarity = 'mythic';
    else rarity = 'unique';
  } else if (enemyRarity === 'elite') {
    if (rarityRoll < 0.1) rarity = 'common';
    else if (rarityRoll < 0.3) rarity = 'magic';
    else if (rarityRoll < 0.65) rarity = 'rare';
    else if (rarityRoll < 0.92) rarity = 'legendary';
    else if (rarityRoll < 0.98) rarity = 'mythic';
    else rarity = 'unique';
  } else {
    // boss
    if (rarityRoll < 0.05) rarity = 'common';
    else if (rarityRoll < 0.15) rarity = 'magic';
    else if (rarityRoll < 0.5) rarity = 'rare';
    else if (rarityRoll < 0.8) rarity = 'legendary';
    else if (rarityRoll < 0.95) rarity = 'mythic';
    else rarity = 'unique';
  }

  const rarityMultiplier = {
    common: 1,
    magic: 1.3,
    rare: 1.8,
    legendary: 2.5,
    mythic: 3.5,
    unique: 5,
  }[rarity];

  const isWeapon = Math.random() > 0.4;

  if (isWeapon) {
    const weaponClassRoll = Math.random();
    let weaponType: 'melee_weapon' | 'ranged_weapon' | 'mage_weapon';
    let weaponList: string[];
    let prefixList: string[];

    if (weaponClassRoll < 0.5) {
      weaponType = 'melee_weapon';
      weaponList = meleeWeapons;
      prefixList = weaponPrefixes.melee;
    } else if (weaponClassRoll < 0.75) {
      weaponType = 'ranged_weapon';
      weaponList = rangedWeapons;
      prefixList = weaponPrefixes.ranged;
    } else {
      weaponType = 'mage_weapon';
      weaponList = mageWeapons;
      prefixList = weaponPrefixes.mage;
    }

    const prefix = prefixList[Math.floor(Math.random() * prefixList.length)];
    const weapon = weaponList[Math.floor(Math.random() * weaponList.length)];
    const damage = Math.floor(
      (5 + enemyLevel * 2 + Math.random() * 10) * rarityMultiplier,
    );
    const affixes = getRandomAffixes(weaponType, rarity);

    return {
      name: `${prefix} ${weapon}`,
      type: weaponType,
      rarity,
      damage,
      value: Math.floor(damage * 5 * rarityMultiplier),
      equipped: false,
      affixes,
    };
  } else {
    const isPotion = Math.random() > 0.7;

    if (isPotion) {
      return {
        name: 'Health Potion',
        type: 'potion',
        rarity: 'common',
        value: 50,
        equipped: false,
      };
    }

    const armorClassRoll = Math.random();
    let armorType: 'melee_armor' | 'ranged_armor' | 'mage_armor';
    let prefixList: string[];
    let armorSlot: 'armor' | 'helmet' | 'boots';

    const slotRoll = Math.random();
    if (slotRoll < 0.33) armorSlot = 'armor';
    else if (slotRoll < 0.66) armorSlot = 'helmet';
    else armorSlot = 'boots';

    if (armorClassRoll < 0.5) {
      armorType = 'melee_armor';
      prefixList = armorPrefixes.melee;
    } else if (armorClassRoll < 0.75) {
      armorType = 'ranged_armor';
      prefixList = armorPrefixes.ranged;
    } else {
      armorType = 'mage_armor';
      prefixList = armorPrefixes.mage;
    }

    const prefix = prefixList[Math.floor(Math.random() * prefixList.length)];
    const armor = Math.floor(
      (3 + enemyLevel * 1.5 + Math.random() * 5) * rarityMultiplier,
    );
    const affixes = getRandomAffixes(armorType, rarity);

    return {
      name: `${prefix} ${armorSlot
        .charAt(0)
        .toUpperCase()}${armorSlot.slice(1)}`,
      type: armorType,
      rarity,
      armor,
      value: Math.floor(armor * 8 * rarityMultiplier),
      equipped: false,
      affixes,
    };
  }
}
