/**
 * Supabase client factory.
 */

import { createClient as createSupabaseClient, SupabaseClient } from '@supabase/supabase-js';

export interface SupabaseConfig {
  url: string;
  anonKey: string;
  serviceRoleKey?: string;
}

export function createClient(config: SupabaseConfig): SupabaseClient {
  return createSupabaseClient(config.url, config.anonKey, {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
    },
  });
}

export function createServiceClient(config: SupabaseConfig): SupabaseClient {
  if (!config.serviceRoleKey) {
    throw new Error('Service role key required for service client');
  }
  return createSupabaseClient(config.url, config.serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
