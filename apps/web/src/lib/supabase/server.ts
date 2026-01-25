/**
 * Supabase Server Client
 *
 * Creates a Supabase client for server-side use with proper cookie handling.
 * Uses cookies() from next/headers for session management.
 *
 * SECURITY: This file runs on the server only.
 * - Uses anon key by default for RLS-enforced operations
 * - Service role key is available but should only be used for admin operations
 */

import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';
import type { User, SupabaseClient } from '@supabase/supabase-js';

// Environment variables - may not be set during build
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

/**
 * Checks if Supabase is configured.
 * Returns false during build or when env vars are missing.
 */
export function isSupabaseConfigured(): boolean {
  return Boolean(supabaseUrl && supabaseAnonKey);
}

/**
 * Creates a Supabase client for server-side use.
 * Handles reading and writing auth cookies automatically.
 *
 * Use this in:
 * - Server Components
 * - Route Handlers (API routes)
 * - Server Actions
 *
 * Returns null if Supabase is not configured (e.g., during build).
 */
export async function createSupabaseServerClient(): Promise<SupabaseClient | null> {
  if (!supabaseUrl || !supabaseAnonKey) {
    console.warn('[supabase] Server client requested but environment variables not configured');
    return null;
  }

  const cookieStore = await cookies();

  return createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        } catch {
          // The `setAll` method was called from a Server Component.
          // This can be ignored if you have middleware refreshing user sessions.
        }
      },
    },
  });
}

/**
 * Gets the currently authenticated user from the session.
 * Returns null if not authenticated or if Supabase is not configured.
 *
 * Use this in Server Components and Route Handlers to check auth status.
 */
export async function getCurrentUser(): Promise<User | null> {
  const supabase = await createSupabaseServerClient();

  if (!supabase) {
    return null;
  }

  const { data: { user }, error } = await supabase.auth.getUser();

  if (error) {
    console.error('[auth] Error getting user:', error.message);
    return null;
  }

  return user;
}

/**
 * Gets the user ID of the currently authenticated user.
 * Returns null if not authenticated.
 *
 * Convenience wrapper around getCurrentUser() for cases
 * where only the user ID is needed.
 */
export async function getCurrentUserId(): Promise<string | null> {
  const user = await getCurrentUser();
  return user?.id ?? null;
}

/**
 * Ensures the user has a profile and settings record.
 * Creates them if they don't exist.
 *
 * Should be called on first authenticated request (e.g., in middleware or after login).
 */
export async function ensureProfileSettings(): Promise<void> {
  const supabase = await createSupabaseServerClient();

  if (!supabase) {
    return; // Supabase not configured
  }

  const user = await getCurrentUser();

  if (!user) {
    return; // Not authenticated, nothing to do
  }

  // Check if profile exists
  const { data: profile } = await supabase
    .from('profiles')
    .select('id')
    .eq('id', user.id)
    .single();

  if (!profile) {
    // Create profile
    const { error: profileError } = await supabase.from('profiles').insert({
      id: user.id,
      email: user.email,
      display_name: user.user_metadata?.display_name || user.email?.split('@')[0] || 'User',
    });

    if (profileError) {
      console.error('[auth] Error creating profile:', profileError.message);
    }
  }

  // Check if user_settings exists
  const { data: settings } = await supabase
    .from('user_settings')
    .select('user_id')
    .eq('user_id', user.id)
    .single();

  if (!settings) {
    // Create settings with defaults
    const { error: settingsError } = await supabase.from('user_settings').insert({
      user_id: user.id,
    });

    if (settingsError) {
      console.error('[auth] Error creating user settings:', settingsError.message);
    }
  }
}
