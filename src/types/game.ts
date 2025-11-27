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

export interface Affix {
  name: string;
  value: number;
  stat: 'strength' | 'dexterity' | 'intelligence' | 'health' | 'mana' | 'damage' | 'armor';
}

export interface Item {
  id: string;
  character_id: string;
  name: string;
  type: 'weapon' | 'armor' | 'helmet' | 'boots' | 'potion' | 'melee_weapon' | 'ranged_weapon' | 'mage_weapon' | 'melee_armor' | 'ranged_armor' | 'mage_armor';
  rarity: 'common' | 'magic' | 'rare' | 'legendary' | 'mythic' | 'unique';
  damage?: number;
  armor?: number;
  value: number;
  equipped: boolean;
  affixes?: Affix[];
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
  rarity: 'normal' | 'rare' | 'elite' | 'boss';
}

export interface GameSession {
  id: string;
  character_id: string;
  floor: number;
  enemies_killed: number;
  started_at: string;
  ended_at?: string;
}
