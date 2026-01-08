/**
 * Session entity - represents a learning session (daily, practice, etc.).
 * PURE TypeScript - no framework dependencies.
 */

import type {
  SessionId,
  TenantId,
  UserId,
  ProblemId,
  MicroDrillId,
  PatternId,
  AttemptMode,
} from './types.js';

export const SessionType = {
  DAILY: 'DAILY',
  PRACTICE: 'PRACTICE',
  REVIEW: 'REVIEW',
  INTERVIEW_PREP: 'INTERVIEW_PREP',
} as const;
export type SessionType = typeof SessionType[keyof typeof SessionType];

export const SessionStatus = {
  ACTIVE: 'ACTIVE',
  COMPLETED: 'COMPLETED',
  ABANDONED: 'ABANDONED',
} as const;
export type SessionStatus = typeof SessionStatus[keyof typeof SessionStatus];

export interface SessionItem {
  readonly type: 'problem' | 'drill';
  readonly itemId: ProblemId | MicroDrillId;
  readonly order: number;
  readonly completed: boolean;
  readonly skipped: boolean;
}

export interface SessionConfig {
  readonly timeBudgetSec: number | null;
  readonly mode: AttemptMode;
  readonly focusPatterns: readonly PatternId[];
  readonly maxItems: number;
}

export interface SessionMetrics {
  readonly itemsCompleted: number;
  readonly itemsSkipped: number;
  readonly totalTimeSec: number;
  readonly accuracy: number; // 0-1
  readonly averageConfidence: number; // 0-1
}

export interface Session {
  readonly id: SessionId;
  readonly tenantId: TenantId;
  readonly userId: UserId;
  readonly type: SessionType;
  readonly status: SessionStatus;
  readonly config: SessionConfig;
  readonly items: readonly SessionItem[];
  readonly currentItemIndex: number;
  readonly metrics: SessionMetrics;
  readonly startedAt: number;
  readonly completedAt: number | null;
  readonly createdAt: number;
  readonly updatedAt: number;
}

// Factory function
export function createSession(
  params: Omit<Session, 'createdAt' | 'updatedAt'> & {
    createdAt?: number;
    updatedAt?: number;
  }
): Session {
  const now = Date.now();
  return {
    ...params,
    createdAt: params.createdAt ?? now,
    updatedAt: params.updatedAt ?? now,
  };
}
