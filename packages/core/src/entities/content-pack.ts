import type { PatternId } from './pattern.js';
import type { RungLevel } from './rung.js';
import type { TestCase } from './problem.js';
import type { HintLevel, StepType } from './step.js';

/**
 * ContentPack - immutable JSON content for a pattern's problems
 */
export interface ContentPack {
  readonly $schema?: string;
  readonly packId: string;
  readonly pattern: PatternId;
  readonly version: string;
  readonly rungs: Partial<Record<RungLevel, RungContent>>;
  readonly microLessons: Record<string, MicroLesson>;
}

export interface RungContent {
  readonly level: RungLevel;
  readonly name: string;
  readonly description: string;
  readonly canonical: ProblemContent;
  readonly siblings: readonly ProblemContent[];
}

export interface ProblemContent {
  readonly problemId: string;
  readonly title: string;
  readonly statement: string;
  readonly targetComplexity: string;
  readonly testCases: readonly TestCase[];
  readonly steps: readonly StepContent[];
  readonly errorMappings: readonly ErrorMapping[];
  readonly microLessonRefs: readonly string[];
  readonly hints: readonly string[];
}

export interface StepContent {
  readonly type: StepType;
  readonly rubric?: StepRubric;
  readonly options?: readonly ReflectionOption[];
}

export interface StepRubric {
  readonly patternRecognition?: PatternRecognitionRubric;
  readonly invariant?: InvariantRubric;
  readonly complexity?: ComplexityRubric;
  readonly correctness?: CriteriaRubric;
  readonly efficiency?: CriteriaRubric;
  readonly codeQuality?: CriteriaRubric;
}

export interface PatternRecognitionRubric {
  readonly expected: string;
  readonly acceptableVariants: readonly string[];
  readonly weight: number;
}

export interface InvariantRubric {
  readonly expected: string;
  readonly keywords: readonly string[];
  readonly weight: number;
}

export interface ComplexityRubric {
  readonly expected: string;
  readonly acceptableVariants: readonly string[];
  readonly weight: number;
}

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

export interface ErrorMapping {
  readonly pattern: string;
  readonly errorType: string;
  readonly microLessonRef: string;
  readonly feedback: string;
}

export interface MicroLesson {
  readonly id: string;
  readonly title: string;
  readonly content: string;
}

export type ContentPackId = string;
