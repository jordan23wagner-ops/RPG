/*
  # Add item requirements columns

  Add level and stat requirements to items table to support gear progression.

  1. New Columns
    - `required_level` (integer, nullable) - Minimum level to equip
    - `required_stats` (jsonb, nullable) - Required stats object with strength, dexterity, intelligence
*/

ALTER TABLE items
ADD COLUMN required_level integer,
ADD COLUMN required_stats jsonb;

-- Create index on required_level for queries
CREATE INDEX idx_items_required_level ON items(required_level);
