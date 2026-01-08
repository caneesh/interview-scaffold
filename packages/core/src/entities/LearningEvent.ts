/**
 * LearningEvent entity - records events for analytics.
 * PURE TypeScript - no framework dependencies.
 */

import type {
  TenantId,
  UserId,
  ProblemId,
  MicroDrillId,
  SessionId,
  PatternId,
  AttemptMode,
  ErrorTaxonomy,
  ConfidenceLevel,
} from './types.js';

export const EventType = {
  // Session events
  SESSION_STARTED: 'SESSION_STARTED',
  SESSION_COMPLETED: 'SESSION_COMPLETED',
  SESSION_ABANDONED: 'SESSION_ABANDONED',

  // Problem events
  PROBLEM_STARTED: 'PROBLEM_STARTED',
  PROBLEM_COMPLETED: 'PROBLEM_COMPLETED',
  PROBLEM_ABANDONED: 'PROBLEM_ABANDONED',
  STEP_COMPLETED: 'STEP_COMPLETED',
  HINT_REQUESTED: 'HINT_REQUESTED',

  // Drill events
  DRILL_STARTED: 'DRILL_STARTED',
  DRILL_COMPLETED: 'DRILL_COMPLETED',
  DRILL_SKIPPED: 'DRILL_SKIPPED',

  // Learning events
  PATTERN_SELECTION_ATTEMPTED: 'PATTERN_SELECTION_ATTEMPTED',
  INTERVIEW_QUESTION_ANSWERED: 'INTERVIEW_QUESTION_ANSWERED',
  STRATEGY_SUBMITTED: 'STRATEGY_SUBMITTED',
  CODE_SUBMITTED: 'CODE_SUBMITTED',
  ERROR_MADE: 'ERROR_MADE',

  // Progress events
  MASTERY_LEVEL_CHANGED: 'MASTERY_LEVEL_CHANGED',
  STREAK_UPDATED: 'STREAK_UPDATED',
  CONFIDENCE_RECORDED: 'CONFIDENCE_RECORDED',

  // Discovery events
  DISCOVERY_STARTED: 'DISCOVERY_STARTED',
  DISCOVERY_COMPLETED: 'DISCOVERY_COMPLETED',

  // MEP events
  MEP_RECOMMENDATION_MADE: 'MEP_RECOMMENDATION_MADE',

  // Analytics events (Prompt 06)
  HINT_USED: 'HINT_USED',
  ERROR_DETECTED: 'ERROR_DETECTED',
  MICRO_DRILL_PASSED: 'MICRO_DRILL_PASSED',
  MICRO_DRILL_FAILED: 'MICRO_DRILL_FAILED',
  TRANSFER_SUCCESS: 'TRANSFER_SUCCESS',
  TRANSFER_FAIL: 'TRANSFER_FAIL',
  PROMOTED: 'PROMOTED',
  TIME_OVERRUN: 'TIME_OVERRUN',
} as const;
export type EventType = typeof EventType[keyof typeof EventType];

interface BaseEvent {
  readonly id: string;
  readonly tenantId: TenantId;
  readonly userId: UserId;
  readonly type: EventType;
  readonly timestamp: number;
  readonly metadata: Record<string, unknown>;
}

export interface SessionEvent extends BaseEvent {
  readonly type: typeof EventType.SESSION_STARTED | typeof EventType.SESSION_COMPLETED | typeof EventType.SESSION_ABANDONED;
  readonly sessionId: SessionId;
}

export interface ProblemEvent extends BaseEvent {
  readonly type: typeof EventType.PROBLEM_STARTED | typeof EventType.PROBLEM_COMPLETED | typeof EventType.PROBLEM_ABANDONED | typeof EventType.STEP_COMPLETED | typeof EventType.HINT_REQUESTED;
  readonly problemId: ProblemId;
  readonly sessionId: SessionId | null;
  readonly mode: AttemptMode;
}

export interface DrillEvent extends BaseEvent {
  readonly type: typeof EventType.DRILL_STARTED | typeof EventType.DRILL_COMPLETED | typeof EventType.DRILL_SKIPPED;
  readonly drillId: MicroDrillId;
  readonly sessionId: SessionId | null;
}

export interface LearningEvent extends BaseEvent {
  readonly type: typeof EventType.PATTERN_SELECTION_ATTEMPTED | typeof EventType.INTERVIEW_QUESTION_ANSWERED | typeof EventType.STRATEGY_SUBMITTED | typeof EventType.CODE_SUBMITTED | typeof EventType.ERROR_MADE;
  readonly problemId: ProblemId | null;
  readonly patternId: PatternId | null;
  readonly isCorrect: boolean | null;
  readonly errorType: ErrorTaxonomy | null;
}

export interface ProgressEvent extends BaseEvent {
  readonly type: typeof EventType.MASTERY_LEVEL_CHANGED | typeof EventType.STREAK_UPDATED | typeof EventType.CONFIDENCE_RECORDED;
  readonly patternId: PatternId | null;
  readonly problemId: ProblemId | null;
  readonly previousValue: number | null;
  readonly newValue: number | null;
  readonly confidenceLevel: ConfidenceLevel | null;
}

export interface DiscoveryEvent extends BaseEvent {
  readonly type: typeof EventType.DISCOVERY_STARTED | typeof EventType.DISCOVERY_COMPLETED;
  readonly patternId: PatternId;
  readonly sessionId: SessionId | null;
}

export interface MEPEvent extends BaseEvent {
  readonly type: typeof EventType.MEP_RECOMMENDATION_MADE;
  readonly patternId: PatternId | null;
  readonly problemId: ProblemId | null;
  readonly action: string;
}

export interface AnalyticsEvent extends BaseEvent {
  readonly type:
    | typeof EventType.HINT_USED
    | typeof EventType.ERROR_DETECTED
    | typeof EventType.MICRO_DRILL_PASSED
    | typeof EventType.MICRO_DRILL_FAILED
    | typeof EventType.TRANSFER_SUCCESS
    | typeof EventType.TRANSFER_FAIL
    | typeof EventType.PROMOTED
    | typeof EventType.TIME_OVERRUN;
  readonly patternId: PatternId | null;
  readonly problemId: ProblemId | null;
  readonly drillId: MicroDrillId | null;
  readonly rungLevel: number | null;
  readonly timeTakenSec: number | null;
}

export type AnyLearningEvent = SessionEvent | ProblemEvent | DrillEvent | LearningEvent | ProgressEvent | DiscoveryEvent | MEPEvent | AnalyticsEvent;

// Factory function
export function createLearningEvent<T extends AnyLearningEvent>(
  params: Omit<T, 'id' | 'timestamp'> & { id?: string; timestamp?: number }
): T {
  return {
    ...params,
    id: params.id ?? crypto.randomUUID(),
    timestamp: params.timestamp ?? Date.now(),
  } as T;
}
