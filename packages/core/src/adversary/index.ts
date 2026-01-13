/**
 * Adversary Challenge Module
 *
 * Provides constraint mutation prompts for post-completion challenges.
 * These "Level Up Challenges" ask users to consider how their solution
 * would need to change under different constraints.
 */

import type { PatternId } from '../entities/pattern.js';
import type { AdversaryPrompt, AdversaryPromptType } from '../entities/step.js';

/**
 * Default adversary prompts by type
 */
export const DEFAULT_ADVERSARY_PROMPTS: Record<AdversaryPromptType, Omit<AdversaryPrompt, 'id'>> = {
  INFINITE_STREAM: {
    type: 'INFINITE_STREAM',
    prompt: "What if the input was an infinite stream instead of a fixed array? How would you adapt your solution?",
    hint: "Consider: Can you maintain a fixed-size window? What state do you need to track?",
  },
  MEMORY_O1: {
    type: 'MEMORY_O1',
    prompt: "What if you could only use O(1) extra space? How would your approach change?",
    hint: "Consider: Can you use the input array itself? Are there in-place techniques?",
  },
  INPUT_UNSORTED: {
    type: 'INPUT_UNSORTED',
    prompt: "What if the input is no longer sorted? Does your solution still work, or what changes?",
    hint: "Consider: Would sorting help? Is there a different approach for unsorted data?",
  },
  MULTIPLE_QUERIES: {
    type: 'MULTIPLE_QUERIES',
    prompt: "What if you need to answer many queries on the same dataset? How would you optimize?",
    hint: "Consider: Can you precompute something? What data structures enable fast repeated queries?",
  },
  NEGATIVE_NUMBERS: {
    type: 'NEGATIVE_NUMBERS',
    prompt: "What if the input could contain negative numbers? Does your solution handle that?",
    hint: "Consider: Do your assumptions about sums/products still hold? What edge cases arise?",
  },
  DUPLICATE_VALUES: {
    type: 'DUPLICATE_VALUES',
    prompt: "What if there are many duplicate values? How does that affect your approach?",
    hint: "Consider: Does your solution count duplicates correctly? Are there optimization opportunities?",
  },
  ONLINE_UPDATES: {
    type: 'ONLINE_UPDATES',
    prompt: "What if elements can be added or removed dynamically? How would you handle updates?",
    hint: "Consider: What data structures support efficient insertions/deletions? Can you maintain your invariant?",
  },
  DISTRIBUTED: {
    type: 'DISTRIBUTED',
    prompt: "What if the data is too large to fit in memory and is distributed across machines?",
    hint: "Consider: How would you partition the work? What needs to be communicated between nodes?",
  },
};

/**
 * Pattern-specific adversary prompt recommendations
 * Maps patterns to the most relevant constraint mutations
 */
export const PATTERN_ADVERSARY_PROMPTS: Record<PatternId, AdversaryPromptType[]> = {
  SLIDING_WINDOW: ['INFINITE_STREAM', 'MEMORY_O1', 'NEGATIVE_NUMBERS'],
  TWO_POINTERS: ['INPUT_UNSORTED', 'DUPLICATE_VALUES', 'MEMORY_O1'],
  PREFIX_SUM: ['MULTIPLE_QUERIES', 'ONLINE_UPDATES', 'NEGATIVE_NUMBERS'],
  BINARY_SEARCH: ['INPUT_UNSORTED', 'DUPLICATE_VALUES', 'ONLINE_UPDATES'],
  BFS: ['DISTRIBUTED', 'MEMORY_O1', 'ONLINE_UPDATES'],
  DFS: ['MEMORY_O1', 'INFINITE_STREAM', 'DISTRIBUTED'],
  DYNAMIC_PROGRAMMING: ['MEMORY_O1', 'MULTIPLE_QUERIES', 'ONLINE_UPDATES'],
  BACKTRACKING: ['MEMORY_O1', 'DUPLICATE_VALUES', 'DISTRIBUTED'],
  GREEDY: ['ONLINE_UPDATES', 'NEGATIVE_NUMBERS', 'INPUT_UNSORTED'],
  HEAP: ['INFINITE_STREAM', 'MULTIPLE_QUERIES', 'ONLINE_UPDATES'],
  TRIE: ['MEMORY_O1', 'ONLINE_UPDATES', 'DISTRIBUTED'],
  UNION_FIND: ['ONLINE_UPDATES', 'MULTIPLE_QUERIES', 'DISTRIBUTED'],
  INTERVAL_MERGING: ['ONLINE_UPDATES', 'MULTIPLE_QUERIES', 'DUPLICATE_VALUES'],
};

/**
 * Select an adversary prompt for a given pattern
 * Uses problem-specific prompts if available, otherwise falls back to pattern defaults
 */
export function selectAdversaryPrompt(
  pattern: PatternId,
  problemPrompts?: readonly AdversaryPrompt[],
  excludeTypes?: AdversaryPromptType[]
): AdversaryPrompt | null {
  // If problem has custom prompts, pick one randomly
  if (problemPrompts && problemPrompts.length > 0) {
    const available = excludeTypes
      ? problemPrompts.filter(p => !excludeTypes.includes(p.type))
      : problemPrompts;
    if (available.length > 0) {
      return available[Math.floor(Math.random() * available.length)] ?? null;
    }
  }

  // Fall back to pattern-specific defaults
  const recommendedTypes = PATTERN_ADVERSARY_PROMPTS[pattern];
  if (!recommendedTypes || recommendedTypes.length === 0) {
    return null;
  }

  // Filter out excluded types
  const availableTypes = excludeTypes
    ? recommendedTypes.filter(t => !excludeTypes.includes(t))
    : recommendedTypes;

  if (availableTypes.length === 0) {
    return null;
  }

  // Pick a random type
  const selectedType = availableTypes[Math.floor(Math.random() * availableTypes.length)];
  if (!selectedType) {
    return null;
  }

  const template = DEFAULT_ADVERSARY_PROMPTS[selectedType];
  return {
    id: `default_${selectedType.toLowerCase()}`,
    ...template,
  };
}

/**
 * Get all available adversary prompts for a pattern
 */
export function getAvailablePrompts(
  pattern: PatternId,
  problemPrompts?: readonly AdversaryPrompt[]
): AdversaryPrompt[] {
  const prompts: AdversaryPrompt[] = [];

  // Add problem-specific prompts
  if (problemPrompts) {
    prompts.push(...problemPrompts);
  }

  // Add pattern-default prompts
  const recommendedTypes = PATTERN_ADVERSARY_PROMPTS[pattern] ?? [];
  for (const type of recommendedTypes) {
    const template = DEFAULT_ADVERSARY_PROMPTS[type];
    prompts.push({
      id: `default_${type.toLowerCase()}`,
      ...template,
    });
  }

  return prompts;
}

export type { AdversaryPrompt, AdversaryPromptType };
