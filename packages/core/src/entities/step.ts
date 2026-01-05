/**
 * Step - a phase within an attempt (thinking gate, coding, reflection, etc.)
 */
export const STEP_TYPES = [
  'THINKING_GATE',
  'CODING',
  'REFLECTION',
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
  readonly gatingAction: 'PROCEED' | 'SHOW_MICRO_LESSON' | 'REQUIRE_REFLECTION' | 'BLOCK_SUBMISSION';
  readonly gatingReason: string;
  readonly microLessonId?: string;
  readonly llmFeedback?: string;
  readonly llmConfidence?: number;
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
