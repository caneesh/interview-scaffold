/**
 * Socratic Turn - conversation turns in Socratic coaching dialogues
 */

import type { AttemptId } from './attempt.js';

export type SocraticTurnId = string;

export const SOCRATIC_ROLES = [
  'user',
  'assistant',
  'system',
] as const;

export type SocraticRole = (typeof SOCRATIC_ROLES)[number];

/**
 * Socratic Turn entity
 */
export interface SocraticTurn {
  readonly id: SocraticTurnId;
  readonly attemptId: AttemptId;
  readonly userId: string;
  readonly turnIndex: number;
  readonly role: SocraticRole;
  readonly message: string;
  readonly question: SocraticQuestion | null; // structured question if applicable
  readonly validation: SocraticValidation | null; // validation result if applicable
  readonly createdAt: Date;
}

/**
 * Structured Socratic question
 */
export interface SocraticQuestion {
  readonly questionType: string; // 'clarifying' | 'probing' | 'challenging' | 'hypothetical'
  readonly targetConcept?: string; // what concept this question targets
  readonly expectedInsight?: string; // what insight the question should elicit
  readonly options?: readonly string[]; // optional multiple choice options
}

/**
 * Validation of a user's response to a Socratic question
 */
export interface SocraticValidation {
  readonly isCorrect: boolean;
  readonly confidence: number; // 0-1
  readonly feedback?: string;
  readonly misconceptions?: readonly string[]; // detected misconceptions
  readonly nextQuestionHint?: string; // hint for what to ask next
}

/**
 * Create a Socratic turn
 */
export function createSocraticTurn(params: {
  id: SocraticTurnId;
  attemptId: AttemptId;
  userId: string;
  turnIndex: number;
  role: SocraticRole;
  message: string;
  question?: SocraticQuestion | null;
  validation?: SocraticValidation | null;
  createdAt?: Date;
}): SocraticTurn {
  return {
    id: params.id,
    attemptId: params.attemptId,
    userId: params.userId,
    turnIndex: params.turnIndex,
    role: params.role,
    message: params.message,
    question: params.question ?? null,
    validation: params.validation ?? null,
    createdAt: params.createdAt ?? new Date(),
  };
}

/**
 * Get next turn index for an attempt
 */
export function getNextTurnIndex(turns: readonly SocraticTurn[]): number {
  if (turns.length === 0) return 0;
  return Math.max(...turns.map((t) => t.turnIndex)) + 1;
}
