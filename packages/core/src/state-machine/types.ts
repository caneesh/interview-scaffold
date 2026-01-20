/**
 * Backend State Machine Types
 *
 * Formal state machine specification for the interview coaching flow.
 * Defines states, transitions, guards, and event model.
 */

import type { PatternId } from '../entities/pattern.js';
import type { HelpLevel } from '../learner-centric/types.js';

// ============ States ============

/**
 * All possible states in the interview flow
 */
export const INTERVIEW_STATES = [
  'problem_framing',
  'pattern_gate',
  'feynman_check',
  'strategy_design',
  'coding',
  'reflection',
  'completed',
  'abandoned',
] as const;

export type InterviewState = (typeof INTERVIEW_STATES)[number];

/**
 * States that represent active (non-terminal) interview phases
 */
export const ACTIVE_STATES: readonly InterviewState[] = [
  'problem_framing',
  'pattern_gate',
  'feynman_check',
  'strategy_design',
  'coding',
  'reflection',
];

/**
 * Terminal states
 */
export const TERMINAL_STATES: readonly InterviewState[] = [
  'completed',
  'abandoned',
];

// ============ Events ============

/**
 * Frontend-triggered events
 */
export const FRONTEND_EVENTS = [
  'SUBMIT_FRAMING_ANSWER',
  'SUBMIT_PATTERN_SELECTION',
  'SUBMIT_FEYNMAN_EXPLANATION',
  'SUBMIT_STRATEGY',
  'SUBMIT_ADVERSARIAL_ANSWER',
  'SUBMIT_CODE',
  'SUBMIT_REFLECTION',
  'REQUEST_HINT',
  'REQUEST_SKIP',
  'ABANDON_SESSION',
  'RESUME_SESSION',
] as const;

export type FrontendEvent = (typeof FRONTEND_EVENTS)[number];

/**
 * Backend-triggered events (system-generated)
 */
export const BACKEND_EVENTS = [
  'STAGE_PASSED',
  'STAGE_FAILED',
  'STAGE_PARTIAL',
  'TIMEOUT_EXPIRED',
  'COOLDOWN_COMPLETE',
  'MEMORIZATION_DETECTED',
  'HELP_ESCALATED',
  'SESSION_EXPIRED',
] as const;

export type BackendEvent = (typeof BACKEND_EVENTS)[number];

/**
 * All events
 */
export type InterviewEvent = FrontendEvent | BackendEvent;

// ============ Event Payloads ============

export interface BaseEventPayload {
  readonly attemptId: string;
  readonly timestamp: Date;
  readonly userId: string;
}

export interface SubmitFramingAnswerPayload extends BaseEventPayload {
  readonly questionId: string;
  readonly answer: string;
}

export interface SubmitPatternSelectionPayload extends BaseEventPayload {
  readonly selectedPattern: PatternId;
  readonly justification: string;
}

export interface SubmitFeynmanExplanationPayload extends BaseEventPayload {
  readonly explanation: string;
}

export interface SubmitStrategyPayload extends BaseEventPayload {
  readonly strategy: string;
}

export interface SubmitAdversarialAnswerPayload extends BaseEventPayload {
  readonly questionId: string;
  readonly answer: string;
}

export interface SubmitCodePayload extends BaseEventPayload {
  readonly code: string;
  readonly language: string;
}

export interface SubmitReflectionPayload extends BaseEventPayload {
  readonly keyInsight: string;
  readonly misleadingFactors: readonly string[];
  readonly recognitionTips: string;
}

export interface RequestHintPayload extends BaseEventPayload {
  readonly requestedLevel: HelpLevel;
  readonly explicitlyRequested: boolean;
}

export interface BackendEventPayload extends BaseEventPayload {
  readonly reason?: string;
  readonly data?: unknown;
}

export type EventPayload =
  | SubmitFramingAnswerPayload
  | SubmitPatternSelectionPayload
  | SubmitFeynmanExplanationPayload
  | SubmitStrategyPayload
  | SubmitAdversarialAnswerPayload
  | SubmitCodePayload
  | SubmitReflectionPayload
  | RequestHintPayload
  | BackendEventPayload
  | BaseEventPayload;

// ============ State Context ============

/**
 * Context maintained by the state machine
 */
export interface StateMachineContext {
  /** Current state */
  readonly currentState: InterviewState;
  /** Attempt ID */
  readonly attemptId: string;
  /** User ID */
  readonly userId: string;
  /** Problem ID */
  readonly problemId: string;
  /** Pattern for this problem */
  readonly pattern: PatternId;
  /** Current help level (1-5) */
  readonly helpLevel: HelpLevel;
  /** Number of attempts at current stage */
  readonly stageAttemptCount: number;
  /** Number of failures at current stage */
  readonly stageFailureCount: number;
  /** Whether currently in cooldown */
  readonly inCooldown: boolean;
  /** Cooldown expiry time (if in cooldown) */
  readonly cooldownExpiresAt: Date | null;
  /** Hints used in this session */
  readonly hintsUsed: readonly HelpLevel[];
  /** Previous states visited */
  readonly stateHistory: readonly StateHistoryEntry[];
  /** When session started */
  readonly startedAt: Date;
  /** When session last updated */
  readonly lastUpdatedAt: Date;
}

export interface StateHistoryEntry {
  readonly state: InterviewState;
  readonly enteredAt: Date;
  readonly exitedAt: Date | null;
  readonly event: InterviewEvent | null;
}

// ============ Transition Definition ============

/**
 * A single transition in the state machine
 */
export interface StateTransition {
  /** Source state */
  readonly from: InterviewState;
  /** Target state */
  readonly to: InterviewState;
  /** Event that triggers this transition */
  readonly event: InterviewEvent;
  /** Guard condition (must return true for transition to occur) */
  readonly guard?: TransitionGuard;
  /** Action to execute during transition */
  readonly action?: TransitionAction;
  /** Description for documentation */
  readonly description?: string;
}

/**
 * Guard function that determines if transition is allowed
 */
export type TransitionGuard = (
  context: StateMachineContext,
  payload: EventPayload
) => boolean;

/**
 * Action to execute during transition
 */
export type TransitionAction = (
  context: StateMachineContext,
  payload: EventPayload
) => Partial<StateMachineContext>;

// ============ State Definition ============

/**
 * Definition of a single state
 */
export interface StateDefinition {
  /** State ID */
  readonly id: InterviewState;
  /** Human-readable name */
  readonly name: string;
  /** Description */
  readonly description: string;
  /** Entry criteria (what must be true to enter) */
  readonly entryCriteria: readonly string[];
  /** Exit criteria (what must be true to exit) */
  readonly exitCriteria: readonly string[];
  /** Entry action (executed when entering state) */
  readonly onEntry?: StateAction;
  /** Exit action (executed when leaving state) */
  readonly onExit?: StateAction;
  /** Maximum time allowed in this state (ms) */
  readonly maxDurationMs?: number;
  /** Maximum failures before forced progression */
  readonly maxFailures?: number;
}

/**
 * Action to execute on state entry/exit
 */
export type StateAction = (context: StateMachineContext) => Partial<StateMachineContext>;

// ============ Hint Escalation ============

/**
 * Hint escalation rule
 */
export interface HintEscalationRule {
  /** Current level */
  readonly fromLevel: HelpLevel;
  /** Next level */
  readonly toLevel: HelpLevel;
  /** Condition for escalation */
  readonly condition: HintEscalationCondition;
  /** Cooldown before this escalation can occur (ms) */
  readonly cooldownMs: number;
  /** Score penalty for this escalation */
  readonly scorePenalty: number;
}

export type HintEscalationCondition =
  | { type: 'explicit_request' }
  | { type: 'failure_count'; threshold: number }
  | { type: 'time_elapsed'; thresholdMs: number }
  | { type: 'combined'; conditions: readonly HintEscalationCondition[] };

// ============ Cooldown Rules ============

/**
 * Cooldown configuration for failure loops
 */
export interface CooldownRule {
  /** State this applies to */
  readonly state: InterviewState;
  /** Number of failures to trigger cooldown */
  readonly failureThreshold: number;
  /** Cooldown duration (ms) */
  readonly durationMs: number;
  /** Whether cooldown increases with repeated failures */
  readonly exponentialBackoff: boolean;
  /** Maximum cooldown duration (ms) */
  readonly maxDurationMs: number;
}

// ============ Persistence Model ============

/**
 * Fields persisted per attempt
 */
export interface AttemptPersistenceModel {
  readonly id: string;
  readonly userId: string;
  readonly tenantId: string;
  readonly problemId: string;
  readonly pattern: PatternId;
  readonly currentState: InterviewState;
  readonly helpLevel: HelpLevel;
  readonly stageAttemptCounts: Record<InterviewState, number>;
  readonly stageFailureCounts: Record<InterviewState, number>;
  readonly hintsUsed: readonly HelpLevel[];
  readonly stateHistory: readonly StateHistoryEntry[];
  readonly cooldownExpiresAt: Date | null;
  readonly startedAt: Date;
  readonly lastUpdatedAt: Date;
  readonly completedAt: Date | null;
  /** Final score (only set when completed) */
  readonly finalScore: number | null;
  /** Stage-specific data */
  readonly stageData: {
    readonly problemFraming: unknown | null;
    readonly patternGate: unknown | null;
    readonly feynmanCheck: unknown | null;
    readonly strategyDesign: unknown | null;
    readonly coding: unknown | null;
    readonly reflection: unknown | null;
  };
}

// ============ Transition Result ============

/**
 * Result of a state transition
 */
export interface TransitionResult {
  /** Whether transition was successful */
  readonly success: boolean;
  /** New context after transition */
  readonly context: StateMachineContext;
  /** Error message if transition failed */
  readonly error?: string;
  /** Side effects to execute */
  readonly sideEffects: readonly TransitionSideEffect[];
}

/**
 * Side effect to execute after transition
 */
export interface TransitionSideEffect {
  readonly type: 'emit_event' | 'schedule_timeout' | 'cancel_timeout' | 'persist' | 'notify';
  readonly payload: unknown;
}
