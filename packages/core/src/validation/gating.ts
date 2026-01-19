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
  readonly successReflectionPrompt?: string; // For PROCEED_WITH_REFLECTION
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

  // Require reflection after repeated time budget failures
  {
    id: 'reflection_repeated_time_budget',
    priority: 3,
    condition: (ctx) => {
      const budgetExceeded = ctx.errors.some((e) => e.type === 'TIME_BUDGET_EXCEEDED');
      const previousBudgetFails = ctx.previousFailures.filter((e) => e === 'TIME_BUDGET_EXCEEDED');
      return budgetExceeded && previousBudgetFails.length >= 1;
    },
    action: 'REQUIRE_REFLECTION',
    reason: 'Your solution has exceeded the time budget multiple times. Reflect on your complexity analysis.',
    reflectionType: 'complexity_analysis',
  },

  // Show micro-lesson when time budget is exceeded
  {
    id: 'microlesson_time_budget',
    priority: 8,
    condition: (ctx) => ctx.errors.some((e) => e.type === 'TIME_BUDGET_EXCEEDED'),
    action: 'SHOW_MICRO_LESSON',
    reason: 'Your solution exceeds the expected time complexity. Review efficient patterns.',
    // microLessonId will be set dynamically based on pattern
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

  // Suggest reflection on first successful completion (learning reinforcement)
  {
    id: 'success_reflection_first',
    priority: 95,
    condition: (ctx) => ctx.rubric.grade === 'PASS' && ctx.attemptCount === 1,
    action: 'PROCEED_WITH_REFLECTION',
    reason: 'Great work! Take a moment to reflect on your approach.',
    successReflectionPrompt: 'What key insight helped you solve this problem?',
  },

  // Suggest reflection on higher rungs (more complex problems)
  {
    id: 'success_reflection_high_rung',
    priority: 96,
    condition: (ctx) => ctx.rubric.grade === 'PASS' && ctx.rung >= 3,
    action: 'PROCEED_WITH_REFLECTION',
    reason: 'Excellent! This was a challenging problem. Reflect on your solution.',
    successReflectionPrompt: 'How did you apply the pattern to this advanced problem?',
  },

  // Suggest reflection after multiple attempts but eventual success
  {
    id: 'success_reflection_persistence',
    priority: 97,
    condition: (ctx) => ctx.rubric.grade === 'PASS' && ctx.attemptCount >= 3,
    action: 'PROCEED_WITH_REFLECTION',
    reason: 'You persevered and succeeded! Reflect on what you learned.',
    successReflectionPrompt: 'What did you learn from the earlier failed attempts?',
  },

  // Proceed on PASS (fallback without reflection for simple cases)
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
      // Handle dynamic microLessonId for time budget case
      if (rule.id === 'microlesson_time_budget') {
        microLessonId = `${context.pattern.toLowerCase()}_complexity`;
      }

      return {
        action: rule.action,
        reason: rule.reason,
        microLessonId,
        requiredReflectionType: rule.reflectionType,
        successReflectionPrompt: rule.successReflectionPrompt,
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
    id: 'sliding_window_complexity',
    pattern: 'SLIDING_WINDOW',
    title: 'Achieving O(n) with Sliding Window',
    content: `
Your solution exceeded the time budget, indicating suboptimal complexity.
Sliding window problems can be solved in O(n) by:
1. Using a single pass through the array
2. Updating the window incrementally (add/remove one element at a time)
3. Avoiding nested loops - the inner loop should use while, not for

Common pitfall: Recalculating window properties from scratch instead of updating incrementally.
    `.trim(),
    examples: [
      {
        description: 'Avoid O(n²) nested loops',
        before: `
# O(n²) - Nested loops
for i in range(n):
    for j in range(i, n):  # This creates O(n²)
        process(arr[i:j])
        `.trim(),
        after: `
# O(n) - Single pass with two pointers
left = 0
for right in range(n):
    # Expand window
    add_element(arr[right])
    # Shrink window as needed
    while window_invalid():
        remove_element(arr[left])
        left += 1
        `.trim(),
        explanation: 'Each element is added and removed at most once, giving O(n).',
      },
    ],
    duration: 'SHORT',
  },
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
