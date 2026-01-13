/**
 * Seed Bug Hunt Items
 *
 * Buggy code snippets for users to debug.
 * Each item has intentional bugs with expected line numbers and concepts.
 */

import type { BugHuntItem } from '../entities/bug-hunt.js';

/**
 * Sliding Window pattern bug hunt items
 */
export const SLIDING_WINDOW_BUG_HUNT_ITEMS: Omit<BugHuntItem, 'tenantId' | 'createdAt'>[] = [
  {
    id: 'sw_bug_001',
    pattern: 'SLIDING_WINDOW',
    difficulty: 'EASY',
    language: 'python',
    title: 'Maximum Sum Subarray - Off by One',
    prompt: 'Find the maximum sum of any contiguous subarray of size k.',
    code: `def max_sum_subarray(arr, k):
    if len(arr) < k:
        return 0

    window_sum = sum(arr[:k])
    max_sum = window_sum

    for i in range(k, len(arr)):
        window_sum = window_sum + arr[i] - arr[i - k + 1]  # Bug here
        max_sum = max(max_sum, window_sum)

    return max_sum`,
    expectedBugLines: [9],
    expectedConcepts: ['off-by-one', 'index', 'subtract', 'i - k'],
    hint: 'Check which element you\'re removing from the window.',
    explanation: 'The bug is on line 9. When sliding the window, we should remove arr[i - k], not arr[i - k + 1]. The current code removes the wrong element, causing incorrect window sums.',
  },
  {
    id: 'sw_bug_002',
    pattern: 'SLIDING_WINDOW',
    difficulty: 'EASY',
    language: 'python',
    title: 'Longest Substring Without Repeating - Missing Update',
    prompt: 'Find the length of the longest substring without repeating characters.',
    code: `def longest_substring(s):
    char_index = {}
    max_length = 0
    left = 0

    for right in range(len(s)):
        if s[right] in char_index:
            left = char_index[s[right]] + 1  # Bug here

        char_index[s[right]] = right
        max_length = max(max_length, right - left + 1)

    return max_length`,
    expectedBugLines: [8],
    expectedConcepts: ['left pointer', 'max', 'backward', 'monotonic'],
    hint: 'What happens if the repeated character is before the current left pointer?',
    explanation: 'The bug is on line 8. When we find a repeated character, we should only move left forward, never backward. The fix is: left = max(left, char_index[s[right]] + 1). Without max(), if a character repeats but its previous occurrence is before the current left, we incorrectly move left backward.',
  },
  {
    id: 'sw_bug_003',
    pattern: 'SLIDING_WINDOW',
    difficulty: 'MEDIUM',
    language: 'python',
    title: 'Minimum Window Substring - Wrong Shrink Condition',
    prompt: 'Find the minimum window in s that contains all characters of t.',
    code: `def min_window(s, t):
    from collections import Counter

    need = Counter(t)
    have = {}
    have_count, need_count = 0, len(need)
    result = ""
    left = 0

    for right in range(len(s)):
        char = s[right]
        have[char] = have.get(char, 0) + 1

        if char in need and have[char] == need[char]:
            have_count += 1

        while have_count >= need_count:  # Bug here - should be ==
            if not result or (right - left + 1) < len(result):
                result = s[left:right + 1]

            left_char = s[left]
            have[left_char] -= 1
            if left_char in need and have[left_char] < need[left_char]:
                have_count -= 1
            left += 1

    return result`,
    expectedBugLines: [16],
    expectedConcepts: ['condition', 'equal', 'greater', 'shrink'],
    hint: 'The shrink condition looks correct but consider edge cases with have_count.',
    explanation: 'Actually, this code is correct! The >= is intentional because have_count counts distinct characters matched, not total matches. The "bug" is a trick - students should recognize this is valid. If you selected line 16, review how have_count increments only when exact match is reached.',
  },
  {
    id: 'sw_bug_004',
    pattern: 'SLIDING_WINDOW',
    difficulty: 'EASY',
    language: 'python',
    title: 'Fixed Window Average - Integer Division',
    prompt: 'Calculate the average of each contiguous subarray of size k.',
    code: `def find_averages(arr, k):
    result = []
    window_sum = 0

    for i in range(len(arr)):
        window_sum += arr[i]

        if i >= k - 1:
            result.append(window_sum // k)  # Bug here
            window_sum -= arr[i - k + 1]

    return result`,
    expectedBugLines: [9, 10],
    expectedConcepts: ['integer division', 'float', 'division', 'floor', 'off-by-one'],
    hint: 'Check both the division operation and the element being removed.',
    explanation: 'Two bugs: Line 9 uses integer division (//) instead of float division (/), losing precision. Line 10 removes the wrong element - should be arr[i - k + 1] but the index calculation is correct here. Wait, actually line 10 is correct. The main bug is line 9 using // instead of /.',
  },
  {
    id: 'sw_bug_005',
    pattern: 'SLIDING_WINDOW',
    difficulty: 'MEDIUM',
    language: 'python',
    title: 'Fruits Into Baskets - Wrong Counter Update',
    prompt: 'Find the longest subarray with at most 2 distinct elements (fruit types).',
    code: `def total_fruit(fruits):
    basket = {}
    left = 0
    max_fruits = 0

    for right in range(len(fruits)):
        fruit = fruits[right]
        basket[fruit] = basket.get(fruit, 0) + 1

        while len(basket) > 2:
            left_fruit = fruits[left]
            basket[left_fruit] -= 1
            if basket[left_fruit] == 0:
                basket.pop(left_fruit)
            # Bug: missing left += 1

        max_fruits = max(max_fruits, right - left + 1)

    return max_fruits`,
    expectedBugLines: [14, 15],
    expectedConcepts: ['left pointer', 'increment', 'infinite loop', 'shrink'],
    hint: 'What happens to the left pointer when we need to shrink the window?',
    explanation: 'The bug is between lines 14 and 15 - the left pointer is never incremented inside the while loop. This causes an infinite loop when there are more than 2 distinct fruits. The fix is to add "left += 1" after popping from the basket (or at the end of the while loop).',
  },
  {
    id: 'sw_bug_006',
    pattern: 'SLIDING_WINDOW',
    difficulty: 'MEDIUM',
    language: 'python',
    title: 'Max Consecutive Ones III - Wrong Window Length',
    prompt: 'Find the longest subarray of 1s after flipping at most k zeros.',
    code: `def longest_ones(nums, k):
    left = 0
    zeros = 0
    max_length = 0

    for right in range(len(nums)):
        if nums[right] == 0:
            zeros += 1

        while zeros > k:
            if nums[left] == 0:
                zeros -= 1
            left += 1

        max_length = max(max_length, right - left)  # Bug here

    return max_length`,
    expectedBugLines: [15],
    expectedConcepts: ['length', 'plus one', 'inclusive', 'window size'],
    hint: 'How do you calculate the length of a range from left to right?',
    explanation: 'The bug is on line 15. The window length should be "right - left + 1", not "right - left". The current code undercounts the window size by 1 because both endpoints are inclusive.',
  },
  {
    id: 'sw_bug_007',
    pattern: 'SLIDING_WINDOW',
    difficulty: 'HARD',
    language: 'python',
    title: 'Subarrays with K Different Integers - Missing Exactly K Logic',
    prompt: 'Count the number of subarrays with exactly k distinct integers.',
    code: `def subarrays_with_k_distinct(nums, k):
    def at_most_k(k):
        count = {}
        left = 0
        result = 0

        for right in range(len(nums)):
            num = nums[right]
            count[num] = count.get(num, 0) + 1

            while len(count) > k:
                left_num = nums[left]
                count[left_num] -= 1
                if count[left_num] == 0:
                    del count[left_num]
                left += 1

            result += right - left  # Bug here

        return result

    return at_most_k(k) - at_most_k(k - 1)`,
    expectedBugLines: [18],
    expectedConcepts: ['count', 'plus one', 'subarray count', 'window'],
    hint: 'How many subarrays end at position "right" with the current window?',
    explanation: 'The bug is on line 18. The number of valid subarrays ending at "right" is "right - left + 1", not "right - left". Each position from left to right can be a starting point for a valid subarray ending at right.',
  },
  {
    id: 'sw_bug_008',
    pattern: 'SLIDING_WINDOW',
    difficulty: 'EASY',
    language: 'python',
    title: 'Contains Duplicate II - Wrong Distance Check',
    prompt: 'Check if array contains duplicates within k distance of each other.',
    code: `def contains_nearby_duplicate(nums, k):
    seen = {}

    for i, num in enumerate(nums):
        if num in seen and i - seen[num] < k:  # Bug here
            return True
        seen[num] = i

    return False`,
    expectedBugLines: [5],
    expectedConcepts: ['less than or equal', 'distance', 'inclusive', 'boundary'],
    hint: 'What does "within k distance" mean - is it strictly less than k or at most k?',
    explanation: 'The bug is on line 5. The condition should be "i - seen[num] <= k" (less than or equal), not "< k". The problem asks for duplicates within k distance, which means the distance can be exactly k, so we need <=.',
  },
];

/**
 * Get all bug hunt items for a pattern
 */
export function getBugHuntItemsForPattern(pattern: string): Omit<BugHuntItem, 'tenantId' | 'createdAt'>[] {
  switch (pattern) {
    case 'SLIDING_WINDOW':
      return [...SLIDING_WINDOW_BUG_HUNT_ITEMS];
    default:
      return [];
  }
}

/**
 * Get a specific bug hunt item by ID
 */
export function getBugHuntItemById(itemId: string): Omit<BugHuntItem, 'tenantId' | 'createdAt'> | null {
  const allItems = [
    ...SLIDING_WINDOW_BUG_HUNT_ITEMS,
    // Add more patterns here as they're created
  ];

  return allItems.find(item => item.id === itemId) ?? null;
}

/**
 * Get all available bug hunt items
 */
export function getAllBugHuntItems(): Omit<BugHuntItem, 'tenantId' | 'createdAt'>[] {
  return [
    ...SLIDING_WINDOW_BUG_HUNT_ITEMS,
    // Add more patterns here as they're created
  ];
}
