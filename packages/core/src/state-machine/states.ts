/**
 * State Definitions
 *
 * Formal definitions for each state in the interview flow,
 * including entry/exit criteria and actions.
 */

import type {
  StateDefinition,
  InterviewState,
  StateMachineContext,
} from './types.js';

// ============ State Definitions ============

export const PROBLEM_FRAMING_STATE: StateDefinition = {
  id: 'problem_framing',
  name: 'Problem Framing',
  description: 'Socratic questioning to ensure problem understanding before pattern selection',
  entryCriteria: [
    'Session has started',
    'Problem has been loaded',
    'No prior gates have been passed',
  ],
  exitCriteria: [
    'User has answered all required framing questions',
    'Understanding score meets minimum threshold (0.6)',
    'Or user has made maximum allowed attempts (5)',
  ],
  onEntry: (context) => ({
    stageAttemptCount: 0,
    stageFailureCount: 0,
    lastUpdatedAt: new Date(),
  }),
  maxDurationMs: 30 * 60 * 1000, // 30 minutes
  maxFailures: 5,
};

export const PATTERN_GATE_STATE: StateDefinition = {
  id: 'pattern_gate',
  name: 'Pattern Recognition Gate',
  description: 'Validate pattern selection with justification before proceeding',
  entryCriteria: [
    'Problem framing stage completed',
    'Understanding score >= 0.6',
  ],
  exitCriteria: [
    'Correct pattern selected with valid justification',
    'Or user has been guided to correct pattern after max failures',
  ],
  onEntry: (context) => ({
    stageAttemptCount: 0,
    stageFailureCount: 0,
    lastUpdatedAt: new Date(),
  }),
  maxDurationMs: 20 * 60 * 1000, // 20 minutes
  maxFailures: 3,
};

export const FEYNMAN_CHECK_STATE: StateDefinition = {
  id: 'feynman_check',
  name: 'Feynman Validation',
  description: 'Verify conceptual understanding through simple explanation',
  entryCriteria: [
    'Pattern gate passed',
    'Correct pattern has been identified',
  ],
  exitCriteria: [
    'Explanation is jargon-free',
    'Explanation avoids circular logic',
    'Explanation is understandable by 12-year-old',
    'Explanation is within 5 sentences',
    'Or max attempts reached with partial credit',
  ],
  onEntry: (context) => ({
    stageAttemptCount: 0,
    stageFailureCount: 0,
    lastUpdatedAt: new Date(),
  }),
  maxDurationMs: 15 * 60 * 1000, // 15 minutes
  maxFailures: 3,
};

export const STRATEGY_DESIGN_STATE: StateDefinition = {
  id: 'strategy_design',
  name: 'Strategy Design',
  description: 'Validate reasoning ability through adversarial questioning',
  entryCriteria: [
    'Feynman check passed',
    'Conceptual understanding verified',
  ],
  exitCriteria: [
    'Strategy is coherent (no logical gaps)',
    'Strategy has no contradictions',
    'All critical edge cases addressed',
    'Adversarial questions answered satisfactorily',
  ],
  onEntry: (context) => ({
    stageAttemptCount: 0,
    stageFailureCount: 0,
    lastUpdatedAt: new Date(),
  }),
  maxDurationMs: 25 * 60 * 1000, // 25 minutes
  maxFailures: 4,
};

export const CODING_STATE: StateDefinition = {
  id: 'coding',
  name: 'Coding',
  description: 'Implementation with silent interviewer guidance',
  entryCriteria: [
    'Strategy design passed',
    'User declared ready to code',
    'All adversarial questions resolved',
  ],
  exitCriteria: [
    'All visible tests pass',
    'All hidden tests pass',
    'Time budget not exceeded (if applicable)',
    'No forbidden concepts detected',
  ],
  onEntry: (context) => ({
    stageAttemptCount: 0,
    stageFailureCount: 0,
    lastUpdatedAt: new Date(),
  }),
  maxDurationMs: 45 * 60 * 1000, // 45 minutes
  maxFailures: 10, // More lenient for coding
};

export const REFLECTION_STATE: StateDefinition = {
  id: 'reflection',
  name: 'Reflection',
  description: 'Post-success learning reinforcement',
  entryCriteria: [
    'Coding stage passed',
    'All tests passing',
  ],
  exitCriteria: [
    'Key insight provided',
    'Pattern triggers identified',
    'Reflection submitted',
  ],
  onEntry: (context) => ({
    stageAttemptCount: 0,
    stageFailureCount: 0,
    lastUpdatedAt: new Date(),
  }),
  maxDurationMs: 10 * 60 * 1000, // 10 minutes
  maxFailures: 2,
};

export const COMPLETED_STATE: StateDefinition = {
  id: 'completed',
  name: 'Completed',
  description: 'Session successfully completed',
  entryCriteria: [
    'Reflection stage completed',
  ],
  exitCriteria: [],
  onEntry: (context) => ({
    lastUpdatedAt: new Date(),
  }),
};

export const ABANDONED_STATE: StateDefinition = {
  id: 'abandoned',
  name: 'Abandoned',
  description: 'Session abandoned by user or system',
  entryCriteria: [
    'User explicitly abandoned',
    'Or session expired',
    'Or too many failures without progress',
  ],
  exitCriteria: [],
  onEntry: (context) => ({
    lastUpdatedAt: new Date(),
  }),
};

// ============ State Registry ============

export const STATE_DEFINITIONS: Record<InterviewState, StateDefinition> = {
  problem_framing: PROBLEM_FRAMING_STATE,
  pattern_gate: PATTERN_GATE_STATE,
  feynman_check: FEYNMAN_CHECK_STATE,
  strategy_design: STRATEGY_DESIGN_STATE,
  coding: CODING_STATE,
  reflection: REFLECTION_STATE,
  completed: COMPLETED_STATE,
  abandoned: ABANDONED_STATE,
};

// ============ State Order ============

/**
 * Ordered sequence of active states
 */
export const STATE_ORDER: readonly InterviewState[] = [
  'problem_framing',
  'pattern_gate',
  'feynman_check',
  'strategy_design',
  'coding',
  'reflection',
];

/**
 * Get next state in sequence
 */
export function getNextState(current: InterviewState): InterviewState | null {
  const index = STATE_ORDER.indexOf(current);
  if (index === -1 || index >= STATE_ORDER.length - 1) {
    return null;
  }
  return STATE_ORDER[index + 1] ?? null;
}

/**
 * Get previous state in sequence
 */
export function getPreviousState(current: InterviewState): InterviewState | null {
  const index = STATE_ORDER.indexOf(current);
  if (index <= 0) {
    return null;
  }
  return STATE_ORDER[index - 1] ?? null;
}

/**
 * Check if state is before another in sequence
 */
export function isStateBefore(state: InterviewState, other: InterviewState): boolean {
  const stateIndex = STATE_ORDER.indexOf(state);
  const otherIndex = STATE_ORDER.indexOf(other);
  if (stateIndex === -1 || otherIndex === -1) return false;
  return stateIndex < otherIndex;
}

/**
 * Get state definition
 */
export function getStateDefinition(state: InterviewState): StateDefinition {
  return STATE_DEFINITIONS[state];
}
