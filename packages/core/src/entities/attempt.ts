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
