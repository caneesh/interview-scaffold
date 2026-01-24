/**
 * Debug Track - Domain Entities
 * Pure TypeScript - immutable readonly structures
 */

import type { TenantId } from '../entities/tenant.js';
import type {
  DebugPatternCategory,
  DebugDifficulty,
  DebugAttemptStatus,
  DebugGate,
  RubricCriterion,
} from './types.js';

// ============ Code Artifact ============

/**
 * CodeArtifact - a piece of code that contains or demonstrates the bug
 */
export interface CodeArtifact {
  readonly id?: string;
  readonly filename: string;
  readonly language: string;
  /** The code content - use 'code' preferably */
  readonly code?: string;
  /** Alias for 'code' - for backward compatibility with seed data */
  readonly content?: string;
  /** Line numbers where the bug is located (hidden from user initially) */
  readonly bugLines?: readonly number[];
  /** Legacy alias for bugLines */
  readonly bugLineNumbers?: readonly number[];
  /** Whether this file contains the bug */
  readonly isBuggy?: boolean;
  /** Optional context about what this file does */
  readonly description?: string;
}

// ============ Debug Scenario ============

/**
 * DebugScenario - a debugging problem definition
 * Immutable, read-only structure representing a debug challenge.
 */
export interface DebugScenario {
  readonly id: string;
  /** The category of bug (FUNCTIONAL_LOGIC, CONCURRENCY, etc.) */
  readonly category: DebugPatternCategory;
  /** Specific pattern key within the category (e.g., "off-by-one", "race-condition") */
  readonly patternKey: string;
  /** Difficulty level */
  readonly difficulty: DebugDifficulty;
  /** User-facing description of the observed symptoms */
  readonly symptomDescription: string;
  /** The buggy code artifacts to analyze */
  readonly codeArtifacts: readonly CodeArtifact[];
  /** Expected findings the user should identify */
  readonly expectedFindings: readonly string[];
  /** Acceptable fix strategies for this scenario */
  readonly fixStrategies: readonly string[];
  /** What regression prevention should mention */
  readonly regressionExpectation: string;
  /** Progressive hints from vague to specific */
  readonly hintLadder: readonly string[];
  /** Searchable tags for filtering */
  readonly tags: readonly string[];
  /** Optional: expected determinism classification */
  readonly expectedDeterminism?: string;
  /** Optional: MCQ options for symptom classification gate */
  readonly symptomOptions?: readonly SymptomOption[];
  /** Created timestamp */
  readonly createdAt: Date;
}

/**
 * SymptomOption - MCQ option for symptom classification
 */
export interface SymptomOption {
  readonly id: string;
  readonly label: string;
  readonly isCorrect: boolean;
}

// ============ Gate Submission ============

/**
 * GateSubmission - a user's answer to a specific gate
 */
export interface GateSubmission {
  readonly gateId: DebugGate;
  readonly answer: string;
  readonly timestamp: Date;
  readonly evaluationResult: EvaluationResult;
}

// ============ Evaluation Result ============

/**
 * EvaluationResult - the outcome of evaluating a gate submission
 */
export interface EvaluationResult {
  /** Did the answer pass the gate requirements? */
  readonly isCorrect: boolean;
  /** Confidence score (0-1) if using fuzzy matching or LLM */
  readonly confidence: number;
  /** Feedback message to show the user */
  readonly feedback: string;
  /** Detailed rubric scores by criterion */
  readonly rubricScores: Readonly<Record<RubricCriterion, number>>;
  /** The next gate to proceed to (null if failed or at final gate) */
  readonly nextGate: DebugGate | null;
  /** Whether the user is allowed to proceed (may differ from isCorrect for partial credit) */
  readonly allowProceed: boolean;
  /** Number of retries remaining for this gate */
  readonly retriesRemaining?: number;
  /** Optional: keywords that matched during heuristic evaluation */
  readonly matchedKeywords?: readonly string[];
}

// ============ Gate Timer ============

/**
 * GateTimer - timing information for a specific gate
 */
export interface GateTimer {
  readonly gateId: DebugGate;
  readonly startedAt: Date;
  readonly completedAt: Date | null;
  readonly pausedDurationMs: number;
}

// ============ Debug Attempt ============

/**
 * DebugAttempt - a user's attempt at solving a debug scenario
 * Immutable, read-only structure tracking progress through gates.
 */
export interface DebugAttempt {
  readonly attemptId: string;
  readonly tenantId: TenantId;
  readonly userId: string;
  readonly scenarioId: string;
  /** Current gate the user is on */
  readonly currentGate: DebugGate;
  /** History of all gate submissions (may have multiple per gate if retries) */
  readonly gateHistory: readonly GateSubmission[];
  /** Number of hints requested */
  readonly hintsUsed: number;
  /** Timing information per gate */
  readonly timers: readonly GateTimer[];
  /** Current status of the attempt */
  readonly status: DebugAttemptStatus;
  /** When the attempt was started */
  readonly startedAt: Date;
  /** When the attempt was completed (null if in progress) */
  readonly completedAt: Date | null;
  /** Final score breakdown (null until finalized) */
  readonly scoreJson: DebugScore | null;
  /** Number of retries used per gate */
  readonly retriesPerGate: Readonly<Record<DebugGate, number>>;
}

// ============ Debug Score ============

/**
 * DebugScore - the scoring breakdown for a completed attempt
 */
export interface DebugScore {
  /** Overall score (0-100) */
  readonly overall: number;
  /** Time from start to PATTERN_CLASSIFICATION pass (ms) */
  readonly timeToDiagnosisMs: number;
  /** Percentage of gates passed without retries (0-100) */
  readonly fixAccuracy: number;
  /** Penalty for hints used (0-100, higher = more penalty) */
  readonly hintsPenalty: number;
  /** Score for edge cases mentioned in REGRESSION gate (0-100) */
  readonly edgeCasesConsidered: number;
  /** Score for hypothesis/reflection quality (0-100) */
  readonly explanationQuality: number;
  /** Category-based weight applied */
  readonly categoryWeight: number;
  /** Individual gate scores */
  readonly gateScores: Readonly<Record<DebugGate, number>>;
}

// ============ Policy Configuration ============

/**
 * DebugPolicyConfig - configurable policy toggles
 */
export interface DebugPolicyConfig {
  /** Allow hints during simulation mode (stricter for interviews) */
  readonly allowHintsInSimulation: boolean;
  /** Only reveal solution if all retries exhausted */
  readonly revealSolutionOnlyIfExhausted: boolean;
  /** Maximum hints allowed per attempt */
  readonly maxHintsPerAttempt: number;
  /** Time limit per gate in milliseconds (0 = unlimited) */
  readonly gatTimeLimitMs: number;
  /** Overall attempt time limit in milliseconds (0 = unlimited) */
  readonly attemptTimeLimitMs: number;
}

/**
 * Default policy configuration for practice mode
 */
export const DEFAULT_DEBUG_POLICY: DebugPolicyConfig = {
  allowHintsInSimulation: true,
  revealSolutionOnlyIfExhausted: true,
  maxHintsPerAttempt: 5,
  gatTimeLimitMs: 0,
  attemptTimeLimitMs: 0,
};

// ============ Helper Types ============

export type DebugAttemptId = string;
export type DebugScenarioId = string;

// ============ Factory Functions ============

/**
 * Creates a new DebugAttempt with initial state
 */
export function createDebugAttempt(params: {
  attemptId: string;
  tenantId: TenantId;
  userId: string;
  scenarioId: string;
  startedAt: Date;
}): DebugAttempt {
  return {
    attemptId: params.attemptId,
    tenantId: params.tenantId,
    userId: params.userId,
    scenarioId: params.scenarioId,
    currentGate: 'SYMPTOM_CLASSIFICATION',
    gateHistory: [],
    hintsUsed: 0,
    timers: [
      {
        gateId: 'SYMPTOM_CLASSIFICATION',
        startedAt: params.startedAt,
        completedAt: null,
        pausedDurationMs: 0,
      },
    ],
    status: 'IN_PROGRESS',
    startedAt: params.startedAt,
    completedAt: null,
    scoreJson: null,
    retriesPerGate: {
      SYMPTOM_CLASSIFICATION: 0,
      DETERMINISM_ANALYSIS: 0,
      PATTERN_CLASSIFICATION: 0,
      ROOT_CAUSE_HYPOTHESIS: 0,
      FIX_STRATEGY: 0,
      REGRESSION_PREVENTION: 0,
      REFLECTION: 0,
    },
  };
}

// ============ Query Helpers ============

/**
 * Get the current gate's submission history
 */
export function getCurrentGateSubmissions(attempt: DebugAttempt): readonly GateSubmission[] {
  return attempt.gateHistory.filter((s) => s.gateId === attempt.currentGate);
}

/**
 * Check if a specific gate has been passed
 */
export function hasPassedGate(attempt: DebugAttempt, gate: DebugGate): boolean {
  return attempt.gateHistory.some(
    (s) => s.gateId === gate && s.evaluationResult.isCorrect
  );
}

/**
 * Get the last submission for the current gate
 */
export function getLastSubmission(attempt: DebugAttempt): GateSubmission | null {
  const submissions = attempt.gateHistory.filter((s) => s.gateId === attempt.currentGate);
  return submissions.length > 0 ? submissions[submissions.length - 1]! : null;
}

/**
 * Count total submissions across all gates
 */
export function getTotalSubmissions(attempt: DebugAttempt): number {
  return attempt.gateHistory.length;
}

/**
 * Get elapsed time for the current gate in milliseconds
 */
export function getCurrentGateElapsedMs(attempt: DebugAttempt, now: Date): number {
  const timer = attempt.timers.find((t) => t.gateId === attempt.currentGate);
  if (!timer) return 0;

  const endTime = timer.completedAt ?? now;
  return endTime.getTime() - timer.startedAt.getTime() - timer.pausedDurationMs;
}
