/**
 * Debug Track - Port Interfaces
 * Dependency inversion - core logic depends on abstractions, not implementations.
 */

import type { TenantId } from '../entities/tenant.js';
import type { DebugGate, DebugPatternCategory, DebugDifficulty } from './types.js';
import type {
  DebugScenario,
  DebugAttempt,
  DebugAttemptId,
  DebugScenarioId,
  GateSubmission,
  EvaluationResult,
} from './entities.js';

// ============ Clock ============

/**
 * Clock - port for time operations (enables deterministic testing)
 * Re-exported from core ports for convenience.
 */
export type { Clock } from '../ports/clock.js';

// ============ IdGenerator ============

/**
 * IdGenerator - port for generating unique IDs
 * Re-exported from core ports for convenience.
 */
export type { IdGenerator } from '../ports/id-generator.js';

// ============ Debug Scenario Repository ============

/**
 * DebugScenarioRepo - port for scenario persistence and retrieval
 */
export interface DebugScenarioRepo {
  /**
   * Find a scenario by ID
   */
  findById(id: DebugScenarioId): Promise<DebugScenario | null>;

  /**
   * List all scenarios with optional filters
   */
  findAll(filter?: DebugScenarioFilter): Promise<readonly DebugScenario[]>;

  /**
   * Count scenarios matching filter
   */
  count(filter?: DebugScenarioFilter): Promise<number>;
}

/**
 * Filter options for listing scenarios
 */
export interface DebugScenarioFilter {
  readonly category?: DebugPatternCategory;
  readonly difficulty?: DebugDifficulty;
  readonly tags?: readonly string[];
  readonly limit?: number;
  readonly offset?: number;
}

// ============ Debug Attempt Repository ============

/**
 * DebugAttemptRepo - port for attempt persistence
 */
export interface DebugAttemptRepo {
  /**
   * Create a new attempt
   */
  save(attempt: DebugAttempt): Promise<DebugAttempt>;

  /**
   * Update an existing attempt
   */
  update(attempt: DebugAttempt): Promise<DebugAttempt>;

  /**
   * Find an attempt by ID
   */
  findById(tenantId: TenantId, attemptId: DebugAttemptId): Promise<DebugAttempt | null>;

  /**
   * Find active (in-progress) attempt for a user
   */
  findActiveByUser(tenantId: TenantId, userId: string): Promise<DebugAttempt | null>;

  /**
   * Find all attempts by user with optional filters
   */
  findByUser(
    tenantId: TenantId,
    userId: string,
    filter?: DebugAttemptFilter
  ): Promise<readonly DebugAttempt[]>;

  /**
   * Append a gate submission to an attempt
   * Returns the updated attempt
   */
  appendGateSubmission(
    tenantId: TenantId,
    attemptId: DebugAttemptId,
    submission: GateSubmission
  ): Promise<DebugAttempt>;
}

/**
 * Filter options for listing attempts
 */
export interface DebugAttemptFilter {
  readonly scenarioId?: DebugScenarioId;
  readonly status?: 'IN_PROGRESS' | 'COMPLETED' | 'ABANDONED';
  readonly limit?: number;
  readonly offset?: number;
}

// ============ Debug Evaluator ============

/**
 * DebugEvaluator - port for evaluating gate submissions
 * Can be implemented with heuristics, LLM, or hybrid approach.
 */
export interface DebugEvaluator {
  /**
   * Evaluate a gate submission
   * @param gate - The gate being evaluated
   * @param answer - The user's answer
   * @param scenario - The debug scenario for context
   * @param context - Additional evaluation context
   */
  evaluate(
    gate: DebugGate,
    answer: string,
    scenario: DebugScenario,
    context?: EvaluationContext
  ): Promise<EvaluationResult>;

  /**
   * Check if LLM-based evaluation is available
   */
  isLLMAvailable(): boolean;
}

/**
 * Context for evaluation (previous submissions, hints used, etc.)
 */
export interface EvaluationContext {
  readonly previousSubmissions?: readonly GateSubmission[];
  readonly hintsUsed?: number;
  readonly elapsedMs?: number;
  readonly retryCount?: number;
  /** Force heuristic-only evaluation (no LLM) */
  readonly heuristicOnly?: boolean;
}

// ============ LLM Evaluator (Optional) ============

/**
 * LLMDebugEvaluator - optional port for LLM-based evaluation
 * Provides more nuanced evaluation when heuristics are insufficient.
 */
export interface LLMDebugEvaluator {
  /**
   * Evaluate using LLM with rubric
   */
  evaluateWithRubric(
    gate: DebugGate,
    answer: string,
    scenario: DebugScenario,
    rubric: EvaluationRubric
  ): Promise<LLMEvaluationResult>;

  /**
   * Check if the LLM evaluator is enabled
   */
  isEnabled(): boolean;
}

/**
 * Rubric for LLM evaluation
 */
export interface EvaluationRubric {
  readonly criteria: readonly RubricCriterionDef[];
  readonly passingThreshold: number;
  readonly examples?: readonly RubricExample[];
}

/**
 * Individual rubric criterion definition
 */
export interface RubricCriterionDef {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly weight: number;
  readonly scoringGuide: string;
}

/**
 * Example for rubric grading
 */
export interface RubricExample {
  readonly answer: string;
  readonly expectedScore: number;
  readonly explanation: string;
}

/**
 * LLM evaluation result
 */
export interface LLMEvaluationResult {
  readonly scores: Readonly<Record<string, number>>;
  readonly overallScore: number;
  readonly passed: boolean;
  readonly feedback: string;
  readonly confidence: number;
  readonly reasoning: string;
}

// ============ Event Sink ============

/**
 * DebugEventSink - port for emitting debug-track events
 */
export interface DebugEventSink {
  emit(event: DebugEvent): Promise<void>;
}

/**
 * Debug track event types
 */
export type DebugEvent =
  | DebugAttemptStartedEvent
  | DebugGateSubmittedEvent
  | DebugGatePassedEvent
  | DebugHintRequestedEvent
  | DebugAttemptCompletedEvent
  | DebugAttemptAbandonedEvent;

export interface DebugAttemptStartedEvent {
  readonly type: 'DEBUG_ATTEMPT_STARTED';
  readonly tenantId: TenantId;
  readonly userId: string;
  readonly attemptId: string;
  readonly scenarioId: string;
  readonly category: DebugPatternCategory;
  readonly difficulty: DebugDifficulty;
  readonly timestamp: Date;
}

export interface DebugGateSubmittedEvent {
  readonly type: 'DEBUG_GATE_SUBMITTED';
  readonly tenantId: TenantId;
  readonly userId: string;
  readonly attemptId: string;
  readonly gate: DebugGate;
  readonly isCorrect: boolean;
  readonly retryCount: number;
  readonly timestamp: Date;
}

export interface DebugGatePassedEvent {
  readonly type: 'DEBUG_GATE_PASSED';
  readonly tenantId: TenantId;
  readonly userId: string;
  readonly attemptId: string;
  readonly gate: DebugGate;
  readonly elapsedMs: number;
  readonly timestamp: Date;
}

export interface DebugHintRequestedEvent {
  readonly type: 'DEBUG_HINT_REQUESTED';
  readonly tenantId: TenantId;
  readonly userId: string;
  readonly attemptId: string;
  readonly hintLevel: number;
  readonly gate: DebugGate;
  readonly timestamp: Date;
}

export interface DebugAttemptCompletedEvent {
  readonly type: 'DEBUG_ATTEMPT_COMPLETED';
  readonly tenantId: TenantId;
  readonly userId: string;
  readonly attemptId: string;
  readonly scenarioId: string;
  readonly score: number;
  readonly hintsUsed: number;
  readonly durationMs: number;
  readonly timestamp: Date;
}

export interface DebugAttemptAbandonedEvent {
  readonly type: 'DEBUG_ATTEMPT_ABANDONED';
  readonly tenantId: TenantId;
  readonly userId: string;
  readonly attemptId: string;
  readonly lastGate: DebugGate;
  readonly reason: string;
  readonly timestamp: Date;
}
