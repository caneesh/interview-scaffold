/**
 * Step - a phase within an attempt (thinking gate, coding, reflection, etc.)
 */
export const STEP_TYPES = [
  'THINKING_GATE',
  'CODING',
  'REFLECTION',
  'SUCCESS_REFLECTION', // Optional post-success reflection
  'HINT',
] as const;

export type StepType = (typeof STEP_TYPES)[number];

export const STEP_RESULTS = ['PASS', 'FAIL', 'SKIP'] as const;

export type StepResult = (typeof STEP_RESULTS)[number];

export interface Step {
  readonly id: string;
  readonly attemptId: string;
  readonly type: StepType;
  readonly result: StepResult | null;
  readonly data: StepData;
  readonly startedAt: Date;
  readonly completedAt: Date | null;
}

export type StepData =
  | ThinkingGateData
  | CodingData
  | ReflectionData
  | SuccessReflectionData
  | HintData;

export interface ThinkingGateData {
  readonly type: 'THINKING_GATE';
  readonly selectedPattern: string | null;
  readonly statedInvariant: string | null;
  readonly statedComplexity: string | null;
}

export interface CodingData {
  readonly type: 'CODING';
  readonly code: string;
  readonly language: string;
  readonly testResults: readonly TestResultData[];
  readonly validation?: CodingValidationData;
}

export interface CodingValidationData {
  readonly rubricGrade: 'PASS' | 'PARTIAL' | 'FAIL';
  readonly rubricScore: number;
  readonly heuristicErrors: readonly string[];
  readonly forbiddenConcepts: readonly string[];
  readonly gatingAction: 'PROCEED' | 'PROCEED_WITH_REFLECTION' | 'SHOW_MICRO_LESSON' | 'REQUIRE_REFLECTION' | 'BLOCK_SUBMISSION';
  readonly gatingReason: string;
  readonly microLessonId?: string;
  readonly llmFeedback?: string;
  readonly llmConfidence?: number;
  /** Prompt text for success reflection (only set for PROCEED_WITH_REFLECTION) */
  readonly successReflectionPrompt?: string;
}

export interface TestResultData {
  readonly input: string;
  readonly expected: string;
  readonly actual: string;
  readonly passed: boolean;
  readonly error: string | null;
}

export interface ReflectionData {
  readonly type: 'REFLECTION';
  readonly selectedOptionId: string;
  readonly correct: boolean;
}

/**
 * Success reflection - optional post-success reflection to reinforce learning
 * Captured after passing all tests but before marking attempt complete
 */
export interface SuccessReflectionData {
  readonly type: 'SUCCESS_REFLECTION';
  /** User's confidence in their solution (1-5 scale) */
  readonly confidenceRating: 1 | 2 | 3 | 4 | 5;
  /** Key insight the user learned from this problem */
  readonly learnedInsight: string;
  /** Optional: What would they do differently? */
  readonly improvementNote?: string;
  /** Whether the user chose to skip reflection */
  readonly skipped: boolean;
}

export interface HintData {
  readonly type: 'HINT';
  readonly level: HintLevel;
  readonly text: string;
}

export const HINT_LEVELS = [
  'DIRECTIONAL_QUESTION',
  'HEURISTIC_HINT',
  'CONCEPT_INJECTION',
  'MICRO_EXAMPLE',
  'PATCH_SNIPPET',
] as const;

export type HintLevel = (typeof HINT_LEVELS)[number];

export type StepId = string;
