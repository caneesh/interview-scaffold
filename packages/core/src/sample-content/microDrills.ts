/**
 * Sample micro drill content for testing and seeding.
 */

import type { MicroDrill } from '../entities/MicroDrill.js';
import { TenantId, PatternId, MicroDrillId, Difficulty, DrillType } from '../entities/types.js';

const DEFAULT_TENANT = TenantId('default');

export const SAMPLE_MICRO_DRILLS: MicroDrill[] = [
  {
    id: MicroDrillId('drill-tp-001'),
    tenantId: DEFAULT_TENANT,
    patternId: PatternId('two-pointers'),
    type: DrillType.PATTERN_RECOGNITION,
    difficulty: Difficulty.EASY,
    title: 'Identify Two Pointers',
    description: 'Recognize when to apply the two pointers pattern.',
    prompt: 'Which approach would be most efficient for finding two numbers in a sorted array that sum to a target?',
    codeSnippet: null,
    options: [
      { id: 'a', text: 'Nested loops checking all pairs', isCorrect: false, feedback: 'This works but is O(n²). There\'s a more efficient approach for sorted arrays.' },
      { id: 'b', text: 'Hash set for complement lookup', isCorrect: false, feedback: 'Good thinking! This is O(n) but uses O(n) space. Since the array is sorted, we can do better.' },
      { id: 'c', text: 'Two pointers from opposite ends', isCorrect: true, feedback: 'Correct! With sorted data, two pointers gives O(n) time and O(1) space.' },
      { id: 'd', text: 'Binary search for each element', isCorrect: false, feedback: 'This would be O(n log n). Two pointers is more efficient here.' },
    ],
    expectedAnswer: 'c',
    hints: ['The array is already sorted.', 'Think about how the sum changes as you move pointers.'],
    explanation: 'In a sorted array, two pointers from opposite ends can efficiently find pairs. If sum is too small, move left pointer right. If too large, move right pointer left.',
    timeBudgetSec: 60,
    tags: ['sorted-array', 'pair-sum'],
    order: 1,
    published: true,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  },
  {
    id: MicroDrillId('drill-tp-002'),
    tenantId: DEFAULT_TENANT,
    patternId: PatternId('two-pointers'),
    type: DrillType.CODE_COMPLETION,
    difficulty: Difficulty.EASY,
    title: 'Complete Two Sum II',
    description: 'Fill in the missing parts of a two pointer solution.',
    prompt: 'Complete the function to find indices of two numbers that add up to target in a sorted array.',
    codeSnippet: {
      language: 'python',
      code: `def two_sum(nums, target):
    left, right = 0, len(nums) - 1
    while left < right:
        current_sum = nums[left] + nums[right]
        if current_sum == target:
            return [left, right]
        elif current_sum < target:
            # What should happen here?
            _______________
        else:
            # What should happen here?
            _______________
    return []`,
      highlightLines: [8, 11],
    },
    options: null,
    expectedAnswer: 'left += 1\nright -= 1',
    hints: ['If sum is too small, we need a larger value.', 'If sum is too large, we need a smaller value.'],
    explanation: 'When sum < target, move left pointer right to increase sum. When sum > target, move right pointer left to decrease sum.',
    timeBudgetSec: 120,
    tags: ['sorted-array', 'implementation'],
    order: 2,
    published: true,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  },
  {
    id: MicroDrillId('drill-sw-001'),
    tenantId: DEFAULT_TENANT,
    patternId: PatternId('sliding-window'),
    type: DrillType.PATTERN_RECOGNITION,
    difficulty: Difficulty.MEDIUM,
    title: 'Identify Sliding Window',
    description: 'Recognize when sliding window is the optimal approach.',
    prompt: 'You need to find the maximum sum of any contiguous subarray of size k. Which pattern fits best?',
    codeSnippet: null,
    options: [
      { id: 'a', text: 'Dynamic Programming', isCorrect: false, feedback: 'DP would work but is overkill for fixed window size problems.' },
      { id: 'b', text: 'Two Pointers', isCorrect: false, feedback: 'Close! Sliding window is related but more specific for this problem.' },
      { id: 'c', text: 'Sliding Window', isCorrect: true, feedback: 'Correct! Fixed-size sliding window is perfect for contiguous subarray problems.' },
      { id: 'd', text: 'Prefix Sum', isCorrect: false, feedback: 'Prefix sum works but sliding window is more efficient for this specific problem.' },
    ],
    expectedAnswer: 'c',
    hints: ['The subarray must be contiguous.', 'The size is fixed at k.'],
    explanation: 'Sliding window is ideal for fixed-size contiguous subarray problems. Maintain a window of size k, slide it through the array, updating the sum incrementally.',
    timeBudgetSec: 60,
    tags: ['subarray', 'fixed-window'],
    order: 1,
    published: true,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  },
  {
    id: MicroDrillId('drill-bs-001'),
    tenantId: DEFAULT_TENANT,
    patternId: PatternId('binary-search'),
    type: DrillType.COMPLEXITY_ANALYSIS,
    difficulty: Difficulty.EASY,
    title: 'Binary Search Complexity',
    description: 'Analyze the time complexity of binary search.',
    prompt: 'What is the time complexity of binary search on a sorted array of n elements?',
    codeSnippet: null,
    options: [
      { id: 'a', text: 'O(n)', isCorrect: false, feedback: 'Linear search is O(n), but binary search is faster.' },
      { id: 'b', text: 'O(log n)', isCorrect: true, feedback: 'Correct! Binary search halves the search space each iteration.' },
      { id: 'c', text: 'O(n log n)', isCorrect: false, feedback: 'This is typically sorting complexity, not search.' },
      { id: 'd', text: 'O(1)', isCorrect: false, feedback: 'Constant time would require direct access like a hash table.' },
    ],
    expectedAnswer: 'b',
    hints: ['How many times can you halve n before reaching 1?', 'Think about the number of iterations.'],
    explanation: 'Binary search halves the search space each iteration. Starting with n elements, after k iterations we have n/2^k elements. We stop when this equals 1, giving k = log₂(n).',
    timeBudgetSec: 45,
    tags: ['complexity', 'logarithmic'],
    order: 1,
    published: true,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  },
  {
    id: MicroDrillId('drill-tp-003'),
    tenantId: DEFAULT_TENANT,
    patternId: PatternId('two-pointers'),
    type: DrillType.BUG_FIX,
    difficulty: Difficulty.MEDIUM,
    title: 'Fix Two Pointers Bug',
    description: 'Identify and fix the bug in this two pointer implementation.',
    prompt: 'This code should check if a string is a palindrome, but it has a bug. What\'s wrong?',
    codeSnippet: {
      language: 'python',
      code: `def is_palindrome(s):
    left, right = 0, len(s)  # Bug is here!
    while left < right:
        if s[left] != s[right]:
            return False
        left += 1
        right -= 1
    return True`,
      highlightLines: [2],
    },
    options: [
      { id: 'a', text: 'right should be len(s) - 1', isCorrect: true, feedback: 'Correct! len(s) is out of bounds. The last valid index is len(s) - 1.' },
      { id: 'b', text: 'while condition should be left <= right', isCorrect: false, feedback: 'The while condition is fine. Look at the initial value of right.' },
      { id: 'c', text: 'Need to convert to lowercase first', isCorrect: false, feedback: 'That might be needed for case-insensitivity, but isn\'t the bug causing the crash.' },
      { id: 'd', text: 'Should use left + 1 and right - 1 in comparison', isCorrect: false, feedback: 'The comparison indices are correct. Check the initialization.' },
    ],
    expectedAnswer: 'a',
    hints: ['What happens when you access s[len(s)]?', 'Think about valid indices in Python.'],
    explanation: 'In Python, valid indices for a string of length n are 0 to n-1. len(s) would cause an IndexError. Initialize right = len(s) - 1.',
    timeBudgetSec: 90,
    tags: ['off-by-one', 'debugging'],
    order: 3,
    published: true,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  },
];
