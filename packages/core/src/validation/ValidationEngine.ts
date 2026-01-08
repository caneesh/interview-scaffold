/**
 * Main validation engine - orchestrates all validation components.
 * PURE TypeScript - no framework dependencies.
 */

import type {
  SubmissionContext,
  ValidationResult,
  ValidationError,
  CheckpointResult,
  GradeResult,
  Rubric,
  GatingDecision,
} from './types.js';
import { GradeResult as GradeResultEnum, CheckpointType } from './types.js';
import { gradeSubmission } from './RubricGrader.js';
import {
  detectForbiddenConcepts,
  validateSlidingWindow,
  validateDFSGrid,
} from './ForbiddenConceptDetector.js';
import {
  checkCodeSubmissionLock,
  createLockingError,
} from './EarlyLocking.js';
import {
  evaluateGating,
  createGatingState,
  addErrorToState,
  type GatingState,
} from './MicroLessonGating.js';
import {
  validateWithLLM,
  convertLLMErrors,
  createDefaultLLMConfig,
  type LLMValidatorConfig,
} from './LLMValidation.js';
import type { PatternId, Language } from '../entities/types.js';

// ============================================================================
// Validation Engine Types
// ============================================================================

export interface ValidationEngineConfig {
  readonly llmConfig: LLMValidatorConfig;
  readonly strictMode: boolean;
  readonly enablePatternHeuristics: boolean;
}

export interface ValidateInput {
  readonly context: SubmissionContext;
  readonly rubric: Rubric;
  readonly config?: Partial<ValidationEngineConfig>;
}

// ============================================================================
// Default Configuration
// ============================================================================

export function createDefaultEngineConfig(): ValidationEngineConfig {
  return {
    llmConfig: createDefaultLLMConfig(),
    strictMode: true,
    enablePatternHeuristics: true,
  };
}

// ============================================================================
// Main Validation Function
// ============================================================================

/**
 * Validates a submission through the complete validation pipeline.
 */
export async function validate(input: ValidateInput): Promise<ValidationResult> {
  const { context, rubric, config: partialConfig } = input;
  const config = { ...createDefaultEngineConfig(), ...partialConfig };

  const errors: ValidationError[] = [];
  let grade: GradeResult = GradeResultEnum.PASS;

  // Step 1: Check early locking for CODE submissions
  if (context.checkpoint === 'CODE') {
    const lockResult = checkCodeSubmissionLock(context.checkpointResults);
    if (lockResult.isLocked) {
      return createLockedResult(lockResult.reason!, context);
    }
  }

  // Step 2: Run rubric grading
  const rubricResult = gradeSubmission({
    rubric,
    submission: context.code,
    checkpoint: context.checkpoint,
  });
  errors.push(...rubricResult.checkpointResult.errors);
  grade = rubricResult.grade;

  // Step 3: Run forbidden concept detection (for CODE checkpoint)
  if (context.checkpoint === 'CODE') {
    const forbiddenResult = detectForbiddenConcepts({
      code: context.code,
      language: context.language,
      patternId: context.patternId,
    });

    if (forbiddenResult.hasForbidden) {
      errors.push(...forbiddenResult.errors);
      grade = GradeResultEnum.FAIL;
    }
  }

  // Step 4: Run pattern-specific heuristics
  if (config.enablePatternHeuristics && context.checkpoint === 'CODE') {
    const heuristicErrors = runPatternHeuristics(
      context.code,
      context.language,
      context.patternId
    );
    if (heuristicErrors.length > 0) {
      errors.push(...heuristicErrors);
      // Downgrade to at most PARTIAL if heuristic errors
      if (grade === GradeResultEnum.PASS) {
        grade = GradeResultEnum.PARTIAL;
      }
    }
  }

  // Step 5: Optional LLM validation
  if (config.llmConfig.enabled) {
    const llmResult = await validateWithLLM(
      {
        checkpoint: context.checkpoint,
        submission: context.code,
        patternId: context.patternId,
        language: context.language,
        context: rubric.id,
      },
      config.llmConfig
    );

    if (llmResult) {
      errors.push(...convertLLMErrors(llmResult.errors));
      // Combine grades (take the lower)
      if (gradeToNumber(llmResult.grade) < gradeToNumber(grade)) {
        grade = llmResult.grade;
      }
    }
  }

  // Step 6: Build checkpoint result
  const checkpointResult: CheckpointResult = {
    checkpoint: context.checkpoint,
    grade,
    feedback: generateFeedback(grade, errors),
    errors,
    timestamp: Date.now(),
  };

  // Step 7: Evaluate gating
  const gatingState = buildGatingState(context, errors);
  const gating = evaluateGating(gatingState);

  // Step 8: Determine if can proceed
  const canProceed = grade !== GradeResultEnum.FAIL && !gating.shouldGate;

  return {
    grade,
    checkpointResult,
    rubricResults: rubricResult.results,
    errors,
    gating,
    canProceed,
    blockedReason: !canProceed ? getBlockedReason(grade, gating) : null,
  };
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Runs pattern-specific heuristic checks.
 */
function runPatternHeuristics(
  code: string,
  language: Language,
  patternId: PatternId
): ValidationError[] {
  const errors: ValidationError[] = [];

  // Sliding window heuristics
  if (patternId === 'sliding-window') {
    errors.push(...validateSlidingWindow(code, language));
  }

  // DFS grid heuristics
  if (patternId === 'dfs-grid' || patternId === 'graph-dfs') {
    errors.push(...validateDFSGrid(code, language));
  }

  return errors;
}

/**
 * Builds gating state from context and errors.
 */
function buildGatingState(
  context: SubmissionContext,
  newErrors: readonly ValidationError[]
): GatingState {
  let state = createGatingState(context.patternId);

  // Add previous errors
  for (const errorType of context.previousErrors) {
    state = addErrorToState(state, errorType);
  }

  // Add new errors
  for (const error of newErrors) {
    state = addErrorToState(state, error.type);
  }

  // Set hint and retry counts
  return {
    ...state,
    hintsUsed: [...context.hintsUsed],
    retryCount: context.retryCount,
  };
}

/**
 * Creates result for locked submission.
 */
function createLockedResult(
  reason: string,
  context: SubmissionContext
): ValidationResult {
  const error = createLockingError({
    isLocked: true,
    reason,
    missingCheckpoints: [],
    failedCheckpoints: [],
    canProceed: false,
  });

  return {
    grade: GradeResultEnum.FAIL,
    checkpointResult: {
      checkpoint: context.checkpoint,
      grade: GradeResultEnum.FAIL,
      feedback: reason,
      errors: [error],
      timestamp: Date.now(),
    },
    rubricResults: [],
    errors: [error],
    gating: {
      shouldGate: false,
      reason: null,
      recommendedLessonId: null,
      errorHistory: [],
    },
    canProceed: false,
    blockedReason: reason,
  };
}

/**
 * Generates feedback message from grade and errors.
 */
function generateFeedback(
  grade: GradeResult,
  errors: readonly ValidationError[]
): string {
  if (grade === GradeResultEnum.PASS) {
    return 'Great work! All validation checks passed.';
  }

  if (grade === GradeResultEnum.PARTIAL) {
    const errorMessages = errors.slice(0, 2).map(e => e.message).join('; ');
    return `Partial credit. Issues: ${errorMessages}`;
  }

  const errorMessages = errors.slice(0, 3).map(e => e.message).join('; ');
  return `Not passing. Please fix: ${errorMessages}`;
}

/**
 * Gets the reason submission is blocked.
 */
function getBlockedReason(grade: GradeResult, gating: GatingDecision): string {
  if (gating.shouldGate) {
    return `Gating triggered: ${gating.reason}. Please complete the recommended lesson.`;
  }

  if (grade === GradeResultEnum.FAIL) {
    return 'Submission did not pass validation. Please review the errors.';
  }

  return 'Unable to proceed. Please review your submission.';
}

/**
 * Converts grade to numeric value for comparison.
 */
function gradeToNumber(grade: GradeResult): number {
  switch (grade) {
    case GradeResultEnum.PASS:
      return 2;
    case GradeResultEnum.PARTIAL:
      return 1;
    case GradeResultEnum.FAIL:
      return 0;
  }
}

// ============================================================================
// Use Case: Submit Code
// ============================================================================

export interface SubmitCodeInput {
  readonly tenantId: string;
  readonly userId: string;
  readonly problemId: string;
  readonly code: string;
  readonly language: Language;
  readonly patternId: PatternId;
  readonly checkpointResults: readonly CheckpointResult[];
  readonly previousErrors: readonly import('./types.js').ValidationErrorType[];
  readonly hintsUsed: readonly number[];
  readonly retryCount: number;
}

export interface SubmitCodeOutput {
  readonly result: ValidationResult;
  readonly passed: boolean;
  readonly shouldShowLesson: boolean;
  readonly lessonId: string | null;
}

/**
 * Use case for submitting code with validation.
 * Enforces early locking and gating.
 */
export async function submitCode(
  input: SubmitCodeInput,
  rubric: Rubric,
  config?: Partial<ValidationEngineConfig>
): Promise<SubmitCodeOutput> {
  const context: SubmissionContext = {
    patternId: input.patternId,
    language: input.language,
    checkpoint: CheckpointType.CODE,
    code: input.code,
    previousErrors: input.previousErrors,
    hintsUsed: input.hintsUsed,
    retryCount: input.retryCount,
    checkpointResults: input.checkpointResults,
  };

  const result = await validate({
    context,
    rubric,
    ...(config !== undefined ? { config } : {}),
  });

  return {
    result,
    passed: result.grade === GradeResultEnum.PASS,
    shouldShowLesson: result.gating.shouldGate,
    lessonId: result.gating.recommendedLessonId,
  };
}
