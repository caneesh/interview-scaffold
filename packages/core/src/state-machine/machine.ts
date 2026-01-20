/**
 * State Machine Core
 *
 * Main state machine implementation that orchestrates the interview flow.
 */

import type {
  StateMachineContext,
  InterviewState,
  InterviewEvent,
  EventPayload,
  TransitionResult,
  TransitionSideEffect,
  StateHistoryEntry,
  AttemptPersistenceModel,
} from './types.js';
import type { PatternId } from '../entities/pattern.js';
import type { HelpLevel } from '../learner-centric/types.js';
import { processEvent, getValidEvents, isEventValid } from './transitions.js';
import { getStateDefinition, STATE_ORDER } from './states.js';
import {
  shouldTriggerCooldown,
  calculateCooldownDuration,
  applyCooldown,
  isInCooldown,
  getRemainingCooldownMs,
} from './cooldown.js';
import {
  findEscalationRule,
  calculateHintPenalty,
} from './hint-escalation.js';

// ============ Factory Functions ============

/**
 * Create initial state machine context
 */
export function createInitialContext(params: {
  attemptId: string;
  userId: string;
  problemId: string;
  pattern: PatternId;
}): StateMachineContext {
  const now = new Date();

  return {
    currentState: 'problem_framing',
    attemptId: params.attemptId,
    userId: params.userId,
    problemId: params.problemId,
    pattern: params.pattern,
    helpLevel: 1,
    stageAttemptCount: 0,
    stageFailureCount: 0,
    inCooldown: false,
    cooldownExpiresAt: null,
    hintsUsed: [],
    stateHistory: [
      {
        state: 'problem_framing',
        enteredAt: now,
        exitedAt: null,
        event: null,
      },
    ],
    startedAt: now,
    lastUpdatedAt: now,
  };
}

/**
 * Restore context from persistence
 */
export function restoreContext(persisted: AttemptPersistenceModel): StateMachineContext {
  const currentStateCount = persisted.stageAttemptCounts[persisted.currentState] ?? 0;
  const currentFailureCount = persisted.stageFailureCounts[persisted.currentState] ?? 0;

  return {
    currentState: persisted.currentState,
    attemptId: persisted.id,
    userId: persisted.userId,
    problemId: persisted.problemId,
    pattern: persisted.pattern,
    helpLevel: persisted.helpLevel,
    stageAttemptCount: currentStateCount,
    stageFailureCount: currentFailureCount,
    inCooldown: persisted.cooldownExpiresAt !== null && new Date() < persisted.cooldownExpiresAt,
    cooldownExpiresAt: persisted.cooldownExpiresAt,
    hintsUsed: [...persisted.hintsUsed],
    stateHistory: [...persisted.stateHistory],
    startedAt: persisted.startedAt,
    lastUpdatedAt: persisted.lastUpdatedAt,
  };
}

// ============ State Machine Class ============

export class InterviewStateMachine {
  private context: StateMachineContext;
  private eventQueue: Array<{ event: InterviewEvent; payload: EventPayload }> = [];
  private processing = false;

  constructor(context: StateMachineContext) {
    this.context = context;
  }

  /**
   * Get current state
   */
  getState(): InterviewState {
    return this.context.currentState;
  }

  /**
   * Get full context
   */
  getContext(): StateMachineContext {
    return this.context;
  }

  /**
   * Check if in terminal state
   */
  isTerminal(): boolean {
    return this.context.currentState === 'completed' ||
           this.context.currentState === 'abandoned';
  }

  /**
   * Get valid events from current state
   */
  getValidEvents(): InterviewEvent[] {
    return getValidEvents(this.context);
  }

  /**
   * Check if event is valid
   */
  canProcess(event: InterviewEvent, payload: EventPayload): boolean {
    // Check cooldown
    if (isInCooldown(this.context)) {
      // Only certain events are allowed during cooldown
      const allowedDuringCooldown: InterviewEvent[] = [
        'COOLDOWN_COMPLETE',
        'ABANDON_SESSION',
        'SESSION_EXPIRED',
      ];
      if (!allowedDuringCooldown.includes(event)) {
        return false;
      }
    }

    return isEventValid(event, this.context, payload);
  }

  /**
   * Process an event
   */
  process(event: InterviewEvent, payload: EventPayload): TransitionResult {
    // Check cooldown
    if (isInCooldown(this.context)) {
      const allowedDuringCooldown: InterviewEvent[] = [
        'COOLDOWN_COMPLETE',
        'ABANDON_SESSION',
        'SESSION_EXPIRED',
      ];
      if (!allowedDuringCooldown.includes(event)) {
        return {
          success: false,
          context: this.context,
          error: `In cooldown. ${getRemainingCooldownMs(this.context)}ms remaining.`,
          sideEffects: [],
        };
      }
    }

    // Process the event
    let result = processEvent(event, this.context, payload);

    if (result.success) {
      // Update internal context
      this.context = result.context;

      // Check for cooldown trigger
      if (event === 'STAGE_FAILED') {
        const cooldownSideEffects = this.handlePotentialCooldown();
        if (cooldownSideEffects.length > 0) {
          result = {
            ...result,
            sideEffects: [...result.sideEffects, ...cooldownSideEffects],
          };
        }
      }
    }

    return result;
  }

  /**
   * Queue an event for processing.
   * Events are processed synchronously in order.
   */
  enqueue(event: InterviewEvent, payload: EventPayload): void {
    this.eventQueue.push({ event, payload });
    this.processQueue();
  }

  /**
   * Process queued events synchronously.
   * Uses a processing flag to prevent re-entrant calls from causing
   * events to be processed out of order.
   */
  private processQueue(): void {
    if (this.processing) return;
    this.processing = true;

    try {
      while (this.eventQueue.length > 0) {
        const item = this.eventQueue.shift();
        if (item) {
          this.process(item.event, item.payload);
        }
      }
    } finally {
      this.processing = false;
    }
  }

  /**
   * Handle potential cooldown after failure
   * Returns side effects to add
   */
  private handlePotentialCooldown(): TransitionSideEffect[] {
    const state = this.context.currentState;
    const failureCount = this.context.stageFailureCount;
    const sideEffects: TransitionSideEffect[] = [];

    if (shouldTriggerCooldown(state, failureCount)) {
      // Calculate consecutive cooldowns for this state
      const previousCooldowns = this.context.stateHistory.filter(
        h => h.state === state
      ).length - 1;

      const duration = calculateCooldownDuration(state, previousCooldowns);
      const cooldownUpdate = applyCooldown(this.context, duration);
      this.context = { ...this.context, ...cooldownUpdate };

      // Add side effect for timeout scheduling
      sideEffects.push({
        type: 'schedule_timeout',
        payload: {
          event: 'COOLDOWN_COMPLETE',
          durationMs: duration,
        },
      });
    }

    return sideEffects;
  }

  /**
   * Request help escalation
   */
  requestHelp(explicitlyRequested: boolean): TransitionResult {
    const currentStateEntry = this.context.stateHistory.find(
      h => h.state === this.context.currentState && h.exitedAt === null
    );

    const stageEntryTime = currentStateEntry?.enteredAt ?? this.context.startedAt;

    // Find last escalation time
    const lastEscalation = [...this.context.hintsUsed].reverse()[0];
    const lastEscalationTime = lastEscalation
      ? this.context.lastUpdatedAt
      : null;

    const rule = findEscalationRule(
      this.context.helpLevel,
      this.context,
      explicitlyRequested,
      stageEntryTime,
      lastEscalationTime
    );

    if (!rule) {
      return {
        success: false,
        context: this.context,
        error: 'No escalation available',
        sideEffects: [],
      };
    }

    // Apply escalation
    const newLevel = rule.toLevel as HelpLevel;
    this.context = {
      ...this.context,
      helpLevel: newLevel,
      hintsUsed: [...this.context.hintsUsed, newLevel],
      lastUpdatedAt: new Date(),
    };

    return {
      success: true,
      context: this.context,
      sideEffects: [
        { type: 'persist', payload: { context: this.context } },
      ],
    };
  }

  /**
   * Get current progress
   */
  getProgress(): {
    currentState: InterviewState;
    stateIndex: number;
    totalStates: number;
    percentComplete: number;
    stageAttempts: number;
    stageFailures: number;
    helpLevel: HelpLevel;
    hintPenalty: number;
  } {
    const stateIndex = STATE_ORDER.indexOf(this.context.currentState);
    const totalStates = STATE_ORDER.length;
    const percentComplete = stateIndex >= 0
      ? Math.round((stateIndex / totalStates) * 100)
      : 0;

    return {
      currentState: this.context.currentState,
      stateIndex: Math.max(0, stateIndex),
      totalStates,
      percentComplete,
      stageAttempts: this.context.stageAttemptCount,
      stageFailures: this.context.stageFailureCount,
      helpLevel: this.context.helpLevel,
      hintPenalty: calculateHintPenalty(this.context.hintsUsed),
    };
  }

  /**
   * Get remaining time in current state (if timeout configured)
   */
  getRemainingTimeMs(): number | null {
    const stateDef = getStateDefinition(this.context.currentState);
    if (!stateDef.maxDurationMs) return null;

    const currentStateEntry = this.context.stateHistory.find(
      h => h.state === this.context.currentState && h.exitedAt === null
    );
    if (!currentStateEntry) return null;

    const elapsed = Date.now() - currentStateEntry.enteredAt.getTime();
    return Math.max(0, stateDef.maxDurationMs - elapsed);
  }

  /**
   * Convert to persistence model
   */
  toPersistenceModel(tenantId: string): AttemptPersistenceModel {
    // Build stage counts from history
    const stageAttemptCounts: Record<InterviewState, number> = {
      problem_framing: 0,
      pattern_gate: 0,
      feynman_check: 0,
      strategy_design: 0,
      coding: 0,
      reflection: 0,
      completed: 0,
      abandoned: 0,
    };

    const stageFailureCounts: Record<InterviewState, number> = { ...stageAttemptCounts };

    // Current state counts
    stageAttemptCounts[this.context.currentState] = this.context.stageAttemptCount;
    stageFailureCounts[this.context.currentState] = this.context.stageFailureCount;

    return {
      id: this.context.attemptId,
      userId: this.context.userId,
      tenantId,
      problemId: this.context.problemId,
      pattern: this.context.pattern,
      currentState: this.context.currentState,
      helpLevel: this.context.helpLevel,
      stageAttemptCounts,
      stageFailureCounts,
      hintsUsed: [...this.context.hintsUsed],
      stateHistory: [...this.context.stateHistory],
      cooldownExpiresAt: this.context.cooldownExpiresAt,
      startedAt: this.context.startedAt,
      lastUpdatedAt: this.context.lastUpdatedAt,
      completedAt: this.isTerminal() ? new Date() : null,
      finalScore: null, // Calculated separately
      stageData: {
        problemFraming: null,
        patternGate: null,
        feynmanCheck: null,
        strategyDesign: null,
        coding: null,
        reflection: null,
      },
    };
  }
}

// ============ Factory ============

/**
 * Create a new state machine for an attempt
 */
export function createStateMachine(params: {
  attemptId: string;
  userId: string;
  problemId: string;
  pattern: PatternId;
}): InterviewStateMachine {
  const context = createInitialContext(params);
  return new InterviewStateMachine(context);
}

/**
 * Restore a state machine from persistence
 */
export function restoreStateMachine(
  persisted: AttemptPersistenceModel
): InterviewStateMachine {
  const context = restoreContext(persisted);
  return new InterviewStateMachine(context);
}
