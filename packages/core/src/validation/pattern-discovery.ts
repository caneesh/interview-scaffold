/**
 * Pattern Discovery Engine
 * Socratic guided flow to help users discover the correct pattern
 *
 * Two modes:
 * - HEURISTIC: Keyword-based decision tree using PATTERN_INVARIANT_KEYWORDS
 * - SOCRATIC: LLM-guided questioning (requires LLM adapter)
 */

import type { PatternId } from '../entities/pattern.js';
import type { Problem } from '../entities/problem.js';
import type { PatternDiscoveryMode, PatternDiscoveryQA } from '../entities/step.js';
import { PATTERN_INVARIANT_KEYWORDS, RELATED_PATTERNS } from './thinking-gate.js';

// ============ Types ============

export interface PatternDiscoveryContext {
  readonly problem: Problem;
  readonly qaLog: readonly PatternDiscoveryQA[];
}

export interface PatternDiscoveryQuestion {
  readonly questionId: string;
  readonly question: string;
  /** Patterns this question helps distinguish between */
  readonly targetPatterns: readonly PatternId[];
}

export interface PatternDiscoveryResult {
  /** Next question if discovery is ongoing */
  readonly nextQuestion?: PatternDiscoveryQuestion;
  /** Discovered pattern if we've narrowed it down */
  readonly discoveredPattern?: PatternId;
  /** Whether discovery is complete */
  readonly completed: boolean;
  /** Confidence in the discovered pattern (0-1) */
  readonly confidence?: number;
}

// ============ Heuristic Question Bank ============

/**
 * Decision tree questions for heuristic pattern discovery
 * Each question helps narrow down the pattern space
 */
interface HeuristicQuestion {
  readonly id: string;
  readonly question: string;
  /** Keywords in user's answer that suggest certain patterns */
  readonly patternSignals: Readonly<Record<string, readonly PatternId[]>>;
  /** Patterns to exclude based on certain answers */
  readonly exclusionSignals: Readonly<Record<string, readonly PatternId[]>>;
  /** Follow-up question IDs based on remaining pattern candidates */
  readonly followUps: Readonly<Record<string, string>>;
}

const HEURISTIC_QUESTIONS: readonly HeuristicQuestion[] = [
  {
    id: 'q1_data_structure',
    question: 'What is the main data structure in the input? (array, string, tree, graph, intervals)',
    patternSignals: {
      'array': ['SLIDING_WINDOW', 'TWO_POINTERS', 'PREFIX_SUM', 'BINARY_SEARCH', 'DYNAMIC_PROGRAMMING', 'HEAP'],
      'string': ['SLIDING_WINDOW', 'TWO_POINTERS', 'TRIE', 'DYNAMIC_PROGRAMMING'],
      'tree': ['DFS', 'BFS', 'DYNAMIC_PROGRAMMING'],
      'graph': ['DFS', 'BFS', 'UNION_FIND'],
      'interval': ['INTERVAL_MERGING', 'GREEDY', 'HEAP'],
      'linked list': ['TWO_POINTERS'],
      'matrix': ['DFS', 'BFS', 'DYNAMIC_PROGRAMMING'],
    },
    exclusionSignals: {},
    followUps: {
      'array': 'q2_array_operation',
      'string': 'q2_string_operation',
      'tree': 'q2_tree_operation',
      'graph': 'q2_graph_operation',
      'interval': 'q2_interval_operation',
      'default': 'q2_general_operation',
    },
  },
  {
    id: 'q2_array_operation',
    question: 'What operation do you need to perform? (find contiguous subarray, find pair, range query, search, optimize)',
    patternSignals: {
      'contiguous': ['SLIDING_WINDOW', 'PREFIX_SUM'],
      'subarray': ['SLIDING_WINDOW', 'PREFIX_SUM', 'DYNAMIC_PROGRAMMING'],
      'substring': ['SLIDING_WINDOW', 'DYNAMIC_PROGRAMMING'],
      'pair': ['TWO_POINTERS', 'BINARY_SEARCH'],
      'range': ['PREFIX_SUM'],
      'sum': ['PREFIX_SUM', 'SLIDING_WINDOW', 'TWO_POINTERS'],
      'search': ['BINARY_SEARCH'],
      'sorted': ['BINARY_SEARCH', 'TWO_POINTERS'],
      'optimize': ['DYNAMIC_PROGRAMMING', 'GREEDY'],
      'k largest': ['HEAP'],
      'k smallest': ['HEAP'],
      'top k': ['HEAP'],
      'median': ['HEAP'],
    },
    exclusionSignals: {},
    followUps: {
      'contiguous': 'q3_window_type',
      'subarray': 'q3_window_type',
      'pair': 'q3_pair_type',
      'default': 'q3_constraint_type',
    },
  },
  {
    id: 'q2_string_operation',
    question: 'What are you looking for in the string? (substring with property, prefix matching, transformation, subsequence)',
    patternSignals: {
      'substring': ['SLIDING_WINDOW', 'TWO_POINTERS'],
      'prefix': ['TRIE'],
      'autocomplete': ['TRIE'],
      'dictionary': ['TRIE'],
      'transform': ['DYNAMIC_PROGRAMMING'],
      'edit': ['DYNAMIC_PROGRAMMING'],
      'subsequence': ['DYNAMIC_PROGRAMMING', 'TWO_POINTERS'],
      'longest': ['DYNAMIC_PROGRAMMING', 'SLIDING_WINDOW'],
      'palindrome': ['DYNAMIC_PROGRAMMING', 'TWO_POINTERS'],
    },
    exclusionSignals: {},
    followUps: {
      'default': 'q3_constraint_type',
    },
  },
  {
    id: 'q2_tree_operation',
    question: 'How do you need to traverse or process the tree? (level by level, path from root, all paths, find value)',
    patternSignals: {
      'level': ['BFS'],
      'layer': ['BFS'],
      'breadth': ['BFS'],
      'shortest': ['BFS'],
      'path': ['DFS', 'BACKTRACKING'],
      'depth': ['DFS'],
      'recursive': ['DFS'],
      'all paths': ['DFS', 'BACKTRACKING'],
      'backtrack': ['BACKTRACKING'],
    },
    exclusionSignals: {},
    followUps: {
      'default': 'q3_traversal_goal',
    },
  },
  {
    id: 'q2_graph_operation',
    question: 'What do you need to find in the graph? (shortest path, connected components, cycles, all paths)',
    patternSignals: {
      'shortest': ['BFS'],
      'distance': ['BFS'],
      'connected': ['UNION_FIND', 'DFS', 'BFS'],
      'component': ['UNION_FIND', 'DFS'],
      'cycle': ['DFS', 'UNION_FIND'],
      'all paths': ['DFS', 'BACKTRACKING'],
      'reachable': ['DFS', 'BFS'],
    },
    exclusionSignals: {},
    followUps: {
      'connected': 'q3_connectivity',
      'default': 'q3_traversal_goal',
    },
  },
  {
    id: 'q2_interval_operation',
    question: 'What do you need to do with the intervals? (merge overlapping, find conflicts, schedule, count)',
    patternSignals: {
      'merge': ['INTERVAL_MERGING'],
      'overlap': ['INTERVAL_MERGING', 'GREEDY'],
      'conflict': ['INTERVAL_MERGING', 'GREEDY'],
      'schedule': ['GREEDY', 'HEAP'],
      'meeting': ['INTERVAL_MERGING', 'HEAP'],
      'room': ['HEAP'],
    },
    exclusionSignals: {},
    followUps: {
      'default': 'q3_interval_goal',
    },
  },
  {
    id: 'q2_general_operation',
    question: 'What is the goal? (find optimal solution, generate all possibilities, make choices, find pattern)',
    patternSignals: {
      'optimal': ['DYNAMIC_PROGRAMMING', 'GREEDY'],
      'maximum': ['DYNAMIC_PROGRAMMING', 'GREEDY', 'SLIDING_WINDOW'],
      'minimum': ['DYNAMIC_PROGRAMMING', 'GREEDY', 'SLIDING_WINDOW'],
      'all possibilities': ['BACKTRACKING', 'DFS'],
      'generate': ['BACKTRACKING'],
      'permutation': ['BACKTRACKING'],
      'combination': ['BACKTRACKING'],
      'subset': ['BACKTRACKING', 'DYNAMIC_PROGRAMMING'],
    },
    exclusionSignals: {},
    followUps: {
      'default': 'q3_constraint_type',
    },
  },
  {
    id: 'q3_window_type',
    question: 'Does the subarray/substring need to satisfy a constraint that can be checked incrementally? (at most k distinct, sum equals target, contains all chars)',
    patternSignals: {
      'distinct': ['SLIDING_WINDOW'],
      'at most': ['SLIDING_WINDOW'],
      'at least': ['SLIDING_WINDOW'],
      'contains': ['SLIDING_WINDOW'],
      'sum equals': ['SLIDING_WINDOW', 'PREFIX_SUM'],
      'sum less': ['SLIDING_WINDOW'],
      'sum greater': ['SLIDING_WINDOW'],
      'fixed size': ['SLIDING_WINDOW', 'PREFIX_SUM'],
      'variable size': ['SLIDING_WINDOW'],
    },
    exclusionSignals: {},
    followUps: {},
  },
  {
    id: 'q3_pair_type',
    question: 'Is the array sorted, or can you sort it? Are you looking for a specific sum or condition between pairs?',
    patternSignals: {
      'sorted': ['TWO_POINTERS', 'BINARY_SEARCH'],
      'can sort': ['TWO_POINTERS'],
      'sum': ['TWO_POINTERS'],
      'target': ['TWO_POINTERS', 'BINARY_SEARCH'],
      'opposite ends': ['TWO_POINTERS'],
      'converge': ['TWO_POINTERS'],
    },
    exclusionSignals: {},
    followUps: {},
  },
  {
    id: 'q3_constraint_type',
    question: 'Can the problem be broken into smaller overlapping subproblems? Or does making the locally best choice always lead to the global optimum?',
    patternSignals: {
      'subproblem': ['DYNAMIC_PROGRAMMING'],
      'overlapping': ['DYNAMIC_PROGRAMMING'],
      'memoize': ['DYNAMIC_PROGRAMMING'],
      'cache': ['DYNAMIC_PROGRAMMING'],
      'recurrence': ['DYNAMIC_PROGRAMMING'],
      'local best': ['GREEDY'],
      'greedy': ['GREEDY'],
      'always optimal': ['GREEDY'],
      'sort first': ['GREEDY'],
    },
    exclusionSignals: {},
    followUps: {},
  },
  {
    id: 'q3_traversal_goal',
    question: 'Do you need to find the shortest path/minimum steps, or explore all possibilities/find any valid path?',
    patternSignals: {
      'shortest': ['BFS'],
      'minimum steps': ['BFS'],
      'fewest': ['BFS'],
      'level order': ['BFS'],
      'any path': ['DFS'],
      'all paths': ['DFS', 'BACKTRACKING'],
      'explore all': ['DFS', 'BACKTRACKING'],
      'valid solution': ['BACKTRACKING'],
    },
    exclusionSignals: {},
    followUps: {},
  },
  {
    id: 'q3_connectivity',
    question: 'Do you need to efficiently check if elements are in the same group, or dynamically merge groups?',
    patternSignals: {
      'same group': ['UNION_FIND'],
      'merge': ['UNION_FIND'],
      'union': ['UNION_FIND'],
      'disjoint': ['UNION_FIND'],
      'dynamic': ['UNION_FIND'],
      'static': ['DFS', 'BFS'],
    },
    exclusionSignals: {},
    followUps: {},
  },
  {
    id: 'q3_interval_goal',
    question: 'Do you need to count simultaneous events, or combine/simplify the intervals?',
    patternSignals: {
      'simultaneous': ['HEAP'],
      'concurrent': ['HEAP'],
      'at same time': ['HEAP'],
      'combine': ['INTERVAL_MERGING'],
      'simplify': ['INTERVAL_MERGING'],
      'non-overlapping': ['GREEDY'],
    },
    exclusionSignals: {},
    followUps: {},
  },
];

// Question index for quick lookup
const QUESTION_MAP = new Map(HEURISTIC_QUESTIONS.map(q => [q.id, q]));

// ============ Heuristic Engine ============

/**
 * Analyzes user's answer and extracts pattern signals
 */
function analyzeAnswer(
  answer: string,
  question: HeuristicQuestion
): { matched: PatternId[]; excluded: PatternId[] } {
  const normalized = answer.toLowerCase();
  const matched = new Set<PatternId>();
  const excluded = new Set<PatternId>();

  // Check pattern signals
  for (const [keyword, patterns] of Object.entries(question.patternSignals)) {
    if (normalized.includes(keyword.toLowerCase())) {
      patterns.forEach(p => matched.add(p));
    }
  }

  // Check exclusion signals
  for (const [keyword, patterns] of Object.entries(question.exclusionSignals)) {
    if (normalized.includes(keyword.toLowerCase())) {
      patterns.forEach(p => excluded.add(p));
    }
  }

  return {
    matched: Array.from(matched),
    excluded: Array.from(excluded),
  };
}

/**
 * Determines the next question based on current candidates and answer
 */
function getNextQuestionId(
  question: HeuristicQuestion,
  answer: string
): string | null {
  const normalized = answer.toLowerCase();

  // Check for specific follow-up triggers
  for (const [trigger, nextId] of Object.entries(question.followUps)) {
    if (trigger === 'default') continue;
    if (normalized.includes(trigger.toLowerCase())) {
      return nextId;
    }
  }

  // Fall back to default
  return question.followUps['default'] ?? null;
}

/**
 * Scores pattern candidates based on Q&A history
 */
function scorePatternCandidates(
  qaLog: readonly PatternDiscoveryQA[],
  correctPattern: PatternId
): Map<PatternId, number> {
  const scores = new Map<PatternId, number>();

  // Initialize all patterns with base score
  const allPatterns: PatternId[] = [
    'SLIDING_WINDOW', 'TWO_POINTERS', 'PREFIX_SUM', 'BINARY_SEARCH',
    'BFS', 'DFS', 'DYNAMIC_PROGRAMMING', 'BACKTRACKING', 'GREEDY',
    'HEAP', 'TRIE', 'UNION_FIND', 'INTERVAL_MERGING',
  ];
  allPatterns.forEach(p => scores.set(p, 0));

  // Process each Q&A pair
  for (const qa of qaLog) {
    const question = QUESTION_MAP.get(qa.questionId);
    if (!question) continue;

    const { matched, excluded } = analyzeAnswer(qa.answer, question);

    // Boost matched patterns
    matched.forEach(p => {
      const current = scores.get(p) ?? 0;
      scores.set(p, current + 1);
    });

    // Penalize excluded patterns
    excluded.forEach(p => {
      const current = scores.get(p) ?? 0;
      scores.set(p, current - 2);
    });
  }

  // Boost correct pattern slightly if it's in related patterns of top candidates
  // This helps guide toward the right answer without giving it away
  const relatedToCorrect = RELATED_PATTERNS[correctPattern] ?? [];
  relatedToCorrect.forEach(p => {
    const current = scores.get(p) ?? 0;
    if (current > 0) {
      // User is on a related track, boost the correct pattern slightly
      const correctScore = scores.get(correctPattern) ?? 0;
      scores.set(correctPattern, correctScore + 0.5);
    }
  });

  return scores;
}

/**
 * Gets the top pattern candidates based on scores
 */
function getTopCandidates(
  scores: Map<PatternId, number>,
  limit: number = 3
): PatternId[] {
  return Array.from(scores.entries())
    .filter(([, score]) => score > 0)
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([pattern]) => pattern);
}

/**
 * Generates the next heuristic question
 */
export function generateHeuristicQuestion(
  context: PatternDiscoveryContext
): PatternDiscoveryResult {
  const { problem, qaLog } = context;
  const correctPattern = problem.pattern;

  // Score current candidates
  const scores = scorePatternCandidates(qaLog, correctPattern);
  const topCandidates = getTopCandidates(scores);

  // If we have high confidence in one pattern, complete discovery
  if (topCandidates.length > 0) {
    const topCandidate = topCandidates[0]!;
    const topScore = scores.get(topCandidate) ?? 0;
    const secondCandidate = topCandidates[1];
    const secondScore = secondCandidate ? (scores.get(secondCandidate) ?? 0) : 0;

    // Complete if clear winner (score >= 3 and significantly ahead)
    if (topScore >= 3 && topScore - secondScore >= 1.5) {
      // Guide to correct pattern if top candidate matches
      const discoveredPattern = topCandidate === correctPattern
        ? correctPattern
        : topCandidates.includes(correctPattern)
          ? correctPattern // Nudge to correct if it's in top candidates
          : topCandidate; // Otherwise use their best guess

      return {
        discoveredPattern,
        completed: true,
        confidence: Math.min(topScore / 5, 1),
      };
    }
  }

  // Determine next question
  let nextQuestionId: string | null = null;

  if (qaLog.length === 0) {
    // Start with first question
    nextQuestionId = 'q1_data_structure';
  } else {
    // Get follow-up from last question
    const lastQA = qaLog[qaLog.length - 1];
    if (lastQA) {
      const lastQuestion = QUESTION_MAP.get(lastQA.questionId);
      if (lastQuestion) {
        nextQuestionId = getNextQuestionId(lastQuestion, lastQA.answer);
      }
    }
  }

  // If no follow-up or we've asked many questions, try to conclude
  if (!nextQuestionId || qaLog.length >= 5) {
    // Force a conclusion
    const bestGuess = topCandidates.length > 0 ? topCandidates[0] : correctPattern;
    return {
      discoveredPattern: bestGuess,
      completed: true,
      confidence: topCandidates.length > 0 ? 0.6 : 0.3,
    };
  }

  const nextQuestion = QUESTION_MAP.get(nextQuestionId);
  if (!nextQuestion) {
    // Fallback to correct pattern
    return {
      discoveredPattern: correctPattern,
      completed: true,
      confidence: 0.5,
    };
  }

  return {
    nextQuestion: {
      questionId: nextQuestion.id,
      question: nextQuestion.question,
      targetPatterns: topCandidates.length > 0 ? topCandidates : [correctPattern],
    },
    completed: false,
  };
}

// ============ LLM Port Interface ============

export interface PatternDiscoveryLLMPort {
  /**
   * Check if LLM-based Socratic mode is available
   */
  isEnabled(): boolean;

  /**
   * Generate the next Socratic question based on context
   */
  generateQuestion(
    context: PatternDiscoveryContext
  ): Promise<PatternDiscoveryResult>;

  /**
   * Analyze user's answer and determine next step
   */
  analyzeAnswer(
    context: PatternDiscoveryContext,
    currentQuestion: string,
    answer: string
  ): Promise<PatternDiscoveryResult>;
}

/**
 * Creates a null LLM port (falls back to heuristic mode)
 */
export function createNullPatternDiscoveryLLM(): PatternDiscoveryLLMPort {
  return {
    isEnabled: () => false,
    generateQuestion: async (context) => generateHeuristicQuestion(context),
    analyzeAnswer: async (context) => generateHeuristicQuestion(context),
  };
}

// ============ Main Discovery Function ============

/**
 * Runs pattern discovery step
 * Uses Socratic (LLM) mode if available, falls back to heuristic
 */
export async function runPatternDiscovery(
  context: PatternDiscoveryContext,
  llmPort: PatternDiscoveryLLMPort,
  currentAnswer?: { questionId: string; answer: string }
): Promise<{ result: PatternDiscoveryResult; mode: PatternDiscoveryMode }> {
  // Determine mode
  const mode: PatternDiscoveryMode = llmPort.isEnabled() ? 'SOCRATIC' : 'HEURISTIC';

  // If we have a current answer, add it to context for processing
  let effectiveContext = context;
  if (currentAnswer) {
    const question = QUESTION_MAP.get(currentAnswer.questionId);
    const questionText = question?.question ?? 'Unknown question';

    effectiveContext = {
      ...context,
      qaLog: [
        ...context.qaLog,
        {
          questionId: currentAnswer.questionId,
          question: questionText,
          answer: currentAnswer.answer,
          timestamp: new Date(),
        },
      ],
    };
  }

  // Run discovery
  if (mode === 'SOCRATIC') {
    const result = await llmPort.generateQuestion(effectiveContext);
    return { result, mode };
  } else {
    const result = generateHeuristicQuestion(effectiveContext);
    return { result, mode };
  }
}

/**
 * Gets the initial question to start pattern discovery
 */
export function getInitialDiscoveryQuestion(): PatternDiscoveryQuestion {
  const firstQuestion = HEURISTIC_QUESTIONS[0]!;
  return {
    questionId: firstQuestion.id,
    question: firstQuestion.question,
    targetPatterns: [],
  };
}

// ============ Exports for Testing ============

export {
  HEURISTIC_QUESTIONS,
  analyzeAnswer as _analyzeAnswer,
  scorePatternCandidates as _scorePatternCandidates,
  getTopCandidates as _getTopCandidates,
};
