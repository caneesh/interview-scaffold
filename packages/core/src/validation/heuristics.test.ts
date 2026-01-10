import { describe, it, expect } from 'vitest';
import {
  runHeuristics,
  getHeuristicsForPattern,
  HEURISTICS,
} from './heuristics.js';

describe('Heuristics', () => {
  describe('HEURISTICS registry', () => {
    it('should have registered heuristics', () => {
      expect(HEURISTICS.length).toBeGreaterThan(0);
    });

    it('should have sliding window heuristics', () => {
      const swHeuristics = getHeuristicsForPattern('SLIDING_WINDOW');
      expect(swHeuristics.length).toBeGreaterThan(0);
    });

    it('should have DFS heuristics', () => {
      const dfsHeuristics = getHeuristicsForPattern('DFS');
      expect(dfsHeuristics.length).toBeGreaterThan(0);
    });
  });

  describe('Sliding Window Heuristics', () => {
    describe('sw_nested_loops', () => {
      it('should detect nested for loops in Python', () => {
        const code = `
def maxSum(arr, k):
    max_sum = 0
    for i in range(len(arr) - k + 1):
        current_sum = 0
        for j in range(i, i + k):
            current_sum += arr[j]
        max_sum = max(max_sum, current_sum)
    return max_sum
`;
        const results = runHeuristics('SLIDING_WINDOW', code, 'python');
        const nestedLoopResult = results.find(r => r.errorType === 'NESTED_LOOPS_DETECTED');
        expect(nestedLoopResult).toBeDefined();
        expect(nestedLoopResult?.passed).toBe(false);
      });

      it('should detect nested for loops in JavaScript', () => {
        const code = `
function maxSum(arr, k) {
    let maxSum = 0;
    for (let i = 0; i <= arr.length - k; i++) {
        let currentSum = 0;
        for (let j = i; j < i + k; j++) {
            currentSum += arr[j];
        }
        maxSum = Math.max(maxSum, currentSum);
    }
    return maxSum;
}
`;
        const results = runHeuristics('SLIDING_WINDOW', code, 'javascript');
        const nestedLoopResult = results.find(r => r.errorType === 'NESTED_LOOPS_DETECTED');
        expect(nestedLoopResult).toBeDefined();
        expect(nestedLoopResult?.passed).toBe(false);
      });

      it('should pass for proper sliding window implementation', () => {
        const code = `
def maxSum(arr, k):
    window_sum = sum(arr[:k])
    max_sum = window_sum
    for i in range(k, len(arr)):
        window_sum += arr[i] - arr[i - k]
        max_sum = max(max_sum, window_sum)
    return max_sum
`;
        const results = runHeuristics('SLIDING_WINDOW', code, 'python');
        const nestedLoopResult = results.find(r => r.errorType === 'NESTED_LOOPS_DETECTED');
        expect(nestedLoopResult).toBeUndefined();
      });
    });

    describe('sw_shrink_mechanism', () => {
      it('should detect if-based shrink instead of while-based', () => {
        // Code with right += to trigger window expansion detection
        // and if-based shrink with left update
        const code = `
function minSubArrayLen(target, nums) {
    let left = 0;
    let right = 0;
    let sum = 0;
    let minLen = Infinity;
    while (right < nums.length) {
        sum += nums[right];
        right += 1;
        if (left < right && sum >= target) {
            minLen = Math.min(minLen, right - left);
            sum -= nums[left];
            left += 1;
        }
    }
    return minLen === Infinity ? 0 : minLen;
}
`;
        const results = runHeuristics('SLIDING_WINDOW', code, 'javascript');
        const shrinkResult = results.find(r => r.errorType === 'WRONG_SHRINK_MECHANISM');
        expect(shrinkResult).toBeDefined();
        expect(shrinkResult?.passed).toBe(false);
      });

      it('should pass for while-based shrink', () => {
        const code = `
function minSubArrayLen(target, nums) {
    let left = 0;
    let right = 0;
    let sum = 0;
    let minLen = Infinity;
    while (right < nums.length) {
        sum += nums[right];
        right += 1;
        while (left < right && sum >= target) {
            minLen = Math.min(minLen, right - left);
            sum -= nums[left];
            left += 1;
        }
    }
    return minLen === Infinity ? 0 : minLen;
}
`;
        const results = runHeuristics('SLIDING_WINDOW', code, 'javascript');
        const shrinkResult = results.find(r => r.errorType === 'WRONG_SHRINK_MECHANISM');
        expect(shrinkResult).toBeUndefined();
      });
    });
  });

  describe('DFS Grid Heuristics', () => {
    describe('dfs_missing_visited', () => {
      it('should detect missing visited tracking', () => {
        const code = `
def dfs(grid, r, c):
    if r < 0 or c < 0 or r >= len(grid) or c >= len(grid[0]):
        return
    if grid[r][c] == '0':
        return
    dfs(grid, r+1, c)
    dfs(grid, r-1, c)
    dfs(grid, r, c+1)
    dfs(grid, r, c-1)
`;
        const results = runHeuristics('DFS', code, 'python');
        const visitedResult = results.find(r => r.errorType === 'MISSING_VISITED_CHECK');
        expect(visitedResult).toBeDefined();
        expect(visitedResult?.passed).toBe(false);
      });

      it('should pass when visited set is used', () => {
        const code = `
def dfs(grid, r, c, visited):
    if r < 0 or c < 0 or r >= len(grid) or c >= len(grid[0]):
        return
    if (r, c) in visited:
        return
    visited.add((r, c))
    dfs(grid, r+1, c, visited)
    dfs(grid, r-1, c, visited)
`;
        const results = runHeuristics('DFS', code, 'python');
        const visitedResult = results.find(r => r.errorType === 'MISSING_VISITED_CHECK');
        expect(visitedResult).toBeUndefined();
      });

      it('should pass when grid is marked in-place', () => {
        const code = `
def dfs(grid, r, c):
    if r < 0 or c < 0 or r >= len(grid) or c >= len(grid[0]):
        return
    if grid[r][c] == '0':
        return
    grid[r][c] = '0'  # Mark visited
    dfs(grid, r+1, c)
    dfs(grid, r-1, c)
`;
        const results = runHeuristics('DFS', code, 'python');
        const visitedResult = results.find(r => r.errorType === 'MISSING_VISITED_CHECK');
        expect(visitedResult).toBeUndefined();
      });

      it('should NOT require visited for tree traversal (trees have no cycles)', () => {
        // Tree traversal with dfs function - should NOT trigger visited check
        const code = `
function hasPathSum(arr, targetSum) {
  function TreeNode(val) { this.val = val; this.left = null; this.right = null; }
  const root = new TreeNode(arr[0]);
  function dfs(node, remaining) {
    if (!node) return false;
    remaining -= node.val;
    if (!node.left && !node.right) return remaining === 0;
    return dfs(node.left, remaining) || dfs(node.right, remaining);
  }
  return dfs(root, targetSum);
}
`;
        const results = runHeuristics('DFS', code, 'javascript');
        const visitedResult = results.find(r => r.errorType === 'MISSING_VISITED_CHECK');
        // Tree traversal should NOT trigger MISSING_VISITED_CHECK
        expect(visitedResult).toBeUndefined();
      });
    });

    describe('dfs_missing_backtrack', () => {
      it('should detect missing backtrack when using path modification', () => {
        // Simplified code that clearly has push but no backtrack
        const code = `
function findAllPaths(graph, start, end) {
    const path = [];
    const allPaths = [];

    function dfs(node) {
        path.push(node);

        if (node === end) {
            allPaths.push([...path]);
            return;
        }

        for (const neighbor of graph[node]) {
            dfs(neighbor);
        }
        // BUG: Missing undo operation here!
    }

    dfs(start);
    return allPaths;
}
`;
        const results = runHeuristics('DFS', code, 'javascript');
        const backtrackResult = results.find(r => r.errorType === 'MISSING_BACKTRACK');
        expect(backtrackResult).toBeDefined();
        expect(backtrackResult?.passed).toBe(false);
      });

      it('should pass when backtrack is present', () => {
        const code = `
function findAllPaths(graph, start, end) {
    const path = [];
    const allPaths = [];

    function dfs(node) {
        path.push(node);

        if (node === end) {
            allPaths.push([...path]);
        } else {
            for (const neighbor of graph[node]) {
                dfs(neighbor);
            }
        }
        path.pop();  // Backtrack correctly
    }

    dfs(start);
    return allPaths;
}
`;
        const results = runHeuristics('DFS', code, 'javascript');
        const backtrackResult = results.find(r => r.errorType === 'MISSING_BACKTRACK');
        expect(backtrackResult).toBeUndefined();
      });

      it('should pass for flood fill (no backtrack needed)', () => {
        const code = `
def numIslands(grid):
    def dfs(r, c):
        grid[r][c] = '0'  # mark visited
        dfs(r+1, c)
        dfs(r-1, c)

    count = 0
    for i in range(len(grid)):
        for j in range(len(grid[0])):
            if grid[i][j] == '1':
                dfs(i, j)
                count += 1
    return count
`;
        const results = runHeuristics('DFS', code, 'python');
        const backtrackResult = results.find(r => r.errorType === 'MISSING_BACKTRACK');
        expect(backtrackResult).toBeUndefined();
      });
    });

    describe('dfs_missing_base_case', () => {
      it('should detect missing boundary checks in grid DFS', () => {
        const code = `
def dfs(grid, r, c):
    if grid[r][c] == '0':
        return
    grid[r][c] = '0'
    dfs(grid, r+1, c)
    dfs(grid, r-1, c)
    dfs(grid, r, c+1)
    dfs(grid, r, c-1)
`;
        const results = runHeuristics('DFS', code, 'python');
        const baseCaseResult = results.find(r => r.errorType === 'MISSING_BASE_CASE');
        expect(baseCaseResult).toBeDefined();
        expect(baseCaseResult?.passed).toBe(false);
      });

      it('should pass when boundary checks are present', () => {
        const code = `
def dfs(grid, r, c):
    if r < 0 or c < 0 or r >= len(grid) or c >= len(grid[0]):
        return
    if grid[r][c] == '0':
        return
    grid[r][c] = '0'
    dfs(grid, r+1, c)
    dfs(grid, r-1, c)
    dfs(grid, r, c+1)
    dfs(grid, r, c-1)
`;
        const results = runHeuristics('DFS', code, 'python');
        const baseCaseResult = results.find(r => r.errorType === 'MISSING_BASE_CASE');
        expect(baseCaseResult).toBeUndefined();
      });

      it('should pass for non-grid DFS', () => {
        const code = `
def dfs(node, visited):
    if node in visited:
        return
    visited.add(node)
    for neighbor in node.neighbors:
        dfs(neighbor, visited)
`;
        const results = runHeuristics('DFS', code, 'python');
        const baseCaseResult = results.find(r => r.errorType === 'MISSING_BASE_CASE');
        expect(baseCaseResult).toBeUndefined();
      });
    });

    describe('dfs_using_bfs', () => {
      it('should detect queue usage (BFS pattern)', () => {
        const code = `
from collections import deque

def solve(grid):
    queue = deque([(0, 0)])
    while queue:
        r, c = queue.popleft()
        queue.append((r+1, c))
`;
        const results = runHeuristics('DFS', code, 'python');
        const bfsResult = results.find(r => r.errorType === 'USING_BFS_FOR_DFS');
        expect(bfsResult).toBeDefined();
        expect(bfsResult?.passed).toBe(false);
      });

      it('should detect JS shift (queue pattern)', () => {
        const code = `
function solve(grid) {
    const queue = [[0, 0]];
    while (queue.length) {
        const [r, c] = queue.shift();
        queue.push([r+1, c]);
    }
}
`;
        const results = runHeuristics('DFS', code, 'javascript');
        const bfsResult = results.find(r => r.errorType === 'USING_BFS_FOR_DFS');
        expect(bfsResult).toBeDefined();
        expect(bfsResult?.passed).toBe(false);
      });

      it('should detect explicit BFS naming', () => {
        const code = `
def bfs(grid, start):
    stack = [start]
    while stack:
        node = stack.pop()
`;
        const results = runHeuristics('DFS', code, 'python');
        const bfsResult = results.find(r => r.errorType === 'USING_BFS_FOR_DFS');
        expect(bfsResult).toBeDefined();
      });

      it('should pass for proper DFS with recursion', () => {
        const code = `
def dfs(grid, r, c, visited):
    if r < 0 or c < 0:
        return
    visited.add((r, c))
    dfs(grid, r+1, c, visited)
    dfs(grid, r-1, c, visited)
`;
        const results = runHeuristics('DFS', code, 'python');
        const bfsResult = results.find(r => r.errorType === 'USING_BFS_FOR_DFS');
        expect(bfsResult).toBeUndefined();
      });

      it('should pass for DFS with explicit stack', () => {
        const code = `
def dfs(grid):
    stack = [(0, 0)]
    while stack:
        r, c = stack.pop()
        stack.append((r+1, c))
`;
        const results = runHeuristics('DFS', code, 'python');
        const bfsResult = results.find(r => r.errorType === 'USING_BFS_FOR_DFS');
        expect(bfsResult).toBeUndefined();
      });
    });

    describe('dfs_incomplete_traversal', () => {
      it('should detect incomplete grid traversal (only 2 directions)', () => {
        const code = `
def dfs(grid, r, c):
    if r < 0 or c < 0:
        return
    grid[r][c] = '0'
    dfs(grid, r+1, c)  # down only
    dfs(grid, r, c+1)  # right only
`;
        const results = runHeuristics('DFS', code, 'python');
        const traversalResult = results.find(r => r.errorType === 'INCOMPLETE_TRAVERSAL');
        expect(traversalResult).toBeDefined();
        expect(traversalResult?.passed).toBe(false);
        expect(traversalResult?.evidence).toContain('Only 2 of 4 directions found');
      });

      it('should pass for complete 4-direction traversal', () => {
        const code = `
def dfs(grid, r, c):
    if r < 0 or c < 0:
        return
    grid[r][c] = '0'
    dfs(grid, r+1, c)
    dfs(grid, r-1, c)
    dfs(grid, r, c+1)
    dfs(grid, r, c-1)
`;
        const results = runHeuristics('DFS', code, 'python');
        const traversalResult = results.find(r => r.errorType === 'INCOMPLETE_TRAVERSAL');
        expect(traversalResult).toBeUndefined();
      });

      it('should pass when using directions array', () => {
        const code = `
def dfs(grid, r, c):
    directions = [[0, 1], [0, -1], [1, 0], [-1, 0]]
    grid[r][c] = '0'
    for dr, dc in directions:
        dfs(grid, r + dr, c + dc)
`;
        const results = runHeuristics('DFS', code, 'python');
        const traversalResult = results.find(r => r.errorType === 'INCOMPLETE_TRAVERSAL');
        expect(traversalResult).toBeUndefined();
      });
    });

    describe('dfs_visit_order', () => {
      it('should detect visited marking after recursive call', () => {
        const code = `
def dfs(grid, r, c, visited):
    if r < 0 or c < 0:
        return
    if (r, c) in visited:
        return
    dfs(grid, r+1, c, visited)
    dfs(grid, r-1, c, visited)
    visited.add((r, c))  # BUG: marked after recursion
`;
        const results = runHeuristics('DFS', code, 'python');
        const orderResult = results.find(r => r.errorType === 'VISIT_ORDER_ERROR');
        expect(orderResult).toBeDefined();
        expect(orderResult?.passed).toBe(false);
      });

      it('should pass when visited is marked before recursion', () => {
        const code = `
def dfs(grid, r, c, visited):
    if r < 0 or c < 0:
        return
    if (r, c) in visited:
        return
    visited.add((r, c))  # Correct: marked before recursion
    dfs(grid, r+1, c, visited)
    dfs(grid, r-1, c, visited)
`;
        const results = runHeuristics('DFS', code, 'python');
        const orderResult = results.find(r => r.errorType === 'VISIT_ORDER_ERROR');
        expect(orderResult).toBeUndefined();
      });

      it('should pass when grid is marked in-place before recursion', () => {
        const code = `
def dfs(grid, r, c):
    if r < 0 or c < 0:
        return
    if grid[r][c] == '0':
        return
    grid[r][c] = '0'  # Mark visited
    dfs(grid, r+1, c)
    dfs(grid, r-1, c)
`;
        const results = runHeuristics('DFS', code, 'python');
        const orderResult = results.find(r => r.errorType === 'VISIT_ORDER_ERROR');
        expect(orderResult).toBeUndefined();
      });
    });
  });

  describe('Binary Search Heuristics', () => {
    describe('bs_infinite_loop', () => {
      it('should detect missing mid calculation', () => {
        const code = `
function binarySearch(arr, target) {
    let left = 0;
    let right = arr.length - 1;
    while (left <= right) {
        // Missing mid!
        if (arr[left] === target) return left;
        left++;
    }
    return -1;
}
`;
        const results = runHeuristics('BINARY_SEARCH', code, 'javascript');
        const bugResult = results.find(r => r.errorType === 'IMPLEMENTATION_BUG');
        expect(bugResult).toBeDefined();
      });

      it('should detect dangerous left = mid without +1', () => {
        const code = `
function binarySearch(arr, target) {
    let left = 0;
    let right = arr.length - 1;
    while (left <= right) {
        const mid = Math.floor((left + right) / 2);
        if (arr[mid] < target) {
            left = mid;  // Dangerous: should be mid + 1
        } else if (arr[mid] > target) {
            right = mid - 1;
        } else {
            return mid;
        }
    }
    return -1;
}
`;
        const results = runHeuristics('BINARY_SEARCH', code, 'javascript');
        const bugResult = results.find(r => r.errorType === 'IMPLEMENTATION_BUG');
        expect(bugResult).toBeDefined();
        expect(bugResult?.suggestion).toContain('mid + 1');
      });

      it('should pass for correct binary search', () => {
        const code = `
function binarySearch(arr, target) {
    let left = 0;
    let right = arr.length - 1;
    while (left <= right) {
        const mid = Math.floor(left + (right - left) / 2);
        if (arr[mid] < target) {
            left = mid + 1;
        } else if (arr[mid] > target) {
            right = mid - 1;
        } else {
            return mid;
        }
    }
    return -1;
}
`;
        const results = runHeuristics('BINARY_SEARCH', code, 'javascript');
        const bugResult = results.find(r => r.errorType === 'IMPLEMENTATION_BUG');
        expect(bugResult).toBeUndefined();
      });
    });
  });

  describe('Two Pointers Heuristics', () => {
    describe('tp_pointer_movement', () => {
      it('should detect missing while loop', () => {
        const code = `
function twoSum(arr, target) {
    let left = 0;
    let right = arr.length - 1;
    // Missing while loop!
    if (arr[left] + arr[right] === target) {
        return [left, right];
    }
    return [-1, -1];
}
`;
        const results = runHeuristics('TWO_POINTERS', code, 'javascript');
        const bugResult = results.find(r => r.errorType === 'IMPLEMENTATION_BUG');
        expect(bugResult).toBeDefined();
        expect(bugResult?.suggestion).toContain('while');
      });

      it('should pass for correct two pointers', () => {
        const code = `
function twoSum(arr, target) {
    let left = 0;
    let right = arr.length - 1;
    while (left < right) {
        const sum = arr[left] + arr[right];
        if (sum === target) {
            return [left, right];
        } else if (sum < target) {
            left += 1;
        } else {
            right -= 1;
        }
    }
    return [-1, -1];
}
`;
        const results = runHeuristics('TWO_POINTERS', code, 'javascript');
        const allPassed = results.every(r => r.passed);
        expect(allPassed).toBe(true);
      });
    });
  });

  describe('runHeuristics', () => {
    it('should return empty array for pattern with no heuristics', () => {
      const results = runHeuristics('GREEDY', 'function greedy() {}', 'javascript');
      expect(results).toEqual([]);
    });

    it('should run all heuristics for a pattern', () => {
      const swHeuristics = getHeuristicsForPattern('SLIDING_WINDOW');
      const results = runHeuristics('SLIDING_WINDOW', 'function test() {}', 'javascript');
      expect(results.length).toBe(swHeuristics.length);
    });
  });
});
