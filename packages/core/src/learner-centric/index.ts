/**
 * Learner-Centric Interview Coaching System
 *
 * A comprehensive coaching system for technical interview preparation
 * with 7 integrated modules:
 *
 * 1. Problem Framing - Socratic questions for problem understanding
 * 2. Pattern Recognition Gate - Pattern identification with justification
 * 3. Feynman Validator - Conceptual clarity via Feynman Technique
 * 4. Strategy Design - Reasoning validation with adversarial questions
 * 5. Coding Silent Interviewer - Non-directive coding guidance
 * 6. Tiered Help System - 5-level progressive hint ladder
 * 7. Reflection and Reinforcement - Post-solution learning
 */

// ============ Core Types ============
export * from './types.js';

// ============ Random Utilities (for testing) ============
export {
  setRandomSeed,
  getRandomSeed,
  selectRandom,
  randomIndex,
  SeededRandom,
} from './random-utils.js';

// ============ Problem Framing (Stage 1) ============
export {
  // Constants
  MAX_QUESTIONS_PER_BATCH,
  MIN_ADEQUATE_ANSWER_LENGTH,
  MIN_DEEP_ANSWER_LENGTH,
  MAX_TOTAL_QUESTIONS,
  UNDERSTANDING_THRESHOLD,
  // Functions
  assessAnswerQuality,
  generateInitialQuestions,
  generateFollowUpQuestions,
  calculateUnderstandingScore,
  isFramingComplete,
  processFramingAnswer,
  generateFramingResponse,
  createInitialFramingData,
  // Types
  type ProblemFramingInput,
  type ProblemFramingResult,
} from './problem-framing.js';

// ============ Pattern Recognition Gate (Stage 2) ============
export {
  // Constants
  MAX_PATTERN_ATTEMPTS,
  MIN_JUSTIFICATION_LENGTH,
  PATTERN_NAME_MAP,
  PATTERN_RELATIONS,
  // Functions
  parsePatternInput,
  validateJustification,
  validatePatternSelection,
  processPatternAttempt,
  generatePatternResponse,
  createInitialPatternData,
  // Types
  type PatternValidationInput,
  type PatternValidationResult,
} from './pattern-recognition-gate.js';

// ============ Feynman Validator (Stage 3) ============
export {
  // Constants
  MAX_SENTENCES,
  PASSING_SCORE,
  MAX_FEYNMAN_ATTEMPTS,
  // Functions
  detectJargon,
  detectCircularLogic,
  assessComplexity,
  countSentences,
  checkCompleteness,
  validateFeynmanExplanation,
  processFeynmanAttempt,
  generateFeynmanResponse,
  createInitialFeynmanData,
  // Types
  type FeynmanValidationInput,
} from './feynman-validator.js';

// ============ Strategy Design (Stage 4) ============
export {
  // Constants
  MIN_STRATEGY_LENGTH,
  READINESS_THRESHOLD,
  MAX_ADVERSARIAL_QUESTIONS,
  // Functions
  detectGaps,
  detectContradictions,
  detectMissingEdgeCases,
  generateAdversarialQuestions,
  validateStrategy,
  processStrategyDesign,
  processAdversarialAnswer,
  validateAdversarialAnswer,
  generateStrategyResponse,
  createInitialStrategyData,
  // Types
  type StrategyValidationInput,
} from './strategy-design.js';

// ============ Coding Silent Interviewer (Stage 5) ============
export {
  // Constants
  MAX_OBSERVATIONS,
  MAX_QUESTIONS,
  MAX_WARNINGS,
  MAX_CODE_LENGTH,
  // Functions
  extractVariables,
  identifyUnclearVariables,
  analyzeCode,
  generateCodingResponse,
  createInitialCodingData,
  updateCodingData,
  // Types
  type CodeAnalysisInput,
  type CodeAnalysisResult,
} from './coding-silent-interviewer.js';

// ============ Tiered Help System (Stage 6) ============
export {
  // Constants
  HELP_LEVEL_TYPES,
  HELP_LEVEL_DESCRIPTIONS,
  HELP_LEVEL_PENALTIES,
  // Functions
  generateHelp,
  validateHelpRequest,
  generateHelpResponse,
  createInitialHelpState,
  processHelpRequest,
  // Types
  type HelpGenerationInput,
  type HelpState,
} from './tiered-help-system.js';

// ============ Reflection and Reinforcement (Stage 7) ============
export {
  // Constants
  MAX_FOLLOWUP_PROBLEMS,
  MIN_INSIGHT_LENGTH,
  REFLECTION_QUESTIONS,
  PATTERN_TRIGGERS,
  // Functions
  validateReflection,
  processReflection,
  generateReflectionSummary,
  generateReflectionPrompt,
  generateReflectionResponse,
  createInitialReflectionData,
  // Types
  type ReflectionInput,
} from './reflection-reinforcement.js';

// ============ Session Manager ============
export {
  // Session management
  createCoachingSession,
  getNextStage,
  advanceStage,
  completeSession,
  isSessionComplete,
  getSessionProgress,
  // Stage data recovery (CRITICAL-4)
  ensureStageDataInitialized,
  isSessionHealthy,
  StageDataNotInitializedError,
  // Stage processing
  processProblemFraming,
  processPatternRecognition,
  processFeynman,
  processStrategy,
  processAdversarial,
  processCodeAnalysis,
  processReflectionSubmission,
  processHelp,
  // Types
  type StageProcessingResult,
  type HelpProcessingResult,
} from './session-manager.js';
