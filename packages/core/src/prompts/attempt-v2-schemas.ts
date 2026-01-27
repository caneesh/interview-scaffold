/**
 * Attempt V2 Output Schemas
 *
 * Runtime validators for LLM response parsing.
 * These enforce structure and type safety without relying on Zod.
 *
 * CRITICAL: The VerifyExplainOutput schema includes `noSolutionCode: true`
 * as a schema-level guarantee that the output must not contain solution code.
 */

// ============ Type Definitions ============

export interface UnderstandEvalOutput {
  readonly status: 'PASS' | 'NEEDS_WORK';
  readonly strengths: readonly string[];
  readonly gaps: readonly string[];
  readonly followupQuestions: readonly string[];
  readonly safety: {
    readonly solutionLeakRisk: 'low' | 'medium' | 'high';
  };
}

export interface PatternCandidate {
  readonly patternId: string;
  readonly name: string;
  readonly reason: string;
  readonly confidence: number;
}

export interface PlanSuggestOutput {
  readonly candidates: readonly PatternCandidate[];
  readonly recommendedNextAction: string;
}

export interface PlanValidateOutput {
  readonly match: 'GOOD' | 'MAYBE' | 'MISMATCH';
  readonly rationale: string;
  readonly discoveryRecommended: boolean;
  readonly invariantFeedback?: string;
}

export interface VerifyExplainOutput {
  readonly likelyBugType: string;
  readonly failingCaseExplanation: string;
  readonly suggestedNextDebugStep: string;
  /** Schema-level guarantee: this must always be true */
  readonly noSolutionCode: true;
}

export interface FollowupGenerateOutput {
  readonly question: string;
  readonly targetGap: string;
  readonly difficulty: 'easy' | 'medium' | 'hard';
}

export interface SocraticHintOutput {
  readonly hint: string;
  readonly level: 1 | 2 | 3 | 4 | 5;
  readonly targetConcept: string;
  readonly nextStepSuggestion: string;
  /** Must be true - no code in hints */
  readonly noCodeProvided: true;
}

// ============ Validation Errors ============

export class SchemaValidationError extends Error {
  constructor(
    message: string,
    public readonly field: string,
    public readonly received: unknown
  ) {
    super(`Schema validation failed: ${message} (field: ${field})`);
    this.name = 'SchemaValidationError';
  }
}

// ============ Validation Helpers ============

function assertString(value: unknown, field: string): asserts value is string {
  if (typeof value !== 'string') {
    throw new SchemaValidationError(`Expected string`, field, value);
  }
}

function assertNumber(value: unknown, field: string): asserts value is number {
  if (typeof value !== 'number' || isNaN(value)) {
    throw new SchemaValidationError(`Expected number`, field, value);
  }
}

function assertBoolean(value: unknown, field: string): asserts value is boolean {
  if (typeof value !== 'boolean') {
    throw new SchemaValidationError(`Expected boolean`, field, value);
  }
}

function assertArray(value: unknown, field: string): asserts value is unknown[] {
  if (!Array.isArray(value)) {
    throw new SchemaValidationError(`Expected array`, field, value);
  }
}

function assertObject(value: unknown, field: string): asserts value is Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new SchemaValidationError(`Expected object`, field, value);
  }
}

function assertEnum<T extends string>(
  value: unknown,
  validValues: readonly T[],
  field: string
): asserts value is T {
  assertString(value, field);
  if (!validValues.includes(value as T)) {
    throw new SchemaValidationError(
      `Expected one of: ${validValues.join(', ')}`,
      field,
      value
    );
  }
}

function assertNumberEnum<T extends number>(
  value: unknown,
  validValues: readonly T[],
  field: string
): asserts value is T {
  assertNumber(value, field);
  if (!validValues.includes(value as T)) {
    throw new SchemaValidationError(
      `Expected one of: ${validValues.join(', ')}`,
      field,
      value
    );
  }
}

function assertLiteralTrue(value: unknown, field: string): asserts value is true {
  if (value !== true) {
    throw new SchemaValidationError(`Expected literal true`, field, value);
  }
}

function assertStringArray(value: unknown, field: string): string[] {
  assertArray(value, field);
  for (let i = 0; i < value.length; i++) {
    assertString(value[i], `${field}[${i}]`);
  }
  return value as string[];
}

function assertNumberInRange(
  value: unknown,
  min: number,
  max: number,
  field: string
): asserts value is number {
  assertNumber(value, field);
  if (value < min || value > max) {
    throw new SchemaValidationError(
      `Expected number between ${min} and ${max}`,
      field,
      value
    );
  }
}

// ============ Schema Validators ============

/**
 * Validate and parse UnderstandEvalOutput from raw LLM response
 */
export function parseUnderstandEvalOutput(raw: unknown): UnderstandEvalOutput {
  assertObject(raw, 'root');

  assertEnum(raw.status, ['PASS', 'NEEDS_WORK'] as const, 'status');
  const strengths = assertStringArray(raw.strengths, 'strengths');
  const gaps = assertStringArray(raw.gaps, 'gaps');
  const followupQuestions = assertStringArray(raw.followupQuestions, 'followupQuestions');

  assertObject(raw.safety, 'safety');
  assertEnum(
    raw.safety.solutionLeakRisk,
    ['low', 'medium', 'high'] as const,
    'safety.solutionLeakRisk'
  );

  return {
    status: raw.status,
    strengths,
    gaps,
    followupQuestions,
    safety: {
      solutionLeakRisk: raw.safety.solutionLeakRisk,
    },
  };
}

/**
 * Validate and parse PlanSuggestOutput from raw LLM response
 */
export function parsePlanSuggestOutput(raw: unknown): PlanSuggestOutput {
  assertObject(raw, 'root');
  assertArray(raw.candidates, 'candidates');
  assertString(raw.recommendedNextAction, 'recommendedNextAction');

  const candidates: PatternCandidate[] = [];
  for (let i = 0; i < raw.candidates.length; i++) {
    const candidate = raw.candidates[i];
    assertObject(candidate, `candidates[${i}]`);
    assertString(candidate.patternId, `candidates[${i}].patternId`);
    assertString(candidate.name, `candidates[${i}].name`);
    assertString(candidate.reason, `candidates[${i}].reason`);
    assertNumberInRange(candidate.confidence, 0, 1, `candidates[${i}].confidence`);

    candidates.push({
      patternId: candidate.patternId,
      name: candidate.name,
      reason: candidate.reason,
      confidence: candidate.confidence,
    });
  }

  return {
    candidates,
    recommendedNextAction: raw.recommendedNextAction,
  };
}

/**
 * Validate and parse PlanValidateOutput from raw LLM response
 */
export function parsePlanValidateOutput(raw: unknown): PlanValidateOutput {
  assertObject(raw, 'root');
  assertEnum(raw.match, ['GOOD', 'MAYBE', 'MISMATCH'] as const, 'match');
  assertString(raw.rationale, 'rationale');
  assertBoolean(raw.discoveryRecommended, 'discoveryRecommended');

  // invariantFeedback is optional
  if (raw.invariantFeedback !== undefined) {
    assertString(raw.invariantFeedback, 'invariantFeedback');
  }

  return {
    match: raw.match,
    rationale: raw.rationale,
    discoveryRecommended: raw.discoveryRecommended,
    invariantFeedback: raw.invariantFeedback as string | undefined,
  };
}

/**
 * Validate and parse VerifyExplainOutput from raw LLM response
 *
 * CRITICAL: Enforces noSolutionCode: true as a schema-level guarantee
 */
export function parseVerifyExplainOutput(raw: unknown): VerifyExplainOutput {
  assertObject(raw, 'root');
  assertString(raw.likelyBugType, 'likelyBugType');
  assertString(raw.failingCaseExplanation, 'failingCaseExplanation');
  assertString(raw.suggestedNextDebugStep, 'suggestedNextDebugStep');
  assertLiteralTrue(raw.noSolutionCode, 'noSolutionCode');

  return {
    likelyBugType: raw.likelyBugType,
    failingCaseExplanation: raw.failingCaseExplanation,
    suggestedNextDebugStep: raw.suggestedNextDebugStep,
    noSolutionCode: true,
  };
}

/**
 * Validate and parse FollowupGenerateOutput from raw LLM response
 */
export function parseFollowupGenerateOutput(raw: unknown): FollowupGenerateOutput {
  assertObject(raw, 'root');
  assertString(raw.question, 'question');
  assertString(raw.targetGap, 'targetGap');
  assertEnum(raw.difficulty, ['easy', 'medium', 'hard'] as const, 'difficulty');

  return {
    question: raw.question,
    targetGap: raw.targetGap,
    difficulty: raw.difficulty,
  };
}

/**
 * Validate and parse SocraticHintOutput from raw LLM response
 *
 * CRITICAL: Enforces noCodeProvided: true as a schema-level guarantee
 */
export function parseSocraticHintOutput(raw: unknown): SocraticHintOutput {
  assertObject(raw, 'root');
  assertString(raw.hint, 'hint');
  assertNumberEnum(raw.level, [1, 2, 3, 4, 5] as const, 'level');
  assertString(raw.targetConcept, 'targetConcept');
  assertString(raw.nextStepSuggestion, 'nextStepSuggestion');
  assertLiteralTrue(raw.noCodeProvided, 'noCodeProvided');

  return {
    hint: raw.hint,
    level: raw.level,
    targetConcept: raw.targetConcept,
    nextStepSuggestion: raw.nextStepSuggestion,
    noCodeProvided: true,
  };
}

// ============ Safe JSON Extraction ============

/**
 * Extract JSON object from LLM response text, handling markdown code blocks
 */
export function extractJSON(text: string): unknown {
  // Try to find JSON in code blocks first
  const codeBlockMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (codeBlockMatch) {
    try {
      return JSON.parse(codeBlockMatch[1]!.trim());
    } catch {
      // Fall through to try raw JSON
    }
  }

  // Try to find raw JSON object
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    return JSON.parse(jsonMatch[0]);
  }

  throw new Error('No JSON object found in response');
}
