'use server';

/**
 * Server actions that invoke core use-cases.
 * UI components call these actions; actions call core use-cases.
 * NO business logic here - just orchestration.
 */

import { TenantId, UserId, PatternId, ProblemId } from '@scaffold/core';
import { createDailySession, getNextMicroDrill, getMEPRecommendation, startPatternDiscovery, answerDiscoveryQuestion, getDiscoveryPatterns } from '@scaffold/core';
import type { CreateDailySessionResponseDTO, GetNextDrillResponseDTO } from '@scaffold/contracts';
import { contentRepo, progressRepo, eventSink, clock } from './adapters';

const DEFAULT_TENANT_ID = TenantId(process.env.NEXT_PUBLIC_DEFAULT_TENANT_ID ?? 'default');

/**
 * Creates a daily session for the current user.
 */
export async function createDailySessionAction(
  userId: string,
  options?: {
    availableTimeSec?: number;
    preferredItemCount?: number;
    focusPatterns?: string[];
  }
): Promise<CreateDailySessionResponseDTO> {
  const result = await createDailySession(
    {
      tenantId: DEFAULT_TENANT_ID,
      userId: UserId(userId),
      availableTimeSec: options?.availableTimeSec,
      preferredItemCount: options?.preferredItemCount,
      focusPatterns: options?.focusPatterns?.map(PatternId),
    },
    {
      contentRepo,
      progressRepo,
      eventSink,
      clock,
    }
  );

  // Map to DTO
  return {
    session: {
      id: result.session.id,
      tenantId: result.session.tenantId,
      userId: result.session.userId,
      type: result.session.type,
      status: result.session.status,
      config: {
        timeBudgetSec: result.session.config.timeBudgetSec,
        mode: result.session.config.mode,
        focusPatterns: [...result.session.config.focusPatterns],
        maxItems: result.session.config.maxItems,
      },
      items: result.session.items.map(item => ({
        type: item.type,
        itemId: item.itemId,
        order: item.order,
        completed: item.completed,
        skipped: item.skipped,
      })),
      currentItemIndex: result.session.currentItemIndex,
      metrics: {
        itemsCompleted: result.session.metrics.itemsCompleted,
        itemsSkipped: result.session.metrics.itemsSkipped,
        totalTimeSec: result.session.metrics.totalTimeSec,
        accuracy: result.session.metrics.accuracy,
        averageConfidence: result.session.metrics.averageConfidence,
      },
      startedAt: new Date(result.session.startedAt).toISOString(),
      completedAt: result.session.completedAt
        ? new Date(result.session.completedAt).toISOString()
        : null,
    },
    estimatedTimeSec: result.estimatedTimeSec,
  };
}

/**
 * Gets the next micro drill for the current user.
 */
export async function getNextMicroDrillAction(
  userId: string,
  options?: {
    patternId?: string;
    difficulty?: string;
    excludeDrillIds?: string[];
  }
): Promise<GetNextDrillResponseDTO> {
  const result = await getNextMicroDrill(
    {
      tenantId: DEFAULT_TENANT_ID,
      userId: UserId(userId),
      patternId: options?.patternId ? PatternId(options.patternId) : undefined,
      difficulty: options?.difficulty as any,
      excludeDrillIds: options?.excludeDrillIds,
    },
    {
      contentRepo,
      progressRepo,
      clock,
    }
  );

  // Map to DTO
  return {
    drill: result.drill
      ? {
          id: result.drill.id,
          patternId: result.drill.patternId,
          type: result.drill.type,
          difficulty: result.drill.difficulty,
          title: result.drill.title,
          description: result.drill.description,
          prompt: result.drill.prompt,
          codeSnippet: result.drill.codeSnippet
            ? {
                language: result.drill.codeSnippet.language,
                code: result.drill.codeSnippet.code,
                highlightLines: result.drill.codeSnippet.highlightLines
                  ? [...result.drill.codeSnippet.highlightLines]
                  : undefined,
              }
            : null,
          options: result.drill.options
            ? result.drill.options.map(o => ({ id: o.id, text: o.text }))
            : null,
          hints: [...result.drill.hints],
          timeBudgetSec: result.drill.timeBudgetSec,
          tags: [...result.drill.tags],
        }
      : null,
    reason: result.reason,
    patternContext: result.patternContext
      ? {
          patternId: result.patternContext.patternId,
          drillsCompleted: result.patternContext.drillsCompleted,
          drillsRequired: result.patternContext.drillsRequired,
          accuracy: result.patternContext.accuracy,
        }
      : undefined,
  };
}

/**
 * Gets MEP recommendation for what to do next.
 */
export async function getMEPRecommendationAction(
  userId: string,
  patternId: string,
  problemId?: string,
  timeBudgetSec?: number
) {
  const result = await getMEPRecommendation(
    {
      tenantId: DEFAULT_TENANT_ID,
      userId: UserId(userId),
      patternId: PatternId(patternId),
      currentProblemId: problemId ? ProblemId(problemId) : undefined,
      timeBudgetSec,
    },
    {
      progressRepo,
      contentRepo,
      clock,
    }
  );

  return {
    action: result.decision.action,
    reason: result.decision.reason,
    estimatedTimeSec: result.decision.estimatedTimeSec,
    metadata: result.decision.metadata,
    context: {
      patternId: result.context.patternId,
      rungLevel: result.context.rungLevel,
      consecutiveWins: result.context.consecutiveWins,
    },
    alternatives: result.alternatives.map(alt => ({
      action: alt.action,
      reason: alt.reason,
    })),
    selectedSibling: result.selectedSibling,
  };
}

/**
 * Starts a pattern discovery session.
 */
export async function startPatternDiscoveryAction(
  userId: string,
  patternId: string
) {
  const result = await startPatternDiscovery(
    {
      tenantId: DEFAULT_TENANT_ID,
      userId: UserId(userId),
      patternId: PatternId(patternId),
    },
    {
      clock,
      eventSink,
    }
  );

  if (!result) {
    return { success: false, error: 'Invalid pattern' };
  }

  return {
    success: true,
    sessionId: result.sessionId,
    patternName: result.patternName,
    firstQuestion: result.firstQuestion,
    progress: result.progress,
  };
}

/**
 * Answers a discovery question.
 */
export async function answerDiscoveryQuestionAction(
  userId: string,
  sessionId: string,
  answer: 'yes' | 'no' | 'depends'
) {
  const result = await answerDiscoveryQuestion(
    {
      tenantId: DEFAULT_TENANT_ID,
      userId: UserId(userId),
      sessionId: sessionId as any,
      answer,
    },
    {
      clock,
      eventSink,
    }
  );

  if (!result) {
    return { success: false, error: 'Session not found' };
  }

  return {
    success: true,
    followUp: result.followUp,
    nextQuestion: result.nextQuestion,
    progress: result.progress,
    isComplete: result.isComplete,
    result: result.result,
  };
}

/**
 * Gets available discovery patterns.
 */
export async function getDiscoveryPatternsAction() {
  const result = getDiscoveryPatterns();
  return result.patterns;
}
