/**
 * Sample pattern content for testing and seeding.
 */

import type { Pattern } from '../entities/Pattern.js';
import { TenantId, PatternId, Difficulty } from '../entities/types.js';

const DEFAULT_TENANT = TenantId('default');

export const SAMPLE_PATTERNS: Pattern[] = [
  {
    id: PatternId('two-pointers'),
    tenantId: DEFAULT_TENANT,
    name: 'Two Pointers',
    slug: 'two-pointers',
    description: 'Use two iterators to traverse data structures efficiently, often from opposite ends or at different speeds.',
    category: 'Array/String',
    difficulty: Difficulty.EASY,
    timeComplexity: 'O(n)',
    spaceComplexity: 'O(1)',
    primitives: ['left pointer', 'right pointer', 'converge', 'compare'],
    templates: [
      {
        language: 'python',
        code: `def two_pointers(arr):
    left, right = 0, len(arr) - 1
    while left < right:
        # Process elements
        if condition:
            left += 1
        else:
            right -= 1`,
        explanation: 'Initialize pointers at both ends and move them toward each other based on conditions.',
      },
    ],
    variants: [
      { name: 'Opposite Direction', description: 'Pointers start at ends and move toward center', difficulty: Difficulty.EASY },
      { name: 'Same Direction', description: 'Slow and fast pointer moving same direction', difficulty: Difficulty.MEDIUM },
    ],
    commonMistakes: [
      'Off-by-one errors in pointer movement',
      'Not handling duplicates correctly',
      'Infinite loops from incorrect conditions',
    ],
    whenToUse: [
      'Sorted array with target sum',
      'Palindrome checking',
      'Container with most water',
      'Removing duplicates in-place',
    ],
    relatedPatterns: [PatternId('sliding-window'), PatternId('binary-search')],
    createdAt: Date.now(),
    updatedAt: Date.now(),
  },
  {
    id: PatternId('sliding-window'),
    tenantId: DEFAULT_TENANT,
    name: 'Sliding Window',
    slug: 'sliding-window',
    description: 'Maintain a window of elements to track a subset of data, sliding it through the array.',
    category: 'Array/String',
    difficulty: Difficulty.MEDIUM,
    timeComplexity: 'O(n)',
    spaceComplexity: 'O(k) where k is window size',
    primitives: ['window start', 'window end', 'expand', 'contract', 'track state'],
    templates: [
      {
        language: 'python',
        code: `def sliding_window(arr, k):
    window_start = 0
    result = 0
    for window_end in range(len(arr)):
        # Add element to window
        # Shrink window if needed
        while window_too_large:
            # Remove from start
            window_start += 1
        # Update result`,
        explanation: 'Expand window by moving end pointer, shrink by moving start pointer when needed.',
      },
    ],
    variants: [
      { name: 'Fixed Size', description: 'Window size is constant', difficulty: Difficulty.EASY },
      { name: 'Variable Size', description: 'Window grows/shrinks based on conditions', difficulty: Difficulty.MEDIUM },
    ],
    commonMistakes: [
      'Not properly updating window state when shrinking',
      'Incorrect window size calculation',
      'Missing edge cases (empty array, window larger than array)',
    ],
    whenToUse: [
      'Maximum sum subarray of size k',
      'Longest substring with k distinct characters',
      'Minimum window substring',
      'Find all anagrams',
    ],
    relatedPatterns: [PatternId('two-pointers')],
    createdAt: Date.now(),
    updatedAt: Date.now(),
  },
  {
    id: PatternId('binary-search'),
    tenantId: DEFAULT_TENANT,
    name: 'Binary Search',
    slug: 'binary-search',
    description: 'Divide and conquer on sorted data to find elements or boundaries in O(log n) time.',
    category: 'Search',
    difficulty: Difficulty.MEDIUM,
    timeComplexity: 'O(log n)',
    spaceComplexity: 'O(1) iterative, O(log n) recursive',
    primitives: ['left bound', 'right bound', 'mid calculation', 'search space reduction'],
    templates: [
      {
        language: 'python',
        code: `def binary_search(arr, target):
    left, right = 0, len(arr) - 1
    while left <= right:
        mid = left + (right - left) // 2
        if arr[mid] == target:
            return mid
        elif arr[mid] < target:
            left = mid + 1
        else:
            right = mid - 1
    return -1`,
        explanation: 'Repeatedly halve the search space by comparing middle element to target.',
      },
    ],
    variants: [
      { name: 'Standard Search', description: 'Find exact match', difficulty: Difficulty.EASY },
      { name: 'Lower Bound', description: 'Find first occurrence or insertion point', difficulty: Difficulty.MEDIUM },
      { name: 'Search in Rotated', description: 'Binary search in rotated sorted array', difficulty: Difficulty.HARD },
    ],
    commonMistakes: [
      'Integer overflow in mid calculation (use left + (right - left) // 2)',
      'Off-by-one in boundary conditions',
      'Incorrect loop termination condition',
    ],
    whenToUse: [
      'Searching sorted arrays',
      'Finding boundaries',
      'Optimization problems with monotonic property',
      'Square root calculation',
    ],
    relatedPatterns: [PatternId('two-pointers')],
    createdAt: Date.now(),
    updatedAt: Date.now(),
  },
];
