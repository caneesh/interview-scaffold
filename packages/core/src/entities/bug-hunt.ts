/**
 * Bug Hunt Mode - Find bugs in code snippets
 *
 * A practice mode where users identify bugs in code and explain them.
 * Validation is deterministic (line overlap) + heuristic (concept matching).
 */

import type { PatternId } from './pattern.js';

/**
 * Difficulty levels for bug hunt items
 */
export const BUG_HUNT_DIFFICULTIES = ['EASY', 'MEDIUM', 'HARD'] as const;
export type BugHuntDifficulty = (typeof BUG_HUNT_DIFFICULTIES)[number];

/**
 * Supported languages for bug hunt code
 */
export const BUG_HUNT_LANGUAGES = ['python', 'javascript', 'typescript'] as const;
export type BugHuntLanguage = (typeof BUG_HUNT_LANGUAGES)[number];

/**
 * A bug hunt item - a code snippet with intentional bugs
 */
export interface BugHuntItem {
  /** Unique identifier */
  readonly id: string;
  /** Tenant ID for multi-tenancy */
  readonly tenantId: string;
  /** Pattern this bug relates to */
  readonly pattern: PatternId;
  /** Difficulty level */
  readonly difficulty: BugHuntDifficulty;
  /** Programming language */
  readonly language: BugHuntLanguage;
  /** The buggy code snippet */
  readonly code: string;
  /** Problem description / what the code should do */
  readonly prompt: string;
  /** Title for display */
  readonly title: string;
  /** Lines containing bugs (1-indexed) */
  readonly expectedBugLines: readonly number[];
  /** Concepts the explanation should mention */
  readonly expectedConcepts: readonly string[];
  /** Hint to show after failed attempt (optional) */
  readonly hint?: string;
  /** Detailed explanation of the bug (shown after success) */
  readonly explanation: string;
  /** When this item was created */
  readonly createdAt: Date;
}

/**
 * Result of a bug hunt attempt
 */
export const BUG_HUNT_RESULTS = ['CORRECT', 'PARTIAL', 'INCORRECT'] as const;
export type BugHuntResult = (typeof BUG_HUNT_RESULTS)[number];

/**
 * A user's submission for a bug hunt item
 */
export interface BugHuntSubmission {
  /** Lines the user selected as buggy (1-indexed) */
  readonly selectedLines: readonly number[];
  /** User's explanation of the bug */
  readonly explanation: string;
}

/**
 * Validation result for a bug hunt submission
 */
export interface BugHuntValidation {
  /** Overall result */
  readonly result: BugHuntResult;
  /** Whether line selection overlaps with expected bug lines */
  readonly lineSelectionCorrect: boolean;
  /** How many expected lines were selected */
  readonly linesFound: number;
  /** Total expected bug lines */
  readonly totalBugLines: number;
  /** Whether explanation contains expected concepts */
  readonly conceptsMatched: boolean;
  /** Which concepts were found in explanation */
  readonly matchedConcepts: readonly string[];
  /** Total expected concepts */
  readonly totalConcepts: number;
  /** Optional LLM feedback (if enabled) */
  readonly llmFeedback?: string;
  /** LLM confidence score (0-1) if LLM was used */
  readonly llmConfidence?: number;
}

/**
 * A user's attempt at a bug hunt item
 */
export interface BugHuntAttempt {
  /** Unique identifier */
  readonly id: string;
  /** Tenant ID */
  readonly tenantId: string;
  /** User who made the attempt */
  readonly userId: string;
  /** Bug hunt item being attempted */
  readonly itemId: string;
  /** User's submission */
  readonly submission: BugHuntSubmission | null;
  /** Validation result */
  readonly validation: BugHuntValidation | null;
  /** When the attempt was started */
  readonly startedAt: Date;
  /** When the attempt was completed (submitted) */
  readonly completedAt: Date | null;
  /** Number of attempts on this item */
  readonly attemptNumber: number;
}

/**
 * Check if selected lines overlap with expected bug lines
 * At least one selected line must be in the expected bug lines
 */
export function checkLineOverlap(
  selectedLines: readonly number[],
  expectedBugLines: readonly number[]
): { correct: boolean; linesFound: number } {
  const expectedSet = new Set(expectedBugLines);
  const foundLines = selectedLines.filter(line => expectedSet.has(line));

  return {
    correct: foundLines.length > 0,
    linesFound: foundLines.length,
  };
}

/**
 * Check if explanation contains expected concepts
 * Uses case-insensitive matching
 */
export function checkConceptMatch(
  explanation: string,
  expectedConcepts: readonly string[],
  minRequired: number = 1
): { matched: boolean; matchedConcepts: string[] } {
  const lowerExplanation = explanation.toLowerCase();
  const matchedConcepts: string[] = [];

  for (const concept of expectedConcepts) {
    // Check for the concept or common variations
    const conceptLower = concept.toLowerCase();
    const variations = [
      conceptLower,
      conceptLower.replace(/-/g, ' '),
      conceptLower.replace(/ /g, '-'),
      conceptLower.replace(/_/g, ' '),
    ];

    if (variations.some(v => lowerExplanation.includes(v))) {
      matchedConcepts.push(concept);
    }
  }

  return {
    matched: matchedConcepts.length >= minRequired,
    matchedConcepts,
  };
}

/**
 * Validate a bug hunt submission
 */
export function validateBugHuntSubmission(
  submission: BugHuntSubmission,
  item: BugHuntItem
): BugHuntValidation {
  const lineCheck = checkLineOverlap(submission.selectedLines, item.expectedBugLines);
  const conceptCheck = checkConceptMatch(submission.explanation, item.expectedConcepts);

  // Determine result based on line selection and concept matching
  let result: BugHuntResult;
  if (lineCheck.correct && conceptCheck.matched) {
    result = 'CORRECT';
  } else if (lineCheck.correct || conceptCheck.matched) {
    result = 'PARTIAL';
  } else {
    result = 'INCORRECT';
  }

  return {
    result,
    lineSelectionCorrect: lineCheck.correct,
    linesFound: lineCheck.linesFound,
    totalBugLines: item.expectedBugLines.length,
    conceptsMatched: conceptCheck.matched,
    matchedConcepts: conceptCheck.matchedConcepts,
    totalConcepts: item.expectedConcepts.length,
  };
}
