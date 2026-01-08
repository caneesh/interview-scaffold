/**
 * Validation module exports.
 */

// Types
export * from './types.js';

// Rubric grading
export {
  gradeSubmission,
  GRADING_CONSTANTS,
  APPROACH_RUBRIC_TEMPLATE,
  INVARIANT_RUBRIC_TEMPLATE,
  PLAN_RUBRIC_TEMPLATE,
  type GradeInput,
  type GradeOutput,
} from './RubricGrader.js';

// Forbidden concept detection
export {
  detectForbiddenConcepts,
  validateSlidingWindow,
  validateDFSGrid,
  FORBIDDEN_CONCEPTS,
  type DetectionInput,
  type DetectionResult,
  type ForbiddenViolation,
} from './ForbiddenConceptDetector.js';

// Early locking
export {
  checkCodeSubmissionLock,
  canAttemptCheckpoint,
  getNextRequiredCheckpoint,
  calculateCheckpointProgress,
  createLockingError,
  LOCKING_CONSTANTS,
  type LockCheckResult,
  type LockingState,
} from './EarlyLocking.js';

// Micro-lesson gating
export {
  evaluateGating,
  createGatingState,
  addErrorToState,
  addHintToState,
  incrementRetry,
  resetGatingState,
  getGatingMessage,
  GATING_CONSTANTS,
  type GatingState,
} from './MicroLessonGating.js';

// LLM validation
export {
  validateWithLLM,
  convertLLMErrors,
  createDefaultLLMConfig,
  LLM_VALIDATION_CONSTANTS,
  type LLMValidatorConfig,
  type LLMValidationRequest,
  type LLMValidationResponse,
} from './LLMValidation.js';

// Main validation engine
export {
  validate,
  submitCode,
  createDefaultEngineConfig,
  type ValidationEngineConfig,
  type ValidateInput,
  type SubmitCodeInput,
  type SubmitCodeOutput,
} from './ValidationEngine.js';
