/**
 * Attempt entity - tracks a user's attempt at a problem or drill.
 * PURE TypeScript - no framework dependencies.
 */

import type {
  AttemptId,
  TenantId,
  UserId,
  ProblemId,
  MicroDrillId,
  SessionId,
  AttemptMode,
  AttemptStatus,
  ErrorTaxonomy,
  Language,
  ConfidenceLevel,
  StepId,
} from './types.js';

export interface StepAttempt {
  readonly stepId: StepId;
  readonly code: string;
  readonly language: Language;
  readonly hintsUsed: number;
  readonly startedAt: number;
  readonly completedAt: number | null;
  readonly errors: readonly ErrorTaxonomy[];
  readonly isCorrect: boolean;
}

export interface AttemptMetrics {
  readonly totalTimeSec: number;
  readonly activeTimeSec: number;
  readonly hintsUsed: number;
  readonly errorsEncountered: readonly ErrorTaxonomy[];
  readonly confidenceRating: ConfidenceLevel | null;
  readonly selfAssessedDifficulty: number | null; // 1-5
}

export interface ProblemAttempt {
  readonly id: AttemptId;
  readonly tenantId: TenantId;
  readonly userId: UserId;
  readonly problemId: ProblemId;
  readonly sessionId: SessionId | null;
  readonly mode: AttemptMode;
  readonly status: AttemptStatus;
  readonly language: Language;
  readonly timeBudgetSec: number | null;
  readonly patternSelectionCorrect: boolean | null;
  readonly interviewAnswerCorrect: boolean | null;
  readonly strategyScore: number | null;
  readonly stepAttempts: readonly StepAttempt[];
  readonly metrics: AttemptMetrics;
  readonly startedAt: number;
  readonly completedAt: number | null;
  readonly createdAt: number;
  readonly updatedAt: number;
}

export interface DrillAttempt {
  readonly id: AttemptId;
  readonly tenantId: TenantId;
  readonly userId: UserId;
  readonly drillId: MicroDrillId;
  readonly sessionId: SessionId | null;
  readonly mode: AttemptMode;
  readonly status: AttemptStatus;
  readonly timeBudgetSec: number | null;
  readonly answer: string;
  readonly isCorrect: boolean;
  readonly hintsUsed: number;
  readonly timeTakenSec: number;
  readonly errors: readonly ErrorTaxonomy[];
  readonly confidenceRating: ConfidenceLevel | null;
  readonly startedAt: number;
  readonly completedAt: number | null;
  readonly createdAt: number;
  readonly updatedAt: number;
}

// Factory functions
export function createProblemAttempt(
  params: Omit<ProblemAttempt, 'createdAt' | 'updatedAt'> & {
    createdAt?: number;
    updatedAt?: number;
  }
): ProblemAttempt {
  const now = Date.now();
  return {
    ...params,
    createdAt: params.createdAt ?? now,
    updatedAt: params.updatedAt ?? now,
  };
}

export function createDrillAttempt(
  params: Omit<DrillAttempt, 'createdAt' | 'updatedAt'> & {
    createdAt?: number;
    updatedAt?: number;
  }
): DrillAttempt {
  const now = Date.now();
  return {
    ...params,
    createdAt: params.createdAt ?? now,
    updatedAt: params.updatedAt ?? now,
  };
}
