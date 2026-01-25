/**
 * Evaluations Repository Adapter
 *
 * Implements EvaluationsRepoPort using Drizzle ORM.
 */

import { eq, and, desc } from 'drizzle-orm';
import type { EvaluationsRepoPort } from '@scaffold/core/ports';
import type {
  EvaluationRun,
  EvaluationRunId,
  EvaluationType,
  EvaluationStatus,
  EvaluationSummary,
  EvaluationDetails,
  CodingTestResult,
  RubricScore,
  DebugDiagnostic,
} from '@scaffold/core/entities';
import type { AttemptId } from '@scaffold/core/entities';
import type { SubmissionId } from '@scaffold/core/entities';
import type { Track } from '@scaffold/core/entities';
import type { DbClient } from '../client.js';
import {
  evaluationRuns,
  codingTestResults,
  rubricScores,
  debugDiagnostics,
} from '../schema.js';

export function createEvaluationsRepo(db: DbClient): EvaluationsRepoPort {
  return {
    async createEvaluationRunQueued(params: {
      id: EvaluationRunId;
      attemptId: AttemptId;
      submissionId?: SubmissionId | null;
      userId: string;
      track: Track;
      type: EvaluationType;
    }): Promise<EvaluationRun> {
      const [inserted] = await db
        .insert(evaluationRuns)
        .values({
          id: params.id,
          attemptId: params.attemptId,
          submissionId: params.submissionId ?? null,
          userId: params.userId,
          track: params.track,
          type: params.type,
          status: 'queued',
        })
        .returning();

      if (!inserted) {
        throw new Error('Failed to insert evaluation run');
      }

      return mapToEvaluationRun(inserted);
    },

    async getEvaluationRun(id: EvaluationRunId): Promise<EvaluationRun | null> {
      const result = await db.query.evaluationRuns.findFirst({
        where: eq(evaluationRuns.id, id),
      });

      return result ? mapToEvaluationRun(result) : null;
    },

    async markEvaluationRunRunning(id: EvaluationRunId): Promise<EvaluationRun> {
      const [updated] = await db
        .update(evaluationRuns)
        .set({
          status: 'running',
          startedAt: new Date(),
        })
        .where(eq(evaluationRuns.id, id))
        .returning();

      if (!updated) {
        throw new Error(`Evaluation run not found: ${id}`);
      }

      return mapToEvaluationRun(updated);
    },

    async markEvaluationRunCompleted(
      id: EvaluationRunId,
      params: {
        status: 'succeeded' | 'failed' | 'canceled';
        summary?: EvaluationSummary | null;
        details?: EvaluationDetails | null;
      }
    ): Promise<EvaluationRun> {
      const [updated] = await db
        .update(evaluationRuns)
        .set({
          status: params.status,
          summary: params.summary ?? null,
          details: params.details ?? null,
          completedAt: new Date(),
        })
        .where(eq(evaluationRuns.id, id))
        .returning();

      if (!updated) {
        throw new Error(`Evaluation run not found: ${id}`);
      }

      return mapToEvaluationRun(updated);
    },

    async listEvaluationRunsForAttempt(
      attemptId: AttemptId,
      options?: {
        type?: EvaluationType;
        status?: EvaluationStatus;
        limit?: number;
      }
    ): Promise<readonly EvaluationRun[]> {
      const conditions = [eq(evaluationRuns.attemptId, attemptId)];

      if (options?.type) {
        conditions.push(eq(evaluationRuns.type, options.type));
      }
      if (options?.status) {
        conditions.push(eq(evaluationRuns.status, options.status));
      }

      const results = await db.query.evaluationRuns.findMany({
        where: and(...conditions),
        orderBy: [desc(evaluationRuns.createdAt)],
        limit: options?.limit ?? 100,
      });

      return results.map(mapToEvaluationRun);
    },

    async getLatestEvaluationRun(
      attemptId: AttemptId,
      type?: EvaluationType
    ): Promise<EvaluationRun | null> {
      const conditions = [eq(evaluationRuns.attemptId, attemptId)];

      if (type) {
        conditions.push(eq(evaluationRuns.type, type));
      }

      const result = await db.query.evaluationRuns.findFirst({
        where: and(...conditions),
        orderBy: [desc(evaluationRuns.createdAt)],
      });

      return result ? mapToEvaluationRun(result) : null;
    },

    async writeCodingTestResults(
      evaluationRunId: EvaluationRunId,
      results: readonly Omit<CodingTestResult, 'evaluationRunId'>[]
    ): Promise<readonly CodingTestResult[]> {
      if (results.length === 0) return [];

      const values = results.map((r) => ({
        evaluationRunId,
        testIndex: r.testIndex,
        passed: r.passed,
        isHidden: r.isHidden,
        expected: r.expected,
        actual: r.actual,
        stdout: r.stdout,
        stderr: r.stderr,
        durationMs: r.durationMs,
        error: r.error,
      }));

      const inserted = await db
        .insert(codingTestResults)
        .values(values)
        .returning();

      return inserted.map(mapToCodingTestResult);
    },

    async getCodingTestResults(
      evaluationRunId: EvaluationRunId
    ): Promise<readonly CodingTestResult[]> {
      const results = await db.query.codingTestResults.findMany({
        where: eq(codingTestResults.evaluationRunId, evaluationRunId),
        orderBy: [codingTestResults.testIndex],
      });

      return results.map(mapToCodingTestResult);
    },

    async writeRubricScores(
      evaluationRunId: EvaluationRunId,
      scores: readonly Omit<RubricScore, 'evaluationRunId'>[]
    ): Promise<readonly RubricScore[]> {
      if (scores.length === 0) return [];

      const values = scores.map((s) => ({
        evaluationRunId,
        criterion: s.criterion,
        score: s.score,
        maxScore: s.maxScore,
        rationale: s.rationale,
        evidence: s.evidence,
      }));

      const inserted = await db
        .insert(rubricScores)
        .values(values)
        .returning();

      return inserted.map(mapToRubricScore);
    },

    async getRubricScores(
      evaluationRunId: EvaluationRunId
    ): Promise<readonly RubricScore[]> {
      const results = await db.query.rubricScores.findMany({
        where: eq(rubricScores.evaluationRunId, evaluationRunId),
      });

      return results.map(mapToRubricScore);
    },

    async writeDebugDiagnostics(
      evaluationRunId: EvaluationRunId,
      diagnostics: readonly Omit<DebugDiagnostic, 'evaluationRunId'>[]
    ): Promise<readonly DebugDiagnostic[]> {
      if (diagnostics.length === 0) return [];

      const values = diagnostics.map((d) => ({
        evaluationRunId,
        key: d.key,
        value: d.value,
        evidence: d.evidence,
      }));

      const inserted = await db
        .insert(debugDiagnostics)
        .values(values)
        .returning();

      return inserted.map(mapToDebugDiagnostic);
    },

    async getDebugDiagnostics(
      evaluationRunId: EvaluationRunId
    ): Promise<readonly DebugDiagnostic[]> {
      const results = await db.query.debugDiagnostics.findMany({
        where: eq(debugDiagnostics.evaluationRunId, evaluationRunId),
      });

      return results.map(mapToDebugDiagnostic);
    },
  };
}

function mapToEvaluationRun(
  row: typeof evaluationRuns.$inferSelect
): EvaluationRun {
  return {
    id: row.id,
    attemptId: row.attemptId,
    submissionId: row.submissionId,
    userId: row.userId,
    track: row.track as Track,
    type: row.type as EvaluationType,
    status: row.status as EvaluationStatus,
    startedAt: row.startedAt,
    completedAt: row.completedAt,
    summary: row.summary as EvaluationSummary | null,
    details: row.details as EvaluationDetails | null,
    createdAt: row.createdAt,
  };
}

function mapToCodingTestResult(
  row: typeof codingTestResults.$inferSelect
): CodingTestResult {
  return {
    evaluationRunId: row.evaluationRunId,
    testIndex: row.testIndex,
    passed: row.passed,
    isHidden: row.isHidden,
    expected: row.expected,
    actual: row.actual,
    stdout: row.stdout,
    stderr: row.stderr,
    durationMs: row.durationMs,
    error: row.error,
  };
}

function mapToRubricScore(
  row: typeof rubricScores.$inferSelect
): RubricScore {
  return {
    evaluationRunId: row.evaluationRunId,
    criterion: row.criterion,
    score: row.score,
    maxScore: row.maxScore,
    rationale: row.rationale,
    evidence: row.evidence as Record<string, unknown> | null,
  };
}

function mapToDebugDiagnostic(
  row: typeof debugDiagnostics.$inferSelect
): DebugDiagnostic {
  return {
    evaluationRunId: row.evaluationRunId,
    key: row.key,
    value: row.value as Record<string, unknown> | null,
    evidence: row.evidence as Record<string, unknown> | null,
  };
}
