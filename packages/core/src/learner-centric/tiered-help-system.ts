/**
 * Tiered Help System Module
 *
 * 5-level help ladder:
 * - Level 1: Question exposing missing insight
 * - Level 2: Conceptual hint
 * - Level 3: Condition or invariant
 * - Level 4: Structural skeleton without logic
 * - Level 5: Full solution (only if explicitly requested)
 *
 * Always state current help level.
 */

import type { Problem } from '../entities/problem.js';
import type { PatternId } from '../entities/pattern.js';
import { PATTERN_DEFINITIONS } from '../entities/pattern.js';
import type {
  HelpLevel,
  HelpType,
  TieredHelp,
  HelpRequest,
  CoachResponse,
} from './types.js';
import { selectRandom } from './random-utils.js';

// ============ Constants ============

/**
 * Help level to type mapping
 */
export const HELP_LEVEL_TYPES: Readonly<Record<HelpLevel, HelpType>> = {
  1: 'INSIGHT_QUESTION',
  2: 'CONCEPTUAL_HINT',
  3: 'INVARIANT_CONDITION',
  4: 'STRUCTURAL_SKELETON',
  5: 'FULL_SOLUTION',
};

/**
 * Help level descriptions
 */
export const HELP_LEVEL_DESCRIPTIONS: Readonly<Record<HelpLevel, string>> = {
  1: 'Question to expose missing insight',
  2: 'Conceptual hint about the approach',
  3: 'Key condition or invariant',
  4: 'Structural skeleton (no logic)',
  5: 'Full solution',
};

/**
 * Score penalty per help level
 */
export const HELP_LEVEL_PENALTIES: Readonly<Record<HelpLevel, number>> = {
  1: 0.05,
  2: 0.10,
  3: 0.15,
  4: 0.25,
  5: 0.50,
};

// ============ Help Content Templates ============

/**
 * Level 1: Insight questions by pattern
 */
const INSIGHT_QUESTIONS: Readonly<Record<PatternId, readonly string[]>> = {
  SLIDING_WINDOW: [
    'What needs to be true about the elements inside your window?',
    'How do you know when to stop expanding the window?',
    'What property changes as the window slides?',
  ],
  TWO_POINTERS: [
    'Why would moving one pointer help you find the answer?',
    'What relationship should hold between what the pointers point to?',
    'How does the sorted property help narrow down the search?',
  ],
  PREFIX_SUM: [
    'If you knew the sum from start to any index, how would that help?',
    'How can you express the sum of a range using precomputed values?',
    'What computation are you repeating that could be cached?',
  ],
  BINARY_SEARCH: [
    'What property allows you to discard half the remaining elements?',
    'How do you decide which half to search next?',
    'What condition determines if you found the answer?',
  ],
  BFS: [
    'Why would processing nodes level-by-level help here?',
    'What does the queue represent at any given moment?',
    'How do you ensure the first path found is the shortest?',
  ],
  DFS: [
    'What makes you backtrack from a path?',
    'How do you know you have explored all possibilities?',
    'What state needs to be maintained as you go deeper?',
  ],
  DYNAMIC_PROGRAMMING: [
    'What smaller problem does the answer depend on?',
    'Have you seen the same subproblem multiple times?',
    'What information do you need to solve for position i?',
  ],
  BACKTRACKING: [
    'What choices do you have at each decision point?',
    'How do you undo a choice to try a different path?',
    'What tells you a partial solution cannot lead to a valid answer?',
  ],
  GREEDY: [
    'What local choice seems obviously best at each step?',
    'Why would the locally best choice also be globally optimal?',
    'What ordering of items might make the greedy choice clear?',
  ],
  HEAP: [
    'What element do you need to access most frequently?',
    'Why is extracting the min/max repeatedly useful here?',
    'How does maintaining sorted order on insert/remove help?',
  ],
  TRIE: [
    'What do multiple strings have in common that you can exploit?',
    'How does sharing prefixes reduce redundant work?',
    'What does each node in the prefix tree represent?',
  ],
  UNION_FIND: [
    'What does it mean for two elements to be in the same group?',
    'How does knowing who is connected help solve the problem?',
    'What question do you keep asking about pairs of elements?',
  ],
  INTERVAL_MERGING: [
    'What order should you process intervals to see overlaps easily?',
    'When do two intervals overlap?',
    'How do you combine two overlapping intervals into one?',
  ],
};

/**
 * Level 2: Conceptual hints by pattern
 */
const CONCEPTUAL_HINTS: Readonly<Record<PatternId, readonly string[]>> = {
  SLIDING_WINDOW: [
    'Maintain a window [left, right] over a contiguous range. Expand by incrementing right, shrink by incrementing left.',
    'Track window state incrementally: update when adding or removing elements, not by rescanning.',
    'The window is valid when it satisfies the constraint. Shrink until valid, then record the result.',
  ],
  TWO_POINTERS: [
    'With sorted data, two pointers can converge from opposite ends based on the comparison result.',
    'One pointer tracks the "current" position; the other tracks a boundary or target.',
    'The direction to move each pointer depends on whether the current result is too large or too small.',
  ],
  PREFIX_SUM: [
    'Build prefix[i] = sum of elements 0 to i-1. Then range(i, j) = prefix[j+1] - prefix[i].',
    'Precompute running totals once, then answer any range query in O(1).',
    'Think of prefix sums as telescoping: summing differences cancels intermediate terms.',
  ],
  BINARY_SEARCH: [
    'Each comparison eliminates half the search space. The key is choosing the right comparison.',
    'The search space must have a monotonic property: all "no" answers on one side, all "yes" on the other.',
    'Be precise about whether you want the first/last element satisfying a condition.',
  ],
  BFS: [
    'Use a queue. Process all nodes at distance d before any at distance d+1.',
    'Mark nodes as visited when adding to the queue, not when processing, to avoid duplicates.',
    'BFS naturally finds the shortest path in an unweighted graph.',
  ],
  DFS: [
    'Use recursion or an explicit stack. Explore as deep as possible before backtracking.',
    'Mark nodes visited before recursing to avoid cycles.',
    'The call stack implicitly tracks the current path; pop to backtrack.',
  ],
  DYNAMIC_PROGRAMMING: [
    'Define dp[state] as the answer for a subproblem. Fill in order of increasing subproblem size.',
    'The recurrence relation expresses dp[i] in terms of smaller indices dp[j] where j < i.',
    'Base cases are the smallest subproblems you can solve directly without recursion.',
  ],
  BACKTRACKING: [
    'Build a solution incrementally. At each step, try each valid choice, recurse, then undo.',
    'Prune early: if a partial solution cannot possibly lead to a valid solution, abandon it.',
    'The key operations are: make choice, recurse, unmake choice (backtrack).',
  ],
  GREEDY: [
    'At each step, make the choice that looks best right now without considering the future.',
    'Greedy works when local optimum choices combine to form the global optimum.',
    'Often involves sorting by a key that makes the greedy choice obvious.',
  ],
  HEAP: [
    'A heap gives O(1) access to min (or max) and O(log n) insert/delete.',
    'Use a heap when you repeatedly need the smallest or largest element.',
    'For k-th largest, a min-heap of size k keeps the k largest seen so far.',
  ],
  TRIE: [
    'A trie stores strings character by character, sharing common prefixes.',
    'Each node represents a prefix; children are possible next characters.',
    'Trie operations (insert, search, startsWith) are O(word length).',
  ],
  UNION_FIND: [
    'Track disjoint sets using a parent array. find(x) returns the set representative.',
    'union(x, y) merges two sets by linking their roots.',
    'Path compression (updating parent during find) keeps operations nearly O(1).',
  ],
  INTERVAL_MERGING: [
    'Sort intervals by start time. Overlapping intervals will be adjacent after sorting.',
    'Two intervals overlap if second.start <= first.end.',
    'When merging, extend end = max(end1, end2).',
  ],
};

/**
 * Level 3: Key invariants/conditions by pattern
 */
const INVARIANT_CONDITIONS: Readonly<Record<PatternId, readonly string[]>> = {
  SLIDING_WINDOW: [
    'Invariant: All elements in [left, right] satisfy the constraint.',
    'Condition to shrink: while the window violates the constraint, increment left.',
    'Condition to update result: when window is valid, compare current window to best.',
  ],
  TWO_POINTERS: [
    'Invariant: Answer (if exists) is always in range [left, right].',
    'Condition: if sum < target, move left up; if sum > target, move right down.',
    'Termination: when left >= right, search space is exhausted.',
  ],
  PREFIX_SUM: [
    'Invariant: prefix[i] = sum of arr[0..i-1], prefix[0] = 0.',
    'Range sum: sum(i, j) = prefix[j+1] - prefix[i].',
    'Condition: index j+1 must not exceed prefix array length.',
  ],
  BINARY_SEARCH: [
    'Invariant: target is in [left, right] or does not exist.',
    'Update left = mid + 1 if arr[mid] < target.',
    'Update right = mid - 1 if arr[mid] > target.',
  ],
  BFS: [
    'Invariant: nodes in queue are exactly those at distance d from start.',
    'Mark visited before enqueueing to prevent duplicates.',
    'Termination: queue empty means all reachable nodes explored.',
  ],
  DFS: [
    'Invariant: current path is stored in the call stack (or explicit stack).',
    'Base case: return when node is null, goal is found, or bounds exceeded.',
    'Visited check: skip nodes already in current path (for cycles).',
  ],
  DYNAMIC_PROGRAMMING: [
    'Invariant: dp[i] holds optimal value for subproblem of size i.',
    'Recurrence: dp[i] = f(dp[i-1], dp[i-2], ...) depending on problem.',
    'Base case: dp[0] and/or dp[1] defined explicitly.',
  ],
  BACKTRACKING: [
    'Invariant: current[] holds a valid partial solution.',
    'Make choice: current.push(candidate).',
    'Backtrack: current.pop() after recursive call returns.',
  ],
  GREEDY: [
    'Invariant: current selection is optimal among items considered so far.',
    'Greedy choice: select item with best local property (e.g., earliest end time).',
    'No backtracking: once an item is selected or rejected, decision is final.',
  ],
  HEAP: [
    'Invariant: heap[0] is always the minimum (min-heap) or maximum (max-heap).',
    'After push: heapify up to maintain heap property.',
    'After pop: heapify down to restore heap property.',
  ],
  TRIE: [
    'Invariant: path from root to node spells a prefix.',
    'Insert: create nodes for missing characters, mark end of word.',
    'Search: follow path; word exists if end marker is set.',
  ],
  UNION_FIND: [
    'Invariant: find(x) returns the root of the set containing x.',
    'Union: parent[find(x)] = find(y) to merge sets.',
    'Connected: x and y are in same set iff find(x) == find(y).',
  ],
  INTERVAL_MERGING: [
    'Sort by start time first.',
    'Overlap condition: intervals[i].start <= merged.end.',
    'Merge: merged.end = max(merged.end, intervals[i].end).',
  ],
};

/**
 * Level 4: Structural skeletons by pattern (no logic, just structure)
 */
const STRUCTURAL_SKELETONS: Readonly<Record<PatternId, string>> = {
  SLIDING_WINDOW: `
let left = 0;
// Track window state here

for (let right = 0; right < n; right++) {
  // Expand window: add arr[right] to window state

  while (/* window invalid */) {
    // Shrink window: remove arr[left] from window state
    left++;
  }

  // Update result if window is valid
}
`.trim(),

  TWO_POINTERS: `
let left = 0;
let right = n - 1;

while (left < right) {
  // Calculate current value from pointers

  if (/* condition to move left */) {
    left++;
  } else if (/* condition to move right */) {
    right--;
  } else {
    // Found answer
  }
}
`.trim(),

  BINARY_SEARCH: `
let left = 0;
let right = n - 1;

while (left <= right) {
  const mid = left + Math.floor((right - left) / 2);

  if (/* found target */) {
    // Return or update result
  } else if (/* go right */) {
    left = mid + 1;
  } else {
    right = mid - 1;
  }
}
`.trim(),

  BFS: `
const queue = [start];
const visited = new Set([start]);

while (queue.length > 0) {
  const current = queue.shift();

  if (/* is goal */) {
    // Return result
  }

  for (const neighbor of getNeighbors(current)) {
    if (!visited.has(neighbor)) {
      visited.add(neighbor);
      queue.push(neighbor);
    }
  }
}
`.trim(),

  DFS: `
function dfs(node, state) {
  if (/* base case */) {
    // Return or record result
    return;
  }

  // Mark visited if needed

  for (const next of getNeighbors(node)) {
    // Make choice
    dfs(next, updatedState);
    // Undo choice (backtrack) if needed
  }
}
`.trim(),

  DYNAMIC_PROGRAMMING: `
// Initialize dp array
const dp = new Array(n + 1).fill(/* initial value */);

// Base cases
dp[0] = /* base value */;

// Fill dp table
for (let i = 1; i <= n; i++) {
  // dp[i] = some function of dp[i-1], dp[i-2], etc.
}

return dp[n];
`.trim(),

  BACKTRACKING: `
function backtrack(current, index) {
  if (/* is complete solution */) {
    result.push([...current]);
    return;
  }

  for (let i = index; i < candidates.length; i++) {
    // Make choice
    current.push(candidates[i]);

    // Recurse
    backtrack(current, i + 1);

    // Undo choice
    current.pop();
  }
}
`.trim(),

  GREEDY: `
// Sort by greedy criterion
items.sort((a, b) => /* greedy comparison */);

let result = /* initial value */;

for (const item of items) {
  if (/* item can be selected */) {
    // Select item
    // Update result
  }
}

return result;
`.trim(),

  HEAP: `
const heap = new MinHeap(); // or MaxHeap

for (const item of items) {
  heap.push(item);

  if (heap.size() > k) {
    heap.pop();
  }
}

return heap.top();
`.trim(),

  PREFIX_SUM: `
// Build prefix sum array
const prefix = new Array(n + 1).fill(0);
for (let i = 0; i < n; i++) {
  prefix[i + 1] = prefix[i] + arr[i];
}

// Answer range queries
function rangeSum(i, j) {
  return prefix[j + 1] - prefix[i];
}
`.trim(),

  TRIE: `
class TrieNode {
  constructor() {
    this.children = {};
    this.isEnd = false;
  }
}

class Trie {
  constructor() {
    this.root = new TrieNode();
  }

  insert(word) {
    let node = this.root;
    for (const char of word) {
      if (!node.children[char]) {
        node.children[char] = new TrieNode();
      }
      node = node.children[char];
    }
    node.isEnd = true;
  }

  search(word) {
    // Navigate and check isEnd
  }
}
`.trim(),

  UNION_FIND: `
const parent = Array.from({ length: n }, (_, i) => i);

function find(x) {
  if (parent[x] !== x) {
    parent[x] = find(parent[x]); // Path compression
  }
  return parent[x];
}

function union(x, y) {
  const px = find(x);
  const py = find(y);
  if (px !== py) {
    parent[px] = py;
  }
}
`.trim(),

  INTERVAL_MERGING: `
// Sort by start time
intervals.sort((a, b) => a[0] - b[0]);

const merged = [intervals[0]];

for (let i = 1; i < intervals.length; i++) {
  const last = merged[merged.length - 1];

  if (/* intervals overlap */) {
    // Merge: extend last interval
  } else {
    // No overlap: add new interval
    merged.push(intervals[i]);
  }
}

return merged;
`.trim(),
};

// ============ Help Generation ============

export interface HelpGenerationInput {
  readonly problem: Problem;
  readonly requestedLevel: HelpLevel;
  readonly currentCode?: string;
  readonly currentStrategy?: string;
  readonly explicitlyRequested: boolean;
}

/**
 * Generate help at the requested level
 */
export function generateHelp(input: HelpGenerationInput): TieredHelp {
  const { problem, requestedLevel, explicitlyRequested } = input;
  const pattern = problem.pattern;

  // Level 5 requires explicit request
  if (requestedLevel === 5 && !explicitlyRequested) {
    return {
      level: 4,
      content: 'Full solution requires explicit request. Here is the structural skeleton instead.',
      type: 'STRUCTURAL_SKELETON',
      isExplicitlyRequested: false,
    };
  }

  let content: string;
  const type = HELP_LEVEL_TYPES[requestedLevel];

  switch (requestedLevel) {
    case 1:
      content = selectRandom(INSIGHT_QUESTIONS[pattern] ?? []) ?? 'What key insight might you be missing?';
      break;
    case 2:
      content = selectRandom(CONCEPTUAL_HINTS[pattern] ?? []) ?? 'Think about the core operation of this pattern.';
      break;
    case 3:
      content = selectRandom(INVARIANT_CONDITIONS[pattern] ?? []) ?? 'What property must hold throughout your algorithm?';
      break;
    case 4:
      content = STRUCTURAL_SKELETONS[pattern] ?? 'Structure your code with clear initialization, main loop, and result extraction.';
      break;
    case 5:
      // Level 5: Full solution would come from problem.hints or LLM
      content = generateFullSolutionHint(problem);
      break;
    default:
      content = 'No help available for this level.';
  }

  return {
    level: requestedLevel,
    content,
    type,
    isExplicitlyRequested: explicitlyRequested,
  };
}

/**
 * Generate full solution hint (from problem hints or synthesized)
 */
function generateFullSolutionHint(problem: Problem): string {
  // Use problem's built-in hints if available
  if (problem.hints.length > 0) {
    return problem.hints.join('\n\n');
  }

  // Fallback: combine skeleton with invariant
  const pattern = problem.pattern;
  const skeleton = STRUCTURAL_SKELETONS[pattern] ?? '';
  const invariant = selectRandom(INVARIANT_CONDITIONS[pattern] ?? []) ?? '';

  return `Key invariant: ${invariant}\n\nStructure:\n${skeleton}`;
}

// ============ Help Request Validation ============

/**
 * Validate and potentially adjust a help request
 */
export function validateHelpRequest(
  currentLevel: HelpLevel,
  requestedLevel: HelpLevel,
  explicitlyRequested: boolean
): {
  approvedLevel: HelpLevel;
  warning: string | null;
} {
  // Can only go up one level at a time (unless explicitly requesting)
  if (!explicitlyRequested && requestedLevel > currentLevel + 1) {
    return {
      approvedLevel: (currentLevel + 1) as HelpLevel,
      warning: `Advancing to Level ${currentLevel + 1}. Higher levels require explicit request.`,
    };
  }

  // Level 5 requires explicit confirmation
  if (requestedLevel === 5 && !explicitlyRequested) {
    return {
      approvedLevel: 4,
      warning: 'Full solution (Level 5) requires explicit confirmation. Providing Level 4 instead.',
    };
  }

  return {
    approvedLevel: requestedLevel,
    warning: null,
  };
}

// ============ Coach Response Generation ============

/**
 * Generate a coach response for help request
 */
export function generateHelpResponse(
  help: TieredHelp,
  penalty: number,
  warning: string | null
): CoachResponse {
  const levelDescription = HELP_LEVEL_DESCRIPTIONS[help.level];

  let content = `**Help Level ${help.level}** (${levelDescription})`;
  if (warning) {
    content = `${warning}\n\n${content}`;
  }

  return {
    type: 'HINT',
    content,
    questions: [help.content],
    helpLevel: help.level,
    nextAction: 'CONTINUE',
    metadata: {
      stage: 'CODING',
      attemptCount: 0,
      helpUsed: penalty,
      timeElapsed: 0,
    },
  };
}

// ============ Help State Management ============

export interface HelpState {
  readonly currentLevel: HelpLevel;
  readonly history: readonly HelpRequest[];
  readonly totalPenalty: number;
}

/**
 * Create initial help state
 */
export function createInitialHelpState(): HelpState {
  return {
    currentLevel: 1,
    history: [],
    totalPenalty: 0,
  };
}

/**
 * Process a help request and update state
 */
export function processHelpRequest(
  input: HelpGenerationInput,
  currentState: HelpState
): {
  help: TieredHelp;
  updatedState: HelpState;
  warning: string | null;
} {
  const { approvedLevel, warning } = validateHelpRequest(
    currentState.currentLevel,
    input.requestedLevel,
    input.explicitlyRequested
  );

  const adjustedInput = { ...input, requestedLevel: approvedLevel };
  const help = generateHelp(adjustedInput);

  const penalty = HELP_LEVEL_PENALTIES[approvedLevel];
  const request: HelpRequest = {
    currentLevel: currentState.currentLevel,
    requestedLevel: input.requestedLevel,
    reason: null,
    timestamp: new Date(),
  };

  const updatedState: HelpState = {
    currentLevel: approvedLevel,
    history: [...currentState.history, request],
    totalPenalty: currentState.totalPenalty + penalty,
  };

  return { help, updatedState, warning };
}
