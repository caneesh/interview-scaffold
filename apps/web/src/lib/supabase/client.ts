/**
 * Supabase Browser Client
 *
 * Creates a singleton Supabase client for browser-side use.
 * Uses ONLY NEXT_PUBLIC_* environment variables for security.
 *
 * SECURITY: Never expose SUPABASE_SERVICE_ROLE_KEY here - this file runs in the browser.
 */

import { createBrowserClient } from '@supabase/ssr';

// Environment variables - may not be set during build
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

/**
 * Creates a Supabase browser client.
 * Throws an error at runtime if environment variables are not configured.
 *
 * Safe for client-side use - uses anon key only.
 */
export function createClient() {
  if (!supabaseUrl) {
    throw new Error(
      'Missing NEXT_PUBLIC_SUPABASE_URL environment variable. ' +
      'Please set it in your .env.local file.'
    );
  }

  if (!supabaseAnonKey) {
    throw new Error(
      'Missing NEXT_PUBLIC_SUPABASE_ANON_KEY environment variable. ' +
      'Please set it in your .env.local file.'
    );
  }

  return createBrowserClient(supabaseUrl, supabaseAnonKey);
}

// Lazy-initialized singleton
let _client: ReturnType<typeof createBrowserClient> | null = null;

/**
 * Gets the Supabase browser client singleton.
 * Creates the client on first access.
 */
export function getSupabaseBrowserClient() {
  if (!_client) {
    _client = createClient();
  }
  return _client;
}

/**
 * Object with getter that lazily initializes the Supabase client.
 * Use this for backward compatibility or when you need a simple import.
 */
export const supabase = {
  get auth() {
    return getSupabaseBrowserClient().auth;
  },
  from(table: string) {
    return getSupabaseBrowserClient().from(table);
  },
};
