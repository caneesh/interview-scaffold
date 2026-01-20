/**
 * Pattern Recognition Gate Module
 *
 * User identifies pattern family with justification:
 * - Accept only pattern names (Sliding Window, BFS, DP, etc.)
 * - If incorrect, ask guiding questions (don't reveal answer)
 * - Return PASSED or FAILED status
 */

import type { PatternId, PATTERNS } from '../entities/pattern.js';
import { PATTERN_DEFINITIONS } from '../entities/pattern.js';
import type { Problem } from '../entities/problem.js';
import type {
  PatternRecognitionData,
  PatternAttempt,
  PatternFeedback,
  PatternGateStatus,
  CoachResponse,
} from './types.js';
import { selectRandom } from './random-utils.js';

// ============ Constants ============

/**
 * Maximum attempts before gate fails
 */
export const MAX_PATTERN_ATTEMPTS = 3;

/**
 * Minimum justification length for acceptance
 */
export const MIN_JUSTIFICATION_LENGTH = 20;

/**
 * Valid pattern names (case-insensitive mapping)
 */
export const PATTERN_NAME_MAP: Readonly<Record<string, PatternId>> = {
  'sliding window': 'SLIDING_WINDOW',
  'slidingwindow': 'SLIDING_WINDOW',
  'sliding_window': 'SLIDING_WINDOW',
  'two pointers': 'TWO_POINTERS',
  'twopointers': 'TWO_POINTERS',
  'two_pointers': 'TWO_POINTERS',
  '2 pointers': 'TWO_POINTERS',
  'prefix sum': 'PREFIX_SUM',
  'prefixsum': 'PREFIX_SUM',
  'prefix_sum': 'PREFIX_SUM',
  'cumulative sum': 'PREFIX_SUM',
  'binary search': 'BINARY_SEARCH',
  'binarysearch': 'BINARY_SEARCH',
  'binary_search': 'BINARY_SEARCH',
  'bfs': 'BFS',
  'breadth first search': 'BFS',
  'breadth-first search': 'BFS',
  'dfs': 'DFS',
  'depth first search': 'DFS',
  'depth-first search': 'DFS',
  'dynamic programming': 'DYNAMIC_PROGRAMMING',
  'dynamicprogramming': 'DYNAMIC_PROGRAMMING',
  'dynamic_programming': 'DYNAMIC_PROGRAMMING',
  'dp': 'DYNAMIC_PROGRAMMING',
  'backtracking': 'BACKTRACKING',
  'back tracking': 'BACKTRACKING',
  'greedy': 'GREEDY',
  'heap': 'HEAP',
  'priority queue': 'HEAP',
  'priorityqueue': 'HEAP',
  'trie': 'TRIE',
  'prefix tree': 'TRIE',
  'union find': 'UNION_FIND',
  'unionfind': 'UNION_FIND',
  'union_find': 'UNION_FIND',
  'disjoint set': 'UNION_FIND',
  'interval merging': 'INTERVAL_MERGING',
  'intervalmerging': 'INTERVAL_MERGING',
  'interval_merging': 'INTERVAL_MERGING',
  'merge intervals': 'INTERVAL_MERGING',
};

/**
 * Related patterns that are "close" to each other
 */
export const PATTERN_RELATIONS: Readonly<Record<PatternId, readonly PatternId[]>> = {
  SLIDING_WINDOW: ['TWO_POINTERS', 'PREFIX_SUM'],
  TWO_POINTERS: ['SLIDING_WINDOW', 'BINARY_SEARCH'],
  PREFIX_SUM: ['SLIDING_WINDOW', 'DYNAMIC_PROGRAMMING'],
  BINARY_SEARCH: ['TWO_POINTERS'],
  BFS: ['DFS'],
  DFS: ['BFS', 'BACKTRACKING'],
  DYNAMIC_PROGRAMMING: ['GREEDY', 'PREFIX_SUM', 'BACKTRACKING'],
  BACKTRACKING: ['DFS', 'DYNAMIC_PROGRAMMING'],
  GREEDY: ['DYNAMIC_PROGRAMMING'],
  HEAP: ['TWO_POINTERS', 'SLIDING_WINDOW'],
  TRIE: ['DFS'],
  UNION_FIND: ['DFS', 'BFS'],
  INTERVAL_MERGING: ['GREEDY', 'TWO_POINTERS'],
};

// ============ Guiding Questions ============

/**
 * Pattern-specific guiding questions to help users discover the correct pattern
 * without revealing the answer directly
 */
const GUIDING_QUESTIONS: Readonly<Record<PatternId, readonly string[]>> = {
  SLIDING_WINDOW: [
    'Does the problem involve finding a contiguous subarray or substring?',
    'Can you process elements by expanding and shrinking a window?',
    'Is there a condition that defines when the window is valid?',
  ],
  TWO_POINTERS: [
    'Is the input sorted or could sorting help?',
    'Can you use two pointers moving toward or away from each other?',
    'Does the problem involve finding pairs with a certain property?',
  ],
  PREFIX_SUM: [
    'Do you need to answer multiple range sum queries?',
    'Can precomputing cumulative sums help avoid repeated calculations?',
    'Is there a relationship between subarray sums and running totals?',
  ],
  BINARY_SEARCH: [
    'Is there a sorted order or monotonic property you can exploit?',
    'Can you eliminate half the search space with each comparison?',
    'Are you looking for a boundary or threshold value?',
  ],
  BFS: [
    'Do you need to find the shortest path or minimum steps?',
    'Should you explore neighbors level by level?',
    'Is there a starting point and goal with uniform costs?',
  ],
  DFS: [
    'Do you need to explore all paths or find any valid path?',
    'Is this a tree or graph traversal problem?',
    'Do you need to track visited nodes to avoid cycles?',
  ],
  DYNAMIC_PROGRAMMING: [
    'Are there overlapping subproblems you can memoize?',
    'Can you express the solution in terms of smaller instances?',
    'Is there an optimal substructure property?',
  ],
  BACKTRACKING: [
    'Do you need to generate all valid combinations or permutations?',
    'Can you make choices, explore, and undo (backtrack)?',
    'Is there a constraint that prunes invalid branches early?',
  ],
  GREEDY: [
    'Can you make a locally optimal choice at each step?',
    'Does the problem have an optimal substructure?',
    'Would sorting the input simplify the greedy choice?',
  ],
  HEAP: [
    'Do you need to repeatedly access the minimum or maximum element?',
    'Are you looking for the k-th largest or smallest element?',
    'Do you need to merge sorted sequences?',
  ],
  TRIE: [
    'Does the problem involve prefix matching or word lookup?',
    'Are you working with a dictionary of words?',
    'Do multiple strings share common prefixes?',
  ],
  UNION_FIND: [
    'Do you need to track connected components?',
    'Are elements grouped into disjoint sets?',
    'Do you need to efficiently merge groups and check membership?',
  ],
  INTERVAL_MERGING: [
    'Are you working with time intervals or ranges?',
    'Do you need to merge overlapping intervals?',
    'Would sorting by start time help?',
  ],
};

// ============ Pattern Parsing ============

/**
 * Parse a user's pattern input to a valid PatternId
 */
export function parsePatternInput(input: string): PatternId | null {
  const normalized = input.trim().toLowerCase();

  // Direct lookup
  if (normalized in PATTERN_NAME_MAP) {
    return PATTERN_NAME_MAP[normalized]!;
  }

  // Check if it's already a valid PatternId
  const upperInput = input.trim().toUpperCase().replace(/\s+/g, '_');
  if (isValidPatternId(upperInput)) {
    return upperInput as PatternId;
  }

  return null;
}

function isValidPatternId(id: string): boolean {
  const validPatterns: readonly string[] = [
    'SLIDING_WINDOW', 'TWO_POINTERS', 'PREFIX_SUM', 'BINARY_SEARCH',
    'BFS', 'DFS', 'DYNAMIC_PROGRAMMING', 'BACKTRACKING', 'GREEDY',
    'HEAP', 'TRIE', 'UNION_FIND', 'INTERVAL_MERGING',
  ];
  return validPatterns.includes(id);
}

// ============ Justification Validation ============

/**
 * Keywords that indicate substantive justification
 */
const JUSTIFICATION_KEYWORDS: Readonly<Record<PatternId, readonly string[]>> = {
  SLIDING_WINDOW: ['window', 'contiguous', 'subarray', 'substring', 'expand', 'shrink', 'left', 'right'],
  TWO_POINTERS: ['pointer', 'sorted', 'pair', 'converge', 'opposite', 'start', 'end'],
  PREFIX_SUM: ['prefix', 'cumulative', 'range', 'sum', 'precompute', 'query'],
  BINARY_SEARCH: ['sorted', 'half', 'mid', 'boundary', 'monotonic', 'log n'],
  BFS: ['queue', 'level', 'shortest', 'neighbor', 'breadth', 'layer'],
  DFS: ['stack', 'recursion', 'depth', 'backtrack', 'explore', 'path'],
  DYNAMIC_PROGRAMMING: ['subproblem', 'memo', 'state', 'recurrence', 'optimal', 'dp'],
  BACKTRACKING: ['choice', 'explore', 'undo', 'prune', 'candidate', 'constraint'],
  GREEDY: ['local', 'optimal', 'choice', 'sort', 'greedy'],
  HEAP: ['priority', 'min', 'max', 'k-th', 'top k', 'heap'],
  TRIE: ['prefix', 'word', 'dictionary', 'character', 'tree'],
  UNION_FIND: ['connected', 'component', 'disjoint', 'merge', 'find', 'union'],
  INTERVAL_MERGING: ['interval', 'overlap', 'merge', 'range', 'start', 'end'],
};

/**
 * Validate the justification for a pattern selection
 */
export function validateJustification(
  justification: string,
  selectedPattern: PatternId
): { isValid: boolean; hasKeywords: boolean; message: string } {
  const trimmed = justification.trim();

  // Check minimum length
  if (trimmed.length < MIN_JUSTIFICATION_LENGTH) {
    return {
      isValid: false,
      hasKeywords: false,
      message: `Justification is too short (${trimmed.length} chars, need ${MIN_JUSTIFICATION_LENGTH}+).`,
    };
  }

  // Check for pattern-specific keywords
  const keywords = JUSTIFICATION_KEYWORDS[selectedPattern] ?? [];
  const normalized = trimmed.toLowerCase();
  const foundKeywords = keywords.filter(kw => normalized.includes(kw.toLowerCase()));
  const hasKeywords = foundKeywords.length > 0;

  if (!hasKeywords) {
    return {
      isValid: false,
      hasKeywords: false,
      message: 'Justification should explain why this pattern fits the problem structure.',
    };
  }

  return {
    isValid: true,
    hasKeywords: true,
    message: 'Justification accepted.',
  };
}

// ============ Pattern Validation ============

export interface PatternValidationInput {
  readonly problem: Problem;
  readonly selectedPattern: string;
  readonly justification: string;
}

export interface PatternValidationResult {
  readonly isCorrect: boolean;
  readonly feedback: PatternFeedback;
  readonly status: PatternGateStatus;
}

/**
 * Validate a pattern selection against the problem
 */
export function validatePatternSelection(
  input: PatternValidationInput,
  currentData: PatternRecognitionData
): PatternValidationResult {
  const { problem, selectedPattern, justification } = input;

  // Parse the pattern input
  const parsedPattern = parsePatternInput(selectedPattern);

  // Handle invalid pattern name
  if (!parsedPattern) {
    const validPatterns = Object.values(PATTERN_DEFINITIONS)
      .map(p => p.name)
      .join(', ');
    return {
      isCorrect: false,
      feedback: {
        type: 'INCORRECT',
        guidingQuestion: `"${selectedPattern}" is not a recognized pattern. Valid patterns include: ${validPatterns}`,
        hint: null,
      },
      status: currentData.attempts.length + 1 >= MAX_PATTERN_ATTEMPTS ? 'FAILED' : 'PENDING',
    };
  }

  // Validate justification
  const justificationResult = validateJustification(justification, parsedPattern);
  if (!justificationResult.isValid) {
    return {
      isCorrect: false,
      feedback: {
        type: 'INCORRECT',
        guidingQuestion: justificationResult.message,
        hint: 'Explain what properties of the problem make this pattern suitable.',
      },
      status: currentData.attempts.length + 1 >= MAX_PATTERN_ATTEMPTS ? 'FAILED' : 'PENDING',
    };
  }

  // Check if pattern is correct
  const correctPattern = problem.pattern;
  if (parsedPattern === correctPattern) {
    return {
      isCorrect: true,
      feedback: {
        type: 'CORRECT',
        guidingQuestion: null,
        hint: null,
      },
      status: 'PASSED',
    };
  }

  // Check if pattern is related (close but not quite)
  const relatedPatterns = PATTERN_RELATIONS[correctPattern] ?? [];
  if (relatedPatterns.includes(parsedPattern)) {
    // Close pattern - give a hint that points toward the correct one
    const correctPatternName = PATTERN_DEFINITIONS[correctPattern]?.name ?? correctPattern;
    const guidingQuestions = GUIDING_QUESTIONS[correctPattern] ?? [];
    const guidingQuestion = guidingQuestions[0] ?? `Think about what distinguishes this problem from typical ${PATTERN_DEFINITIONS[parsedPattern]?.name} problems.`;

    return {
      isCorrect: false,
      feedback: {
        type: 'CLOSE',
        guidingQuestion,
        hint: `${PATTERN_DEFINITIONS[parsedPattern]?.name} is related, but there might be a more specific pattern that fits better.`,
      },
      status: currentData.attempts.length + 1 >= MAX_PATTERN_ATTEMPTS ? 'FAILED' : 'PENDING',
    };
  }

  // Completely wrong pattern
  const guidingQuestions = GUIDING_QUESTIONS[correctPattern] ?? [];
  const guidingQuestion = selectRandom(guidingQuestions) ?? 'Re-read the problem. What is the core operation being repeated?';

  return {
    isCorrect: false,
    feedback: {
      type: 'INCORRECT',
      guidingQuestion,
      hint: null,
    },
    status: currentData.attempts.length + 1 >= MAX_PATTERN_ATTEMPTS ? 'FAILED' : 'PENDING',
  };
}

// ============ Pattern Gate Processing ============

/**
 * Process a pattern selection attempt
 */
export function processPatternAttempt(
  input: PatternValidationInput,
  currentData: PatternRecognitionData
): {
  attempt: PatternAttempt;
  result: PatternValidationResult;
  updatedData: PatternRecognitionData;
} {
  const result = validatePatternSelection(input, currentData);
  const parsedPattern = parsePatternInput(input.selectedPattern);

  const attempt: PatternAttempt = {
    pattern: parsedPattern ?? ('UNKNOWN' as PatternId), // Will be rejected anyway
    justification: input.justification,
    isCorrect: result.isCorrect,
    feedback: result.feedback,
    timestamp: new Date(),
  };

  // Update guiding questions
  const newGuidingQuestions: string[] = [];
  if (result.feedback.guidingQuestion) {
    newGuidingQuestions.push(result.feedback.guidingQuestion);
  }

  const updatedData: PatternRecognitionData = {
    selectedPattern: result.isCorrect ? parsedPattern : currentData.selectedPattern,
    justification: result.isCorrect ? input.justification : currentData.justification,
    attempts: [...currentData.attempts, attempt],
    status: result.status,
    guidingQuestions: newGuidingQuestions,
  };

  return { attempt, result, updatedData };
}

// ============ Coach Response Generation ============

/**
 * Generate a coach response for pattern recognition
 */
export function generatePatternResponse(
  result: PatternValidationResult,
  attemptCount: number
): CoachResponse {
  const feedback = result.feedback;

  if (result.isCorrect) {
    return {
      type: 'CONGRATULATIONS',
      content: 'Correct pattern identified! Your justification shows good understanding.',
      questions: [],
      helpLevel: null,
      nextAction: 'ADVANCE',
      metadata: {
        stage: 'PATTERN_RECOGNITION',
        attemptCount,
        helpUsed: 0,
        timeElapsed: 0,
      },
    };
  }

  if (result.status === 'FAILED') {
    return {
      type: 'FEEDBACK',
      content: 'Maximum attempts reached. Let us review the pattern for this problem.',
      questions: feedback.guidingQuestion ? [feedback.guidingQuestion] : [],
      helpLevel: null,
      nextAction: 'RETRY',
      metadata: {
        stage: 'PATTERN_RECOGNITION',
        attemptCount,
        helpUsed: 0,
        timeElapsed: 0,
      },
    };
  }

  // Pending - provide guidance
  const content = feedback.type === 'CLOSE'
    ? 'You are on the right track, but there may be a better fit.'
    : 'Think more carefully about the problem structure.';

  return {
    type: 'QUESTION',
    content,
    questions: feedback.guidingQuestion ? [feedback.guidingQuestion] : [],
    helpLevel: null,
    nextAction: 'CONTINUE',
    metadata: {
      stage: 'PATTERN_RECOGNITION',
      attemptCount,
      helpUsed: 0,
      timeElapsed: 0,
    },
  };
}

// ============ Initial Data Factory ============

/**
 * Create initial pattern recognition data
 */
export function createInitialPatternData(): PatternRecognitionData {
  return {
    selectedPattern: null,
    justification: null,
    attempts: [],
    status: 'PENDING',
    guidingQuestions: [],
  };
}
