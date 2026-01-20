/**
 * Enhanced Problem Metadata Schema
 *
 * Extended Problem entity with additional metadata for:
 * - Pattern family and secondary patterns
 * - Prerequisites and concept triggers
 * - Common misconceptions and edge cases
 * - Scoring weights and test metadata
 * - Follow-up problem selection
 * - Anti-cheat markers
 */

import type { PatternId } from './pattern.js';
import type { RungLevel } from './rung.js';
import type { TenantId } from './tenant.js';
import type { TestCase, Problem } from './problem.js';
import type { AdversaryPrompt } from './step.js';

// ============ Pattern Family ============

/**
 * Pattern family for grouping related patterns
 */
export const PATTERN_FAMILIES = [
  'ARRAY_TRAVERSAL',     // Sliding window, two pointers, prefix sum
  'SEARCH',              // Binary search, BFS, DFS
  'OPTIMIZATION',        // DP, greedy
  'GRAPH',               // BFS, DFS, union find
  'STRING',              // Trie, KMP, etc.
  'TREE',                // DFS, BFS on trees
  'BACKTRACKING',        // Permutations, combinations
  'INTERVAL',            // Interval merging, scheduling
  'DATA_STRUCTURE',      // Heap, trie, union find
] as const;

export type PatternFamily = (typeof PATTERN_FAMILIES)[number];

/**
 * Mapping of patterns to their families
 */
export const PATTERN_TO_FAMILY: Record<PatternId, PatternFamily> = {
  SLIDING_WINDOW: 'ARRAY_TRAVERSAL',
  TWO_POINTERS: 'ARRAY_TRAVERSAL',
  PREFIX_SUM: 'ARRAY_TRAVERSAL',
  BINARY_SEARCH: 'SEARCH',
  BFS: 'GRAPH',
  DFS: 'GRAPH',
  DYNAMIC_PROGRAMMING: 'OPTIMIZATION',
  BACKTRACKING: 'BACKTRACKING',
  GREEDY: 'OPTIMIZATION',
  HEAP: 'DATA_STRUCTURE',
  TRIE: 'STRING',
  UNION_FIND: 'GRAPH',
  INTERVAL_MERGING: 'INTERVAL',
};

// ============ Prerequisite Skills ============

/**
 * Skills that may be prerequisites for a problem
 */
export const PREREQUISITE_SKILLS = [
  // Data structure knowledge
  'arrays',
  'linked_lists',
  'stacks',
  'queues',
  'hash_maps',
  'sets',
  'heaps',
  'trees',
  'graphs',

  // Algorithm concepts
  'recursion',
  'iteration',
  'sorting',
  'searching',
  'divide_and_conquer',
  'dynamic_programming_basics',
  'greedy_basics',
  'graph_traversal',

  // Math concepts
  'modular_arithmetic',
  'combinatorics',
  'probability',
  'geometry',

  // Complexity analysis
  'time_complexity',
  'space_complexity',
  'amortized_analysis',
] as const;

export type PrerequisiteSkill = (typeof PREREQUISITE_SKILLS)[number];

// ============ Concept Triggers ============

/**
 * Signals in problem statement that hint at the pattern
 */
export interface ConceptTrigger {
  /** The trigger signal (phrase or characteristic) */
  readonly signal: string;
  /** Pattern this signal hints at */
  readonly pattern: PatternId;
  /** How strong this signal is (0-1) */
  readonly strength: number;
  /** Explanation of why this signal suggests the pattern */
  readonly explanation: string;
}

// ============ Common Misconceptions ============

/**
 * Common misconception about this problem
 */
export interface CommonMisconception {
  /** ID for tracking */
  readonly id: string;
  /** Description of the misconception */
  readonly description: string;
  /** Why this is wrong */
  readonly whyWrong: string;
  /** How to correct the thinking */
  readonly correction: string;
  /** Which pattern is mistakenly chosen */
  readonly wrongPattern?: PatternId;
  /** Frequency of this misconception (0-1) */
  readonly frequency: number;
}

// ============ Edge Case Categories ============

/**
 * Categories of edge cases
 */
export const EDGE_CASE_CATEGORIES = [
  'empty_input',
  'single_element',
  'all_same',
  'sorted_ascending',
  'sorted_descending',
  'max_values',
  'min_values',
  'negative_values',
  'zero_values',
  'duplicates',
  'large_input',
  'boundary_conditions',
  'overflow_potential',
  'special_characters',
  'unicode',
  'null_or_undefined',
] as const;

export type EdgeCaseCategory = (typeof EDGE_CASE_CATEGORIES)[number];

/**
 * Edge case with metadata
 */
export interface EdgeCaseMetadata {
  /** Category of edge case */
  readonly category: EdgeCaseCategory;
  /** Description of the specific case */
  readonly description: string;
  /** Example input */
  readonly exampleInput: string;
  /** Expected output */
  readonly expectedOutput: string;
  /** Why this is tricky */
  readonly trickyBecause: string;
  /** Priority for testing (1 = most important) */
  readonly priority: number;
}

// ============ Scoring Weights ============

/**
 * Scoring weights for each stage
 */
export interface ScoringWeights {
  /** Problem understanding (framing) */
  readonly problemFraming: number;
  /** Pattern recognition */
  readonly patternRecognition: number;
  /** Feynman explanation */
  readonly feynmanValidation: number;
  /** Strategy design */
  readonly strategyDesign: number;
  /** Code implementation */
  readonly coding: number;
  /** Reflection quality */
  readonly reflection: number;
  /** All weights should sum to 1.0 */
}

export const DEFAULT_SCORING_WEIGHTS: ScoringWeights = {
  problemFraming: 0.10,
  patternRecognition: 0.20,
  feynmanValidation: 0.10,
  strategyDesign: 0.15,
  coding: 0.35,
  reflection: 0.10,
};

// ============ Test Case Metadata ============

/**
 * Enhanced test case with metadata
 */
export interface EnhancedTestCase extends TestCase {
  /** Category of this test case */
  readonly category: 'basic' | 'edge' | 'performance' | 'hidden';
  /** What this test specifically validates */
  readonly validates: string;
  /** Hints to show if this test fails */
  readonly failureHints?: readonly string[];
  /** Time limit for this specific test (ms) */
  readonly timeLimitMs?: number;
  /** Memory limit for this specific test (bytes) */
  readonly memoryLimitBytes?: number;
}

/**
 * Test case statistics
 */
export interface TestCaseMetadata {
  /** Total number of test cases */
  readonly totalCount: number;
  /** Number of visible test cases */
  readonly visibleCount: number;
  /** Number of hidden test cases */
  readonly hiddenCount: number;
  /** Number of edge case tests */
  readonly edgeCaseCount: number;
  /** Number of performance tests */
  readonly performanceCount: number;
  /** Categories covered */
  readonly categoriesCovered: readonly EdgeCaseCategory[];
}

// ============ Follow-up Problem Selector ============

/**
 * Types of follow-up problems
 */
export const FOLLOWUP_TYPES = [
  'easier',       // Simpler variant for reinforcement
  'harder',       // More challenging variant
  'twist',        // Same pattern with a twist
  'trick',        // Tricky variation
  'related',      // Related pattern problem
  'composite',    // Combines multiple patterns
] as const;

export type FollowupType = (typeof FOLLOWUP_TYPES)[number];

/**
 * Follow-up problem reference
 */
export interface FollowupProblemRef {
  /** Problem ID */
  readonly problemId: string;
  /** Type of follow-up */
  readonly type: FollowupType;
  /** Why this is a good follow-up */
  readonly reason: string;
  /** When to suggest this (e.g., "after_success", "after_struggle") */
  readonly suggestWhen: 'after_success' | 'after_struggle' | 'always';
  /** Priority (1 = suggest first) */
  readonly priority: number;
}

// ============ Anti-Cheat Markers ============

/**
 * Anti-cheat marker for detecting editorial content
 */
export interface AntiCheatMarker {
  /** The phrase or pattern to detect */
  readonly phrase: string;
  /** Whether this is a regex */
  readonly isRegex: boolean;
  /** Confidence that this indicates memorization (0-1) */
  readonly confidence: number;
  /** Source of this phrase (e.g., "leetcode_editorial") */
  readonly source?: string;
}

// ============ Enhanced Problem Interface ============

/**
 * Enhanced Problem with all additional metadata
 */
export interface EnhancedProblem extends Problem {
  // === Pattern Information ===
  /** Pattern family this belongs to */
  readonly patternFamily: PatternFamily;
  /** Secondary patterns that could also work */
  readonly secondaryPatterns: readonly PatternId[];

  // === Prerequisites ===
  /** Skills required to solve this problem */
  readonly prerequisiteSkills: readonly PrerequisiteSkill[];

  // === Pattern Recognition Aids ===
  /** Signals that hint at the pattern */
  readonly conceptTriggers: readonly ConceptTrigger[];
  /** Common misconceptions about this problem */
  readonly commonMisconceptions: readonly CommonMisconception[];

  // === Edge Cases ===
  /** Categorized edge cases */
  readonly edgeCases: readonly EdgeCaseMetadata[];

  // === Scoring ===
  /** Custom scoring weights (if different from default) */
  readonly scoringWeights?: ScoringWeights;

  // === Test Case Metadata ===
  /** Statistics about test cases */
  readonly testCaseMetadata: TestCaseMetadata;
  /** Enhanced test cases with metadata */
  readonly enhancedTestCases?: readonly EnhancedTestCase[];

  // === Follow-up Problems ===
  /** Suggested follow-up problems */
  readonly followupProblems: readonly FollowupProblemRef[];

  // === Anti-Cheat ===
  /** Markers to detect editorial/memorized content */
  readonly antiCheatMarkers: readonly AntiCheatMarker[];

  // === Additional Metadata ===
  /** Tags for categorization */
  readonly tags?: readonly string[];
  /** Companies known to ask this problem */
  readonly companies?: readonly string[];
  /** Estimated time to solve (minutes) */
  readonly estimatedTimeMinutes?: number;
  /** Success rate from historical data (0-1) */
  readonly historicalSuccessRate?: number;
  /** Average number of attempts to solve */
  readonly averageAttempts?: number;
}

// ============ Builder/Factory ============

/**
 * Create an enhanced problem from a basic problem
 */
export function enhanceProblem(
  problem: Problem,
  enhancements: Partial<Omit<EnhancedProblem, keyof Problem>>
): EnhancedProblem {
  return {
    ...problem,
    patternFamily: enhancements.patternFamily ?? PATTERN_TO_FAMILY[problem.pattern],
    secondaryPatterns: enhancements.secondaryPatterns ?? [],
    prerequisiteSkills: enhancements.prerequisiteSkills ?? [],
    conceptTriggers: enhancements.conceptTriggers ?? [],
    commonMisconceptions: enhancements.commonMisconceptions ?? [],
    edgeCases: enhancements.edgeCases ?? [],
    testCaseMetadata: enhancements.testCaseMetadata ?? calculateTestCaseMetadata(problem),
    followupProblems: enhancements.followupProblems ?? [],
    antiCheatMarkers: enhancements.antiCheatMarkers ?? [],
    ...enhancements,
  };
}

/**
 * Calculate test case metadata from test cases
 */
export function calculateTestCaseMetadata(problem: Problem): TestCaseMetadata {
  const visible = problem.testCases.filter(tc => !tc.isHidden);
  const hidden = problem.testCases.filter(tc => tc.isHidden);
  const large = problem.largeHiddenTests ?? [];

  return {
    totalCount: problem.testCases.length + large.length,
    visibleCount: visible.length,
    hiddenCount: hidden.length + large.length,
    edgeCaseCount: 0, // Would need enhanced test cases to determine
    performanceCount: large.length,
    categoriesCovered: [],
  };
}

// ============ Default Concept Triggers by Pattern ============

export const DEFAULT_CONCEPT_TRIGGERS: Record<PatternId, readonly ConceptTrigger[]> = {
  SLIDING_WINDOW: [
    {
      signal: 'contiguous subarray',
      pattern: 'SLIDING_WINDOW',
      strength: 0.8,
      explanation: 'Contiguous subarray problems often use sliding window to maintain a window of elements',
    },
    {
      signal: 'substring',
      pattern: 'SLIDING_WINDOW',
      strength: 0.7,
      explanation: 'Substring problems can use sliding window to track valid substrings',
    },
    {
      signal: 'maximum/minimum sum of k elements',
      pattern: 'SLIDING_WINDOW',
      strength: 0.9,
      explanation: 'Fixed-size window problems are classic sliding window applications',
    },
  ],
  TWO_POINTERS: [
    {
      signal: 'sorted array',
      pattern: 'TWO_POINTERS',
      strength: 0.6,
      explanation: 'Sorted arrays enable two pointers from opposite ends',
    },
    {
      signal: 'pair with sum',
      pattern: 'TWO_POINTERS',
      strength: 0.7,
      explanation: 'Finding pairs in sorted arrays is a classic two pointer problem',
    },
  ],
  BINARY_SEARCH: [
    {
      signal: 'sorted',
      pattern: 'BINARY_SEARCH',
      strength: 0.5,
      explanation: 'Sorted data enables binary search',
    },
    {
      signal: 'find minimum/maximum',
      pattern: 'BINARY_SEARCH',
      strength: 0.4,
      explanation: 'Optimization on a monotonic function can use binary search',
    },
  ],
  BFS: [
    {
      signal: 'shortest path',
      pattern: 'BFS',
      strength: 0.8,
      explanation: 'BFS finds shortest paths in unweighted graphs',
    },
    {
      signal: 'level by level',
      pattern: 'BFS',
      strength: 0.9,
      explanation: 'Level-order traversal uses BFS',
    },
  ],
  DFS: [
    {
      signal: 'all paths',
      pattern: 'DFS',
      strength: 0.7,
      explanation: 'Finding all paths typically uses DFS with backtracking',
    },
    {
      signal: 'connected components',
      pattern: 'DFS',
      strength: 0.6,
      explanation: 'Finding connected components can use DFS',
    },
  ],
  DYNAMIC_PROGRAMMING: [
    {
      signal: 'number of ways',
      pattern: 'DYNAMIC_PROGRAMMING',
      strength: 0.7,
      explanation: 'Counting problems often have overlapping subproblems',
    },
    {
      signal: 'minimum/maximum cost',
      pattern: 'DYNAMIC_PROGRAMMING',
      strength: 0.6,
      explanation: 'Optimization with choices often uses DP',
    },
  ],
  BACKTRACKING: [
    {
      signal: 'all possible',
      pattern: 'BACKTRACKING',
      strength: 0.7,
      explanation: 'Generating all possibilities uses backtracking',
    },
    {
      signal: 'permutation',
      pattern: 'BACKTRACKING',
      strength: 0.9,
      explanation: 'Permutation generation is a classic backtracking problem',
    },
    {
      signal: 'combination',
      pattern: 'BACKTRACKING',
      strength: 0.9,
      explanation: 'Combination generation uses backtracking',
    },
  ],
  GREEDY: [
    {
      signal: 'maximum number of',
      pattern: 'GREEDY',
      strength: 0.5,
      explanation: 'Maximization with local choices may be greedy',
    },
    {
      signal: 'interval scheduling',
      pattern: 'GREEDY',
      strength: 0.8,
      explanation: 'Interval scheduling is a classic greedy problem',
    },
  ],
  HEAP: [
    {
      signal: 'kth largest/smallest',
      pattern: 'HEAP',
      strength: 0.9,
      explanation: 'Finding kth element efficiently uses a heap',
    },
    {
      signal: 'top k',
      pattern: 'HEAP',
      strength: 0.9,
      explanation: 'Finding top k elements uses a heap',
    },
  ],
  TRIE: [
    {
      signal: 'prefix',
      pattern: 'TRIE',
      strength: 0.8,
      explanation: 'Prefix matching is efficient with a trie',
    },
    {
      signal: 'autocomplete',
      pattern: 'TRIE',
      strength: 0.9,
      explanation: 'Autocomplete systems use tries',
    },
  ],
  UNION_FIND: [
    {
      signal: 'connected',
      pattern: 'UNION_FIND',
      strength: 0.5,
      explanation: 'Connectivity queries can use union find',
    },
    {
      signal: 'group',
      pattern: 'UNION_FIND',
      strength: 0.4,
      explanation: 'Grouping elements with equivalence can use union find',
    },
  ],
  INTERVAL_MERGING: [
    {
      signal: 'interval',
      pattern: 'INTERVAL_MERGING',
      strength: 0.7,
      explanation: 'Problems involving intervals often need merging',
    },
    {
      signal: 'overlapping',
      pattern: 'INTERVAL_MERGING',
      strength: 0.8,
      explanation: 'Handling overlapping ranges uses interval merging',
    },
  ],
  PREFIX_SUM: [
    {
      signal: 'range sum',
      pattern: 'PREFIX_SUM',
      strength: 0.9,
      explanation: 'Range sum queries use prefix sums',
    },
    {
      signal: 'subarray sum',
      pattern: 'PREFIX_SUM',
      strength: 0.7,
      explanation: 'Subarray sum problems can use prefix sums',
    },
  ],
};

/**
 * Get default concept triggers for a pattern
 */
export function getDefaultConceptTriggers(pattern: PatternId): readonly ConceptTrigger[] {
  return DEFAULT_CONCEPT_TRIGGERS[pattern] ?? [];
}
