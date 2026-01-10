/**
 * Thinking Gate Semantic Validator
 * Deterministic validation of pattern selection and invariant quality
 *
 * This module validates that users:
 * 1. Select the correct pattern for the problem
 * 2. State a substantive invariant (not just filler text)
 * 3. Mention relevant concepts for the pattern
 */

import type { PatternId, PATTERNS } from '../entities/pattern.js';
import type { Problem } from '../entities/problem.js';

// ============ Types ============

export interface ThinkingGateInput {
  readonly selectedPattern: string;
  readonly statedInvariant: string;
  readonly statedComplexity?: string | null;
}

export interface ThinkingGateValidationResult {
  readonly passed: boolean;
  readonly errors: readonly ThinkingGateError[];
  readonly warnings: readonly ThinkingGateWarning[];
  readonly llmAugmented: boolean;
}

export interface ThinkingGateError {
  readonly field: 'pattern' | 'invariant' | 'complexity';
  readonly code: string;
  readonly message: string;
  readonly hint?: string;
}

export interface ThinkingGateWarning {
  readonly field: 'pattern' | 'invariant' | 'complexity';
  readonly code: string;
  readonly message: string;
}

export interface ThinkingGateContext {
  readonly problem: Problem;
  readonly allowedPatterns: readonly PatternId[];
}

// ============ Constants ============

/**
 * Minimum length for a meaningful invariant statement
 */
export const MIN_INVARIANT_LENGTH = 20;

/**
 * Patterns that are considered "close" to each other for warning purposes
 */
export const RELATED_PATTERNS: Readonly<Record<PatternId, readonly PatternId[]>> = {
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

/**
 * Keywords that indicate a substantive invariant for each pattern
 */
export const PATTERN_INVARIANT_KEYWORDS: Readonly<Record<PatternId, readonly string[]>> = {
  SLIDING_WINDOW: [
    'window', 'left', 'right', 'expand', 'shrink', 'contract',
    'pointer', 'substring', 'subarray', 'contiguous', 'sum', 'count',
    'distinct', 'unique', 'maximum', 'minimum', 'contains',
  ],
  TWO_POINTERS: [
    'left', 'right', 'start', 'end', 'pointer', 'converge',
    'sorted', 'pair', 'sum', 'opposite', 'meet', 'inward',
  ],
  PREFIX_SUM: [
    'prefix', 'cumulative', 'sum', 'range', 'subarray', 'difference',
    'precompute', 'query', 'index',
  ],
  BINARY_SEARCH: [
    'mid', 'middle', 'left', 'right', 'half', 'sorted', 'search',
    'boundary', 'monotonic', 'target', 'condition',
  ],
  BFS: [
    'queue', 'level', 'layer', 'neighbor', 'distance', 'shortest',
    'visited', 'breadth', 'order', 'adjacent',
  ],
  DFS: [
    'recursion', 'recursive', 'stack', 'depth', 'visited', 'backtrack',
    'explore', 'path', 'neighbor', 'connected', 'base case',
  ],
  DYNAMIC_PROGRAMMING: [
    'state', 'subproblem', 'memo', 'cache', 'dp', 'optimal',
    'recurrence', 'relation', 'previous', 'transition', 'bottom-up', 'top-down',
  ],
  BACKTRACKING: [
    'backtrack', 'undo', 'restore', 'choice', 'candidate', 'explore',
    'valid', 'prune', 'constraint', 'path', 'state', 'recursive',
  ],
  GREEDY: [
    'greedy', 'optimal', 'local', 'choice', 'sort', 'order',
    'maximize', 'minimize', 'select', 'best',
  ],
  HEAP: [
    'heap', 'priority', 'queue', 'max', 'min', 'top', 'k',
    'largest', 'smallest', 'push', 'pop',
  ],
  TRIE: [
    'trie', 'prefix', 'tree', 'node', 'children', 'character',
    'word', 'insert', 'search', 'startswith',
  ],
  UNION_FIND: [
    'union', 'find', 'parent', 'root', 'connected', 'component',
    'merge', 'disjoint', 'set', 'rank', 'compress',
  ],
  INTERVAL_MERGING: [
    'interval', 'merge', 'overlap', 'sort', 'start', 'end',
    'range', 'combine', 'previous', 'current', 'extend',
  ],
};

/**
 * Common filler phrases that indicate low-effort invariant
 */
const FILLER_PHRASES = [
  'i will',
  'we will',
  'the solution',
  'this solves',
  'it works',
  'just do',
  'basically',
  'simply',
  'something',
  'stuff',
  'things',
  'whatever',
  'idk',
  'i think',
  'probably',
  'asdf',
  'test',
  'abc',
  '123',
];

// ============ Validation Functions ============

/**
 * Validates thinking gate input against problem context
 * Deterministic - no LLM calls
 */
export function validateThinkingGate(
  input: ThinkingGateInput,
  context: ThinkingGateContext
): ThinkingGateValidationResult {
  const errors: ThinkingGateError[] = [];
  const warnings: ThinkingGateWarning[] = [];

  // 1. Validate pattern selection
  const patternResult = validatePattern(input.selectedPattern, context);
  errors.push(...patternResult.errors);
  warnings.push(...patternResult.warnings);

  // 2. Validate invariant quality
  const invariantResult = validateInvariant(
    input.statedInvariant,
    input.selectedPattern as PatternId,
    context
  );
  errors.push(...invariantResult.errors);
  warnings.push(...invariantResult.warnings);

  // 3. Validate complexity (optional, but warn if obviously wrong)
  if (input.statedComplexity) {
    const complexityResult = validateComplexity(input.statedComplexity, context);
    warnings.push(...complexityResult.warnings);
  }

  return {
    passed: errors.length === 0,
    errors,
    warnings,
    llmAugmented: false,
  };
}

/**
 * Validates pattern selection
 */
function validatePattern(
  selectedPattern: string,
  context: ThinkingGateContext
): { errors: ThinkingGateError[]; warnings: ThinkingGateWarning[] } {
  const errors: ThinkingGateError[] = [];
  const warnings: ThinkingGateWarning[] = [];

  const { problem, allowedPatterns } = context;
  const correctPattern = problem.pattern;

  // Check if selected pattern is valid
  if (!isValidPattern(selectedPattern)) {
    errors.push({
      field: 'pattern',
      code: 'INVALID_PATTERN',
      message: `"${selectedPattern}" is not a recognized pattern.`,
      hint: `Choose from: ${allowedPatterns.join(', ')}`,
    });
    return { errors, warnings };
  }

  const selected = selectedPattern as PatternId;

  // Check if selected pattern matches problem's pattern
  if (selected !== correctPattern) {
    // Check if it's a related pattern (warning) or completely wrong (error)
    const relatedPatterns = RELATED_PATTERNS[correctPattern] ?? [];

    if (relatedPatterns.includes(selected)) {
      // Close but not quite - still an error but with helpful hint
      errors.push({
        field: 'pattern',
        code: 'WRONG_PATTERN_RELATED',
        message: `${selected} is related but not the best fit for this problem.`,
        hint: `Consider: What distinguishes ${correctPattern} from ${selected}? This problem's structure suggests ${correctPattern}.`,
      });
    } else {
      errors.push({
        field: 'pattern',
        code: 'WRONG_PATTERN',
        message: `The selected pattern doesn't match this problem's intended approach.`,
        hint: `Re-read the problem. Think about the core operation and data access pattern required.`,
      });
    }
  }

  return { errors, warnings };
}

/**
 * Validates invariant quality
 */
function validateInvariant(
  invariant: string,
  selectedPattern: PatternId,
  context: ThinkingGateContext
): { errors: ThinkingGateError[]; warnings: ThinkingGateWarning[] } {
  const errors: ThinkingGateError[] = [];
  const warnings: ThinkingGateWarning[] = [];

  const trimmed = invariant.trim();
  const normalized = trimmed.toLowerCase();

  // 1. Check minimum length
  if (trimmed.length < MIN_INVARIANT_LENGTH) {
    errors.push({
      field: 'invariant',
      code: 'INVARIANT_TOO_SHORT',
      message: `Invariant is too short (${trimmed.length} chars, need ${MIN_INVARIANT_LENGTH}+).`,
      hint: 'A good invariant describes what property holds true throughout your algorithm. Be specific about variables and bounds.',
    });
    return { errors, warnings };
  }

  // 2. Check for filler/garbage content
  if (containsFillerContent(normalized)) {
    errors.push({
      field: 'invariant',
      code: 'INVARIANT_FILLER',
      message: 'Invariant appears to contain placeholder or filler text.',
      hint: 'State a specific property: What relationship between variables stays true? What bound is maintained?',
    });
    return { errors, warnings };
  }

  // 3. Check for pattern-relevant keywords
  const keywords = PATTERN_INVARIANT_KEYWORDS[selectedPattern] ?? [];
  const foundKeywords = keywords.filter((kw) => normalized.includes(kw.toLowerCase()));

  if (foundKeywords.length === 0) {
    // No pattern-specific keywords found
    if (isValidPattern(selectedPattern)) {
      warnings.push({
        field: 'invariant',
        code: 'INVARIANT_MISSING_KEYWORDS',
        message: `Invariant doesn't mention typical ${selectedPattern} concepts.`,
      });
    }
  }

  // 4. Check for constraint/bound language
  const hasConstraintLanguage = /(?:at\s+(?:most|least)|always|never|maintain|ensure|guarantee|bound|limit|within|between|less|greater|equal|<=|>=|<|>)/i.test(trimmed);
  const hasMonotonicLanguage = /(?:increas|decreas|monoton|sorted|order|grow|shrink|expand|contract)/i.test(trimmed);
  const hasRelationalLanguage = /(?:while|until|as long as|whenever|if and only if|iff|such that)/i.test(trimmed);

  if (!hasConstraintLanguage && !hasMonotonicLanguage && !hasRelationalLanguage) {
    warnings.push({
      field: 'invariant',
      code: 'INVARIANT_WEAK_CONSTRAINT',
      message: 'Invariant could be stronger. Consider adding explicit bounds or conditions.',
    });
  }

  return { errors, warnings };
}

/**
 * Validates complexity statement (warnings only, no errors)
 */
function validateComplexity(
  complexity: string,
  context: ThinkingGateContext
): { warnings: ThinkingGateWarning[] } {
  const warnings: ThinkingGateWarning[] = [];
  const normalized = complexity.trim().toLowerCase();

  // Check if it looks like a valid complexity notation
  const hasComplexityNotation = /o\s*\(\s*[1n\^log\*\s\d]+\s*\)/i.test(normalized);

  if (!hasComplexityNotation && normalized.length > 0) {
    warnings.push({
      field: 'complexity',
      code: 'COMPLEXITY_FORMAT',
      message: 'Complexity should use Big-O notation like O(n), O(n log n), O(n²), etc.',
    });
  }

  // Check if complexity matches problem target
  const targetComplexity = context.problem.targetComplexity.toLowerCase();
  if (hasComplexityNotation && !normalized.includes(targetComplexity.replace(/\s/g, ''))) {
    // Don't error, just note the difference
    warnings.push({
      field: 'complexity',
      code: 'COMPLEXITY_MISMATCH',
      message: `Target complexity for this problem is ${context.problem.targetComplexity}.`,
    });
  }

  return { warnings };
}

// ============ Helper Functions ============

function isValidPattern(pattern: string): pattern is PatternId {
  const validPatterns: readonly string[] = [
    'SLIDING_WINDOW', 'TWO_POINTERS', 'PREFIX_SUM', 'BINARY_SEARCH',
    'BFS', 'DFS', 'DYNAMIC_PROGRAMMING', 'BACKTRACKING', 'GREEDY',
    'HEAP', 'TRIE', 'UNION_FIND', 'INTERVAL_MERGING',
  ];
  return validPatterns.includes(pattern);
}

function containsFillerContent(normalized: string): boolean {
  // Check for filler phrases
  for (const phrase of FILLER_PHRASES) {
    if (normalized.includes(phrase)) {
      // Allow if surrounded by substantive content
      const phraseIndex = normalized.indexOf(phrase);
      const beforeLen = phraseIndex;
      const afterLen = normalized.length - phraseIndex - phrase.length;

      // If the filler phrase makes up most of the content, reject
      if (beforeLen < 10 && afterLen < 10) {
        return true;
      }
    }
  }

  // Check for repeated characters (spam)
  if (/(.)\1{4,}/.test(normalized)) {
    return true;
  }

  // Check for keyboard mashing patterns
  if (/^[asdfghjklqwertyuiopzxcvbnm]{5,}$/i.test(normalized.replace(/\s/g, ''))) {
    return true;
  }

  return false;
}

// ============ LLM Augmentation Port ============

export interface ThinkingGateLLMPort {
  /**
   * Check if LLM validation is enabled
   */
  isEnabled(): boolean;

  /**
   * Augment deterministic validation with LLM analysis
   * Can only add warnings, cannot override deterministic errors
   */
  augmentValidation(
    input: ThinkingGateInput,
    context: ThinkingGateContext,
    deterministicResult: ThinkingGateValidationResult
  ): Promise<ThinkingGateValidationResult>;
}

/**
 * Creates a null LLM port (no LLM validation)
 */
export function createNullThinkingGateLLM(): ThinkingGateLLMPort {
  return {
    isEnabled: () => false,
    augmentValidation: async (_input, _context, result) => result,
  };
}

/**
 * Full validation with optional LLM augmentation
 * Deterministic-first: LLM cannot pass something deterministic rejects
 */
export async function validateThinkingGateWithLLM(
  input: ThinkingGateInput,
  context: ThinkingGateContext,
  llmPort: ThinkingGateLLMPort
): Promise<ThinkingGateValidationResult> {
  // 1. Run deterministic validation first
  const deterministicResult = validateThinkingGate(input, context);

  // 2. If deterministic failed, return immediately (LLM cannot override)
  if (!deterministicResult.passed) {
    return deterministicResult;
  }

  // 3. If LLM is enabled, augment with additional checks
  if (llmPort.isEnabled()) {
    return llmPort.augmentValidation(input, context, deterministicResult);
  }

  return deterministicResult;
}

// ============ Export for use in submit-step ============

export {
  validateThinkingGate as validateThinkingGateDeterministic,
  validateThinkingGateWithLLM as validateThinkingGateFull,
};
