/**
 * Validate Pattern Choice Use Case
 *
 * Validates whether the user's chosen pattern makes sense for the problem.
 * Returns GOOD/MAYBE/MISMATCH without revealing the correct answer.
 *
 * Called by: POST /api/attempts/{id}/plan/choose
 */

import type { TenantId } from '../../entities/tenant.js';
import type { Problem } from '../../entities/problem.js';
import type { PatternId } from '../../entities/pattern.js';
import type { AttemptV2LLMPort } from '../../prompts/index.js';
import {
  PLAN_VALIDATE_CHOICE,
  callPlanValidate,
} from '../../prompts/index.js';

// ============ Types ============

export interface ValidatePatternChoiceInput {
  readonly tenantId: TenantId;
  readonly attemptId: string;
  readonly userId: string;
  readonly problem: Problem;
  readonly userExplanation: string;
  readonly chosenPattern: PatternId;
  readonly userConfidence: number; // 1-5
  readonly userReasoning: string;
  readonly mode: 'BEGINNER' | 'EXPERT';
}

export interface ValidatePatternChoiceOutput {
  readonly accepted: boolean;
  readonly match: 'GOOD' | 'MAYBE' | 'MISMATCH';
  readonly rationale: string;
  readonly discoveryRecommended: boolean;
  readonly invariantFeedback?: string;
  readonly source: 'ai' | 'deterministic';
}

export interface ValidatePatternChoiceDeps {
  readonly llm: AttemptV2LLMPort;
}

// ============ Errors ============

export class ValidatePatternChoiceError extends Error {
  constructor(
    message: string,
    public readonly code: string
  ) {
    super(message);
    this.name = 'ValidatePatternChoiceError';
  }
}

// ============ Related Patterns ============

/**
 * Patterns that are "close enough" to the correct one
 * These get MAYBE instead of MISMATCH
 */
const CLOSE_PATTERNS: Readonly<Record<PatternId, readonly PatternId[]>> = {
  SLIDING_WINDOW: ['TWO_POINTERS'],
  TWO_POINTERS: ['SLIDING_WINDOW', 'BINARY_SEARCH'],
  PREFIX_SUM: ['DYNAMIC_PROGRAMMING'],
  BINARY_SEARCH: ['TWO_POINTERS'],
  BFS: ['DFS'],
  DFS: ['BFS', 'BACKTRACKING'],
  DYNAMIC_PROGRAMMING: ['GREEDY', 'PREFIX_SUM'],
  BACKTRACKING: ['DFS'],
  GREEDY: ['DYNAMIC_PROGRAMMING'],
  HEAP: ['GREEDY'],
  TRIE: ['DFS'],
  UNION_FIND: ['DFS', 'BFS'],
  INTERVAL_MERGING: ['GREEDY', 'TWO_POINTERS'],
};

// ============ Use Case ============

export async function validatePatternChoice(
  input: ValidatePatternChoiceInput,
  deps: ValidatePatternChoiceDeps
): Promise<ValidatePatternChoiceOutput> {
  const {
    problem,
    userExplanation,
    chosenPattern,
    userConfidence,
    userReasoning,
    mode,
  } = input;
  const { llm } = deps;

  const correctPattern = problem.pattern;
  const isExactMatch = chosenPattern === correctPattern;
  const closePatterns = CLOSE_PATTERNS[correctPattern] ?? [];
  const isCloseMatch = closePatterns.includes(chosenPattern);

  // Try AI validation
  if (llm.isEnabled()) {
    const result = await callPlanValidate(llm, PLAN_VALIDATE_CHOICE, {
      problemStatement: problem.statement,
      userExplanation,
      chosenPattern,
      userConfidence: String(userConfidence),
      userReasoning,
      correctPattern, // For validation only, not revealed
    });

    if (result.success && result.data) {
      // Determine if accepted based on match and mode
      const accepted = determineAccepted(
        result.data.match,
        result.data.discoveryRecommended,
        mode
      );

      return {
        accepted,
        match: result.data.match,
        rationale: result.data.rationale,
        discoveryRecommended: result.data.discoveryRecommended,
        invariantFeedback: result.data.invariantFeedback,
        source: 'ai',
      };
    }
  }

  // Fall back to deterministic validation
  return validateDeterministic(
    isExactMatch,
    isCloseMatch,
    userConfidence,
    userReasoning,
    mode
  );
}

// ============ Helper Functions ============

/**
 * Determine if the choice should be accepted based on match and mode
 */
function determineAccepted(
  match: 'GOOD' | 'MAYBE' | 'MISMATCH',
  discoveryRecommended: boolean,
  mode: 'BEGINNER' | 'EXPERT'
): boolean {
  // GOOD match is always accepted
  if (match === 'GOOD') return true;

  // MISMATCH is only accepted for EXPERT mode (they can proceed at their own risk)
  if (match === 'MISMATCH') {
    if (mode === 'EXPERT') return true;
    return false; // Beginner must do discovery
  }

  // MAYBE: accept for EXPERT, or for BEGINNER if discovery not recommended
  if (match === 'MAYBE') {
    if (mode === 'EXPERT') return true;
    return !discoveryRecommended;
  }

  return false;
}

// ============ Deterministic Fallback ============

function validateDeterministic(
  isExactMatch: boolean,
  isCloseMatch: boolean,
  userConfidence: number,
  userReasoning: string,
  mode: 'BEGINNER' | 'EXPERT'
): ValidatePatternChoiceOutput {
  // Exact match
  if (isExactMatch) {
    const hasGoodReasoning = userReasoning.trim().length >= 30;

    return {
      accepted: true,
      match: 'GOOD',
      rationale: hasGoodReasoning
        ? 'Your pattern choice aligns well with the problem characteristics, and your reasoning is sound.'
        : 'Your pattern choice seems appropriate. Consider expanding on why this pattern fits.',
      discoveryRecommended: false,
      invariantFeedback: hasGoodReasoning
        ? undefined
        : 'Think about what invariant this pattern maintains throughout the algorithm.',
      source: 'deterministic',
    };
  }

  // Close match
  if (isCloseMatch) {
    const lowConfidence = userConfidence <= 2;
    const discoveryRecommended = mode === 'BEGINNER' && lowConfidence;

    return {
      accepted: determineAccepted('MAYBE', discoveryRecommended, mode),
      match: 'MAYBE',
      rationale: 'This pattern could work, but there might be a more natural fit. Consider the core operation needed.',
      discoveryRecommended,
      invariantFeedback: 'Think carefully about what property needs to be maintained as you process elements.',
      source: 'deterministic',
    };
  }

  // Mismatch
  const discoveryRecommended = mode === 'BEGINNER';

  return {
    accepted: determineAccepted('MISMATCH', discoveryRecommended, mode),
    match: 'MISMATCH',
    rationale: 'This pattern might not be the best fit for this problem. Consider exploring through Pattern Discovery to find a better approach.',
    discoveryRecommended,
    invariantFeedback: 'Before proceeding, review the problem constraints and think about what data structure would most naturally support the required operations.',
    source: 'deterministic',
  };
}
