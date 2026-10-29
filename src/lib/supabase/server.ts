import { createServerClient as createSupabaseServerClientSSR, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';
import type { Database } from '@/src/types/database.types';

/**
 * Server Component & Server Action Supabase client typed with Database interface.
 * Reads and manages user session cookies with SSR cookie storage.
 */
export async function createServerClient() {
  const cookieStore = await cookies();

  return createSupabaseServerClientSSR<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options?: CookieOptions }[]) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Ignored when called in Server Components where cookies cannot be written
          }
        },
      },
    }
  );
}

/** Alias for compatibility with existing imports */
export const createSupabaseServerClient = createServerClient;
export const createClient = createServerClient;
