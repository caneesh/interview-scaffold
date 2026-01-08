/**
 * Adapter initialization for the web application.
 * This file sets up all the adapters with their dependencies.
 */

import { createClient } from '@supabase/supabase-js';
import { TenantId } from '@scaffold/core';
import { SupabaseContentRepo, SupabaseProgressRepo } from '@scaffold/adapter-db';
import { SupabaseAuthContext } from '@scaffold/adapter-auth';
import { SupabaseEventSink, BufferedEventSink } from '@scaffold/adapter-analytics';
import { createProxiedClaudeProvider, CachedLLMProvider, InMemoryCacheStore } from '@scaffold/adapter-llm';
import { SystemClock } from '@scaffold/core';

// Environment variables (should be in .env.local)
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '';
const DEFAULT_TENANT_ID = TenantId(process.env.NEXT_PUBLIC_DEFAULT_TENANT_ID ?? 'default');

// Create Supabase client
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Create adapters
export const contentRepo = new SupabaseContentRepo(supabase);
export const progressRepo = new SupabaseProgressRepo(supabase);

export const authContext = new SupabaseAuthContext(supabase, {
  defaultTenantId: DEFAULT_TENANT_ID,
});

const rawEventSink = new SupabaseEventSink(supabase);
export const eventSink = new BufferedEventSink(rawEventSink, {
  maxBufferSize: 20,
  flushIntervalMs: 10000,
});

// LLM provider (uses proxy for browser safety)
const rawLLMProvider = createProxiedClaudeProvider('/api/llm');
export const llmProvider = new CachedLLMProvider(
  rawLLMProvider,
  new InMemoryCacheStore(),
  { defaultTtlMs: 24 * 60 * 60 * 1000 }
);

// Clock
export const clock = SystemClock;

// Default tenant ID
export const tenantId = DEFAULT_TENANT_ID;
