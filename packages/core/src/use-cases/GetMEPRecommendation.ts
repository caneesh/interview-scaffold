/**
 * GetMEPRecommendation use-case.
 * Returns the next recommended action based on MEP logic.
 */

import type { TenantId, UserId, PatternId, ProblemId } from '../entities/types.js';
import type { ProgressRepo } from '../ports/ProgressRepo.js';
import type { ContentRepo } from '../ports/ContentRepo.js';
import type { Clock } from '../ports/Clock.js';
import type { MEPDecision, MEPContext, SiblingProblem } from '../mep/types.js';
import {
  computeMEPDecision,
  filterByTimeBudget,
  getTimeBudgetedActions,
  selectSibling,
} from '../mep/MEPDecisionEngine.js';
import { MEP_THRESHOLDS, RUNG_DEFINITIONS } from '../mep/types.js';

// ============================================================================
// Input/Output Types
// ============================================================================

export interface GetMEPRecommendationInput {
  readonly tenantId: TenantId;
  readonly userId: UserId;
  readonly patternId: PatternId;
  readonly currentProblemId?: ProblemId;
  readonly timeBudgetSec?: number;
}

export interface GetMEPRecommendationOutput {
  readonly decision: MEPDecision;
  readonly context: MEPContext;
  readonly alternatives: readonly MEPDecision[];
  readonly selectedSibling: SiblingProblem | null;
}

export interface GetMEPRecommendationDeps {
  readonly progressRepo: ProgressRepo;
  readonly contentRepo: ContentRepo;
  readonly clock: Clock;
}

// ============================================================================
// Use Case
// ============================================================================

export async function getMEPRecommendation(
  input: GetMEPRecommendationInput,
  deps: GetMEPRecommendationDeps
): Promise<GetMEPRecommendationOutput> {
  const { tenantId, userId, patternId, currentProblemId, timeBudgetSec } = input;
  const { progressRepo, contentRepo, clock } = deps;

  // Build MEP context from user progress
  const context = await buildMEPContext(
    tenantId,
    userId,
    patternId,
    currentProblemId ?? null,
    deps
  );

  // Compute primary decision
  let decision = computeMEPDecision(context);

  // Get time-budgeted alternatives
  const alternatives = timeBudgetSec
    ? getTimeBudgetedActions(context, timeBudgetSec)
    : [];

  // Apply time budget filter if needed
  if (timeBudgetSec !== null && timeBudgetSec !== undefined) {
    decision = filterByTimeBudget(decision, timeBudgetSec, alternatives);
  }

  // Select sibling if needed
  let selectedSibling: SiblingProblem | null = null;
  if (decision.action === 'SERVE_SIBLING') {
    const siblings = await getSiblings(tenantId, userId, patternId, deps);
    selectedSibling = selectSibling(
      siblings,
      currentProblemId ?? null,
      timeBudgetSec ?? null
    );
  }

  return {
    decision,
    context,
    alternatives,
    selectedSibling,
  };
}

// ============================================================================
// Context Builder
// ============================================================================

async function buildMEPContext(
  tenantId: TenantId,
  userId: UserId,
  patternId: PatternId,
  currentProblemId: ProblemId | null,
  deps: GetMEPRecommendationDeps
): Promise<MEPContext> {
  const { progressRepo, clock } = deps;

  // Get pattern progress
  const patternProgress = await progressRepo.getPatternProgress(tenantId, userId, patternId);

  // Get recent attempt data
  const recentAttempts = await progressRepo.getRecentAttempts(tenantId, userId, patternId, 5);
  const lastAttempt = recentAttempts[0];

  // Calculate derived values
  const now = clock.now();
  const daysSinceLastPractice = lastAttempt?.endedAt
    ? Math.floor((now - lastAttempt.endedAt) / (24 * 60 * 60 * 1000))
    : 999;

  // Detect error patterns
  const errorTypes = lastAttempt?.errorTypes ?? [];
  const hasCriticalError = errorTypes.some(e =>
    ['PATTERN_MISAPPLY', 'COMPLEXITY_ISSUE'].includes(e)
  );

  // Check for repeated critical error
  const repeatedCriticalError = recentAttempts.length >= 2 &&
    recentAttempts.slice(0, 2).every(a =>
      a.errorTypes?.some(e => ['PATTERN_MISAPPLY', 'COMPLEXITY_ISSUE'].includes(e))
    );

  // Count consecutive wins
  let consecutiveWins = 0;
  for (const attempt of recentAttempts) {
    if (attempt.score >= MEP_THRESHOLDS.MASTERY_SCORE_MIN) {
      consecutiveWins++;
    } else {
      break;
    }
  }

  // Sibling tracking
  const siblingAttempts = recentAttempts.filter(a => a.isSibling);
  const siblingAttempted = siblingAttempts.length > 0;
  const firstSibling = siblingAttempts[0];
  const siblingFirstTrySuccess = firstSibling !== undefined &&
    firstSibling.score >= MEP_THRESHOLDS.MASTERY_SCORE_MIN &&
    firstSibling.retryCount === 0;

  // Convert confidence level to numeric (1-5)
  const confidenceNumeric = patternProgress
    ? confidenceLevelToNumber(patternProgress.confidenceLevel)
    : 1;

  return {
    patternId,
    currentProblemId,
    lastScore: lastAttempt?.score ?? null,
    confidence: confidenceNumeric,
    errorCount: errorTypes.length,
    errorTypes,
    retryCount: lastAttempt?.retryCount ?? 0,
    daysSinceLastPractice,
    consecutiveWins,
    rungLevel: patternProgress?.rungLevel ?? 1,
    maxRung: RUNG_DEFINITIONS.length,
    hasCriticalError,
    repeatedCriticalError,
    timeBudgetSec: null,
    siblingAttempted,
    siblingFirstTrySuccess,
  };
}

/**
 * Converts confidence level enum to numeric value.
 */
function confidenceLevelToNumber(level: import('../entities/types.js').ConfidenceLevel): number {
  switch (level) {
    case 'LOW':
      return 2;
    case 'MEDIUM':
      return 3;
    case 'HIGH':
      return 4;
    default:
      return 1;
  }
}

// ============================================================================
// Sibling Fetcher
// ============================================================================

async function getSiblings(
  tenantId: TenantId,
  userId: UserId,
  patternId: PatternId,
  deps: GetMEPRecommendationDeps
): Promise<SiblingProblem[]> {
  const { contentRepo, progressRepo } = deps;

  // Get problems for pattern
  const problems = await contentRepo.getProblemsByPattern(tenantId, patternId);

  // Get user's attempt history
  const attempts = await progressRepo.getAttemptsByPattern(tenantId, userId, patternId);
  const attemptedIds = new Set(attempts.map(a => a.problemId));

  // Map to sibling problems
  return problems.map(p => ({
    problemId: p.id,
    patternId: p.patternId,
    difficulty: p.difficulty,
    isAttempted: attemptedIds.has(p.id),
    estimatedTimeSec: p.estimatedTimeSec ?? 600,
  }));
}
