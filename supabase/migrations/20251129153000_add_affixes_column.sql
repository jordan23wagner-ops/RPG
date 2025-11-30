-- Migration: Add affixes JSONB column to items
-- Timestamp: 2025-11-29 15:30:00
-- Adds a JSONB column to persist generated item affixes.

ALTER TABLE items
ADD COLUMN IF NOT EXISTS affixes jsonb DEFAULT '[]'::jsonb;

-- Optional: future indexing example (commented out)
-- CREATE INDEX IF NOT EXISTS items_affixes_gin_idx ON items USING GIN (affixes);
