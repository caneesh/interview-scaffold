/**
 * Forbidden Concept Detection
 * Pure TypeScript - deterministic pattern matching
 */

import type { PatternId } from '../entities/pattern.js';
import type { ErrorEvent } from './types.js';

// ============ Forbidden Concept Definitions ============

export interface ForbiddenConcept {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly patterns: readonly RegExp[];
  readonly appliesTo: readonly PatternId[] | 'ALL';
  readonly severity: 'ERROR' | 'WARNING';
}

// ============ Standard Forbidden Concepts ============

export const FORBIDDEN_CONCEPTS: readonly ForbiddenConcept[] = [
  // Built-in sorting (when implementing sort algorithms)
  {
    id: 'builtin_sort',
    name: 'Built-in Sort',
    description: 'Using built-in sort function when implementing sorting algorithm',
    patterns: [
      /\.sort\s*\(/,
      /sorted\s*\(/,
      /Arrays\.sort\s*\(/,
      /Collections\.sort\s*\(/,
    ],
    appliesTo: ['HEAP'], // Only forbidden when learning heap sort
    severity: 'ERROR',
  },

  // Using set/dict for two pointers
  {
    id: 'hash_structure_two_pointers',
    name: 'Hash Structure in Two Pointers',
    description: 'Using hash-based structure when two pointers pattern is expected',
    patterns: [
      /new\s+Set\s*\(/,
      /new\s+Map\s*\(/,
      /\{\s*\}/,  // Object literal (might be hash)
      /dict\s*\(/,
      /set\s*\(/,
    ],
    appliesTo: ['TWO_POINTERS'],
    severity: 'WARNING',
  },

  // Using recursion for iterative patterns
  {
    id: 'recursion_iterative',
    name: 'Recursion in Iterative Pattern',
    description: 'Using recursion when iterative solution is expected',
    patterns: [
      // Detect common recursive patterns (simplified without backreferences)
      /def\s+\w+\s*\([^)]*\)\s*:[\s\S]*?return\s+\w+\s*\(/,  // Python recursive return
      /function\s+\w+\s*\([^)]*\)\s*\{[\s\S]*?return\s+\w+\s*\(/,  // JS recursive return
    ],
    appliesTo: ['SLIDING_WINDOW', 'TWO_POINTERS', 'PREFIX_SUM'],
    severity: 'WARNING',
  },

  // Brute force nested loops for sliding window
  {
    id: 'brute_force_sliding_window',
    name: 'Brute Force for Sliding Window',
    description: 'Using O(n*k) brute force instead of O(n) sliding window',
    patterns: [
      /for\s*\([^)]+\)\s*\{[^}]*for\s*\([^)]+\)/,  // JS nested for
      /for\s+\w+\s+in\s+range\([^)]+\)\s*:[^:]*for\s+\w+\s+in\s+range/,  // Python nested for
    ],
    appliesTo: ['SLIDING_WINDOW'],
    severity: 'ERROR',
  },

  // Using global variables
  {
    id: 'global_variables',
    name: 'Global Variables',
    description: 'Using global mutable state',
    patterns: [
      /^(?:var|let)\s+\w+\s*=/m,  // Global var/let in JS
      /^global\s+\w+/m,  // Python global keyword
    ],
    appliesTo: 'ALL',
    severity: 'WARNING',
  },

  // Hardcoded test case values
  {
    id: 'hardcoded_values',
    name: 'Hardcoded Values',
    description: 'Hardcoding specific test case values',
    patterns: [
      /if\s*\(\s*\w+\s*===?\s*\[\s*\d+(\s*,\s*\d+)*\s*\]\s*\)/,  // if (arr === [1,2,3])
      /return\s+\[\s*\d+(\s*,\s*\d+)*\s*\]/,  // return [specific values]
    ],
    appliesTo: 'ALL',
    severity: 'ERROR',
  },
];

// ============ Detection Function ============

export interface ForbiddenDetectionResult {
  readonly detected: readonly DetectedForbidden[];
  readonly errors: readonly ErrorEvent[];
}

export interface DetectedForbidden {
  readonly concept: ForbiddenConcept;
  readonly matches: readonly string[];
  readonly lines: readonly number[];
}

export function detectForbiddenConcepts(
  code: string,
  pattern: PatternId,
  additionalForbidden: readonly string[] = []
): ForbiddenDetectionResult {
  const detected: DetectedForbidden[] = [];
  const errors: ErrorEvent[] = [];

  // Check standard forbidden concepts
  for (const concept of FORBIDDEN_CONCEPTS) {
    // Check if this concept applies to the current pattern
    if (concept.appliesTo !== 'ALL' && !concept.appliesTo.includes(pattern)) {
      continue;
    }

    const matches: string[] = [];
    const lines: number[] = [];

    for (const regex of concept.patterns) {
      const codeLines = code.split('\n');
      codeLines.forEach((line, index) => {
        const match = line.match(regex);
        if (match) {
          matches.push(match[0]);
          lines.push(index + 1);
        }
      });
    }

    if (matches.length > 0) {
      detected.push({ concept, matches, lines });

      errors.push({
        type: 'FORBIDDEN_CONCEPT',
        severity: concept.severity,
        message: `${concept.name}: ${concept.description}`,
        location: lines.length > 0 ? { line: lines[0]! } : undefined,
        evidence: matches,
        suggestion: `Avoid using ${concept.name.toLowerCase()} for ${pattern} problems.`,
      });
    }
  }

  // Check additional forbidden concepts (simple string matching)
  for (const forbidden of additionalForbidden) {
    const regex = new RegExp(escapeRegex(forbidden), 'gi');
    const matches = code.match(regex);

    if (matches) {
      const lines = findMatchLines(code, forbidden);

      errors.push({
        type: 'FORBIDDEN_CONCEPT',
        severity: 'ERROR',
        message: `Forbidden: "${forbidden}" is not allowed for this problem.`,
        location: lines.length > 0 ? { line: lines[0]! } : undefined,
        evidence: matches,
      });
    }
  }

  return { detected, errors };
}

// ============ Helper Functions ============

function escapeRegex(string: string): string {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function findMatchLines(code: string, needle: string): number[] {
  const lines: number[] = [];
  const codeLines = code.split('\n');
  const lowerNeedle = needle.toLowerCase();

  codeLines.forEach((line, index) => {
    if (line.toLowerCase().includes(lowerNeedle)) {
      lines.push(index + 1);
    }
  });

  return lines;
}

// ============ Pattern-Specific Forbidden ============

export function getForbiddenForPattern(pattern: PatternId): readonly string[] {
  const forbidden: Record<PatternId, readonly string[]> = {
    SLIDING_WINDOW: ['collections.Counter', 'Counter('],
    TWO_POINTERS: [],
    PREFIX_SUM: [],
    BINARY_SEARCH: ['index(', 'indexOf(', 'find('],
    BFS: [],
    DFS: [],
    DYNAMIC_PROGRAMMING: [],
    BACKTRACKING: [],
    GREEDY: [],
    HEAP: ['heapq', 'PriorityQueue', 'heappush', 'heappop'],
    TRIE: [],
    UNION_FIND: [],
    INTERVAL_MERGING: [],
  };

  return forbidden[pattern] ?? [];
}
