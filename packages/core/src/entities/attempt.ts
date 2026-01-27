import type { PatternId } from './pattern.js';
import type { RungLevel } from './rung.js';
import type { ProblemId } from './problem.js';
import type { TenantId } from './tenant.js';
import type { Step, HintLevel } from './step.js';
import type { Track } from './track.js';
import type { ContentItemId, ContentVersionId } from './content-item.js';

/**
 * Attempt - a user's attempt at solving a problem or content item
 *
 * Unified attempts table supports both:
 * - Legacy problem-based attempts: problemId is set
 * - Track-based content bank attempts: contentItemId and track are set
 *
 * Invariant: exactly one of (problemId) OR (contentItemId) must be set.
 */
export const ATTEMPT_STATES = [
  'THINKING_GATE',
  'CODING',
  'REFLECTION',
  'SUCCESS_REFLECTION', // Optional reflection after passing all tests
  'HINT',
  'COMPLETED',
  'ABANDONED',
] as const;

export type AttemptState = (typeof ATTEMPT_STATES)[number];

// ============ Attempt V2 Types ============

/**
 * V2 Mode - determines scaffolding level
 * BEGINNER: Full scaffolding, structured forms, auto-discovery on low confidence
 * EXPERT: Lighter scaffolding, can skip steps, less hand-holding
 */
export const ATTEMPT_V2_MODES = ['BEGINNER', 'EXPERT'] as const;
export type AttemptV2Mode = (typeof ATTEMPT_V2_MODES)[number];

/**
 * V2 Step - the 5-step attempt flow plus completion
 * null indicates a legacy attempt (v1 flow)
 */
export const ATTEMPT_V2_STEPS = [
  'UNDERSTAND',
  'PLAN',
  'IMPLEMENT',
  'VERIFY',
  'REFLECT',
  'COMPLETE',
] as const;
export type AttemptV2Step = (typeof ATTEMPT_V2_STEPS)[number];

/**
 * AI assessment result for UNDERSTAND step
 */
export interface UnderstandAIAssessment {
  readonly status: 'PASS' | 'NEEDS_WORK';
  readonly strengths: readonly string[];
  readonly gaps: readonly string[];
  readonly followupQuestions: readonly string[];
}

/**
 * Follow-up Q&A during UNDERSTAND step
 */
export interface UnderstandFollowup {
  readonly question: string;
  readonly answer: string;
  readonly timestamp: Date;
}

/**
 * Payload for UNDERSTAND step - Feynman-style explanation
 */
export interface UnderstandPayload {
  readonly explanation: string;
  readonly inputOutputDescription: string;
  readonly constraintsDescription: string;
  readonly exampleWalkthrough: string;
  readonly wrongApproach: string;
  readonly aiAssessment: UnderstandAIAssessment | null;
  readonly followups: readonly UnderstandFollowup[];
}

/**
 * A suggested pattern candidate
 */
export interface SuggestedPattern {
  readonly patternId: string;
  readonly name: string;
  readonly reason: string;
  readonly aiConfidence: number; // 0-1
}

/**
 * Invariant details for PLAN step
 */
export interface PlanInvariant {
  readonly text: string;
  readonly builderUsed: boolean;
  readonly templateId?: string;
  readonly templateChoices?: Record<string, number>;
}

/**
 * Payload for PLAN step - pattern selection and invariant
 */
export interface PlanPayload {
  readonly suggestedPatterns: readonly SuggestedPattern[];
  readonly chosenPattern: string | null;
  readonly userConfidence: number | null; // 1-5
  readonly invariant: PlanInvariant | null;
  readonly complexity: string | null;
  readonly discoveryTriggered: boolean;
}

/**
 * Test result data used in VERIFY step
 */
export interface VerifyTestResult {
  readonly testIndex: number;
  readonly passed: boolean;
  readonly input: string;
  readonly expected: string;
  readonly actual: string;
  readonly isHidden: boolean;
}

/**
 * Failure explanation during VERIFY step
 */
export interface VerifyFailureExplanation {
  readonly testIndex: number;
  readonly userExplanation: string;
  readonly aiGuidance: string;
  readonly timestamp: Date;
}

/**
 * Payload for VERIFY step - test results and debugging
 */
export interface VerifyPayload {
  readonly testResults: readonly VerifyTestResult[];
  readonly failureExplanations: readonly VerifyFailureExplanation[];
  readonly traceNotes: string | null;
}

/**
 * Payload for REFLECT step - generalization
 */
export interface ReflectPayload {
  readonly cuesNextTime: readonly string[];
  readonly invariantSummary: string;
  readonly microLessonId: string | null;
  readonly adversaryChallengeCompleted: boolean;
}

/**
 * Hint budget by rung level
 * Lower rungs get more hints to help learning
 */
export const HINT_BUDGET_BY_RUNG: Record<RungLevel, number> = {
  1: 6,
  2: 5,
  3: 4,
  4: 3,
  5: 2,
};

/**
 * Get hint budget for a given rung level
 */
export function getHintBudgetForRung(rung: RungLevel): number {
  return HINT_BUDGET_BY_RUNG[rung] ?? 3;
}

/**
 * Base attempt fields common to both legacy and track attempts
 */
interface AttemptBase {
  readonly id: string;
  readonly tenantId: TenantId;
  readonly userId: string;
  readonly pattern: PatternId;
  readonly rung: RungLevel;
  readonly state: AttemptState;
  readonly steps: readonly Step[];
  readonly hintsUsed: readonly HintLevel[];
  readonly codeSubmissions: number;
  readonly score: AttemptScore | null;
  readonly startedAt: Date;
  readonly completedAt: Date | null;

  // ============ V2 Fields (nullable for backwards compatibility) ============
  // When v2Step is null, this is a legacy v1 attempt
  readonly mode: AttemptV2Mode;
  readonly v2Step: AttemptV2Step | null;
  readonly understandPayload: UnderstandPayload | null;
  readonly planPayload: PlanPayload | null;
  readonly verifyPayload: VerifyPayload | null;
  readonly reflectPayload: ReflectPayload | null;
  readonly hintBudget: number;
  readonly hintsUsedCount: number;
}

/**
 * Legacy problem-based attempt
 */
export interface LegacyAttempt extends AttemptBase {
  readonly problemId: ProblemId;
  readonly track?: undefined;
  readonly contentItemId?: undefined;
  readonly contentVersionId?: undefined;
}

/**
 * Track-based content bank attempt
 */
export interface TrackAttempt extends AttemptBase {
  readonly problemId?: undefined;
  readonly track: Track;
  readonly contentItemId: ContentItemId;
  readonly contentVersionId: ContentVersionId | null;
}

/**
 * Unified Attempt type - either legacy or track-based
 */
export type Attempt = LegacyAttempt | TrackAttempt;

/**
 * Type guard to check if an attempt is a legacy problem-based attempt
 */
export function isLegacyAttempt(attempt: Attempt): attempt is LegacyAttempt {
  return attempt.problemId !== undefined;
}

/**
 * Type guard to check if an attempt is a track-based attempt
 */
export function isTrackAttempt(attempt: Attempt): attempt is TrackAttempt {
  return attempt.contentItemId !== undefined;
}

export interface AttemptScore {
  readonly overall: number; // 0-100
  readonly patternRecognition: number; // 0-100
  readonly implementation: number; // 0-100
  readonly edgeCases: number; // 0-100
  readonly efficiency: number; // 0-100
  readonly bonus: number; // 0-100 (added points)
}

export type AttemptId = string;

export interface AttemptGates {
  readonly thinkingPassed: boolean;
  readonly reflectionPassed: boolean;
}

export function canSubmitCode(attempt: Attempt): boolean {
  return (
    attempt.state === 'CODING' &&
    hasPassedThinkingGate(attempt)
  );
}

export function hasPassedThinkingGate(attempt: Attempt): boolean {
  return attempt.steps.some(
    (s) => s.type === 'THINKING_GATE' && s.result === 'PASS'
  );
}

export function hasPassedReflection(attempt: Attempt): boolean {
  const reflectionSteps = attempt.steps.filter((s) => s.type === 'REFLECTION');
  if (reflectionSteps.length === 0) return true;
  const lastReflection = reflectionSteps[reflectionSteps.length - 1];
  return lastReflection?.result === 'PASS';
}

export function needsReflection(attempt: Attempt): boolean {
  const codingSteps = attempt.steps.filter((s) => s.type === 'CODING');
  if (codingSteps.length === 0) return false;
  const lastCoding = codingSteps[codingSteps.length - 1];
  return lastCoding?.result === 'FAIL';
}

// ============ V2 Type Guards and Helpers ============

/**
 * Check if an attempt is using the V2 flow
 * V2 attempts have a non-null v2Step field
 */
export function isV2Attempt(attempt: Attempt): boolean {
  return attempt.v2Step !== null;
}

/**
 * Check if a V2 attempt has passed the UNDERSTAND gate
 */
export function hasPassedUnderstand(attempt: Attempt): boolean {
  if (!isV2Attempt(attempt)) return false;
  return (
    attempt.understandPayload?.aiAssessment?.status === 'PASS' ||
    attempt.mode === 'EXPERT' // Expert mode can skip
  );
}

/**
 * Check if a V2 attempt has a pattern chosen
 */
export function hasChosenPattern(attempt: Attempt): boolean {
  if (!isV2Attempt(attempt)) return false;
  return (
    attempt.planPayload?.chosenPattern !== null ||
    attempt.mode === 'EXPERT' // Expert mode can skip
  );
}

/**
 * Check if a V2 attempt has code submitted
 */
export function hasCodeSubmitted(attempt: Attempt): boolean {
  return attempt.codeSubmissions > 0;
}

/**
 * Check if a V2 attempt has test results
 */
export function hasTestResults(attempt: Attempt): boolean {
  if (!isV2Attempt(attempt)) return false;
  return (
    attempt.verifyPayload?.testResults !== undefined &&
    attempt.verifyPayload.testResults.length > 0
  );
}

/**
 * Check if all tests passed in a V2 attempt
 */
export function allTestsPassed(attempt: Attempt): boolean {
  if (!isV2Attempt(attempt)) return false;
  const testResults = attempt.verifyPayload?.testResults;
  if (!testResults || testResults.length === 0) return false;
  return testResults.every((r) => r.passed);
}

/**
 * Check if a V2 attempt can use hints
 */
export function canUseHint(attempt: Attempt): boolean {
  return attempt.hintsUsedCount < attempt.hintBudget;
}

/**
 * Get remaining hints for a V2 attempt
 */
export function getRemainingHints(attempt: Attempt): number {
  return Math.max(0, attempt.hintBudget - attempt.hintsUsedCount);
}
