/**
 * State Transitions
 *
 * Defines all valid state transitions in the interview flow,
 * including events, guards, and actions.
 */

import type {
  StateTransition,
  InterviewState,
  InterviewEvent,
  StateMachineContext,
  TransitionResult,
  TransitionSideEffect,
  EventPayload,
  StateHistoryEntry,
} from './types.js';
import {
  andGuards,
  canEnterPatternGate,
  canEnterFeynmanCheck,
  canEnterStrategyDesign,
  canEnterCoding,
  canEnterReflection,
  notInCooldown,
  createMaxFailuresGuard,
  ALLOW_ALWAYS,
} from './guards.js';
import { getStateDefinition, getNextState } from './states.js';

// ============ Transition Definitions ============

export const TRANSITIONS: readonly StateTransition[] = [
  // === Problem Framing Transitions ===
  {
    from: 'problem_framing',
    to: 'pattern_gate',
    event: 'STAGE_PASSED',
    guard: andGuards(canEnterPatternGate, notInCooldown),
    description: 'Move to pattern gate after framing is complete',
  },
  {
    from: 'problem_framing',
    to: 'problem_framing',
    event: 'STAGE_FAILED',
    guard: createMaxFailuresGuard(5),
    action: (ctx) => ({
      stageFailureCount: ctx.stageFailureCount + 1,
      lastUpdatedAt: new Date(),
    }),
    description: 'Stay in framing on failure (under max)',
  },
  {
    from: 'problem_framing',
    to: 'pattern_gate',
    event: 'STAGE_FAILED',
    guard: (ctx) => ctx.stageFailureCount >= 5,
    description: 'Force progress after max framing failures',
  },

  // === Pattern Gate Transitions ===
  {
    from: 'pattern_gate',
    to: 'feynman_check',
    event: 'STAGE_PASSED',
    guard: andGuards(canEnterFeynmanCheck, notInCooldown),
    description: 'Move to Feynman check after pattern gate pass',
  },
  {
    from: 'pattern_gate',
    to: 'pattern_gate',
    event: 'STAGE_FAILED',
    guard: createMaxFailuresGuard(3),
    action: (ctx) => ({
      stageFailureCount: ctx.stageFailureCount + 1,
      lastUpdatedAt: new Date(),
    }),
    description: 'Stay in pattern gate on failure (under max)',
  },
  {
    from: 'pattern_gate',
    to: 'feynman_check',
    event: 'STAGE_FAILED',
    guard: (ctx) => ctx.stageFailureCount >= 3,
    description: 'Force progress after max pattern gate failures (with guidance)',
  },

  // === Feynman Check Transitions ===
  {
    from: 'feynman_check',
    to: 'strategy_design',
    event: 'STAGE_PASSED',
    guard: andGuards(canEnterStrategyDesign, notInCooldown),
    description: 'Move to strategy design after Feynman pass',
  },
  {
    from: 'feynman_check',
    to: 'feynman_check',
    event: 'STAGE_FAILED',
    guard: createMaxFailuresGuard(3),
    action: (ctx) => ({
      stageFailureCount: ctx.stageFailureCount + 1,
      lastUpdatedAt: new Date(),
    }),
    description: 'Stay in Feynman check on failure (under max)',
  },
  {
    from: 'feynman_check',
    to: 'strategy_design',
    event: 'STAGE_FAILED',
    guard: (ctx) => ctx.stageFailureCount >= 3,
    description: 'Force progress after max Feynman failures (with guidance)',
  },
  // Backward transition for memorization detection
  {
    from: 'feynman_check',
    to: 'pattern_gate',
    event: 'MEMORIZATION_DETECTED',
    description: 'Reset to pattern gate when memorization detected in Feynman',
  },

  // === Strategy Design Transitions ===
  {
    from: 'strategy_design',
    to: 'coding',
    event: 'STAGE_PASSED',
    guard: andGuards(canEnterCoding, notInCooldown),
    description: 'Move to coding after strategy design pass',
  },
  {
    from: 'strategy_design',
    to: 'strategy_design',
    event: 'STAGE_FAILED',
    guard: createMaxFailuresGuard(4),
    action: (ctx) => ({
      stageFailureCount: ctx.stageFailureCount + 1,
      lastUpdatedAt: new Date(),
    }),
    description: 'Stay in strategy design on failure (under max)',
  },
  {
    from: 'strategy_design',
    to: 'coding',
    event: 'STAGE_FAILED',
    guard: (ctx) => ctx.stageFailureCount >= 4,
    description: 'Force progress after max strategy failures (with guidance)',
  },
  // Backward transition for memorization detection
  {
    from: 'strategy_design',
    to: 'feynman_check',
    event: 'MEMORIZATION_DETECTED',
    description: 'Reset to Feynman check when memorization detected in strategy',
  },

  // === Coding Transitions ===
  {
    from: 'coding',
    to: 'reflection',
    event: 'STAGE_PASSED',
    guard: canEnterReflection,
    description: 'Move to reflection after all tests pass',
  },
  {
    from: 'coding',
    to: 'coding',
    event: 'STAGE_FAILED',
    guard: createMaxFailuresGuard(10),
    action: (ctx) => ({
      stageFailureCount: ctx.stageFailureCount + 1,
      stageAttemptCount: ctx.stageAttemptCount + 1,
      lastUpdatedAt: new Date(),
    }),
    description: 'Stay in coding on test failure (under max)',
  },
  {
    from: 'coding',
    to: 'reflection',
    event: 'STAGE_FAILED',
    guard: (ctx) => ctx.stageFailureCount >= 10,
    description: 'Force progress after max coding failures (with significant penalty)',
  },
  // Partial success (some tests pass)
  {
    from: 'coding',
    to: 'coding',
    event: 'STAGE_PARTIAL',
    action: (ctx) => ({
      stageAttemptCount: ctx.stageAttemptCount + 1,
      lastUpdatedAt: new Date(),
    }),
    description: 'Stay in coding on partial success',
  },

  // === Reflection Transitions ===
  {
    from: 'reflection',
    to: 'completed',
    event: 'STAGE_PASSED',
    description: 'Complete session after reflection',
  },
  {
    from: 'reflection',
    to: 'reflection',
    event: 'STAGE_FAILED',
    guard: createMaxFailuresGuard(2),
    action: (ctx) => ({
      stageFailureCount: ctx.stageFailureCount + 1,
      lastUpdatedAt: new Date(),
    }),
    description: 'Stay in reflection on inadequate submission',
  },
  {
    from: 'reflection',
    to: 'completed',
    event: 'STAGE_FAILED',
    guard: (ctx) => ctx.stageFailureCount >= 2,
    description: 'Complete anyway after max reflection attempts',
  },

  // === Hint Escalation (any active state) ===
  ...createHintEscalationTransitions(),

  // === Timeout Transitions ===
  {
    from: 'problem_framing',
    to: 'pattern_gate',
    event: 'TIMEOUT_EXPIRED',
    description: 'Auto-advance from framing on timeout',
  },
  {
    from: 'pattern_gate',
    to: 'feynman_check',
    event: 'TIMEOUT_EXPIRED',
    description: 'Auto-advance from pattern gate on timeout',
  },
  {
    from: 'feynman_check',
    to: 'strategy_design',
    event: 'TIMEOUT_EXPIRED',
    description: 'Auto-advance from Feynman check on timeout',
  },
  {
    from: 'strategy_design',
    to: 'coding',
    event: 'TIMEOUT_EXPIRED',
    description: 'Auto-advance from strategy design on timeout',
  },
  {
    from: 'coding',
    to: 'reflection',
    event: 'TIMEOUT_EXPIRED',
    description: 'Auto-advance from coding on timeout (with penalty)',
  },

  // === Abandon Transitions (from any active state) ===
  ...createAbandonTransitions(),

  // === Cooldown Complete Transitions ===
  {
    from: 'problem_framing',
    to: 'problem_framing',
    event: 'COOLDOWN_COMPLETE',
    action: (ctx) => ({
      inCooldown: false,
      cooldownExpiresAt: null,
      lastUpdatedAt: new Date(),
    }),
    description: 'Clear cooldown in problem framing',
  },
  {
    from: 'pattern_gate',
    to: 'pattern_gate',
    event: 'COOLDOWN_COMPLETE',
    action: (ctx) => ({
      inCooldown: false,
      cooldownExpiresAt: null,
      lastUpdatedAt: new Date(),
    }),
    description: 'Clear cooldown in pattern gate',
  },
  {
    from: 'feynman_check',
    to: 'feynman_check',
    event: 'COOLDOWN_COMPLETE',
    action: (ctx) => ({
      inCooldown: false,
      cooldownExpiresAt: null,
      lastUpdatedAt: new Date(),
    }),
    description: 'Clear cooldown in Feynman check',
  },
  {
    from: 'strategy_design',
    to: 'strategy_design',
    event: 'COOLDOWN_COMPLETE',
    action: (ctx) => ({
      inCooldown: false,
      cooldownExpiresAt: null,
      lastUpdatedAt: new Date(),
    }),
    description: 'Clear cooldown in strategy design',
  },
  {
    from: 'coding',
    to: 'coding',
    event: 'COOLDOWN_COMPLETE',
    action: (ctx) => ({
      inCooldown: false,
      cooldownExpiresAt: null,
      lastUpdatedAt: new Date(),
    }),
    description: 'Clear cooldown in coding',
  },
  {
    from: 'reflection',
    to: 'reflection',
    event: 'COOLDOWN_COMPLETE',
    action: (ctx) => ({
      inCooldown: false,
      cooldownExpiresAt: null,
      lastUpdatedAt: new Date(),
    }),
    description: 'Clear cooldown in reflection',
  },
];

// ============ Helper Functions ============

function createHintEscalationTransitions(): StateTransition[] {
  const activeStates: InterviewState[] = [
    'problem_framing',
    'pattern_gate',
    'feynman_check',
    'strategy_design',
    'coding',
  ];

  return activeStates.map(state => ({
    from: state,
    to: state,
    event: 'HELP_ESCALATED' as InterviewEvent,
    action: (ctx, payload) => {
      const newLevel = Math.min(ctx.helpLevel + 1, 5) as 1 | 2 | 3 | 4 | 5;
      return {
        helpLevel: newLevel,
        hintsUsed: [...ctx.hintsUsed, newLevel],
        lastUpdatedAt: new Date(),
      };
    },
    description: `Escalate help level in ${state}`,
  }));
}

function createAbandonTransitions(): StateTransition[] {
  const activeStates: InterviewState[] = [
    'problem_framing',
    'pattern_gate',
    'feynman_check',
    'strategy_design',
    'coding',
    'reflection',
  ];

  return activeStates.map(state => ({
    from: state,
    to: 'abandoned' as InterviewState,
    event: 'ABANDON_SESSION' as InterviewEvent,
    guard: ALLOW_ALWAYS,
    description: `Abandon session from ${state}`,
  }));
}

// ============ Transition Engine ============

/**
 * Find applicable transition for event in current state
 */
export function findTransition(
  currentState: InterviewState,
  event: InterviewEvent,
  context: StateMachineContext,
  payload: EventPayload
): StateTransition | null {
  const candidates = TRANSITIONS.filter(
    t => t.from === currentState && t.event === event
  );

  // Find first transition whose guard passes
  for (const transition of candidates) {
    if (!transition.guard || transition.guard(context, payload)) {
      return transition;
    }
  }

  return null;
}

/**
 * Execute a state transition
 */
export function executeTransition(
  transition: StateTransition,
  context: StateMachineContext,
  payload: EventPayload
): TransitionResult {
  // Check guard one more time
  if (transition.guard && !transition.guard(context, payload)) {
    return {
      success: false,
      context,
      error: 'Guard condition not met',
      sideEffects: [],
    };
  }

  const sideEffects: TransitionSideEffect[] = [];
  const isSelfTransition = transition.from === transition.to;

  // Exit current state (only for actual state changes)
  const currentStateDef = getStateDefinition(context.currentState);
  let updatedContext = { ...context };

  if (!isSelfTransition && currentStateDef.onExit) {
    updatedContext = { ...updatedContext, ...currentStateDef.onExit(updatedContext) };
  }

  // Execute transition action first (before state updates)
  if (transition.action) {
    const actionResult = transition.action(updatedContext, payload);
    updatedContext = { ...updatedContext, ...actionResult };
  }

  // Update state history and state (only for actual state changes)
  if (!isSelfTransition) {
    // Close current history entry
    const updatedHistory: StateHistoryEntry[] = updatedContext.stateHistory.map(entry => {
      if (entry.state === context.currentState && entry.exitedAt === null) {
        return { ...entry, exitedAt: new Date(), event: transition.event };
      }
      return entry;
    });

    // Update to new state
    updatedContext = {
      ...updatedContext,
      currentState: transition.to,
      stateHistory: [
        ...updatedHistory,
        {
          state: transition.to,
          enteredAt: new Date(),
          exitedAt: null,
          event: null,
        },
      ],
    };

    // Enter new state
    const newStateDef = getStateDefinition(transition.to);
    if (newStateDef.onEntry) {
      updatedContext = { ...updatedContext, ...newStateDef.onEntry(updatedContext) };
    }

    // Schedule timeout if new state has max duration
    if (newStateDef.maxDurationMs) {
      sideEffects.push({
        type: 'schedule_timeout',
        payload: {
          state: transition.to,
          durationMs: newStateDef.maxDurationMs,
        },
      });
    }
  }

  // Persist the state change
  sideEffects.push({
    type: 'persist',
    payload: { context: updatedContext },
  });

  return {
    success: true,
    context: updatedContext,
    sideEffects,
  };
}

/**
 * Process an event and execute transition if valid
 */
export function processEvent(
  event: InterviewEvent,
  context: StateMachineContext,
  payload: EventPayload
): TransitionResult {
  const transition = findTransition(context.currentState, event, context, payload);

  if (!transition) {
    return {
      success: false,
      context,
      error: `No valid transition for event ${event} in state ${context.currentState}`,
      sideEffects: [],
    };
  }

  return executeTransition(transition, context, payload);
}

/**
 * Get all valid events from current state
 */
export function getValidEvents(context: StateMachineContext): InterviewEvent[] {
  const validEvents: InterviewEvent[] = [];

  for (const transition of TRANSITIONS) {
    if (transition.from !== context.currentState) continue;
    if (!transition.guard || transition.guard(context, {} as EventPayload)) {
      if (!validEvents.includes(transition.event)) {
        validEvents.push(transition.event);
      }
    }
  }

  return validEvents;
}

/**
 * Check if an event is valid from current state
 */
export function isEventValid(
  event: InterviewEvent,
  context: StateMachineContext,
  payload: EventPayload
): boolean {
  return findTransition(context.currentState, event, context, payload) !== null;
}
