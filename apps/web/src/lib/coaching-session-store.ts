/**
 * In-memory coaching session store
 *
 * TODO: In production, this would be backed by a database or Redis.
 * This simple Map-based implementation is sufficient for development.
 * See CRITICAL-2 in code review for database integration requirements.
 */

import type { CoachingSession, HelpLevel, CoachingStageData } from '@scaffold/core/learner-centric';
import type { Problem } from '@scaffold/core';
import type {
  StateMachineContext,
  InterviewState,
  StateHistoryEntry,
  MemorizationDetectionResult,
} from '@scaffold/core';

/**
 * Serializable state history entry (dates as ISO strings)
 */
export interface StoredStateHistoryEntry {
  readonly state: InterviewState;
  readonly enteredAt: string;
  readonly exitedAt: string | null;
  readonly event: string | null;
}

/**
 * Serializable state machine context (dates as ISO strings)
 */
export interface StoredStateMachineContext {
  readonly currentState: InterviewState;
  readonly attemptId: string;
  readonly userId: string;
  readonly problemId: string;
  readonly pattern: string;
  readonly helpLevel: HelpLevel;
  readonly stageAttemptCount: number;
  readonly stageFailureCount: number;
  readonly inCooldown: boolean;
  readonly cooldownExpiresAt: string | null;
  readonly hintsUsed: readonly HelpLevel[];
  readonly stateHistory: readonly StoredStateHistoryEntry[];
  readonly startedAt: string;
  readonly lastUpdatedAt: string;
}

/**
 * Memorization tracking for a session
 */
export interface MemorizationTrackingData {
  /** History of memorization detection results */
  readonly detectionHistory: readonly {
    readonly stage: string;
    readonly timestamp: string;
    readonly classification: MemorizationDetectionResult['classification'];
    readonly confidence: number;
    readonly action: MemorizationDetectionResult['action'];
  }[];
  /** Active reprompt questions to answer */
  readonly activeReprompts: readonly {
    readonly id: string;
    readonly question: string;
    readonly targetConcept: string;
    readonly answered: boolean;
  }[];
  /** Current reduced help level due to memorization detection */
  readonly restrictedHelpLevel: HelpLevel | null;
  /** Previous responses for vocabulary tracking */
  readonly previousResponses: readonly string[];
  /** Timestamp when current stage started (for response time tracking) */
  readonly stageStartedAt: string;
}

/**
 * Session data stored in the in-memory store.
 * Dates are stored as ISO strings for consistent serialization.
 */
export interface CoachingSessionData {
  session: {
    readonly id: string;
    readonly attemptId: string;
    readonly tenantId: string;
    readonly userId: string;
    readonly problemId: string;
    readonly currentStage: CoachingSession['currentStage'];
    readonly stageData: CoachingStageData;
    readonly helpLevel: HelpLevel;
    /** ISO 8601 date string */
    readonly startedAt: string;
    /** ISO 8601 date string or null */
    readonly completedAt: string | null;
  };
  problem: Problem;
  /** Rate limiting: timestamp of last help request */
  lastHelpRequestAt?: string;
  /** State machine context for formal state transitions */
  machineContext?: StoredStateMachineContext;
  /** Anti-memorization tracking data */
  memorizationTracking?: MemorizationTrackingData;
}

/**
 * Convert a CoachingSession to storage format (dates as ISO strings)
 */
export function sessionToStorageFormat(session: CoachingSession): CoachingSessionData['session'] {
  return {
    id: session.id,
    attemptId: session.attemptId,
    tenantId: session.tenantId,
    userId: session.userId,
    problemId: session.problemId,
    currentStage: session.currentStage,
    stageData: session.stageData,
    helpLevel: session.helpLevel,
    startedAt: session.startedAt.toISOString(),
    completedAt: session.completedAt?.toISOString() ?? null,
  };
}

/**
 * Convert storage format back to CoachingSession (ISO strings to Dates)
 */
export function storageToSessionFormat(stored: CoachingSessionData['session']): CoachingSession {
  return {
    id: stored.id,
    attemptId: stored.attemptId,
    tenantId: stored.tenantId,
    userId: stored.userId,
    problemId: stored.problemId,
    currentStage: stored.currentStage,
    stageData: stored.stageData,
    helpLevel: stored.helpLevel,
    startedAt: new Date(stored.startedAt),
    completedAt: stored.completedAt ? new Date(stored.completedAt) : null,
  };
}

/**
 * Convert StateMachineContext to storage format (dates as ISO strings)
 */
export function machineContextToStorageFormat(
  context: StateMachineContext
): StoredStateMachineContext {
  return {
    currentState: context.currentState,
    attemptId: context.attemptId,
    userId: context.userId,
    problemId: context.problemId,
    pattern: context.pattern,
    helpLevel: context.helpLevel,
    stageAttemptCount: context.stageAttemptCount,
    stageFailureCount: context.stageFailureCount,
    inCooldown: context.inCooldown,
    cooldownExpiresAt: context.cooldownExpiresAt?.toISOString() ?? null,
    hintsUsed: context.hintsUsed,
    stateHistory: context.stateHistory.map(entry => ({
      state: entry.state,
      enteredAt: entry.enteredAt.toISOString(),
      exitedAt: entry.exitedAt?.toISOString() ?? null,
      event: entry.event,
    })),
    startedAt: context.startedAt.toISOString(),
    lastUpdatedAt: context.lastUpdatedAt.toISOString(),
  };
}

/**
 * Convert storage format back to StateMachineContext (ISO strings to Dates)
 */
export function storageToMachineContextFormat(
  stored: StoredStateMachineContext
): StateMachineContext {
  return {
    currentState: stored.currentState,
    attemptId: stored.attemptId,
    userId: stored.userId,
    problemId: stored.problemId,
    pattern: stored.pattern as import('@scaffold/core').PatternId,
    helpLevel: stored.helpLevel,
    stageAttemptCount: stored.stageAttemptCount,
    stageFailureCount: stored.stageFailureCount,
    inCooldown: stored.inCooldown,
    cooldownExpiresAt: stored.cooldownExpiresAt
      ? new Date(stored.cooldownExpiresAt)
      : null,
    hintsUsed: stored.hintsUsed,
    stateHistory: stored.stateHistory.map(entry => ({
      state: entry.state,
      enteredAt: new Date(entry.enteredAt),
      exitedAt: entry.exitedAt ? new Date(entry.exitedAt) : null,
      event: entry.event as StateHistoryEntry['event'],
    })),
    startedAt: new Date(stored.startedAt),
    lastUpdatedAt: new Date(stored.lastUpdatedAt),
  };
}

/**
 * Create initial memorization tracking data
 */
export function createInitialMemorizationTracking(): MemorizationTrackingData {
  return {
    detectionHistory: [],
    activeReprompts: [],
    restrictedHelpLevel: null,
    previousResponses: [],
    stageStartedAt: new Date().toISOString(),
  };
}

/**
 * Map coaching stage to state machine state
 */
export function coachingStageToMachineState(
  stage: CoachingSession['currentStage']
): InterviewState {
  const mapping: Record<CoachingSession['currentStage'], InterviewState> = {
    PROBLEM_FRAMING: 'problem_framing',
    PATTERN_RECOGNITION: 'pattern_gate',
    FEYNMAN_VALIDATION: 'feynman_check',
    STRATEGY_DESIGN: 'strategy_design',
    CODING: 'coding',
    REFLECTION: 'reflection',
  };
  return mapping[stage];
}

/**
 * Map state machine state to coaching stage
 */
export function machineStateToCoachingStage(
  state: InterviewState
): CoachingSession['currentStage'] | null {
  const mapping: Record<InterviewState, CoachingSession['currentStage'] | null> = {
    problem_framing: 'PROBLEM_FRAMING',
    pattern_gate: 'PATTERN_RECOGNITION',
    feynman_check: 'FEYNMAN_VALIDATION',
    strategy_design: 'STRATEGY_DESIGN',
    coding: 'CODING',
    reflection: 'REFLECTION',
    completed: null,
    abandoned: null,
  };
  return mapping[state];
}

// In-memory store with persistence across hot reloads
// In development, Next.js hot reloads can clear module-level variables,
// so we use globalThis to maintain state across reloads.
declare global {
  // eslint-disable-next-line no-var
  var __coachingSessionsStore: Map<string, CoachingSessionData> | undefined;
}

const coachingSessions = globalThis.__coachingSessionsStore ?? new Map<string, CoachingSessionData>();
globalThis.__coachingSessionsStore = coachingSessions;

export function getCoachingSession(sessionId: string): CoachingSessionData | undefined {
  return coachingSessions.get(sessionId);
}

export function setCoachingSession(sessionId: string, data: CoachingSessionData): void {
  coachingSessions.set(sessionId, data);
}

export function deleteCoachingSession(sessionId: string): boolean {
  return coachingSessions.delete(sessionId);
}

export function hasCoachingSession(sessionId: string): boolean {
  return coachingSessions.has(sessionId);
}

/**
 * Get all coaching sessions for a specific user
 */
export function getCoachingSessionsByUser(tenantId: string, userId: string): CoachingSessionData[] {
  return Array.from(coachingSessions.values())
    .filter(data => data.session.tenantId === tenantId && data.session.userId === userId)
    .sort((a, b) => new Date(b.session.startedAt).getTime() - new Date(a.session.startedAt).getTime());
}

/**
 * Get all coaching sessions (for admin/debugging)
 */
export function getAllCoachingSessions(): CoachingSessionData[] {
  return Array.from(coachingSessions.values())
    .sort((a, b) => new Date(b.session.startedAt).getTime() - new Date(a.session.startedAt).getTime());
}
