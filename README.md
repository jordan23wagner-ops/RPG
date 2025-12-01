# Dark Dungeon RPG

A browser-based roguelike dungeon crawler with advanced loot systems, progression mechanics, and dynamic difficulty scaling.

## Features

### Town Hub & Dungeon Entry
- Start in a peaceful town with interactive NPCs
- **Orb of Refreshment**: Instant health restoration (75g)
- **Dungeon Orb**: Dark portal allowing direct floor selection to unlocked milestones
- **Merchant NPC**: Rotating inventory with exclusive rare items

### Floor Selection & Progression
- Unlock milestone floors (every 5 floors) by completing them
- **Direct Descent**: Jump to any unlocked milestone (1, 5, 10, 15, etc.)
- Progress persists via `max_floor` tracking in database
- Visual milestone unlock effect when reaching new depths
- Loot tier hints for each selectable floor

### Zone Heat & Dynamic Difficulty
- **Zone Heat** (0-100): Increases with kills, decays over time
  - Normal enemies: +3 heat
  - Rare enemies: +8 heat
  - Elite enemies: +15 heat
  - Boss enemies: +30 heat
  - Passive decay: -1 heat every 15 seconds
- Heat amplifies enemy strength (up to +100% at max heat)
- Higher heat = better loot quality and increased set-item chances

### Loot System Overhaul
- **Combat Drops**: Rare+ items only (common/magic removed from dungeon loot)
- **Merchant Exclusive**: Common and magic items available only through shop
- **Rotating Merchant Inventory**:
  - 3 random items every 15 minutes (deterministic time buckets)
  - Small chance for Legendary/Mythic/Radiant items
  - Live countdown timer showing next rotation
  - Purchased items removed until next rotation
- **Boss & Mimic Loot**: Guaranteed rare+ drops with increased quantities
- **Set Items**: Rare drops with powerful bonuses when equipped together
- **Affixes**: Randomized stat bonuses on higher-tier items

### Combat & Character Development
- Turn-based combat with critical hits (chance + damage scaling)
- Stat allocation: STR (damage, HP), DEX (speed, crit), INT (mana, crit)
- Equipment slots: Weapon, Helmet, Armor, Gloves, Boots, Belt, Rings, Amulet, Trinket
- **Two-Handed Weapons**: Prevent off-hand equipping
- **Potion System**: Health potions with 3-second cooldown

### Persistence & Authentication
- Supabase backend for character, items, and progression
- Guest mode with local storage fallback
- Real-time inventory updates and purchases

## Tech Stack
- **Frontend**: React + TypeScript + Vite
- **Canvas Rendering**: Town and dungeon scenes
- **State Management**: React Context API
- **Backend**: Supabase (PostgreSQL)
- **Styling**: TailwindCSS
- **Linting**: ESLint + Prettier
- **Git Hooks**: Husky + lint-staged

## Development

```bash
npm install
npm run dev
```

## Deployment
Hosted on Vercel with automatic builds from `main` branch.

## Recent Updates
- ✅ Renamed potion handler (`usePotion` → `consumePotion`)
- ✅ Fixed duplicate export bugs in TownScene
- ✅ Removed `@ts-nocheck`, added proper type assertions
- ✅ Merchant countdown timer (mm:ss until next rotation)
- ✅ Milestone unlock visual effects
- ✅ Floor selection overlay with loot/difficulty hints

