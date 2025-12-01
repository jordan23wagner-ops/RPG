// src/utils/lootLogic.ts
// Split-out loot-related helpers so they can be dynamically imported
// without mixing dynamic + static imports of `gameLogic`.

export { generateMerchantInventory, generateBossLoot, generateMimicLoot } from './gameLogic';
