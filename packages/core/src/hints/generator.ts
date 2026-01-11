/**
 * Hint Generator
 * Generates progressive, context-aware hints for coding problems
 */

import type { Problem } from '../entities/problem.js';
import type { HintLevel } from '../entities/step.js';
import type { PatternId } from '../entities/pattern.js';

// ============ Types ============

export interface HintGenerationInput {
  readonly problem: Problem;
  readonly hintsUsed: readonly HintLevel[];
  readonly currentCode?: string;
  readonly testFailures?: readonly string[];
  readonly heuristicErrors?: readonly string[];
}

export interface HintGenerationOutput {
  readonly level: HintLevel;
  readonly text: string;
  readonly cost: number;
  readonly remainingBudget: number;
  readonly isLastHint: boolean;
}

export interface HintBudgetState {
  readonly totalBudget: number;
  readonly usedBudget: number;
  readonly remainingBudget: number;
  readonly hintsUsed: number;
  readonly maxHints: number;
  readonly isExhausted: boolean;
}

// ============ Constants ============

/**
 * Maximum hint budget per attempt (in points)
 * Higher hint levels cost more points
 */
export const HINT_BUDGET = 10;

/**
 * Cost per hint level
 * Progressive hints cost more as they reveal more
 */
export const HINT_COSTS: Readonly<Record<HintLevel, number>> = {
  DIRECTIONAL_QUESTION: 1,
  HEURISTIC_HINT: 2,
  CONCEPT_INJECTION: 2,
  MICRO_EXAMPLE: 3,
  PATCH_SNIPPET: 4,
};

/**
 * Hint level order (from least to most revealing)
 */
const HINT_LEVEL_ORDER: readonly HintLevel[] = [
  'DIRECTIONAL_QUESTION',
  'HEURISTIC_HINT',
  'CONCEPT_INJECTION',
  'MICRO_EXAMPLE',
  'PATCH_SNIPPET',
];

// ============ Pattern-Specific Hint Templates ============

interface HintTemplate {
  readonly DIRECTIONAL_QUESTION: string;
  readonly HEURISTIC_HINT: string;
  readonly CONCEPT_INJECTION: string;
  readonly MICRO_EXAMPLE: string;
  readonly PATCH_SNIPPET: string;
}

const PATTERN_HINTS: Readonly<Partial<Record<PatternId, HintTemplate>>> = {
  SLIDING_WINDOW: {
    DIRECTIONAL_QUESTION: 'What data structure would help you track elements in your current window as you iterate?',
    HEURISTIC_HINT: 'Use two pointers (left and right) to define your window boundaries. Expand right to grow, shrink left when constraint violated.',
    CONCEPT_INJECTION: 'The sliding window pattern maintains a window [left, right] over a contiguous subarray. Expand right to grow, contract left when invalid.',
    MICRO_EXAMPLE: `For finding max sum subarray of size k:
- Start: left=0, right=0, sum=arr[0]
- Expand right: sum += arr[++right]
- When window > k: sum -= arr[left++]
- Track max(sum) when window == k`,
    PATCH_SNIPPET: `let left = 0, windowSum = 0;
for (let right = 0; right < nums.length; right++) {
  windowSum += nums[right];
  while (/* window invalid */) {
    windowSum -= nums[left++];
  }
  // Update result
}`,
  },

  TWO_POINTERS: {
    DIRECTIONAL_QUESTION: 'Could you use two pointers starting from different positions to efficiently narrow down to your answer?',
    HEURISTIC_HINT: 'For sorted arrays, start pointers at opposite ends. Move them inward based on comparison with target.',
    CONCEPT_INJECTION: 'Two pointers work on sorted data: left pointer starts at beginning, right at end. Compare sum/product to target and move appropriate pointer.',
    MICRO_EXAMPLE: `For finding pair with target sum in sorted array:
- left=0, right=n-1
- If arr[left]+arr[right] == target: found
- If sum < target: left++
- If sum > target: right--`,
    PATCH_SNIPPET: `let left = 0, right = nums.length - 1;
while (left < right) {
  const sum = nums[left] + nums[right];
  if (sum === target) return [left, right];
  if (sum < target) left++;
  else right--;
}`,
  },

  BINARY_SEARCH: {
    DIRECTIONAL_QUESTION: 'Is there a monotonic property you can exploit to halve your search space each iteration?',
    HEURISTIC_HINT: 'Define left and right boundaries. Compute mid and use a condition to decide which half to search next.',
    CONCEPT_INJECTION: 'Binary search requires sorted data or a monotonic predicate. Each iteration eliminates half the search space by comparing mid to target.',
    MICRO_EXAMPLE: `For finding target in sorted array:
- left=0, right=n-1
- mid = left + (right-left)//2
- If arr[mid] == target: found
- If arr[mid] < target: left = mid+1
- Else: right = mid-1`,
    PATCH_SNIPPET: `let left = 0, right = nums.length - 1;
while (left <= right) {
  const mid = left + Math.floor((right - left) / 2);
  if (nums[mid] === target) return mid;
  if (nums[mid] < target) left = mid + 1;
  else right = mid - 1;
}`,
  },

  DFS: {
    DIRECTIONAL_QUESTION: 'Are you tracking which cells/nodes you\'ve visited? What happens when you reach a dead end?',
    HEURISTIC_HINT: 'Use a visited set or mark cells in-place. When exploring fails, backtrack by undoing your changes.',
    CONCEPT_INJECTION: 'DFS explores one path completely before backtracking. Use recursion or a stack. Mark visited to avoid cycles. Restore state when backtracking.',
    MICRO_EXAMPLE: `For grid DFS:
- Base: out of bounds or visited → return
- Mark current as visited
- Explore 4 directions: dfs(row+1,col), dfs(row-1,col), dfs(row,col+1), dfs(row,col-1)
- Unmark if backtracking (for path finding)`,
    PATCH_SNIPPET: `function dfs(row, col) {
  if (row < 0 || row >= rows || col < 0 || col >= cols) return false;
  if (visited[row][col] || grid[row][col] === blocked) return false;
  visited[row][col] = true;
  // Process current cell
  for (const [dr, dc] of [[0,1],[0,-1],[1,0],[-1,0]]) {
    if (dfs(row + dr, col + dc)) return true;
  }
  // visited[row][col] = false; // Uncomment for backtracking
  return false;
}`,
  },

  BACKTRACKING: {
    DIRECTIONAL_QUESTION: 'When you make a choice, how do you undo it to try another path?',
    HEURISTIC_HINT: 'Build solution incrementally. At each step, make a choice, recurse, then undo (backtrack) to try next choice.',
    CONCEPT_INJECTION: 'Backtracking builds candidates incrementally. For each valid choice: make it, recurse, then undo before trying next choice. Prune invalid branches early.',
    MICRO_EXAMPLE: `For generating combinations:
- If current.length == k: add copy to results
- For each candidate starting at index:
  - current.push(candidate)
  - backtrack(index + 1)
  - current.pop() // Undo choice`,
    PATCH_SNIPPET: `function backtrack(start, current) {
  if (current.length === k) {
    result.push([...current]);
    return;
  }
  for (let i = start; i < n; i++) {
    current.push(nums[i]);    // Make choice
    backtrack(i + 1, current); // Explore
    current.pop();             // Undo choice
  }
}`,
  },

  INTERVAL_MERGING: {
    DIRECTIONAL_QUESTION: 'What if you sorted the intervals first? How would you detect overlaps then?',
    HEURISTIC_HINT: 'Sort by start time. Two intervals overlap if the next starts before the current ends. Merge by extending the end.',
    CONCEPT_INJECTION: 'After sorting by start, iterate and merge: if next interval overlaps current (next.start <= current.end), extend current.end = max(current.end, next.end).',
    MICRO_EXAMPLE: `For merge intervals:
- Sort by start
- result = [first interval]
- For each interval:
  - If overlaps last in result: extend end
  - Else: add new interval
- Overlap: interval.start <= result[-1].end`,
    PATCH_SNIPPET: `intervals.sort((a, b) => a[0] - b[0]);
const merged = [intervals[0]];
for (let i = 1; i < intervals.length; i++) {
  const last = merged[merged.length - 1];
  if (intervals[i][0] <= last[1]) {
    last[1] = Math.max(last[1], intervals[i][1]);
  } else {
    merged.push(intervals[i]);
  }
}`,
  },

  DYNAMIC_PROGRAMMING: {
    DIRECTIONAL_QUESTION: 'Can you break this problem into smaller subproblems? Do any subproblems repeat?',
    HEURISTIC_HINT: 'Define state (what you need to know at each step). Define transition (how to compute current from previous). Use memoization or table.',
    CONCEPT_INJECTION: 'DP = optimal substructure + overlapping subproblems. Define dp[i] as solution for first i elements. Compute dp[i] from dp[0..i-1].',
    MICRO_EXAMPLE: `For max subarray (Kadane's):
- dp[i] = max ending at i
- dp[i] = max(nums[i], dp[i-1] + nums[i])
- Answer = max(dp[0..n-1])
- Optimize: only need previous value`,
    PATCH_SNIPPET: `const dp = new Array(n);
dp[0] = nums[0];
for (let i = 1; i < n; i++) {
  dp[i] = Math.max(nums[i], dp[i-1] + nums[i]);
}
return Math.max(...dp);`,
  },
};

// ============ Default Hints ============

const DEFAULT_HINTS: HintTemplate = {
  DIRECTIONAL_QUESTION: 'Think about what data structure would help you solve this efficiently. What pattern does this problem remind you of?',
  HEURISTIC_HINT: 'Consider the time complexity requirements. Is there a way to avoid nested loops or repeated work?',
  CONCEPT_INJECTION: 'Break down the problem: What are the inputs? What is the expected output? What invariant should hold throughout your solution?',
  MICRO_EXAMPLE: 'Try working through a small example by hand. What steps do you take? Can you translate those steps into code?',
  PATCH_SNIPPET: '// Consider the overall structure:\n// 1. Initialize your data structures\n// 2. Iterate through input\n// 3. Update state based on conditions\n// 4. Return result',
};

// ============ Core Functions ============

/**
 * Get the next hint level for an attempt
 */
export function getNextHintLevel(hintsUsed: readonly HintLevel[]): HintLevel | null {
  const usedCount = hintsUsed.length;
  if (usedCount >= HINT_LEVEL_ORDER.length) {
    return null;
  }
  return HINT_LEVEL_ORDER[usedCount] ?? null;
}

/**
 * Compute the cost of a hint level
 */
export function computeHintCost(level: HintLevel): number {
  return HINT_COSTS[level];
}

/**
 * Check if hint budget is exhausted
 */
export function isHintBudgetExhausted(hintsUsed: readonly HintLevel[]): boolean {
  const usedBudget = hintsUsed.reduce((sum, level) => sum + HINT_COSTS[level], 0);
  const nextLevel = getNextHintLevel(hintsUsed);
  if (!nextLevel) return true;

  const nextCost = HINT_COSTS[nextLevel];
  return usedBudget + nextCost > HINT_BUDGET;
}

/**
 * Get hint budget state for an attempt
 */
export function getHintBudgetState(hintsUsed: readonly HintLevel[]): HintBudgetState {
  const usedBudget = hintsUsed.reduce((sum, level) => sum + HINT_COSTS[level], 0);
  const remainingBudget = HINT_BUDGET - usedBudget;
  const isExhausted = isHintBudgetExhausted(hintsUsed);

  return {
    totalBudget: HINT_BUDGET,
    usedBudget,
    remainingBudget,
    hintsUsed: hintsUsed.length,
    maxHints: HINT_LEVEL_ORDER.length,
    isExhausted,
  };
}

/**
 * Generate a hint for the given context
 * Uses deterministic hints based on pattern, with optional LLM enhancement
 */
export function generateHint(input: HintGenerationInput): HintGenerationOutput | null {
  const { problem, hintsUsed } = input;

  // Check if more hints are available
  const nextLevel = getNextHintLevel(hintsUsed);
  if (!nextLevel) {
    return null;
  }

  // Check budget
  if (isHintBudgetExhausted(hintsUsed)) {
    return null;
  }

  // Get pattern-specific hints or fall back to defaults
  const patternHints = PATTERN_HINTS[problem.pattern];
  const hintTemplate = patternHints ?? DEFAULT_HINTS;

  // Use problem's built-in hints if available and at appropriate level
  let hintText: string;

  // For higher levels, use problem-specific hints if available
  if (nextLevel === 'MICRO_EXAMPLE' || nextLevel === 'PATCH_SNIPPET') {
    const hintIndex = hintsUsed.length;
    if (problem.hints[hintIndex]) {
      hintText = problem.hints[hintIndex];
    } else {
      hintText = hintTemplate[nextLevel];
    }
  } else {
    hintText = hintTemplate[nextLevel];
  }

  // Calculate remaining budget after this hint
  const cost = HINT_COSTS[nextLevel];
  const usedBudget = hintsUsed.reduce((sum, level) => sum + HINT_COSTS[level], 0);
  const remainingBudget = HINT_BUDGET - usedBudget - cost;

  // Check if this is the last available hint
  const newHintsUsed = [...hintsUsed, nextLevel];
  const isLastHint = getNextHintLevel(newHintsUsed) === null || isHintBudgetExhausted(newHintsUsed);

  return {
    level: nextLevel,
    text: hintText,
    cost,
    remainingBudget,
    isLastHint,
  };
}
