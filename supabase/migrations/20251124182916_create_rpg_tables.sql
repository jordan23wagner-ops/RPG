/*
  # RPG Game Database Schema

  1. New Tables
    - `characters`
      - `id` (uuid, primary key)
      - `user_id` (uuid, reference to auth.users)
      - `name` (text)
      - `level` (integer, default 1)
      - `experience` (integer, default 0)
      - `health` (integer, default 100)
      - `max_health` (integer, default 100)
      - `mana` (integer, default 50)
      - `max_mana` (integer, default 50)
      - `strength` (integer, default 10)
      - `dexterity` (integer, default 10)
      - `intelligence` (integer, default 10)
      - `gold` (integer, default 0)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
    
    - `items`
      - `id` (uuid, primary key)
      - `character_id` (uuid, reference to characters)
      - `name` (text)
      - `type` (text) - weapon, armor, potion, etc.
      - `rarity` (text) - common, magic, rare, legendary
      - `damage` (integer, nullable)
      - `armor` (integer, nullable)
      - `value` (integer)
      - `equipped` (boolean, default false)
      - `created_at` (timestamptz)
    
    - `game_sessions`
      - `id` (uuid, primary key)
      - `character_id` (uuid, reference to characters)
      - `floor` (integer, default 1)
      - `enemies_killed` (integer, default 0)
      - `started_at` (timestamptz)
      - `ended_at` (timestamptz, nullable)

  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated users to manage their own data
*/

CREATE TABLE IF NOT EXISTS characters (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  level integer DEFAULT 1,
  experience integer DEFAULT 0,
  health integer DEFAULT 100,
  max_health integer DEFAULT 100,
  mana integer DEFAULT 50,
  max_mana integer DEFAULT 50,
  strength integer DEFAULT 10,
  dexterity integer DEFAULT 10,
  intelligence integer DEFAULT 10,
  gold integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  character_id uuid REFERENCES characters(id) ON DELETE CASCADE,
  name text NOT NULL,
  type text NOT NULL,
  rarity text NOT NULL DEFAULT 'common',
  damage integer,
  armor integer,
  value integer DEFAULT 0,
  equipped boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS game_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  character_id uuid REFERENCES characters(id) ON DELETE CASCADE,
  floor integer DEFAULT 1,
  enemies_killed integer DEFAULT 0,
  started_at timestamptz DEFAULT now(),
  ended_at timestamptz
);

ALTER TABLE characters ENABLE ROW LEVEL SECURITY;
ALTER TABLE items ENABLE ROW LEVEL SECURITY;
ALTER TABLE game_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own characters"
  ON characters FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own characters"
  ON characters FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own characters"
  ON characters FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own characters"
  ON characters FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can view own items"
  ON items FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM characters
      WHERE characters.id = items.character_id
      AND characters.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert own items"
  ON items FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM characters
      WHERE characters.id = items.character_id
      AND characters.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update own items"
  ON items FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM characters
      WHERE characters.id = items.character_id
      AND characters.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM characters
      WHERE characters.id = items.character_id
      AND characters.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete own items"
  ON items FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM characters
      WHERE characters.id = items.character_id
      AND characters.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can view own sessions"
  ON game_sessions FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM characters
      WHERE characters.id = game_sessions.character_id
      AND characters.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert own sessions"
  ON game_sessions FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM characters
      WHERE characters.id = game_sessions.character_id
      AND characters.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update own sessions"
  ON game_sessions FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM characters
      WHERE characters.id = game_sessions.character_id
      AND characters.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM characters
      WHERE characters.id = game_sessions.character_id
      AND characters.user_id = auth.uid()
    )
  );