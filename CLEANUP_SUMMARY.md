# DungeonView.tsx Cleanup - Proposed Changes

## Summary of Changes

### 1. **Removed Unused Imports**
- ✅ No unused imports were found - `useRef` and `useEffect` are both actively used throughout the file

### 2. **Code Smell Fixes**

#### Issue: Inconsistent Indentation
**Before:**
```tsx
  }, []);

// ---------- Keyboard handlers ----------
useEffect(() => {
  // Improperly indented - missing leading spaces
```

**After:**
```tsx
  }, []);

  // ========== KEYBOARD INPUT HANDLER ==========
  useEffect(() => {
    // Properly indented with 2 spaces
```

#### Issue: Magic Numbers Scattered Throughout
**Before:**
```tsx
const ATTACK_COOLDOWN_MS = 400;
// ... later in enemy chase loop:
const MAX_CHASE_DISTANCE = 450;
const ENEMY_SPEED = 2.2;
// ... later in attack handler:
if (distance < 120) { // hardcoded attack range
```

**After:**
```tsx
// All constants consolidated at the top with clear organization:
const ATTACK_COOLDOWN_MS = 400;
const ATTACK_RANGE = 120;
const MAX_CHASE_DISTANCE = 450;
const ENEMY_SPEED = 2.2;
const MIN_PLAYER_ENEMY_DISTANCE = 10;

// Then used consistently throughout:
if (distance > MIN_PLAYER_ENEMY_DISTANCE && distance < MAX_CHASE_DISTANCE) {
if (distance < ATTACK_RANGE) {
```

#### Issue: Unclear Variable Names
**Before:**
```tsx
const barWidth = 120;
const barHeight = 5;
const barX = 20;
const barY = 65;
const percent = remaining / ATTACK_COOLDOWN_MS;
```

**After:**
```tsx
const barWidth = 120;
const barHeight = 5;
const barX = 20;
const barY = 65;
const cooldownPercent = remaining / ATTACK_COOLDOWN_MS; // More descriptive
```

### 3. **Main Game Loop - Clarity & Comments**

#### Before:
- Mixed section dividers using different comment styles
- Minimal inline documentation
- Unclear organization of parallel game loops

#### After:
- **Consistent section headers** using `// ========== SECTION NAME ==========` format
- **Clear section breakdown:**
  1. Game Constants (grouped by category)
  2. Game State (refs with detailed comments)
  3. Prop Synchronization (explains why this pattern is used)
  4. Drawing Helpers
  5. Main Render Loop (with detailed subsection comments)
  6. Player Movement Loop
  7. Enemy AI Loop
  8. Keyboard Input Handler
  9. Component Render

#### Example improvement in render loop:

**Before:**
```tsx
// Background
ctx.fillStyle = '#1a1a2e';
ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

// Stones
ctx.fillStyle = '#16213e';
// ...
```

**After:**
```tsx
// === Background ===
ctx.fillStyle = '#1a1a2e';
ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

// === Environment (decorative stones) ===
ctx.fillStyle = '#16213e';
// ... with inline subsection comments for clarity
```

### 4. **Improved Comments for Game Logic**

#### Added explanations for complex concepts:

1. **Ref-based state management:**
   ```tsx
   // ========== REF STORAGE FOR GAME STATE ==========
   // Using refs to avoid 60fps React re-renders and maintain state across frames
   ```

2. **Attack cooldown logic:**
   ```tsx
   const handleKeyDown = (e: KeyboardEvent) => {
     // Ignore key-repeat events when holding Space to prevent rapid repeated attacks
     if (e.repeat) return;
     
     const now = Date.now();
     // Only allow attack if cooldown has elapsed
     if (now < nextAttackTimeRef.current) return;
   ```

3. **Enemy chase AI:**
   ```tsx
   // Chase logic: move toward player if in range and not already colliding
   if (distance > MIN_PLAYER_ENEMY_DISTANCE && distance < MAX_CHASE_DISTANCE) {
     const nx = dx / distance; // normalize x
     const ny = dy / distance; // normalize y
   ```

### 5. **Constants Organization**

**Grouped by functionality:**
```tsx
// Canvas rendering dimensions
const CANVAS_WIDTH = 1000;
const CANVAS_HEIGHT = 600;

// Player movement configuration
const MOVE_SPEED = 5;
const BOUNDARY_PADDING = 50;

// Combat system configuration
const ATTACK_COOLDOWN_MS = 400;
const ATTACK_RANGE = 120;

// Enemy AI configuration
const MAX_CHASE_DISTANCE = 450;
const ENEMY_SPEED = 2.2;
const MIN_PLAYER_ENEMY_DISTANCE = 10;
```

## Benefits

✅ **Removed indentation inconsistency** - entire file now uses consistent 2-space indentation  
✅ **All magic numbers extracted** - easier to tune game balance  
✅ **Clear game loop organization** - easy to understand frame-based architecture  
✅ **Better documentation** - explains *why* design decisions were made (e.g., ref usage)  
✅ **Improved readability** - consistent formatting makes code flow easier to follow  
✅ **No logic changes** - all refactoring is non-functional (no behavior changes)  

## File Location
- **Cleaned version**: `src/components/DungeonView_cleaned.tsx`
- **Ready to replace original**: `src/components/DungeonView.tsx`
