export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      items: {
        Row: {
          id: string;
          character_id: string | null;
          name: string;
          rarity: string | null;
          affixes: Json[] | null; // jsonb array of affix objects
          created_at: string | null;
          // Add more columns as needed
        };
        Insert: {
          id?: string;
          character_id?: string | null;
          name: string;
          rarity?: string | null;
          affixes?: Json[] | null;
          created_at?: string | null;
        };
        Update: {
          id?: string;
          character_id?: string | null;
          name?: string;
          rarity?: string | null;
          affixes?: Json[] | null;
          created_at?: string | null;
        };
      };
      characters: {
        Row: {
          id: string;
          user_id: string | null;
          name: string;
          level: number | null;
          created_at: string | null;
          // Extend with stats columns if present
        };
        Insert: {
          id?: string;
          user_id?: string | null;
          name: string;
          level?: number | null;
          created_at?: string | null;
        };
        Update: {
          id?: string;
          user_id?: string | null;
          name?: string;
          level?: number | null;
          created_at?: string | null;
        };
      };
    };
    Views: {};
    Functions: {};
    Enums: {};
  };
}
