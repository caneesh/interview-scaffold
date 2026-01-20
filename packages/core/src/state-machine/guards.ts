/**
 * Transition Guards
 *
 * Guard functions that determine whether state transitions are allowed.
 * Guards enforce business rules and prerequisites.
 */

import type {
  TransitionGuard,
  StateMachineContext,
  EventPayload,
  InterviewState,
} from './types.js';
import { STATE_ORDER, isStateBefore } from './states.js';

// ============ Basic Guards ============

/**
 * Guard that always allows transition
 */
export const ALLOW_ALWAYS: TransitionGuard = () => true;

/**
 * Guard that always denies transition
 */
export const DENY_ALWAYS: TransitionGuard = () => false;

// ============ State Prerequisite Guards ============

/**
 * Guard: Can only enter pattern_gate if currently in problem_framing
 * The transition definition already specifies from=problem_framing, so this
 * just verifies we're in the correct source state.
 */
export const canEnterPatternGate: TransitionGuard = (context) => {
  return context.currentState === 'problem_framing';
};

/**
 * Guard: Can only enter feynman_check if currently in pattern_gate
 */
export const canEnterFeynmanCheck: TransitionGuard = (context) => {
  return context.currentState === 'pattern_gate';
};

/**
 * Guard: Can only enter strategy_design if currently in feynman_check
 */
export const canEnterStrategyDesign: TransitionGuard = (context) => {
  return context.currentState === 'feynman_check';
};

/**
 * Guard: Can only enter coding if currently in strategy_design
 */
export const canEnterCoding: TransitionGuard = (context) => {
  return context.currentState === 'strategy_design';
};

/**
 * Guard: Can only enter reflection if currently in coding
 */
export const canEnterReflection: TransitionGuard = (context) => {
  return context.currentState === 'coding';
};

/**
 * Guard: Generic prerequisite check - verify we're in the previous state
 */
export function createPrerequisiteGuard(targetState: InterviewState): TransitionGuard {
  const stateIndex = STATE_ORDER.indexOf(targetState);
  if (stateIndex <= 0) {
    return ALLOW_ALWAYS;
  }

  const prerequisiteState = STATE_ORDER[stateIndex - 1];
  if (!prerequisiteState) {
    return ALLOW_ALWAYS;
  }

  return (context) => context.currentState === prerequisiteState;
}

// ============ Cooldown Guards ============

/**
 * Guard: Not in cooldown period
 */
export const notInCooldown: TransitionGuard = (context) => {
  if (!context.inCooldown) return true;
  if (!context.cooldownExpiresAt) return true;
  return new Date() >= context.cooldownExpiresAt;
};

/**
 * Guard: Check if cooldown has expired
 */
export const cooldownExpired: TransitionGuard = (context) => {
  if (!context.cooldownExpiresAt) return false;
  return new Date() >= context.cooldownExpiresAt;
};

// ============ Failure Count Guards ============

/**
 * Guard: Under maximum failure count
 */
export function createMaxFailuresGuard(maxFailures: number): TransitionGuard {
  return (context) => context.stageFailureCount < maxFailures;
}

/**
 * Guard: At or over maximum failure count
 */
export function createAtMaxFailuresGuard(maxFailures: number): TransitionGuard {
  return (context) => context.stageFailureCount >= maxFailures;
}

// ============ Help Level Guards ============

/**
 * Guard: Can request this help level
 */
export function createHelpLevelGuard(maxLevel: 1 | 2 | 3 | 4 | 5): TransitionGuard {
  return (context, payload) => {
    // Check if requested level is allowed
    const requestedLevel = (payload as { requestedLevel?: number }).requestedLevel;
    if (requestedLevel && requestedLevel > maxLevel) {
      return false;
    }
    return true;
  };
}

/**
 * Guard: Level 5 (full solution) requires explicit request
 */
export const requiresExplicitRequestForLevel5: TransitionGuard = (context, payload) => {
  const requestedLevel = (payload as { requestedLevel?: number }).requestedLevel;
  const explicitlyRequested = (payload as { explicitlyRequested?: boolean }).explicitlyRequested;

  if (requestedLevel === 5 && !explicitlyRequested) {
    return false;
  }
  return true;
};

// ============ Time-Based Guards ============

/**
 * Guard: Session not expired
 */
export function createSessionNotExpiredGuard(maxDurationMs: number): TransitionGuard {
  return (context) => {
    const elapsed = Date.now() - context.startedAt.getTime();
    return elapsed < maxDurationMs;
  };
}

/**
 * Guard: Minimum time has passed in current state
 */
export function createMinTimeInStateGuard(minDurationMs: number): TransitionGuard {
  return (context) => {
    const currentStateEntry = context.stateHistory.find(
      h => h.state === context.currentState && h.exitedAt === null
    );
    if (!currentStateEntry) return true;

    const elapsed = Date.now() - currentStateEntry.enteredAt.getTime();
    return elapsed >= minDurationMs;
  };
}

// ============ Backward Transition Guards ============

/**
 * Guard: Backward transition is only allowed under specific conditions
 * (e.g., memorization detected, explicit skip request)
 */
export const canGoBackward: TransitionGuard = (context, payload) => {
  // Allow backward if memorization was detected
  const event = (payload as { event?: string }).event;
  if (event === 'MEMORIZATION_DETECTED') {
    return true;
  }

  // Allow backward on explicit skip (with penalty)
  if (event === 'REQUEST_SKIP') {
    return true;
  }

  // Otherwise, no backward transitions
  return false;
};

/**
 * Guard: Can reset to specific state
 */
export function createCanResetToGuard(targetState: InterviewState): TransitionGuard {
  return (context) => {
    // Can only reset to states that are before our current state
    const isBefore = isStateBefore(targetState, context.currentState);
    return isBefore;
  };
}

// ============ Combined Guards ============

/**
 * Combine multiple guards with AND logic
 */
export function andGuards(...guards: TransitionGuard[]): TransitionGuard {
  return (context, payload) => {
    return guards.every(guard => guard(context, payload));
  };
}

/**
 * Combine multiple guards with OR logic
 */
export function orGuards(...guards: TransitionGuard[]): TransitionGuard {
  return (context, payload) => {
    return guards.some(guard => guard(context, payload));
  };
}

/**
 * Negate a guard
 */
export function notGuard(guard: TransitionGuard): TransitionGuard {
  return (context, payload) => !guard(context, payload);
}

// ============ State-Specific Guard Collections ============

/**
 * All guards that must pass to enter pattern_gate
 */
export const PATTERN_GATE_ENTRY_GUARDS: readonly TransitionGuard[] = [
  canEnterPatternGate,
  notInCooldown,
];

/**
 * All guards that must pass to enter feynman_check
 */
export const FEYNMAN_CHECK_ENTRY_GUARDS: readonly TransitionGuard[] = [
  canEnterFeynmanCheck,
  notInCooldown,
];

/**
 * All guards that must pass to enter strategy_design
 */
export const STRATEGY_DESIGN_ENTRY_GUARDS: readonly TransitionGuard[] = [
  canEnterStrategyDesign,
  notInCooldown,
];

/**
 * All guards that must pass to enter coding
 */
export const CODING_ENTRY_GUARDS: readonly TransitionGuard[] = [
  canEnterCoding,
  notInCooldown,
];

/**
 * All guards that must pass to enter reflection
 */
export const REFLECTION_ENTRY_GUARDS: readonly TransitionGuard[] = [
  canEnterReflection,
];

/**
 * Get entry guards for a state
 */
export function getEntryGuards(state: InterviewState): readonly TransitionGuard[] {
  switch (state) {
    case 'problem_framing':
      return [ALLOW_ALWAYS];
    case 'pattern_gate':
      return PATTERN_GATE_ENTRY_GUARDS;
    case 'feynman_check':
      return FEYNMAN_CHECK_ENTRY_GUARDS;
    case 'strategy_design':
      return STRATEGY_DESIGN_ENTRY_GUARDS;
    case 'coding':
      return CODING_ENTRY_GUARDS;
    case 'reflection':
      return REFLECTION_ENTRY_GUARDS;
    case 'completed':
      return [canEnterReflection]; // Must have done reflection
    case 'abandoned':
      return [ALLOW_ALWAYS]; // Can always abandon
    default:
      return [DENY_ALWAYS];
  }
}
