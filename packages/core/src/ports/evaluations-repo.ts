/**
 * Evaluations Repository Port
 *
 * Port interface for evaluation run storage and retrieval.
 */

import type { AttemptId } from '../entities/attempt.js';
import type { SubmissionId } from '../entities/submission.js';
import type { Track } from '../entities/track.js';
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
} from '../entities/evaluation-run.js';

/**
 * Evaluations Repository Port
 */
export interface EvaluationsRepoPort {
  /**
   * Create a new evaluation run in queued status
   */
  createEvaluationRunQueued(params: {
    id: EvaluationRunId;
    attemptId: AttemptId;
    submissionId?: SubmissionId | null;
    userId: string;
    track: Track;
    type: EvaluationType;
  }): Promise<EvaluationRun>;

  /**
   * Get an evaluation run by ID
   */
  getEvaluationRun(id: EvaluationRunId): Promise<EvaluationRun | null>;

  /**
   * Mark an evaluation run as running
   */
  markEvaluationRunRunning(id: EvaluationRunId): Promise<EvaluationRun>;

  /**
   * Mark an evaluation run as completed (succeeded, failed, or canceled)
   */
  markEvaluationRunCompleted(
    id: EvaluationRunId,
    params: {
      status: 'succeeded' | 'failed' | 'canceled';
      summary?: EvaluationSummary | null;
      details?: EvaluationDetails | null;
    }
  ): Promise<EvaluationRun>;

  /**
   * List evaluation runs for an attempt
   */
  listEvaluationRunsForAttempt(
    attemptId: AttemptId,
    options?: {
      type?: EvaluationType;
      status?: EvaluationStatus;
      limit?: number;
    }
  ): Promise<readonly EvaluationRun[]>;

  /**
   * Get the latest evaluation run for an attempt (optionally by type)
   */
  getLatestEvaluationRun(
    attemptId: AttemptId,
    type?: EvaluationType
  ): Promise<EvaluationRun | null>;

  /**
   * Write coding test results for an evaluation run
   */
  writeCodingTestResults(
    evaluationRunId: EvaluationRunId,
    results: readonly Omit<CodingTestResult, 'evaluationRunId'>[]
  ): Promise<readonly CodingTestResult[]>;

  /**
   * Get coding test results for an evaluation run
   */
  getCodingTestResults(
    evaluationRunId: EvaluationRunId
  ): Promise<readonly CodingTestResult[]>;

  /**
   * Write rubric scores for an evaluation run
   */
  writeRubricScores(
    evaluationRunId: EvaluationRunId,
    scores: readonly Omit<RubricScore, 'evaluationRunId'>[]
  ): Promise<readonly RubricScore[]>;

  /**
   * Get rubric scores for an evaluation run
   */
  getRubricScores(
    evaluationRunId: EvaluationRunId
  ): Promise<readonly RubricScore[]>;

  /**
   * Write debug diagnostics for an evaluation run
   */
  writeDebugDiagnostics(
    evaluationRunId: EvaluationRunId,
    diagnostics: readonly Omit<DebugDiagnostic, 'evaluationRunId'>[]
  ): Promise<readonly DebugDiagnostic[]>;

  /**
   * Get debug diagnostics for an evaluation run
   */
  getDebugDiagnostics(
    evaluationRunId: EvaluationRunId
  ): Promise<readonly DebugDiagnostic[]>;
}
