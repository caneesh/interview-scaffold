/**
 * Forbidden concept detection for code validation.
 * PURE TypeScript - no framework dependencies.
 */

import type {
  ForbiddenConcept,
  ValidationError,
  ValidationErrorType,
} from './types.js';
import { PatternId, Language } from '../entities/types.js';

// ============================================================================
// Forbidden Concepts Registry
// ============================================================================

export const FORBIDDEN_CONCEPTS: readonly ForbiddenConcept[] = [
  // Sliding Window forbidden concepts
  {
    id: 'nested-loop-sliding-window',
    name: 'Nested Loop in Sliding Window',
    description: 'Using nested loops defeats the purpose of sliding window O(n) complexity',
    patterns: [
      {
        language: 'python',
        regex: 'for\\s+\\w+\\s+in\\s+[^:]+:[\\s\\S]*?\\n\\s+for\\s+\\w+\\s+in',
        description: 'Nested for loops detected',
      },
      {
        language: 'javascript',
        regex: 'for\\s*\\([^)]+\\)\\s*\\{[^}]*for\\s*\\(',
        description: 'Nested for loops detected',
      },
      {
        language: 'python',
        regex: 'while\\s+[^:]+:[\\s\\S]*?\\n\\s+while\\s+',
        description: 'Nested while loops detected',
      },
    ],
    applicablePatterns: [PatternId('sliding-window')],
    errorType: 'NESTED_LOOP_IN_SLIDING_WINDOW',
  },
  {
    id: 'if-instead-of-while-shrink',
    name: 'If Instead of While for Window Shrinking',
    description: 'Window shrinking should use while loop, not if statement',
    patterns: [
      {
        language: 'python',
        regex: 'if\\s+.*(?:>|>=|len|size).*:\\s*\\n\\s*(?:left|start|window_start)\\s*\\+=',
        description: 'Using if for window shrinking instead of while',
      },
      {
        language: 'javascript',
        regex: 'if\\s*\\([^)]*(?:>|>=|length|size)[^)]*\\)\\s*\\{[^}]*(?:left|start|windowStart)\\s*\\+\\+',
        description: 'Using if for window shrinking instead of while',
      },
    ],
    applicablePatterns: [PatternId('sliding-window')],
    errorType: 'WRONG_SHRINK_CONSTRUCT',
  },

  // DFS Grid forbidden concepts
  {
    id: 'missing-visited-dfs',
    name: 'Missing Visited Set in DFS',
    description: 'DFS on grid requires tracking visited cells to avoid infinite loops',
    patterns: [
      {
        language: 'python',
        regex: 'def\\s+dfs\\s*\\([^)]*\\):\\s*(?:(?!visited|seen).)*$',
        description: 'DFS function without visited tracking',
      },
    ],
    applicablePatterns: [PatternId('dfs-grid'), PatternId('graph-dfs')],
    errorType: 'MISSING_VISITED_SET',
  },
  {
    id: 'missing-backtrack-dfs',
    name: 'Missing Backtrack in DFS',
    description: 'DFS with mutable state requires backtracking after recursive call',
    patterns: [
      {
        language: 'python',
        regex: 'visited\\.add\\([^)]+\\)(?:(?!visited\\.(?:remove|discard)).)*$',
        description: 'Adding to visited without corresponding removal (no backtrack)',
      },
    ],
    applicablePatterns: [PatternId('dfs-grid'), PatternId('backtracking')],
    errorType: 'MISSING_BACKTRACK',
  },

  // General forbidden concepts
  {
    id: 'global-variable-mutation',
    name: 'Global Variable Mutation',
    description: 'Avoid mutating global variables in algorithmic solutions',
    patterns: [
      {
        language: 'python',
        regex: 'global\\s+\\w+',
        description: 'Using global keyword',
      },
      {
        language: 'javascript',
        regex: 'window\\.\\w+\\s*=',
        description: 'Assigning to window object',
      },
    ],
    applicablePatterns: [],
    errorType: 'PATTERN_VIOLATION',
  },
];

// ============================================================================
// Detector Functions
// ============================================================================

export interface DetectionInput {
  readonly code: string;
  readonly language: Language;
  readonly patternId: PatternId;
}

export interface DetectionResult {
  readonly hasForbidden: boolean;
  readonly violations: readonly ForbiddenViolation[];
  readonly errors: readonly ValidationError[];
}

export interface ForbiddenViolation {
  readonly conceptId: string;
  readonly conceptName: string;
  readonly description: string;
  readonly matchedPattern: string;
  readonly line?: number;
}

/**
 * Detects forbidden concepts in code.
 */
export function detectForbiddenConcepts(input: DetectionInput): DetectionResult {
  const { code, language, patternId } = input;
  const violations: ForbiddenViolation[] = [];
  const errors: ValidationError[] = [];

  // Get applicable forbidden concepts for this pattern
  const applicableConcepts = FORBIDDEN_CONCEPTS.filter(
    concept =>
      concept.applicablePatterns.length === 0 ||
      concept.applicablePatterns.includes(patternId)
  );

  for (const concept of applicableConcepts) {
    // Find patterns for this language
    const languagePatterns = concept.patterns.filter(p => p.language === language);

    for (const pattern of languagePatterns) {
      try {
        const regex = new RegExp(pattern.regex, 'gm');
        const matches = code.match(regex);

        if (matches && matches.length > 0) {
          // Find line number of first match
          const line = findLineNumber(code, matches[0]);

          violations.push({
            conceptId: concept.id,
            conceptName: concept.name,
            description: concept.description,
            matchedPattern: pattern.description,
            line,
          });

          errors.push({
            type: concept.errorType,
            message: `${concept.name}: ${concept.description}`,
            line,
            severity: 'error',
            suggestion: getSuggestionForConcept(concept.id),
          });
        }
      } catch (e) {
        // Invalid regex, skip
        console.error(`Invalid regex in forbidden concept ${concept.id}:`, e);
      }
    }
  }

  return {
    hasForbidden: violations.length > 0,
    violations,
    errors,
  };
}

/**
 * Finds the line number where a match occurs.
 */
function findLineNumber(code: string, match: string): number {
  const index = code.indexOf(match);
  if (index === -1) return 1;

  const linesBeforeMatch = code.substring(0, index).split('\n');
  return linesBeforeMatch.length;
}

/**
 * Gets improvement suggestion for a forbidden concept.
 */
function getSuggestionForConcept(conceptId: string): string {
  const suggestions: Record<string, string> = {
    'nested-loop-sliding-window':
      'Use a single loop with two pointers (left/right) to achieve O(n) complexity.',
    'if-instead-of-while-shrink':
      'Replace "if" with "while" for window shrinking to handle multiple shrinks per iteration.',
    'missing-visited-dfs':
      'Add a visited set and check/mark cells before recursing to prevent infinite loops.',
    'missing-backtrack-dfs':
      'Remove from visited set after recursive call returns to enable backtracking.',
    'global-variable-mutation':
      'Pass state as function parameters or use closures instead of global variables.',
  };

  return suggestions[conceptId] ?? 'Review the algorithmic pattern requirements.';
}

// ============================================================================
// Pattern-specific Validators
// ============================================================================

/**
 * Validates sliding window implementation.
 */
export function validateSlidingWindow(
  code: string,
  language: Language
): ValidationError[] {
  const errors: ValidationError[] = [];

  // Check for proper while loop for shrinking
  const hasWhileShrink = checkForWhileShrink(code, language);
  if (!hasWhileShrink.found && hasWhileShrink.hasWindowLogic) {
    errors.push({
      type: 'WRONG_SHRINK_CONSTRUCT',
      message: 'Window shrinking should use a while loop, not an if statement',
      severity: 'error',
      suggestion: 'Change "if window_too_large:" to "while window_too_large:" to properly shrink the window',
    });
  }

  // Check for nested loops
  const hasNestedLoops = checkForNestedLoops(code, language);
  if (hasNestedLoops) {
    errors.push({
      type: 'NESTED_LOOP_IN_SLIDING_WINDOW',
      message: 'Nested loops detected. Sliding window should be O(n) with a single pass.',
      severity: 'error',
      suggestion: 'Refactor to use two pointers with a single outer loop.',
    });
  }

  return errors;
}

/**
 * Validates DFS grid implementation.
 */
export function validateDFSGrid(
  code: string,
  language: Language
): ValidationError[] {
  const errors: ValidationError[] = [];

  // Check for visited tracking
  const hasVisited = checkForVisitedTracking(code, language);
  if (!hasVisited) {
    errors.push({
      type: 'MISSING_VISITED_SET',
      message: 'DFS on grid requires tracking visited cells to prevent infinite loops.',
      severity: 'error',
      suggestion: 'Add a visited set and check "if (row, col) in visited" before recursing.',
    });
  }

  // Check for backtracking if modifying visited in-place
  const needsBacktrack = checkNeedsBacktrack(code, language);
  if (needsBacktrack.needsIt && !needsBacktrack.hasIt) {
    errors.push({
      type: 'MISSING_BACKTRACK',
      message: 'DFS with in-place visited marking needs backtracking.',
      severity: 'warning',
      suggestion: 'Add visited.remove() or visited.discard() after the recursive call.',
    });
  }

  return errors;
}

// ============================================================================
// Helper Functions
// ============================================================================

function checkForWhileShrink(
  code: string,
  language: Language
): { found: boolean; hasWindowLogic: boolean } {
  const normalizedCode = code.toLowerCase();
  const hasWindowLogic =
    normalizedCode.includes('left') ||
    normalizedCode.includes('start') ||
    normalizedCode.includes('window');

  if (language === 'python') {
    const hasWhile = /while\s+.*(?:left|start|window).*:/i.test(code);
    return { found: hasWhile, hasWindowLogic };
  }

  if (language === 'javascript' || language === 'typescript') {
    const hasWhile = /while\s*\([^)]*(?:left|start|window)[^)]*\)/i.test(code);
    return { found: hasWhile, hasWindowLogic };
  }

  return { found: true, hasWindowLogic }; // Default to found for unknown languages
}

function checkForNestedLoops(code: string, language: Language): boolean {
  if (language === 'python') {
    // Check for nested for loops - look for 'for' at higher indentation after a 'for' line
    const lines = code.split('\n');
    let inForBlock = false;
    let forIndentation = -1;

    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.startsWith('for ') && trimmed.includes(' in ') && trimmed.endsWith(':')) {
        const currentIndent = line.search(/\S/);
        if (inForBlock && currentIndent > forIndentation) {
          // Found a nested for loop
          return true;
        }
        inForBlock = true;
        forIndentation = currentIndent;
      }
    }
    return false;
  }

  if (language === 'javascript' || language === 'typescript') {
    // Simple check for nested loops
    const hasNested = /for\s*\([^)]+\)\s*\{[^}]*for\s*\(/s.test(code);
    return hasNested;
  }

  return false;
}

function checkForVisitedTracking(code: string, language: Language): boolean {
  const normalizedCode = code.toLowerCase();
  return (
    normalizedCode.includes('visited') ||
    normalizedCode.includes('seen') ||
    normalizedCode.includes('memo') ||
    // In-place marking
    normalizedCode.includes("grid[") && normalizedCode.includes("'#'") ||
    normalizedCode.includes('grid[') && normalizedCode.includes('"#"')
  );
}

function checkNeedsBacktrack(
  code: string,
  language: Language
): { needsIt: boolean; hasIt: boolean } {
  const hasAdd = /visited\.add\(/i.test(code) || /seen\.add\(/i.test(code);
  const hasRemove =
    /visited\.(?:remove|discard|delete)\(/i.test(code) ||
    /seen\.(?:remove|discard|delete)\(/i.test(code);

  // Only need backtrack if adding to visited
  return {
    needsIt: hasAdd,
    hasIt: hasRemove,
  };
}
