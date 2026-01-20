/**
 * Coding Silent Interviewer Module
 *
 * Non-directive coding guidance:
 * - Never provide full code or complete functions
 * - Point out invariant violations
 * - Ask what variables represent, what conditions guarantee correctness
 * - Warn about off-by-one or state drift
 */

import type { PatternId } from '../entities/pattern.js';
import type { Problem } from '../entities/problem.js';
import type {
  CodingCoachData,
  CodingObservation,
  CodingObservationType,
  CodingQuestion,
  CodingQuestionCategory,
  CodingWarning,
  CodingWarningType,
  CoachResponse,
} from './types.js';

// ============ Constants ============

/**
 * Maximum observations to report at once
 */
export const MAX_OBSERVATIONS = 3;

/**
 * Maximum questions to ask at once
 */
export const MAX_QUESTIONS = 2;

/**
 * Maximum warnings to show at once
 */
export const MAX_WARNINGS = 2;

/**
 * Maximum code length to analyze (ReDoS protection)
 * Longer code should be analyzed in chunks or rejected
 */
export const MAX_CODE_LENGTH = 10000;

// ============ Code Analysis Patterns ============

/**
 * Patterns that indicate potential issues
 */
interface CodePattern {
  readonly regex: RegExp;
  readonly type: CodingObservationType | CodingWarningType;
  readonly message: string;
  readonly isWarning: boolean;
}

/**
 * Language-agnostic code patterns
 */
const COMMON_CODE_PATTERNS: readonly CodePattern[] = [
  // Off-by-one risks
  {
    regex: /\[\s*\w+\s*-\s*1\s*\]/,
    type: 'OFF_BY_ONE',
    message: 'Array access with index-1. Verify this handles the first element correctly.',
    isWarning: true,
  },
  {
    regex: /\[\s*\w+\s*\+\s*1\s*\]/,
    type: 'OFF_BY_ONE',
    message: 'Array access with index+1. Ensure this does not exceed array bounds.',
    isWarning: true,
  },
  {
    regex: /<\s*\w+\.length\s*-\s*1/,
    type: 'OFF_BY_ONE_RISK',
    message: 'Loop excludes last element. Is this intentional?',
    isWarning: true,
  },

  // Index bounds
  {
    regex: /for\s*\([^;]*;\s*\w+\s*<=\s*\w+\.length/,
    type: 'INDEX_BOUNDS',
    message: 'Using <= with length may cause index out of bounds.',
    isWarning: true,
  },

  // State mutation
  {
    regex: /\.\s*push\s*\([^)]+\)/,
    type: 'STATE_MUTATION',
    message: 'Array mutation detected. Track what state this modifies.',
    isWarning: false,
  },
  {
    regex: /\.\s*pop\s*\(\s*\)/,
    type: 'STATE_MUTATION',
    message: 'Array pop detected. Is this paired with a corresponding push?',
    isWarning: false,
  },

  // Infinite loop risks
  {
    regex: /while\s*\(\s*true\s*\)/,
    type: 'INFINITE_LOOP_RISK',
    message: 'Infinite loop condition. Verify there is a clear exit path.',
    isWarning: true,
  },
  {
    regex: /while\s*\([^{]*\)\s*\{[^}]*\}/,
    type: 'INFINITE_LOOP_RISK',
    message: 'Verify loop variable is updated to ensure termination.',
    isWarning: false,
  },

  // Missing return
  {
    regex: /function\s+\w+\s*\([^)]*\)\s*\{[^}]*\}/,
    type: 'MISSING_RETURN',
    message: 'Function may be missing a return statement.',
    isWarning: false,
  },
];

/**
 * Pattern-specific code issues
 */
const PATTERN_CODE_PATTERNS: Readonly<Record<PatternId, readonly CodePattern[]>> = {
  SLIDING_WINDOW: [
    {
      regex: /for\s*\([^;]*;\s*\w+\s*<[^;]*;\s*\w+\+\+\s*\)\s*\{\s*for/,
      type: 'INVARIANT_VIOLATION',
      message: 'Nested for-loops detected. Sliding window should be O(n) with a while-loop for shrinking.',
      isWarning: false,
    },
    {
      regex: /if\s*\([^)]*>\s*\w+\s*\)\s*\{[^}]*left/,
      type: 'INVARIANT_VIOLATION',
      message: 'Using if instead of while for window shrinking may miss multiple shrink steps.',
      isWarning: false,
    },
  ],
  TWO_POINTERS: [
    {
      regex: /left\s*=\s*0.*right\s*=\s*0/,
      type: 'STATE_DRIFT',
      message: 'Both pointers starting at same position. For many problems, right should start at end.',
      isWarning: false,
    },
  ],
  BINARY_SEARCH: [
    {
      regex: /\(\s*left\s*\+\s*right\s*\)\s*\/\s*2/,
      type: 'OFF_BY_ONE_RISK',
      message: 'Consider using left + (right - left) / 2 to avoid potential overflow.',
      isWarning: true,
    },
    {
      regex: /mid\s*=\s*\w+\s*\/\s*2/,
      type: 'INVARIANT_VIOLATION',
      message: 'Mid calculation should use both left and right bounds.',
      isWarning: false,
    },
  ],
  DFS: [
    {
      regex: /dfs\s*\([^)]*\)\s*\{[^}]*dfs\s*\(/,
      type: 'MISSING_CHECK',
      message: 'Recursive DFS call found. Verify base case and visited check are present.',
      isWarning: false,
    },
  ],
  BFS: [
    {
      regex: /queue\s*\.\s*push\s*\([^)]*\)[^}]*visited/,
      type: 'STATE_DRIFT',
      message: 'Mark nodes as visited before adding to queue to avoid duplicates.',
      isWarning: false,
    },
  ],
  DYNAMIC_PROGRAMMING: [
    {
      regex: /dp\s*\[\s*0\s*\]\s*=[^;]*$/m,
      type: 'MISSING_CHECK',
      message: 'Base case initialization found. Verify all necessary base cases are covered.',
      isWarning: false,
    },
  ],
  BACKTRACKING: [
    {
      regex: /push\s*\([^)]*\)[^}]*(?!pop)/,
      type: 'INVARIANT_VIOLATION',
      message: 'Push without corresponding pop may indicate missing backtrack step.',
      isWarning: false,
    },
  ],
  GREEDY: [],
  HEAP: [
    {
      regex: /\.push\s*\([^)]*\)[^}]*\.pop/,
      type: 'COMPLEXITY_CONCERN',
      message: 'Multiple heap operations. Consider if heap size needs limiting.',
      isWarning: false,
    },
  ],
  PREFIX_SUM: [
    {
      regex: /prefix\s*\[\s*\w+\s*\]\s*-\s*prefix\s*\[\s*\w+\s*\]/,
      type: 'OFF_BY_ONE_RISK',
      message: 'Range sum calculation. Verify index bounds (usually prefix[j+1] - prefix[i]).',
      isWarning: true,
    },
  ],
  TRIE: [],
  UNION_FIND: [
    {
      regex: /parent\s*\[\s*\w+\s*\]\s*=\s*\w+/,
      type: 'MISSING_CHECK',
      message: 'Direct parent assignment. Should this go through find() for path compression?',
      isWarning: false,
    },
  ],
  INTERVAL_MERGING: [
    {
      regex: /sort\s*\(/,
      type: 'MISSING_CHECK',
      message: 'Sorting detected. Verify sort key is by interval start time.',
      isWarning: false,
    },
  ],
};

// ============ Variable Analysis ============

/**
 * Extract variable names from code
 */
export function extractVariables(code: string): readonly string[] {
  const variablePatterns = [
    /(?:let|const|var)\s+(\w+)/g,
    /(?:for\s*\((?:let|const|var)?\s*)(\w+)/g,
    /(\w+)\s*=/g,
    /function\s+\w+\s*\(([^)]*)\)/g,
  ];

  const variables = new Set<string>();

  for (const pattern of variablePatterns) {
    let match;
    while ((match = pattern.exec(code)) !== null) {
      const captured = match[1];
      if (captured !== undefined) {
        // Handle function parameters
        if (pattern.toString().includes('function')) {
          const params = captured.split(',')
            .map(p => p.trim().split(/\s+/)[0])
            .filter((p): p is string => p !== undefined && p !== '');
          params.forEach(p => variables.add(p));
        } else {
          variables.add(captured);
        }
      }
    }
  }

  // Filter out common keywords and short names
  const keywords = new Set(['if', 'else', 'for', 'while', 'return', 'true', 'false', 'null', 'undefined']);
  return Array.from(variables).filter(v =>
    !keywords.has(v) &&
    v.length > 1 &&
    !/^[a-z]$/.test(v)  // Single letters okay for loop counters
  );
}

/**
 * Identify unclear variable names
 */
export function identifyUnclearVariables(variables: readonly string[]): readonly string[] {
  const unclear: string[] = [];

  for (const v of variables) {
    // Very short or cryptic names
    if (v.length <= 2 && !/^[ij]$/.test(v)) {
      unclear.push(v);
    }
    // Single letter (except common loop vars)
    else if (/^[a-z]$/.test(v) && !/^[ijknm]$/.test(v)) {
      unclear.push(v);
    }
    // Numbered variables like x1, x2
    else if (/^\w+\d$/.test(v)) {
      unclear.push(v);
    }
  }

  return unclear;
}

// ============ Main Analysis Function ============

export interface CodeAnalysisInput {
  readonly problem: Problem;
  readonly code: string;
  readonly language: string;
}

export interface CodeAnalysisResult {
  readonly observations: readonly CodingObservation[];
  readonly questions: readonly CodingQuestion[];
  readonly warnings: readonly CodingWarning[];
}

/**
 * Analyze code and generate coaching feedback
 *
 * @throws Error if code exceeds MAX_CODE_LENGTH (ReDoS protection)
 */
export function analyzeCode(input: CodeAnalysisInput): CodeAnalysisResult {
  const { problem, code, language } = input;

  // CRITICAL-3: ReDoS protection - reject overly long code
  if (code.length > MAX_CODE_LENGTH) {
    throw new Error(
      `Code exceeds maximum length of ${MAX_CODE_LENGTH} characters. ` +
      `Please analyze in smaller chunks.`
    );
  }

  const observations: CodingObservation[] = [];
  const questions: CodingQuestion[] = [];
  const warnings: CodingWarning[] = [];

  // 1. Check common patterns
  for (const pattern of COMMON_CODE_PATTERNS) {
    const match = pattern.regex.exec(code);
    if (match) {
      const lineNumber = code.substring(0, match.index).split('\n').length;

      if (pattern.isWarning) {
        warnings.push({
          id: `warning-${warnings.length}`,
          type: pattern.type as CodingWarningType,
          description: pattern.message,
          lineNumber,
          timestamp: new Date(),
        });
      } else {
        observations.push({
          id: `observation-${observations.length}`,
          type: pattern.type as CodingObservationType,
          description: pattern.message,
          lineNumber,
          codeExcerpt: match[0],
          timestamp: new Date(),
        });
      }
    }
  }

  // 2. Check pattern-specific issues
  const patternPatterns = PATTERN_CODE_PATTERNS[problem.pattern] ?? [];
  for (const pattern of patternPatterns) {
    const match = pattern.regex.exec(code);
    if (match) {
      const lineNumber = code.substring(0, match.index).split('\n').length;

      if (pattern.isWarning) {
        warnings.push({
          id: `warning-${warnings.length}`,
          type: pattern.type as CodingWarningType,
          description: pattern.message,
          lineNumber,
          timestamp: new Date(),
        });
      } else {
        observations.push({
          id: `observation-${observations.length}`,
          type: pattern.type as CodingObservationType,
          description: pattern.message,
          lineNumber,
          codeExcerpt: match[0],
          timestamp: new Date(),
        });
      }
    }
  }

  // 3. Generate questions about unclear variables
  const variables = extractVariables(code);
  const unclearVars = identifyUnclearVariables(variables);

  for (const v of unclearVars.slice(0, 2)) {
    questions.push({
      id: `question-${questions.length}`,
      question: `What does the variable "${v}" represent?`,
      category: 'VARIABLE_PURPOSE',
      targetVariable: v,
      userAnswer: null,
      timestamp: new Date(),
    });
  }

  // 4. Add pattern-specific questions
  const patternQuestions = generatePatternQuestions(problem.pattern, code, variables);
  questions.push(...patternQuestions);

  // Limit results
  return {
    observations: observations.slice(0, MAX_OBSERVATIONS),
    questions: questions.slice(0, MAX_QUESTIONS),
    warnings: warnings.slice(0, MAX_WARNINGS),
  };
}

/**
 * Generate pattern-specific questions
 */
function generatePatternQuestions(
  pattern: PatternId,
  code: string,
  variables: readonly string[]
): CodingQuestion[] {
  const questions: CodingQuestion[] = [];

  const patternQuestionTemplates: Record<PatternId, readonly { question: string; category: CodingQuestionCategory; varHint?: RegExp }[]> = {
    SLIDING_WINDOW: [
      { question: 'What is the loop invariant for your sliding window?', category: 'LOOP_INVARIANT' },
      { question: 'What condition triggers window shrinking?', category: 'CONDITION_GUARANTEE', varHint: /left|start/i },
    ],
    TWO_POINTERS: [
      { question: 'What relationship holds between the two pointers?', category: 'LOOP_INVARIANT' },
      { question: 'When does the algorithm terminate?', category: 'TERMINATION' },
    ],
    BINARY_SEARCH: [
      { question: 'What is true about the search range after each iteration?', category: 'LOOP_INVARIANT' },
      { question: 'How do you handle the boundary when target equals mid?', category: 'BOUNDARY' },
    ],
    DFS: [
      { question: 'What is your base case?', category: 'TERMINATION' },
      { question: 'How do you ensure each node is visited only once?', category: 'CONDITION_GUARANTEE' },
    ],
    BFS: [
      { question: 'What does being in the queue guarantee about a node?', category: 'LOOP_INVARIANT' },
      { question: 'How do you handle already-visited nodes?', category: 'CONDITION_GUARANTEE' },
    ],
    DYNAMIC_PROGRAMMING: [
      { question: 'What state does dp[i] represent?', category: 'VARIABLE_PURPOSE', varHint: /dp|memo|cache/i },
      { question: 'What are your base cases?', category: 'BOUNDARY' },
    ],
    BACKTRACKING: [
      { question: 'What marks a valid solution vs partial solution?', category: 'CONDITION_GUARANTEE' },
      { question: 'How do you ensure the backtrack step undoes all changes?', category: 'LOOP_INVARIANT' },
    ],
    GREEDY: [
      { question: 'Why is the greedy choice guaranteed to be part of optimal solution?', category: 'CONDITION_GUARANTEE' },
    ],
    HEAP: [
      { question: 'What property does the heap maintain?', category: 'LOOP_INVARIANT' },
    ],
    PREFIX_SUM: [
      { question: 'How does prefix[i] relate to the original array?', category: 'VARIABLE_PURPOSE', varHint: /prefix|sum/i },
    ],
    TRIE: [
      { question: 'What does each node in your trie represent?', category: 'VARIABLE_PURPOSE' },
    ],
    UNION_FIND: [
      { question: 'What does find(x) guarantee about the return value?', category: 'CONDITION_GUARANTEE' },
    ],
    INTERVAL_MERGING: [
      { question: 'After processing interval i, what is guaranteed about result?', category: 'LOOP_INVARIANT' },
    ],
  };

  const templates = patternQuestionTemplates[pattern] ?? [];
  for (const template of templates.slice(0, 1)) {
    // Find relevant variable if hint provided
    let targetVariable: string | null = null;
    if (template.varHint) {
      targetVariable = variables.find(v => template.varHint!.test(v)) ?? null;
    }

    questions.push({
      id: `pattern-question-${questions.length}`,
      question: template.question,
      category: template.category,
      targetVariable,
      userAnswer: null,
      timestamp: new Date(),
    });
  }

  return questions;
}

// ============ Coach Response Generation ============

/**
 * Generate a coach response for coding analysis
 */
export function generateCodingResponse(
  result: CodeAnalysisResult,
  attemptCount: number
): CoachResponse {
  // If no issues found
  if (
    result.observations.length === 0 &&
    result.warnings.length === 0 &&
    result.questions.length === 0
  ) {
    return {
      type: 'FEEDBACK',
      content: 'Code looks structurally sound. Run tests to verify correctness.',
      questions: [],
      helpLevel: null,
      nextAction: 'CONTINUE',
      metadata: {
        stage: 'CODING',
        attemptCount,
        helpUsed: 0,
        timeElapsed: 0,
      },
    };
  }

  // Build feedback content
  const feedbackParts: string[] = [];

  // Add warning if present (with explicit guard)
  const firstWarning = result.warnings[0];
  if (firstWarning !== undefined) {
    feedbackParts.push(firstWarning.description);
  }

  // Add observation if present (with explicit guard)
  const firstObservation = result.observations[0];
  if (firstObservation !== undefined) {
    feedbackParts.push(firstObservation.description);
  }

  // Collect questions
  const questions = result.questions.map(q => q.question);

  const responseType = result.warnings.length > 0 ? 'WARNING' : 'QUESTION';
  const content = feedbackParts.length > 0
    ? feedbackParts.join(' ')
    : 'Consider the questions below.';

  return {
    type: responseType,
    content,
    questions,
    helpLevel: null,
    nextAction: 'CONTINUE',
    metadata: {
      stage: 'CODING',
      attemptCount,
      helpUsed: 0,
      timeElapsed: 0,
    },
  };
}

// ============ Initial Data Factory ============

/**
 * Create initial coding coach data
 */
export function createInitialCodingData(): CodingCoachData {
  return {
    observations: [],
    questions: [],
    warnings: [],
  };
}

/**
 * Update coding data with analysis results
 */
export function updateCodingData(
  currentData: CodingCoachData,
  result: CodeAnalysisResult
): CodingCoachData {
  return {
    observations: [...currentData.observations, ...result.observations],
    questions: [...currentData.questions, ...result.questions],
    warnings: [...currentData.warnings, ...result.warnings],
  };
}
