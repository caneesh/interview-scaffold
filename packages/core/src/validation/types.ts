/**
 * Validation types for the validation engine.
 * PURE TypeScript - no framework dependencies.
 */

import type { PatternId, Language } from '../entities/types.js';

// ============================================================================
// Grading Types
// ============================================================================

export const GradeResult = {
  PASS: 'PASS',
  PARTIAL: 'PARTIAL',
  FAIL: 'FAIL',
} as const;
export type GradeResult = typeof GradeResult[keyof typeof GradeResult];

// ============================================================================
// Checkpoint Types
// ============================================================================

export const CheckpointType = {
  APPROACH: 'APPROACH',
  INVARIANT: 'INVARIANT',
  PLAN: 'PLAN',
  CODE: 'CODE',
} as const;
export type CheckpointType = typeof CheckpointType[keyof typeof CheckpointType];

export interface CheckpointResult {
  readonly checkpoint: CheckpointType;
  readonly grade: GradeResult;
  readonly feedback: string;
  readonly errors: readonly ValidationError[];
  readonly timestamp: number;
}

// ============================================================================
// Validation Error Types
// ============================================================================

export const ValidationErrorType = {
  // Approach errors
  WRONG_PATTERN: 'WRONG_PATTERN',
  MISSING_EDGE_CASE: 'MISSING_EDGE_CASE',
  INCORRECT_COMPLEXITY: 'INCORRECT_COMPLEXITY',

  // Invariant errors
  MISSING_INVARIANT: 'MISSING_INVARIANT',
  INCORRECT_INVARIANT: 'INCORRECT_INVARIANT',

  // Plan errors
  INCOMPLETE_PLAN: 'INCOMPLETE_PLAN',
  WRONG_ORDER: 'WRONG_ORDER',

  // Code errors
  FORBIDDEN_CONCEPT: 'FORBIDDEN_CONCEPT',
  PATTERN_VIOLATION: 'PATTERN_VIOLATION',
  SYNTAX_ERROR: 'SYNTAX_ERROR',
  LOGIC_ERROR: 'LOGIC_ERROR',

  // Pattern-specific errors
  NESTED_LOOP_IN_SLIDING_WINDOW: 'NESTED_LOOP_IN_SLIDING_WINDOW',
  WRONG_SHRINK_CONSTRUCT: 'WRONG_SHRINK_CONSTRUCT',
  MISSING_VISITED_SET: 'MISSING_VISITED_SET',
  MISSING_BACKTRACK: 'MISSING_BACKTRACK',
} as const;
export type ValidationErrorType = typeof ValidationErrorType[keyof typeof ValidationErrorType];

export interface ValidationError {
  readonly type: ValidationErrorType;
  readonly message: string;
  readonly line?: number;
  readonly column?: number;
  readonly suggestion?: string;
  readonly severity: 'error' | 'warning';
}

// ============================================================================
// Rubric Types
// ============================================================================

export interface RubricCriterion {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly weight: number;
  readonly required: boolean;
  readonly keywords?: readonly string[];
  readonly patterns?: readonly RegExp[];
}

export interface RubricResult {
  readonly criterionId: string;
  readonly met: boolean;
  readonly score: number;
  readonly feedback: string;
}

export interface Rubric {
  readonly id: string;
  readonly checkpoint: CheckpointType;
  readonly patternId: PatternId | null;
  readonly criteria: readonly RubricCriterion[];
  readonly passingScore: number;
  readonly partialScore: number;
}

// ============================================================================
// Forbidden Concept Types
// ============================================================================

export interface ForbiddenConcept {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly patterns: readonly ForbiddenPattern[];
  readonly applicablePatterns: readonly PatternId[];
  readonly errorType: ValidationErrorType;
}

export interface ForbiddenPattern {
  readonly language: Language;
  readonly regex: string;
  readonly description: string;
}

// ============================================================================
// Heuristic Types
// ============================================================================

export interface PatternHeuristic {
  readonly patternId: PatternId;
  readonly name: string;
  readonly description: string;
  readonly check: HeuristicCheck;
}

export interface HeuristicCheck {
  readonly language: Language;
  readonly detect: readonly HeuristicRule[];
  readonly errorType: ValidationErrorType;
  readonly severity: 'error' | 'warning';
}

export interface HeuristicRule {
  readonly name: string;
  readonly regex: string;
  readonly mustMatch?: boolean;
  readonly mustNotMatch?: boolean;
  readonly message: string;
}

// ============================================================================
// Gating Types
// ============================================================================

export const GatingReason = {
  SAME_ERROR_TWICE: 'SAME_ERROR_TWICE',
  HINT2_TWICE: 'HINT2_TWICE',
  RETRIES_EXCEEDED: 'RETRIES_EXCEEDED',
} as const;
export type GatingReason = typeof GatingReason[keyof typeof GatingReason];

export interface GatingDecision {
  readonly shouldGate: boolean;
  readonly reason: GatingReason | null;
  readonly recommendedLessonId: string | null;
  readonly errorHistory: readonly ValidationErrorType[];
}

// ============================================================================
// Submission Context
// ============================================================================

export interface SubmissionContext {
  readonly patternId: PatternId;
  readonly language: Language;
  readonly checkpoint: CheckpointType;
  readonly code: string;
  readonly previousErrors: readonly ValidationErrorType[];
  readonly hintsUsed: readonly number[];
  readonly retryCount: number;
  readonly checkpointResults: readonly CheckpointResult[];
}

// ============================================================================
// Validation Result
// ============================================================================

export interface ValidationResult {
  readonly grade: GradeResult;
  readonly checkpointResult: CheckpointResult;
  readonly rubricResults: readonly RubricResult[];
  readonly errors: readonly ValidationError[];
  readonly gating: GatingDecision;
  readonly canProceed: boolean;
  readonly blockedReason: string | null;
}
