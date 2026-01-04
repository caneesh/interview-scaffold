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
