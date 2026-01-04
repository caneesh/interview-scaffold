/**
 * Pattern - algorithmic pattern (e.g., SLIDING_WINDOW, TWO_POINTERS)
 */
export const PATTERNS = [
  'SLIDING_WINDOW',
  'TWO_POINTERS',
  'PREFIX_SUM',
  'BINARY_SEARCH',
  'BFS',
  'DFS',
  'DYNAMIC_PROGRAMMING',
  'BACKTRACKING',
  'GREEDY',
  'HEAP',
  'TRIE',
  'UNION_FIND',
  'INTERVAL_MERGING',
] as const;

export type PatternId = (typeof PATTERNS)[number];

export interface Pattern {
  readonly id: PatternId;
  readonly name: string;
  readonly description: string;
  readonly prerequisites: readonly PatternId[];
}

export const PATTERN_DEFINITIONS: Record<PatternId, Pattern> = {
  SLIDING_WINDOW: {
    id: 'SLIDING_WINDOW',
    name: 'Sliding Window',
    description: 'Maintain a window over a contiguous sequence',
    prerequisites: [],
  },
  TWO_POINTERS: {
    id: 'TWO_POINTERS',
    name: 'Two Pointers',
    description: 'Use two pointers to traverse from different positions',
    prerequisites: [],
  },
  PREFIX_SUM: {
    id: 'PREFIX_SUM',
    name: 'Prefix Sum',
    description: 'Precompute cumulative sums for range queries',
    prerequisites: [],
  },
  BINARY_SEARCH: {
    id: 'BINARY_SEARCH',
    name: 'Binary Search',
    description: 'Divide search space in half each iteration',
    prerequisites: [],
  },
  BFS: {
    id: 'BFS',
    name: 'Breadth-First Search',
    description: 'Explore neighbors level by level',
    prerequisites: [],
  },
  DFS: {
    id: 'DFS',
    name: 'Depth-First Search',
    description: 'Explore as deep as possible before backtracking',
    prerequisites: [],
  },
  DYNAMIC_PROGRAMMING: {
    id: 'DYNAMIC_PROGRAMMING',
    name: 'Dynamic Programming',
    description: 'Break problem into overlapping subproblems',
    prerequisites: [],
  },
  BACKTRACKING: {
    id: 'BACKTRACKING',
    name: 'Backtracking',
    description: 'Build candidates and abandon invalid paths',
    prerequisites: ['DFS'],
  },
  GREEDY: {
    id: 'GREEDY',
    name: 'Greedy',
    description: 'Make locally optimal choices',
    prerequisites: [],
  },
  HEAP: {
    id: 'HEAP',
    name: 'Heap / Priority Queue',
    description: 'Efficiently track min/max elements',
    prerequisites: [],
  },
  TRIE: {
    id: 'TRIE',
    name: 'Trie',
    description: 'Prefix tree for string operations',
    prerequisites: [],
  },
  UNION_FIND: {
    id: 'UNION_FIND',
    name: 'Union Find',
    description: 'Track connected components with path compression',
    prerequisites: [],
  },
  INTERVAL_MERGING: {
    id: 'INTERVAL_MERGING',
    name: 'Interval Merging',
    description: 'Sort and merge overlapping intervals',
    prerequisites: [],
  },
};
