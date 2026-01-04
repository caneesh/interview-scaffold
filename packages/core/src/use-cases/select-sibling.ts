import type { Problem } from '../entities/problem.js';

/**
 * SelectSibling - deterministic sibling problem selection
 * Pure function, no randomness, fully reproducible
 */

export interface SelectSiblingInput {
  readonly candidates: readonly Problem[];
  readonly excludeProblemIds: readonly string[]; // Problems to exclude (e.g., recently attempted)
  readonly seed: string; // Seed for deterministic selection (e.g., `${userId}-${pattern}-${rung}`)
  readonly offset: number; // Offset for progression (e.g., attempt count)
}

export interface SelectSiblingOutput {
  readonly problem: Problem | null;
  readonly index: number; // Index in filtered candidates
  readonly reason: string;
}

/**
 * Selects a sibling problem deterministically
 * - Filters out excluded problems
 * - Sorts remaining by ID for stable ordering
 * - Uses seed + offset to select from sorted list
 */
export function selectSibling(input: SelectSiblingInput): SelectSiblingOutput {
  const { candidates, excludeProblemIds, seed, offset } = input;

  // Filter out excluded problems
  const excludeSet = new Set(excludeProblemIds);
  const available = candidates.filter((p) => !excludeSet.has(p.id));

  if (available.length === 0) {
    return {
      problem: null,
      index: -1,
      reason: 'No problems available after exclusions',
    };
  }

  // Sort by ID for stable ordering (deterministic)
  const sorted = [...available].sort((a, b) => a.id.localeCompare(b.id));

  // Compute deterministic index
  const index = computeDeterministicIndex(seed, offset, sorted.length);
  const problem = sorted[index];

  if (!problem) {
    return {
      problem: null,
      index: -1,
      reason: 'Unexpected selection failure',
    };
  }

  return {
    problem,
    index,
    reason: `Selected problem ${index + 1} of ${sorted.length} available`,
  };
}

/**
 * Computes a deterministic index from seed and offset
 * Uses simple string hashing for reproducibility
 */
export function computeDeterministicIndex(
  seed: string,
  offset: number,
  listLength: number
): number {
  if (listLength === 0) return 0;

  // Simple hash function for seed
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    const char = seed.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }

  // Combine hash with offset and take modulo
  const index = Math.abs(hash + offset) % listLength;
  return index;
}

/**
 * Creates a stable seed for sibling selection
 * Ensures same user+pattern+rung always produces same base sequence
 */
export function createSelectionSeed(
  userId: string,
  pattern: string,
  rung: number
): string {
  return `${userId}:${pattern}:${rung}`;
}
