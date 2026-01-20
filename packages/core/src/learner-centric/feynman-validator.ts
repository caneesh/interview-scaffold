/**
 * Feynman Validator Module
 *
 * Evaluate conceptual clarity using the Feynman Technique:
 * - No jargon, no circular logic
 * - Understandable by a 12-year-old
 * - Max 5 sentences
 * - Ask ONE clarifying question if weak
 */

import type { Problem } from '../entities/problem.js';
import type { PatternId } from '../entities/pattern.js';
import type {
  FeynmanValidationData,
  FeynmanValidationResult,
  FeynmanIssue,
  FeynmanIssueType,
  FeynmanAttempt,
  CoachResponse,
} from './types.js';

// ============ Constants ============

/**
 * Maximum number of sentences allowed
 */
export const MAX_SENTENCES = 5;

/**
 * Minimum score to pass validation
 */
export const PASSING_SCORE = 0.7;

/**
 * Maximum attempts before accepting
 */
export const MAX_FEYNMAN_ATTEMPTS = 3;

// ============ Jargon Detection ============

/**
 * Technical jargon that should be explained simply
 */
const JARGON_TERMS: readonly string[] = [
  // Data structure jargon
  'hash table', 'hash map', 'linked list', 'binary tree', 'heap',
  'stack', 'queue', 'trie', 'graph', 'adjacency',
  // Algorithm jargon
  'recursion', 'recursive', 'memoization', 'memoize', 'dynamic programming',
  'backtracking', 'dfs', 'bfs', 'traversal', 'amortized',
  // Complexity jargon
  'big o', 'o(n)', 'o(1)', 'o(log n)', 'o(n^2)', 'logarithmic',
  'polynomial', 'exponential', 'asymptotic',
  // Implementation jargon
  'pointer', 'iterator', 'invariant', 'assertion', 'callback',
  'closure', 'lambda', 'mutex', 'semaphore', 'thread',
  // CS jargon
  'optimal substructure', 'overlapping subproblems', 'greedy choice',
  'state transition', 'recurrence relation', 'base case',
];

/**
 * Words that are acceptable even if technical
 */
const ACCEPTABLE_TERMS: readonly string[] = [
  'array', 'list', 'number', 'loop', 'count', 'sum',
  'index', 'position', 'step', 'check', 'compare',
];

/**
 * Detect jargon in an explanation
 */
export function detectJargon(text: string): readonly string[] {
  const normalized = text.toLowerCase();
  const foundJargon: string[] = [];

  for (const term of JARGON_TERMS) {
    if (normalized.includes(term.toLowerCase())) {
      // Check if it's not in acceptable terms
      if (!ACCEPTABLE_TERMS.some(acceptable =>
        term.toLowerCase().includes(acceptable.toLowerCase())
      )) {
        foundJargon.push(term);
      }
    }
  }

  return foundJargon;
}

// ============ Circular Logic Detection ============

/**
 * Phrases that indicate circular reasoning
 */
const CIRCULAR_PATTERNS: readonly RegExp[] = [
  /because\s+it\s+(is|works|does)/i,
  /it\s+(is|works)\s+because\s+it\s+(is|works)/i,
  /by\s+definition/i,
  /obviously|clearly|simply|just/i,
  /that's\s+how\s+it\s+(works|is)/i,
  /it's\s+the\s+same\s+thing/i,
];

/**
 * Phrases that indicate actual explanation
 */
const EXPLANATORY_PATTERNS: readonly RegExp[] = [
  /because\s+\w+\s+(will|can|must|needs?|has|have)/i,
  /so\s+that\s+\w+/i,
  /in\s+order\s+to/i,
  /this\s+(means|ensures|guarantees|allows)/i,
  /for\s+example/i,
  /imagine\s+\w+/i,
  /think\s+of\s+it\s+(like|as)/i,
];

/**
 * Detect circular logic in an explanation
 */
export function detectCircularLogic(text: string): boolean {
  // Check for circular patterns
  for (const pattern of CIRCULAR_PATTERNS) {
    if (pattern.test(text)) {
      // Check if there's also explanatory content
      const hasExplanation = EXPLANATORY_PATTERNS.some(ep => ep.test(text));
      if (!hasExplanation) {
        return true;
      }
    }
  }
  return false;
}

// ============ Complexity Assessment ============

/**
 * Complex sentence indicators
 */
const COMPLEXITY_INDICATORS: readonly RegExp[] = [
  /\b(wherein|whereby|thereof|therein|heretofore)\b/i,
  /\b(subsequently|consequently|furthermore|nevertheless)\b/i,
  /;\s*\w+.*;\s*\w+/,  // Multiple semicolons
  /,\s*\w+[^,]*,\s*\w+[^,]*,\s*\w+/,  // Many commas
];

/**
 * Simple explanation indicators
 */
const SIMPLICITY_INDICATORS: readonly RegExp[] = [
  /\b(like|imagine|think of|picture|pretend)\b/i,
  /\b(first|then|next|finally|after|before)\b/i,
  /\b(small|big|many|few|each|every)\b/i,
  /\bfor example\b/i,
];

/**
 * Assess if explanation is understandable by a 12-year-old
 */
export function assessComplexity(text: string): {
  isSimple: boolean;
  complexityScore: number;
  issues: string[];
} {
  const issues: string[] = [];
  let complexityScore = 0;

  // Check for complex indicators
  for (const pattern of COMPLEXITY_INDICATORS) {
    if (pattern.test(text)) {
      complexityScore += 0.2;
      issues.push('Contains complex sentence structure');
    }
  }

  // Check for simplicity indicators (reduce score)
  for (const pattern of SIMPLICITY_INDICATORS) {
    if (pattern.test(text)) {
      complexityScore -= 0.1;
    }
  }

  // Average sentence length
  const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
  const avgLength = sentences.reduce((sum, s) => sum + s.split(/\s+/).length, 0) / Math.max(sentences.length, 1);

  if (avgLength > 25) {
    complexityScore += 0.3;
    issues.push('Sentences are too long for easy understanding');
  }

  // Average word length
  const words = text.split(/\s+/);
  const avgWordLength = words.reduce((sum, w) => sum + w.length, 0) / Math.max(words.length, 1);

  if (avgWordLength > 7) {
    complexityScore += 0.2;
    issues.push('Uses many long words');
  }

  complexityScore = Math.max(0, Math.min(1, complexityScore));

  return {
    isSimple: complexityScore < 0.4,
    complexityScore,
    issues,
  };
}

// ============ Sentence Count ============

/**
 * Count sentences in text
 */
export function countSentences(text: string): number {
  // Split on sentence terminators
  const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
  return sentences.length;
}

// ============ Completeness Check ============

/**
 * Pattern-specific key concepts that should be mentioned
 */
const PATTERN_KEY_CONCEPTS: Readonly<Record<PatternId, readonly string[]>> = {
  SLIDING_WINDOW: ['window', 'move', 'expand', 'shrink', 'track'],
  TWO_POINTERS: ['pointer', 'start', 'end', 'move', 'compare'],
  PREFIX_SUM: ['sum', 'total', 'range', 'calculate', 'store'],
  BINARY_SEARCH: ['half', 'middle', 'compare', 'eliminate', 'search'],
  BFS: ['level', 'neighbor', 'visit', 'queue', 'shortest'],
  DFS: ['explore', 'deep', 'path', 'visit', 'return'],
  DYNAMIC_PROGRAMMING: ['remember', 'reuse', 'build', 'smaller', 'combine'],
  BACKTRACKING: ['try', 'undo', 'choice', 'valid', 'explore'],
  GREEDY: ['best', 'choice', 'each step', 'local', 'pick'],
  HEAP: ['top', 'largest', 'smallest', 'add', 'remove'],
  TRIE: ['prefix', 'character', 'word', 'tree', 'branch'],
  UNION_FIND: ['group', 'connect', 'same', 'merge', 'find'],
  INTERVAL_MERGING: ['overlap', 'combine', 'range', 'start', 'end'],
};

/**
 * Check if explanation covers key concepts
 */
export function checkCompleteness(
  text: string,
  pattern: PatternId
): { isComplete: boolean; missingConcepts: string[] } {
  const normalized = text.toLowerCase();
  const keyConcepts = PATTERN_KEY_CONCEPTS[pattern] ?? [];
  const missingConcepts: string[] = [];

  for (const concept of keyConcepts) {
    if (!normalized.includes(concept.toLowerCase())) {
      missingConcepts.push(concept);
    }
  }

  // Need at least 2 key concepts mentioned
  const mentioned = keyConcepts.length - missingConcepts.length;
  return {
    isComplete: mentioned >= 2,
    missingConcepts: missingConcepts.slice(0, 3), // Return top 3 missing
  };
}

// ============ Main Validation Function ============

export interface FeynmanValidationInput {
  readonly problem: Problem;
  readonly explanation: string;
}

/**
 * Validate a Feynman explanation
 */
export function validateFeynmanExplanation(
  input: FeynmanValidationInput
): FeynmanValidationResult {
  const { problem, explanation } = input;
  const issues: FeynmanIssue[] = [];
  let score = 1.0;

  // 1. Check sentence count
  const sentenceCount = countSentences(explanation);
  if (sentenceCount > MAX_SENTENCES) {
    issues.push({
      type: 'TOO_LONG',
      description: `Explanation has ${sentenceCount} sentences. Keep it to ${MAX_SENTENCES} or fewer.`,
      excerpt: null,
    });
    score -= 0.2;
  }

  // 2. Check for jargon
  const jargon = detectJargon(explanation);
  if (jargon.length > 0) {
    issues.push({
      type: 'JARGON',
      description: `Uses technical jargon that needs simpler explanation: ${jargon.slice(0, 3).join(', ')}`,
      excerpt: jargon[0] ?? null,
    });
    score -= 0.15 * Math.min(jargon.length, 3);
  }

  // 3. Check for circular logic
  if (detectCircularLogic(explanation)) {
    issues.push({
      type: 'CIRCULAR',
      description: 'Explanation contains circular reasoning. Explain the "why" more directly.',
      excerpt: null,
    });
    score -= 0.2;
  }

  // 4. Check complexity
  const complexity = assessComplexity(explanation);
  if (!complexity.isSimple) {
    issues.push({
      type: 'TOO_COMPLEX',
      description: 'Explanation is too complex. Use simpler words and shorter sentences.',
      excerpt: null,
    });
    score -= 0.15;
  }

  // 5. Check completeness
  const completeness = checkCompleteness(explanation, problem.pattern);
  if (!completeness.isComplete) {
    issues.push({
      type: 'INCOMPLETE',
      description: `Explanation could mention: ${completeness.missingConcepts.join(', ')}`,
      excerpt: null,
    });
    score -= 0.1;
  }

  // 6. Check for vagueness
  const vaguePatterns = /\b(something|stuff|things|whatever|etc|somehow)\b/i;
  if (vaguePatterns.test(explanation)) {
    issues.push({
      type: 'VAGUE',
      description: 'Explanation uses vague language. Be more specific.',
      excerpt: null,
    });
    score -= 0.1;
  }

  // Ensure score is in valid range
  score = Math.max(0, Math.min(1, score));

  // Generate clarifying question if there are issues
  let clarifyingQuestion: string | null = null;
  if (issues.length > 0 && score < PASSING_SCORE) {
    clarifyingQuestion = generateClarifyingQuestion(issues[0]!, problem);
  }

  return {
    isValid: score >= PASSING_SCORE,
    score,
    issues,
    clarifyingQuestion,
  };
}

/**
 * Generate a clarifying question based on the top issue
 */
function generateClarifyingQuestion(
  issue: FeynmanIssue,
  _problem: Problem
): string {
  switch (issue.type) {
    case 'JARGON':
      return `Can you explain "${issue.excerpt}" using everyday words that a child could understand?`;
    case 'CIRCULAR':
      return 'You explained what happens, but why does it work? What makes this approach correct?';
    case 'TOO_COMPLEX':
      return 'Imagine explaining this to a younger sibling. How would you make it simpler?';
    case 'TOO_LONG':
      return 'Can you distill your explanation to just the essential idea in fewer sentences?';
    case 'INCOMPLETE':
      return 'What is the key action or operation that makes this approach work?';
    case 'VAGUE':
      return 'Can you be more specific about what exactly happens at each step?';
    default:
      return 'Can you explain this more simply, as if to someone who has never programmed?';
  }
}

// ============ Feynman Gate Processing ============

/**
 * Process a Feynman explanation attempt
 */
export function processFeynmanAttempt(
  input: FeynmanValidationInput,
  currentData: FeynmanValidationData
): {
  attempt: FeynmanAttempt;
  result: FeynmanValidationResult;
  updatedData: FeynmanValidationData;
} {
  const result = validateFeynmanExplanation(input);

  const attempt: FeynmanAttempt = {
    explanation: input.explanation,
    validation: result,
    timestamp: new Date(),
  };

  const updatedData: FeynmanValidationData = {
    explanation: result.isValid ? input.explanation : currentData.explanation,
    validation: result,
    attempts: [...currentData.attempts, attempt],
    isComplete: result.isValid || currentData.attempts.length + 1 >= MAX_FEYNMAN_ATTEMPTS,
  };

  return { attempt, result, updatedData };
}

// ============ Coach Response Generation ============

/**
 * Generate a coach response for Feynman validation
 */
export function generateFeynmanResponse(
  result: FeynmanValidationResult,
  attemptCount: number
): CoachResponse {
  if (result.isValid) {
    return {
      type: 'CONGRATULATIONS',
      content: 'Excellent explanation! You clearly understand the concept.',
      questions: [],
      helpLevel: null,
      nextAction: 'ADVANCE',
      metadata: {
        stage: 'FEYNMAN_VALIDATION',
        attemptCount,
        helpUsed: 0,
        timeElapsed: 0,
      },
    };
  }

  if (attemptCount >= MAX_FEYNMAN_ATTEMPTS) {
    return {
      type: 'FEEDBACK',
      content: 'Let us move forward. You can revisit this concept during reflection.',
      questions: result.clarifyingQuestion ? [result.clarifyingQuestion] : [],
      helpLevel: null,
      nextAction: 'ADVANCE',
      metadata: {
        stage: 'FEYNMAN_VALIDATION',
        attemptCount,
        helpUsed: 0,
        timeElapsed: 0,
      },
    };
  }

  // Provide feedback on issues
  const topIssue = result.issues[0];
  const feedbackContent = topIssue
    ? topIssue.description
    : 'Your explanation needs some refinement.';

  return {
    type: 'QUESTION',
    content: feedbackContent,
    questions: result.clarifyingQuestion ? [result.clarifyingQuestion] : [],
    helpLevel: null,
    nextAction: 'CONTINUE',
    metadata: {
      stage: 'FEYNMAN_VALIDATION',
      attemptCount,
      helpUsed: 0,
      timeElapsed: 0,
    },
  };
}

// ============ Initial Data Factory ============

/**
 * Create initial Feynman validation data
 */
export function createInitialFeynmanData(): FeynmanValidationData {
  return {
    explanation: null,
    validation: null,
    attempts: [],
    isComplete: false,
  };
}
