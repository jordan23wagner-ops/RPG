export interface Character {
  id: string;
  user_id: string;
  name: string;
  level: number;
  experience: number;
  health: number;
  max_health: number;
  mana: number;
  max_mana: number;
  strength: number;
  dexterity: number;
  intelligence: number;
  gold: number;
  created_at: string;
  updated_at: string;
}

export interface Item {
  id: string;
  character_id: string;
  name: string;
  type: 'weapon' | 'armor' | 'helmet' | 'boots' | 'potion';
  rarity: 'common' | 'magic' | 'rare' | 'legendary';
  damage?: number;
  armor?: number;
  value: number;
  equipped: boolean;
  created_at: string;
}

export interface Enemy {
  id: string;
  name: string;
  health: number;
  max_health: number;
  damage: number;
  experience: number;
  gold: number;
  level: number;
}

export interface GameSession {
  id: string;
  character_id: string;
  floor: number;
  enemies_killed: number;
  started_at: string;
  ended_at?: string;
}
