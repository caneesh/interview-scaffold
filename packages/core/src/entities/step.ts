/**
 * Step - a phase within an attempt (thinking gate, coding, reflection, etc.)
 */
export const STEP_TYPES = [
  'THINKING_GATE',
  'PATTERN_DISCOVERY', // Socratic guided pattern discovery sub-flow
  'PATTERN_CHALLENGE', // Advocate's Trap - challenge questionable pattern selection
  'CODING',
  'REFLECTION',
  'SUCCESS_REFLECTION', // Optional post-success reflection
  'ADVERSARY_CHALLENGE', // Optional post-completion constraint mutation challenge
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
  | PatternDiscoveryData
  | PatternChallengeData
  | CodingData
  | ReflectionData
  | SuccessReflectionData
  | AdversaryChallengeData
  | HintData;

export interface ThinkingGateData {
  readonly type: 'THINKING_GATE';
  readonly selectedPattern: string | null;
  readonly statedInvariant: string | null;
  readonly statedComplexity: string | null;
  /**
   * If invariant was built using a template, stores the template choices.
   * Null if user wrote free-text invariant.
   */
  readonly invariantTemplate?: {
    /** ID of the template used */
    readonly templateId: string;
    /** Map of slot ID to chosen index */
    readonly choices: Record<string, number>;
    /** Whether all choices matched correct answers */
    readonly allCorrect: boolean;
  } | null;
}

/**
 * Pattern Discovery - Socratic guided flow to help users discover the pattern
 * Used when user clicks "Help me find the pattern" in Thinking Gate
 */
export const PATTERN_DISCOVERY_MODES = ['HEURISTIC', 'SOCRATIC'] as const;
export type PatternDiscoveryMode = (typeof PATTERN_DISCOVERY_MODES)[number];

export interface PatternDiscoveryQA {
  readonly questionId: string;
  readonly question: string;
  readonly answer: string;
  readonly timestamp: Date;
}

export interface PatternDiscoveryData {
  readonly type: 'PATTERN_DISCOVERY';
  /** Discovery mode: HEURISTIC (keyword-based) or SOCRATIC (LLM-guided) */
  readonly mode: PatternDiscoveryMode;
  /** Log of questions and answers during discovery */
  readonly qaLog: readonly PatternDiscoveryQA[];
  /** Pattern discovered through the flow (null if abandoned or in progress) */
  readonly discoveredPattern: string | null;
  /** Whether discovery was completed (user reached a pattern) */
  readonly completed: boolean;
}

/**
 * Pattern Challenge - "Advocate's Trap" sub-flow
 * Triggers when user selects a pattern with low confidence or rule-based mismatch
 * Challenges the user to defend their choice or reconsider
 */
export interface PatternChallengeData {
  readonly type: 'PATTERN_CHALLENGE';
  /** The pattern the user originally selected */
  readonly challengedPattern: string;
  /** The challenge mode: COUNTEREXAMPLE (specific input) or SOCRATIC (question) */
  readonly mode: 'COUNTEREXAMPLE' | 'SOCRATIC';
  /** The challenge prompt shown to the user */
  readonly challengePrompt: string;
  /** Optional counterexample input that would break the pattern */
  readonly counterexample?: string;
  /** User's response to the challenge */
  readonly userResponse: string | null;
  /** Final decision: kept original or changed */
  readonly decision: 'KEPT_PATTERN' | 'CHANGED_PATTERN' | null;
  /** If changed, which pattern they switched to */
  readonly newPattern: string | null;
  /** Confidence score from the rule engine (0-1) */
  readonly confidenceScore: number;
  /** Reasons for the challenge */
  readonly challengeReasons: readonly string[];
  /** Suggested alternative patterns */
  readonly suggestedAlternatives: readonly string[];
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

/**
 * Adversary Challenge - "Level Up Challenge" post-completion step
 * Presents a constraint mutation (e.g., "What if memory is O(1)?") and
 * asks user to describe how they'd adapt their solution.
 */
export const ADVERSARY_PROMPT_TYPES = [
  'INFINITE_STREAM',    // "What if the input is an infinite stream?"
  'MEMORY_O1',          // "What if you can only use O(1) extra space?"
  'INPUT_UNSORTED',     // "What if the input is no longer sorted?"
  'MULTIPLE_QUERIES',   // "What if you need to answer many queries on the same data?"
  'NEGATIVE_NUMBERS',   // "What if the input contains negative numbers?"
  'DUPLICATE_VALUES',   // "What if there are duplicate values?"
  'ONLINE_UPDATES',     // "What if elements can be added/removed dynamically?"
  'DISTRIBUTED',        // "What if the data is distributed across machines?"
] as const;

export type AdversaryPromptType = (typeof ADVERSARY_PROMPT_TYPES)[number];

export interface AdversaryPrompt {
  readonly id: string;
  readonly type: AdversaryPromptType;
  readonly prompt: string;
  readonly hint?: string;
}

export interface AdversaryChallengeData {
  readonly type: 'ADVERSARY_CHALLENGE';
  /** The mutation prompt shown to the user */
  readonly prompt: AdversaryPrompt;
  /** User's refactor plan response (null if not yet answered) */
  readonly userResponse: string | null;
  /** Optional: User's code attempt for the adversary challenge */
  readonly codeAttempt?: {
    readonly code: string;
    readonly language: string;
  };
  /** Whether the user chose to skip this challenge */
  readonly skipped: boolean;
  /** Timestamp when the user responded */
  readonly respondedAt: Date | null;
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
