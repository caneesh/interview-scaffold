/**
 * Attempt V2 State Machine
 *
 * Enforces valid transitions between V2 steps based on mode and preconditions.
 * Returns 409 Conflict when transition is invalid.
 */

import type {
  Attempt,
  AttemptV2Step,
  AttemptV2Mode,
} from '../entities/attempt.js';
import {
  isV2Attempt,
  hasPassedUnderstand,
  hasChosenPattern,
  hasCodeSubmitted,
  hasTestResults,
  allTestsPassed,
} from '../entities/attempt.js';

/**
 * Error thrown when a state transition is not allowed
 */
export class InvalidTransitionError extends Error {
  constructor(
    message: string,
    public readonly code: string = 'INVALID_TRANSITION',
    public readonly currentStep: AttemptV2Step | null,
    public readonly targetStep: AttemptV2Step,
    public readonly suggestion?: string
  ) {
    super(message);
    this.name = 'InvalidTransitionError';
  }
}

/**
 * Transition rule result for V2 state machine
 */
export interface V2TransitionResult {
  readonly allowed: boolean;
  readonly reason?: string;
  readonly suggestion?: string;
}

/**
 * Valid transitions map
 * Key: currentStep, Value: array of valid target steps
 */
const VALID_TRANSITIONS: Record<AttemptV2Step, AttemptV2Step[]> = {
  UNDERSTAND: ['PLAN'],
  PLAN: ['IMPLEMENT'],
  IMPLEMENT: ['VERIFY'],
  VERIFY: ['IMPLEMENT', 'REFLECT'], // Can retry (back to IMPLEMENT) or proceed
  REFLECT: ['COMPLETE'],
  COMPLETE: [], // Terminal state
};

/**
 * Check if a transition from currentStep to targetStep is structurally valid
 */
function isValidTransitionPath(
  currentStep: AttemptV2Step,
  targetStep: AttemptV2Step
): boolean {
  return VALID_TRANSITIONS[currentStep]?.includes(targetStep) ?? false;
}

/**
 * Validate preconditions for transitioning to PLAN
 * Requires AI assessment PASS or EXPERT mode
 */
function validateTransitionToPlan(
  attempt: Attempt,
  mode: AttemptV2Mode
): V2TransitionResult {
  // Expert mode can skip understand gate
  if (mode === 'EXPERT') {
    return { allowed: true };
  }

  // Beginner mode requires AI assessment PASS
  if (!hasPassedUnderstand(attempt)) {
    return {
      allowed: false,
      reason: 'Understanding not yet validated by AI',
      suggestion:
        'Submit your explanation of the problem to receive AI feedback, then address any gaps before proceeding.',
    };
  }

  return { allowed: true };
}

/**
 * Validate preconditions for transitioning to IMPLEMENT
 * Requires pattern chosen or EXPERT mode
 */
function validateTransitionToImplement(
  attempt: Attempt,
  mode: AttemptV2Mode
): V2TransitionResult {
  // Expert mode can skip pattern selection
  if (mode === 'EXPERT') {
    return { allowed: true };
  }

  // Beginner mode requires pattern to be chosen
  if (!hasChosenPattern(attempt)) {
    return {
      allowed: false,
      reason: 'No pattern selected yet',
      suggestion:
        'Review the suggested patterns and select one that matches your approach, then define your invariant.',
    };
  }

  return { allowed: true };
}

/**
 * Validate preconditions for transitioning to VERIFY
 * Requires code submission
 */
function validateTransitionToVerify(attempt: Attempt): V2TransitionResult {
  if (!hasCodeSubmitted(attempt)) {
    return {
      allowed: false,
      reason: 'No code submitted yet',
      suggestion: 'Write and submit your code implementation before running tests.',
    };
  }

  return { allowed: true };
}

/**
 * Validate preconditions for transitioning to REFLECT
 * Requires test results (must have run tests)
 */
function validateTransitionToReflect(attempt: Attempt): V2TransitionResult {
  if (!hasTestResults(attempt)) {
    return {
      allowed: false,
      reason: 'No test results available',
      suggestion: 'Run the tests on your code before proceeding to reflection.',
    };
  }

  // Optional: You could require all tests to pass, but the doc says
  // "tests pass -> REFLECT" but also allows explain-failure flow
  // For now, just require tests to have been run

  return { allowed: true };
}

/**
 * Validate preconditions for transitioning back to IMPLEMENT (retry)
 * Always allowed from VERIFY
 */
function validateTransitionToImplementFromVerify(): V2TransitionResult {
  // Retry is always allowed
  return { allowed: true };
}

/**
 * Validate preconditions for transitioning to COMPLETE
 * Always allowed from REFLECT
 */
function validateTransitionToComplete(): V2TransitionResult {
  // Completing reflection is always allowed
  return { allowed: true };
}

/**
 * Main validation function - checks if transition is allowed and throws if not
 *
 * @param attempt - The current attempt
 * @param targetStep - The step to transition to
 * @throws InvalidTransitionError if transition is not allowed
 */
export function assertCanTransition(
  attempt: Attempt,
  targetStep: AttemptV2Step
): void {
  // Must be a V2 attempt
  if (!isV2Attempt(attempt)) {
    throw new InvalidTransitionError(
      'Cannot transition a legacy (v1) attempt using V2 state machine',
      'NOT_V2_ATTEMPT',
      null,
      targetStep,
      'This attempt uses the legacy flow. Start a new V2 attempt to use the 5-step flow.'
    );
  }

  const currentStep = attempt.v2Step!;
  const mode = attempt.mode;

  // Check if transition path is valid
  if (!isValidTransitionPath(currentStep, targetStep)) {
    throw new InvalidTransitionError(
      `Cannot transition from ${currentStep} to ${targetStep}`,
      'INVALID_TRANSITION_PATH',
      currentStep,
      targetStep,
      `From ${currentStep}, you can only proceed to: ${VALID_TRANSITIONS[currentStep].join(', ') || 'none (terminal state)'}`
    );
  }

  // Check preconditions based on target step
  let result: V2TransitionResult;

  switch (targetStep) {
    case 'PLAN':
      result = validateTransitionToPlan(attempt, mode);
      break;
    case 'IMPLEMENT':
      // Check if coming from VERIFY (retry) or PLAN
      if (currentStep === 'VERIFY') {
        result = validateTransitionToImplementFromVerify();
      } else {
        result = validateTransitionToImplement(attempt, mode);
      }
      break;
    case 'VERIFY':
      result = validateTransitionToVerify(attempt);
      break;
    case 'REFLECT':
      result = validateTransitionToReflect(attempt);
      break;
    case 'COMPLETE':
      result = validateTransitionToComplete();
      break;
    default:
      // UNDERSTAND is the initial step, you don't transition TO it
      result = {
        allowed: false,
        reason: `Cannot transition to ${targetStep}`,
      };
  }

  if (!result.allowed) {
    throw new InvalidTransitionError(
      result.reason || `Cannot transition to ${targetStep}`,
      'PRECONDITION_NOT_MET',
      currentStep,
      targetStep,
      result.suggestion
    );
  }
}

/**
 * Check if a transition is allowed without throwing
 * Useful for UI to show/hide navigation options
 */
export function canTransition(
  attempt: Attempt,
  targetStep: AttemptV2Step
): V2TransitionResult {
  try {
    assertCanTransition(attempt, targetStep);
    return { allowed: true };
  } catch (error) {
    if (error instanceof InvalidTransitionError) {
      return {
        allowed: false,
        reason: error.message,
        suggestion: error.suggestion,
      };
    }
    throw error;
  }
}

/**
 * Get all valid next steps from current state
 */
export function getValidNextSteps(attempt: Attempt): AttemptV2Step[] {
  if (!isV2Attempt(attempt)) return [];

  const currentStep = attempt.v2Step!;
  const possibleSteps = VALID_TRANSITIONS[currentStep] || [];

  return possibleSteps.filter((step) => canTransition(attempt, step).allowed);
}

/**
 * Check if attempt is in a terminal state
 */
export function isTerminalState(attempt: Attempt): boolean {
  return attempt.v2Step === 'COMPLETE' || attempt.state === 'COMPLETED' || attempt.state === 'ABANDONED';
}
