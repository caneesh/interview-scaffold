/**
 * Debug Attempt Repository Adapter
 *
 * Implements DebugAttemptRepo port using Drizzle ORM.
 * All queries are scoped by tenantId for multi-tenancy.
 */

import { eq, and, desc, sql } from 'drizzle-orm';
import type { DebugAttemptRepo, DebugAttemptFilter } from '@scaffold/core/debug-track';
import type {
  DebugAttempt,
  DebugScore,
  GateSubmission,
  EvaluationResult,
  GateTimer,
} from '@scaffold/core/debug-track';
import type { DebugGate, DebugAttemptStatus, RubricCriterion } from '@scaffold/core/debug-track';
import type { TenantId } from '@scaffold/core/entities';
import type { DbClient } from '../client.js';
import { debugAttempts, debugAttemptSteps } from '../schema.js';

// Default retries per gate record
const DEFAULT_RETRIES_PER_GATE: Readonly<Record<DebugGate, number>> = {
  SYMPTOM_CLASSIFICATION: 0,
  DETERMINISM_ANALYSIS: 0,
  PATTERN_CLASSIFICATION: 0,
  ROOT_CAUSE_HYPOTHESIS: 0,
  FIX_STRATEGY: 0,
  REGRESSION_PREVENTION: 0,
  REFLECTION: 0,
};

// Default rubric scores
const DEFAULT_RUBRIC_SCORES: Readonly<Record<RubricCriterion, number>> = {
  ACCURACY: 0,
  COMPLETENESS: 0,
  SPECIFICITY: 0,
  TECHNICAL_DEPTH: 0,
  CLARITY: 0,
  ACTIONABILITY: 0,
};

export function createDebugAttemptRepo(db: DbClient): DebugAttemptRepo {
  return {
    async save(attempt: DebugAttempt): Promise<DebugAttempt> {
      await db.insert(debugAttempts).values({
        id: attempt.attemptId,
        tenantId: attempt.tenantId,
        userId: attempt.userId,
        scenarioId: attempt.scenarioId,
        currentGate: attempt.currentGate,
        status: attempt.status,
        hintsUsed: attempt.hintsUsed,
        scoreJson: attempt.scoreJson as unknown as Record<string, unknown> | null,
        startedAt: attempt.startedAt,
        completedAt: attempt.completedAt,
        updatedAt: new Date(),
      });

      // Insert any existing gate history as steps
      for (const step of attempt.gateHistory) {
        await db.insert(debugAttemptSteps).values({
          attemptId: attempt.attemptId,
          gateId: step.gateId,
          answerJson: { answer: step.answer },
          isCorrect: step.evaluationResult.isCorrect,
          feedbackText: step.evaluationResult.feedback,
          rubricJson: step.evaluationResult.rubricScores,
          createdAt: step.timestamp,
        });
      }

      return attempt;
    },

    async findById(
      tenantId: TenantId,
      attemptId: string
    ): Promise<DebugAttempt | null> {
      const result = await db.query.debugAttempts.findFirst({
        where: and(
          eq(debugAttempts.tenantId, tenantId),
          eq(debugAttempts.id, attemptId)
        ),
      });

      if (!result) return null;

      // Fetch gate history (steps)
      const steps = await db.query.debugAttemptSteps.findMany({
        where: eq(debugAttemptSteps.attemptId, attemptId),
        orderBy: [debugAttemptSteps.createdAt],
      });

      return mapToDebugAttempt(result, steps);
    },

    async update(attempt: DebugAttempt): Promise<DebugAttempt> {
      await db
        .update(debugAttempts)
        .set({
          currentGate: attempt.currentGate,
          status: attempt.status,
          hintsUsed: attempt.hintsUsed,
          scoreJson: attempt.scoreJson as unknown as Record<string, unknown> | null,
          completedAt: attempt.completedAt,
          updatedAt: new Date(),
        })
        .where(eq(debugAttempts.id, attempt.attemptId));

      // Insert any new steps not already in the database
      for (const step of attempt.gateHistory) {
        const existing = await db.query.debugAttemptSteps.findFirst({
          where: and(
            eq(debugAttemptSteps.attemptId, attempt.attemptId),
            eq(debugAttemptSteps.gateId, step.gateId)
          ),
        });

        if (!existing) {
          await db.insert(debugAttemptSteps).values({
            attemptId: attempt.attemptId,
            gateId: step.gateId,
            answerJson: { answer: step.answer },
            isCorrect: step.evaluationResult.isCorrect,
            feedbackText: step.evaluationResult.feedback,
            rubricJson: step.evaluationResult.rubricScores,
            createdAt: step.timestamp,
          });
        }
      }

      return attempt;
    },

    async appendGateSubmission(
      tenantId: TenantId,
      attemptId: string,
      submission: GateSubmission
    ): Promise<DebugAttempt> {
      await db.insert(debugAttemptSteps).values({
        attemptId,
        gateId: submission.gateId,
        answerJson: { answer: submission.answer },
        isCorrect: submission.evaluationResult.isCorrect,
        feedbackText: submission.evaluationResult.feedback,
        rubricJson: submission.evaluationResult.rubricScores,
        createdAt: submission.timestamp,
      });

      // Fetch and return the updated attempt
      const result = await this.findById(tenantId, attemptId);
      if (!result) {
        throw new Error(`Attempt not found: ${attemptId}`);
      }
      return result;
    },

    async findActiveByUser(
      tenantId: TenantId,
      userId: string
    ): Promise<DebugAttempt | null> {
      const result = await db.query.debugAttempts.findFirst({
        where: and(
          eq(debugAttempts.tenantId, tenantId),
          eq(debugAttempts.userId, userId),
          eq(debugAttempts.status, 'IN_PROGRESS')
        ),
        orderBy: [desc(debugAttempts.startedAt)],
      });

      if (!result) return null;

      const steps = await db.query.debugAttemptSteps.findMany({
        where: eq(debugAttemptSteps.attemptId, result.id),
        orderBy: [debugAttemptSteps.createdAt],
      });

      return mapToDebugAttempt(result, steps);
    },

    async findByUser(
      tenantId: TenantId,
      userId: string,
      filter?: DebugAttemptFilter
    ): Promise<readonly DebugAttempt[]> {
      const conditions = [
        eq(debugAttempts.tenantId, tenantId),
        eq(debugAttempts.userId, userId),
      ];

      if (filter?.scenarioId) {
        conditions.push(eq(debugAttempts.scenarioId, filter.scenarioId));
      }
      if (filter?.status) {
        conditions.push(eq(debugAttempts.status, filter.status));
      }

      const results = await db.query.debugAttempts.findMany({
        where: and(...conditions),
        orderBy: [desc(debugAttempts.startedAt)],
        limit: filter?.limit ?? 100,
        offset: filter?.offset ?? 0,
      });

      return Promise.all(
        results.map(async (r) => {
          const steps = await db.query.debugAttemptSteps.findMany({
            where: eq(debugAttemptSteps.attemptId, r.id),
            orderBy: [debugAttemptSteps.createdAt],
          });
          return mapToDebugAttempt(r, steps);
        })
      );
    },
  };
}

function mapToDebugAttempt(
  row: typeof debugAttempts.$inferSelect,
  stepRows: (typeof debugAttemptSteps.$inferSelect)[]
): DebugAttempt {
  const gateHistory: GateSubmission[] = stepRows.map((s) => {
    // Merge stored rubric scores with defaults
    const storedScores = (s.rubricJson as Partial<Record<RubricCriterion, number>>) ?? {};
    const rubricScores: Readonly<Record<RubricCriterion, number>> = {
      ...DEFAULT_RUBRIC_SCORES,
      ...storedScores,
    };

    const evaluationResult: EvaluationResult = {
      isCorrect: s.isCorrect,
      confidence: 1, // Not stored, assume high confidence
      feedback: s.feedbackText ?? '',
      rubricScores,
      nextGate: null, // Reconstructed from gate sequence
      allowProceed: s.isCorrect,
    };

    return {
      gateId: s.gateId as DebugGate,
      answer: (s.answerJson as { answer: string }).answer ?? '',
      timestamp: s.createdAt,
      evaluationResult,
    };
  });

  // Build timers from gate history
  const timers: GateTimer[] = gateHistory.map((g, idx) => ({
    gateId: g.gateId,
    startedAt: idx === 0 ? row.startedAt : gateHistory[idx - 1]!.timestamp,
    completedAt: g.timestamp,
    pausedDurationMs: 0,
  }));

  return {
    attemptId: row.id,
    tenantId: row.tenantId as TenantId,
    userId: row.userId,
    scenarioId: row.scenarioId ?? '',
    currentGate: row.currentGate as DebugGate,
    gateHistory,
    hintsUsed: row.hintsUsed ?? 0,
    timers,
    status: row.status as DebugAttemptStatus,
    startedAt: row.startedAt,
    completedAt: row.completedAt,
    scoreJson: row.scoreJson as DebugScore | null,
    retriesPerGate: DEFAULT_RETRIES_PER_GATE,
  };
}
