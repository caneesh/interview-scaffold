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
import { createLLMClient, createLLMValidationAdapter, createNullLLMValidation, createSocraticCoachAdapter } from '@scaffold/adapter-llm';
import { createPistonExecutor, createPistonClient, type PistonClient } from '@scaffold/adapter-piston';
import {
  SystemClock,
  createNullSocraticCoach,
  createAttemptContextLoader,
  type LoadAttemptContextFn,
} from '@scaffold/core/ports';
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
  ProgressRepo,
} from '@scaffold/core/ports';
import type { LLMValidationPort } from '@scaffold/core/validation';
import type { CodeExecutor } from '@scaffold/core/use-cases';
import { inMemoryAttemptRepo, inMemorySkillRepo, inMemoryContentRepo } from './in-memory-repos';
import {
  createInMemoryContentBankRepo,
  createInMemorySubmissionsRepo,
  createInMemoryEvaluationsRepo,
  createInMemoryAICoachRepo,
  createInMemoryProgressRepo,
} from './in-memory-track-repos';

// ============ Database Mode Detection ============

/**
 * Indicates whether the application is running in database mode.
 * When true, adapter-db repositories are used; when false, in-memory repos are used.
 */
export const isDatabaseMode = Boolean(process.env.DATABASE_URL);

// Log active mode on startup (without revealing connection string)
if (isDatabaseMode) {
  console.log('[deps] Database mode ENABLED - using PostgreSQL repositories');
} else {
  console.log('[deps] Memory mode ACTIVE - using in-memory repositories with seed data (18 problems available)');
}

// ============ Database Client (lazy initialization) ============

// Only import and instantiate DB client when DATABASE_URL is set
// This avoids loading postgres dependencies when not needed
let _dbClient: import('@scaffold/adapter-db').DbClient | null = null;

function getDbClient(): import('@scaffold/adapter-db').DbClient {
  if (_dbClient) {
    return _dbClient;
  }

  if (!process.env.DATABASE_URL) {
    throw new Error('[deps] DATABASE_URL is not set but DB client was requested');
  }

  // Dynamic import to avoid loading adapter-db when not in DB mode
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { createDbClient } = require('@scaffold/adapter-db');
  const client = createDbClient(process.env.DATABASE_URL) as import('@scaffold/adapter-db').DbClient;
  _dbClient = client;
  return client;
}

/**
 * Returns the database client if in database mode, null otherwise.
 * Useful for smoke tests and health checks.
 */
export function getDbClientIfAvailable(): import('@scaffold/adapter-db').DbClient | null {
  if (!isDatabaseMode) return null;
  return getDbClient();
}

// ============ Repository Initialization ============

function initializeRepositories() {
  if (isDatabaseMode) {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const adapterDb = require('@scaffold/adapter-db');
    const db = getDbClient();

    // HYBRID MODE: Legacy repos use in-memory (seed problems have string IDs, not UUIDs)
    // Track-based repos use database (content_items use proper UUIDs)
    console.log('[deps] Hybrid mode: Legacy repos (in-memory) + Track repos (PostgreSQL)');

    return {
      // Legacy repos - ALWAYS in-memory because seed problems have string IDs
      // The database schema expects UUIDs for problem_id foreign key
      attemptRepo: inMemoryAttemptRepo as AttemptRepo,
      skillRepo: inMemorySkillRepo as SkillRepo,
      contentRepo: inMemoryContentRepo as ContentRepo,

      // TrackC unified content bank repos - use DB (content_items use proper UUIDs)
      contentBankRepo: adapterDb.createContentBankRepo(db) as ContentBankRepoPort,
      submissionsRepo: adapterDb.createSubmissionsRepo(db) as SubmissionsRepoPort,
      evaluationsRepo: adapterDb.createEvaluationsRepo(db) as EvaluationsRepoPort,
      aiCoachRepo: adapterDb.createUnifiedAIArtifactsRepo(db) as UnifiedAICoachRepoPort,

      // Progress repo - use DB when available
      progressRepo: adapterDb.createProgressRepo(db) as ProgressRepo,
    };
  }

  // In-memory mode - use all in-memory implementations
  return {
    attemptRepo: inMemoryAttemptRepo as AttemptRepo,
    skillRepo: inMemorySkillRepo as SkillRepo,
    contentRepo: inMemoryContentRepo as ContentRepo,
    contentBankRepo: createInMemoryContentBankRepo() as ContentBankRepoPort,
    submissionsRepo: createInMemorySubmissionsRepo() as SubmissionsRepoPort,
    evaluationsRepo: createInMemoryEvaluationsRepo() as EvaluationsRepoPort,
    aiCoachRepo: createInMemoryAICoachRepo() as UnifiedAICoachRepoPort,
    progressRepo: createInMemoryProgressRepo() as ProgressRepo,
  };
}

// Initialize all repositories once
const repos = initializeRepositories();

// ============ Exported Repositories ============

// Legacy repos
export const attemptRepo: AttemptRepo = repos.attemptRepo;
export const skillRepo: SkillRepo = repos.skillRepo;
export const contentRepo: ContentRepo = repos.contentRepo;

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
export const contentBankRepo: ContentBankRepoPort = repos.contentBankRepo;

// Submissions Repository - stores user submissions
export const submissionsRepo: SubmissionsRepoPort = repos.submissionsRepo;

// Evaluations Repository - stores evaluation runs and results
export const evaluationsRepo: EvaluationsRepoPort = repos.evaluationsRepo;

// AI Coach Repository - stores AI feedback and Socratic turns
export const aiCoachRepo: UnifiedAICoachRepoPort = repos.aiCoachRepo;

// Progress Repository - stores user progress (TrackE)
export const progressRepo: ProgressRepo = repos.progressRepo;

// ============ Unified Attempt Context Loader ============

/**
 * Load attempt context for any attempt type (legacy or track-based).
 * This provides a unified interface for loading attempt data needed for
 * submissions, evaluations, and coaching.
 */
export const loadAttemptContext: LoadAttemptContextFn = createAttemptContextLoader({
  attemptRepo: repos.attemptRepo,
  contentRepo: repos.contentRepo,
  contentBankRepo: repos.contentBankRepo,
});

// Socratic Coach - AI-powered coaching
// When ANTHROPIC_API_KEY is set, use real LLM-powered coach; otherwise fall back to null (deterministic only)
export const socraticCoach: SocraticCoachPort = process.env.ANTHROPIC_API_KEY
  ? createSocraticCoachAdapter({ apiKey: process.env.ANTHROPIC_API_KEY })
  : createNullSocraticCoach();

// Log whether Socratic coach is enabled for observability
if (process.env.ANTHROPIC_API_KEY) {
  console.log('[deps] Socratic coach enabled with LLM adapter (evidence-gated AI coaching active)');
} else {
  console.log('[deps] Socratic coach using null implementation (deterministic coaching only)');
}
