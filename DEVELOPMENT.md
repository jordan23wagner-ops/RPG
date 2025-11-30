# Development Guide

## Overview
This project is a React + TypeScript + Vite RPG prototype with a canvas-based dungeon view and pixel-art character renderer. Equipment affects the on-canvas avatar visually via colored overlays.

## Character Rendering Pipeline
File: `src/components/DungeonView.tsx`
- Modular helpers: `drawHead`, `drawBody`, `drawArms`, `drawLegs`, `drawBoots`, `drawEquipmentOverlay`.
- `drawCharacter` now receives a precomputed `equipped` map (no hooks inside render helpers to satisfy rules-of-hooks).
- Equipment colors and shapes centralized in `src/utils/equipmentVisuals.ts`.

## Equipment Visual Mapping
File: `src/utils/equipmentVisuals.ts`
- `EQUIPMENT_VISUALS` maps each slot to a color/shape descriptor.
- `ITEM_TYPE_TO_SLOT` links item types → equipment slots.
- Extend visuals by adding new slots or shapes here without touching the renderer.

## Adding A New Equipment Slot
1. Add slot name to `EquipmentSlot` union in `src/types/game.ts`.
2. Add visual entry to `EQUIPMENT_VISUALS`.
3. Map any new item types in `ITEM_TYPE_TO_SLOT`.
4. Ensure items created (loot or seeded) use the correct `type`.

## Debug / Rapid Testing
- Equip/Unequip all button in `GameUI.tsx` to visualize overlays quickly.
- `CharacterVisualTest.tsx` harness allows toggling each slot independently.

## Linting & Formatting
- ESLint config: `.eslintrc.json` (TypeScript + React).
- Prettier config: `.prettierrc`.
- Scripts:
  - `npm run lint` / `npm run lint:fix`
  - `npm run format` / `npm run format:check`
- Husky + lint-staged enforce formatting & lint on staged files (`pre-commit`).

## Pre-Commit Hook
- File: `.husky/pre-commit` runs `npx lint-staged`.
- To disable temporarily: run with `HUSKY=0 git commit -m "msg"`.

## TypeScript Notes
- Pinned to `5.5.x` for @typescript-eslint compatibility (<5.6.0).
- Avoid using hooks inside non-component functions. Pass computed data as parameters.

## Common Tasks
| Task | Where |
|------|-------|
| Add new loot type | `src/types/game.ts` + `utils/gameLogic.ts` |
| Adjust enemy visuals | `getEnemyVisual` in `DungeonView.tsx` |
| Add stat scaling to equipment | `utils/gameLogic.ts` (affix generation / slot logic) |
| Modify color palette | `equipmentVisuals.ts` |

## Minimizing Re-Renders
- Canvas loop uses refs for position/state to avoid 60fps React state churn.
- When adding new animated entities, prefer refs + imperative draw functions.

## Future Improvement Ideas
- Replace color blocks with sprite sheet layering.
- Add weapon class animations (swing arcs, projectile previews).
- Introduce damage type tinting (fire/ice/lightning overlays).

## Quick Commands
```bash
npm install          # install deps
npm run dev          # start Vite dev server
npm run lint:fix     # auto-fix lint issues
npm run format       # apply Prettier
```

## Contributing Workflow
1. Branch from `main`: `git checkout -b feature/short-description`.
2. Implement change + ensure `npm run lint:fix && npm run format` pass.
3. Commit (hook runs automatically). If failure: fix & recommit.
4. Open PR for review (future process).

---
Feel free to extend this doc as systems evolve.
