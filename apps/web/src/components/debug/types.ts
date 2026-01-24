/**
 * Debug Track UI Types
 *
 * These types mirror the core domain types but are tailored for the UI layer.
 * They represent what the frontend receives from the API.
 */

// ============ Debug Gates ============

export const DEBUG_GATES = [
  'SYMPTOM_CLASSIFICATION',
  'DETERMINISM_ANALYSIS',
  'PATTERN_CLASSIFICATION',
  'ROOT_CAUSE_HYPOTHESIS',
  'FIX_STRATEGY',
  'REGRESSION_PREVENTION',
  'REFLECTION',
] as const;

export type DebugGate = (typeof DEBUG_GATES)[number];

// ============ Pattern Categories ============

export const DEBUG_PATTERN_CATEGORIES = [
  'FUNCTIONAL_LOGIC',
  'ALGORITHMIC',
  'PERFORMANCE',
  'RESOURCE',
  'CONCURRENCY',
  'INTEGRATION',
  'DISTRIBUTED',
  'PRODUCTION_REALITY',
] as const;

export type DebugPatternCategory = (typeof DEBUG_PATTERN_CATEGORIES)[number];

// ============ Difficulty ============

export const DIFFICULTY_LEVELS = ['BEGINNER', 'INTERMEDIATE', 'ADVANCED', 'EXPERT'] as const;
export type Difficulty = (typeof DIFFICULTY_LEVELS)[number];

// ============ Attempt Status ============

export const DEBUG_ATTEMPT_STATUSES = ['IN_PROGRESS', 'COMPLETED', 'ABANDONED'] as const;
export type DebugAttemptStatus = (typeof DEBUG_ATTEMPT_STATUSES)[number];

// ============ Code Artifact ============

export interface CodeArtifact {
  readonly id?: string;
  readonly filename: string;
  readonly content: string;
  readonly language: string;
  readonly description?: string;
}

// ============ Scenario (API Response) ============

export interface DebugScenarioSummary {
  readonly id: string;
  readonly category: DebugPatternCategory;
  readonly patternKey: string;
  readonly difficulty: Difficulty;
  readonly symptomDescription: string;
  readonly tags: readonly string[];
}

export interface DebugScenarioDetail extends DebugScenarioSummary {
  readonly codeArtifacts: readonly CodeArtifact[];
  readonly symptomOptions?: readonly SymptomOption[];
}

export interface SymptomOption {
  readonly id: string;
  readonly label: string;
}

// ============ Gate Submission ============

export interface GateSubmission {
  readonly gateId: DebugGate;
  readonly answer: string;
  readonly timestamp: string;
  readonly evaluationResult: EvaluationResult;
}

export interface EvaluationResult {
  readonly isCorrect: boolean;
  readonly confidence: number;
  readonly feedback: string;
  readonly rubricScores?: Record<string, number>;
  readonly nextGate: DebugGate | null;
  readonly allowProceed: boolean;
  readonly retriesRemaining?: number;
}

// ============ Debug Attempt (API Response) ============

export interface DebugAttemptSummary {
  readonly attemptId: string;
  readonly scenarioId: string;
  readonly currentGate: DebugGate;
  readonly hintsUsed: number;
  readonly status: DebugAttemptStatus;
  readonly startedAt: string;
}

export interface DebugAttemptDetail extends DebugAttemptSummary {
  readonly gateHistory: readonly GateSubmission[];
  readonly scenario: DebugScenarioDetail;
  readonly completedAt: string | null;
  readonly scoreJson: DebugScore | null;
}

// ============ Debug Score ============

export interface DebugScore {
  readonly overall: number;
  readonly timeToDiagnosisMs: number;
  readonly fixAccuracy: number;
  readonly hintsPenalty: number;
  readonly edgeCasesConsidered: number;
  readonly explanationQuality: number;
  readonly gateScores: Record<DebugGate, number>;
}

// ============ Hint ============

export interface DebugHint {
  readonly level: number;
  readonly text: string;
}

// ============ Mastery Update ============

export interface MasteryUpdate {
  readonly before: number;
  readonly after: number;
  readonly patternKey: string;
}

// ============ UI Helper Functions ============

export function getGateDisplayName(gate: DebugGate): string {
  const names: Record<DebugGate, string> = {
    SYMPTOM_CLASSIFICATION: 'Symptom Classification',
    DETERMINISM_ANALYSIS: 'Determinism Analysis',
    PATTERN_CLASSIFICATION: 'Pattern Classification',
    ROOT_CAUSE_HYPOTHESIS: 'Root Cause Hypothesis',
    FIX_STRATEGY: 'Fix Strategy',
    REGRESSION_PREVENTION: 'Regression Prevention',
    REFLECTION: 'Reflection',
  };
  return names[gate];
}

export function getGateIndex(gate: DebugGate): number {
  return DEBUG_GATES.indexOf(gate);
}

export function getCategoryDisplayName(category: DebugPatternCategory): string {
  const names: Record<DebugPatternCategory, string> = {
    FUNCTIONAL_LOGIC: 'Functional Logic',
    ALGORITHMIC: 'Algorithmic',
    PERFORMANCE: 'Performance',
    RESOURCE: 'Resource',
    CONCURRENCY: 'Concurrency',
    INTEGRATION: 'Integration',
    DISTRIBUTED: 'Distributed',
    PRODUCTION_REALITY: 'Production Reality',
  };
  return names[category];
}

export function getDifficultyDisplayName(difficulty: Difficulty): string {
  const names: Record<Difficulty, string> = {
    BEGINNER: 'Beginner',
    INTERMEDIATE: 'Intermediate',
    ADVANCED: 'Advanced',
    EXPERT: 'Expert',
  };
  return names[difficulty];
}

export function getDifficultyColor(difficulty: Difficulty): string {
  const colors: Record<Difficulty, string> = {
    BEGINNER: 'var(--success)',
    INTERMEDIATE: 'var(--accent)',
    ADVANCED: 'var(--warning)',
    EXPERT: 'var(--error)',
  };
  return colors[difficulty];
}
