import type { PatternId } from './pattern.js';
import type { RungLevel } from './rung.js';
import type { ProblemId } from './problem.js';
import type { TenantId } from './tenant.js';
import type { Step, HintLevel } from './step.js';

/**
 * Attempt - a user's attempt at solving a problem
 */
export const ATTEMPT_STATES = [
  'THINKING_GATE',
  'CODING',
  'REFLECTION',
  'HINT',
  'COMPLETED',
  'ABANDONED',
] as const;

export type AttemptState = (typeof ATTEMPT_STATES)[number];

export interface Attempt {
  readonly id: string;
  readonly tenantId: TenantId;
  readonly userId: string;
  readonly problemId: ProblemId;
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
