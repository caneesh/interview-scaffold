/**
 * Seed script for demo problems
 * Run with: npx tsx scripts/seed.ts
 */

import { config } from 'dotenv';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { randomUUID } from 'crypto';

// Load .env file
config();

// Inline schema definitions to avoid import issues
const createSchema = () => {
  const { pgTable, text, integer, timestamp, jsonb, uuid, index } = require('drizzle-orm/pg-core');

  const tenants = pgTable('tenants', {
    id: uuid('id').primaryKey().defaultRandom(),
    name: text('name').notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  });

  const problems = pgTable('problems', {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id').notNull(),
    title: text('title').notNull(),
    statement: text('statement').notNull(),
    pattern: text('pattern').notNull(),
    rung: integer('rung').notNull(),
    targetComplexity: text('target_complexity').notNull(),
    testCases: jsonb('test_cases').notNull(),
    hints: jsonb('hints').notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  });

  const skills = pgTable('skills', {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id').notNull(),
    userId: text('user_id').notNull(),
    pattern: text('pattern').notNull(),
    rung: integer('rung').notNull(),
    score: integer('score').notNull().default(0),
    attemptsCount: integer('attempts_count').notNull().default(0),
    lastAttemptAt: timestamp('last_attempt_at'),
    unlockedAt: timestamp('unlocked_at'),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  });

  return { tenants, problems, skills };
};

interface TestCase {
  input: string;
  expectedOutput: string;
  isHidden: boolean;
  explanation?: string;
}

interface Problem {
  title: string;
  statement: string;
  pattern: string;
  rung: number;
  targetComplexity: string;
  testCases: TestCase[];
  hints: string[];
}

const DEMO_PROBLEMS: Problem[] = [
  // SLIDING_WINDOW - Rung 1
  {
    title: 'Maximum Sum Subarray of Size K',
    statement: `Given an array of integers and a number k, find the maximum sum of a subarray of size k.

Example:
Input: arr = [2, 1, 5, 1, 3, 2], k = 3
Output: 9
Explanation: Subarray [5, 1, 3] has the maximum sum of 9.

Constraints:
- 1 <= k <= arr.length <= 10^5
- -10^4 <= arr[i] <= 10^4`,
    pattern: 'SLIDING_WINDOW',
    rung: 1,
    targetComplexity: 'O(n)',
    testCases: [
      { input: '[[2, 1, 5, 1, 3, 2], 3]', expectedOutput: '9', isHidden: false, explanation: 'Subarray [5, 1, 3]' },
      { input: '[[2, 3, 4, 1, 5], 2]', expectedOutput: '7', isHidden: false, explanation: 'Subarray [3, 4]' },
      { input: '[[1, 1, 1, 1, 1], 3]', expectedOutput: '3', isHidden: false },
      { input: '[[-1, -2, -3, -4], 2]', expectedOutput: '-3', isHidden: true, explanation: 'Handle negatives' },
      { input: '[[5], 1]', expectedOutput: '5', isHidden: true, explanation: 'Single element' },
    ],
    hints: [
      'What if you calculated the sum of the first k elements first?',
      'When sliding the window, you add one element and remove one element.',
      'Keep track of the current window sum and update max as you slide.',
      'Example: For [2,1,5,1,3,2] k=3, start with sum=2+1+5=8, then slide: 8-2+1=7, 7-1+3=9...',
      'windowSum = windowSum - arr[i-k] + arr[i]; maxSum = Math.max(maxSum, windowSum);',
    ],
  },
  // SLIDING_WINDOW - Rung 2
  {
    title: 'Longest Substring Without Repeating Characters',
    statement: `Given a string s, find the length of the longest substring without repeating characters.

Example 1:
Input: s = "abcabcbb"
Output: 3
Explanation: The answer is "abc", with length 3.

Example 2:
Input: s = "bbbbb"
Output: 1
Explanation: The answer is "b", with length 1.

Constraints:
- 0 <= s.length <= 5 * 10^4
- s consists of English letters, digits, symbols and spaces.`,
    pattern: 'SLIDING_WINDOW',
    rung: 2,
    targetComplexity: 'O(n)',
    testCases: [
      { input: '"abcabcbb"', expectedOutput: '3', isHidden: false },
      { input: '"bbbbb"', expectedOutput: '1', isHidden: false },
      { input: '"pwwkew"', expectedOutput: '3', isHidden: false },
      { input: '""', expectedOutput: '0', isHidden: true },
      { input: '" "', expectedOutput: '1', isHidden: true },
    ],
    hints: [
      'Can you use a Set or Map to track characters in the current window?',
      'When you find a duplicate, shrink the window from the left.',
      'The window [left, right] should always contain unique characters.',
      'Use a Map to store the last index of each character for O(1) updates.',
      'When char at right exists in map and index >= left, move left to map[char] + 1',
    ],
  },
  // TWO_POINTERS - Rung 1
  {
    title: 'Two Sum II - Sorted Array',
    statement: `Given a 1-indexed array of integers that is already sorted in non-decreasing order, find two numbers such that they add up to a specific target number.

Return the indices of the two numbers (1-indexed) as an array [index1, index2].

You may not use the same element twice.

Example:
Input: numbers = [2, 7, 11, 15], target = 9
Output: [1, 2]
Explanation: 2 + 7 = 9, so index1 = 1, index2 = 2.

Constraints:
- 2 <= numbers.length <= 3 * 10^4
- -1000 <= numbers[i] <= 1000
- numbers is sorted in non-decreasing order
- Exactly one solution exists`,
    pattern: 'TWO_POINTERS',
    rung: 1,
    targetComplexity: 'O(n)',
    testCases: [
      { input: '[[2, 7, 11, 15], 9]', expectedOutput: '[1, 2]', isHidden: false },
      { input: '[[2, 3, 4], 6]', expectedOutput: '[1, 3]', isHidden: false },
      { input: '[[-1, 0], -1]', expectedOutput: '[1, 2]', isHidden: false },
      { input: '[[1, 2, 3, 4, 5], 9]', expectedOutput: '[4, 5]', isHidden: true },
      { input: '[[5, 25, 75], 100]', expectedOutput: '[2, 3]', isHidden: true },
    ],
    hints: [
      'Since the array is sorted, what does it mean if the sum is too large or too small?',
      'Start with pointers at both ends of the array.',
      'If sum > target, move the right pointer left. If sum < target, move the left pointer right.',
      'The invariant: all pairs (i, j) where j > right or i < left have been eliminated.',
      'while (left < right) { if (sum === target) return; else if (sum < target) left++; else right--; }',
    ],
  },
  // TWO_POINTERS - Rung 2
  {
    title: 'Container With Most Water',
    statement: `You are given an integer array height of length n. There are n vertical lines drawn such that the two endpoints of the ith line are (i, 0) and (i, height[i]).

Find two lines that together with the x-axis form a container that holds the most water.

Return the maximum amount of water a container can store.

Example:
Input: height = [1, 8, 6, 2, 5, 4, 8, 3, 7]
Output: 49
Explanation: The max area is between lines at index 1 and 8, with height 7 and width 7.

Constraints:
- 2 <= height.length <= 10^5
- 0 <= height[i] <= 10^4`,
    pattern: 'TWO_POINTERS',
    rung: 2,
    targetComplexity: 'O(n)',
    testCases: [
      { input: '[1, 8, 6, 2, 5, 4, 8, 3, 7]', expectedOutput: '49', isHidden: false },
      { input: '[1, 1]', expectedOutput: '1', isHidden: false },
      { input: '[4, 3, 2, 1, 4]', expectedOutput: '16', isHidden: false },
      { input: '[1, 2, 1]', expectedOutput: '2', isHidden: true },
      { input: '[2, 3, 4, 5, 18, 17, 6]', expectedOutput: '17', isHidden: true },
    ],
    hints: [
      'The area is determined by the shorter line. Why?',
      'Start with the widest container (pointers at both ends).',
      'Moving the pointer at the shorter line might find a taller line.',
      'Moving the pointer at the taller line can only decrease or maintain width, never increase height.',
      'Always move the pointer pointing to the shorter line inward.',
    ],
  },
  // BINARY_SEARCH - Rung 1
  {
    title: 'Binary Search',
    statement: `Given a sorted array of integers nums and an integer target, return the index of target if found, otherwise return -1.

You must write an algorithm with O(log n) runtime complexity.

Example 1:
Input: nums = [-1, 0, 3, 5, 9, 12], target = 9
Output: 4

Example 2:
Input: nums = [-1, 0, 3, 5, 9, 12], target = 2
Output: -1

Constraints:
- 1 <= nums.length <= 10^4
- -10^4 < nums[i], target < 10^4
- All integers in nums are unique
- nums is sorted in ascending order`,
    pattern: 'BINARY_SEARCH',
    rung: 1,
    targetComplexity: 'O(log n)',
    testCases: [
      { input: '[[-1, 0, 3, 5, 9, 12], 9]', expectedOutput: '4', isHidden: false },
      { input: '[[-1, 0, 3, 5, 9, 12], 2]', expectedOutput: '-1', isHidden: false },
      { input: '[[5], 5]', expectedOutput: '0', isHidden: false },
      { input: '[[1, 2, 3], 1]', expectedOutput: '0', isHidden: true },
      { input: '[[1, 2, 3], 3]', expectedOutput: '2', isHidden: true },
    ],
    hints: [
      'Compare the target with the middle element.',
      'If target < middle, search the left half. If target > middle, search the right half.',
      'Be careful with how you calculate mid to avoid integer overflow.',
      'Use mid = left + Math.floor((right - left) / 2) instead of (left + right) / 2',
      'while (left <= right) { mid = left + (right - left) / 2; if (nums[mid] === target) return mid; }',
    ],
  },
  // DFS - Rung 1
  {
    title: 'Maximum Depth of Binary Tree',
    statement: `Given the root of a binary tree, return its maximum depth.

A binary tree's maximum depth is the number of nodes along the longest path from the root node down to the farthest leaf node.

Example 1:
Input: root = [3, 9, 20, null, null, 15, 7]
Output: 3

Example 2:
Input: root = [1, null, 2]
Output: 2

Constraints:
- The number of nodes in the tree is in the range [0, 10^4]
- -100 <= Node.val <= 100`,
    pattern: 'DFS',
    rung: 1,
    targetComplexity: 'O(n)',
    testCases: [
      { input: '[3, 9, 20, null, null, 15, 7]', expectedOutput: '3', isHidden: false },
      { input: '[1, null, 2]', expectedOutput: '2', isHidden: false },
      { input: '[]', expectedOutput: '0', isHidden: false },
      { input: '[1]', expectedOutput: '1', isHidden: true },
      { input: '[1, 2, 3, 4, 5]', expectedOutput: '3', isHidden: true },
    ],
    hints: [
      'The depth of a node is 1 + the maximum depth of its children.',
      'What is the base case? What is the depth of a null node?',
      'Use recursion: maxDepth(node) = 1 + max(maxDepth(left), maxDepth(right))',
      'Handle the null case by returning 0.',
      'return node === null ? 0 : 1 + Math.max(maxDepth(node.left), maxDepth(node.right));',
    ],
  },
  // BFS - Rung 1
  {
    title: 'Binary Tree Level Order Traversal',
    statement: `Given the root of a binary tree, return the level order traversal of its nodes' values (i.e., from left to right, level by level).

Example 1:
Input: root = [3, 9, 20, null, null, 15, 7]
Output: [[3], [9, 20], [15, 7]]

Example 2:
Input: root = [1]
Output: [[1]]

Example 3:
Input: root = []
Output: []

Constraints:
- The number of nodes in the tree is in the range [0, 2000]
- -1000 <= Node.val <= 1000`,
    pattern: 'BFS',
    rung: 1,
    targetComplexity: 'O(n)',
    testCases: [
      { input: '[3, 9, 20, null, null, 15, 7]', expectedOutput: '[[3], [9, 20], [15, 7]]', isHidden: false },
      { input: '[1]', expectedOutput: '[[1]]', isHidden: false },
      { input: '[]', expectedOutput: '[]', isHidden: false },
      { input: '[1, 2, 3, 4, 5]', expectedOutput: '[[1], [2, 3], [4, 5]]', isHidden: true },
    ],
    hints: [
      'Use a queue to process nodes level by level.',
      'At each level, process all nodes currently in the queue before moving to the next level.',
      'Track the size of the queue at the start of each level.',
      'For each level: levelSize = queue.length; for (i = 0; i < levelSize; i++) { process node }',
      'Add children to queue as you process each node, but they will be processed in the next iteration.',
    ],
  },
  // DYNAMIC_PROGRAMMING - Rung 1
  {
    title: 'Climbing Stairs',
    statement: `You are climbing a staircase. It takes n steps to reach the top.

Each time you can either climb 1 or 2 steps. In how many distinct ways can you climb to the top?

Example 1:
Input: n = 2
Output: 2
Explanation: There are two ways: (1+1) and (2).

Example 2:
Input: n = 3
Output: 3
Explanation: There are three ways: (1+1+1), (1+2), and (2+1).

Constraints:
- 1 <= n <= 45`,
    pattern: 'DYNAMIC_PROGRAMMING',
    rung: 1,
    targetComplexity: 'O(n)',
    testCases: [
      { input: '2', expectedOutput: '2', isHidden: false },
      { input: '3', expectedOutput: '3', isHidden: false },
      { input: '4', expectedOutput: '5', isHidden: false },
      { input: '1', expectedOutput: '1', isHidden: true },
      { input: '5', expectedOutput: '8', isHidden: true },
    ],
    hints: [
      'Think about how you can reach step n. From which steps can you get there?',
      'You can reach step n from step n-1 (one step) or step n-2 (two steps).',
      'So ways(n) = ways(n-1) + ways(n-2). This is the Fibonacci sequence!',
      'Base cases: ways(1) = 1, ways(2) = 2',
      'Use iteration instead of recursion to avoid stack overflow: dp[i] = dp[i-1] + dp[i-2]',
    ],
  },
  // PREFIX_SUM - Rung 1
  {
    title: 'Range Sum Query - Immutable',
    statement: `Given an integer array nums, handle multiple queries of the following type:
Calculate the sum of the elements of nums between indices left and right inclusive.

Implement the NumArray class:
- NumArray(int[] nums): Initializes the object with the integer array nums.
- int sumRange(int left, int right): Returns the sum of elements between indices left and right inclusive.

Example:
Input: nums = [-2, 0, 3, -5, 2, -1]
sumRange(0, 2) -> 1
sumRange(2, 5) -> -1
sumRange(0, 5) -> -3

Constraints:
- 1 <= nums.length <= 10^4
- -10^5 <= nums[i] <= 10^5
- 0 <= left <= right < nums.length
- At most 10^4 calls will be made to sumRange`,
    pattern: 'PREFIX_SUM',
    rung: 1,
    targetComplexity: 'O(1) per query',
    testCases: [
      { input: '[[-2, 0, 3, -5, 2, -1], 0, 2]', expectedOutput: '1', isHidden: false },
      { input: '[[-2, 0, 3, -5, 2, -1], 2, 5]', expectedOutput: '-1', isHidden: false },
      { input: '[[-2, 0, 3, -5, 2, -1], 0, 5]', expectedOutput: '-3', isHidden: false },
      { input: '[[1, 2, 3], 0, 0]', expectedOutput: '1', isHidden: true },
      { input: '[[1], 0, 0]', expectedOutput: '1', isHidden: true },
    ],
    hints: [
      'If you had precomputed sum(0, i) for all i, could you answer queries faster?',
      'sum(left, right) = sum(0, right) - sum(0, left-1)',
      'Build a prefix sum array where prefix[i] = sum of nums[0..i-1]',
      'prefix[0] = 0, prefix[i] = prefix[i-1] + nums[i-1]',
      'sumRange(left, right) = prefix[right+1] - prefix[left]',
    ],
  },
  // GREEDY - Rung 1
  {
    title: 'Best Time to Buy and Sell Stock II',
    statement: `You are given an integer array prices where prices[i] is the price of a given stock on the ith day.

On each day, you may decide to buy and/or sell the stock. You can only hold at most one share of the stock at any time. However, you can buy it then immediately sell it on the same day.

Find and return the maximum profit you can achieve.

Example 1:
Input: prices = [7, 1, 5, 3, 6, 4]
Output: 7
Explanation: Buy on day 2 (price=1), sell on day 3 (price=5), profit=4.
Then buy on day 4 (price=3), sell on day 5 (price=6), profit=3. Total=7.

Example 2:
Input: prices = [1, 2, 3, 4, 5]
Output: 4
Explanation: Buy on day 1, sell on day 5, profit=4.

Constraints:
- 1 <= prices.length <= 3 * 10^4
- 0 <= prices[i] <= 10^4`,
    pattern: 'GREEDY',
    rung: 1,
    targetComplexity: 'O(n)',
    testCases: [
      { input: '[7, 1, 5, 3, 6, 4]', expectedOutput: '7', isHidden: false },
      { input: '[1, 2, 3, 4, 5]', expectedOutput: '4', isHidden: false },
      { input: '[7, 6, 4, 3, 1]', expectedOutput: '0', isHidden: false },
      { input: '[1, 2]', expectedOutput: '1', isHidden: true },
      { input: '[2, 1, 2, 0, 1]', expectedOutput: '2', isHidden: true },
    ],
    hints: [
      'You want to capture every upward price movement.',
      'If tomorrow\'s price is higher than today\'s, you should buy today and sell tomorrow.',
      'The greedy approach: add up all positive price differences.',
      'profit += Math.max(0, prices[i] - prices[i-1])',
      'This works because buying/selling on the same day is allowed (you can chain transactions).',
    ],
  },
  // BACKTRACKING - Rung 1
  {
    title: 'Subsets',
    statement: `Given an integer array nums of unique elements, return all possible subsets (the power set).

The solution set must not contain duplicate subsets. Return the solution in any order.

Example 1:
Input: nums = [1, 2, 3]
Output: [[], [1], [2], [1, 2], [3], [1, 3], [2, 3], [1, 2, 3]]

Example 2:
Input: nums = [0]
Output: [[], [0]]

Constraints:
- 1 <= nums.length <= 10
- -10 <= nums[i] <= 10
- All the numbers of nums are unique`,
    pattern: 'BACKTRACKING',
    rung: 1,
    targetComplexity: 'O(n * 2^n)',
    testCases: [
      // Expected outputs match standard backtracking DFS order
      { input: '[[1, 2, 3]]', expectedOutput: '[[], [1], [1, 2], [1, 2, 3], [1, 3], [2], [2, 3], [3]]', isHidden: false },
      { input: '[[0]]', expectedOutput: '[[], [0]]', isHidden: false },
      { input: '[[1, 2]]', expectedOutput: '[[], [1], [1, 2], [2]]', isHidden: false },
      { input: '[[]]', expectedOutput: '[[]]', isHidden: true },
      { input: '[[1, 2, 3, 4]]', expectedOutput: '[[], [1], [1, 2], [1, 2, 3], [1, 2, 3, 4], [1, 2, 4], [1, 3], [1, 3, 4], [1, 4], [2], [2, 3], [2, 3, 4], [2, 4], [3], [3, 4], [4]]', isHidden: true },
    ],
    hints: [
      'Each element can either be included or excluded from a subset.',
      'Use backtracking: at each step, decide to include or skip the current element.',
      'Build the subset incrementally, adding to result when you reach the end.',
      'function backtrack(start, current) { result.push([...current]); for (i = start; i < nums.length; i++) { current.push(nums[i]); backtrack(i+1, current); current.pop(); } }',
      'Start with backtrack(0, []) to generate all subsets.',
    ],
  },
  // HEAP - Rung 1
  {
    title: 'Kth Largest Element in an Array',
    statement: `Given an integer array nums and an integer k, return the kth largest element in the array.

Note that it is the kth largest element in the sorted order, not the kth distinct element.

You must solve it in O(n) average time complexity (using a heap or quickselect).

Example 1:
Input: nums = [3, 2, 1, 5, 6, 4], k = 2
Output: 5

Example 2:
Input: nums = [3, 2, 3, 1, 2, 4, 5, 5, 6], k = 4
Output: 4

Constraints:
- 1 <= k <= nums.length <= 10^5
- -10^4 <= nums[i] <= 10^4`,
    pattern: 'HEAP',
    rung: 1,
    targetComplexity: 'O(n log k)',
    testCases: [
      { input: '[[3, 2, 1, 5, 6, 4], 2]', expectedOutput: '5', isHidden: false },
      { input: '[[3, 2, 3, 1, 2, 4, 5, 5, 6], 4]', expectedOutput: '4', isHidden: false },
      { input: '[[1], 1]', expectedOutput: '1', isHidden: false },
      { input: '[[7, 6, 5, 4, 3, 2, 1], 5]', expectedOutput: '3', isHidden: true },
      { input: '[[1, 2, 3, 4, 5], 1]', expectedOutput: '5', isHidden: true },
    ],
    hints: [
      'You could sort the array, but that is O(n log n). Can you do better?',
      'Maintain a min-heap of size k. The top of the heap is the kth largest.',
      'For each element, if heap size < k, add it. Else if element > heap top, remove top and add element.',
      'In JavaScript, you can implement a simple min-heap or use sorting for this problem size.',
      'Alternative: Use quickselect algorithm for O(n) average case.',
    ],
  },
  // TRIE - Rung 1
  {
    title: 'Implement Trie (Prefix Tree)',
    statement: `A trie (pronounced "try") is a tree data structure used to efficiently store and retrieve keys in a dataset of strings.

Implement the Trie class:
- Trie() Initializes the trie object.
- void insert(String word) Inserts the string word into the trie.
- boolean search(String word) Returns true if the string word is in the trie, false otherwise.
- boolean startsWith(String prefix) Returns true if there is any word that starts with prefix.

Example:
Input: ["Trie", "insert", "search", "search", "startsWith", "insert", "search"]
       [[], ["apple"], ["apple"], ["app"], ["app"], ["app"], ["app"]]
Output: [null, null, true, false, true, null, true]

Constraints:
- 1 <= word.length, prefix.length <= 2000
- word and prefix consist only of lowercase English letters`,
    pattern: 'TRIE',
    rung: 1,
    targetComplexity: 'O(m) per operation',
    testCases: [
      { input: '[["insert", "apple"], ["search", "apple"]]', expectedOutput: 'true', isHidden: false },
      { input: '[["insert", "apple"], ["search", "app"]]', expectedOutput: 'false', isHidden: false },
      { input: '[["insert", "apple"], ["startsWith", "app"]]', expectedOutput: 'true', isHidden: false },
      { input: '[["insert", "app"], ["insert", "apple"], ["search", "app"]]', expectedOutput: 'true', isHidden: true },
      { input: '[["search", "a"]]', expectedOutput: 'false', isHidden: true },
    ],
    hints: [
      'Each node in a trie has children for each possible character (a-z).',
      'Use an object/Map where keys are characters and values are child nodes.',
      'Mark nodes where words end with an isEnd flag.',
      'insert: traverse/create nodes for each char, mark last as end. search: traverse and check isEnd. startsWith: just traverse.',
      'class TrieNode { constructor() { this.children = {}; this.isEnd = false; } }',
    ],
  },
  // UNION_FIND - Rung 1
  {
    title: 'Number of Connected Components',
    statement: `You have n nodes labeled from 0 to n-1. You are given an integer n and a list of edges where edges[i] = [ai, bi] indicates an undirected edge between nodes ai and bi.

Return the number of connected components in the graph.

Example 1:
Input: n = 5, edges = [[0, 1], [1, 2], [3, 4]]
Output: 2
Explanation: Components are {0, 1, 2} and {3, 4}.

Example 2:
Input: n = 5, edges = [[0, 1], [1, 2], [2, 3], [3, 4]]
Output: 1

Constraints:
- 1 <= n <= 2000
- 0 <= edges.length <= 5000
- edges[i].length == 2
- 0 <= ai, bi < n
- ai != bi
- No duplicate edges`,
    pattern: 'UNION_FIND',
    rung: 1,
    targetComplexity: 'O(n + m * α(n))',
    testCases: [
      { input: '[5, [[0, 1], [1, 2], [3, 4]]]', expectedOutput: '2', isHidden: false },
      { input: '[5, [[0, 1], [1, 2], [2, 3], [3, 4]]]', expectedOutput: '1', isHidden: false },
      { input: '[4, []]', expectedOutput: '4', isHidden: false },
      { input: '[3, [[0, 1], [1, 2], [0, 2]]]', expectedOutput: '1', isHidden: true },
      { input: '[1, []]', expectedOutput: '1', isHidden: true },
    ],
    hints: [
      'Use Union-Find (Disjoint Set Union) data structure.',
      'Initialize each node as its own parent. For each edge, union the two nodes.',
      'Count unique roots at the end (nodes where parent[i] === i).',
      'Optimize with path compression: in find(), set parent[x] = find(parent[x]).',
      'function find(x) { if (parent[x] !== x) parent[x] = find(parent[x]); return parent[x]; } function union(x, y) { parent[find(x)] = find(y); }',
    ],
  },
  // INTERVAL_MERGING - Rung 1
  {
    title: 'Merge Intervals',
    statement: `Given an array of intervals where intervals[i] = [starti, endi], merge all overlapping intervals, and return an array of the non-overlapping intervals that cover all the intervals in the input.

Example 1:
Input: intervals = [[1, 3], [2, 6], [8, 10], [15, 18]]
Output: [[1, 6], [8, 10], [15, 18]]
Explanation: [1, 3] and [2, 6] overlap, merge into [1, 6].

Example 2:
Input: intervals = [[1, 4], [4, 5]]
Output: [[1, 5]]
Explanation: [1, 4] and [4, 5] are considered overlapping.

Constraints:
- 1 <= intervals.length <= 10^4
- intervals[i].length == 2
- 0 <= starti <= endi <= 10^4`,
    pattern: 'INTERVAL_MERGING',
    rung: 1,
    targetComplexity: 'O(n log n)',
    testCases: [
      { input: '[[[1, 3], [2, 6], [8, 10], [15, 18]]]', expectedOutput: '[[1, 6], [8, 10], [15, 18]]', isHidden: false },
      { input: '[[[1, 4], [4, 5]]]', expectedOutput: '[[1, 5]]', isHidden: false },
      { input: '[[[1, 4], [0, 4]]]', expectedOutput: '[[0, 4]]', isHidden: false },
      { input: '[[[1, 4], [2, 3]]]', expectedOutput: '[[1, 4]]', isHidden: true },
      { input: '[[[1, 4]]]', expectedOutput: '[[1, 4]]', isHidden: true },
    ],
    hints: [
      'First, sort intervals by start time.',
      'Two intervals overlap if the first ends after or when the second starts.',
      'Iterate through sorted intervals, merging when current overlaps with previous.',
      'For merge: newEnd = Math.max(prev.end, curr.end)',
      'intervals.sort((a, b) => a[0] - b[0]); for each interval: if overlaps, merge; else add new interval to result.',
    ],
  },
  // BINARY_SEARCH - Rung 2
  {
    title: 'Search in Rotated Sorted Array',
    statement: `Given a sorted array that has been rotated at some pivot, search for a target value.

The array was originally sorted in ascending order, then rotated between 1 and n times.

Example 1:
Input: nums = [4, 5, 6, 7, 0, 1, 2], target = 0
Output: 4

Example 2:
Input: nums = [4, 5, 6, 7, 0, 1, 2], target = 3
Output: -1

Constraints:
- 1 <= nums.length <= 5000
- All values are unique
- nums was rotated at some pivot
- You must achieve O(log n) runtime`,
    pattern: 'BINARY_SEARCH',
    rung: 2,
    targetComplexity: 'O(log n)',
    testCases: [
      { input: '[[4, 5, 6, 7, 0, 1, 2], 0]', expectedOutput: '4', isHidden: false },
      { input: '[[4, 5, 6, 7, 0, 1, 2], 3]', expectedOutput: '-1', isHidden: false },
      { input: '[[1], 0]', expectedOutput: '-1', isHidden: false },
      { input: '[[1], 1]', expectedOutput: '0', isHidden: true },
      { input: '[[3, 1], 1]', expectedOutput: '1', isHidden: true },
    ],
    hints: [
      'One half of the array is always sorted. How can you determine which half?',
      'Compare nums[mid] with nums[left] to determine which half is sorted.',
      'If the sorted half contains the target, search there. Otherwise, search the other half.',
      'If nums[left] <= nums[mid], left half is sorted. Check if target is in [left, mid].',
      'if (nums[left] <= nums[mid]) { if (target >= nums[left] && target < nums[mid]) right = mid - 1; else left = mid + 1; }',
    ],
  },
  // DFS - Rung 2
  {
    title: 'Path Sum',
    statement: `Given the root of a binary tree and an integer targetSum, return true if the tree has a root-to-leaf path such that adding up all the values along the path equals targetSum.

A leaf is a node with no children.

Example 1:
Input: root = [5, 4, 8, 11, null, 13, 4, 7, 2, null, null, null, 1], targetSum = 22
Output: true
Explanation: The path 5 -> 4 -> 11 -> 2 sums to 22.

Example 2:
Input: root = [1, 2, 3], targetSum = 5
Output: false

Constraints:
- The number of nodes in the tree is in the range [0, 5000]
- -1000 <= Node.val <= 1000
- -1000 <= targetSum <= 1000`,
    pattern: 'DFS',
    rung: 2,
    targetComplexity: 'O(n)',
    testCases: [
      { input: '[[5, 4, 8, 11, null, 13, 4, 7, 2, null, null, null, 1], 22]', expectedOutput: 'true', isHidden: false },
      { input: '[[1, 2, 3], 5]', expectedOutput: 'false', isHidden: false },
      { input: '[[], 0]', expectedOutput: 'false', isHidden: false },
      { input: '[[1, 2], 1]', expectedOutput: 'false', isHidden: true },
      { input: '[[1], 1]', expectedOutput: 'true', isHidden: true },
    ],
    hints: [
      'Use DFS to traverse from root to each leaf.',
      'Subtract the current node value from targetSum as you traverse.',
      'At a leaf node, check if the remaining sum equals the leaf value.',
      'Base case: if node is null, return false. If leaf and val equals remaining sum, return true.',
      'return hasPathSum(node.left, sum - node.val) || hasPathSum(node.right, sum - node.val);',
    ],
  },
  // BFS - Rung 2
  {
    title: 'Rotting Oranges',
    statement: `You are given an m x n grid where each cell can have one of three values:
- 0 representing an empty cell
- 1 representing a fresh orange
- 2 representing a rotten orange

Every minute, any fresh orange adjacent (4-directionally) to a rotten orange becomes rotten.

Return the minimum number of minutes until no cell has a fresh orange. If impossible, return -1.

Example 1:
Input: grid = [[2, 1, 1], [1, 1, 0], [0, 1, 1]]
Output: 4

Example 2:
Input: grid = [[2, 1, 1], [0, 1, 1], [1, 0, 1]]
Output: -1
Explanation: The orange in the bottom left corner is never reached.

Constraints:
- m == grid.length
- n == grid[i].length
- 1 <= m, n <= 10
- grid[i][j] is 0, 1, or 2`,
    pattern: 'BFS',
    rung: 2,
    targetComplexity: 'O(m * n)',
    testCases: [
      { input: '[[[2, 1, 1], [1, 1, 0], [0, 1, 1]]]', expectedOutput: '4', isHidden: false },
      { input: '[[[2, 1, 1], [0, 1, 1], [1, 0, 1]]]', expectedOutput: '-1', isHidden: false },
      { input: '[[[0, 2]]]', expectedOutput: '0', isHidden: false },
      { input: '[[[2, 2], [1, 1]]]', expectedOutput: '1', isHidden: true },
      { input: '[[[1]]]', expectedOutput: '-1', isHidden: true },
    ],
    hints: [
      'This is a multi-source BFS problem. Start from all rotten oranges simultaneously.',
      'Add all initially rotten oranges to a queue.',
      'Process level by level, counting minutes. Each level represents one minute.',
      'Track fresh orange count. If any remain after BFS, return -1.',
      'const directions = [[0,1], [0,-1], [1,0], [-1,0]]; BFS spreading to adjacent cells.',
    ],
  },
  // DYNAMIC_PROGRAMMING - Rung 2
  {
    title: 'House Robber',
    statement: `You are a professional robber planning to rob houses along a street. Each house has a certain amount of money stashed. The only constraint is that adjacent houses have security systems connected - if two adjacent houses are robbed, the police will be alerted.

Given an integer array nums representing the amount of money at each house, return the maximum amount you can rob without alerting the police.

Example 1:
Input: nums = [1, 2, 3, 1]
Output: 4
Explanation: Rob house 1 (money = 1) and house 3 (money = 3). Total = 4.

Example 2:
Input: nums = [2, 7, 9, 3, 1]
Output: 12
Explanation: Rob house 1 (money = 2), house 3 (money = 9), house 5 (money = 1). Total = 12.

Constraints:
- 1 <= nums.length <= 100
- 0 <= nums[i] <= 400`,
    pattern: 'DYNAMIC_PROGRAMMING',
    rung: 2,
    targetComplexity: 'O(n)',
    testCases: [
      { input: '[[1, 2, 3, 1]]', expectedOutput: '4', isHidden: false },
      { input: '[[2, 7, 9, 3, 1]]', expectedOutput: '12', isHidden: false },
      { input: '[[2, 1, 1, 2]]', expectedOutput: '4', isHidden: false },
      { input: '[[1]]', expectedOutput: '1', isHidden: true },
      { input: '[[1, 2]]', expectedOutput: '2', isHidden: true },
    ],
    hints: [
      'At each house, you have two choices: rob it or skip it.',
      'If you rob house i, you cannot rob house i-1, so you take nums[i] + dp[i-2].',
      'If you skip house i, you take dp[i-1].',
      'dp[i] = max(dp[i-1], dp[i-2] + nums[i])',
      'You can optimize space to O(1) by keeping only the previous two values.',
    ],
  },
  // BACKTRACKING - Rung 2
  {
    title: 'Permutations',
    statement: `Given an array nums of distinct integers, return all possible permutations. You can return the answer in any order.

Example 1:
Input: nums = [1, 2, 3]
Output: [[1, 2, 3], [1, 3, 2], [2, 1, 3], [2, 3, 1], [3, 1, 2], [3, 2, 1]]

Example 2:
Input: nums = [0, 1]
Output: [[0, 1], [1, 0]]

Example 3:
Input: nums = [1]
Output: [[1]]

Constraints:
- 1 <= nums.length <= 6
- -10 <= nums[i] <= 10
- All integers are unique`,
    pattern: 'BACKTRACKING',
    rung: 2,
    targetComplexity: 'O(n * n!)',
    testCases: [
      { input: '[[1, 2, 3]]', expectedOutput: '[[1, 2, 3], [1, 3, 2], [2, 1, 3], [2, 3, 1], [3, 1, 2], [3, 2, 1]]', isHidden: false },
      { input: '[[0, 1]]', expectedOutput: '[[0, 1], [1, 0]]', isHidden: false },
      { input: '[[1]]', expectedOutput: '[[1]]', isHidden: false },
      { input: '[[1, 2]]', expectedOutput: '[[1, 2], [2, 1]]', isHidden: true },
    ],
    hints: [
      'Unlike subsets, permutations use all elements but in different orders.',
      'Track which elements have been used with a boolean array or set.',
      'At each position, try placing each unused element.',
      'function backtrack(current, used) { if (current.length === nums.length) { result.push([...current]); return; } for each unused num: add to current, mark used, recurse, backtrack }',
      'Alternatively, use swapping: swap elements at each position with all elements after it.',
    ],
  },
  // GREEDY - Rung 2
  {
    title: 'Jump Game',
    statement: `You are given an integer array nums. You are initially positioned at the array's first index, and each element represents your maximum jump length at that position.

Return true if you can reach the last index, or false otherwise.

Example 1:
Input: nums = [2, 3, 1, 1, 4]
Output: true
Explanation: Jump 1 step from index 0 to 1, then 3 steps to the last index.

Example 2:
Input: nums = [3, 2, 1, 0, 4]
Output: false
Explanation: You will always arrive at index 3, whose value is 0, so you can never reach the last index.

Constraints:
- 1 <= nums.length <= 10^4
- 0 <= nums[i] <= 10^5`,
    pattern: 'GREEDY',
    rung: 2,
    targetComplexity: 'O(n)',
    testCases: [
      { input: '[[2, 3, 1, 1, 4]]', expectedOutput: 'true', isHidden: false },
      { input: '[[3, 2, 1, 0, 4]]', expectedOutput: 'false', isHidden: false },
      { input: '[[0]]', expectedOutput: 'true', isHidden: false },
      { input: '[[2, 0, 0]]', expectedOutput: 'true', isHidden: true },
      { input: '[[1, 0, 1, 0]]', expectedOutput: 'false', isHidden: true },
    ],
    hints: [
      'Track the maximum index you can reach as you iterate.',
      'At each index i, update maxReach = max(maxReach, i + nums[i]).',
      'If at any point i > maxReach, you cannot proceed further.',
      'If maxReach >= last index, return true.',
      'for (let i = 0; i <= maxReach && i < n; i++) { maxReach = Math.max(maxReach, i + nums[i]); }',
    ],
  },
  // PREFIX_SUM - Rung 2
  {
    title: 'Subarray Sum Equals K',
    statement: `Given an array of integers nums and an integer k, return the total number of subarrays whose sum equals to k.

A subarray is a contiguous non-empty sequence of elements within an array.

Example 1:
Input: nums = [1, 1, 1], k = 2
Output: 2
Explanation: [1, 1] appears twice.

Example 2:
Input: nums = [1, 2, 3], k = 3
Output: 2
Explanation: [1, 2] and [3] both sum to 3.

Constraints:
- 1 <= nums.length <= 2 * 10^4
- -1000 <= nums[i] <= 1000
- -10^7 <= k <= 10^7`,
    pattern: 'PREFIX_SUM',
    rung: 2,
    targetComplexity: 'O(n)',
    testCases: [
      { input: '[[1, 1, 1], 2]', expectedOutput: '2', isHidden: false },
      { input: '[[1, 2, 3], 3]', expectedOutput: '2', isHidden: false },
      { input: '[[1], 0]', expectedOutput: '0', isHidden: false },
      { input: '[[1, -1, 0], 0]', expectedOutput: '3', isHidden: true },
      { input: '[[0, 0, 0], 0]', expectedOutput: '6', isHidden: true },
    ],
    hints: [
      'Brute force is O(n²). Can you use prefix sums to speed this up?',
      'If prefixSum[j] - prefixSum[i] = k, then sum from i+1 to j equals k.',
      'Use a HashMap to store the count of each prefix sum seen so far.',
      'For each position, check if (currentSum - k) exists in the map.',
      'map.set(0, 1) initially; for each num: sum += num; count += map.get(sum - k) || 0; map.set(sum, (map.get(sum) || 0) + 1);',
    ],
  },
  // HEAP - Rung 2
  {
    title: 'Top K Frequent Elements',
    statement: `Given an integer array nums and an integer k, return the k most frequent elements. You may return the answer in any order.

Example 1:
Input: nums = [1, 1, 1, 2, 2, 3], k = 2
Output: [1, 2]

Example 2:
Input: nums = [1], k = 1
Output: [1]

Constraints:
- 1 <= nums.length <= 10^5
- -10^4 <= nums[i] <= 10^4
- k is in the range [1, the number of unique elements]
- The answer is guaranteed to be unique

Follow up: Your algorithm's time complexity must be better than O(n log n).`,
    pattern: 'HEAP',
    rung: 2,
    targetComplexity: 'O(n log k)',
    testCases: [
      { input: '[[1, 1, 1, 2, 2, 3], 2]', expectedOutput: '[1, 2]', isHidden: false },
      { input: '[[1], 1]', expectedOutput: '[1]', isHidden: false },
      { input: '[[1, 2], 2]', expectedOutput: '[1, 2]', isHidden: false },
      { input: '[[4, 1, -1, 2, -1, 2, 3], 2]', expectedOutput: '[-1, 2]', isHidden: true },
    ],
    hints: [
      'First, count the frequency of each element using a HashMap.',
      'Then find the k elements with highest frequencies.',
      'Use a min-heap of size k. Keep only the k most frequent elements.',
      'For each element, if heap size < k, add it. Else if freq > heap top freq, replace.',
      'Alternative: Use bucket sort where index = frequency for O(n) solution.',
    ],
  },
  // TRIE - Rung 2
  {
    title: 'Word Search II',
    statement: `Given an m x n board of characters and a list of words, return all words on the board.

Each word must be constructed from letters of sequentially adjacent cells (horizontally or vertically). The same cell may not be used more than once in a word.

Example 1:
Input: board = [["o","a","a","n"],["e","t","a","e"],["i","h","k","r"],["i","f","l","v"]], words = ["oath","pea","eat","rain"]
Output: ["eat","oath"]

Example 2:
Input: board = [["a","b"],["c","d"]], words = ["abcb"]
Output: []

Constraints:
- m == board.length, n == board[i].length
- 1 <= m, n <= 12
- 1 <= words.length <= 3 * 10^4
- 1 <= words[i].length <= 10`,
    pattern: 'TRIE',
    rung: 2,
    targetComplexity: 'O(m * n * 4^L)',
    testCases: [
      { input: '[[["o","a","a","n"],["e","t","a","e"],["i","h","k","r"],["i","f","l","v"]], ["oath","pea","eat","rain"]]', expectedOutput: '["eat", "oath"]', isHidden: false },
      { input: '[[["a","b"],["c","d"]], ["abcb"]]', expectedOutput: '[]', isHidden: false },
      { input: '[[["a"]], ["a"]]', expectedOutput: '["a"]', isHidden: false },
      { input: '[[["a","a"]], ["aaa"]]', expectedOutput: '[]', isHidden: true },
    ],
    hints: [
      'Build a Trie from all the words for efficient prefix matching.',
      'For each cell, start a DFS and traverse the Trie simultaneously.',
      'Prune branches when no word starts with the current prefix.',
      'Mark cells as visited during DFS, restore after backtracking.',
      'When you find a complete word (node.isEnd), add it to results and optionally remove from Trie to avoid duplicates.',
    ],
  },
  // UNION_FIND - Rung 2
  {
    title: 'Redundant Connection',
    statement: `In this problem, a tree is an undirected graph that is connected and has no cycles.

You are given a graph that started as a tree with n nodes (1 to n), with one additional edge added. The added edge has two different vertices and connects vertices that were not already connected.

Return an edge that can be removed so that the resulting graph is a tree of n nodes. If there are multiple answers, return the edge that occurs last in the input.

Example 1:
Input: edges = [[1, 2], [1, 3], [2, 3]]
Output: [2, 3]

Example 2:
Input: edges = [[1, 2], [2, 3], [3, 4], [1, 4], [1, 5]]
Output: [1, 4]

Constraints:
- n == edges.length
- 3 <= n <= 1000
- edges[i].length == 2
- 1 <= ai < bi <= n
- No repeated edges`,
    pattern: 'UNION_FIND',
    rung: 2,
    targetComplexity: 'O(n * α(n))',
    testCases: [
      { input: '[[[1, 2], [1, 3], [2, 3]]]', expectedOutput: '[2, 3]', isHidden: false },
      { input: '[[[1, 2], [2, 3], [3, 4], [1, 4], [1, 5]]]', expectedOutput: '[1, 4]', isHidden: false },
      { input: '[[[1, 2], [1, 3], [1, 4], [3, 4]]]', expectedOutput: '[3, 4]', isHidden: false },
      { input: '[[[1, 2], [2, 3], [1, 3]]]', expectedOutput: '[1, 3]', isHidden: true },
    ],
    hints: [
      'Process edges one by one. The redundant edge connects two already-connected nodes.',
      'Use Union-Find to track connected components.',
      'For each edge [u, v]: if find(u) == find(v), this edge creates a cycle.',
      'The last edge that would create a cycle is the answer.',
      'function find(x) { if (parent[x] !== x) parent[x] = find(parent[x]); return parent[x]; }',
    ],
  },
  // INTERVAL_MERGING - Rung 2
  {
    title: 'Insert Interval',
    statement: `You are given an array of non-overlapping intervals sorted by their start time, and a new interval to insert.

Insert the new interval into the intervals (merge if necessary) and return the result as a new list of non-overlapping intervals.

Example 1:
Input: intervals = [[1, 3], [6, 9]], newInterval = [2, 5]
Output: [[1, 5], [6, 9]]

Example 2:
Input: intervals = [[1, 2], [3, 5], [6, 7], [8, 10], [12, 16]], newInterval = [4, 8]
Output: [[1, 2], [3, 10], [12, 16]]
Explanation: The new interval [4, 8] overlaps with [3, 5], [6, 7], [8, 10].

Constraints:
- 0 <= intervals.length <= 10^4
- intervals[i].length == 2
- 0 <= starti <= endi <= 10^5
- intervals is sorted by starti in ascending order
- newInterval.length == 2`,
    pattern: 'INTERVAL_MERGING',
    rung: 2,
    targetComplexity: 'O(n)',
    testCases: [
      { input: '[[[1, 3], [6, 9]], [2, 5]]', expectedOutput: '[[1, 5], [6, 9]]', isHidden: false },
      { input: '[[[1, 2], [3, 5], [6, 7], [8, 10], [12, 16]], [4, 8]]', expectedOutput: '[[1, 2], [3, 10], [12, 16]]', isHidden: false },
      { input: '[[], [5, 7]]', expectedOutput: '[[5, 7]]', isHidden: false },
      { input: '[[[1, 5]], [2, 3]]', expectedOutput: '[[1, 5]]', isHidden: true },
      { input: '[[[1, 5]], [6, 8]]', expectedOutput: '[[1, 5], [6, 8]]', isHidden: true },
    ],
    hints: [
      'Split the problem into three parts: before, overlapping, and after.',
      'Add all intervals that end before newInterval starts.',
      'Merge all intervals that overlap with newInterval.',
      'Add all intervals that start after newInterval ends.',
      'Two intervals overlap if: interval.start <= newInterval.end && interval.end >= newInterval.start',
    ],
  },
  // DYNAMIC_PROGRAMMING - Rung 3
  {
    title: 'Coin Change',
    statement: `You are given an integer array coins representing coins of different denominations and an integer amount representing a total amount of money.

Return the fewest number of coins needed to make up that amount. If that amount cannot be made up, return -1.

You may assume you have an infinite number of each kind of coin.

Example 1:
Input: coins = [1, 2, 5], amount = 11
Output: 3
Explanation: 11 = 5 + 5 + 1

Example 2:
Input: coins = [2], amount = 3
Output: -1

Example 3:
Input: coins = [1], amount = 0
Output: 0

Constraints:
- 1 <= coins.length <= 12
- 1 <= coins[i] <= 2^31 - 1
- 0 <= amount <= 10^4`,
    pattern: 'DYNAMIC_PROGRAMMING',
    rung: 3,
    targetComplexity: 'O(amount * n)',
    testCases: [
      { input: '[[1, 2, 5], 11]', expectedOutput: '3', isHidden: false },
      { input: '[[2], 3]', expectedOutput: '-1', isHidden: false },
      { input: '[[1], 0]', expectedOutput: '0', isHidden: false },
      { input: '[[1, 2, 5], 100]', expectedOutput: '20', isHidden: true },
      { input: '[[186, 419, 83, 408], 6249]', expectedOutput: '20', isHidden: true },
    ],
    hints: [
      'This is an unbounded knapsack problem. Think about building up to the amount.',
      'dp[i] = minimum coins needed to make amount i.',
      'For each amount, try using each coin and take the minimum.',
      'dp[i] = min(dp[i], dp[i - coin] + 1) for each coin where i >= coin.',
      'Initialize dp[0] = 0, dp[1..amount] = Infinity. Return dp[amount] or -1 if Infinity.',
    ],
  },
  // BACKTRACKING - Rung 3
  {
    title: 'N-Queens',
    statement: `The n-queens puzzle is the problem of placing n queens on an n x n chessboard such that no two queens attack each other.

Given an integer n, return all distinct solutions to the n-queens puzzle. Each solution contains a distinct board configuration where 'Q' indicates a queen and '.' indicates an empty space.

Example 1:
Input: n = 4
Output: [[".Q..","...Q","Q...","..Q."],["..Q.","Q...","...Q",".Q.."]]

Example 2:
Input: n = 1
Output: [["Q"]]

Constraints:
- 1 <= n <= 9`,
    pattern: 'BACKTRACKING',
    rung: 3,
    targetComplexity: 'O(n!)',
    testCases: [
      { input: '4', expectedOutput: '[[".Q..","...Q","Q...","..Q."],["..Q.","Q...","...Q",".Q.."]]', isHidden: false },
      { input: '1', expectedOutput: '[["Q"]]', isHidden: false },
      { input: '2', expectedOutput: '[]', isHidden: false },
      { input: '3', expectedOutput: '[]', isHidden: true },
    ],
    hints: [
      'Place queens row by row. For each row, try each column.',
      'Track which columns, diagonals, and anti-diagonals are under attack.',
      'For position (row, col): diagonal = row - col, anti-diagonal = row + col.',
      'Use sets to track: columns, diagonals (r-c), anti-diagonals (r+c).',
      'Backtrack: place queen, recurse to next row, remove queen.',
    ],
  },
  // SLIDING_WINDOW - Rung 3
  {
    title: 'Minimum Window Substring',
    statement: `Given two strings s and t, return the minimum window substring of s such that every character in t (including duplicates) is included in the window.

If there is no such substring, return the empty string "".

Example 1:
Input: s = "ADOBECODEBANC", t = "ABC"
Output: "BANC"
Explanation: The minimum window substring "BANC" includes 'A', 'B', and 'C' from string t.

Example 2:
Input: s = "a", t = "a"
Output: "a"

Example 3:
Input: s = "a", t = "aa"
Output: ""
Explanation: Both 'a's from t must be included, but s only has one 'a'.

Constraints:
- 1 <= s.length, t.length <= 10^5
- s and t consist of uppercase and lowercase English letters`,
    pattern: 'SLIDING_WINDOW',
    rung: 3,
    targetComplexity: 'O(n)',
    testCases: [
      { input: '["ADOBECODEBANC", "ABC"]', expectedOutput: '"BANC"', isHidden: false },
      { input: '["a", "a"]', expectedOutput: '"a"', isHidden: false },
      { input: '["a", "aa"]', expectedOutput: '""', isHidden: false },
      { input: '["ab", "b"]', expectedOutput: '"b"', isHidden: true },
      { input: '["cabwefgewcwaefgcf", "cae"]', expectedOutput: '"cwae"', isHidden: true },
    ],
    hints: [
      'Use two pointers and a frequency map to track characters needed.',
      'Expand the window (right pointer) until all characters are found.',
      'Contract the window (left pointer) while maintaining validity to find minimum.',
      'Track how many unique characters are still needed vs how many are satisfied.',
      'When window is valid, update result if smaller, then shrink from left.',
    ],
  },
  // TWO_POINTERS - Rung 3
  {
    title: '3Sum',
    statement: `Given an integer array nums, return all the triplets [nums[i], nums[j], nums[k]] such that i != j, i != k, and j != k, and nums[i] + nums[j] + nums[k] == 0.

Notice that the solution set must not contain duplicate triplets.

Example 1:
Input: nums = [-1, 0, 1, 2, -1, -4]
Output: [[-1, -1, 2], [-1, 0, 1]]

Example 2:
Input: nums = [0, 1, 1]
Output: []

Example 3:
Input: nums = [0, 0, 0]
Output: [[0, 0, 0]]

Constraints:
- 3 <= nums.length <= 3000
- -10^5 <= nums[i] <= 10^5`,
    pattern: 'TWO_POINTERS',
    rung: 3,
    targetComplexity: 'O(n²)',
    testCases: [
      { input: '[[-1, 0, 1, 2, -1, -4]]', expectedOutput: '[[-1, -1, 2], [-1, 0, 1]]', isHidden: false },
      { input: '[[0, 1, 1]]', expectedOutput: '[]', isHidden: false },
      { input: '[[0, 0, 0]]', expectedOutput: '[[0, 0, 0]]', isHidden: false },
      { input: '[[-2, 0, 1, 1, 2]]', expectedOutput: '[[-2, 0, 2], [-2, 1, 1]]', isHidden: true },
    ],
    hints: [
      'Sort the array first. This enables the two-pointer technique.',
      'Fix one element, then use two pointers to find pairs that sum to its negative.',
      'Skip duplicates to avoid duplicate triplets.',
      'For each i, use left = i+1, right = n-1, and find pairs summing to -nums[i].',
      'After finding a triplet, skip duplicates: while (nums[left] === nums[left+1]) left++',
    ],
  },
  // BFS - Rung 3
  {
    title: 'Word Ladder',
    statement: `A transformation sequence from word beginWord to word endWord using a dictionary wordList is a sequence beginWord -> s1 -> s2 -> ... -> sk such that:
- Every adjacent pair of words differs by a single letter.
- Every si is in wordList. Note that beginWord does not need to be in wordList.
- sk == endWord

Given beginWord, endWord, and wordList, return the number of words in the shortest transformation sequence, or 0 if no such sequence exists.

Example 1:
Input: beginWord = "hit", endWord = "cog", wordList = ["hot","dot","dog","lot","log","cog"]
Output: 5
Explanation: hit -> hot -> dot -> dog -> cog

Example 2:
Input: beginWord = "hit", endWord = "cog", wordList = ["hot","dot","dog","lot","log"]
Output: 0
Explanation: endWord "cog" is not in wordList.

Constraints:
- 1 <= beginWord.length <= 10
- endWord.length == beginWord.length
- 1 <= wordList.length <= 5000
- All words have the same length and consist of lowercase English letters`,
    pattern: 'BFS',
    rung: 3,
    targetComplexity: 'O(n * m²)',
    testCases: [
      { input: '["hit", "cog", ["hot", "dot", "dog", "lot", "log", "cog"]]', expectedOutput: '5', isHidden: false },
      { input: '["hit", "cog", ["hot", "dot", "dog", "lot", "log"]]', expectedOutput: '0', isHidden: false },
      { input: '["a", "c", ["a", "b", "c"]]', expectedOutput: '2', isHidden: false },
      { input: '["hot", "dog", ["hot", "dog"]]', expectedOutput: '0', isHidden: true },
    ],
    hints: [
      'This is a shortest path problem - use BFS.',
      'Each word is a node; edges connect words differing by one letter.',
      'Build a graph or generate neighbors on the fly.',
      'Use pattern matching: for "hot", patterns are "*ot", "h*t", "ho*".',
      'BFS level by level, tracking visited words to avoid cycles.',
    ],
  },
];

async function seed() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error('DATABASE_URL environment variable is required');
    process.exit(1);
  }

  console.log('Connecting to database...');
  const client = postgres(connectionString);
  const db = drizzle(client);

  const TENANT_ID = '00000000-0000-0000-0000-000000000001';
  const TENANT_NAME = 'Demo Tenant';

  try {
    // Check if tenant exists, create if not
    console.log('Setting up demo tenant...');
    const existingTenant = await client`
      SELECT id FROM tenants WHERE id = ${TENANT_ID}::uuid
    `;

    if (existingTenant.length === 0) {
      await client`
        INSERT INTO tenants (id, name) VALUES (${TENANT_ID}::uuid, ${TENANT_NAME})
      `;
      console.log('Created demo tenant');
    } else {
      console.log('Demo tenant already exists');
    }

    // Delete existing data for this tenant (respecting foreign key order)
    console.log('Clearing existing steps...');
    await client`DELETE FROM steps WHERE attempt_id IN (SELECT id FROM attempts WHERE tenant_id = ${TENANT_ID}::uuid)`;
    console.log('Clearing existing attempts...');
    await client`DELETE FROM attempts WHERE tenant_id = ${TENANT_ID}::uuid`;
    console.log('Clearing existing skills...');
    await client`DELETE FROM skills WHERE tenant_id = ${TENANT_ID}::uuid`;
    console.log('Clearing existing problems...');
    await client`DELETE FROM problems WHERE tenant_id = ${TENANT_ID}::uuid`;

    // Insert demo problems
    console.log('Inserting demo problems...');
    for (const problem of DEMO_PROBLEMS) {
      const id = randomUUID();
      await client`
        INSERT INTO problems (id, tenant_id, title, statement, pattern, rung, target_complexity, test_cases, hints)
        VALUES (
          ${id}::uuid,
          ${TENANT_ID}::uuid,
          ${problem.title},
          ${problem.statement},
          ${problem.pattern},
          ${problem.rung},
          ${problem.targetComplexity},
          ${JSON.stringify(problem.testCases)}::jsonb,
          ${JSON.stringify(problem.hints)}::jsonb
        )
      `;
      console.log(`  Added: ${problem.title} (${problem.pattern} R${problem.rung})`);
    }

    console.log(`\nSeeded ${DEMO_PROBLEMS.length} problems successfully!`);
    console.log('\nTo test:');
    console.log('1. Make sure DATABASE_URL is set');
    console.log('2. Run: pnpm dev');
    console.log('3. Open http://localhost:3000');

  } catch (error) {
    console.error('Seed failed:', error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

seed();
