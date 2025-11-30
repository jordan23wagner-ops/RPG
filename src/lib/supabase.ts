import { createClient } from '@supabase/supabase-js';
import type { Database } from '../types/supabase';

const env = (import.meta as any).env || {};
const supabaseUrl = env.VITE_SUPABASE_URL as string | undefined;
const supabaseAnonKey = env.VITE_SUPABASE_ANON_KEY as string | undefined;

// Basic safety checks to avoid accidental misconfig or key exposure
if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

// Ensure the URL looks like a Supabase project URL
const isValidUrl = typeof supabaseUrl === 'string' && /^https:\/\/.+supabase\.co\/?$/.test(supabaseUrl.trim());
if (!isValidUrl) {
  throw new Error('Invalid VITE_SUPABASE_URL format. Expected https://<project>.supabase.co');
}

// Redact anon key in potential error surfaces by not logging it directly anywhere
// (Supabase client does not log keys by default; this is defensive.)

// Singleton client
export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey);

// Optional getter that can be used where lazy init is preferred
export function getSupabaseClient() {
  return supabase;
}

// For future: If you generate database types via
//   npx supabase gen types typescript --project-id <id> --schema public > src/types/supabase.ts
// you can switch to a typed client:
//   import type { Database } from '@/types/supabase';
//   export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey);
// Keep this comment as guidance without introducing a hard dependency.
