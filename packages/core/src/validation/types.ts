/**
 * Validation Engine Types
 * Pure TypeScript - no external dependencies
 */

import type { PatternId } from '../entities/pattern.js';

// ============ Rubric Grading ============

export const RUBRIC_GRADES = ['PASS', 'PARTIAL', 'FAIL'] as const;
export type RubricGrade = (typeof RUBRIC_GRADES)[number];

export interface RubricResult {
  readonly grade: RubricGrade;
  readonly score: number; // 0-1
  readonly criteria: readonly CriterionResult[];
}

export interface CriterionResult {
  readonly id: string;
  readonly name: string;
  readonly passed: boolean;
  readonly weight: number;
  readonly feedback?: string;
}

// ============ Error Types ============

export const ERROR_TYPES = [
  // Pattern recognition errors
  'WRONG_PATTERN',
  'PATTERN_NOT_STATED',

  // Implementation errors
  'FORBIDDEN_CONCEPT',
  'NESTED_LOOPS_DETECTED',
  'WRONG_SHRINK_MECHANISM',
  'MISSING_VISITED_CHECK',
  'MISSING_BACKTRACK',
  'MISSING_BASE_CASE',
  'INCOMPLETE_TRAVERSAL',
  'USING_BFS_FOR_DFS',
  'VISIT_ORDER_ERROR',
  'OFF_BY_ONE',
  'BOUNDARY_ERROR',
  'IMPLEMENTATION_BUG',

  // Complexity errors
  'COMPLEXITY_TOO_HIGH',
  'SUBOPTIMAL_SOLUTION',

  // Test errors
  'WRONG_OUTPUT',
  'RUNTIME_ERROR',
  'TIMEOUT',

  // General
  'UNKNOWN',
] as const;

export type ErrorType = (typeof ERROR_TYPES)[number];

// ============ Error Events ============

export interface ErrorEvent {
  readonly type: ErrorType;
  readonly severity: 'ERROR' | 'WARNING' | 'INFO';
  readonly message: string;
  readonly location?: CodeLocation;
  readonly evidence?: string[];
  readonly suggestion?: string;
}

export interface CodeLocation {
  readonly line: number;
  readonly column?: number;
  readonly snippet?: string;
}

// ============ Validation Context ============

export interface ValidationContext {
  readonly pattern: PatternId;
  readonly rung: number;
  readonly code: string;
  readonly language: string;
  readonly forbiddenConcepts: readonly string[];
  readonly requiredConcepts: readonly string[];
}

// ============ Validation Result ============

export interface ValidationResult {
  readonly rubric: RubricResult;
  readonly errors: readonly ErrorEvent[];
  readonly heuristicsPassed: boolean;
  readonly forbiddenConceptsDetected: readonly string[];
  readonly gatingDecision: GatingDecision;
}

// ============ Gating ============

export const GATING_ACTIONS = [
  'PROCEED',
  'SHOW_MICRO_LESSON',
  'REQUIRE_REFLECTION',
  'BLOCK_SUBMISSION',
] as const;

export type GatingAction = (typeof GATING_ACTIONS)[number];

export interface GatingDecision {
  readonly action: GatingAction;
  readonly reason: string;
  readonly microLessonId?: string;
  readonly requiredReflectionType?: string;
}

// ============ Heuristic Types ============

export interface HeuristicCheck {
  readonly id: string;
  readonly name: string;
  readonly pattern: PatternId;
  readonly check: (code: string, language: string) => HeuristicResult;
}

export interface HeuristicResult {
  readonly passed: boolean;
  readonly errorType?: ErrorType;
  readonly evidence?: string[];
  readonly suggestion?: string;
}
