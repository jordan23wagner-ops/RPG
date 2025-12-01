-- Migration: add max_floor column to characters
ALTER TABLE characters ADD COLUMN IF NOT EXISTS max_floor integer NOT NULL DEFAULT 1;
-- Backfill for existing rows (in case NULLs existed before NOT NULL enforced)
UPDATE characters SET max_floor = COALESCE(max_floor, 1);
