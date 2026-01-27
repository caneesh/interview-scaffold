/**
 * LLM Client for Attempt V2 Prompts
 *
 * Provides a generic wrapper for LLM calls with:
 * - Structured JSON output parsing
 * - Schema validation
 * - Guardrail application
 * - Error handling with fallback
 *
 * This follows the pattern established in adapter-llm but is designed
 * to work with the Attempt V2 prompt templates and schemas.
 */

import type {
  UnderstandEvalOutput,
  PlanSuggestOutput,
  PlanValidateOutput,
  VerifyExplainOutput,
  FollowupGenerateOutput,
  SocraticHintOutput,
} from './attempt-v2-schemas.js';
import {
  extractJSON,
  parseUnderstandEvalOutput,
  parsePlanSuggestOutput,
  parsePlanValidateOutput,
  parseVerifyExplainOutput,
  parseFollowupGenerateOutput,
  parseSocraticHintOutput,
  SchemaValidationError,
} from './attempt-v2-schemas.js';
import type { PromptTemplate } from './attempt-v2-prompts.js';
import { interpolatePrompt } from './attempt-v2-prompts.js';
import {
  runAllGuardrails,
  detectRedFlags,
  type OutputType,
  type GuardrailResult,
  type RedFlagResult,
} from './guardrails.js';

// ============ Types ============

/**
 * LLM call configuration
 */
export interface LLMCallConfig {
  readonly temperature?: number;
  readonly maxTokens?: number;
  readonly model?: string;
}

/**
 * Result of an LLM call
 */
export interface LLMCallResult<T> {
  readonly success: boolean;
  readonly data?: T;
  readonly error?: string;
  readonly rawResponse?: string;
  readonly guardrailResult?: GuardrailResult;
}

/**
 * Port interface for LLM provider
 * This allows different implementations (Anthropic, OpenAI, mock, etc.)
 */
export interface AttemptV2LLMPort {
  /**
   * Check if the LLM is available
   */
  isEnabled(): boolean;

  /**
   * Make a raw LLM call
   */
  call(params: {
    system: string;
    user: string;
    temperature?: number;
    maxTokens?: number;
  }): Promise<string>;
}

/**
 * Schema type enum for guardrail checks
 */
export type SchemaType =
  | 'understand_eval'
  | 'understand_followup'
  | 'plan_suggest'
  | 'plan_validate'
  | 'verify_explain'
  | 'implement_hint'
  | 'reflect_cues';

/**
 * Map schema types to output types for guardrail length limits
 */
const SCHEMA_TO_OUTPUT_TYPE: Record<SchemaType, OutputType> = {
  understand_eval: 'feedback',
  understand_followup: 'question',
  plan_suggest: 'feedback',
  plan_validate: 'feedback',
  verify_explain: 'explanation',
  implement_hint: 'hint',
  reflect_cues: 'feedback',
};

/**
 * Map schema types to guardrail schema types
 */
const SCHEMA_TO_GUARDRAIL_TYPE: Record<
  SchemaType,
  'verify_explain' | 'socratic_hint' | 'other'
> = {
  understand_eval: 'other',
  understand_followup: 'other',
  plan_suggest: 'other',
  plan_validate: 'other',
  verify_explain: 'verify_explain',
  implement_hint: 'socratic_hint',
  reflect_cues: 'other',
};

// ============ Generic LLM Caller ============

/**
 * Generic function to call LLM with prompt template and parse response
 *
 * @param llm - The LLM port implementation
 * @param prompt - Prompt template with system and user
 * @param variables - Variables to interpolate into user template
 * @param schemaType - Type of schema for validation and guardrails
 * @param parser - Function to parse the response into typed output
 * @param config - Optional LLM configuration
 * @returns Parsed and validated output
 */
export async function callLLMWithSchema<T>(
  llm: AttemptV2LLMPort,
  prompt: PromptTemplate,
  variables: Record<string, string>,
  schemaType: SchemaType,
  parser: (raw: unknown) => T,
  config: LLMCallConfig = {}
): Promise<LLMCallResult<T>> {
  if (!llm.isEnabled()) {
    return {
      success: false,
      error: 'LLM is not enabled',
    };
  }

  const { temperature = 0.3, maxTokens = 1500 } = config;

  try {
    // Build messages
    const userMessage = interpolatePrompt(prompt.user, variables);

    // Make LLM call
    const rawResponse = await llm.call({
      system: prompt.system,
      user: userMessage,
      temperature,
      maxTokens,
    });

    // Extract JSON from response
    const json = extractJSON(rawResponse);

    // Parse with schema
    const parsed = parser(json);

    // Apply guardrails
    const outputType = SCHEMA_TO_OUTPUT_TYPE[schemaType];
    const guardrailType = SCHEMA_TO_GUARDRAIL_TYPE[schemaType];
    const guardrailResult = runAllGuardrails(
      rawResponse,
      json as Record<string, unknown>,
      guardrailType,
      outputType
    );

    if (!guardrailResult.passed) {
      return {
        success: false,
        error: `Guardrail violation: ${guardrailResult.violations.map(v => v.description).join('; ')}`,
        rawResponse,
        guardrailResult,
      };
    }

    return {
      success: true,
      data: parsed,
      rawResponse,
      guardrailResult,
    };
  } catch (error) {
    if (error instanceof SchemaValidationError) {
      return {
        success: false,
        error: `Schema validation failed: ${error.message}`,
      };
    }

    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

// ============ Typed Callers ============

/**
 * Call UNDERSTAND_EVAL prompt
 */
export async function callUnderstandEval(
  llm: AttemptV2LLMPort,
  prompt: PromptTemplate,
  variables: {
    problemStatement: string;
    explanation: string;
    inputOutputDescription: string;
    constraintsDescription: string;
    exampleWalkthrough: string;
    wrongApproach: string;
  },
  config?: LLMCallConfig
): Promise<LLMCallResult<UnderstandEvalOutput>> {
  return callLLMWithSchema(
    llm,
    prompt,
    variables,
    'understand_eval',
    parseUnderstandEvalOutput,
    config
  );
}

/**
 * Call UNDERSTAND_FOLLOWUP prompt
 */
export async function callUnderstandFollowup(
  llm: AttemptV2LLMPort,
  prompt: PromptTemplate,
  variables: {
    problemStatement: string;
    previousExplanation: string;
    identifiedGaps: string;
    previousQuestions: string;
    previousAnswers: string;
  },
  config?: LLMCallConfig
): Promise<LLMCallResult<FollowupGenerateOutput>> {
  return callLLMWithSchema(
    llm,
    prompt,
    variables,
    'understand_followup',
    parseFollowupGenerateOutput,
    config
  );
}

/**
 * Call PLAN_SUGGEST_PATTERNS prompt
 */
export async function callPlanSuggest(
  llm: AttemptV2LLMPort,
  prompt: PromptTemplate,
  variables: {
    userExplanation: string;
    problemConstraints: string;
    validPatterns: string;
  },
  config?: LLMCallConfig
): Promise<LLMCallResult<PlanSuggestOutput>> {
  return callLLMWithSchema(
    llm,
    prompt,
    variables,
    'plan_suggest',
    parsePlanSuggestOutput,
    config
  );
}

/**
 * Call PLAN_VALIDATE_CHOICE prompt
 */
export async function callPlanValidate(
  llm: AttemptV2LLMPort,
  prompt: PromptTemplate,
  variables: {
    problemStatement: string;
    userExplanation: string;
    chosenPattern: string;
    userConfidence: string;
    userReasoning: string;
    correctPattern: string;
  },
  config?: LLMCallConfig
): Promise<LLMCallResult<PlanValidateOutput>> {
  return callLLMWithSchema(
    llm,
    prompt,
    variables,
    'plan_validate',
    parsePlanValidateOutput,
    config
  );
}

/**
 * Call VERIFY_EXPLAIN_FAILURE prompt
 */
export async function callVerifyExplain(
  llm: AttemptV2LLMPort,
  prompt: PromptTemplate,
  variables: {
    problemStatement: string;
    userCode: string;
    testInput: string;
    expectedOutput: string;
    actualOutput: string;
    errorMessage: string;
  },
  config?: LLMCallConfig
): Promise<LLMCallResult<VerifyExplainOutput>> {
  return callLLMWithSchema(
    llm,
    prompt,
    variables,
    'verify_explain',
    parseVerifyExplainOutput,
    config
  );
}

/**
 * Call IMPLEMENT_HINT_SOCRATIC prompt
 */
export async function callImplementHint(
  llm: AttemptV2LLMPort,
  prompt: PromptTemplate,
  variables: {
    problemStatement: string;
    chosenPattern: string;
    currentCode: string;
    hintLevel: string;
    previousHints: string;
    testResults: string;
  },
  config?: LLMCallConfig
): Promise<LLMCallResult<SocraticHintOutput>> {
  return callLLMWithSchema(
    llm,
    prompt,
    variables,
    'implement_hint',
    parseSocraticHintOutput,
    config
  );
}

// ============ Input Validation ============

/**
 * Check user input for red flags before processing
 */
export function checkInputRedFlags(userInput: string): RedFlagResult {
  return detectRedFlags(userInput);
}

// ============ Null Implementation ============

/**
 * Create a null LLM port that always returns a disabled state
 */
export function createNullAttemptV2LLM(): AttemptV2LLMPort {
  return {
    isEnabled: () => false,
    call: async () => {
      throw new Error('LLM is disabled');
    },
  };
}
