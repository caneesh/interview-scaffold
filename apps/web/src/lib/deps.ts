/**
 * Dependency injection - wires adapters to core ports
 * This is the only place where adapters are instantiated
 *
 * Environment-Driven Behavior:
 * - DATABASE_URL: Optional - uses in-memory repos if not set (dev mode)
 * - ANTHROPIC_API_KEY: Optional - enables LLM validation when set
 * - PISTON_API_URL: Optional - defaults to local Piston instance
 *
 * When optional services are unavailable:
 * - Database unavailable: Uses in-memory repos with seed data (18 problems)
 * - LLM validation disabled: Deterministic validation still works
 * - Piston unavailable: Code submission returns a clean error with retry advice
 */

import { randomUUID } from 'crypto';
import { createDemoAuthProvider } from '@scaffold/adapter-auth';
import { createConsoleEventSink } from '@scaffold/adapter-analytics';
import { createLLMClient, createLLMValidationAdapter, createNullLLMValidation } from '@scaffold/adapter-llm';
import { createPistonExecutor, createPistonClient, type PistonClient } from '@scaffold/adapter-piston';
import { SystemClock, createNullSocraticCoach } from '@scaffold/core/ports';
import type {
  AttemptRepo,
  SkillRepo,
  ContentRepo,
  EventSink,
  Clock,
  IdGenerator,
  ContentBankRepoPort,
  SubmissionsRepoPort,
  EvaluationsRepoPort,
  UnifiedAICoachRepoPort,
  SocraticCoachPort,
} from '@scaffold/core/ports';
import type { LLMValidationPort } from '@scaffold/core/validation';
import type { CodeExecutor } from '@scaffold/core/use-cases';
import { inMemoryAttemptRepo, inMemorySkillRepo, inMemoryContentRepo } from './in-memory-repos';
import {
  createInMemoryContentBankRepo,
  createInMemorySubmissionsRepo,
  createInMemoryEvaluationsRepo,
  createInMemoryAICoachRepo,
  createInMemoryTrackAttemptRepo,
  type TrackAttemptRepo,
} from './in-memory-track-repos';

// Always use in-memory repos for local development
// Database integration can be re-enabled by restoring the adapter-db imports
console.log('[deps] Using in-memory repositories with seed data (18 problems available)');

// Repositories - in-memory implementation using seed data
export const attemptRepo: AttemptRepo = inMemoryAttemptRepo;
export const skillRepo: SkillRepo = inMemorySkillRepo;
export const contentRepo: ContentRepo = inMemoryContentRepo;

// Event sink
export const eventSink: EventSink = createConsoleEventSink();

// Clock
export const clock: Clock = SystemClock;

// ID Generator - uses proper UUIDs for database compatibility
export const idGenerator: IdGenerator = {
  generate: () => randomUUID(),
};

// Auth provider factory
export function getAuthProvider(tenantId: string, userId: string) {
  return createDemoAuthProvider(tenantId, userId);
}

// LLM Client (optional - only created if API key is set)
const llmClient = process.env.ANTHROPIC_API_KEY
  ? createLLMClient(process.env.ANTHROPIC_API_KEY)
  : null;

/**
 * Check if LLM validation is enabled (API key is set)
 */
export const isLLMEnabled = (): boolean => llmClient !== null;

/**
 * Creates an LLM validation port for a specific problem.
 * Returns null validation if LLM is disabled (no API key).
 */
export function getLLMValidation(problemStatement: string): LLMValidationPort {
  if (!llmClient) {
    return createNullLLMValidation();
  }
  return createLLMValidationAdapter(llmClient, problemStatement);
}

// Piston client for direct API access (used for trace execution)
export const pistonClient: PistonClient = createPistonClient({
  baseUrl: process.env.PISTON_API_URL,
});

// Code executor - uses Piston API for sandboxed execution
export const codeExecutor: CodeExecutor = createPistonExecutor({
  baseUrl: process.env.PISTON_API_URL,
  runTimeout: 5000,
  compileTimeout: 15000,
});

// ============ TrackC: New unified content bank repositories ============

// Content Bank Repository - stores content items and versions
export const contentBankRepo: ContentBankRepoPort = createInMemoryContentBankRepo();

// Submissions Repository - stores user submissions
export const submissionsRepo: SubmissionsRepoPort = createInMemorySubmissionsRepo();

// Evaluations Repository - stores evaluation runs and results
export const evaluationsRepo: EvaluationsRepoPort = createInMemoryEvaluationsRepo();

// AI Coach Repository - stores AI feedback and Socratic turns
export const aiCoachRepo: UnifiedAICoachRepoPort = createInMemoryAICoachRepo();

// Track Attempt Repository - stores track-based attempts
export const trackAttemptRepo: TrackAttemptRepo = createInMemoryTrackAttemptRepo();

// Socratic Coach - AI-powered coaching (uses null implementation if no API key)
export const socraticCoach: SocraticCoachPort = createNullSocraticCoach();
