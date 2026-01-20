/**
 * Strategy Design Module
 *
 * Test reasoning ability:
 * - Identify logical gaps, contradictions, missing edge cases
 * - Ask adversarial "what if" questions
 * - Confirm readiness for coding if coherent
 */

import type { Problem } from '../entities/problem.js';
import type { PatternId } from '../entities/pattern.js';
import type {
  StrategyDesignData,
  StrategyValidationResult,
  StrategyGap,
  StrategyContradiction,
  AdversarialQuestion,
  AdversarialCategory,
  CoachResponse,
} from './types.js';

// ============ Constants ============

/**
 * Minimum strategy length for meaningful analysis
 */
export const MIN_STRATEGY_LENGTH = 50;

/**
 * Score threshold to be ready for coding
 */
export const READINESS_THRESHOLD = 0.6;

/**
 * Maximum adversarial questions to ask
 */
export const MAX_ADVERSARIAL_QUESTIONS = 3;

// ============ Gap Detection ============

/**
 * Common strategy gaps by pattern
 */
const COMMON_GAPS: Readonly<Record<PatternId, readonly { signal: RegExp; gap: string; severity: 'MINOR' | 'MAJOR' | 'CRITICAL' }[]>> = {
  SLIDING_WINDOW: [
    { signal: /window/i, gap: 'How do you track what is in the window?', severity: 'MAJOR' },
    { signal: /shrink|contract/i, gap: 'When exactly do you shrink the window?', severity: 'MAJOR' },
    { signal: /valid|invalid/i, gap: 'What makes a window valid or invalid?', severity: 'CRITICAL' },
  ],
  TWO_POINTERS: [
    { signal: /pointer/i, gap: 'Which pointer moves and when?', severity: 'MAJOR' },
    { signal: /sorted/i, gap: 'What if the input is not sorted?', severity: 'CRITICAL' },
    { signal: /meet|converge/i, gap: 'What happens when pointers meet?', severity: 'MAJOR' },
  ],
  BINARY_SEARCH: [
    { signal: /mid|middle/i, gap: 'How do you calculate mid without overflow?', severity: 'MINOR' },
    { signal: /left|right/i, gap: 'Which boundary do you update and why?', severity: 'MAJOR' },
    { signal: /terminate|stop/i, gap: 'What is your loop termination condition?', severity: 'CRITICAL' },
  ],
  DFS: [
    { signal: /visit|visited/i, gap: 'How do you mark nodes as visited?', severity: 'CRITICAL' },
    { signal: /backtrack/i, gap: 'When do you backtrack?', severity: 'MAJOR' },
    { signal: /base/i, gap: 'What is your base case?', severity: 'CRITICAL' },
  ],
  BFS: [
    { signal: /queue/i, gap: 'What do you add to the queue?', severity: 'MAJOR' },
    { signal: /level/i, gap: 'How do you track level boundaries?', severity: 'MAJOR' },
    { signal: /visit/i, gap: 'When do you mark as visited - before or after dequeue?', severity: 'CRITICAL' },
  ],
  DYNAMIC_PROGRAMMING: [
    { signal: /state|dp/i, gap: 'What does each state represent?', severity: 'CRITICAL' },
    { signal: /transition|recurrence/i, gap: 'What is your recurrence relation?', severity: 'CRITICAL' },
    { signal: /base/i, gap: 'What are your base cases?', severity: 'MAJOR' },
  ],
  BACKTRACKING: [
    { signal: /choice/i, gap: 'What choices do you make at each step?', severity: 'MAJOR' },
    { signal: /undo|restore/i, gap: 'How do you undo a choice?', severity: 'CRITICAL' },
    { signal: /prune|valid/i, gap: 'What constraints let you prune early?', severity: 'MAJOR' },
  ],
  GREEDY: [
    { signal: /choice|pick|select/i, gap: 'What makes a choice locally optimal?', severity: 'CRITICAL' },
    { signal: /sort/i, gap: 'Why does sorting help here?', severity: 'MAJOR' },
    { signal: /prove|correct/i, gap: 'Why is greedy correct for this problem?', severity: 'MAJOR' },
  ],
  HEAP: [
    { signal: /heap|priority/i, gap: 'Min-heap or max-heap? Why?', severity: 'MAJOR' },
    { signal: /add|push/i, gap: 'When do you add to the heap?', severity: 'MAJOR' },
    { signal: /remove|pop/i, gap: 'When do you remove from the heap?', severity: 'MAJOR' },
  ],
  PREFIX_SUM: [
    { signal: /prefix|cumulative/i, gap: 'How do you compute the prefix array?', severity: 'MAJOR' },
    { signal: /range|query/i, gap: 'How do you answer a range query?', severity: 'CRITICAL' },
    { signal: /index/i, gap: 'What are your index bounds?', severity: 'MINOR' },
  ],
  TRIE: [
    { signal: /node|children/i, gap: 'What does each node store?', severity: 'MAJOR' },
    { signal: /insert/i, gap: 'How do you insert a word?', severity: 'MAJOR' },
    { signal: /search/i, gap: 'How do you search for a prefix vs complete word?', severity: 'MAJOR' },
  ],
  UNION_FIND: [
    { signal: /find|parent/i, gap: 'How do you find the root of a set?', severity: 'CRITICAL' },
    { signal: /union|merge/i, gap: 'How do you merge two sets?', severity: 'CRITICAL' },
    { signal: /compress|rank/i, gap: 'Are you using path compression or union by rank?', severity: 'MINOR' },
  ],
  INTERVAL_MERGING: [
    { signal: /sort/i, gap: 'How do you sort the intervals?', severity: 'MAJOR' },
    { signal: /overlap/i, gap: 'How do you detect overlap?', severity: 'CRITICAL' },
    { signal: /merge/i, gap: 'How do you merge two overlapping intervals?', severity: 'MAJOR' },
  ],
};

/**
 * Detect gaps in a strategy
 */
export function detectGaps(
  strategy: string,
  pattern: PatternId
): readonly StrategyGap[] {
  const gaps: StrategyGap[] = [];
  const normalized = strategy.toLowerCase();
  const patternGaps = COMMON_GAPS[pattern] ?? [];

  for (const { signal, gap, severity } of patternGaps) {
    // If the signal is mentioned but not explained well
    if (signal.test(normalized)) {
      // Check if there's explanation following the mention
      const hasExplanation = /\b(because|so that|which means|this ensures|by|using)\b/i.test(strategy);
      if (!hasExplanation) {
        gaps.push({
          id: `gap-${gaps.length}`,
          description: gap,
          severity,
          suggestion: null,
        });
      }
    } else {
      // Key concept not mentioned at all
      gaps.push({
        id: `gap-${gaps.length}`,
        description: `Consider: ${gap}`,
        severity: severity === 'CRITICAL' ? 'MAJOR' : 'MINOR',
        suggestion: null,
      });
    }
  }

  // Limit to most important gaps
  return gaps
    .sort((a, b) => {
      const severityOrder = { CRITICAL: 0, MAJOR: 1, MINOR: 2 };
      return severityOrder[a.severity] - severityOrder[b.severity];
    })
    .slice(0, 3);
}

// ============ Contradiction Detection ============

/**
 * Contradictory statement patterns
 */
const CONTRADICTION_PATTERNS: readonly { pattern1: RegExp; pattern2: RegExp; description: string }[] = [
  {
    pattern1: /o\(n\)/i,
    pattern2: /nested\s+loop|two\s+loops/i,
    description: 'Stated O(n) but using nested loops',
  },
  {
    pattern1: /o\(1\)\s+space/i,
    pattern2: /hash\s*(map|table|set)|array|list/i,
    description: 'Stated O(1) space but using additional data structures',
  },
  {
    pattern1: /single\s+pass/i,
    pattern2: /two\s+pass|multiple\s+pass/i,
    description: 'Mentioned single pass and multiple passes',
  },
  {
    pattern1: /sort.*first/i,
    pattern2: /maintain.*order|preserve.*order/i,
    description: 'Sorting and preserving original order may conflict',
  },
];

/**
 * Detect contradictions in a strategy
 */
export function detectContradictions(strategy: string): readonly StrategyContradiction[] {
  const contradictions: StrategyContradiction[] = [];

  for (const { pattern1, pattern2, description } of CONTRADICTION_PATTERNS) {
    const match1 = pattern1.exec(strategy);
    const match2 = pattern2.exec(strategy);

    if (match1 && match2) {
      contradictions.push({
        id: `contradiction-${contradictions.length}`,
        statement1: match1[0],
        statement2: match2[0],
        explanation: description,
      });
    }
  }

  return contradictions;
}

// ============ Edge Case Detection ============

/**
 * Common edge cases by pattern
 */
const EDGE_CASES: Readonly<Record<PatternId, readonly string[]>> = {
  SLIDING_WINDOW: [
    'empty input',
    'single element',
    'window larger than input',
    'all elements same',
    'no valid window exists',
  ],
  TWO_POINTERS: [
    'empty input',
    'single element',
    'all elements same',
    'no valid pair exists',
    'multiple valid answers',
  ],
  BINARY_SEARCH: [
    'empty input',
    'single element',
    'target at boundaries',
    'target not found',
    'duplicate elements',
  ],
  DFS: [
    'empty graph',
    'single node',
    'disconnected components',
    'cycles',
    'deep recursion limit',
  ],
  BFS: [
    'empty graph',
    'single node',
    'disconnected components',
    'source equals destination',
    'no path exists',
  ],
  DYNAMIC_PROGRAMMING: [
    'base case inputs',
    'negative values',
    'zero values',
    'maximum constraints',
    'all same values',
  ],
  BACKTRACKING: [
    'no valid solution',
    'single valid solution',
    'many solutions',
    'empty input',
    'early termination',
  ],
  GREEDY: [
    'tie-breaking scenarios',
    'empty input',
    'all equal values',
    'greedy fails case',
    'boundary values',
  ],
  HEAP: [
    'empty heap',
    'single element',
    'k larger than input size',
    'all same elements',
    'negative values',
  ],
  PREFIX_SUM: [
    'empty input',
    'single element',
    'full range query',
    'negative values',
    'overflow/underflow',
  ],
  TRIE: [
    'empty dictionary',
    'single character words',
    'word is prefix of another',
    'common prefix for all',
    'no matching prefix',
  ],
  UNION_FIND: [
    'all nodes separate',
    'all nodes connected',
    'single node',
    'redundant unions',
    'self-loop',
  ],
  INTERVAL_MERGING: [
    'empty intervals',
    'single interval',
    'no overlapping intervals',
    'all overlapping',
    'touching but not overlapping',
  ],
};

/**
 * Detect missing edge cases in a strategy
 */
export function detectMissingEdgeCases(
  strategy: string,
  pattern: PatternId
): readonly string[] {
  const normalized = strategy.toLowerCase();
  const edgeCases = EDGE_CASES[pattern] ?? [];
  const missing: string[] = [];

  for (const edgeCase of edgeCases) {
    // Check if edge case is mentioned (simplified check)
    const keywords = edgeCase.toLowerCase().split(/\s+/);
    const isMentioned = keywords.some(kw => normalized.includes(kw));
    if (!isMentioned) {
      missing.push(edgeCase);
    }
  }

  // Return top 3 missing edge cases
  return missing.slice(0, 3);
}

// ============ Adversarial Questions ============

/**
 * Generate adversarial "what if" questions
 */
export function generateAdversarialQuestions(
  strategy: string,
  pattern: PatternId,
  problem: Problem
): readonly AdversarialQuestion[] {
  const questions: AdversarialQuestion[] = [];
  const normalized = strategy.toLowerCase();

  // Edge case questions
  const missingEdgeCases = detectMissingEdgeCases(strategy, pattern);
  for (const edgeCase of missingEdgeCases.slice(0, 1)) {
    questions.push({
      id: `adversarial-edge-${questions.length}`,
      question: `What if the input is ${edgeCase}?`,
      category: 'EDGE_CASE',
      userAnswer: null,
      isResolved: false,
      timestamp: new Date(),
    });
  }

  // Invariant questions based on pattern
  const invariantQuestions = getInvariantQuestions(pattern);
  if (invariantQuestions.length > 0 && !normalized.includes('invariant')) {
    questions.push({
      id: `adversarial-invariant-${questions.length}`,
      question: invariantQuestions[0]!,
      category: 'INVARIANT',
      userAnswer: null,
      isResolved: false,
      timestamp: new Date(),
    });
  }

  // Complexity questions
  if (!normalized.includes('time') && !normalized.includes('complexity')) {
    questions.push({
      id: `adversarial-complexity-${questions.length}`,
      question: 'What is the time complexity of each step?',
      category: 'COMPLEXITY',
      userAnswer: null,
      isResolved: false,
      timestamp: new Date(),
    });
  }

  // State questions for stateful algorithms
  const statefulPatterns: PatternId[] = ['SLIDING_WINDOW', 'TWO_POINTERS', 'DFS', 'BFS', 'BACKTRACKING'];
  if (statefulPatterns.includes(pattern) && !normalized.includes('state')) {
    questions.push({
      id: `adversarial-state-${questions.length}`,
      question: 'What state do you maintain as you iterate?',
      category: 'STATE',
      userAnswer: null,
      isResolved: false,
      timestamp: new Date(),
    });
  }

  return questions.slice(0, MAX_ADVERSARIAL_QUESTIONS);
}

/**
 * Get invariant questions by pattern
 */
function getInvariantQuestions(pattern: PatternId): readonly string[] {
  const questions: Record<PatternId, readonly string[]> = {
    SLIDING_WINDOW: [
      'What property does your window always maintain?',
      'What is true about elements inside the window at all times?',
    ],
    TWO_POINTERS: [
      'What relationship between the pointers is always maintained?',
      'What property is true for all elements between the pointers?',
    ],
    BINARY_SEARCH: [
      'What is always true about the search space after each iteration?',
      'What guarantees the target is within [left, right]?',
    ],
    DFS: [
      'What is true about the current path at each recursive call?',
      'What property does your visited set maintain?',
    ],
    BFS: [
      'What property holds for all nodes at the current level?',
      'What guarantees shortest distance is found?',
    ],
    DYNAMIC_PROGRAMMING: [
      'What does dp[i] represent at all times?',
      'Why are previous subproblems sufficient to solve the current one?',
    ],
    BACKTRACKING: [
      'What is true about the current partial solution?',
      'How do you guarantee no duplicate solutions?',
    ],
    GREEDY: [
      'Why is the greedy choice always safe?',
      'What property ensures local optimal leads to global optimal?',
    ],
    HEAP: [
      'What property does the heap maintain?',
      'What is always true about the heap top?',
    ],
    PREFIX_SUM: [
      'What does prefix[i] represent?',
      'How does prefix[j] - prefix[i] give you range sum?',
    ],
    TRIE: [
      'What does each node in the trie represent?',
      'How do you know when a word ends?',
    ],
    UNION_FIND: [
      'What does the parent array represent?',
      'How do you ensure consistent root finding?',
    ],
    INTERVAL_MERGING: [
      'After sorting, what relationship exists between consecutive intervals?',
      'What defines when two intervals should merge?',
    ],
  };

  return questions[pattern] ?? [];
}

// ============ Main Validation Function ============

export interface StrategyValidationInput {
  readonly problem: Problem;
  readonly strategy: string;
}

/**
 * Validate a strategy design
 */
export function validateStrategy(
  input: StrategyValidationInput
): StrategyValidationResult {
  const { problem, strategy } = input;

  // Check minimum length
  if (strategy.trim().length < MIN_STRATEGY_LENGTH) {
    return {
      isCoherent: false,
      gaps: [{
        id: 'gap-length',
        description: 'Strategy is too brief. Please elaborate on your approach.',
        severity: 'CRITICAL',
        suggestion: null,
      }],
      contradictions: [],
      missingEdgeCases: [],
      overallScore: 0.2,
    };
  }

  // Detect gaps
  const gaps = detectGaps(strategy, problem.pattern);

  // Detect contradictions
  const contradictions = detectContradictions(strategy);

  // Detect missing edge cases
  const missingEdgeCases = detectMissingEdgeCases(strategy, problem.pattern);

  // Calculate score
  let score = 1.0;

  // Penalize for gaps
  for (const gap of gaps) {
    switch (gap.severity) {
      case 'CRITICAL': score -= 0.25; break;
      case 'MAJOR': score -= 0.15; break;
      case 'MINOR': score -= 0.05; break;
    }
  }

  // Penalize for contradictions
  score -= contradictions.length * 0.2;

  // Minor penalty for missing edge cases
  score -= missingEdgeCases.length * 0.05;

  score = Math.max(0, Math.min(1, score));

  return {
    isCoherent: score >= READINESS_THRESHOLD && contradictions.length === 0,
    gaps,
    contradictions,
    missingEdgeCases,
    overallScore: score,
  };
}

// ============ Strategy Design Processing ============

/**
 * Process a strategy design submission
 */
export function processStrategyDesign(
  input: StrategyValidationInput,
  currentData: StrategyDesignData
): {
  result: StrategyValidationResult;
  adversarialQuestions: readonly AdversarialQuestion[];
  updatedData: StrategyDesignData;
} {
  const result = validateStrategy(input);

  // Generate adversarial questions if not ready
  let adversarialQuestions: readonly AdversarialQuestion[] = [];
  if (!result.isCoherent) {
    adversarialQuestions = generateAdversarialQuestions(
      input.strategy,
      input.problem.pattern,
      input.problem
    );
  }

  const updatedData: StrategyDesignData = {
    strategy: input.strategy,
    validation: result,
    adversarialQuestions: [
      ...currentData.adversarialQuestions,
      ...adversarialQuestions,
    ],
    isReadyToCode: result.isCoherent,
  };

  return { result, adversarialQuestions, updatedData };
}

/**
 * Keywords that indicate engagement with the question
 */
const ENGAGEMENT_KEYWORDS = [
  'because', 'since', 'therefore', 'so', 'means', 'would', 'handle',
  'check', 'if', 'when', 'then', 'ensure', 'return', 'edge', 'case',
  'empty', 'null', 'boundary', 'invalid', 'valid', 'loop', 'iterate',
];

/**
 * Minimum answer length for adequate response
 */
const MIN_ADEQUATE_ANSWER_LENGTH = 20;

/**
 * Validate if an adversarial answer shows engagement
 */
export function validateAdversarialAnswer(answer: string): boolean {
  const trimmed = answer.trim();

  // Check minimum length
  if (trimmed.length < MIN_ADEQUATE_ANSWER_LENGTH) {
    return false;
  }

  // Check for engagement keywords
  const normalized = trimmed.toLowerCase();
  const hasEngagement = ENGAGEMENT_KEYWORDS.some(keyword =>
    normalized.includes(keyword)
  );

  // Require at least one engagement keyword for longer answers
  // Or accept very detailed answers (>100 chars) even without keywords
  return hasEngagement || trimmed.length >= 100;
}

/**
 * Process an answer to an adversarial question
 */
export function processAdversarialAnswer(
  questionId: string,
  answer: string,
  currentData: StrategyDesignData
): StrategyDesignData {
  const updatedQuestions = currentData.adversarialQuestions.map(q =>
    q.id === questionId
      ? { ...q, userAnswer: answer, isResolved: validateAdversarialAnswer(answer) }
      : q
  );

  // Check if all questions are resolved
  const allResolved = updatedQuestions.every(q => q.isResolved);

  return {
    ...currentData,
    adversarialQuestions: updatedQuestions,
    isReadyToCode: currentData.isReadyToCode || allResolved,
  };
}

// ============ Coach Response Generation ============

/**
 * Generate a coach response for strategy design
 */
export function generateStrategyResponse(
  result: StrategyValidationResult,
  adversarialQuestions: readonly AdversarialQuestion[]
): CoachResponse {
  if (result.isCoherent) {
    return {
      type: 'CONGRATULATIONS',
      content: 'Your strategy is coherent and addresses the key aspects. Ready to code!',
      questions: [],
      helpLevel: null,
      nextAction: 'ADVANCE',
      metadata: {
        stage: 'STRATEGY_DESIGN',
        attemptCount: 1,
        helpUsed: 0,
        timeElapsed: 0,
      },
    };
  }

  // Build feedback content
  const feedbackParts: string[] = [];

  // Add contradiction feedback (with explicit guard)
  const firstContradiction = result.contradictions[0];
  if (firstContradiction !== undefined) {
    feedbackParts.push(`I noticed a potential contradiction: ${firstContradiction.explanation}`);
  }

  // Add critical gap feedback (with explicit guard)
  if (result.gaps.length > 0) {
    const criticalGaps = result.gaps.filter(g => g.severity === 'CRITICAL');
    const firstCriticalGap = criticalGaps[0];
    if (firstCriticalGap !== undefined) {
      feedbackParts.push(firstCriticalGap.description);
    }
  }

  if (feedbackParts.length === 0) {
    feedbackParts.push('Let us strengthen your strategy.');
  }

  // Collect questions
  const questions = adversarialQuestions.map(q => q.question);

  return {
    type: 'QUESTION',
    content: feedbackParts.join(' '),
    questions,
    helpLevel: null,
    nextAction: 'CONTINUE',
    metadata: {
      stage: 'STRATEGY_DESIGN',
      attemptCount: 1,
      helpUsed: 0,
      timeElapsed: 0,
    },
  };
}

// ============ Initial Data Factory ============

/**
 * Create initial strategy design data
 */
export function createInitialStrategyData(): StrategyDesignData {
  return {
    strategy: null,
    validation: null,
    adversarialQuestions: [],
    isReadyToCode: false,
  };
}
