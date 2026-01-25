/**
 * Evaluation Run - tracks evaluation/grading processes
 *
 * Supports different evaluation types: coding tests, debug gates, rubrics, AI reviews.
 */

import type { AttemptId } from './attempt.js';
import type { SubmissionId } from './submission.js';
import type { Track } from './track.js';

export type EvaluationRunId = string;

export const EVALUATION_TYPES = [
  'coding_tests',
  'debug_gate',
  'rubric',
  'ai_review',
] as const;

export type EvaluationType = (typeof EVALUATION_TYPES)[number];

export const EVALUATION_STATUSES = [
  'queued',
  'running',
  'succeeded',
  'failed',
  'canceled',
] as const;

export type EvaluationStatus = (typeof EVALUATION_STATUSES)[number];

/**
 * Evaluation Run entity
 */
export interface EvaluationRun {
  readonly id: EvaluationRunId;
  readonly attemptId: AttemptId;
  readonly submissionId: SubmissionId | null;
  readonly userId: string;
  readonly track: Track;
  readonly type: EvaluationType;
  readonly status: EvaluationStatus;
  readonly startedAt: Date | null;
  readonly completedAt: Date | null;
  readonly summary: EvaluationSummary | null;
  readonly details: EvaluationDetails | null;
  readonly createdAt: Date;
}

/**
 * Evaluation summary (varies by type)
 */
export type EvaluationSummary = Record<string, unknown>;

/**
 * Evaluation details (varies by type)
 */
export type EvaluationDetails = Record<string, unknown>;

/**
 * Coding Test Result - individual test case result
 */
export interface CodingTestResult {
  readonly evaluationRunId: EvaluationRunId;
  readonly testIndex: number;
  readonly passed: boolean;
  readonly isHidden: boolean;
  readonly expected: string | null;
  readonly actual: string | null;
  readonly stdout: string | null;
  readonly stderr: string | null;
  readonly durationMs: number | null;
  readonly error: string | null;
}

/**
 * Rubric Score - score per criterion
 */
export interface RubricScore {
  readonly evaluationRunId: EvaluationRunId;
  readonly criterion: string;
  readonly score: number;
  readonly maxScore: number;
  readonly rationale: string | null;
  readonly evidence: Record<string, unknown> | null;
}

/**
 * Debug Diagnostic - key-value diagnostic data
 */
export interface DebugDiagnostic {
  readonly evaluationRunId: EvaluationRunId;
  readonly key: string;
  readonly value: Record<string, unknown> | null;
  readonly evidence: Record<string, unknown> | null;
}

/**
 * Create a queued evaluation run
 */
export function createQueuedEvaluationRun(params: {
  id: EvaluationRunId;
  attemptId: AttemptId;
  submissionId?: SubmissionId | null;
  userId: string;
  track: Track;
  type: EvaluationType;
  createdAt?: Date;
}): EvaluationRun {
  return {
    id: params.id,
    attemptId: params.attemptId,
    submissionId: params.submissionId ?? null,
    userId: params.userId,
    track: params.track,
    type: params.type,
    status: 'queued',
    startedAt: null,
    completedAt: null,
    summary: null,
    details: null,
    createdAt: params.createdAt ?? new Date(),
  };
}

/**
 * Mark an evaluation run as completed
 */
export function completeEvaluationRun(
  run: EvaluationRun,
  params: {
    status: 'succeeded' | 'failed' | 'canceled';
    summary?: EvaluationSummary | null;
    details?: EvaluationDetails | null;
    completedAt?: Date;
  }
): EvaluationRun {
  return {
    ...run,
    status: params.status,
    summary: params.summary ?? null,
    details: params.details ?? null,
    completedAt: params.completedAt ?? new Date(),
  };
}
