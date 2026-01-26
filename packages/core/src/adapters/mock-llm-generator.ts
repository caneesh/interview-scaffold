/**
 * Mock LLM Generator Adapter
 *
 * Returns sample generated problems for testing.
 * These are ORIGINAL problems, not copied from any existing source.
 */

import type { ProblemSpecV1 } from '@scaffold/contracts';
import type {
  LLMGeneratorPort,
  GenerateProblemInput,
  GenerateProblemOutput,
} from '../ports/llm-generator-port.js';

/**
 * Sample problems by pattern and level
 *
 * These are original problems designed for testing the generator pipeline.
 * Each pattern has problems at different difficulty levels.
 */
const SAMPLE_PROBLEMS: Record<string, Record<number, ProblemSpecV1[]>> = {
  SLIDING_WINDOW: {
    0: [
      createProblem({
        title: 'Maximum Sum Subarray of Size K',
        summary: 'Find the maximum sum of any contiguous subarray of exactly K elements.',
        patternIds: ['SLIDING_WINDOW'],
        level: 0,
        difficulty: 'EASY',
        prompt: `Given an array of integers and a positive integer K, find the maximum sum of any contiguous subarray of size K.

The subarray must contain exactly K consecutive elements from the original array. Return the maximum sum found.`,
        constraints: ['1 <= arr.length <= 10^5', '1 <= K <= arr.length', '-10^4 <= arr[i] <= 10^4'],
        examples: [
          { input: 'arr = [2, 1, 5, 1, 3, 2], K = 3', output: '9', explanation: 'Subarray [5, 1, 3] has sum 9' },
          { input: 'arr = [2, 3, 4, 1, 5], K = 2', output: '7', explanation: 'Subarray [3, 4] has sum 7' },
        ],
        publicTests: [
          { input: '[2, 1, 5, 1, 3, 2]\n3', expectedOutput: '9', isHidden: false },
          { input: '[2, 3, 4, 1, 5]\n2', expectedOutput: '7', isHidden: false },
        ],
        hiddenTests: [
          { input: '[1]\n1', expectedOutput: '1', isHidden: true, explanation: 'Single element' },
          { input: '[-1, -2, -3]\n2', expectedOutput: '-3', isHidden: true, explanation: 'All negative' },
          { input: '[5, 5, 5, 5, 5]\n5', expectedOutput: '25', isHidden: true, explanation: 'Entire array' },
        ],
        hints: [
          'Consider what happens when you move the window by one position - which element leaves and which enters?',
          'You do not need to recalculate the entire sum each time the window moves.',
          'Maintain a running sum and adjust it as the window slides.',
        ],
        timeComplexity: 'O(n)',
        spaceComplexity: 'O(1)',
        solutionOutline: 'Use a sliding window of size K. Calculate the initial sum, then slide the window by subtracting the outgoing element and adding the incoming element. Track the maximum sum seen.',
        commonMistakes: [
          'Recalculating the entire sum for each window position instead of using incremental updates',
          'Off-by-one errors when initializing or moving the window',
          'Not handling the edge case when K equals the array length',
        ],
      }),
    ],
    1: [
      createProblem({
        title: 'Longest Substring Without Repeating Characters',
        summary: 'Find the length of the longest substring that contains no duplicate characters.',
        patternIds: ['SLIDING_WINDOW'],
        level: 1,
        difficulty: 'EASY',
        prompt: `Given a string, find the length of the longest substring without any repeating characters.

A substring is a contiguous sequence of characters within the string. Return the length of the longest such substring.`,
        constraints: ['0 <= s.length <= 5 * 10^4', 's consists of printable ASCII characters'],
        examples: [
          { input: 's = "abcabcbb"', output: '3', explanation: 'The answer is "abc", with length 3' },
          { input: 's = "bbbbb"', output: '1', explanation: 'The answer is "b", with length 1' },
        ],
        publicTests: [
          { input: 'abcabcbb', expectedOutput: '3', isHidden: false },
          { input: 'bbbbb', expectedOutput: '1', isHidden: false },
        ],
        hiddenTests: [
          { input: '', expectedOutput: '0', isHidden: true, explanation: 'Empty string' },
          { input: 'pwwkew', expectedOutput: '3', isHidden: true, explanation: 'Middle substring "wke"' },
          { input: 'abcdefg', expectedOutput: '7', isHidden: true, explanation: 'All unique' },
        ],
        hints: [
          'Use a set or map to track characters in the current window.',
          'When you encounter a duplicate, shrink the window from the left.',
          'Track the maximum length seen during the process.',
        ],
        timeComplexity: 'O(n)',
        spaceComplexity: 'O(min(n, m))',
        solutionOutline: 'Use a sliding window with a hash set. Expand the right pointer and add characters. When a duplicate is found, shrink from the left until no duplicates remain. Track the maximum window size.',
        commonMistakes: [
          'Not correctly handling the window shrinking when duplicates are found',
          'Forgetting to update the maximum length after each expansion',
          'Using incorrect data structure for tracking characters',
        ],
      }),
    ],
    2: [
      createProblem({
        title: 'Minimum Window Containing All Target Characters',
        summary: 'Find the smallest substring that contains all characters of a target string.',
        patternIds: ['SLIDING_WINDOW'],
        level: 2,
        difficulty: 'MEDIUM',
        prompt: `Given two strings S and T, find the minimum window substring of S that contains all characters in T (including duplicates).

If there is no such window, return an empty string. If there are multiple minimum windows, return any one of them.`,
        constraints: ['1 <= S.length, T.length <= 10^5', 'S and T consist of uppercase and lowercase English letters'],
        examples: [
          { input: 'S = "ADOBECODEBANC", T = "ABC"', output: '"BANC"', explanation: 'BANC contains A, B, and C' },
          { input: 'S = "a", T = "a"', output: '"a"', explanation: 'Single character match' },
        ],
        publicTests: [
          { input: 'ADOBECODEBANC\nABC', expectedOutput: 'BANC', isHidden: false },
          { input: 'a\na', expectedOutput: 'a', isHidden: false },
        ],
        hiddenTests: [
          { input: 'a\naa', expectedOutput: '', isHidden: true, explanation: 'Impossible - not enough characters' },
          { input: 'AAABBC\nABC', expectedOutput: 'ABC', isHidden: true, explanation: 'Exact match at end' },
          { input: 'cabwefgewcwaefgcf\ncae', expectedOutput: 'cwae', isHidden: true, explanation: 'Multiple valid windows' },
        ],
        hints: [
          'Use a character frequency map to track required characters.',
          'Expand the window until all characters are found, then shrink to minimize.',
          'Track how many unique characters still need to be matched.',
        ],
        timeComplexity: 'O(n + m)',
        spaceComplexity: 'O(m)',
        solutionOutline: 'Create a frequency map for T. Use sliding window: expand right until all chars matched, then shrink left while maintaining the match. Track minimum window seen.',
        commonMistakes: [
          'Not correctly counting character frequencies (especially duplicates)',
          'Incorrect condition for when all characters are matched',
          'Not updating the minimum window when shrinking',
        ],
      }),
    ],
    3: [
      createProblem({
        title: 'Longest Repeating Substring with K Replacements',
        summary: 'Find the longest substring with the same character after at most K replacements.',
        patternIds: ['SLIDING_WINDOW'],
        level: 3,
        difficulty: 'HARD',
        prompt: `Given a string S and an integer K, find the length of the longest substring that contains only one unique character after replacing at most K characters.

You can replace any character with any other character, and you can do at most K replacements in total.`,
        constraints: ['1 <= S.length <= 10^5', '0 <= K <= S.length', 'S consists of uppercase English letters only'],
        examples: [
          { input: 'S = "AABABBA", K = 1', output: '4', explanation: 'Replace one B with A to get "AAAA" (or "AABA")' },
          { input: 'S = "ABAB", K = 2', output: '4', explanation: 'Replace both Bs to get "AAAA"' },
        ],
        publicTests: [
          { input: 'AABABBA\n1', expectedOutput: '4', isHidden: false },
          { input: 'ABAB\n2', expectedOutput: '4', isHidden: false },
        ],
        hiddenTests: [
          { input: 'AAAA\n0', expectedOutput: '4', isHidden: true, explanation: 'No replacements needed' },
          { input: 'ABCDE\n1', expectedOutput: '2', isHidden: true, explanation: 'Limited replacements' },
          { input: 'A\n0', expectedOutput: '1', isHidden: true, explanation: 'Single character' },
        ],
        hints: [
          'For a valid window, (window length - count of most frequent char) must be <= K.',
          'Track the frequency of each character in the current window.',
          'You do not need to shrink the window size once it reaches a valid maximum.',
        ],
        timeComplexity: 'O(n)',
        spaceComplexity: 'O(1)',
        solutionOutline: 'Use sliding window with character frequency tracking. A window is valid if (window_size - max_char_count) <= K. Expand right, and when invalid, shrink left. The window size never needs to decrease below the maximum valid size found.',
        commonMistakes: [
          'Recalculating the maximum character count from scratch instead of tracking it',
          'Not understanding that we track potential maximum, not exact maximum',
          'Trying to shrink the window when it becomes invalid (not necessary for this problem)',
        ],
      }),
    ],
    4: [
      createProblem({
        title: 'Substring with All Words Concatenation',
        summary: 'Find all starting indices of substrings that are concatenations of all given words.',
        patternIds: ['SLIDING_WINDOW'],
        level: 4,
        difficulty: 'EXPERT',
        prompt: `Given a string S and an array of words (all of the same length), find all starting indices where a substring of S is a concatenation of each word in the array exactly once.

Words can appear in any order. Return all starting indices in any order.`,
        constraints: ['1 <= S.length <= 10^4', '1 <= words.length <= 5000', '1 <= words[i].length <= 30', 'S and words[i] consist of lowercase English letters'],
        examples: [
          { input: 'S = "barfoothefoobarman", words = ["foo","bar"]', output: '[0, 9]', explanation: '"barfoo" at 0, "foobar" at 9' },
          { input: 'S = "wordgoodgoodgoodbestword", words = ["word","good","best","word"]', output: '[]', explanation: 'No valid concatenation' },
        ],
        publicTests: [
          { input: 'barfoothefoobarman\nfoo,bar', expectedOutput: '[0, 9]', isHidden: false },
          { input: 'wordgoodgoodgoodbestword\nword,good,best,word', expectedOutput: '[]', isHidden: false },
        ],
        hiddenTests: [
          { input: 'aaaaaaaa\na,a', expectedOutput: '[0, 1, 2, 3, 4, 5, 6]', isHidden: true, explanation: 'Overlapping matches' },
          { input: 'a\na', expectedOutput: '[0]', isHidden: true, explanation: 'Single character word' },
          { input: 'lingmindraboofooowingdingbarrede\nfoo,bar,wing,ding,ing', expectedOutput: '[]', isHidden: true, explanation: 'No valid match' },
        ],
        hints: [
          'All words have the same length, which simplifies the problem.',
          'Use a sliding window of size (word_count * word_length).',
          'Use a hash map to track word frequencies and compare windows.',
          'Consider starting at different offsets within a word length.',
        ],
        timeComplexity: 'O(n * m)',
        spaceComplexity: 'O(w * l)',
        solutionOutline: 'For each starting offset (0 to word_length-1), use a sliding window that moves by word_length. Track word frequencies with a map. When a word is seen more than expected, shrink from left. When exactly all words are matched, record the start index.',
        commonMistakes: [
          'Not considering all possible starting offsets',
          'Not handling duplicate words correctly',
          'Inefficiently checking each possible window from scratch',
          'Off-by-one errors in window boundaries',
        ],
      }),
    ],
  },
  TWO_POINTERS: {
    0: [
      createProblem({
        title: 'Pair Sum in Sorted Array',
        summary: 'Find if there exists a pair of elements in a sorted array that sum to a target.',
        patternIds: ['TWO_POINTERS'],
        level: 0,
        difficulty: 'EASY',
        prompt: `Given a sorted array of integers and a target sum, determine if there exists a pair of elements that add up to the target.

The array is sorted in ascending order. Return true if such a pair exists, false otherwise.`,
        constraints: ['2 <= arr.length <= 10^5', '-10^9 <= arr[i] <= 10^9', 'Array is sorted in ascending order', '-10^9 <= target <= 10^9'],
        examples: [
          { input: 'arr = [1, 2, 4, 6, 8, 9], target = 10', output: 'true', explanation: '2 + 8 = 10 or 4 + 6 = 10' },
          { input: 'arr = [1, 2, 3, 4, 5], target = 10', output: 'false', explanation: 'No pair sums to 10' },
        ],
        publicTests: [
          { input: '[1, 2, 4, 6, 8, 9]\n10', expectedOutput: 'true', isHidden: false },
          { input: '[1, 2, 3, 4, 5]\n10', expectedOutput: 'false', isHidden: false },
        ],
        hiddenTests: [
          { input: '[1, 2]\n3', expectedOutput: 'true', isHidden: true, explanation: 'Minimum array size' },
          { input: '[-3, -2, 0, 1, 5]\n-5', expectedOutput: 'true', isHidden: true, explanation: 'Negative numbers' },
          { input: '[1, 1, 1, 1]\n2', expectedOutput: 'true', isHidden: true, explanation: 'Duplicate elements' },
        ],
        hints: [
          'Since the array is sorted, you can use two pointers starting at opposite ends.',
          'Compare the sum of elements at both pointers with the target.',
          'Move the pointers inward based on whether the sum is too small or too large.',
        ],
        timeComplexity: 'O(n)',
        spaceComplexity: 'O(1)',
        solutionOutline: 'Use two pointers, one at start and one at end. If sum equals target, return true. If sum is less, move left pointer right. If sum is greater, move right pointer left. Continue until pointers meet.',
        commonMistakes: [
          'Using a hash set instead of leveraging the sorted property',
          'Not handling negative numbers correctly',
          'Moving both pointers in the same direction',
        ],
      }),
    ],
    1: [
      createProblem({
        title: 'Container with Maximum Water',
        summary: 'Find two lines that together with the x-axis form a container holding the maximum water.',
        patternIds: ['TWO_POINTERS'],
        level: 1,
        difficulty: 'EASY',
        prompt: `Given an array of non-negative integers representing heights of vertical lines at each index, find two lines that together with the x-axis form a container that would hold the maximum amount of water.

The width of the container is the distance between the two lines. The height is determined by the shorter of the two lines.`,
        constraints: ['2 <= heights.length <= 10^5', '0 <= heights[i] <= 10^4'],
        examples: [
          { input: 'heights = [1, 8, 6, 2, 5, 4, 8, 3, 7]', output: '49', explanation: 'Lines at index 1 and 8 form container of area 7 * 7 = 49' },
          { input: 'heights = [1, 1]', output: '1', explanation: 'Only one possible container' },
        ],
        publicTests: [
          { input: '[1, 8, 6, 2, 5, 4, 8, 3, 7]', expectedOutput: '49', isHidden: false },
          { input: '[1, 1]', expectedOutput: '1', isHidden: false },
        ],
        hiddenTests: [
          { input: '[4, 3, 2, 1, 4]', expectedOutput: '16', isHidden: true, explanation: 'First and last lines' },
          { input: '[1, 2, 1]', expectedOutput: '2', isHidden: true, explanation: 'Three elements' },
          { input: '[0, 0]', expectedOutput: '0', isHidden: true, explanation: 'Zero height' },
        ],
        hints: [
          'Start with the widest container (leftmost and rightmost lines).',
          'The only way to potentially increase area is to move the shorter line inward.',
          'Track the maximum area seen during the process.',
        ],
        timeComplexity: 'O(n)',
        spaceComplexity: 'O(1)',
        solutionOutline: 'Use two pointers at the ends. Calculate area as min(heights) * width. Move the pointer with smaller height inward. Track maximum area. Continue until pointers meet.',
        commonMistakes: [
          'Moving the pointer with the larger height instead of the smaller one',
          'Not understanding why moving the shorter line is optimal',
          'Calculating area incorrectly (using max instead of min for height)',
        ],
      }),
    ],
    2: [
      createProblem({
        title: 'Three Sum to Zero',
        summary: 'Find all unique triplets in an array that sum to zero.',
        patternIds: ['TWO_POINTERS'],
        level: 2,
        difficulty: 'MEDIUM',
        prompt: `Given an array of integers, find all unique triplets [a, b, c] such that a + b + c = 0.

The solution set must not contain duplicate triplets. Return all triplets in any order.`,
        constraints: ['3 <= arr.length <= 3000', '-10^5 <= arr[i] <= 10^5'],
        examples: [
          { input: 'arr = [-1, 0, 1, 2, -1, -4]', output: '[[-1, -1, 2], [-1, 0, 1]]', explanation: 'Two triplets sum to zero' },
          { input: 'arr = [0, 1, 1]', output: '[]', explanation: 'No triplet sums to zero' },
        ],
        publicTests: [
          { input: '[-1, 0, 1, 2, -1, -4]', expectedOutput: '[[-1, -1, 2], [-1, 0, 1]]', isHidden: false },
          { input: '[0, 1, 1]', expectedOutput: '[]', isHidden: false },
        ],
        hiddenTests: [
          { input: '[0, 0, 0]', expectedOutput: '[[0, 0, 0]]', isHidden: true, explanation: 'All zeros' },
          { input: '[0, 0, 0, 0]', expectedOutput: '[[0, 0, 0]]', isHidden: true, explanation: 'Duplicates - only one triplet' },
          { input: '[-2, 0, 1, 1, 2]', expectedOutput: '[[-2, 0, 2], [-2, 1, 1]]', isHidden: true, explanation: 'Multiple valid triplets' },
        ],
        hints: [
          'Sort the array first to make it easier to avoid duplicates.',
          'Fix one element and use two pointers to find the other two.',
          'Skip duplicate values to avoid duplicate triplets in the result.',
        ],
        timeComplexity: 'O(n^2)',
        spaceComplexity: 'O(1)',
        solutionOutline: 'Sort the array. For each element, use two pointers on the remaining elements to find pairs that sum to the negative of the current element. Skip duplicates by checking if current element equals previous.',
        commonMistakes: [
          'Not handling duplicate triplets correctly',
          'Forgetting to sort the array first',
          'Not skipping duplicates in both the outer loop and inner two-pointer search',
        ],
      }),
    ],
    3: [
      createProblem({
        title: 'Trapping Rainwater Between Bars',
        summary: 'Calculate how much rainwater can be trapped between elevation bars.',
        patternIds: ['TWO_POINTERS'],
        level: 3,
        difficulty: 'HARD',
        prompt: `Given an array representing elevation heights of bars, calculate how much rainwater can be trapped between the bars after raining.

Each bar has width 1. Water can be trapped between bars if there are taller bars on both sides.`,
        constraints: ['1 <= heights.length <= 2 * 10^4', '0 <= heights[i] <= 10^5'],
        examples: [
          { input: 'heights = [0, 1, 0, 2, 1, 0, 1, 3, 2, 1, 2, 1]', output: '6', explanation: '6 units of water trapped' },
          { input: 'heights = [4, 2, 0, 3, 2, 5]', output: '9', explanation: '9 units of water trapped' },
        ],
        publicTests: [
          { input: '[0, 1, 0, 2, 1, 0, 1, 3, 2, 1, 2, 1]', expectedOutput: '6', isHidden: false },
          { input: '[4, 2, 0, 3, 2, 5]', expectedOutput: '9', isHidden: false },
        ],
        hiddenTests: [
          { input: '[1, 2, 3, 4, 5]', expectedOutput: '0', isHidden: true, explanation: 'Increasing - no water' },
          { input: '[5, 4, 3, 2, 1]', expectedOutput: '0', isHidden: true, explanation: 'Decreasing - no water' },
          { input: '[3, 0, 0, 0, 3]', expectedOutput: '9', isHidden: true, explanation: 'Large gap' },
        ],
        hints: [
          'Water at any position depends on the minimum of the maximum heights on its left and right.',
          'Use two pointers from both ends, tracking the maximum seen from each side.',
          'Process the side with the smaller maximum first.',
        ],
        timeComplexity: 'O(n)',
        spaceComplexity: 'O(1)',
        solutionOutline: 'Use two pointers and track left_max and right_max. If left_max < right_max, water at left position is left_max - height[left], then move left. Otherwise process right side. Sum all trapped water.',
        commonMistakes: [
          'Not understanding why processing the smaller side is correct',
          'Using O(n) space for prefix/suffix arrays when not necessary',
          'Forgetting that water level is bounded by the shorter of the two maxes',
        ],
      }),
    ],
  },
};

/**
 * Helper function to create a ProblemSpecV1
 */
function createProblem(params: {
  title: string;
  summary: string;
  patternIds: string[];
  level: number;
  difficulty: 'EASY' | 'MEDIUM' | 'HARD' | 'EXPERT';
  prompt: string;
  constraints: string[];
  examples: Array<{ input: string; output: string; explanation?: string }>;
  publicTests: Array<{ input: string; expectedOutput: string; isHidden: boolean; explanation?: string }>;
  hiddenTests: Array<{ input: string; expectedOutput: string; isHidden: boolean; explanation?: string }>;
  hints: string[];
  timeComplexity: string;
  spaceComplexity: string;
  solutionOutline: string;
  commonMistakes: string[];
}): ProblemSpecV1 {
  return {
    title: params.title,
    summary: params.summary,
    patternIds: params.patternIds,
    categories: [],
    level: params.level,
    difficulty: params.difficulty,
    statement: {
      prompt: params.prompt,
      constraints: params.constraints,
      examples: params.examples,
    },
    io: {
      inputFormat: 'Input is provided as described in the examples',
      outputFormat: 'Output should match the expected format',
    },
    tests: {
      public: params.publicTests,
      hidden: params.hiddenTests,
    },
    hints: params.hints,
    reference: {
      solutionOutline: params.solutionOutline,
      timeComplexity: params.timeComplexity,
      spaceComplexity: params.spaceComplexity,
    },
    coach: {
      commonMistakes: params.commonMistakes,
    },
  };
}

/**
 * Create a mock LLM generator that returns pre-defined sample problems
 */
export function createMockLLMGenerator(): LLMGeneratorPort {
  return {
    async generateProblems(input: GenerateProblemInput): Promise<GenerateProblemOutput> {
      const { patternId, level, count, existingTitles } = input;

      // Get problems for this pattern and level
      const patternProblems = SAMPLE_PROBLEMS[patternId];
      if (!patternProblems) {
        // Generate generic placeholder problems for unknown patterns
        return {
          candidates: generatePlaceholderProblems(patternId, level, count, existingTitles),
          model: 'mock-generator-v1',
          tokensUsed: 0,
          durationMs: 100,
        };
      }

      const levelProblems = patternProblems[level];
      if (!levelProblems || levelProblems.length === 0) {
        // Try adjacent levels
        const nearbyLevel = level > 0 ? level - 1 : level + 1;
        const nearbyProblems = patternProblems[nearbyLevel] ?? [];
        if (nearbyProblems.length === 0) {
          return {
            candidates: generatePlaceholderProblems(patternId, level, count, existingTitles),
            model: 'mock-generator-v1',
            tokensUsed: 0,
            durationMs: 100,
          };
        }
        return {
          candidates: nearbyProblems.filter(p => !existingTitles.includes(p.title)).slice(0, count),
          model: 'mock-generator-v1',
          tokensUsed: 0,
          durationMs: 100,
        };
      }

      // Filter out existing titles and return requested count
      const candidates = levelProblems
        .filter(p => !existingTitles.includes(p.title))
        .slice(0, count);

      return {
        candidates,
        model: 'mock-generator-v1',
        tokensUsed: 0,
        durationMs: 100,
      };
    },

    async isAvailable(): Promise<boolean> {
      return true;
    },

    getModelId(): string {
      return 'mock-generator-v1';
    },
  };
}

/**
 * Generate placeholder problems for patterns not in the sample set
 */
function generatePlaceholderProblems(
  patternId: string,
  level: number,
  count: number,
  existingTitles: string[]
): ProblemSpecV1[] {
  const difficulty = level <= 1 ? 'EASY' : level === 2 ? 'MEDIUM' : level === 3 ? 'HARD' : 'EXPERT';
  const problems: ProblemSpecV1[] = [];

  for (let i = 0; i < count; i++) {
    const title = `${patternId} Practice Problem ${i + 1} (Level ${level})`;
    if (existingTitles.includes(title)) continue;

    problems.push(createProblem({
      title,
      summary: `A practice problem for the ${patternId} pattern at difficulty level ${level}.`,
      patternIds: [patternId],
      level,
      difficulty,
      prompt: `This is a placeholder problem for the ${patternId} pattern.\n\nIn a real implementation, this would be generated by an LLM with a specific problem statement, constraints, and examples.`,
      constraints: ['This is a placeholder constraint', 'Input will be valid'],
      examples: [
        { input: 'example input', output: 'example output', explanation: 'Example explanation' },
      ],
      publicTests: [
        { input: 'test1', expectedOutput: 'result1', isHidden: false },
        { input: 'test2', expectedOutput: 'result2', isHidden: false },
      ],
      hiddenTests: [
        { input: 'hidden1', expectedOutput: 'hidden_result1', isHidden: true },
        { input: 'hidden2', expectedOutput: 'hidden_result2', isHidden: true },
        { input: 'hidden3', expectedOutput: 'hidden_result3', isHidden: true },
      ],
      hints: [
        `Think about how the ${patternId} pattern applies to this problem.`,
        'Consider the edge cases carefully.',
        'The solution should be efficient.',
      ],
      timeComplexity: 'O(n)',
      spaceComplexity: 'O(1)',
      solutionOutline: `Apply the ${patternId} pattern to solve this problem efficiently.`,
      commonMistakes: [
        'Not recognizing the pattern',
        'Missing edge cases',
        'Inefficient implementation',
      ],
    }));
  }

  return problems;
}
