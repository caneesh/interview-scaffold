/**
 * Seed problems for pattern packs
 * Each pack contains a canonical problem and siblings (isomorphic variations)
 */
import type { PatternId } from '../entities/pattern.js';
import type { RungLevel } from '../entities/rung.js';

export interface SeedProblem {
  readonly id: string;
  readonly title: string;
  readonly statement: string;
  readonly pattern: PatternId;
  readonly rung: RungLevel;
  readonly targetComplexity: string;
  readonly isCanonical: boolean;
  readonly canonicalId?: string; // reference to canonical if this is a sibling
  readonly testCases: readonly SeedTestCase[];
  readonly hints: readonly string[];
  /** Time budget in ms for large hidden tests (e.g., 500, 1000) */
  readonly timeoutBudgetMs?: number;
  /** Large hidden tests run with budget timeout to detect suboptimal complexity */
  readonly largeHiddenTests?: readonly SeedTestCase[];
}

export interface SeedTestCase {
  readonly input: string;
  readonly expectedOutput: string;
  readonly isHidden: boolean;
  readonly explanation?: string;
}

// ============ DFS + Backtracking (Grid) - Rung 1 ============

const WORD_SEARCH_CANONICAL: SeedProblem = {
  id: 'backtracking-r1-word-search',
  title: 'Word Search',
  statement: `Given an m x n grid of characters 'board' and a string 'word', return true if word exists in the grid.

The word can be constructed from letters of sequentially adjacent cells, where adjacent cells are horizontally or vertically neighboring. The same letter cell may not be used more than once.

Example 1:
Input: board = [["A","B","C","E"],["S","F","C","S"],["A","D","E","E"]], word = "ABCCED"
Output: true

Example 2:
Input: board = [["A","B","C","E"],["S","F","C","S"],["A","D","E","E"]], word = "SEE"
Output: true

Example 3:
Input: board = [["A","B","C","E"],["S","F","C","S"],["A","D","E","E"]], word = "ABCB"
Output: false

Constraints:
- m == board.length
- n == board[i].length
- 1 <= m, n <= 6
- 1 <= word.length <= 15
- board and word consists of only lowercase and uppercase English letters.`,
  pattern: 'BACKTRACKING',
  rung: 1,
  targetComplexity: 'O(m * n * 4^L)',
  isCanonical: true,
  testCases: [
    {
      input: JSON.stringify({
        board: [['A', 'B', 'C', 'E'], ['S', 'F', 'C', 'S'], ['A', 'D', 'E', 'E']],
        word: 'ABCCED',
      }),
      expectedOutput: 'true',
      isHidden: false,
      explanation: 'Path: A(0,0) -> B(0,1) -> C(0,2) -> C(1,2) -> E(2,2) -> D(2,1)',
    },
    {
      input: JSON.stringify({
        board: [['A', 'B', 'C', 'E'], ['S', 'F', 'C', 'S'], ['A', 'D', 'E', 'E']],
        word: 'SEE',
      }),
      expectedOutput: 'true',
      isHidden: false,
      explanation: 'Path: S(1,3) -> E(2,3) -> E(2,2)',
    },
    {
      input: JSON.stringify({
        board: [['A', 'B', 'C', 'E'], ['S', 'F', 'C', 'S'], ['A', 'D', 'E', 'E']],
        word: 'ABCB',
      }),
      expectedOutput: 'false',
      isHidden: false,
      explanation: 'Cannot use same cell twice',
    },
    {
      input: JSON.stringify({
        board: [['A']],
        word: 'A',
      }),
      expectedOutput: 'true',
      isHidden: true,
      explanation: 'Single cell matching single character',
    },
    {
      input: JSON.stringify({
        board: [['A', 'A']],
        word: 'AAA',
      }),
      expectedOutput: 'false',
      isHidden: true,
      explanation: 'Word longer than available unique cells',
    },
  ],
  hints: [
    'What traversal pattern allows you to explore all possible paths from a starting cell?',
    'When you visit a cell, how do you prevent revisiting it in the same path?',
    'Consider marking cells as visited temporarily and unmarking them when backtracking.',
    'For each cell matching word[0], try to build the word by exploring neighbors.',
    'Use DFS with backtracking: mark visited, explore 4 directions, unmark if path fails.',
  ],
};

const WORD_SEARCH_SIBLING_1: SeedProblem = {
  id: 'backtracking-r1-letter-path',
  title: 'Letter Path Finder',
  statement: `You are given a 2D maze represented as a grid of characters and a password string. Determine if the password can be traced through the maze.

A valid path visits adjacent cells (up, down, left, right) and each cell in the path must match the corresponding character in the password. You cannot visit the same cell twice in a single path.

Example 1:
Input: maze = [["P","A","S","S"],["W","O","R","D"],["X","Y","Z","W"]], password = "PASS"
Output: true

Example 2:
Input: maze = [["P","A","S","S"],["W","O","R","D"],["X","Y","Z","W"]], password = "WORD"
Output: true

Example 3:
Input: maze = [["P","A","S","S"],["W","O","R","D"],["X","Y","Z","W"]], password = "PAWS"
Output: false

Constraints:
- 1 <= maze.length, maze[0].length <= 6
- 1 <= password.length <= 15
- maze and password consist of uppercase English letters.`,
  pattern: 'BACKTRACKING',
  rung: 1,
  targetComplexity: 'O(m * n * 4^L)',
  isCanonical: false,
  canonicalId: 'backtracking-r1-word-search',
  testCases: [
    {
      input: JSON.stringify({
        maze: [['P', 'A', 'S', 'S'], ['W', 'O', 'R', 'D'], ['X', 'Y', 'Z', 'W']],
        password: 'PASS',
      }),
      expectedOutput: 'true',
      isHidden: false,
      explanation: 'Path: P(0,0) -> A(0,1) -> S(0,2) -> S(0,3)',
    },
    {
      input: JSON.stringify({
        maze: [['P', 'A', 'S', 'S'], ['W', 'O', 'R', 'D'], ['X', 'Y', 'Z', 'W']],
        password: 'WORD',
      }),
      expectedOutput: 'true',
      isHidden: false,
      explanation: 'Path: W(1,0) -> O(1,1) -> R(1,2) -> D(1,3)',
    },
    {
      input: JSON.stringify({
        maze: [['P', 'A', 'S', 'S'], ['W', 'O', 'R', 'D'], ['X', 'Y', 'Z', 'W']],
        password: 'PAWS',
      }),
      expectedOutput: 'false',
      isHidden: false,
      explanation: 'No valid adjacent path spells PAWS',
    },
    {
      input: JSON.stringify({
        maze: [['A', 'B'], ['B', 'A']],
        password: 'ABBA',
      }),
      expectedOutput: 'true',
      isHidden: true,
      explanation: 'Path that requires backtracking',
    },
  ],
  hints: [
    'Think of this as exploring all possible routes through the maze.',
    'What happens when you hit a dead end? How do you try a different path?',
    'Mark cells as visited while exploring, but unmark them when you backtrack.',
    'Start from any cell matching password[0] and try to extend the path.',
    'Use DFS with backtracking: for each matching start, explore all 4 directions recursively.',
  ],
};

const WORD_SEARCH_SIBLING_2: SeedProblem = {
  id: 'backtracking-r1-name-search',
  title: 'Name Search in Directory Grid',
  statement: `A company stores employee initials in a grid format. Given the grid and a name (represented as a sequence of initials), determine if the name can be found by traversing adjacent cells.

Adjacent cells are those directly above, below, left, or right (not diagonal). Each cell can only be used once per search.

Example 1:
Input: grid = [["J","O","H","N"],["A","M","E","S"],["B","O","B","Y"]], name = "JOHN"
Output: true

Example 2:
Input: grid = [["J","O","H","N"],["A","M","E","S"],["B","O","B","Y"]], name = "JAMES"
Output: false

Example 3:
Input: grid = [["J","O","H","N"],["A","M","E","S"],["B","O","B","Y"]], name = "BOB"
Output: true

Constraints:
- 1 <= grid.length, grid[0].length <= 6
- 1 <= name.length <= 15
- grid and name consist of uppercase English letters.`,
  pattern: 'BACKTRACKING',
  rung: 1,
  targetComplexity: 'O(m * n * 4^L)',
  isCanonical: false,
  canonicalId: 'backtracking-r1-word-search',
  testCases: [
    {
      input: JSON.stringify({
        grid: [['J', 'O', 'H', 'N'], ['A', 'M', 'E', 'S'], ['B', 'O', 'B', 'Y']],
        name: 'JOHN',
      }),
      expectedOutput: 'true',
      isHidden: false,
      explanation: 'Path: J(0,0) -> O(0,1) -> H(0,2) -> N(0,3)',
    },
    {
      input: JSON.stringify({
        grid: [['J', 'O', 'H', 'N'], ['A', 'M', 'E', 'S'], ['B', 'O', 'B', 'Y']],
        name: 'JAMES',
      }),
      expectedOutput: 'false',
      isHidden: false,
      explanation: 'No valid adjacent path spells JAMES',
    },
    {
      input: JSON.stringify({
        grid: [['J', 'O', 'H', 'N'], ['A', 'M', 'E', 'S'], ['B', 'O', 'B', 'Y']],
        name: 'BOB',
      }),
      expectedOutput: 'true',
      isHidden: false,
      explanation: 'Path: B(2,0) -> O(2,1) -> B(2,2)',
    },
    {
      input: JSON.stringify({
        grid: [['A', 'N', 'N', 'A']],
        name: 'ANNA',
      }),
      expectedOutput: 'true',
      isHidden: true,
      explanation: 'Linear path through grid',
    },
  ],
  hints: [
    'How would you systematically check every possible starting position?',
    'When exploring from a cell, what prevents infinite loops?',
    'After exploring one path, you need to "undo" your steps to try another.',
    'For each cell matching name[0], recursively check if remaining letters form a path.',
    'Implement DFS: temporarily mark cells visited, explore 4 directions, restore on backtrack.',
  ],
};

// ============ Interval Merging - Rung 1 ============

const MERGE_INTERVALS_CANONICAL: SeedProblem = {
  id: 'interval-merging-r1-merge-intervals',
  title: 'Merge Intervals',
  statement: `Given an array of intervals where intervals[i] = [start_i, end_i], merge all overlapping intervals, and return an array of the non-overlapping intervals that cover all the intervals in the input.

Example 1:
Input: intervals = [[1,3],[2,6],[8,10],[15,18]]
Output: [[1,6],[8,10],[15,18]]
Explanation: Since intervals [1,3] and [2,6] overlap, merge them into [1,6].

Example 2:
Input: intervals = [[1,4],[4,5]]
Output: [[1,5]]
Explanation: Intervals [1,4] and [4,5] are considered overlapping.

Constraints:
- 1 <= intervals.length <= 10^4
- intervals[i].length == 2
- 0 <= start_i <= end_i <= 10^4`,
  pattern: 'INTERVAL_MERGING',
  rung: 1,
  targetComplexity: 'O(n log n)',
  isCanonical: true,
  testCases: [
    {
      input: JSON.stringify({ intervals: [[1, 3], [2, 6], [8, 10], [15, 18]] }),
      expectedOutput: JSON.stringify([[1, 6], [8, 10], [15, 18]]),
      isHidden: false,
      explanation: '[1,3] and [2,6] overlap, merge to [1,6]',
    },
    {
      input: JSON.stringify({ intervals: [[1, 4], [4, 5]] }),
      expectedOutput: JSON.stringify([[1, 5]]),
      isHidden: false,
      explanation: 'Touching intervals are considered overlapping',
    },
    {
      input: JSON.stringify({ intervals: [[1, 4], [0, 4]] }),
      expectedOutput: JSON.stringify([[0, 4]]),
      isHidden: false,
      explanation: 'Unsorted input - second interval starts before first',
    },
    {
      input: JSON.stringify({ intervals: [[1, 4], [2, 3]] }),
      expectedOutput: JSON.stringify([[1, 4]]),
      isHidden: true,
      explanation: 'One interval fully contains another',
    },
    {
      input: JSON.stringify({ intervals: [[1, 2]] }),
      expectedOutput: JSON.stringify([[1, 2]]),
      isHidden: true,
      explanation: 'Single interval - no merging needed',
    },
  ],
  hints: [
    'What property would make it easier to identify overlapping intervals?',
    'If intervals are sorted by start time, when do two consecutive intervals overlap?',
    'Consider sorting the intervals first, then processing them in order.',
    'Two intervals [a,b] and [c,d] overlap if c <= b (when sorted by start).',
    'Sort by start, iterate through, extend current interval or start new one.',
  ],
  // Complexity budgeting: O(n log n) should complete within 500ms for 10000 intervals
  timeoutBudgetMs: 500,
  largeHiddenTests: [
    {
      // 10000 non-overlapping intervals - O(n²) will timeout, O(n log n) will pass
      // Each interval is [i*2, i*2+1] so no overlaps occur
      input: JSON.stringify({
        intervals: Array.from({ length: 10000 }, (_, i) => [i * 2, i * 2 + 1]),
      }),
      // Expected: same as input since no intervals overlap (already sorted)
      expectedOutput: JSON.stringify(
        Array.from({ length: 10000 }, (_, i) => [i * 2, i * 2 + 1])
      ),
      isHidden: true,
      explanation: 'Large input (n=10000) to verify O(n log n) complexity',
    },
  ],
};

const MERGE_INTERVALS_SIBLING_1: SeedProblem = {
  id: 'interval-merging-r1-merge-time-slots',
  title: 'Merge Meeting Time Slots',
  statement: `A company's scheduling system has recorded meeting times throughout the day. Given a list of meeting time slots where each slot is represented as [startMinute, endMinute] (minutes from midnight), merge all overlapping or adjacent meetings and return the consolidated schedule.

Example 1:
Input: meetings = [[60,120],[90,180],[480,540],[900,1020]]
Output: [[60,180],[480,540],[900,1020]]
Explanation: The first two meetings (1:00-2:00 and 1:30-3:00) overlap, so they merge into one block (1:00-3:00).

Example 2:
Input: meetings = [[540,600],[600,660]]
Output: [[540,660]]
Explanation: Back-to-back meetings (9:00-10:00 and 10:00-11:00) are merged.

Example 3:
Input: meetings = [[120,180],[60,90]]
Output: [[60,90],[120,180]]
Explanation: Non-overlapping meetings remain separate.

Constraints:
- 1 <= meetings.length <= 10^4
- 0 <= startMinute < endMinute <= 1440
- All times are in minutes from midnight (0 = 12:00 AM, 720 = 12:00 PM)`,
  pattern: 'INTERVAL_MERGING',
  rung: 1,
  targetComplexity: 'O(n log n)',
  isCanonical: false,
  canonicalId: 'interval-merging-r1-merge-intervals',
  testCases: [
    {
      input: JSON.stringify({ meetings: [[60, 120], [90, 180], [480, 540], [900, 1020]] }),
      expectedOutput: JSON.stringify([[60, 180], [480, 540], [900, 1020]]),
      isHidden: false,
      explanation: 'First two meetings overlap and merge',
    },
    {
      input: JSON.stringify({ meetings: [[540, 600], [600, 660]] }),
      expectedOutput: JSON.stringify([[540, 660]]),
      isHidden: false,
      explanation: 'Adjacent meetings merge into one',
    },
    {
      input: JSON.stringify({ meetings: [[120, 180], [60, 90]] }),
      expectedOutput: JSON.stringify([[60, 90], [120, 180]]),
      isHidden: false,
      explanation: 'Non-overlapping meetings stay separate',
    },
    {
      input: JSON.stringify({ meetings: [[0, 1440]] }),
      expectedOutput: JSON.stringify([[0, 1440]]),
      isHidden: true,
      explanation: 'All-day meeting',
    },
  ],
  hints: [
    'The meeting times might not be given in chronological order.',
    'What if you sorted the meetings by start time first?',
    'After sorting, when do two consecutive meetings need to be merged?',
    'Two meetings [a,b] and [c,d] overlap or touch if c <= b.',
    'Sort by start time, then greedily merge or add new meeting to result.',
  ],
};

const MERGE_INTERVALS_SIBLING_2: SeedProblem = {
  id: 'interval-merging-r1-consolidate-ranges',
  title: 'Consolidate Data Ranges',
  statement: `A database stores data in ranges. Given a list of data ranges where each range is [startId, endId], consolidate all overlapping or adjacent ranges to minimize storage metadata.

Two ranges can be consolidated if they overlap or if one ends exactly where another begins.

Example 1:
Input: ranges = [[100,200],[150,300],[400,500],[800,900]]
Output: [[100,300],[400,500],[800,900]]
Explanation: Ranges [100,200] and [150,300] overlap, consolidating to [100,300].

Example 2:
Input: ranges = [[1,5],[5,10],[10,15]]
Output: [[1,15]]
Explanation: All ranges are adjacent and consolidate into one.

Example 3:
Input: ranges = [[1,3],[6,9]]
Output: [[1,3],[6,9]]
Explanation: Non-overlapping, non-adjacent ranges stay separate.

Constraints:
- 1 <= ranges.length <= 10^4
- 0 <= startId <= endId <= 10^6`,
  pattern: 'INTERVAL_MERGING',
  rung: 1,
  targetComplexity: 'O(n log n)',
  isCanonical: false,
  canonicalId: 'interval-merging-r1-merge-intervals',
  testCases: [
    {
      input: JSON.stringify({ ranges: [[100, 200], [150, 300], [400, 500], [800, 900]] }),
      expectedOutput: JSON.stringify([[100, 300], [400, 500], [800, 900]]),
      isHidden: false,
      explanation: 'First two ranges overlap and consolidate',
    },
    {
      input: JSON.stringify({ ranges: [[1, 5], [5, 10], [10, 15]] }),
      expectedOutput: JSON.stringify([[1, 15]]),
      isHidden: false,
      explanation: 'Adjacent ranges consolidate into one',
    },
    {
      input: JSON.stringify({ ranges: [[1, 3], [6, 9]] }),
      expectedOutput: JSON.stringify([[1, 3], [6, 9]]),
      isHidden: false,
      explanation: 'Gap between ranges - no consolidation',
    },
    {
      input: JSON.stringify({ ranges: [[5, 10], [1, 3]] }),
      expectedOutput: JSON.stringify([[1, 3], [5, 10]]),
      isHidden: true,
      explanation: 'Unsorted input',
    },
  ],
  hints: [
    'Processing ranges in order would simplify the problem.',
    'Sort the ranges by their start value.',
    'When do two consecutive ranges need to be merged?',
    'Ranges [a,b] and [c,d] can merge if c <= b (assuming sorted by start).',
    'Iterate through sorted ranges, extend current or start new consolidated range.',
  ],
};

// ============ DFS + Backtracking (Grid) - Rung 2 ============
// Rung 2: Pattern recognition with common variations
// Variation: Collect all valid paths instead of just checking existence

const PATH_COUNT_CANONICAL: SeedProblem = {
  id: 'backtracking-r2-unique-paths',
  title: 'Count Unique Paths in Grid',
  statement: `Given an m x n grid where some cells are blocked (marked as 1) and others are open (marked as 0), count the number of unique paths from the top-left corner to the bottom-right corner.

You can only move right or down at each step. You cannot pass through blocked cells.

Example 1:
Input: grid = [[0,0,0],[0,1,0],[0,0,0]]
Output: 2
Explanation: There are two paths:
1. Right -> Right -> Down -> Down
2. Down -> Down -> Right -> Right
The middle cell is blocked, so paths must go around it.

Example 2:
Input: grid = [[0,1],[0,0]]
Output: 1
Explanation: Only one path exists (Down -> Right).

Example 3:
Input: grid = [[1,0],[0,0]]
Output: 0
Explanation: Starting cell is blocked, no paths exist.

Constraints:
- m == grid.length
- n == grid[0].length
- 1 <= m, n <= 10
- grid[i][j] is 0 or 1`,
  pattern: 'BACKTRACKING',
  rung: 2,
  targetComplexity: 'O(2^(m+n))',
  isCanonical: true,
  testCases: [
    {
      input: JSON.stringify({ grid: [[0, 0, 0], [0, 1, 0], [0, 0, 0]] }),
      expectedOutput: '2',
      isHidden: false,
      explanation: 'Two paths around the blocked center cell',
    },
    {
      input: JSON.stringify({ grid: [[0, 1], [0, 0]] }),
      expectedOutput: '1',
      isHidden: false,
      explanation: 'Single path: Down -> Right',
    },
    {
      input: JSON.stringify({ grid: [[1, 0], [0, 0]] }),
      expectedOutput: '0',
      isHidden: false,
      explanation: 'Start blocked - no valid paths',
    },
    {
      input: JSON.stringify({ grid: [[0, 0], [0, 1]] }),
      expectedOutput: '0',
      isHidden: true,
      explanation: 'End blocked - no valid paths',
    },
    {
      input: JSON.stringify({ grid: [[0]] }),
      expectedOutput: '1',
      isHidden: true,
      explanation: 'Single cell grid - already at destination',
    },
  ],
  hints: [
    'How is this different from just checking if a path exists?',
    'Instead of returning true/false, what should you accumulate?',
    'At each cell, explore both directions and sum the results.',
    'Base case: reaching destination returns 1, hitting boundary/block returns 0.',
    'Use DFS from (0,0), recursively count paths going right + paths going down.',
  ],
};

const PATH_COUNT_SIBLING_1: SeedProblem = {
  id: 'backtracking-r2-robot-paths',
  title: 'Robot Navigation Paths',
  statement: `A robot is located at the top-left corner of an m x n warehouse grid. The robot can only move either right or down at any point in time.

Some cells contain obstacles (marked as 1) that the robot cannot pass through. Empty cells are marked as 0.

Count how many unique paths the robot can take to reach the bottom-right corner.

Example 1:
Input: warehouse = [[0,0,0],[0,1,0],[0,0,0]]
Output: 2

Example 2:
Input: warehouse = [[0,0,0,0],[0,0,1,0],[0,0,0,0]]
Output: 4

Example 3:
Input: warehouse = [[0,1],[1,0]]
Output: 0
Explanation: Both possible first moves lead to obstacles.

Constraints:
- 1 <= m, n <= 10
- warehouse[i][j] is 0 or 1`,
  pattern: 'BACKTRACKING',
  rung: 2,
  targetComplexity: 'O(2^(m+n))',
  isCanonical: false,
  canonicalId: 'backtracking-r2-unique-paths',
  testCases: [
    {
      input: JSON.stringify({ warehouse: [[0, 0, 0], [0, 1, 0], [0, 0, 0]] }),
      expectedOutput: '2',
      isHidden: false,
      explanation: 'Two paths around the obstacle',
    },
    {
      input: JSON.stringify({ warehouse: [[0, 0, 0, 0], [0, 0, 1, 0], [0, 0, 0, 0]] }),
      expectedOutput: '4',
      isHidden: false,
      explanation: 'Multiple paths with one obstacle',
    },
    {
      input: JSON.stringify({ warehouse: [[0, 1], [1, 0]] }),
      expectedOutput: '0',
      isHidden: false,
      explanation: 'Blocked in both directions',
    },
    {
      input: JSON.stringify({ warehouse: [[0, 0, 0], [0, 0, 0], [0, 0, 0]] }),
      expectedOutput: '6',
      isHidden: true,
      explanation: '3x3 grid with no obstacles',
    },
  ],
  hints: [
    'The robot needs to count paths, not just find one.',
    'From each cell, how many paths come from going right vs going down?',
    'Recursively explore both directions and add the counts.',
    'Return 1 when you reach the destination, 0 for invalid positions.',
    'DFS with counting: paths(r,c) = paths(r+1,c) + paths(r,c+1)',
  ],
};

const PATH_COUNT_SIBLING_2: SeedProblem = {
  id: 'backtracking-r2-delivery-routes',
  title: 'Delivery Route Count',
  statement: `A delivery driver starts at the top-left corner of a city grid and needs to reach the bottom-right corner. The driver can only go east (right) or south (down) due to one-way streets.

Some intersections are closed for construction (marked as 1). Open intersections are marked as 0.

How many different routes can the driver take?

Example 1:
Input: city = [[0,0,0],[0,1,0],[0,0,0]]
Output: 2

Example 2:
Input: city = [[0,0],[0,0]]
Output: 2
Explanation: Two routes: Right->Down or Down->Right

Example 3:
Input: city = [[0,0,1],[0,0,0],[1,0,0]]
Output: 3

Constraints:
- 1 <= m, n <= 10
- city[i][j] is 0 or 1`,
  pattern: 'BACKTRACKING',
  rung: 2,
  targetComplexity: 'O(2^(m+n))',
  isCanonical: false,
  canonicalId: 'backtracking-r2-unique-paths',
  testCases: [
    {
      input: JSON.stringify({ city: [[0, 0, 0], [0, 1, 0], [0, 0, 0]] }),
      expectedOutput: '2',
      isHidden: false,
      explanation: 'Two routes around construction',
    },
    {
      input: JSON.stringify({ city: [[0, 0], [0, 0]] }),
      expectedOutput: '2',
      isHidden: false,
      explanation: 'Simple 2x2 grid',
    },
    {
      input: JSON.stringify({ city: [[0, 0, 1], [0, 0, 0], [1, 0, 0]] }),
      expectedOutput: '3',
      isHidden: false,
      explanation: 'Multiple paths with corner obstacles',
    },
    {
      input: JSON.stringify({ city: [[0, 0, 0, 0]] }),
      expectedOutput: '1',
      isHidden: true,
      explanation: 'Single row - only one path',
    },
  ],
  hints: [
    'Each route is a sequence of right/down moves - count all valid sequences.',
    'When you reach the destination, that counts as 1 complete route.',
    'When blocked or out of bounds, that branch contributes 0 routes.',
    'Total routes from a cell = routes going south + routes going east.',
    'Implement DFS that returns count instead of boolean.',
  ],
};

// ============ Interval Merging - Rung 2 ============
// Rung 2: Pattern recognition with common variations
// Variation: Insert a new interval into sorted non-overlapping intervals

const INSERT_INTERVAL_CANONICAL: SeedProblem = {
  id: 'interval-merging-r2-insert-interval',
  title: 'Insert Interval',
  statement: `You are given an array of non-overlapping intervals 'intervals' sorted by start time, and a new interval 'newInterval'.

Insert 'newInterval' into 'intervals' such that 'intervals' is still sorted and non-overlapping (merge overlapping intervals if necessary).

Return the resulting intervals.

Example 1:
Input: intervals = [[1,3],[6,9]], newInterval = [2,5]
Output: [[1,5],[6,9]]
Explanation: [2,5] overlaps with [1,3], merging them into [1,5].

Example 2:
Input: intervals = [[1,2],[3,5],[6,7],[8,10],[12,16]], newInterval = [4,8]
Output: [[1,2],[3,10],[12,16]]
Explanation: [4,8] overlaps with [3,5],[6,7],[8,10], merging into [3,10].

Example 3:
Input: intervals = [], newInterval = [5,7]
Output: [[5,7]]

Constraints:
- 0 <= intervals.length <= 10^4
- intervals[i].length == 2
- 0 <= start_i <= end_i <= 10^5
- intervals is sorted by start_i in ascending order
- newInterval.length == 2`,
  pattern: 'INTERVAL_MERGING',
  rung: 2,
  targetComplexity: 'O(n)',
  isCanonical: true,
  testCases: [
    {
      input: JSON.stringify({ intervals: [[1, 3], [6, 9]], newInterval: [2, 5] }),
      expectedOutput: JSON.stringify([[1, 5], [6, 9]]),
      isHidden: false,
      explanation: 'New interval overlaps with first, merge to [1,5]',
    },
    {
      input: JSON.stringify({
        intervals: [[1, 2], [3, 5], [6, 7], [8, 10], [12, 16]],
        newInterval: [4, 8],
      }),
      expectedOutput: JSON.stringify([[1, 2], [3, 10], [12, 16]]),
      isHidden: false,
      explanation: 'New interval merges three existing intervals',
    },
    {
      input: JSON.stringify({ intervals: [], newInterval: [5, 7] }),
      expectedOutput: JSON.stringify([[5, 7]]),
      isHidden: false,
      explanation: 'Empty list - just add the new interval',
    },
    {
      input: JSON.stringify({ intervals: [[1, 5]], newInterval: [2, 3] }),
      expectedOutput: JSON.stringify([[1, 5]]),
      isHidden: true,
      explanation: 'New interval fully contained in existing',
    },
    {
      input: JSON.stringify({ intervals: [[3, 5]], newInterval: [1, 2] }),
      expectedOutput: JSON.stringify([[1, 2], [3, 5]]),
      isHidden: true,
      explanation: 'New interval comes before all existing',
    },
  ],
  hints: [
    'The input intervals are already sorted - how does this help?',
    'Can you identify three groups: intervals before, overlapping with, and after the new one?',
    'Intervals that end before newInterval starts don\'t overlap.',
    'Intervals that start after newInterval ends don\'t overlap.',
    'Add non-overlapping intervals before, merge all overlapping into one, add non-overlapping after.',
  ],
};

const INSERT_INTERVAL_SIBLING_1: SeedProblem = {
  id: 'interval-merging-r2-schedule-meeting',
  title: 'Schedule New Meeting',
  statement: `You have a sorted list of existing meetings (non-overlapping) and need to schedule a new meeting.

Given 'schedule' where each meeting is [startTime, endTime] in minutes from midnight, and a 'newMeeting' to add, return the updated schedule with the new meeting inserted.

If the new meeting overlaps with existing ones, merge them all into a single block.

Example 1:
Input: schedule = [[60,120],[180,240]], newMeeting = [100,200]
Output: [[60,240]]
Explanation: New meeting 1:40-3:20 overlaps with both existing meetings.

Example 2:
Input: schedule = [[60,120],[180,240]], newMeeting = [130,170]
Output: [[60,120],[130,170],[180,240]]
Explanation: New meeting fits in the gap without overlap.

Example 3:
Input: schedule = [[540,600]], newMeeting = [480,520]
Output: [[480,600]]
Explanation: New meeting overlaps and extends the start time.

Constraints:
- 0 <= schedule.length <= 10^4
- 0 <= startTime < endTime <= 1440
- schedule is sorted by start time`,
  pattern: 'INTERVAL_MERGING',
  rung: 2,
  targetComplexity: 'O(n)',
  isCanonical: false,
  canonicalId: 'interval-merging-r2-insert-interval',
  testCases: [
    {
      input: JSON.stringify({ schedule: [[60, 120], [180, 240]], newMeeting: [100, 200] }),
      expectedOutput: JSON.stringify([[60, 240]]),
      isHidden: false,
      explanation: 'New meeting bridges both existing ones',
    },
    {
      input: JSON.stringify({ schedule: [[60, 120], [180, 240]], newMeeting: [130, 170] }),
      expectedOutput: JSON.stringify([[60, 120], [130, 170], [180, 240]]),
      isHidden: false,
      explanation: 'New meeting fits in gap',
    },
    {
      input: JSON.stringify({ schedule: [[540, 600]], newMeeting: [480, 520] }),
      expectedOutput: JSON.stringify([[480, 600]]),
      isHidden: false,
      explanation: 'Overlap extends start time',
    },
    {
      input: JSON.stringify({ schedule: [], newMeeting: [600, 660] }),
      expectedOutput: JSON.stringify([[600, 660]]),
      isHidden: true,
      explanation: 'Empty schedule',
    },
  ],
  hints: [
    'Meetings are already sorted - iterate through in order.',
    'Collect meetings that end before new one starts (no overlap).',
    'Merge all overlapping meetings with the new one.',
    'Collect meetings that start after merged block ends.',
    'Combine all three groups for final schedule.',
  ],
};

const INSERT_INTERVAL_SIBLING_2: SeedProblem = {
  id: 'interval-merging-r2-add-reservation',
  title: 'Add Reservation to Bookings',
  statement: `A hotel system maintains a sorted list of room reservations (non-overlapping) for a day.

Given 'bookings' where each reservation is [checkIn, checkOut] in hours (0-24), and a 'newReservation' to add, return the updated bookings.

Overlapping reservations must be merged. A guest checking out at hour X and another checking in at hour X do NOT overlap.

Example 1:
Input: bookings = [[9,12],[14,17]], newReservation = [11,15]
Output: [[9,17]]
Explanation: New reservation overlaps with both, creating one long booking.

Example 2:
Input: bookings = [[9,12],[14,17]], newReservation = [12,14]
Output: [[9,12],[12,14],[14,17]]
Explanation: Touching but not overlapping - stays separate.

Example 3:
Input: bookings = [[10,12]], newReservation = [8,9]
Output: [[8,9],[10,12]]
Explanation: New reservation comes before existing one.

Constraints:
- 0 <= bookings.length <= 10^4
- 0 <= checkIn < checkOut <= 24
- bookings is sorted by checkIn`,
  pattern: 'INTERVAL_MERGING',
  rung: 2,
  targetComplexity: 'O(n)',
  isCanonical: false,
  canonicalId: 'interval-merging-r2-insert-interval',
  testCases: [
    {
      input: JSON.stringify({ bookings: [[9, 12], [14, 17]], newReservation: [11, 15] }),
      expectedOutput: JSON.stringify([[9, 17]]),
      isHidden: false,
      explanation: 'Bridges both bookings',
    },
    {
      input: JSON.stringify({ bookings: [[9, 12], [14, 17]], newReservation: [12, 14] }),
      expectedOutput: JSON.stringify([[9, 12], [12, 14], [14, 17]]),
      isHidden: false,
      explanation: 'Touching intervals stay separate',
    },
    {
      input: JSON.stringify({ bookings: [[10, 12]], newReservation: [8, 9] }),
      expectedOutput: JSON.stringify([[8, 9], [10, 12]]),
      isHidden: false,
      explanation: 'New reservation before existing',
    },
    {
      input: JSON.stringify({ bookings: [[10, 12]], newReservation: [13, 15] }),
      expectedOutput: JSON.stringify([[10, 12], [13, 15]]),
      isHidden: true,
      explanation: 'New reservation after existing',
    },
  ],
  hints: [
    'Note: touching intervals (end == start) do NOT overlap here.',
    'Process bookings in order since they\'re sorted.',
    'An interval overlaps if: existing.end > new.start AND existing.start < new.end',
    'Merge phase: expand new reservation to cover all overlapping bookings.',
    'Three phases: add before, merge overlapping, add after.',
  ],
};

// ============ DFS + Backtracking (Grid) - Rung 3 ============
// Rung 3: Real-world constraints and edge cases
// Variation: Generate all valid combinations with complex constraints

const GENERATE_PARENTHESES_CANONICAL: SeedProblem = {
  id: 'backtracking-r3-generate-parentheses',
  title: 'Generate Parentheses',
  statement: `Given n pairs of parentheses, write a function to generate all combinations of well-formed parentheses.

A well-formed parentheses string has:
- Equal number of opening and closing parentheses
- At every prefix, the number of opening parentheses >= number of closing parentheses

Example 1:
Input: n = 3
Output: ["((()))","(()())","(())()","()(())","()()()"]

Example 2:
Input: n = 1
Output: ["()"]

Example 3:
Input: n = 2
Output: ["(())","()()"]

Constraints:
- 1 <= n <= 8`,
  pattern: 'BACKTRACKING',
  rung: 3,
  targetComplexity: 'O(4^n / sqrt(n))',
  isCanonical: true,
  testCases: [
    {
      input: JSON.stringify({ n: 3 }),
      expectedOutput: JSON.stringify(['((()))', '(()())', '(())()', '()(())', '()()()']),
      isHidden: false,
      explanation: 'All 5 valid combinations for n=3',
    },
    {
      input: JSON.stringify({ n: 1 }),
      expectedOutput: JSON.stringify(['()']),
      isHidden: false,
      explanation: 'Only one way with single pair',
    },
    {
      input: JSON.stringify({ n: 2 }),
      expectedOutput: JSON.stringify(['(())', '()()']),
      isHidden: false,
      explanation: 'Two valid combinations for n=2',
    },
    {
      input: JSON.stringify({ n: 4 }),
      expectedOutput: JSON.stringify([
        '(((())))', '((()()))', '((())())', '((()))()', '(()(()))',
        '(()()())', '(()())()', '(())(())', '(())()()', '()((()))',
        '()(()())', '()(())()', '()()(())', '()()()()',
      ]),
      isHidden: true,
      explanation: '14 valid combinations for n=4 (Catalan number)',
    },
  ],
  hints: [
    'What makes a parentheses string invalid as you build it?',
    'Track two counts: open parentheses used and close parentheses used.',
    'When can you add an open parenthesis? When can you add a close?',
    'You can add "(" if open < n. You can add ")" if close < open.',
    'Backtrack by building string char by char, branching on valid choices.',
  ],
};

const GENERATE_PARENTHESES_SIBLING_1: SeedProblem = {
  id: 'backtracking-r3-valid-brackets',
  title: 'Generate Valid Bracket Sequences',
  statement: `A compiler needs to generate all valid bracket sequences of a given length for testing.

Given n pairs of square brackets, generate all valid sequences where:
- Every opening bracket '[' has a matching closing bracket ']'
- Brackets are properly nested (no interleaving)

Example 1:
Input: n = 3
Output: ["[[[]]]","[[][]]","[[]][]","[][[]]","[][][]"]

Example 2:
Input: n = 1
Output: ["[]"]

Example 3:
Input: n = 2
Output: ["[[]]","[][]"]

Constraints:
- 1 <= n <= 8`,
  pattern: 'BACKTRACKING',
  rung: 3,
  targetComplexity: 'O(4^n / sqrt(n))',
  isCanonical: false,
  canonicalId: 'backtracking-r3-generate-parentheses',
  testCases: [
    {
      input: JSON.stringify({ n: 3 }),
      expectedOutput: JSON.stringify(['[[[]]]', '[[][]]', '[[]][]', '[][[]]', '[][][]']),
      isHidden: false,
      explanation: 'All 5 valid bracket sequences',
    },
    {
      input: JSON.stringify({ n: 1 }),
      expectedOutput: JSON.stringify(['[]']),
      isHidden: false,
      explanation: 'Single pair',
    },
    {
      input: JSON.stringify({ n: 2 }),
      expectedOutput: JSON.stringify(['[[]]', '[][]']),
      isHidden: false,
      explanation: 'Two valid sequences',
    },
  ],
  hints: [
    'This is structurally identical to generating parentheses.',
    'Track open brackets used vs close brackets used.',
    'Only add "]" if there are unmatched "[" brackets.',
    'Add "[" if you haven\'t used all n opening brackets yet.',
    'Build character by character, exploring both choices when valid.',
  ],
};

const GENERATE_PARENTHESES_SIBLING_2: SeedProblem = {
  id: 'backtracking-r3-valid-tags',
  title: 'Generate Valid HTML Tag Pairs',
  statement: `A template engine needs to generate all valid HTML tag nesting patterns for testing.

Given n pairs of tags (represented as "<>" for open and "</>" for close), generate all valid nesting patterns.

A valid pattern has:
- Equal numbers of open and close tags
- Every close tag matches a preceding unmatched open tag

Example 1:
Input: n = 3
Output: ["<><></>", "<></><>", "<></>", "</><>", "</>"]

Note: Output represented as: "<<<>>>", "<<>><>", "<<><>>", "<><<>>", "<><><>"
(using < for open tag, > for close tag for brevity)

Example 2:
Input: n = 1
Output: ["<>"]

Example 3:
Input: n = 2
Output: ["<<>>","<><>"]

Constraints:
- 1 <= n <= 8`,
  pattern: 'BACKTRACKING',
  rung: 3,
  targetComplexity: 'O(4^n / sqrt(n))',
  isCanonical: false,
  canonicalId: 'backtracking-r3-generate-parentheses',
  testCases: [
    {
      input: JSON.stringify({ n: 3 }),
      expectedOutput: JSON.stringify(['<<<>>>', '<<>><>', '<<><>>', '<><<>>', '<><><>']),
      isHidden: false,
      explanation: 'All 5 valid nesting patterns',
    },
    {
      input: JSON.stringify({ n: 1 }),
      expectedOutput: JSON.stringify(['<>']),
      isHidden: false,
      explanation: 'Single tag pair',
    },
    {
      input: JSON.stringify({ n: 2 }),
      expectedOutput: JSON.stringify(['<<>>', '<><>']),
      isHidden: false,
      explanation: 'Two valid patterns',
    },
  ],
  hints: [
    'Think of "<" as open and ">" as close - same structure as parentheses.',
    'Track: how many open tags used, how many close tags used.',
    'Can add open tag if openCount < n.',
    'Can add close tag if closeCount < openCount.',
    'Recursively build the string, backtracking on invalid paths.',
  ],
};

// ============ Interval Merging - Rung 3 ============
// Rung 3: Real-world constraints and edge cases
// Variation: Find intersections between two interval lists

const INTERVAL_INTERSECTION_CANONICAL: SeedProblem = {
  id: 'interval-merging-r3-interval-intersection',
  title: 'Interval List Intersections',
  statement: `You are given two lists of closed intervals, firstList and secondList, where each list is pairwise disjoint and in sorted order.

Return the intersection of these two interval lists.

A closed interval [a, b] (with a <= b) denotes the set of real numbers x with a <= x <= b.

The intersection of two closed intervals is a set of real numbers that is either empty, or represented as a closed interval.

Example 1:
Input: firstList = [[0,2],[5,10],[13,23],[24,25]], secondList = [[1,5],[8,12],[15,24],[25,26]]
Output: [[1,2],[5,5],[8,10],[15,23],[24,24],[25,25]]

Example 2:
Input: firstList = [[1,3],[5,9]], secondList = []
Output: []

Example 3:
Input: firstList = [], secondList = [[4,8],[10,12]]
Output: []

Constraints:
- 0 <= firstList.length, secondList.length <= 1000
- 0 <= start_i < end_i <= 10^9
- Both lists are sorted by start time
- Intervals within each list are disjoint`,
  pattern: 'INTERVAL_MERGING',
  rung: 3,
  targetComplexity: 'O(m + n)',
  isCanonical: true,
  testCases: [
    {
      input: JSON.stringify({
        firstList: [[0, 2], [5, 10], [13, 23], [24, 25]],
        secondList: [[1, 5], [8, 12], [15, 24], [25, 26]],
      }),
      expectedOutput: JSON.stringify([[1, 2], [5, 5], [8, 10], [15, 23], [24, 24], [25, 25]]),
      isHidden: false,
      explanation: 'Multiple overlapping regions produce multiple intersections',
    },
    {
      input: JSON.stringify({ firstList: [[1, 3], [5, 9]], secondList: [] }),
      expectedOutput: JSON.stringify([]),
      isHidden: false,
      explanation: 'Empty list produces no intersections',
    },
    {
      input: JSON.stringify({ firstList: [], secondList: [[4, 8], [10, 12]] }),
      expectedOutput: JSON.stringify([]),
      isHidden: false,
      explanation: 'Empty list produces no intersections',
    },
    {
      input: JSON.stringify({ firstList: [[1, 7]], secondList: [[3, 10]] }),
      expectedOutput: JSON.stringify([[3, 7]]),
      isHidden: true,
      explanation: 'Single overlapping pair',
    },
    {
      input: JSON.stringify({ firstList: [[1, 3]], secondList: [[5, 7]] }),
      expectedOutput: JSON.stringify([]),
      isHidden: true,
      explanation: 'Non-overlapping intervals',
    },
  ],
  hints: [
    'Use two pointers, one for each list.',
    'How do you compute the intersection of two intervals [a,b] and [c,d]?',
    'Intersection exists if max(a,c) <= min(b,d). The intersection is [max(a,c), min(b,d)].',
    'After processing, which pointer do you advance? The one with the smaller end.',
    'Advance the pointer whose current interval ends first (it can\'t intersect with future intervals).',
  ],
};

const INTERVAL_INTERSECTION_SIBLING_1: SeedProblem = {
  id: 'interval-merging-r3-schedule-overlap',
  title: 'Find Common Meeting Times',
  statement: `Two employees have different meeting schedules. Find all time periods when BOTH are in meetings simultaneously (overlapping busy times).

Given two schedules where each is a sorted list of non-overlapping meetings [start, end] in minutes from midnight, return all periods when both employees are busy at the same time.

Example 1:
Input: schedule1 = [[60,120],[180,240]], schedule2 = [[90,150],[200,260]]
Output: [[90,120],[200,240]]
Explanation: Both busy 1:30-2:00 and 3:20-4:00.

Example 2:
Input: schedule1 = [[60,120]], schedule2 = [[180,240]]
Output: []
Explanation: No overlapping meetings.

Example 3:
Input: schedule1 = [[0,480]], schedule2 = [[60,120],[180,240],[300,420]]
Output: [[60,120],[180,240],[300,420]]
Explanation: Employee 1 is in an all-morning meeting.

Constraints:
- 0 <= schedule length <= 1000
- 0 <= start < end <= 1440
- Each schedule is sorted and non-overlapping`,
  pattern: 'INTERVAL_MERGING',
  rung: 3,
  targetComplexity: 'O(m + n)',
  isCanonical: false,
  canonicalId: 'interval-merging-r3-interval-intersection',
  testCases: [
    {
      input: JSON.stringify({
        schedule1: [[60, 120], [180, 240]],
        schedule2: [[90, 150], [200, 260]],
      }),
      expectedOutput: JSON.stringify([[90, 120], [200, 240]]),
      isHidden: false,
      explanation: 'Partial overlaps create intersection periods',
    },
    {
      input: JSON.stringify({ schedule1: [[60, 120]], schedule2: [[180, 240]] }),
      expectedOutput: JSON.stringify([]),
      isHidden: false,
      explanation: 'No overlap',
    },
    {
      input: JSON.stringify({
        schedule1: [[0, 480]],
        schedule2: [[60, 120], [180, 240], [300, 420]],
      }),
      expectedOutput: JSON.stringify([[60, 120], [180, 240], [300, 420]]),
      isHidden: false,
      explanation: 'One long meeting overlaps multiple shorter ones',
    },
    {
      input: JSON.stringify({ schedule1: [], schedule2: [[60, 120]] }),
      expectedOutput: JSON.stringify([]),
      isHidden: true,
      explanation: 'Empty schedule',
    },
  ],
  hints: [
    'Use two pointers to walk through both schedules.',
    'Two meetings [a,b] and [c,d] overlap if max(a,c) < min(b,d).',
    'The overlap period is [max(a,c), min(b,d)].',
    'After checking overlap, advance the pointer with the earlier end time.',
    'That meeting can\'t overlap with any future meetings in the other schedule.',
  ],
};

const INTERVAL_INTERSECTION_SIBLING_2: SeedProblem = {
  id: 'interval-merging-r3-coverage-overlap',
  title: 'Network Coverage Overlap',
  statement: `Two cell towers have different coverage time windows during the day (for maintenance, power saving, etc.).

Given the active periods for each tower as sorted, non-overlapping intervals [startHour, endHour], find all periods when BOTH towers are active simultaneously.

Example 1:
Input: tower1 = [[0,6],[8,18],[20,24]], tower2 = [[4,10],[14,22]]
Output: [[4,6],[8,10],[14,18],[20,22]]
Explanation: Overlapping active periods.

Example 2:
Input: tower1 = [[0,8]], tower2 = [[10,20]]
Output: []
Explanation: Towers are never active at the same time.

Example 3:
Input: tower1 = [[0,24]], tower2 = [[6,8],[12,14],[18,20]]
Output: [[6,8],[12,14],[18,20]]
Explanation: Tower 1 is always active; intersections match tower 2's windows.

Constraints:
- 0 <= intervals <= 100
- 0 <= startHour < endHour <= 24
- Intervals are sorted and non-overlapping`,
  pattern: 'INTERVAL_MERGING',
  rung: 3,
  targetComplexity: 'O(m + n)',
  isCanonical: false,
  canonicalId: 'interval-merging-r3-interval-intersection',
  testCases: [
    {
      input: JSON.stringify({
        tower1: [[0, 6], [8, 18], [20, 24]],
        tower2: [[4, 10], [14, 22]],
      }),
      expectedOutput: JSON.stringify([[4, 6], [8, 10], [14, 18], [20, 22]]),
      isHidden: false,
      explanation: 'Multiple overlap regions',
    },
    {
      input: JSON.stringify({ tower1: [[0, 8]], tower2: [[10, 20]] }),
      expectedOutput: JSON.stringify([]),
      isHidden: false,
      explanation: 'No overlap',
    },
    {
      input: JSON.stringify({
        tower1: [[0, 24]],
        tower2: [[6, 8], [12, 14], [18, 20]],
      }),
      expectedOutput: JSON.stringify([[6, 8], [12, 14], [18, 20]]),
      isHidden: false,
      explanation: 'Always-on tower matches all other windows',
    },
    {
      input: JSON.stringify({ tower1: [[0, 12]], tower2: [[0, 12]] }),
      expectedOutput: JSON.stringify([[0, 12]]),
      isHidden: true,
      explanation: 'Identical intervals',
    },
  ],
  hints: [
    'Two-pointer approach: one for each tower\'s schedule.',
    'Intersection of [a,b] and [c,d] exists when max(a,c) <= min(b,d).',
    'The intersection is [max(a,c), min(b,d)] when it exists.',
    'Move the pointer pointing to the interval that ends earlier.',
    'Continue until one list is exhausted.',
  ],
};

// ============ Exported Pack Structure ============

export interface PatternPack {
  readonly pattern: PatternId;
  readonly rung: RungLevel;
  readonly canonical: SeedProblem;
  readonly siblings: readonly SeedProblem[];
}

export const RUNG_1_PACKS: readonly PatternPack[] = [
  {
    pattern: 'BACKTRACKING',
    rung: 1,
    canonical: WORD_SEARCH_CANONICAL,
    siblings: [WORD_SEARCH_SIBLING_1, WORD_SEARCH_SIBLING_2],
  },
  {
    pattern: 'INTERVAL_MERGING',
    rung: 1,
    canonical: MERGE_INTERVALS_CANONICAL,
    siblings: [MERGE_INTERVALS_SIBLING_1, MERGE_INTERVALS_SIBLING_2],
  },
];

export const RUNG_2_PACKS: readonly PatternPack[] = [
  {
    pattern: 'BACKTRACKING',
    rung: 2,
    canonical: PATH_COUNT_CANONICAL,
    siblings: [PATH_COUNT_SIBLING_1, PATH_COUNT_SIBLING_2],
  },
  {
    pattern: 'INTERVAL_MERGING',
    rung: 2,
    canonical: INSERT_INTERVAL_CANONICAL,
    siblings: [INSERT_INTERVAL_SIBLING_1, INSERT_INTERVAL_SIBLING_2],
  },
];

export const RUNG_3_PACKS: readonly PatternPack[] = [
  {
    pattern: 'BACKTRACKING',
    rung: 3,
    canonical: GENERATE_PARENTHESES_CANONICAL,
    siblings: [GENERATE_PARENTHESES_SIBLING_1, GENERATE_PARENTHESES_SIBLING_2],
  },
  {
    pattern: 'INTERVAL_MERGING',
    rung: 3,
    canonical: INTERVAL_INTERSECTION_CANONICAL,
    siblings: [INTERVAL_INTERSECTION_SIBLING_1, INTERVAL_INTERSECTION_SIBLING_2],
  },
];

export const ALL_PATTERN_PACKS: readonly PatternPack[] = [
  ...RUNG_1_PACKS,
  ...RUNG_2_PACKS,
  ...RUNG_3_PACKS,
];

export const ALL_SEED_PROBLEMS: readonly SeedProblem[] = [
  // Rung 1
  WORD_SEARCH_CANONICAL,
  WORD_SEARCH_SIBLING_1,
  WORD_SEARCH_SIBLING_2,
  MERGE_INTERVALS_CANONICAL,
  MERGE_INTERVALS_SIBLING_1,
  MERGE_INTERVALS_SIBLING_2,
  // Rung 2
  PATH_COUNT_CANONICAL,
  PATH_COUNT_SIBLING_1,
  PATH_COUNT_SIBLING_2,
  INSERT_INTERVAL_CANONICAL,
  INSERT_INTERVAL_SIBLING_1,
  INSERT_INTERVAL_SIBLING_2,
  // Rung 3
  GENERATE_PARENTHESES_CANONICAL,
  GENERATE_PARENTHESES_SIBLING_1,
  GENERATE_PARENTHESES_SIBLING_2,
  INTERVAL_INTERSECTION_CANONICAL,
  INTERVAL_INTERSECTION_SIBLING_1,
  INTERVAL_INTERSECTION_SIBLING_2,
];
