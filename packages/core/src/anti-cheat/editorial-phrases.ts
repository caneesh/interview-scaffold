/**
 * Editorial Phrase Database
 *
 * Collection of phrases commonly found in online editorials and solutions
 * that may indicate memorized content.
 */

import type { EditorialPhrase } from './types.js';

// ============ Common Editorial Catchphrases ============

/**
 * Phrases that often appear in editorial solutions
 */
export const EDITORIAL_CATCHPHRASES: readonly EditorialPhrase[] = [
  // Approach statements
  {
    pattern: 'the key insight is',
    isRegex: false,
    weight: 0.3,
    category: 'approach',
  },
  {
    pattern: 'the trick is to',
    isRegex: false,
    weight: 0.4,
    category: 'approach',
  },
  {
    pattern: 'the optimal solution uses',
    isRegex: false,
    weight: 0.5,
    category: 'solution',
  },
  {
    pattern: 'we can observe that',
    isRegex: false,
    weight: 0.2,
    category: 'approach',
  },
  {
    pattern: 'it is easy to see that',
    isRegex: false,
    weight: 0.3,
    category: 'approach',
  },
  {
    pattern: 'clearly, we need to',
    isRegex: false,
    weight: 0.3,
    category: 'approach',
  },
  {
    pattern: 'the naive approach would be',
    isRegex: false,
    weight: 0.4,
    category: 'approach',
  },
  {
    pattern: 'a better approach is',
    isRegex: false,
    weight: 0.3,
    category: 'approach',
  },

  // Pattern-specific phrases
  {
    pattern: 'maintain a sliding window',
    isRegex: false,
    weight: 0.3,
    category: 'pattern',
  },
  {
    pattern: 'use two pointers',
    isRegex: false,
    weight: 0.3,
    category: 'pattern',
  },
  {
    pattern: 'apply dynamic programming',
    isRegex: false,
    weight: 0.3,
    category: 'pattern',
  },
  {
    pattern: 'this is a classic',
    isRegex: false,
    weight: 0.5,
    category: 'pattern',
  },
  {
    pattern: 'this is a standard',
    isRegex: false,
    weight: 0.4,
    category: 'pattern',
  },

  // Complexity recitations
  {
    pattern: 'time complexity is O\\([^)]+\\) because',
    isRegex: true,
    weight: 0.2,
    category: 'complexity',
  },
  {
    pattern: 'this gives us O\\([^)]+\\) time and O\\([^)]+\\) space',
    isRegex: true,
    weight: 0.4,
    category: 'complexity',
  },
  {
    pattern: 'reducing from O\\([^)]+\\) to O\\([^)]+\\)',
    isRegex: true,
    weight: 0.3,
    category: 'complexity',
  },

  // Solution templates
  {
    pattern: 'initialize.*then iterate',
    isRegex: true,
    weight: 0.2,
    category: 'solution',
  },
  {
    pattern: 'step \\d+:',
    isRegex: true,
    weight: 0.3,
    category: 'solution',
  },
  {
    pattern: 'first, we.*then, we.*finally, we',
    isRegex: true,
    weight: 0.4,
    category: 'solution',
  },

  // Overly formal language
  {
    pattern: 'let us denote',
    isRegex: false,
    weight: 0.3,
    category: 'approach',
  },
  {
    pattern: 'without loss of generality',
    isRegex: false,
    weight: 0.4,
    category: 'approach',
  },
  {
    pattern: 'by induction',
    isRegex: false,
    weight: 0.3,
    category: 'approach',
  },
  {
    pattern: 'proof by contradiction',
    isRegex: false,
    weight: 0.3,
    category: 'approach',
  },

  // Problem-specific editorial phrases
  {
    pattern: 'expand the window.*shrink the window',
    isRegex: true,
    weight: 0.5,
    category: 'solution',
  },
  {
    pattern: 'greedy choice property',
    isRegex: false,
    weight: 0.4,
    category: 'pattern',
  },
  {
    pattern: 'optimal substructure',
    isRegex: false,
    weight: 0.4,
    category: 'pattern',
  },
  {
    pattern: 'overlapping subproblems',
    isRegex: false,
    weight: 0.4,
    category: 'pattern',
  },
];

// ============ Pattern-Specific Phrases ============

/**
 * Phrases specific to certain algorithmic patterns
 */
export const PATTERN_SPECIFIC_PHRASES: Record<string, readonly EditorialPhrase[]> = {
  SLIDING_WINDOW: [
    {
      pattern: 'maintain two pointers.*left.*right',
      isRegex: true,
      weight: 0.3,
      category: 'pattern',
    },
    {
      pattern: 'expand.*contract',
      isRegex: true,
      weight: 0.3,
      category: 'solution',
    },
    {
      pattern: 'window size.*fixed|variable',
      isRegex: true,
      weight: 0.3,
      category: 'pattern',
    },
  ],
  TWO_POINTERS: [
    {
      pattern: 'converge from both ends',
      isRegex: false,
      weight: 0.4,
      category: 'pattern',
    },
    {
      pattern: 'move.*based on.*comparison',
      isRegex: true,
      weight: 0.3,
      category: 'solution',
    },
  ],
  BINARY_SEARCH: [
    {
      pattern: 'search space',
      isRegex: false,
      weight: 0.3,
      category: 'pattern',
    },
    {
      pattern: 'binary search on.*answer',
      isRegex: true,
      weight: 0.5,
      category: 'solution',
    },
    {
      pattern: 'monotonic property',
      isRegex: false,
      weight: 0.4,
      category: 'pattern',
    },
  ],
  DYNAMIC_PROGRAMMING: [
    {
      pattern: 'state transition',
      isRegex: false,
      weight: 0.3,
      category: 'pattern',
    },
    {
      pattern: 'dp\\[i\\]\\[j\\].*represents',
      isRegex: true,
      weight: 0.4,
      category: 'solution',
    },
    {
      pattern: 'base case.*recurrence',
      isRegex: true,
      weight: 0.4,
      category: 'solution',
    },
    {
      pattern: 'memoization.*tabulation',
      isRegex: true,
      weight: 0.3,
      category: 'pattern',
    },
  ],
  DFS: [
    {
      pattern: 'visit.*mark.*explore',
      isRegex: true,
      weight: 0.3,
      category: 'solution',
    },
    {
      pattern: 'backtrack.*restore',
      isRegex: true,
      weight: 0.3,
      category: 'solution',
    },
  ],
  BFS: [
    {
      pattern: 'level by level',
      isRegex: false,
      weight: 0.3,
      category: 'pattern',
    },
    {
      pattern: 'shortest path.*unweighted',
      isRegex: true,
      weight: 0.3,
      category: 'pattern',
    },
  ],
  BACKTRACKING: [
    {
      pattern: 'pruning.*invalid',
      isRegex: true,
      weight: 0.3,
      category: 'pattern',
    },
    {
      pattern: 'constraint satisfaction',
      isRegex: false,
      weight: 0.4,
      category: 'pattern',
    },
  ],
  GREEDY: [
    {
      pattern: 'locally optimal',
      isRegex: false,
      weight: 0.3,
      category: 'pattern',
    },
    {
      pattern: 'activity selection',
      isRegex: false,
      weight: 0.4,
      category: 'pattern',
    },
  ],
  HEAP: [
    {
      pattern: 'maintain.*k.*elements',
      isRegex: true,
      weight: 0.3,
      category: 'pattern',
    },
    {
      pattern: 'priority queue',
      isRegex: false,
      weight: 0.2,
      category: 'pattern',
    },
  ],
  INTERVAL_MERGING: [
    {
      pattern: 'sort by start',
      isRegex: false,
      weight: 0.3,
      category: 'solution',
    },
    {
      pattern: 'compare.*end.*start',
      isRegex: true,
      weight: 0.3,
      category: 'solution',
    },
  ],
};

// ============ Response Quality Indicators ============

/**
 * Phrases that indicate genuine reasoning (positive signals)
 */
export const AUTHENTIC_REASONING_PHRASES: readonly string[] = [
  'i think',
  'my approach',
  'i would try',
  'let me think',
  'hmm',
  'wait',
  'actually',
  'i realized',
  'i noticed',
  'this reminds me',
  'if i understand correctly',
  'i\'m not sure but',
  'one way might be',
  'i could also',
  'maybe',
  'perhaps',
  'what if',
  'i wonder',
  'let me reconsider',
  'on second thought',
];

/**
 * Get all phrases for a specific pattern
 */
export function getPhrasesForPattern(pattern: string): readonly EditorialPhrase[] {
  const patternPhrases = PATTERN_SPECIFIC_PHRASES[pattern] ?? [];
  return [...EDITORIAL_CATCHPHRASES, ...patternPhrases];
}

/**
 * Check if text contains authentic reasoning indicators
 */
export function countAuthenticIndicators(text: string): number {
  const lowerText = text.toLowerCase();
  return AUTHENTIC_REASONING_PHRASES.filter(phrase =>
    lowerText.includes(phrase)
  ).length;
}
