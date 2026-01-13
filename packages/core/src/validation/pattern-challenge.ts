/**
 * Pattern Challenge - "Advocate's Trap" Rule Engine
 *
 * Deterministic rule-based detector for pattern mismatches.
 * Identifies when a user's pattern selection may be incorrect based on:
 * - Problem characteristics (sorted/unsorted, data structure type, etc.)
 * - Pattern-specific disqualifiers (e.g., two pointers on unsorted + arbitrary pair)
 * - Confidence scoring based on keyword analysis
 */

import type { PatternId } from '../entities/pattern.js';
import type { Problem } from '../entities/problem.js';

// ============ Types ============

export interface PatternChallengeResult {
  /** Whether a challenge should be triggered */
  readonly shouldChallenge: boolean;
  /** Confidence score for the selected pattern (0-1, lower = more likely mismatch) */
  readonly confidenceScore: number;
  /** Reasons why the challenge was triggered */
  readonly reasons: readonly string[];
  /** Top 3 alternative patterns to suggest */
  readonly suggestedAlternatives: readonly PatternId[];
  /** Rule-based challenge prompt (Socratic question) */
  readonly socraticPrompt: string | null;
  /** Specific disqualifier that triggered the challenge */
  readonly disqualifier: PatternDisqualifier | null;
}

export interface PatternDisqualifier {
  readonly code: string;
  readonly description: string;
  readonly counterexampleHint: string;
}

export interface PatternChallengeInput {
  readonly selectedPattern: PatternId;
  readonly problem: Problem;
  readonly statedInvariant: string;
}

// ============ Problem Characteristics Detection ============

interface ProblemCharacteristics {
  readonly mentionsSorted: boolean;
  readonly mentionsUnsorted: boolean;
  readonly mentionsPairs: boolean;
  readonly mentionsSubarray: boolean;
  readonly mentionsSubstring: boolean;
  readonly mentionsPath: boolean;
  readonly mentionsTree: boolean;
  readonly mentionsGraph: boolean;
  readonly mentionsGrid: boolean;
  readonly mentionsIntervals: boolean;
  readonly mentionsOptimal: boolean;
  readonly mentionsAllCombinations: boolean;
  readonly mentionsConnected: boolean;
  readonly mentionsPrefix: boolean;
  readonly mentionsKth: boolean;
  readonly mentionsMinMax: boolean;
  readonly mentionsDistinct: boolean;
  readonly mentionsContiguous: boolean;
}

function analyzeProblemCharacteristics(problem: Problem): ProblemCharacteristics {
  const text = `${problem.title} ${problem.statement}`.toLowerCase();

  return {
    mentionsSorted: /\b(sorted|ascending|descending|in order)\b/i.test(text),
    mentionsUnsorted: /\b(unsorted|unordered|any order|not sorted)\b/i.test(text),
    mentionsPairs: /\b(pair|two (elements|numbers|values)|sum of two)\b/i.test(text),
    mentionsSubarray: /\b(subarray|sub-array|contiguous.*array)\b/i.test(text),
    mentionsSubstring: /\b(substring|sub-string|contiguous.*string)\b/i.test(text),
    mentionsPath: /\b(path|route|traverse|walk)\b/i.test(text),
    mentionsTree: /\b(tree|binary tree|bst|node.*child|parent.*node)\b/i.test(text),
    mentionsGraph: /\b(graph|edge|vertex|vertices|node.*neighbor|adjacent)\b/i.test(text),
    mentionsGrid: /\b(grid|matrix|2d array|m\s*[x×]\s*n|row.*column)\b/i.test(text),
    mentionsIntervals: /\b(interval|range|start.*end|overlap|merge.*interval)\b/i.test(text),
    mentionsOptimal: /\b(optimal|maximum|minimum|largest|smallest|best|most|least)\b/i.test(text),
    mentionsAllCombinations: /\b(all (combinations|permutations|subsets|paths)|generate all|find all)\b/i.test(text),
    mentionsConnected: /\b(connected|component|union|disjoint|group)\b/i.test(text),
    mentionsPrefix: /\b(prefix|cumulative|running (sum|total))\b/i.test(text),
    mentionsKth: /\b(k-?th|top k|k (largest|smallest)|k elements)\b/i.test(text),
    mentionsMinMax: /\b(min|max|minimum|maximum|smallest|largest)\b/i.test(text),
    mentionsDistinct: /\b(distinct|unique|different|no duplicate)\b/i.test(text),
    mentionsContiguous: /\b(contiguous|consecutive|adjacent|window)\b/i.test(text),
  };
}

// ============ Pattern Disqualifiers ============

/**
 * Disqualifier rules: specific conditions that strongly indicate a pattern mismatch
 */
const DISQUALIFIER_RULES: Record<PatternId, (chars: ProblemCharacteristics, problem: Problem) => PatternDisqualifier | null> = {
  TWO_POINTERS: (chars) => {
    // Two pointers on unsorted array for pair existence (not sum to target in sorted)
    if (chars.mentionsUnsorted && chars.mentionsPairs && !chars.mentionsSorted) {
      return {
        code: 'TWO_POINTERS_UNSORTED_PAIRS',
        description: 'Two pointers typically requires sorted input for pair problems',
        counterexampleHint: 'Consider: [3, 1, 4, 2] finding pair with sum 5 - which direction would pointers move?',
      };
    }
    // Two pointers for subarray problems (usually sliding window)
    if (chars.mentionsSubarray && chars.mentionsContiguous) {
      return {
        code: 'TWO_POINTERS_VS_SLIDING_WINDOW',
        description: 'Contiguous subarray problems often benefit from sliding window approach',
        counterexampleHint: 'With two pointers, how would you track the "best" subarray as the window changes?',
      };
    }
    return null;
  },

  SLIDING_WINDOW: (chars) => {
    // Sliding window on non-contiguous problems
    if (!chars.mentionsSubarray && !chars.mentionsSubstring && !chars.mentionsContiguous) {
      return {
        code: 'SLIDING_WINDOW_NOT_CONTIGUOUS',
        description: 'Sliding window works best on contiguous sequences (subarrays, substrings)',
        counterexampleHint: 'If elements don\'t need to be contiguous, how would you define window boundaries?',
      };
    }
    // Sliding window on all-pairs/combinations
    if (chars.mentionsAllCombinations) {
      return {
        code: 'SLIDING_WINDOW_ALL_COMBINATIONS',
        description: 'Generating all combinations typically requires backtracking, not sliding window',
        counterexampleHint: 'A sliding window sees each element once - how would it generate all subsets?',
      };
    }
    return null;
  },

  BINARY_SEARCH: (chars) => {
    // Binary search on unsorted data
    if (chars.mentionsUnsorted && !chars.mentionsSorted) {
      return {
        code: 'BINARY_SEARCH_UNSORTED',
        description: 'Binary search requires sorted data or a monotonic property',
        counterexampleHint: 'Consider: [5, 2, 8, 1, 9] - if mid=8 and target=2, which half contains the answer?',
      };
    }
    return null;
  },

  GREEDY: (chars) => {
    // Greedy on problems that mention "all" solutions
    if (chars.mentionsAllCombinations) {
      return {
        code: 'GREEDY_ALL_SOLUTIONS',
        description: 'Greedy makes local choices and cannot enumerate all solutions',
        counterexampleHint: 'A greedy choice eliminates options - how would it find ALL valid combinations?',
      };
    }
    return null;
  },

  DYNAMIC_PROGRAMMING: (chars) => {
    // DP on simple traversal problems
    if ((chars.mentionsTree || chars.mentionsGraph) && chars.mentionsPath && !chars.mentionsOptimal) {
      return {
        code: 'DP_SIMPLE_TRAVERSAL',
        description: 'Simple path finding may not need DP - consider BFS/DFS first',
        counterexampleHint: 'Does this problem have overlapping subproblems, or just need traversal?',
      };
    }
    return null;
  },

  BFS: (chars) => {
    // BFS for backtracking/combination problems
    if (chars.mentionsAllCombinations && !chars.mentionsPath) {
      return {
        code: 'BFS_ALL_COMBINATIONS',
        description: 'Generating combinations is typically backtracking, not BFS',
        counterexampleHint: 'BFS explores level-by-level - how would it build all valid combinations?',
      };
    }
    return null;
  },

  DFS: (chars) => {
    // DFS for shortest path
    if (chars.mentionsPath && /\bshortest\b/i.test(chars.mentionsSorted ? 'shortest' : '')) {
      return {
        code: 'DFS_SHORTEST_PATH',
        description: 'Shortest path problems typically need BFS (unweighted) or Dijkstra (weighted)',
        counterexampleHint: 'DFS may find A path, but how would it guarantee the SHORTEST path?',
      };
    }
    return null;
  },

  BACKTRACKING: () => null, // Backtracking is flexible, few disqualifiers

  HEAP: (chars) => {
    // Heap for non-k-th/min-max problems
    if (!chars.mentionsKth && !chars.mentionsMinMax) {
      return {
        code: 'HEAP_NOT_KTH_MINMAX',
        description: 'Heaps excel at k-th element or continuous min/max tracking problems',
        counterexampleHint: 'What property would the heap maintain in this problem?',
      };
    }
    return null;
  },

  TRIE: (chars) => {
    // Trie for non-prefix/string problems
    if (!chars.mentionsPrefix && !chars.mentionsSubstring) {
      return {
        code: 'TRIE_NOT_PREFIX_STRING',
        description: 'Tries are optimized for prefix-based string operations',
        counterexampleHint: 'Does this problem involve shared prefixes between strings?',
      };
    }
    return null;
  },

  UNION_FIND: (chars) => {
    // Union find for non-connected component problems
    if (!chars.mentionsConnected && !chars.mentionsGraph) {
      return {
        code: 'UNION_FIND_NOT_CONNECTED',
        description: 'Union-Find excels at connected component and equivalence class problems',
        counterexampleHint: 'What would "union" and "find" operations represent in this problem?',
      };
    }
    return null;
  },

  PREFIX_SUM: (chars) => {
    // Prefix sum for non-range-query problems
    if (!chars.mentionsSubarray && !chars.mentionsPrefix) {
      return {
        code: 'PREFIX_SUM_NOT_RANGE_QUERY',
        description: 'Prefix sums optimize range sum queries on arrays',
        counterexampleHint: 'Does this problem need O(1) range sum queries after preprocessing?',
      };
    }
    return null;
  },

  INTERVAL_MERGING: (chars) => {
    // Interval merging for non-interval problems
    if (!chars.mentionsIntervals) {
      return {
        code: 'INTERVAL_MERGING_NOT_INTERVALS',
        description: 'Interval merging is for problems with start/end ranges that may overlap',
        counterexampleHint: 'Does this problem involve merging or comparing time/space ranges?',
      };
    }
    return null;
  },
};

// ============ Confidence Scoring ============

/**
 * Pattern affinity scores based on problem characteristics
 */
const PATTERN_AFFINITY: Record<PatternId, (chars: ProblemCharacteristics) => number> = {
  SLIDING_WINDOW: (c) => {
    let score = 0.5;
    if (c.mentionsSubarray || c.mentionsSubstring) score += 0.3;
    if (c.mentionsContiguous) score += 0.2;
    if (c.mentionsDistinct || c.mentionsMinMax) score += 0.1;
    if (c.mentionsAllCombinations) score -= 0.4;
    return Math.max(0, Math.min(1, score));
  },

  TWO_POINTERS: (c) => {
    let score = 0.5;
    if (c.mentionsSorted) score += 0.25;
    if (c.mentionsPairs) score += 0.2;
    if (c.mentionsUnsorted) score -= 0.3;
    if (c.mentionsSubarray && c.mentionsContiguous) score -= 0.2;
    return Math.max(0, Math.min(1, score));
  },

  BINARY_SEARCH: (c) => {
    let score = 0.5;
    if (c.mentionsSorted) score += 0.35;
    if (c.mentionsUnsorted) score -= 0.5;
    if (c.mentionsKth) score += 0.1;
    return Math.max(0, Math.min(1, score));
  },

  BFS: (c) => {
    let score = 0.5;
    if (c.mentionsGraph || c.mentionsGrid) score += 0.25;
    if (c.mentionsPath) score += 0.15;
    if (c.mentionsTree) score += 0.1;
    return Math.max(0, Math.min(1, score));
  },

  DFS: (c) => {
    let score = 0.5;
    if (c.mentionsGraph || c.mentionsGrid || c.mentionsTree) score += 0.25;
    if (c.mentionsPath) score += 0.15;
    if (c.mentionsConnected) score += 0.1;
    return Math.max(0, Math.min(1, score));
  },

  DYNAMIC_PROGRAMMING: (c) => {
    let score = 0.5;
    if (c.mentionsOptimal) score += 0.2;
    if (c.mentionsSubarray || c.mentionsSubstring) score += 0.1;
    if (c.mentionsPath && (c.mentionsGrid || c.mentionsGraph)) score += 0.15;
    return Math.max(0, Math.min(1, score));
  },

  BACKTRACKING: (c) => {
    let score = 0.5;
    if (c.mentionsAllCombinations) score += 0.35;
    if (c.mentionsPath && c.mentionsGrid) score += 0.15;
    return Math.max(0, Math.min(1, score));
  },

  GREEDY: (c) => {
    let score = 0.5;
    if (c.mentionsOptimal) score += 0.15;
    if (c.mentionsIntervals) score += 0.15;
    if (c.mentionsAllCombinations) score -= 0.4;
    return Math.max(0, Math.min(1, score));
  },

  HEAP: (c) => {
    let score = 0.4;
    if (c.mentionsKth) score += 0.4;
    if (c.mentionsMinMax) score += 0.2;
    return Math.max(0, Math.min(1, score));
  },

  TRIE: (c) => {
    let score = 0.3;
    if (c.mentionsPrefix) score += 0.4;
    if (c.mentionsSubstring) score += 0.2;
    return Math.max(0, Math.min(1, score));
  },

  UNION_FIND: (c) => {
    let score = 0.4;
    if (c.mentionsConnected) score += 0.35;
    if (c.mentionsGraph) score += 0.15;
    return Math.max(0, Math.min(1, score));
  },

  PREFIX_SUM: (c) => {
    let score = 0.4;
    if (c.mentionsPrefix) score += 0.3;
    if (c.mentionsSubarray) score += 0.2;
    return Math.max(0, Math.min(1, score));
  },

  INTERVAL_MERGING: (c) => {
    let score = 0.4;
    if (c.mentionsIntervals) score += 0.45;
    return Math.max(0, Math.min(1, score));
  },
};

// ============ Main Detection Function ============

/** Confidence threshold below which we trigger a challenge */
export const CHALLENGE_CONFIDENCE_THRESHOLD = 0.45;

/**
 * Analyzes a pattern selection and determines if it should be challenged
 */
export function detectPatternMismatch(input: PatternChallengeInput): PatternChallengeResult {
  const { selectedPattern, problem } = input;

  // Analyze problem characteristics
  const chars = analyzeProblemCharacteristics(problem);

  // Check for hard disqualifiers
  const disqualifierFn = DISQUALIFIER_RULES[selectedPattern];
  const disqualifier = disqualifierFn ? disqualifierFn(chars, problem) : null;

  // Calculate confidence score for selected pattern
  const affinityFn = PATTERN_AFFINITY[selectedPattern];
  const baseConfidence = affinityFn ? affinityFn(chars) : 0.5;

  // Reduce confidence if there's a disqualifier
  const confidenceScore = disqualifier
    ? Math.min(baseConfidence, CHALLENGE_CONFIDENCE_THRESHOLD - 0.1)
    : baseConfidence;

  // Find alternative patterns with higher affinity
  const alternatives = findAlternativePatterns(chars, selectedPattern, problem.pattern);

  // Determine if we should challenge
  const shouldChallenge = disqualifier !== null || confidenceScore < CHALLENGE_CONFIDENCE_THRESHOLD;

  // Build reasons
  const reasons: string[] = [];
  if (disqualifier) {
    reasons.push(disqualifier.description);
  }
  if (confidenceScore < CHALLENGE_CONFIDENCE_THRESHOLD) {
    reasons.push(`Low confidence (${(confidenceScore * 100).toFixed(0)}%) for ${selectedPattern} based on problem characteristics`);
  }
  if (alternatives.length > 0 && alternatives[0] !== selectedPattern) {
    reasons.push(`${alternatives[0]} may be a better fit based on problem structure`);
  }

  // Generate Socratic prompt
  const socraticPrompt = generateSocraticPrompt(selectedPattern, chars, disqualifier);

  return {
    shouldChallenge,
    confidenceScore,
    reasons,
    suggestedAlternatives: alternatives.slice(0, 3),
    socraticPrompt,
    disqualifier,
  };
}

/**
 * Find alternative patterns sorted by affinity
 */
function findAlternativePatterns(
  chars: ProblemCharacteristics,
  selectedPattern: PatternId,
  correctPattern: PatternId
): PatternId[] {
  const patterns: PatternId[] = [
    'SLIDING_WINDOW', 'TWO_POINTERS', 'PREFIX_SUM', 'BINARY_SEARCH',
    'BFS', 'DFS', 'DYNAMIC_PROGRAMMING', 'BACKTRACKING', 'GREEDY',
    'HEAP', 'TRIE', 'UNION_FIND', 'INTERVAL_MERGING',
  ];

  const scored = patterns
    .filter(p => p !== selectedPattern)
    .map(p => ({
      pattern: p,
      score: PATTERN_AFFINITY[p](chars) + (p === correctPattern ? 0.2 : 0), // Boost correct pattern
    }))
    .sort((a, b) => b.score - a.score);

  return scored.map(s => s.pattern);
}

/**
 * Generate a Socratic challenge question based on the mismatch
 */
function generateSocraticPrompt(
  pattern: PatternId,
  chars: ProblemCharacteristics,
  disqualifier: PatternDisqualifier | null
): string | null {
  if (disqualifier) {
    return disqualifier.counterexampleHint;
  }

  // Generic Socratic prompts based on pattern
  const prompts: Record<PatternId, string> = {
    SLIDING_WINDOW: 'What property of the window changes as you expand or shrink it?',
    TWO_POINTERS: 'How do you decide which pointer to move and in which direction?',
    BINARY_SEARCH: 'What sorted or monotonic property allows you to eliminate half the search space?',
    BFS: 'Why do you need to explore neighbors level-by-level here?',
    DFS: 'What makes depth-first exploration suitable for this problem?',
    DYNAMIC_PROGRAMMING: 'What are the overlapping subproblems, and what\'s the recurrence relation?',
    BACKTRACKING: 'What choices do you make, and when do you backtrack?',
    GREEDY: 'Why is the locally optimal choice also globally optimal here?',
    HEAP: 'What element do you need to access in O(1), and why?',
    TRIE: 'How does prefix-sharing help solve this problem efficiently?',
    UNION_FIND: 'What are the equivalence classes, and how do items get merged?',
    PREFIX_SUM: 'What range query do you need to answer, and how does precomputation help?',
    INTERVAL_MERGING: 'How do you determine when intervals should be merged?',
  };

  return prompts[pattern] ?? null;
}

// ============ Counterexample Validation ============

/**
 * Validates that a counterexample is within problem constraints
 */
export function validateCounterexample(
  counterexample: string,
  problem: Problem
): { valid: boolean; reason?: string } {
  // Try to parse the counterexample as JSON first
  let parsed: unknown;
  try {
    parsed = JSON.parse(counterexample);
  } catch {
    return { valid: false, reason: 'Counterexample is not valid JSON' };
  }

  // Extract constraints from problem statement
  const constraintMatches = problem.statement.match(/Constraints?:?\s*([\s\S]*?)(?:\n\n|$)/i);
  if (!constraintMatches) {
    return { valid: true }; // Can't validate constraints, but JSON is valid
  }

  const constraints = constraintMatches[1];

  // Check array length constraints
  if (constraints) {
    const lengthMatch = constraints.match(/(\d+)\s*<=?\s*(?:n|length|size|nums\.length|arr\.length)\s*<=?\s*(\d+)/i);
    if (lengthMatch && lengthMatch[1] && lengthMatch[2] && Array.isArray(parsed)) {
      const minLen = parseInt(lengthMatch[1], 10);
      const maxLen = parseInt(lengthMatch[2], 10);
      if (parsed.length < minLen || parsed.length > maxLen) {
        return { valid: false, reason: `Array length ${parsed.length} outside constraints [${minLen}, ${maxLen}]` };
      }
    }

    // Check value range constraints
    const valueMatch = constraints.match(/(-?\d+)\s*<=?\s*(?:nums\[i\]|arr\[i\]|val|value|element)\s*<=?\s*(-?\d+)/i);
    if (valueMatch && valueMatch[1] && valueMatch[2] && Array.isArray(parsed)) {
      const minVal = parseInt(valueMatch[1], 10);
      const maxVal = parseInt(valueMatch[2], 10);
      for (const val of parsed) {
        if (typeof val === 'number' && (val < minVal || val > maxVal)) {
          return { valid: false, reason: `Value ${val} outside constraints [${minVal}, ${maxVal}]` };
        }
      }
    }
  }

  return { valid: true };
}

// ============ LLM Port for Counterexample Generation ============

export interface PatternChallengeLLMPort {
  /**
   * Check if LLM is available
   */
  isEnabled(): boolean;

  /**
   * Generate a counterexample input that would break the selected pattern
   */
  generateCounterexample(
    selectedPattern: PatternId,
    problem: Problem,
    disqualifier: PatternDisqualifier | null
  ): Promise<{
    counterexample: string;
    explanation: string;
  } | null>;

  /**
   * Generate a Socratic challenge prompt
   */
  generateSocraticPrompt(
    selectedPattern: PatternId,
    problem: Problem,
    statedInvariant: string
  ): Promise<string | null>;
}

/**
 * Creates a null LLM port (no LLM, uses rule-based only)
 */
export function createNullPatternChallengeLLM(): PatternChallengeLLMPort {
  return {
    isEnabled: () => false,
    generateCounterexample: async () => null,
    generateSocraticPrompt: async () => null,
  };
}

// ============ Exports ============

export {
  analyzeProblemCharacteristics,
  findAlternativePatterns,
  type ProblemCharacteristics,
};
