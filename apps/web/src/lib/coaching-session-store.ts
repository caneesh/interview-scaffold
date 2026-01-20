/**
 * In-memory coaching session store
 *
 * TODO: In production, this would be backed by a database or Redis.
 * This simple Map-based implementation is sufficient for development.
 * See CRITICAL-2 in code review for database integration requirements.
 */

import type { CoachingSession, HelpLevel, CoachingStageData } from '@scaffold/core/learner-centric';
import type { Problem } from '@scaffold/core';

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

// In-memory store
const coachingSessions = new Map<string, CoachingSessionData>();

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
