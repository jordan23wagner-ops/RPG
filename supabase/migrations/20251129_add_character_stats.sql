/*
  # Add new character stats

  1. Changes
    - Add `speed` column to characters (default 5)
    - Add `crit_chance` column to characters (default 5.0)
    - Add `crit_damage` column to characters (default 150.0)
*/

ALTER TABLE characters
ADD COLUMN IF NOT EXISTS speed integer DEFAULT 5,
ADD COLUMN IF NOT EXISTS crit_chance numeric(5,2) DEFAULT 5.0,
ADD COLUMN IF NOT EXISTS crit_damage numeric(6,2) DEFAULT 150.0;
