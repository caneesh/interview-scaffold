import type { Attempt, AttemptState } from '../entities/attempt.js';
import type { HintLevel, HINT_LEVELS } from '../entities/step.js';
import { hasPassedThinkingGate, hasPassedReflection, needsReflection } from '../entities/attempt.js';

/**
 * DecideNextAction - pure function to determine what action user can take
 * No side effects, no dependencies
 */

export type NextAction =
  | { type: 'SUBMIT_THINKING_GATE' }
  | { type: 'WRITE_CODE' }
  | { type: 'SUBMIT_CODE' }
  | { type: 'SUBMIT_REFLECTION' }
  | { type: 'REQUEST_HINT'; availableLevel: HintLevel }
  | { type: 'VIEW_RESULTS' }
  | { type: 'START_NEW_ATTEMPT' };

export interface DecideNextActionInput {
  readonly attempt: Attempt;
}

export interface DecideNextActionOutput {
  readonly action: NextAction;
  readonly canRequestHint: boolean;
  readonly nextHintLevel: HintLevel | null;
}

const HINT_LEVEL_ORDER: readonly HintLevel[] = [
  'DIRECTIONAL_QUESTION',
  'HEURISTIC_HINT',
  'CONCEPT_INJECTION',
  'MICRO_EXAMPLE',
  'PATCH_SNIPPET',
];

export function decideNextAction(
  input: DecideNextActionInput
): DecideNextActionOutput {
  const { attempt } = input;

  // Determine next available hint level
  const usedHintLevels = new Set(attempt.hintsUsed);
  const nextHintLevel =
    HINT_LEVEL_ORDER.find((level) => !usedHintLevels.has(level)) ?? null;
  const canRequestHint =
    nextHintLevel !== null &&
    hasPassedThinkingGate(attempt) &&
    (attempt.state === 'CODING' || attempt.state === 'HINT');

  switch (attempt.state) {
    case 'THINKING_GATE':
      return {
        action: { type: 'SUBMIT_THINKING_GATE' },
        canRequestHint: false,
        nextHintLevel: null,
      };

    case 'CODING':
      return {
        action: { type: 'SUBMIT_CODE' },
        canRequestHint,
        nextHintLevel,
      };

    case 'REFLECTION':
      return {
        action: { type: 'SUBMIT_REFLECTION' },
        canRequestHint: false,
        nextHintLevel: null,
      };

    case 'HINT':
      return {
        action: nextHintLevel
          ? { type: 'REQUEST_HINT', availableLevel: nextHintLevel }
          : { type: 'WRITE_CODE' },
        canRequestHint,
        nextHintLevel,
      };

    case 'COMPLETED':
      return {
        action: { type: 'VIEW_RESULTS' },
        canRequestHint: false,
        nextHintLevel: null,
      };

    case 'ABANDONED':
      return {
        action: { type: 'START_NEW_ATTEMPT' },
        canRequestHint: false,
        nextHintLevel: null,
      };

    default:
      return {
        action: { type: 'WRITE_CODE' },
        canRequestHint: false,
        nextHintLevel: null,
      };
  }
}
