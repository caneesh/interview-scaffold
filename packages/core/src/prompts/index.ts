/**
 * Attempt V2 Prompts Module
 *
 * Exports prompt templates, schemas, guardrails, and LLM client utilities
 * for the Attempt V2 flow.
 */

// Prompt Templates
export {
  UNDERSTAND_EVAL,
  UNDERSTAND_FOLLOWUP,
  PLAN_SUGGEST_PATTERNS,
  PLAN_VALIDATE_CHOICE,
  VERIFY_EXPLAIN_FAILURE,
  IMPLEMENT_HINT_SOCRATIC,
  REFLECT_GENERATE_CUES,
  ATTEMPT_V2_PROMPTS,
  interpolatePrompt,
  buildMessages,
  type PromptTemplate,
  type AttemptV2PromptName,
} from './attempt-v2-prompts.js';

// Output Schemas
export {
  parseUnderstandEvalOutput,
  parsePlanSuggestOutput,
  parsePlanValidateOutput,
  parseVerifyExplainOutput,
  parseFollowupGenerateOutput,
  parseSocraticHintOutput,
  extractJSON,
  SchemaValidationError,
  type UnderstandEvalOutput,
  type PatternCandidate,
  type PlanSuggestOutput,
  type PlanValidateOutput,
  type VerifyExplainOutput,
  type FollowupGenerateOutput,
  type SocraticHintOutput,
} from './attempt-v2-schemas.js';

// Guardrails
export {
  detectSolutionLeak,
  detectRedFlags,
  sanitizeOutput,
  applyGuardrails,
  validateSchemaGuarantees,
  runAllGuardrails,
  type GuardrailResult,
  type GuardrailViolation,
  type GuardrailViolationType,
  type RedFlagResult,
  type RedFlag,
  type RedFlagType,
  type OutputType,
} from './guardrails.js';

// LLM Client
export {
  callLLMWithSchema,
  callUnderstandEval,
  callUnderstandFollowup,
  callPlanSuggest,
  callPlanValidate,
  callVerifyExplain,
  callImplementHint,
  checkInputRedFlags,
  createNullAttemptV2LLM,
  type AttemptV2LLMPort,
  type LLMCallConfig,
  type LLMCallResult,
  type SchemaType,
} from './llm-client.js';
