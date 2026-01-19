/**
 * Validation Engine
 * Deterministic code validation with optional LLM enhancement
 */

// Types
export type {
  RubricGrade,
  RubricResult,
  CriterionResult,
  ErrorType,
  ErrorEvent,
  GatingAction,
  GatingDecision,
  ValidationResult,
  ValidationContext,
  HeuristicCheck,
  HeuristicResult,
} from './types.js';

export { RUBRIC_GRADES, ERROR_TYPES, GATING_ACTIONS } from './types.js';

// Rubric Grading
export { gradeSubmission, gradeRubric, createStandardRubric, StandardCriteria } from './rubric.js';
export type { RubricConfig, RubricDefinition, CriterionDefinition, EvaluationContext } from './rubric.js';

// Forbidden Concept Detection
export { detectForbiddenConcepts, FORBIDDEN_CONCEPTS } from './forbidden.js';
export type { ForbiddenConcept } from './forbidden.js';

// Heuristics
export { runHeuristics, HEURISTICS, getHeuristicsForPattern } from './heuristics.js';

// Gating Rules
export { makeGatingDecision, getMicroLesson, MICRO_LESSONS } from './gating.js';
export type { GatingRule, GatingContext, MicroLessonExample, GatingMicroLesson } from './gating.js';

// LLM Port (Optional)
export type {
  LLMValidationPort,
  LLMValidationRequest,
  LLMValidationResponse,
  LLMDetectedError,
  TestResultSummary,
  ValidationOrchestratorConfig,
} from './llm-port.js';

export {
  NullLLMValidation,
  LLM_VALIDATION_RESPONSE_SCHEMA,
  DEFAULT_ORCHESTRATOR_CONFIG,
} from './llm-port.js';

// Thinking Gate Validation
export {
  validateThinkingGate,
  validateThinkingGateDeterministic,
  validateThinkingGateFull,
  createNullThinkingGateLLM,
  MIN_INVARIANT_LENGTH,
  RELATED_PATTERNS,
  PATTERN_INVARIANT_KEYWORDS,
} from './thinking-gate.js';

export type {
  ThinkingGateInput,
  ThinkingGateValidationResult,
  ThinkingGateError,
  ThinkingGateWarning,
  ThinkingGateContext,
  ThinkingGateLLMPort,
} from './thinking-gate.js';

// Pattern Discovery (Socratic)
export {
  generateHeuristicQuestion,
  runPatternDiscovery,
  getInitialDiscoveryQuestion,
  createNullPatternDiscoveryLLM,
} from './pattern-discovery.js';

export type {
  PatternDiscoveryContext,
  PatternDiscoveryQuestion,
  PatternDiscoveryResult,
  PatternDiscoveryLLMPort,
} from './pattern-discovery.js';

// Pattern Challenge (Advocate's Trap)
export {
  detectPatternMismatch,
  validateCounterexample,
  createNullPatternChallengeLLM,
  CHALLENGE_CONFIDENCE_THRESHOLD,
} from './pattern-challenge.js';

export type {
  PatternChallengeResult,
  PatternChallengeInput,
  PatternDisqualifier,
  PatternChallengeLLMPort,
  ProblemCharacteristics,
} from './pattern-challenge.js';

// Socratic Repair (Validation Repair Loop)
export {
  generateSocraticRepairResponse,
  classifyErrorType,
  buildRepairContext,
  isGibberishInput,
  classifyValidationOutcome,
} from './socratic-repair.js';

export type {
  ErrorType as SocraticErrorType,
  PrincipleCategory,
  SocraticRepairContext,
  SocraticRepairResponse,
  SocraticRepairEvent,
  ValidationOutcome,
} from './socratic-repair.js';
