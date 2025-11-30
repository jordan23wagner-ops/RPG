/*
  # Add stat points system

  1. Changes
    - Add `stat_points` column to characters (default 0)
    - Players earn 3 stat points per level to allocate to STR/DEX/INT
*/

ALTER TABLE characters
ADD COLUMN IF NOT EXISTS stat_points integer DEFAULT 0;
