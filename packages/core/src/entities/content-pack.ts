import type { PatternId } from './pattern.js';
import type { RungLevel } from './rung.js';
import type { StepType } from './step.js';

// ============================================================================
// Content Pack - Top Level
// ============================================================================

/**
 * ContentPack - immutable JSON content for a pattern's problems
 */
export interface ContentPack {
  readonly packId: string;
  readonly pattern: PatternId;
  readonly version: string;
  readonly rungs: readonly RungContent[];
  readonly microLessons: readonly MicroLesson[];
  readonly errorMappings: readonly ErrorMapping[];
}

export type ContentPackId = string;

// ============================================================================
// Rung Content
// ============================================================================

export interface RungContent {
  readonly rungLevel: RungLevel;
  readonly theme: string;
  readonly canonical: ProblemContent;
  readonly siblings: readonly ProblemContent[];
}

// ============================================================================
// Problem Content
// ============================================================================

export type Difficulty = 'EASY' | 'MEDIUM' | 'HARD';

export type SupportedLanguage = 'python' | 'typescript';

export interface ProblemContent {
  readonly problemId: string;
  readonly title: string;
  readonly difficulty: Difficulty;
  readonly estimatedMinutes: number;
  readonly description: string;
  readonly examples: readonly ProblemExample[];
  readonly constraints: readonly string[];
  readonly starterCode: Readonly<Record<SupportedLanguage, string>>;
  readonly referenceSolution: Readonly<Record<SupportedLanguage, string>>;
  readonly testCases: readonly ContentPackTestCase[];
  readonly steps: readonly StepContent[];
}

export interface ProblemExample {
  readonly input: string;
  readonly output: string;
  readonly explanation?: string;
}

export interface ContentPackTestCase {
  readonly input: Record<string, unknown>;
  readonly expected: unknown;
}

// ============================================================================
// Step Content
// ============================================================================

export interface StepContent {
  readonly stepId: string;
  readonly type: StepType;
  readonly prompt: string;
  readonly hints: readonly string[];
  readonly rubric: StepRubric;
}

export interface StepRubric {
  readonly patternRecognition: RubricDimension;
  readonly invariantUnderstanding: RubricDimension;
  readonly complexityAnalysis: RubricDimension;
}

export interface RubricDimension {
  readonly criteria: string;
  readonly points: number;
  readonly errorMappings: readonly string[];
}

// ============================================================================
// Micro Lessons
// ============================================================================

export interface MicroLesson {
  readonly lessonId: string;
  readonly title: string;
  readonly content: string;
  readonly triggerErrorIds: readonly string[];
  readonly prerequisites: readonly string[];
}

// ============================================================================
// Error Mappings
// ============================================================================

export interface ErrorMapping {
  readonly errorId: string;
  readonly pattern: string;
  readonly lessonIds: readonly string[];
  readonly feedbackTemplate: string;
}

// ============================================================================
// Legacy Types (for backwards compatibility)
// ============================================================================

/** @deprecated Use RubricDimension instead */
export interface PatternRecognitionRubric {
  readonly expected: string;
  readonly acceptableVariants: readonly string[];
  readonly weight: number;
}

/** @deprecated Use RubricDimension instead */
export interface InvariantRubric {
  readonly expected: string;
  readonly keywords: readonly string[];
  readonly weight: number;
}

/** @deprecated Use RubricDimension instead */
export interface ComplexityRubric {
  readonly expected: string;
  readonly acceptableVariants: readonly string[];
  readonly weight: number;
}

/** @deprecated Use RubricDimension instead */
export interface CriteriaRubric {
  readonly weight: number;
  readonly criteria: readonly string[];
}

export interface ReflectionOption {
  readonly id: string;
  readonly text: string;
  readonly isCorrect: boolean;
  readonly feedback: string;
}
