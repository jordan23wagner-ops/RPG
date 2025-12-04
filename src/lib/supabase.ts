import { createClient } from '@supabase/supabase-js';
import type { Database } from '../types/supabase';

const env = (import.meta as any).env || {};
const supabaseUrl = env.VITE_SUPABASE_URL as string | undefined;
const supabaseAnonKey = env.VITE_SUPABASE_ANON_KEY as string | undefined;
export const SUPABASE_AVAILABLE = !!supabaseUrl && !!supabaseAnonKey;

// When env vars are missing, fall back to a lightweight in-memory stub so the app can run offline/guest.
function createStubClient() {
  console.warn(
    '[Supabase] Missing VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY. Using in-memory stub client.',
  );

  const authStateListeners: Array<(event: string, session: any) => void> = [];
  let session: any = null;

  const makeBuilder = (table: string) => {
    let insertedRows: any[] | null = null;
    return {
      select() {
        return this;
      },
      eq() {
        return this;
      },
      order() {
        return this;
      },
      limit() {
        return this;
      },
      maybeSingle: async () => ({
        data: null,
        error: { code: 'PGRST116', message: 'No rows' } as any,
      }),
      single: async () => ({
        data:
          insertedRows && insertedRows.length > 0
            ? insertedRows[0]
            : null,
        error: null,
      }),
      insert: (rows: any) => {
        const rowArray = Array.isArray(rows) ? rows : [rows];
        insertedRows = rowArray.map((r: any) => ({
          id: r.id || `${table}-${Date.now()}`,
          ...r,
        }));
        return {
          select: () => ({
            single: async () => ({
              data: insertedRows ? insertedRows[0] : null,
              error: null,
            }),
            maybeSingle: async () => ({
              data: insertedRows ? insertedRows[0] : null,
              error: null,
            }),
          }),
        };
      },
      update: () => makeBuilder(table),
      delete: () => makeBuilder(table),
    };
  };

  return {
    auth: {
      getSession: async () => ({ data: { session }, error: null }),
      onAuthStateChange: (callback: (event: string, session: any) => void) => {
        authStateListeners.push(callback);
        return {
          data: {
            subscription: {
              unsubscribe: () => {
                const idx = authStateListeners.indexOf(callback);
                if (idx >= 0) authStateListeners.splice(idx, 1);
              },
            },
          },
        };
      },
      getUser: async () => ({ data: { user: session?.user || null }, error: null }),
      signUp: async ({ email }: { email: string }) => {
        session = { user: { id: `stub-user-${Date.now()}`, email } };
        authStateListeners.forEach((cb) => cb('SIGNED_IN', session));
        return { data: { user: session.user }, error: null };
      },
      signInWithPassword: async ({ email }: { email: string }) => {
        session = { user: { id: `stub-user-${Date.now()}`, email } };
        authStateListeners.forEach((cb) => cb('SIGNED_IN', session));
        return { data: { session }, error: null };
      },
      signOut: async () => {
        session = null;
        authStateListeners.forEach((cb) => cb('SIGNED_OUT', null));
        return { error: null };
      },
    },
    from: (table: string) => makeBuilder(table),
  } as any;
}

// Singleton client (real or stub)
export const supabase = SUPABASE_AVAILABLE
  ? createClient<Database>(supabaseUrl as string, supabaseAnonKey as string)
  : createStubClient();

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
