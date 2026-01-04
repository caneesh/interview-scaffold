/**
 * Micro-Lesson Gating Rules
 * Pure TypeScript - deterministic decision making
 */

import type {
  GatingDecision,
  GatingAction,
  ErrorEvent,
  ErrorType,
  RubricResult,
  RubricGrade,
} from './types.js';
import type { PatternId } from '../entities/pattern.js';

// ============ Gating Rule Definitions ============

export interface GatingRule {
  readonly id: string;
  readonly priority: number; // Lower = higher priority
  readonly condition: (context: GatingContext) => boolean;
  readonly action: GatingAction;
  readonly reason: string;
  readonly microLessonId?: string;
  readonly reflectionType?: string;
}

export interface GatingContext {
  readonly pattern: PatternId;
  readonly rung: number;
  readonly rubric: RubricResult;
  readonly errors: readonly ErrorEvent[];
  readonly attemptCount: number;
  readonly hintsUsed: number;
  readonly previousFailures: readonly ErrorType[];
}

// ============ Standard Gating Rules ============

const GATING_RULES: GatingRule[] = [
  // Block if forbidden concepts detected
  {
    id: 'block_forbidden',
    priority: 1,
    condition: (ctx) => ctx.errors.some((e) => e.type === 'FORBIDDEN_CONCEPT' && e.severity === 'ERROR'),
    action: 'BLOCK_SUBMISSION',
    reason: 'Forbidden concept detected - solution approach is not allowed for this problem.',
  },

  // Show micro-lesson for nested loops in sliding window
  {
    id: 'microlesson_nested_loops',
    priority: 10,
    condition: (ctx) =>
      ctx.pattern === 'SLIDING_WINDOW' &&
      ctx.errors.some((e) => e.type === 'NESTED_LOOPS_DETECTED'),
    action: 'SHOW_MICRO_LESSON',
    reason: 'Detected O(n²) approach. Review sliding window fundamentals.',
    microLessonId: 'sliding_window_intro',
  },

  // Show micro-lesson for wrong shrink mechanism
  {
    id: 'microlesson_shrink',
    priority: 11,
    condition: (ctx) =>
      ctx.pattern === 'SLIDING_WINDOW' &&
      ctx.errors.some((e) => e.type === 'WRONG_SHRINK_MECHANISM'),
    action: 'SHOW_MICRO_LESSON',
    reason: 'Window shrinking should use while-loop, not if-statement.',
    microLessonId: 'sliding_window_shrink',
  },

  // Show micro-lesson for missing visited in DFS
  {
    id: 'microlesson_visited',
    priority: 12,
    condition: (ctx) =>
      ctx.pattern === 'DFS' &&
      ctx.errors.some((e) => e.type === 'MISSING_VISITED_CHECK'),
    action: 'SHOW_MICRO_LESSON',
    reason: 'DFS requires tracking visited nodes to avoid cycles.',
    microLessonId: 'dfs_visited_tracking',
  },

  // Show micro-lesson for missing backtrack
  {
    id: 'microlesson_backtrack',
    priority: 13,
    condition: (ctx) =>
      ctx.pattern === 'DFS' &&
      ctx.errors.some((e) => e.type === 'MISSING_BACKTRACK'),
    action: 'SHOW_MICRO_LESSON',
    reason: 'DFS path problems require backtracking after exploration.',
    microLessonId: 'dfs_backtracking',
  },

  // Require reflection after repeated same error
  {
    id: 'reflection_repeated_error',
    priority: 20,
    condition: (ctx) => {
      const currentErrors = new Set(ctx.errors.map((e) => e.type));
      const repeatedErrors = ctx.previousFailures.filter((e) => currentErrors.has(e));
      return repeatedErrors.length >= 2;
    },
    action: 'REQUIRE_REFLECTION',
    reason: 'Same error type occurred multiple times. Reflect on the pattern.',
    reflectionType: 'error_analysis',
  },

  // Require reflection after FAIL grade
  {
    id: 'reflection_fail',
    priority: 25,
    condition: (ctx) => ctx.rubric.grade === 'FAIL',
    action: 'REQUIRE_REFLECTION',
    reason: 'Submission did not pass. Reflect before retrying.',
    reflectionType: 'failure_analysis',
  },

  // Show micro-lesson after 3+ attempts (higher priority than reflection)
  {
    id: 'microlesson_struggle',
    priority: 22,
    condition: (ctx: GatingContext) => ctx.attemptCount >= 3 && ctx.rubric.grade !== 'PASS',
    action: 'SHOW_MICRO_LESSON',
    reason: 'Multiple attempts detected. Review the pattern fundamentals.',
    // microLessonId will be set dynamically based on pattern
  },

  // Proceed on PASS
  {
    id: 'proceed_pass',
    priority: 100,
    condition: (ctx) => ctx.rubric.grade === 'PASS',
    action: 'PROCEED',
    reason: 'All tests passed. Proceeding to next step.',
  },

  // Proceed on PARTIAL with few hints
  {
    id: 'proceed_partial',
    priority: 101,
    condition: (ctx) => ctx.rubric.grade === 'PARTIAL' && ctx.hintsUsed <= 2,
    action: 'PROCEED',
    reason: 'Partial credit achieved. Consider reviewing failing cases.',
  },

  // Default: require reflection
  {
    id: 'default_reflection',
    priority: 999,
    condition: () => true,
    action: 'REQUIRE_REFLECTION',
    reason: 'Submission needs improvement. Reflect on your approach.',
    reflectionType: 'general',
  },
];

// ============ Gating Decision Function ============

export function makeGatingDecision(context: GatingContext): GatingDecision {
  // Sort rules by priority
  const sortedRules = [...GATING_RULES].sort((a, b) => a.priority - b.priority);

  // Find first matching rule
  for (const rule of sortedRules) {
    if (rule.condition(context)) {
      // Handle dynamic microLessonId for struggle case
      let microLessonId = rule.microLessonId;
      if (rule.id === 'microlesson_struggle') {
        microLessonId = `${context.pattern.toLowerCase()}_fundamentals`;
      }

      return {
        action: rule.action,
        reason: rule.reason,
        microLessonId,
        requiredReflectionType: rule.reflectionType,
      };
    }
  }

  // Fallback (should never reach due to default rule)
  return {
    action: 'REQUIRE_REFLECTION',
    reason: 'Unknown state. Please reflect on your approach.',
    requiredReflectionType: 'general',
  };
}

// ============ Micro-Lesson Definitions ============

export interface GatingMicroLesson {
  readonly id: string;
  readonly pattern: PatternId;
  readonly title: string;
  readonly content: string;
  readonly examples: readonly MicroLessonExample[];
  readonly duration: 'SHORT' | 'MEDIUM' | 'LONG';
}

export interface MicroLessonExample {
  readonly description: string;
  readonly before: string;
  readonly after: string;
  readonly explanation: string;
}

export const MICRO_LESSONS: readonly GatingMicroLesson[] = [
  {
    id: 'sliding_window_intro',
    pattern: 'SLIDING_WINDOW',
    title: 'Sliding Window Fundamentals',
    content: `
The sliding window pattern maintains a window of elements and slides it across the array.
Key insight: Instead of recalculating the window from scratch, update incrementally.

Time complexity: O(n) - each element is visited at most twice.
    `.trim(),
    examples: [
      {
        description: 'Max sum of k consecutive elements',
        before: `
# O(n*k) - Brute force
for i in range(n - k + 1):
    current_sum = sum(arr[i:i+k])  # Recalculates each time
    max_sum = max(max_sum, current_sum)
        `.trim(),
        after: `
# O(n) - Sliding window
window_sum = sum(arr[:k])
max_sum = window_sum
for i in range(k, n):
    window_sum += arr[i] - arr[i-k]  # Slide the window
    max_sum = max(max_sum, window_sum)
        `.trim(),
        explanation: 'Add the new element, remove the old one.',
      },
    ],
    duration: 'SHORT',
  },
  {
    id: 'sliding_window_shrink',
    pattern: 'SLIDING_WINDOW',
    title: 'Window Shrinking with While Loop',
    content: `
When the window violates a constraint, shrink it using a WHILE loop, not IF.
The window may need to shrink multiple times to satisfy the constraint.
    `.trim(),
    examples: [
      {
        description: 'Smallest subarray with sum >= target',
        before: `
# WRONG - if only shrinks once
if window_sum >= target:
    result = min(result, right - left + 1)
    window_sum -= arr[left]
    left += 1
        `.trim(),
        after: `
# CORRECT - while shrinks as needed
while window_sum >= target:
    result = min(result, right - left + 1)
    window_sum -= arr[left]
    left += 1
        `.trim(),
        explanation: 'Multiple elements may need to be removed to find the minimum.',
      },
    ],
    duration: 'SHORT',
  },
  {
    id: 'dfs_visited_tracking',
    pattern: 'DFS',
    title: 'Tracking Visited Nodes',
    content: `
DFS on graphs/grids must track visited nodes to avoid infinite loops.
Methods: visited set, modify grid in-place, or separate boolean array.
    `.trim(),
    examples: [
      {
        description: 'Island counting',
        before: `
# WRONG - no visited tracking, infinite loop
def dfs(grid, r, c):
    if r < 0 or c < 0 or r >= len(grid) or c >= len(grid[0]):
        return
    if grid[r][c] == '0':
        return
    dfs(grid, r+1, c)  # Will revisit same cell!
    dfs(grid, r-1, c)
    dfs(grid, r, c+1)
    dfs(grid, r, c-1)
        `.trim(),
        after: `
# CORRECT - mark as visited
def dfs(grid, r, c):
    if r < 0 or c < 0 or r >= len(grid) or c >= len(grid[0]):
        return
    if grid[r][c] == '0':
        return
    grid[r][c] = '0'  # Mark visited
    dfs(grid, r+1, c)
    dfs(grid, r-1, c)
    dfs(grid, r, c+1)
    dfs(grid, r, c-1)
        `.trim(),
        explanation: 'Mark cell as visited before exploring neighbors.',
      },
    ],
    duration: 'SHORT',
  },
  {
    id: 'dfs_backtracking',
    pattern: 'DFS',
    title: 'Backtracking in DFS',
    content: `
When building paths or permutations, undo changes after the recursive call.
This allows exploring other branches of the search tree.
    `.trim(),
    examples: [
      {
        description: 'Finding all paths',
        before: `
# WRONG - no backtrack
def dfs(path, node):
    path.append(node)
    if is_goal(node):
        result.append(path[:])
        return
    for neighbor in get_neighbors(node):
        dfs(path, neighbor)
    # path still contains node!
        `.trim(),
        after: `
# CORRECT - backtrack after exploration
def dfs(path, node):
    path.append(node)
    if is_goal(node):
        result.append(path[:])
    else:
        for neighbor in get_neighbors(node):
            dfs(path, neighbor)
    path.pop()  # Backtrack
        `.trim(),
        explanation: 'Remove node from path after exploring all its branches.',
      },
    ],
    duration: 'SHORT',
  },
];

export function getMicroLesson(id: string): GatingMicroLesson | undefined {
  return MICRO_LESSONS.find((lesson) => lesson.id === id);
}
