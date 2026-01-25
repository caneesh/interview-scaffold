/**
 * Submission - user-submitted content for evaluation
 *
 * Supports multiple content types: code, text, diagrams, gate answers, etc.
 */

import type { AttemptId } from './attempt.js';

export type SubmissionId = string;

export const SUBMISSION_TYPES = [
  'code',
  'text',
  'diagram',
  'gate',
  'triage',
  'reflection',
  'files',
] as const;

export type SubmissionType = (typeof SUBMISSION_TYPES)[number];

/**
 * Submission entity
 */
export interface Submission {
  readonly id: SubmissionId;
  readonly attemptId: AttemptId;
  readonly userId: string;
  readonly type: SubmissionType;
  readonly language: string | null; // programming language for code submissions
  readonly contentText: string | null; // plain text content
  readonly contentJson: SubmissionContent;
  readonly isFinal: boolean;
  readonly createdAt: Date;
}

/**
 * Submission content (varies by type)
 *
 * For code submissions:
 * - code: the source code
 * - language: programming language
 *
 * For gate submissions:
 * - gateId: which gate (e.g., 'THINKING_GATE', 'TRIAGE')
 * - answers: user's answers to gate questions
 *
 * For triage submissions:
 * - defectCategory: selected defect category
 * - severity: selected severity
 * - priority: selected priority
 *
 * For reflection submissions:
 * - optionId: selected reflection option
 * - freeText: optional free-text explanation
 */
export type SubmissionContent = Record<string, unknown>;

/**
 * Create a new submission
 */
export function createSubmission(params: {
  id: SubmissionId;
  attemptId: AttemptId;
  userId: string;
  type: SubmissionType;
  language?: string | null;
  contentText?: string | null;
  contentJson?: SubmissionContent;
  isFinal?: boolean;
  createdAt?: Date;
}): Submission {
  return {
    id: params.id,
    attemptId: params.attemptId,
    userId: params.userId,
    type: params.type,
    language: params.language ?? null,
    contentText: params.contentText ?? null,
    contentJson: params.contentJson ?? {},
    isFinal: params.isFinal ?? false,
    createdAt: params.createdAt ?? new Date(),
  };
}
