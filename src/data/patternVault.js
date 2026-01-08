/**
 * Pattern Vault - Curated knowledge base of algorithmic patterns
 *
 * Each pattern includes:
 * - Core concept and when to use it
 * - The "primitives" (variables you'll need)
 * - Template/skeleton code
 * - Time/space complexity
 * - Example problems that use this pattern
 */

export const patternVault = [
  {
    id: 'two-pointers',
    name: 'Two Pointers',
    icon: 'pointers',
    color: 'blue',
    difficulty: 'Easy-Medium',
    description: 'Use two references that traverse a data structure, either from different positions or at different speeds.',

    whenToUse: [
      'Sorted array/list operations',
      'Finding pairs with a specific sum',
      'Detecting cycles in linked lists',
      'Reversing arrays or strings in-place',
      'Partitioning arrays (like in quicksort)',
      'Comparing elements from both ends'
    ],

    primitives: [
      { name: 'left', type: 'index/pointer', description: 'Points to start or slower element' },
      { name: 'right', type: 'index/pointer', description: 'Points to end or faster element' },
    ],

    variants: [
      {
        name: 'Opposite Direction',
        description: 'Pointers start at opposite ends and move toward each other',
        useCase: 'Two Sum (sorted), Container With Most Water, Valid Palindrome'
      },
      {
        name: 'Same Direction (Fast/Slow)',
        description: 'Both pointers start at the same position, one moves faster',
        useCase: 'Cycle Detection, Find Middle of List, Remove Nth Node From End'
      },
      {
        name: 'Sliding Window Variant',
        description: 'Both pointers move in same direction maintaining a window',
        useCase: 'Remove Duplicates, Move Zeroes'
      }
    ],

    templateCode: {
      language: 'python',
      code: `# Two Pointers - Opposite Direction (Sorted Array)
def two_sum_sorted(arr, target):
    left = 0
    right = len(arr) - 1

    while left < right:
        current_sum = arr[left] + arr[right]

        if current_sum == target:
            return [left, right]
        elif current_sum < target:
            left += 1      # Need larger sum
        else:
            right -= 1     # Need smaller sum

    return []  # No pair found

# Two Pointers - Fast/Slow (Cycle Detection)
def has_cycle(head):
    slow = head
    fast = head

    while fast and fast.next:
        slow = slow.next        # Move 1 step
        fast = fast.next.next   # Move 2 steps

        if slow == fast:
            return True  # Cycle detected

    return False  # No cycle`
    },

    complexity: {
      time: 'O(n) - Single pass through data',
      space: 'O(1) - Only two pointers needed'
    },

    keyInsight: 'By using two pointers strategically, we eliminate the need for nested loops (O(n²)) and often avoid extra data structures.',

    commonMistakes: [
      'Forgetting to handle edge cases (empty array, single element)',
      'Off-by-one errors in loop conditions',
      'Not checking for null in linked list problems'
    ],

    relatedProblems: [
      { title: 'Two Sum II', difficulty: 'Medium', pattern: 'Opposite Direction' },
      { title: 'Linked List Cycle', difficulty: 'Easy', pattern: 'Fast/Slow' },
      { title: 'Container With Most Water', difficulty: 'Medium', pattern: 'Opposite Direction' },
      { title: 'Remove Duplicates from Sorted Array', difficulty: 'Easy', pattern: 'Same Direction' }
    ]
  },

  {
    id: 'sliding-window',
    name: 'Sliding Window',
    icon: 'window',
    color: 'teal',
    difficulty: 'Medium',
    description: 'Maintain a "window" over a contiguous portion of the data, expanding or shrinking it based on conditions.',

    whenToUse: [
      'Finding subarrays/substrings with specific properties',
      'Maximum/minimum sum of size K',
      'Longest substring with K distinct characters',
      'String permutation or anagram problems',
      'Any "contiguous sequence" optimization'
    ],

    primitives: [
      { name: 'window_start', type: 'index', description: 'Left boundary of window' },
      { name: 'window_end', type: 'index', description: 'Right boundary of window' },
      { name: 'window_sum/count', type: 'accumulator', description: 'Tracks window state (sum, count, etc.)' },
      { name: 'result', type: 'variable', description: 'Best answer found so far' }
    ],

    variants: [
      {
        name: 'Fixed Window',
        description: 'Window size stays constant (size K)',
        useCase: 'Max sum of subarray of size K'
      },
      {
        name: 'Variable Window (Expand/Shrink)',
        description: 'Window grows and shrinks based on conditions',
        useCase: 'Longest substring with K distinct chars, Minimum window substring'
      }
    ],

    templateCode: {
      language: 'python',
      code: `# Fixed Size Window - Max Sum of Size K
def max_sum_subarray(arr, k):
    window_sum = sum(arr[:k])  # Initial window
    max_sum = window_sum

    for i in range(k, len(arr)):
        window_sum += arr[i]       # Add new element
        window_sum -= arr[i - k]   # Remove old element
        max_sum = max(max_sum, window_sum)

    return max_sum

# Variable Window - Longest Substring with K Distinct Chars
def longest_k_distinct(s, k):
    window_start = 0
    char_count = {}  # Character frequency in window
    max_length = 0

    for window_end in range(len(s)):
        # Expand window - add character
        char = s[window_end]
        char_count[char] = char_count.get(char, 0) + 1

        # Shrink window if too many distinct chars
        while len(char_count) > k:
            left_char = s[window_start]
            char_count[left_char] -= 1
            if char_count[left_char] == 0:
                del char_count[left_char]
            window_start += 1

        # Update result
        max_length = max(max_length, window_end - window_start + 1)

    return max_length`
    },

    complexity: {
      time: 'O(n) - Each element visited at most twice',
      space: 'O(1) for fixed window, O(k) for variable window with hash map'
    },

    keyInsight: 'Instead of recalculating the entire window each time (O(n×k)), we add the new element and remove the old one (O(1)).',

    commonMistakes: [
      'Forgetting to initialize the first window correctly',
      'Off-by-one errors when shrinking the window',
      'Not handling the case when window cannot be formed'
    ],

    relatedProblems: [
      { title: 'Maximum Sum Subarray of Size K', difficulty: 'Easy', pattern: 'Fixed Window' },
      { title: 'Longest Substring Without Repeating', difficulty: 'Medium', pattern: 'Variable Window' },
      { title: 'Minimum Window Substring', difficulty: 'Hard', pattern: 'Variable Window' },
      { title: 'Fruit Into Baskets', difficulty: 'Medium', pattern: 'Variable Window' }
    ]
  },

  {
    id: 'binary-search',
    name: 'Binary Search',
    icon: 'search',
    color: 'orange',
    difficulty: 'Easy-Medium',
    description: 'Divide the search space in half each iteration by exploiting a monotonic property.',

    whenToUse: [
      'Sorted array search',
      'Finding insertion position',
      'Search in rotated sorted array',
      'Finding peak element',
      'Binary search on answer (optimization problems)',
      'Any problem with monotonic property'
    ],

    primitives: [
      { name: 'left', type: 'index', description: 'Lower bound of search space' },
      { name: 'right', type: 'index', description: 'Upper bound of search space' },
      { name: 'mid', type: 'index', description: 'Middle point: (left + right) // 2' }
    ],

    variants: [
      {
        name: 'Classic Binary Search',
        description: 'Find exact element in sorted array',
        useCase: 'Search in sorted array'
      },
      {
        name: 'Lower/Upper Bound',
        description: 'Find first/last occurrence or insertion point',
        useCase: 'First Bad Version, Search Insert Position'
      },
      {
        name: 'Binary Search on Answer',
        description: 'Search the solution space, not the data',
        useCase: 'Koko Eating Bananas, Capacity to Ship Packages'
      }
    ],

    templateCode: {
      language: 'python',
      code: `# Classic Binary Search
def binary_search(arr, target):
    left, right = 0, len(arr) - 1

    while left <= right:
        mid = left + (right - left) // 2  # Avoid overflow

        if arr[mid] == target:
            return mid
        elif arr[mid] < target:
            left = mid + 1   # Search right half
        else:
            right = mid - 1  # Search left half

    return -1  # Not found

# Lower Bound (First occurrence >= target)
def lower_bound(arr, target):
    left, right = 0, len(arr)

    while left < right:
        mid = left + (right - left) // 2

        if arr[mid] < target:
            left = mid + 1
        else:
            right = mid  # Could be the answer

    return left  # First position >= target

# Binary Search on Answer
def min_eating_speed(piles, h):
    left, right = 1, max(piles)

    while left < right:
        mid = left + (right - left) // 2
        hours_needed = sum((pile + mid - 1) // mid for pile in piles)

        if hours_needed <= h:
            right = mid   # Can eat slower
        else:
            left = mid + 1  # Need to eat faster

    return left`
    },

    complexity: {
      time: 'O(log n) - Search space halves each iteration',
      space: 'O(1) - Only three pointers'
    },

    keyInsight: 'The key is identifying the monotonic property. If condition(x) is true, is it also true for all x\' > x (or < x)?',

    commonMistakes: [
      'Integer overflow with (left + right) / 2 - use left + (right - left) // 2',
      'Infinite loop from wrong boundary updates',
      'Off-by-one errors: left <= right vs left < right',
      'Not handling duplicates correctly'
    ],

    relatedProblems: [
      { title: 'Binary Search', difficulty: 'Easy', pattern: 'Classic' },
      { title: 'First Bad Version', difficulty: 'Easy', pattern: 'Lower Bound' },
      { title: 'Search in Rotated Sorted Array', difficulty: 'Medium', pattern: 'Modified' },
      { title: 'Koko Eating Bananas', difficulty: 'Medium', pattern: 'Binary Search on Answer' }
    ]
  },

  {
    id: 'dfs-bfs',
    name: 'DFS / BFS',
    icon: 'tree',
    color: 'purple',
    difficulty: 'Medium',
    description: 'Systematically explore all nodes/states in a graph or tree structure.',

    whenToUse: [
      'Tree/graph traversal',
      'Finding connected components',
      'Shortest path (unweighted) - BFS',
      'Detecting cycles',
      'Topological sorting - DFS',
      'Path finding and backtracking'
    ],

    primitives: [
      { name: 'visited', type: 'set/array', description: 'Track visited nodes to avoid cycles' },
      { name: 'stack/queue', type: 'data structure', description: 'Stack for DFS, Queue for BFS' },
      { name: 'result', type: 'variable', description: 'Accumulate answer during traversal' }
    ],

    variants: [
      {
        name: 'DFS (Depth-First)',
        description: 'Go deep before going wide. Uses stack (or recursion)',
        useCase: 'Path finding, cycle detection, topological sort'
      },
      {
        name: 'BFS (Breadth-First)',
        description: 'Explore level by level. Uses queue',
        useCase: 'Shortest path, level-order traversal'
      }
    ],

    templateCode: {
      language: 'python',
      code: `# DFS - Recursive (Tree/Graph)
def dfs_recursive(node, visited):
    if node is None or node in visited:
        return

    visited.add(node)
    # Process node here

    for neighbor in node.neighbors:
        dfs_recursive(neighbor, visited)

# DFS - Iterative with Stack
def dfs_iterative(start):
    stack = [start]
    visited = set()

    while stack:
        node = stack.pop()
        if node in visited:
            continue

        visited.add(node)
        # Process node here

        for neighbor in node.neighbors:
            if neighbor not in visited:
                stack.append(neighbor)

# BFS - Level Order with Queue
from collections import deque

def bfs(start, target):
    queue = deque([start])
    visited = {start}
    level = 0

    while queue:
        level_size = len(queue)

        for _ in range(level_size):
            node = queue.popleft()

            if node == target:
                return level  # Shortest path length

            for neighbor in node.neighbors:
                if neighbor not in visited:
                    visited.add(neighbor)
                    queue.append(neighbor)

        level += 1

    return -1  # Target not reachable`
    },

    complexity: {
      time: 'O(V + E) - Visit each vertex and edge once',
      space: 'O(V) - Visited set and stack/queue'
    },

    keyInsight: 'DFS is like exploring a maze by always taking the next unexplored path until you hit a dead end, then backtracking. BFS explores all paths of length 1, then length 2, etc.',

    commonMistakes: [
      'Forgetting to mark nodes as visited BEFORE adding to queue (BFS)',
      'Not handling disconnected components',
      'Stack overflow in recursive DFS on deep trees',
      'Confusing when to use DFS vs BFS'
    ],

    relatedProblems: [
      { title: 'Number of Islands', difficulty: 'Medium', pattern: 'DFS/BFS' },
      { title: 'Binary Tree Level Order', difficulty: 'Medium', pattern: 'BFS' },
      { title: 'Course Schedule', difficulty: 'Medium', pattern: 'DFS + Topological' },
      { title: 'Word Ladder', difficulty: 'Hard', pattern: 'BFS' }
    ]
  },

  {
    id: 'dynamic-programming',
    name: 'Dynamic Programming',
    icon: 'table',
    color: 'red',
    difficulty: 'Medium-Hard',
    description: 'Break down problems into overlapping subproblems and store results to avoid recomputation.',

    whenToUse: [
      'Optimization problems (min/max)',
      'Counting problems (number of ways)',
      'Decision problems (is it possible?)',
      'Problem has "overlapping subproblems"',
      'Problem has "optimal substructure"',
      'Recurrence relation can be defined'
    ],

    primitives: [
      { name: 'dp[]', type: 'array/table', description: 'Store solutions to subproblems' },
      { name: 'state', type: 'index/tuple', description: 'What defines a subproblem uniquely' },
      { name: 'transition', type: 'formula', description: 'How to compute dp[i] from smaller subproblems' }
    ],

    variants: [
      {
        name: 'Top-Down (Memoization)',
        description: 'Recursive with caching. Natural but may have recursion overhead',
        useCase: 'When recurrence is easier to think recursively'
      },
      {
        name: 'Bottom-Up (Tabulation)',
        description: 'Iterative, fill table from base cases up',
        useCase: 'When you need all subproblems anyway'
      }
    ],

    templateCode: {
      language: 'python',
      code: `# 1D DP - Fibonacci (Classic Example)
def fib(n):
    if n <= 1:
        return n

    dp = [0] * (n + 1)
    dp[1] = 1

    for i in range(2, n + 1):
        dp[i] = dp[i-1] + dp[i-2]  # Transition

    return dp[n]

# 1D DP - Climbing Stairs (Counting Ways)
def climb_stairs(n):
    if n <= 2:
        return n

    dp = [0] * (n + 1)
    dp[1] = 1
    dp[2] = 2

    for i in range(3, n + 1):
        dp[i] = dp[i-1] + dp[i-2]  # 1 step from i-1, or 2 steps from i-2

    return dp[n]

# 2D DP - Longest Common Subsequence
def lcs(text1, text2):
    m, n = len(text1), len(text2)
    dp = [[0] * (n + 1) for _ in range(m + 1)]

    for i in range(1, m + 1):
        for j in range(1, n + 1):
            if text1[i-1] == text2[j-1]:
                dp[i][j] = dp[i-1][j-1] + 1  # Match!
            else:
                dp[i][j] = max(dp[i-1][j], dp[i][j-1])  # Skip one

    return dp[m][n]

# DP with State Compression (Space Optimization)
def fib_optimized(n):
    if n <= 1:
        return n

    prev2, prev1 = 0, 1
    for _ in range(2, n + 1):
        curr = prev1 + prev2
        prev2, prev1 = prev1, curr

    return prev1`
    },

    complexity: {
      time: 'O(n) to O(n²) typically - depends on state space',
      space: 'O(n) to O(n²) - can often be optimized to O(1) or O(n)'
    },

    keyInsight: 'The magic of DP is that we trade space for time. Instead of recomputing the same subproblem many times, we store it once and look it up.',

    commonMistakes: [
      'Wrong base cases',
      'Incorrect state definition',
      'Missing edge cases in transition',
      'Not recognizing overlapping subproblems'
    ],

    relatedProblems: [
      { title: 'Climbing Stairs', difficulty: 'Easy', pattern: '1D DP' },
      { title: 'House Robber', difficulty: 'Medium', pattern: '1D DP' },
      { title: 'Longest Common Subsequence', difficulty: 'Medium', pattern: '2D DP' },
      { title: 'Edit Distance', difficulty: 'Hard', pattern: '2D DP' }
    ]
  },

  {
    id: 'backtracking',
    name: 'Backtracking',
    icon: 'undo',
    color: 'amber',
    difficulty: 'Medium-Hard',
    description: 'Explore all possible solutions by building candidates incrementally and abandoning paths that cannot lead to valid solutions.',

    whenToUse: [
      'Generate all combinations/permutations',
      'Constraint satisfaction problems',
      'Puzzle solving (Sudoku, N-Queens)',
      'Finding all paths in a graph',
      'Decision trees with pruning'
    ],

    primitives: [
      { name: 'path/current', type: 'list', description: 'Current partial solution being built' },
      { name: 'choices', type: 'list', description: 'Available options at current step' },
      { name: 'result', type: 'list', description: 'Collect all valid solutions' }
    ],

    variants: [
      {
        name: 'Subsets/Combinations',
        description: 'Include or exclude each element',
        useCase: 'Subsets, Combination Sum'
      },
      {
        name: 'Permutations',
        description: 'Arrange elements in different orders',
        useCase: 'Permutations, Letter Combinations'
      },
      {
        name: 'Grid/Board',
        description: 'Explore positions on a grid',
        useCase: 'N-Queens, Word Search, Sudoku'
      }
    ],

    templateCode: {
      language: 'python',
      code: `# Backtracking Template
def backtrack(result, path, choices):
    # Base case: found a valid solution
    if is_solution(path):
        result.append(path.copy())
        return

    for choice in choices:
        # Prune: skip invalid choices
        if not is_valid(choice, path):
            continue

        # Make choice
        path.append(choice)

        # Recurse with remaining choices
        backtrack(result, path, get_next_choices(choice, choices))

        # Undo choice (backtrack)
        path.pop()

# Subsets
def subsets(nums):
    result = []

    def backtrack(start, path):
        result.append(path.copy())  # Every path is valid

        for i in range(start, len(nums)):
            path.append(nums[i])
            backtrack(i + 1, path)  # Move forward only
            path.pop()

    backtrack(0, [])
    return result

# Permutations
def permutations(nums):
    result = []

    def backtrack(path, remaining):
        if not remaining:
            result.append(path.copy())
            return

        for i in range(len(remaining)):
            path.append(remaining[i])
            backtrack(path, remaining[:i] + remaining[i+1:])
            path.pop()

    backtrack([], nums)
    return result`
    },

    complexity: {
      time: 'O(k × n!) for permutations, O(k × 2^n) for subsets',
      space: 'O(n) for recursion stack + O(k × solutions) for result'
    },

    keyInsight: 'Backtracking is like DFS on a decision tree. The key is to recognize when to prune branches early to avoid exploring invalid paths.',

    commonMistakes: [
      'Forgetting to undo the choice (backtrack step)',
      'Not copying the path when adding to results',
      'Inefficient pruning leading to TLE',
      'Off-by-one errors in loop bounds'
    ],

    relatedProblems: [
      { title: 'Subsets', difficulty: 'Medium', pattern: 'Combinations' },
      { title: 'Permutations', difficulty: 'Medium', pattern: 'Permutations' },
      { title: 'N-Queens', difficulty: 'Hard', pattern: 'Grid' },
      { title: 'Word Search', difficulty: 'Medium', pattern: 'Grid' }
    ]
  }
];

export default patternVault;
