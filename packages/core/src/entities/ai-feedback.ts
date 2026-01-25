/**
 * AI Feedback - stores AI-generated feedback and coaching responses
 */

import type { AttemptId } from './attempt.js';
import type { SubmissionId } from './submission.js';

export type AIFeedbackId = string;

export const AI_FEEDBACK_TYPES = [
  'hint',
  'explanation',
  'review',
  'guidance',
] as const;

export type AIFeedbackType = (typeof AI_FEEDBACK_TYPES)[number];

/**
 * AI Feedback entity
 */
export interface AIFeedback {
  readonly id: AIFeedbackId;
  readonly userId: string;
  readonly attemptId: AttemptId | null;
  readonly submissionId: SubmissionId | null;
  readonly type: AIFeedbackType;
  readonly model: string; // AI model used
  readonly promptVersion: string;
  readonly inputHash: string; // hash of input for deduplication
  readonly output: AIFeedbackOutput;
  readonly evidence: Record<string, unknown> | null;
  readonly createdAt: Date;
}

/**
 * AI Feedback output (varies by type)
 *
 * For hint:
 * - text: the hint text
 * - level: hint level (directional, heuristic, concept, micro-example, patch)
 *
 * For explanation:
 * - text: the explanation
 * - concepts: related concepts
 *
 * For review:
 * - feedback: review feedback
 * - suggestions: improvement suggestions
 * - score: optional score
 *
 * For guidance:
 * - question: Socratic question
 * - followUp: suggested follow-up
 */
export type AIFeedbackOutput = Record<string, unknown>;

/**
 * Create AI feedback
 */
export function createAIFeedback(params: {
  id: AIFeedbackId;
  userId: string;
  attemptId?: AttemptId | null;
  submissionId?: SubmissionId | null;
  type: AIFeedbackType;
  model: string;
  promptVersion: string;
  inputHash: string;
  output: AIFeedbackOutput;
  evidence?: Record<string, unknown> | null;
  createdAt?: Date;
}): AIFeedback {
  return {
    id: params.id,
    userId: params.userId,
    attemptId: params.attemptId ?? null,
    submissionId: params.submissionId ?? null,
    type: params.type,
    model: params.model,
    promptVersion: params.promptVersion,
    inputHash: params.inputHash,
    output: params.output,
    evidence: params.evidence ?? null,
    createdAt: params.createdAt ?? new Date(),
  };
}
