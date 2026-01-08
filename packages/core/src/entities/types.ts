/**
 * Core type definitions for the learning domain.
 * PURE TypeScript - no framework dependencies.
 */

// ============================================================================
// Base Types
// ============================================================================

export type TenantId = string & { readonly __brand: 'TenantId' };
export type UserId = string & { readonly __brand: 'UserId' };
export type ProblemId = string & { readonly __brand: 'ProblemId' };
export type PatternId = string & { readonly __brand: 'PatternId' };
export type MicroDrillId = string & { readonly __brand: 'MicroDrillId' };
export type MicroLessonId = string & { readonly __brand: 'MicroLessonId' };
export type AttemptId = string & { readonly __brand: 'AttemptId' };
export type SessionId = string & { readonly __brand: 'SessionId' };
export type StepId = string & { readonly __brand: 'StepId' };

// Brand constructor helpers
export const TenantId = (id: string): TenantId => id as TenantId;
export const UserId = (id: string): UserId => id as UserId;
export const ProblemId = (id: string): ProblemId => id as ProblemId;
export const PatternId = (id: string): PatternId => id as PatternId;
export const MicroDrillId = (id: string): MicroDrillId => id as MicroDrillId;
export const MicroLessonId = (id: string): MicroLessonId => id as MicroLessonId;
export const AttemptId = (id: string): AttemptId => id as AttemptId;
export const SessionId = (id: string): SessionId => id as SessionId;
export const StepId = (id: string): StepId => id as StepId;

// ============================================================================
// Enums
// ============================================================================

export const Difficulty = {
  EASY: 'EASY',
  MEDIUM: 'MEDIUM',
  HARD: 'HARD',
} as const;
export type Difficulty = typeof Difficulty[keyof typeof Difficulty];

export const Language = {
  PYTHON: 'python',
  JAVASCRIPT: 'javascript',
  JAVA: 'java',
  TYPESCRIPT: 'typescript',
  GO: 'go',
  RUST: 'rust',
} as const;
export type Language = typeof Language[keyof typeof Language];

export const AttemptMode = {
  GUIDED: 'GUIDED',
  EXPLORER: 'EXPLORER',
  INTERVIEW: 'INTERVIEW',
  DAILY: 'DAILY',
} as const;
export type AttemptMode = typeof AttemptMode[keyof typeof AttemptMode];

export const AttemptStatus = {
  IN_PROGRESS: 'IN_PROGRESS',
  COMPLETED: 'COMPLETED',
  ABANDONED: 'ABANDONED',
  TIMED_OUT: 'TIMED_OUT',
} as const;
export type AttemptStatus = typeof AttemptStatus[keyof typeof AttemptStatus];

export const ErrorTaxonomy = {
  // Existing error types
  SYNTAX_ERROR: 'SYNTAX_ERROR',
  LOGIC_ERROR: 'LOGIC_ERROR',
  EDGE_CASE_MISS: 'EDGE_CASE_MISS',
  PATTERN_MISAPPLY: 'PATTERN_MISAPPLY',
  COMPLEXITY_ISSUE: 'COMPLEXITY_ISSUE',
  // New error types per requirements
  CONFIDENCE_LOW: 'CONFIDENCE_LOW',
  TIME_OVERRUN: 'TIME_OVERRUN',
  TRANSFER_FAIL: 'TRANSFER_FAIL',
} as const;
export type ErrorTaxonomy = typeof ErrorTaxonomy[keyof typeof ErrorTaxonomy];

export const DrillType = {
  PATTERN_RECOGNITION: 'PATTERN_RECOGNITION',
  CODE_COMPLETION: 'CODE_COMPLETION',
  BUG_FIX: 'BUG_FIX',
  COMPLEXITY_ANALYSIS: 'COMPLEXITY_ANALYSIS',
  EDGE_CASE_IDENTIFICATION: 'EDGE_CASE_IDENTIFICATION',
} as const;
export type DrillType = typeof DrillType[keyof typeof DrillType];

export const LessonType = {
  CONCEPT_INTRO: 'CONCEPT_INTRO',
  PATTERN_DEEP_DIVE: 'PATTERN_DEEP_DIVE',
  COMMON_MISTAKES: 'COMMON_MISTAKES',
  OPTIMIZATION_TIPS: 'OPTIMIZATION_TIPS',
} as const;
export type LessonType = typeof LessonType[keyof typeof LessonType];

export const ConfidenceLevel = {
  LOW: 'LOW',
  MEDIUM: 'MEDIUM',
  HIGH: 'HIGH',
} as const;
export type ConfidenceLevel = typeof ConfidenceLevel[keyof typeof ConfidenceLevel];

// ============================================================================
// Timestamp type
// ============================================================================

export type Timestamp = number; // Unix milliseconds
