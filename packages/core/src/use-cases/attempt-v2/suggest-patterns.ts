/**
 * Suggest Patterns Use Case
 *
 * Suggests 2-3 candidate algorithmic patterns based on the user's
 * understanding of the problem (not the problem directly).
 *
 * Called by: POST /api/attempts/{id}/plan/suggest
 */

import type { TenantId } from '../../entities/tenant.js';
import type { Problem } from '../../entities/problem.js';
import type { PatternId, PATTERN_DEFINITIONS } from '../../entities/pattern.js';
import type { AttemptV2LLMPort, PatternCandidate } from '../../prompts/index.js';
import {
  PLAN_SUGGEST_PATTERNS,
  callPlanSuggest,
} from '../../prompts/index.js';

// ============ Types ============

export interface SuggestPatternsInput {
  readonly tenantId: TenantId;
  readonly attemptId: string;
  readonly userId: string;
  readonly problem: Problem;
  readonly userExplanation: string;
}

export interface SuggestPatternsOutput {
  readonly candidates: readonly PatternCandidate[];
  readonly recommendedNextAction: string;
  readonly source: 'ai' | 'deterministic';
}

export interface SuggestPatternsDeps {
  readonly llm: AttemptV2LLMPort;
  readonly patternDefinitions: typeof PATTERN_DEFINITIONS;
}

// ============ Errors ============

export class SuggestPatternsError extends Error {
  constructor(
    message: string,
    public readonly code: string
  ) {
    super(message);
    this.name = 'SuggestPatternsError';
  }
}

// ============ Valid Patterns for Problem ============

/**
 * Get related patterns that could reasonably apply to a problem
 * This prevents suggesting completely unrelated patterns
 */
const RELATED_PATTERNS: Readonly<Record<PatternId, readonly PatternId[]>> = {
  SLIDING_WINDOW: ['TWO_POINTERS', 'PREFIX_SUM'],
  TWO_POINTERS: ['SLIDING_WINDOW', 'BINARY_SEARCH'],
  PREFIX_SUM: ['SLIDING_WINDOW', 'DYNAMIC_PROGRAMMING'],
  BINARY_SEARCH: ['TWO_POINTERS', 'GREEDY'],
  BFS: ['DFS', 'DYNAMIC_PROGRAMMING'],
  DFS: ['BFS', 'BACKTRACKING'],
  DYNAMIC_PROGRAMMING: ['GREEDY', 'PREFIX_SUM', 'DFS'],
  BACKTRACKING: ['DFS', 'DYNAMIC_PROGRAMMING'],
  GREEDY: ['DYNAMIC_PROGRAMMING', 'BINARY_SEARCH'],
  HEAP: ['GREEDY', 'TWO_POINTERS'],
  TRIE: ['DFS', 'DYNAMIC_PROGRAMMING'],
  UNION_FIND: ['DFS', 'BFS'],
  INTERVAL_MERGING: ['GREEDY', 'TWO_POINTERS'],
};

/**
 * Get valid patterns to suggest for a problem
 * Includes the correct pattern plus related ones
 */
function getValidPatternsForProblem(problem: Problem): PatternId[] {
  const validPatterns: Set<PatternId> = new Set();

  // Always include the correct pattern
  validPatterns.add(problem.pattern);

  // Add related patterns
  const related = RELATED_PATTERNS[problem.pattern] ?? [];
  for (const p of related) {
    validPatterns.add(p);
  }

  return Array.from(validPatterns);
}

// ============ Use Case ============

export async function suggestPatterns(
  input: SuggestPatternsInput,
  deps: SuggestPatternsDeps
): Promise<SuggestPatternsOutput> {
  const { problem, userExplanation } = input;
  const { llm, patternDefinitions } = deps;

  const validPatterns = getValidPatternsForProblem(problem);
  const validPatternsString = validPatterns.join(', ');

  // Check if explanation is too brief
  if (userExplanation.trim().split(/\s+/).length < 15) {
    return {
      candidates: [],
      recommendedNextAction: 'Please provide a more detailed explanation of your understanding before pattern suggestions can be made.',
      source: 'deterministic',
    };
  }

  // Try AI suggestion
  if (llm.isEnabled()) {
    const result = await callPlanSuggest(llm, PLAN_SUGGEST_PATTERNS, {
      userExplanation,
      problemConstraints: problem.targetComplexity,
      validPatterns: validPatternsString,
    });

    if (result.success && result.data) {
      // Filter candidates to only valid patterns
      const filteredCandidates = result.data.candidates.filter(
        c => validPatterns.includes(c.patternId as PatternId)
      );

      // If AI returned no valid candidates, fall back to deterministic
      if (filteredCandidates.length === 0) {
        return suggestDeterministic(problem, patternDefinitions, validPatterns);
      }

      return {
        candidates: filteredCandidates.slice(0, 3), // Limit to 3
        recommendedNextAction: result.data.recommendedNextAction,
        source: 'ai',
      };
    }
  }

  // Fall back to deterministic suggestion
  return suggestDeterministic(problem, patternDefinitions, validPatterns);
}

// ============ Deterministic Fallback ============

function suggestDeterministic(
  problem: Problem,
  patternDefinitions: typeof PATTERN_DEFINITIONS,
  validPatterns: PatternId[]
): SuggestPatternsOutput {
  // Create candidate entries for valid patterns
  // Give slightly higher confidence to the correct pattern
  // but not obvious enough to reveal it
  const candidates: PatternCandidate[] = validPatterns.slice(0, 3).map((patternId, index) => {
    const definition = patternDefinitions[patternId];
    const isCorrect = patternId === problem.pattern;

    // Spread confidence between 0.6-0.85 based on index
    // Correct pattern gets slight boost but stays within range
    let confidence = 0.75 - index * 0.05;
    if (isCorrect) {
      confidence = Math.min(0.85, confidence + 0.1);
    }

    return {
      patternId,
      name: definition?.name ?? patternId,
      reason: generatePatternReason(patternId),
      confidence: Math.round(confidence * 100) / 100,
    };
  });

  // Sort by confidence descending
  candidates.sort((a, b) => b.confidence - a.confidence);

  return {
    candidates,
    recommendedNextAction: 'Consider which pattern best fits the problem characteristics. Think about the data structures and operations involved.',
    source: 'deterministic',
  };
}

/**
 * Generate generic reasoning for a pattern
 * These are intentionally vague to not reveal the answer
 */
function generatePatternReason(patternId: PatternId): string {
  const reasons: Record<PatternId, string> = {
    SLIDING_WINDOW: 'Could be useful if you need to track a contiguous subset of elements',
    TWO_POINTERS: 'Consider this if the problem involves comparing or moving through elements from different positions',
    PREFIX_SUM: 'Might apply if you need to efficiently compute sums over ranges',
    BINARY_SEARCH: 'Think about this if you can eliminate half the search space at each step',
    BFS: 'Consider if you need to explore neighbors level by level or find shortest paths',
    DFS: 'Useful when you need to explore all paths deeply or check connectivity',
    DYNAMIC_PROGRAMMING: 'Might apply if the problem has overlapping subproblems',
    BACKTRACKING: 'Consider if you need to explore choices and undo them when they fail',
    GREEDY: 'Think about whether making the locally best choice leads to the global optimum',
    HEAP: 'Useful when you need to efficiently track minimum or maximum elements',
    TRIE: 'Consider if the problem involves prefix matching or string lookups',
    UNION_FIND: 'Might help if you need to track connected groups efficiently',
    INTERVAL_MERGING: 'Consider if you are working with ranges that might overlap',
  };

  return reasons[patternId] ?? 'This pattern might be applicable based on problem characteristics';
}
