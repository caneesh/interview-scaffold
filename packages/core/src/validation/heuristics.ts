/**
 * Pattern-Specific Heuristics
 * Pure TypeScript - deterministic code analysis
 */

import type { HeuristicCheck, HeuristicResult, ErrorType } from './types.js';
import type { PatternId } from '../entities/pattern.js';

// ============ Heuristic Registry ============

const HEURISTICS: HeuristicCheck[] = [];

export function registerHeuristic(heuristic: HeuristicCheck): void {
  HEURISTICS.push(heuristic);
}

export function getHeuristicsForPattern(pattern: PatternId): readonly HeuristicCheck[] {
  return HEURISTICS.filter((h) => h.pattern === pattern);
}

export function runHeuristics(
  pattern: PatternId,
  code: string,
  language: string
): readonly HeuristicResult[] {
  const heuristics = getHeuristicsForPattern(pattern);
  return heuristics.map((h) => h.check(code, language));
}

// ============ Sliding Window Heuristics ============

/**
 * Detects nested loops that suggest O(n*k) brute force instead of O(n) sliding window
 */
registerHeuristic({
  id: 'sw_nested_loops',
  name: 'Nested Loops Detection',
  pattern: 'SLIDING_WINDOW',
  check: (code: string, language: string): HeuristicResult => {
    // Track brace depth to properly detect loop boundaries
    const lines = code.split('\n');
    let braceDepth = 0;
    let loopBraceDepths: number[] = []; // Stack of brace depths when loops started
    let hasNestedLoop = false;

    for (const line of lines) {
      const trimmed = line.trim();

      // For Python, use indentation-based detection
      if (language === 'python') {
        const indent = line.length - line.trimStart().length;
        const isForLoop = /^for\s/.test(trimmed);
        const isWhileLoop = /^while\s/.test(trimmed);

        if (isForLoop || isWhileLoop) {
          // Check if we're inside another loop (by comparing indentation)
          if (loopBraceDepths.length > 0 && indent > loopBraceDepths[loopBraceDepths.length - 1]!) {
            hasNestedLoop = true;
            break;
          }
          loopBraceDepths.push(indent);
        }

        // Pop loops when we dedent back
        while (loopBraceDepths.length > 0 && indent <= loopBraceDepths[loopBraceDepths.length - 1]! && trimmed.length > 0 && !isForLoop && !isWhileLoop) {
          loopBraceDepths.pop();
        }
      } else {
        // For JS/TS, use brace counting
        const isForLoop = /\bfor\s*\(/.test(trimmed);
        const isWhileLoop = /\bwhile\s*\(/.test(trimmed);

        // Count braces on this line
        const openBraces = (trimmed.match(/\{/g) || []).length;
        const closeBraces = (trimmed.match(/\}/g) || []).length;

        // Check for loop start before updating brace depth
        if (isForLoop || isWhileLoop) {
          // If we're already inside a loop (loopBraceDepths not empty), this is nested
          if (loopBraceDepths.length > 0) {
            hasNestedLoop = true;
            break;
          }
          // Mark current brace depth as where this loop started
          loopBraceDepths.push(braceDepth);
        }

        braceDepth += openBraces - closeBraces;

        // Pop loops when we close their braces
        while (loopBraceDepths.length > 0 && braceDepth <= loopBraceDepths[loopBraceDepths.length - 1]!) {
          loopBraceDepths.pop();
        }
      }
    }

    if (hasNestedLoop) {
      return {
        passed: false,
        errorType: 'NESTED_LOOPS_DETECTED',
        evidence: ['Nested loop structure detected'],
        suggestion:
          'Sliding window should use O(n) time with a single pass. ' +
          'Remove the inner loop and maintain window state incrementally.',
      };
    }

    return { passed: true };
  },
});

/**
 * Detects if-based shrink instead of while-based shrink for sliding window
 */
registerHeuristic({
  id: 'sw_shrink_mechanism',
  name: 'Shrink Mechanism Check',
  pattern: 'SLIDING_WINDOW',
  check: (code: string, _language: string): HeuristicResult => {
    // Look for window expansion (common indicators)
    const hasWindowExpansion =
      /right\s*[+]=|end\s*[+]=|j\s*[+]=|\bappend\b|\bpush\b/.test(code);

    if (!hasWindowExpansion) {
      // No clear sliding window pattern detected
      return { passed: true };
    }

    // Look for left pointer update pattern (left += or left++)
    const hasLeftUpdate = /(?:left|start)\s*(?:\+\+|\+=\s*1|\+\s*=\s*1)/.test(code);
    if (!hasLeftUpdate) {
      // No shrinking detected
      return { passed: true };
    }

    // Check for while-based shrink (correct) - while with left comparison
    const hasWhileShrink = /while\s*[\(\s].*(?:left|start)/i.test(code);

    // Check for if-based shrink (incorrect) - if with left comparison followed by left update
    // Look for pattern: if (... left|start ...) { ... left +=
    const lines = code.split('\n');
    let hasIfShrink = false;
    let inIfBlock = false;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i] ?? '';
      const trimmed = line.trim();

      // Check for if statement with left/start in condition
      if (/^if\s*[\(\s].*(?:left|start)/i.test(trimmed)) {
        inIfBlock = true;
      }

      // If we're in an if block and see left update, it's wrong
      if (inIfBlock && /(?:left|start)\s*(?:\+\+|\+=)/.test(trimmed)) {
        hasIfShrink = true;
        break;
      }

      // Exit if block on while or closing brace at same level
      if (inIfBlock && (/^while\s/.test(trimmed) || /^\}/.test(trimmed))) {
        inIfBlock = false;
      }
    }

    if (hasIfShrink && !hasWhileShrink) {
      return {
        passed: false,
        errorType: 'WRONG_SHRINK_MECHANISM',
        evidence: ['Using if-statement for window shrinking instead of while-loop'],
        suggestion:
          'Use a while-loop to shrink the window, not an if-statement. ' +
          'The window may need to shrink multiple times before the constraint is satisfied.',
      };
    }

    return { passed: true };
  },
});

// ============ DFS Grid Heuristics ============

/**
 * Detects missing visited check in DFS
 */
registerHeuristic({
  id: 'dfs_missing_visited',
  name: 'Missing Visited Check',
  pattern: 'DFS',
  check: (code: string, language: string): HeuristicResult => {
    // Look for DFS indicators
    const hasDFS =
      /def\s+dfs|function\s+dfs|const\s+dfs|dfs\s*\(|dfs\s*=/.test(code);

    if (!hasDFS) {
      return { passed: true };
    }

    // Check for visited tracking
    const visitedPatterns = [
      /visited/i,
      /seen/i,
      /\bused\b/i,
      /\bmark/i,
      /\[\s*\w+\s*\]\s*\[\s*\w+\s*\]\s*=\s*(?:true|1|'#'|"#")/,  // grid[i][j] = true/1/'#'
      /add\s*\(\s*\(?.*(?:row|i|r).*(?:col|j|c)/i,  // set.add((row, col))
    ];

    const hasVisitedTracking = visitedPatterns.some((p) => p.test(code));

    if (!hasVisitedTracking) {
      return {
        passed: false,
        errorType: 'MISSING_VISITED_CHECK',
        evidence: ['No visited tracking mechanism found'],
        suggestion:
          'DFS on a grid requires tracking visited cells to avoid infinite loops. ' +
          'Use a visited set or mark cells in-place.',
      };
    }

    return { passed: true };
  },
});

/**
 * Detects missing backtrack in DFS
 */
registerHeuristic({
  id: 'dfs_missing_backtrack',
  name: 'Missing Backtrack',
  pattern: 'DFS',
  check: (code: string, _language: string): HeuristicResult => {
    // Look for DFS function
    const hasDFS = /\bdfs\b/i.test(code);
    if (!hasDFS) {
      return { passed: true };
    }

    // Look for path/collection modification
    const hasPush = /\.push\s*\(/.test(code);
    const hasAppend = /\.append\s*\(/.test(code);
    const hasAdd = /\.add\s*\(/.test(code);
    const hasModification = hasPush || hasAppend || hasAdd;

    if (!hasModification) {
      return { passed: true };
    }

    // Check for corresponding backtrack operation
    const hasPop = /\.pop\s*\(/.test(code);
    const hasRemove = /\.remove\s*\(/.test(code);
    const hasDelete = /\.delete\s*\(/.test(code);
    const hasDiscard = /\.discard\s*\(/.test(code);
    const hasBacktrackKeyword = /backtrack/i.test(code);
    const hasBacktrack = hasPop || hasRemove || hasDelete || hasDiscard || hasBacktrackKeyword;

    // Also check if this is a counting/flood-fill problem where backtrack isn't needed
    const isFloodFill =
      /(?:flood|fill|island|area|connected)/i.test(code) ||
      /(?:count|num|number)(?:Of|Islands|Connected)/i.test(code);

    if (!hasBacktrack && !isFloodFill) {
      return {
        passed: false,
        errorType: 'MISSING_BACKTRACK',
        evidence: ['Modification found but no corresponding backtrack'],
        suggestion:
          'When using DFS for path-finding or permutations, ' +
          'remember to undo modifications after the recursive call returns.',
      };
    }

    return { passed: true };
  },
});

/**
 * Detects missing base case / boundary checks in grid DFS
 */
registerHeuristic({
  id: 'dfs_missing_base_case',
  name: 'Missing Base Case',
  pattern: 'DFS',
  check: (code: string, language: string): HeuristicResult => {
    // Look for DFS function
    const hasDFS = /\bdfs\b/i.test(code);
    if (!hasDFS) {
      return { passed: true };
    }

    // Check for grid-related code (rows, cols, grid access)
    const isGridDFS =
      /grid\s*\[/.test(code) ||
      /\brows?\b.*\bcols?\b/i.test(code) ||
      /len\s*\(\s*grid\s*\)/.test(code) ||
      /grid\.length/.test(code);

    if (!isGridDFS) {
      // Not a grid DFS, skip this check
      return { passed: true };
    }

    // Check for boundary conditions
    const boundaryPatterns = [
      // Python: r < 0, r >= len(grid), etc.
      /(?:r|row|i)\s*<\s*0/,
      /(?:r|row|i)\s*>=?\s*(?:len|rows|m|n)/,
      /(?:c|col|j)\s*<\s*0/,
      /(?:c|col|j)\s*>=?\s*(?:len|cols|m|n)/,
      // JS: row < 0, row >= grid.length, etc.
      /(?:row|r|i)\s*<\s*0/,
      /(?:row|r|i)\s*>=?\s*\w+\.length/,
      /(?:col|c|j)\s*<\s*0/,
      /(?:col|c|j)\s*>=?\s*\w+\[\d*\]?\.length/,
      // Combined checks
      /out\s*of\s*bounds/i,
      /\bnot\s+in\s+range\b/i,
    ];

    const hasBoundaryCheck = boundaryPatterns.some((p) => p.test(code));

    if (!hasBoundaryCheck) {
      return {
        passed: false,
        errorType: 'MISSING_BASE_CASE',
        evidence: ['No boundary check found for grid DFS'],
        suggestion:
          'Grid DFS requires boundary checks: if row < 0 or row >= rows or col < 0 or col >= cols.',
      };
    }

    return { passed: true };
  },
});

/**
 * Detects using BFS (queue) when DFS (stack/recursion) is expected
 */
registerHeuristic({
  id: 'dfs_using_bfs',
  name: 'Using BFS Instead of DFS',
  pattern: 'DFS',
  check: (code: string, _language: string): HeuristicResult => {
    // Check for queue usage patterns
    const queuePatterns = [
      /\bqueue\b/i,
      /\bdeque\b/i,
      /collections\.deque/i,
      /\.popleft\s*\(/,
      /\.shift\s*\(/,  // JS array as queue
      /Queue\s*\(/,
      /\bfifo\b/i,
    ];

    const hasQueue = queuePatterns.some((p) => p.test(code));

    // Also check for explicit BFS naming
    const hasBFSName = /\bbfs\b/i.test(code);

    if (hasQueue || hasBFSName) {
      return {
        passed: false,
        errorType: 'USING_BFS_FOR_DFS',
        evidence: hasQueue
          ? ['Queue-based traversal detected (BFS pattern)']
          : ['BFS function name detected'],
        suggestion:
          'This problem expects DFS (depth-first search). Use recursion or an explicit stack instead of a queue.',
      };
    }

    return { passed: true };
  },
});

/**
 * Detects incomplete grid traversal (not exploring all 4 directions)
 */
registerHeuristic({
  id: 'dfs_incomplete_traversal',
  name: 'Incomplete Grid Traversal',
  pattern: 'DFS',
  check: (code: string, language: string): HeuristicResult => {
    // Look for DFS on grid
    const hasDFS = /\bdfs\b/i.test(code);
    const isGridDFS =
      /grid\s*\[/.test(code) ||
      /\[\s*(?:r|row|i)\s*\]\s*\[\s*(?:c|col|j)\s*\]/.test(code);

    if (!hasDFS || !isGridDFS) {
      return { passed: true };
    }

    // Check for direction patterns - need all 4 for complete traversal
    // Look for: r+1, r-1, c+1, c-1 or equivalent
    const hasDown = /(?:r|row|i)\s*\+\s*1|(?:r|row|i)\s*\+\+/.test(code);
    const hasUp = /(?:r|row|i)\s*-\s*1|(?:r|row|i)\s*--/.test(code);
    const hasRight = /(?:c|col|j)\s*\+\s*1|(?:c|col|j)\s*\+\+/.test(code);
    const hasLeft = /(?:c|col|j)\s*-\s*1|(?:c|col|j)\s*--/.test(code);

    // Also check for directions array pattern
    const hasDirectionsArray =
      /directions?\s*=\s*\[/.test(code) ||
      /\[\s*\[\s*[01-]+\s*,\s*[01-]+\s*\]/.test(code) ||
      /\[\s*\(\s*[01-]+\s*,\s*[01-]+\s*\)/.test(code);

    const directionsFound = [hasDown, hasUp, hasRight, hasLeft].filter(Boolean).length;

    // If using directions array, assume complete
    if (hasDirectionsArray) {
      return { passed: true };
    }

    // Need at least 4 directions for grid traversal (or 2 for 1D)
    if (directionsFound > 0 && directionsFound < 4) {
      const missing: string[] = [];
      if (!hasDown) missing.push('down (row+1)');
      if (!hasUp) missing.push('up (row-1)');
      if (!hasRight) missing.push('right (col+1)');
      if (!hasLeft) missing.push('left (col-1)');

      return {
        passed: false,
        errorType: 'INCOMPLETE_TRAVERSAL',
        evidence: [`Only ${directionsFound} of 4 directions found`, `Missing: ${missing.join(', ')}`],
        suggestion:
          'Grid DFS should explore all 4 adjacent cells: up, down, left, right. ' +
          'Consider using a directions array: [[0,1], [0,-1], [1,0], [-1,0]].',
      };
    }

    return { passed: true };
  },
});

/**
 * Detects incorrect visit order (marking visited after recursive call instead of before)
 */
registerHeuristic({
  id: 'dfs_visit_order',
  name: 'Visit Order Check',
  pattern: 'DFS',
  check: (code: string, language: string): HeuristicResult => {
    // Look for DFS function
    const hasDFS = /\bdfs\b/i.test(code);
    if (!hasDFS) {
      return { passed: true };
    }

    // Check for visited tracking
    const hasVisited = /visited|seen|\bmark/i.test(code);
    if (!hasVisited) {
      return { passed: true }; // Let dfs_missing_visited handle this
    }

    // Find DFS function body and check order
    const lines = code.split('\n');
    let inDFSFunction = false;
    let recursiveCallLine = -1;
    let visitedMarkLine = -1;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i] ?? '';
      const trimmed = line.trim();

      // Detect DFS function start
      if (/\bdfs\s*\(|def\s+dfs|function\s+dfs/.test(trimmed)) {
        inDFSFunction = true;
        recursiveCallLine = -1;
        visitedMarkLine = -1;
      }

      if (inDFSFunction) {
        // Look for recursive DFS call
        if (/\bdfs\s*\(/.test(trimmed) && !/def\s+dfs|function\s+dfs/.test(trimmed)) {
          if (recursiveCallLine === -1) {
            recursiveCallLine = i;
          }
        }

        // Look for visited marking
        if (/visited\s*\.\s*add|\.add\s*\(|visited\s*\[|grid\s*\[.*\]\s*\[.*\]\s*=/.test(trimmed)) {
          if (visitedMarkLine === -1) {
            visitedMarkLine = i;
          }
        }
      }
    }

    // If visited is marked AFTER recursive call, that's a problem
    if (recursiveCallLine !== -1 && visitedMarkLine !== -1 && visitedMarkLine > recursiveCallLine) {
      return {
        passed: false,
        errorType: 'VISIT_ORDER_ERROR',
        evidence: ['Visited marking appears after recursive call'],
        suggestion:
          'Mark cells as visited BEFORE making recursive calls to prevent revisiting. ' +
          'Move visited.add() or grid marking before the DFS recursive calls.',
      };
    }

    return { passed: true };
  },
});

// ============ Additional Pattern Heuristics ============

/**
 * Binary Search: Check for infinite loop risk
 */
registerHeuristic({
  id: 'bs_infinite_loop',
  name: 'Binary Search Infinite Loop Check',
  pattern: 'BINARY_SEARCH',
  check: (code: string, _language: string): HeuristicResult => {
    // Look for binary search
    const hasBinarySearch =
      /while\s*\([^)]*(?:left|lo|start)\s*[<>=]+\s*(?:right|hi|end)/.test(code) ||
      /while\s*\([^)]*(?:right|hi|end)\s*[<>=]+\s*(?:left|lo|start)/.test(code);

    if (!hasBinarySearch) {
      return { passed: true };
    }

    // Check for mid calculation
    const hasMid = /mid\s*=|mid\s*:=/.test(code);
    if (!hasMid) {
      return {
        passed: false,
        errorType: 'IMPLEMENTATION_BUG',
        evidence: ['Binary search without mid calculation'],
        suggestion: 'Calculate mid = left + (right - left) // 2 to avoid overflow.',
      };
    }

    // Check for proper pointer updates
    const hasLeftUpdate = /(?:left|lo|start)\s*=\s*mid/.test(code);
    const hasRightUpdate = /(?:right|hi|end)\s*=\s*mid/.test(code);

    // Potential infinite loop if using left = mid without +1
    const dangerousLeftUpdate =
      /(?:left|lo|start)\s*=\s*mid\s*(?:[;\n]|$)/.test(code) &&
      !/(?:left|lo|start)\s*=\s*mid\s*\+\s*1/.test(code);

    if (dangerousLeftUpdate) {
      return {
        passed: false,
        errorType: 'IMPLEMENTATION_BUG',
        evidence: ['left = mid without +1 can cause infinite loop'],
        suggestion:
          'When searching right half, use left = mid + 1 to avoid infinite loop.',
      };
    }

    return { passed: true };
  },
});

/**
 * Two Pointers: Check for proper pointer movement
 */
registerHeuristic({
  id: 'tp_pointer_movement',
  name: 'Two Pointers Movement Check',
  pattern: 'TWO_POINTERS',
  check: (code: string, _language: string): HeuristicResult => {
    // Look for two pointers
    const hasTwoPointers =
      /(?:left|i|start)\s*=\s*0/.test(code) &&
      /(?:right|j|end)\s*=/.test(code);

    if (!hasTwoPointers) {
      return { passed: true };
    }

    // Check for while loop with pointer comparison
    const hasWhileLoop =
      /while\s*\([^)]*(?:left|i|start)\s*[<>=]+\s*(?:right|j|end)/.test(code) ||
      /while\s*\([^)]*(?:right|j|end)\s*[<>=]+\s*(?:left|i|start)/.test(code);

    if (!hasWhileLoop) {
      return {
        passed: false,
        errorType: 'IMPLEMENTATION_BUG',
        evidence: ['Two pointers detected but no while loop comparing them'],
        suggestion:
          'Use while (left < right) or similar to iterate until pointers meet.',
      };
    }

    // Check that at least one pointer moves
    const hasPointerMovement =
      /(?:left|i|start)\s*[+]=/.test(code) ||
      /(?:right|j|end)\s*[-]=/.test(code) ||
      /(?:left|i|start)\s*=\s*(?:left|i|start)\s*\+/.test(code) ||
      /(?:right|j|end)\s*=\s*(?:right|j|end)\s*-/.test(code);

    if (!hasPointerMovement) {
      return {
        passed: false,
        errorType: 'IMPLEMENTATION_BUG',
        evidence: ['No pointer movement detected'],
        suggestion: 'Move pointers inward: left += 1 or right -= 1.',
      };
    }

    return { passed: true };
  },
});

// ============ Export ============

export { HEURISTICS };
