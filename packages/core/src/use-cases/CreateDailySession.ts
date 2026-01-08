/**
 * CreateDailySession use-case.
 * Creates a new daily learning session for a user.
 */

import type { TenantId, UserId, PatternId, AttemptMode } from '../entities/types.js';
import { SessionId, ProblemId, MicroDrillId } from '../entities/types.js';
import { Session, SessionType, SessionStatus, createSession, type SessionItem } from '../entities/Session.js';
import type { ContentRepo } from '../ports/ContentRepo.js';
import type { ProgressRepo } from '../ports/ProgressRepo.js';
import type { EventSink } from '../ports/EventSink.js';
import type { Clock } from '../ports/Clock.js';
import { EventType, createLearningEvent, type SessionEvent } from '../entities/LearningEvent.js';
import {
  calculateDailySessionConfig,
  calculateItemPriority,
  DAILY_LIMITS,
} from '../policies/DailySessionRules.js';

export interface CreateDailySessionInput {
  readonly tenantId: TenantId;
  readonly userId: UserId;
  readonly availableTimeSec?: number;
  readonly preferredItemCount?: number;
  readonly focusPatterns?: readonly PatternId[];
}

export interface CreateDailySessionOutput {
  readonly session: Session;
  readonly estimatedTimeSec: number;
}

export interface CreateDailySessionDeps {
  readonly contentRepo: ContentRepo;
  readonly progressRepo: ProgressRepo;
  readonly eventSink: EventSink;
  readonly clock: Clock;
}

export async function createDailySession(
  input: CreateDailySessionInput,
  deps: CreateDailySessionDeps
): Promise<CreateDailySessionOutput> {
  const { tenantId, userId, availableTimeSec, preferredItemCount, focusPatterns } = input;
  const { contentRepo, progressRepo, eventSink, clock } = deps;

  // Check for existing active session
  const existingSession = await progressRepo.getActiveSession(tenantId, userId);
  if (existingSession) {
    return {
      session: existingSession,
      estimatedTimeSec: calculateSessionTime(existingSession),
    };
  }

  // Get user stats and progress
  const userStats = await progressRepo.getUserStats(tenantId, userId);
  const patternProgress = await progressRepo.getPatternProgressByUser(tenantId, userId);
  const problemProgress = await progressRepo.getProblemProgressByUser(tenantId, userId);

  // Find weak patterns
  const weakPatterns = patternProgress
    .filter(p => p.masteryScore < 50)
    .sort((a, b) => a.masteryScore - b.masteryScore)
    .map(p => p.patternId);

  // Calculate items due for review
  const now = clock.now();
  const msPerDay = 24 * 60 * 60 * 1000;
  const itemsDueForReview = problemProgress.filter(p => {
    if (!p.lastAttemptAt) return false;
    const daysSinceAttempt = (now - p.lastAttemptAt) / msPerDay;
    return daysSinceAttempt >= 1 && p.masteryScore < 80;
  }).length;

  // Calculate session configuration
  const config = calculateDailySessionConfig({
    ...(availableTimeSec !== undefined && { availableTimeSec }),
    ...(preferredItemCount !== undefined && { preferredItemCount }),
    weakPatterns: focusPatterns ?? weakPatterns,
    itemsDueForReview,
  });

  // Gather session items
  const items: SessionItem[] = [];
  const completedProblemIds = new Set(
    problemProgress.filter(p => p.isCompleted).map(p => p.problemId)
  );

  // Add review items
  const reviewProblems = await selectReviewProblems(
    tenantId,
    config.reviewItems,
    problemProgress,
    contentRepo,
    clock
  );
  for (const [index, problemId] of reviewProblems.entries()) {
    items.push({
      type: 'problem',
      itemId: problemId,
      order: items.length,
      completed: false,
      skipped: false,
    });
  }

  // Add new problems
  const newProblems = await selectNewProblems(
    tenantId,
    config.newItems,
    completedProblemIds,
    config.focusPatterns,
    contentRepo
  );
  for (const problemId of newProblems) {
    items.push({
      type: 'problem',
      itemId: problemId,
      order: items.length,
      completed: false,
      skipped: false,
    });
  }

  // Add drills
  const drills = await selectDrills(
    tenantId,
    config.drillItems,
    config.focusPatterns,
    contentRepo
  );
  for (const drillId of drills) {
    items.push({
      type: 'drill',
      itemId: drillId,
      order: items.length,
      completed: false,
      skipped: false,
    });
  }

  // Create session
  const sessionId = SessionId(crypto.randomUUID());
  const session = createSession({
    id: sessionId,
    tenantId,
    userId,
    type: SessionType.DAILY,
    status: SessionStatus.ACTIVE,
    config: {
      timeBudgetSec: config.targetTimeSec,
      mode: 'DAILY' as AttemptMode,
      focusPatterns: config.focusPatterns,
      maxItems: config.totalItems,
    },
    items,
    currentItemIndex: 0,
    metrics: {
      itemsCompleted: 0,
      itemsSkipped: 0,
      totalTimeSec: 0,
      accuracy: 0,
      averageConfidence: 0,
    },
    startedAt: now,
    completedAt: null,
  });

  // Save session
  await progressRepo.saveSession(session);

  // Record event
  const event = createLearningEvent<SessionEvent>({
    tenantId,
    userId,
    type: EventType.SESSION_STARTED,
    sessionId,
    metadata: {
      sessionType: SessionType.DAILY,
      itemCount: items.length,
      targetTimeSec: config.targetTimeSec,
    },
  });
  await eventSink.record(event);

  return {
    session,
    estimatedTimeSec: config.targetTimeSec,
  };
}

async function selectReviewProblems(
  tenantId: TenantId,
  count: number,
  problemProgress: readonly import('../entities/Progress.js').ProblemProgress[],
  contentRepo: ContentRepo,
  clock: Clock
): Promise<ProblemId[]> {
  if (count <= 0) return [];

  const now = clock.now();
  const msPerDay = 24 * 60 * 60 * 1000;

  // Score problems for review priority
  const candidates = problemProgress
    .filter(p => p.lastAttemptAt !== null && p.masteryScore < 80)
    .map(p => {
      const daysSince = (now - (p.lastAttemptAt ?? now)) / msPerDay;
      const priority = calculateItemPriority({
        isDueForReview: daysSince >= 1,
        isWeakPattern: p.masteryScore < 50,
        isNew: false,
        daysSinceLastPractice: daysSince,
        streakDays: 0,
      });
      return { problemId: p.problemId, priority };
    })
    .sort((a, b) => b.priority - a.priority)
    .slice(0, count);

  return candidates.map(c => c.problemId);
}

async function selectNewProblems(
  tenantId: TenantId,
  count: number,
  completedIds: Set<ProblemId>,
  focusPatterns: readonly PatternId[],
  contentRepo: ContentRepo
): Promise<ProblemId[]> {
  if (count <= 0) return [];

  const result: ProblemId[] = [];

  // First try focus patterns
  for (const patternId of focusPatterns) {
    if (result.length >= count) break;

    const problems = await contentRepo.getProblemsByPattern(tenantId, patternId);
    for (const problem of problems) {
      if (!completedIds.has(problem.id) && result.length < count) {
        result.push(problem.id);
      }
    }
  }

  // Fill with random problems if needed
  if (result.length < count) {
    const allProblems = await contentRepo.getProblems({
      tenantId,
      published: true,
      limit: count * 3, // Get extra for filtering
    });

    for (const problem of allProblems) {
      if (!completedIds.has(problem.id) && !result.includes(problem.id)) {
        result.push(problem.id);
        if (result.length >= count) break;
      }
    }
  }

  return result;
}

async function selectDrills(
  tenantId: TenantId,
  count: number,
  focusPatterns: readonly PatternId[],
  contentRepo: ContentRepo
): Promise<MicroDrillId[]> {
  if (count <= 0) return [];

  const result: MicroDrillId[] = [];

  for (const patternId of focusPatterns) {
    if (result.length >= count) break;

    const drills = await contentRepo.getMicroDrillsByPattern(tenantId, patternId);
    for (const drill of drills) {
      if (result.length < count) {
        result.push(drill.id);
      }
    }
  }

  // Fill with random drills if needed
  if (result.length < count) {
    const allDrills = await contentRepo.getMicroDrills({
      tenantId,
      published: true,
      limit: count * 2,
    });

    for (const drill of allDrills) {
      if (!result.includes(drill.id)) {
        result.push(drill.id);
        if (result.length >= count) break;
      }
    }
  }

  return result;
}

function calculateSessionTime(session: Session): number {
  const remainingItems = session.items.filter(
    i => !i.completed && !i.skipped
  ).length;
  const avgTimePerItem = 3 * 60; // 3 minutes average
  return remainingItems * avgTimePerItem;
}
