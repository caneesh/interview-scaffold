/**
 * ProgressRepo port - interface for persisting user progress.
 * PURE TypeScript - no framework dependencies.
 */

import type {
  TenantId,
  UserId,
  ProblemId,
  PatternId,
  MicroDrillId,
  AttemptId,
  SessionId,
} from '../entities/types.js';
import type {
  ProblemProgress,
  PatternProgress,
  DrillProgress,
  UserStats,
} from '../entities/Progress.js';
import type { ProblemAttempt, DrillAttempt } from '../entities/Attempt.js';
import type { Session } from '../entities/Session.js';

// MEP attempt summary for decision engine
export interface MEPAttemptSummary {
  readonly problemId: ProblemId;
  readonly patternId: PatternId;
  readonly score: number;
  readonly retryCount: number;
  readonly errorTypes: readonly string[];
  readonly endedAt: number | null;
  readonly isSibling: boolean;
}

export interface ProgressRepo {
  // Problem Progress
  getProblemProgress(
    tenantId: TenantId,
    userId: UserId,
    problemId: ProblemId
  ): Promise<ProblemProgress | null>;

  getProblemProgressByUser(
    tenantId: TenantId,
    userId: UserId
  ): Promise<readonly ProblemProgress[]>;

  saveProblemProgress(progress: ProblemProgress): Promise<void>;

  // Pattern Progress
  getPatternProgress(
    tenantId: TenantId,
    userId: UserId,
    patternId: PatternId
  ): Promise<PatternProgress | null>;

  getPatternProgressByUser(
    tenantId: TenantId,
    userId: UserId
  ): Promise<readonly PatternProgress[]>;

  savePatternProgress(progress: PatternProgress): Promise<void>;

  // Drill Progress
  getDrillProgress(
    tenantId: TenantId,
    userId: UserId,
    drillId: MicroDrillId
  ): Promise<DrillProgress | null>;

  getDrillProgressByUser(
    tenantId: TenantId,
    userId: UserId
  ): Promise<readonly DrillProgress[]>;

  saveDrillProgress(progress: DrillProgress): Promise<void>;

  // User Stats
  getUserStats(tenantId: TenantId, userId: UserId): Promise<UserStats | null>;
  saveUserStats(stats: UserStats): Promise<void>;

  // Attempts
  getAttempt(tenantId: TenantId, attemptId: AttemptId): Promise<ProblemAttempt | DrillAttempt | null>;
  getProblemAttempts(tenantId: TenantId, userId: UserId, problemId: ProblemId): Promise<readonly ProblemAttempt[]>;
  getDrillAttempts(tenantId: TenantId, userId: UserId, drillId: MicroDrillId): Promise<readonly DrillAttempt[]>;
  saveAttempt(attempt: ProblemAttempt | DrillAttempt): Promise<void>;

  // MEP-specific queries
  getRecentAttempts(
    tenantId: TenantId,
    userId: UserId,
    patternId: PatternId,
    limit: number
  ): Promise<readonly MEPAttemptSummary[]>;

  getAttemptsByPattern(
    tenantId: TenantId,
    userId: UserId,
    patternId: PatternId
  ): Promise<readonly MEPAttemptSummary[]>;

  // Sessions
  getSession(tenantId: TenantId, sessionId: SessionId): Promise<Session | null>;
  getActiveSession(tenantId: TenantId, userId: UserId): Promise<Session | null>;
  getUserSessions(tenantId: TenantId, userId: UserId, limit?: number): Promise<readonly Session[]>;
  saveSession(session: Session): Promise<void>;
}
