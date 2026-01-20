/**
 * Reflection and Reinforcement Module
 *
 * Post-solution learning:
 * - Ask: What was key insight? What almost misled you? How to recognize faster?
 * - Summarize pattern trigger signals
 * - Suggest 2 follow-up problems without explanations
 */

import type { Problem } from '../entities/problem.js';
import type { PatternId } from '../entities/pattern.js';
import { PATTERN_DEFINITIONS } from '../entities/pattern.js';
import type {
  CoachingReflectionData,
  PatternTrigger,
  FollowUpProblem,
  CoachingSession,
  CoachResponse,
} from './types.js';

// ============ Constants ============

/**
 * Maximum follow-up problems to suggest
 */
export const MAX_FOLLOWUP_PROBLEMS = 2;

/**
 * Minimum key insight length
 */
export const MIN_INSIGHT_LENGTH = 20;

// ============ Reflection Questions ============

/**
 * Core reflection questions
 */
export const REFLECTION_QUESTIONS: readonly string[] = [
  'What was the key insight that unlocked the solution?',
  'What almost misled you or where did you get stuck?',
  'How would you recognize this pattern faster next time?',
];

/**
 * Pattern-specific reflection prompts
 */
const PATTERN_REFLECTION_PROMPTS: Readonly<Record<PatternId, readonly string[]>> = {
  SLIDING_WINDOW: [
    'What signal told you a sliding window would work here?',
    'How did you decide when to shrink vs expand the window?',
    'What would you look for to identify similar problems?',
  ],
  TWO_POINTERS: [
    'What made two pointers the right choice over other approaches?',
    'How did the sorted property guide your pointer movement?',
    'What problem characteristics suggest two pointers?',
  ],
  PREFIX_SUM: [
    'What repeated computation did prefix sum eliminate?',
    'How did you map the problem to range queries?',
    'What keywords hint at prefix sum solutions?',
  ],
  BINARY_SEARCH: [
    'What was the monotonic property you exploited?',
    'How did you handle the boundary conditions?',
    'What makes a problem binary-searchable?',
  ],
  BFS: [
    'Why was BFS better than DFS for this problem?',
    'How did level-by-level exploration help?',
    'What signals suggest BFS over DFS?',
  ],
  DFS: [
    'What made depth-first exploration natural here?',
    'How did you handle the backtracking?',
    'When would you choose DFS vs BFS?',
  ],
  DYNAMIC_PROGRAMMING: [
    'What was the recurrence relation?',
    'How did you identify overlapping subproblems?',
    'What tells you a problem needs DP?',
  ],
  BACKTRACKING: [
    'What choices did you make at each step?',
    'How did you prune invalid branches early?',
    'What signals "generate all possibilities"?',
  ],
  GREEDY: [
    'Why was the greedy choice safe here?',
    'How did you convince yourself greedy works?',
    'What distinguishes greedy from DP problems?',
  ],
  HEAP: [
    'Why did you need repeated access to min/max?',
    'How did the heap help with complexity?',
    'What problem keywords suggest heap usage?',
  ],
  TRIE: [
    'How did prefix sharing help solve the problem?',
    'What operations benefited from the trie structure?',
    'What string problems suit tries?',
  ],
  UNION_FIND: [
    'What made union-find better than BFS/DFS here?',
    'How did path compression help?',
    'What connectivity problems suit union-find?',
  ],
  INTERVAL_MERGING: [
    'Why did sorting intervals simplify the problem?',
    'How did you handle edge cases in merging?',
    'What interval problems use this technique?',
  ],
};

// ============ Pattern Trigger Signals ============

/**
 * Common trigger signals for each pattern
 */
export const PATTERN_TRIGGERS: Readonly<Record<PatternId, readonly PatternTrigger[]>> = {
  SLIDING_WINDOW: [
    { signal: 'Contiguous subarray/substring with constraint', patternId: 'SLIDING_WINDOW', confidence: 0.9 },
    { signal: 'Find longest/shortest subarray satisfying X', patternId: 'SLIDING_WINDOW', confidence: 0.85 },
    { signal: 'K distinct elements in a window', patternId: 'SLIDING_WINDOW', confidence: 0.8 },
    { signal: 'Maximum/minimum sum of size k', patternId: 'SLIDING_WINDOW', confidence: 0.9 },
  ],
  TWO_POINTERS: [
    { signal: 'Sorted array + find pair with property', patternId: 'TWO_POINTERS', confidence: 0.9 },
    { signal: 'Converge from both ends', patternId: 'TWO_POINTERS', confidence: 0.85 },
    { signal: 'Remove duplicates in-place', patternId: 'TWO_POINTERS', confidence: 0.8 },
    { signal: 'Partition array by condition', patternId: 'TWO_POINTERS', confidence: 0.75 },
  ],
  PREFIX_SUM: [
    { signal: 'Multiple range sum queries', patternId: 'PREFIX_SUM', confidence: 0.95 },
    { signal: 'Subarray sum equals target', patternId: 'PREFIX_SUM', confidence: 0.85 },
    { signal: 'Count subarrays with property', patternId: 'PREFIX_SUM', confidence: 0.8 },
  ],
  BINARY_SEARCH: [
    { signal: 'Sorted array + find element', patternId: 'BINARY_SEARCH', confidence: 0.95 },
    { signal: 'Find boundary/threshold in monotonic space', patternId: 'BINARY_SEARCH', confidence: 0.9 },
    { signal: 'Minimize maximum or maximize minimum', patternId: 'BINARY_SEARCH', confidence: 0.85 },
  ],
  BFS: [
    { signal: 'Shortest path in unweighted graph/grid', patternId: 'BFS', confidence: 0.95 },
    { signal: 'Minimum steps/moves to reach target', patternId: 'BFS', confidence: 0.9 },
    { signal: 'Level-order traversal', patternId: 'BFS', confidence: 0.85 },
  ],
  DFS: [
    { signal: 'Explore all paths/find any path', patternId: 'DFS', confidence: 0.85 },
    { signal: 'Tree/graph traversal', patternId: 'DFS', confidence: 0.8 },
    { signal: 'Connected components', patternId: 'DFS', confidence: 0.8 },
  ],
  DYNAMIC_PROGRAMMING: [
    { signal: 'Optimal substructure + overlapping subproblems', patternId: 'DYNAMIC_PROGRAMMING', confidence: 0.95 },
    { signal: 'Count ways to do X', patternId: 'DYNAMIC_PROGRAMMING', confidence: 0.85 },
    { signal: 'Minimum/maximum cost to reach goal', patternId: 'DYNAMIC_PROGRAMMING', confidence: 0.9 },
  ],
  BACKTRACKING: [
    { signal: 'Generate all combinations/permutations', patternId: 'BACKTRACKING', confidence: 0.95 },
    { signal: 'Find all valid solutions', patternId: 'BACKTRACKING', confidence: 0.9 },
    { signal: 'Constraint satisfaction (e.g., Sudoku)', patternId: 'BACKTRACKING', confidence: 0.85 },
  ],
  GREEDY: [
    { signal: 'Local choice leads to global optimal', patternId: 'GREEDY', confidence: 0.8 },
    { signal: 'Activity selection/scheduling', patternId: 'GREEDY', confidence: 0.9 },
    { signal: 'Coin change with canonical coins', patternId: 'GREEDY', confidence: 0.75 },
  ],
  HEAP: [
    { signal: 'K-th largest/smallest element', patternId: 'HEAP', confidence: 0.95 },
    { signal: 'Merge K sorted lists', patternId: 'HEAP', confidence: 0.9 },
    { signal: 'Continuous median/stream statistics', patternId: 'HEAP', confidence: 0.85 },
  ],
  TRIE: [
    { signal: 'Prefix matching/autocomplete', patternId: 'TRIE', confidence: 0.95 },
    { signal: 'Word dictionary operations', patternId: 'TRIE', confidence: 0.85 },
    { signal: 'Word search in grid with dictionary', patternId: 'TRIE', confidence: 0.8 },
  ],
  UNION_FIND: [
    { signal: 'Dynamic connectivity queries', patternId: 'UNION_FIND', confidence: 0.9 },
    { signal: 'Count connected components with edge additions', patternId: 'UNION_FIND', confidence: 0.85 },
    { signal: 'Equivalence relations', patternId: 'UNION_FIND', confidence: 0.8 },
  ],
  INTERVAL_MERGING: [
    { signal: 'Merge overlapping intervals', patternId: 'INTERVAL_MERGING', confidence: 0.95 },
    { signal: 'Insert interval into sorted list', patternId: 'INTERVAL_MERGING', confidence: 0.85 },
    { signal: 'Find non-overlapping interval set', patternId: 'INTERVAL_MERGING', confidence: 0.8 },
  ],
};

// ============ Follow-up Problem Suggestions ============

/**
 * Follow-up problems by pattern (problem IDs or titles)
 * These would be populated from the problem database
 */
const FOLLOWUP_PROBLEMS: Readonly<Record<PatternId, readonly { id: string; title: string }[]>> = {
  SLIDING_WINDOW: [
    { id: 'minimum-window-substring', title: 'Minimum Window Substring' },
    { id: 'longest-substring-without-repeating', title: 'Longest Substring Without Repeating Characters' },
    { id: 'maximum-sum-subarray-size-k', title: 'Maximum Sum Subarray of Size K' },
  ],
  TWO_POINTERS: [
    { id: 'container-with-most-water', title: 'Container With Most Water' },
    { id: 'three-sum', title: '3Sum' },
    { id: 'trapping-rain-water', title: 'Trapping Rain Water' },
  ],
  PREFIX_SUM: [
    { id: 'subarray-sum-equals-k', title: 'Subarray Sum Equals K' },
    { id: 'range-sum-query-2d', title: 'Range Sum Query 2D' },
    { id: 'product-of-array-except-self', title: 'Product of Array Except Self' },
  ],
  BINARY_SEARCH: [
    { id: 'find-minimum-in-rotated-sorted-array', title: 'Find Minimum in Rotated Sorted Array' },
    { id: 'search-in-rotated-sorted-array', title: 'Search in Rotated Sorted Array' },
    { id: 'koko-eating-bananas', title: 'Koko Eating Bananas' },
  ],
  BFS: [
    { id: 'word-ladder', title: 'Word Ladder' },
    { id: 'rotting-oranges', title: 'Rotting Oranges' },
    { id: 'open-the-lock', title: 'Open the Lock' },
  ],
  DFS: [
    { id: 'number-of-islands', title: 'Number of Islands' },
    { id: 'clone-graph', title: 'Clone Graph' },
    { id: 'pacific-atlantic-water-flow', title: 'Pacific Atlantic Water Flow' },
  ],
  DYNAMIC_PROGRAMMING: [
    { id: 'longest-increasing-subsequence', title: 'Longest Increasing Subsequence' },
    { id: 'coin-change', title: 'Coin Change' },
    { id: 'edit-distance', title: 'Edit Distance' },
  ],
  BACKTRACKING: [
    { id: 'permutations', title: 'Permutations' },
    { id: 'combination-sum', title: 'Combination Sum' },
    { id: 'n-queens', title: 'N-Queens' },
  ],
  GREEDY: [
    { id: 'jump-game', title: 'Jump Game' },
    { id: 'task-scheduler', title: 'Task Scheduler' },
    { id: 'gas-station', title: 'Gas Station' },
  ],
  HEAP: [
    { id: 'find-median-from-data-stream', title: 'Find Median from Data Stream' },
    { id: 'merge-k-sorted-lists', title: 'Merge K Sorted Lists' },
    { id: 'top-k-frequent-elements', title: 'Top K Frequent Elements' },
  ],
  TRIE: [
    { id: 'implement-trie', title: 'Implement Trie' },
    { id: 'word-search-ii', title: 'Word Search II' },
    { id: 'design-add-and-search-words', title: 'Design Add and Search Words' },
  ],
  UNION_FIND: [
    { id: 'redundant-connection', title: 'Redundant Connection' },
    { id: 'accounts-merge', title: 'Accounts Merge' },
    { id: 'number-of-provinces', title: 'Number of Provinces' },
  ],
  INTERVAL_MERGING: [
    { id: 'merge-intervals', title: 'Merge Intervals' },
    { id: 'insert-interval', title: 'Insert Interval' },
    { id: 'meeting-rooms-ii', title: 'Meeting Rooms II' },
  ],
};

// ============ Reflection Processing ============

export interface ReflectionInput {
  readonly keyInsight: string;
  readonly misleadingFactors: readonly string[];
  readonly recognitionTips: string;
}

/**
 * Validate reflection input
 */
export function validateReflection(input: ReflectionInput): {
  isValid: boolean;
  errors: readonly string[];
} {
  const errors: string[] = [];

  if (input.keyInsight.trim().length < MIN_INSIGHT_LENGTH) {
    errors.push(`Key insight should be at least ${MIN_INSIGHT_LENGTH} characters.`);
  }

  if (input.recognitionTips.trim().length < MIN_INSIGHT_LENGTH) {
    errors.push(`Recognition tips should be at least ${MIN_INSIGHT_LENGTH} characters.`);
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Process reflection submission
 */
export function processReflection(
  input: ReflectionInput,
  problem: Problem,
  _session: CoachingSession
): CoachingReflectionData {
  const pattern = problem.pattern;

  // Get pattern triggers
  const patternTriggers = PATTERN_TRIGGERS[pattern] ?? [];

  // Get follow-up problems
  const allFollowUps = FOLLOWUP_PROBLEMS[pattern] ?? [];
  const suggestedFollowUps: FollowUpProblem[] = allFollowUps
    .filter(p => p.id !== problem.id)
    .slice(0, MAX_FOLLOWUP_PROBLEMS)
    .map(p => ({
      problemId: p.id,
      title: p.title,
      reason: null, // No explanations per spec
    }));

  return {
    keyInsight: input.keyInsight,
    misleadingFactors: input.misleadingFactors,
    recognitionTips: input.recognitionTips,
    patternTriggers,
    suggestedFollowUps,
    isComplete: true,
  };
}

// ============ Reflection Summary Generation ============

/**
 * Generate a reflection summary
 */
export function generateReflectionSummary(
  data: CoachingReflectionData,
  problem: Problem
): string {
  const patternName = PATTERN_DEFINITIONS[problem.pattern]?.name ?? problem.pattern;

  const parts: string[] = [
    `**Pattern: ${patternName}**`,
    '',
    `**Key Insight:** ${data.keyInsight}`,
    '',
    `**Recognition Tips:** ${data.recognitionTips}`,
  ];

  if (data.misleadingFactors.length > 0) {
    parts.push('');
    parts.push('**Watch Out For:**');
    for (const factor of data.misleadingFactors) {
      parts.push(`- ${factor}`);
    }
  }

  if (data.patternTriggers.length > 0) {
    parts.push('');
    parts.push('**Pattern Trigger Signals:**');
    for (const trigger of data.patternTriggers.slice(0, 3)) {
      parts.push(`- ${trigger.signal}`);
    }
  }

  if (data.suggestedFollowUps.length > 0) {
    parts.push('');
    parts.push('**Follow-up Problems:**');
    for (const followUp of data.suggestedFollowUps) {
      parts.push(`- ${followUp.title}`);
    }
  }

  return parts.join('\n');
}

// ============ Coach Response Generation ============

/**
 * Generate reflection prompt questions
 */
export function generateReflectionPrompt(problem: Problem): readonly string[] {
  const pattern = problem.pattern;
  const patternPrompts = PATTERN_REFLECTION_PROMPTS[pattern] ?? [];

  // Combine core questions with pattern-specific ones
  return [
    ...REFLECTION_QUESTIONS,
    ...(patternPrompts.length > 0 ? [patternPrompts[0]!] : []),
  ];
}

/**
 * Generate a coach response for reflection stage
 */
export function generateReflectionResponse(
  data: CoachingReflectionData | null,
  problem: Problem
): CoachResponse {
  if (!data || !data.isComplete) {
    const questions = generateReflectionPrompt(problem);
    return {
      type: 'QUESTION',
      content: 'Take a moment to reflect on what you learned.',
      questions,
      helpLevel: null,
      nextAction: 'CONTINUE',
      metadata: {
        stage: 'REFLECTION',
        attemptCount: 0,
        helpUsed: 0,
        timeElapsed: 0,
      },
    };
  }

  const summary = generateReflectionSummary(data, problem);

  return {
    type: 'CONGRATULATIONS',
    content: summary,
    questions: [],
    helpLevel: null,
    nextAction: 'COMPLETE',
    metadata: {
      stage: 'REFLECTION',
      attemptCount: 1,
      helpUsed: 0,
      timeElapsed: 0,
    },
  };
}

// ============ Initial Data Factory ============

/**
 * Create initial reflection data
 */
export function createInitialReflectionData(): CoachingReflectionData {
  return {
    keyInsight: null,
    misleadingFactors: [],
    recognitionTips: null,
    patternTriggers: [],
    suggestedFollowUps: [],
    isComplete: false,
  };
}
