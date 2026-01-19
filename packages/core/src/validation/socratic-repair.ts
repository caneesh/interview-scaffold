/**
 * Socratic Repair Service
 *
 * Implements the "Socratic Repair" algorithm for guiding users back
 * after validation failures without giving away answers.
 *
 * THE ALGORITHM:
 * 1. The Pause: Don't say "wrong." Frame it as a calibration pause.
 * 2. The Rewind: Reference what the user established in previous valid work.
 * 3. The Comparison: Ask user to compare valid work vs current error.
 * 4. The Bridge Question: Single targeted question highlighting the contradiction.
 *
 * GUARDRAILS:
 * - NEVER give the correct answer or code fix.
 * - NEVER explicitly state the mistake. Ask guiding questions instead.
 * - Keep tone encouraging but rigorous (Socratic method).
 */

import type { PatternId } from '../entities/pattern.js';

// ============ Types ============

export type ErrorType =
  | 'logic_error'
  | 'off_by_one'
  | 'wrong_pattern'
  | 'missing_edge_case'
  | 'complexity_issue'
  | 'invariant_violation'
  | 'boundary_error'
  | 'state_management'
  | 'gibberish_input'
  | 'incomplete_answer'
  | 'other';

export type PrincipleCategory =
  | 'algorithm'
  | 'data_structure'
  | 'complexity'
  | 'edge_cases'
  | 'invariants';

export interface SocraticRepairContext {
  readonly previousValidStep: {
    readonly stepId: number;
    readonly stepTitle: string;
    readonly stepContent: string;
    readonly userAnswer?: string;
  };
  readonly currentError: {
    readonly description: string;
    readonly errorType: ErrorType;
    readonly studentInput?: string;
  };
  readonly violatedPrinciple: {
    readonly name: string;
    readonly description: string;
    readonly category: PrincipleCategory;
  };
  readonly problemContext: {
    readonly pattern: PatternId;
    readonly problemTitle: string;
  };
}

export interface SocraticRepairResponse {
  readonly pauseMessage: string;
  readonly rewindReference: {
    readonly stepLabel: string;
    readonly quotedContent: string;
  };
  readonly comparisonPrompt: string;
  readonly bridgeQuestion: string;
  readonly gentleNudge: string;
  readonly relatedConcepts: readonly string[];
  readonly highlightStepId: number;
}

export interface SocraticRepairEvent {
  readonly id: string;
  readonly timestamp: string;
  readonly context: SocraticRepairContext;
  readonly response: SocraticRepairResponse;
  readonly studentInteraction: {
    readonly acknowledged: boolean;
    readonly timeToAcknowledge?: number;
    readonly followUpAttemptCorrect?: boolean;
  };
  readonly outcome: 'resolved' | 'escalated' | 'abandoned';
}

// ============ Templates ============

/**
 * Templates for the "Pause" message based on error type
 */
const PAUSE_MESSAGES: Record<ErrorType, readonly string[]> = {
  logic_error: [
    "Let's pause here. I want us to revisit the logic we established.",
    "Hold on - let's step back and check our reasoning.",
    "Before we proceed, let's verify our logical flow.",
  ],
  off_by_one: [
    "Let's pause to check our boundary conditions.",
    "Wait - before continuing, let's verify our indices.",
    "Hold on. Let's rewind and check the loop boundaries.",
  ],
  wrong_pattern: [
    "Let's pause and reconsider our approach.",
    "Hold on - let's think about whether this pattern fits the problem.",
    "Before proceeding, let's revisit the pattern choice.",
  ],
  missing_edge_case: [
    "Let's pause and think about edge cases.",
    "Wait - what happens in special cases?",
    "Hold on. Let's consider some boundary scenarios.",
  ],
  complexity_issue: [
    "Let's pause to analyze our complexity.",
    "Before continuing, let's think about the time/space tradeoffs.",
    "Hold on - let's verify this meets the complexity requirements.",
  ],
  invariant_violation: [
    "Let's pause here. The invariant we established might be violated.",
    "Hold on - let's check if our invariant still holds.",
    "Before we proceed, let's verify our core assumption.",
  ],
  boundary_error: [
    "Let's pause to check our boundary handling.",
    "Wait - what happens at the start and end of the input?",
    "Hold on. Let's verify the boundary conditions.",
  ],
  state_management: [
    "Let's pause and trace through our state updates.",
    "Hold on - let's verify how state is being modified.",
    "Before continuing, let's check the state transitions.",
  ],
  gibberish_input: [
    "I didn't quite follow that. Let's pause and try again.",
    "Let's take a step back. Can you elaborate on your thinking?",
    "Hold on - could you explain your approach more clearly?",
  ],
  incomplete_answer: [
    "Let's pause here. Your answer seems incomplete.",
    "Hold on - there's more to consider here.",
    "Before we proceed, let's make sure we've addressed all parts.",
  ],
  other: [
    "Let's pause for a moment and review our work.",
    "Before we proceed, let's verify our approach.",
    "Hold on - let's take a step back and check.",
  ],
};

/**
 * Templates for bridge questions based on error type
 */
const BRIDGE_QUESTION_TEMPLATES: Record<ErrorType, readonly string[]> = {
  logic_error: [
    "In {stepLabel}, you established {concept}. Does your current code reflect that logic?",
    "Looking at {stepLabel}, is your condition checking what you intended?",
    "Walk me through: how does your current code handle the case where {condition}?",
  ],
  off_by_one: [
    "In {stepLabel}, you said the loop should run {n} times. Does your loop actually do that?",
    "What's the value of your index on the first iteration? The last? Is that what you intended?",
    "Looking at {stepLabel}, should the boundary be inclusive or exclusive?",
  ],
  wrong_pattern: [
    "You chose {pattern} for this problem. What characteristic of the problem led to that choice?",
    "In {stepLabel}, you identified the problem type. Does your current approach match?",
    "What would happen if the input had {characteristic}? Would your approach handle it?",
  ],
  missing_edge_case: [
    "What if the input is empty? How does your code handle that?",
    "In {stepLabel}, did we consider what happens when {condition}?",
    "What's the smallest valid input? Does your code handle it correctly?",
  ],
  complexity_issue: [
    "Looking at {stepLabel}, how many times does your inner operation run in the worst case?",
    "You mentioned needing O({complexity}). Trace through: what's the actual complexity?",
    "For an input of size n, how does the work scale? Is that what we targeted in {stepLabel}?",
  ],
  invariant_violation: [
    "In {stepLabel}, you stated the invariant: {invariant}. After this operation, does it still hold?",
    "What was true before this step? Is it still true after?",
    "You said {invariant} must always be true. Can you verify it holds here?",
  ],
  boundary_error: [
    "What value does your variable have when i = 0? When i = n-1?",
    "In {stepLabel}, you defined the valid range. Does your code respect those boundaries?",
    "What happens on the first iteration? The last? Is that correct?",
  ],
  state_management: [
    "In {stepLabel}, you said {state} should track X. Is it being updated correctly?",
    "Trace through: after processing the first element, what's the state? Is that right?",
    "When do you update {state}? Before or after the comparison? Why?",
  ],
  gibberish_input: [
    "Can you explain what you meant by that in terms of the problem?",
    "How does that relate to what we established in {stepLabel}?",
    "What specific step in the algorithm were you describing?",
  ],
  incomplete_answer: [
    "You covered {coveredPart}. What about {missingPart}?",
    "That handles one case. What about when {condition}?",
    "In {stepLabel}, we identified multiple requirements. Have we addressed all of them?",
  ],
  other: [
    "Compare what you did in {stepLabel} with your current step. Do they connect logically?",
    "Looking at {stepLabel}, is your current approach consistent with what you established?",
    "Walk me through your reasoning from {stepLabel} to here.",
  ],
};

/**
 * Pattern-specific guidance hints
 */
const PATTERN_HINTS: Partial<Record<PatternId, readonly string[]>> = {
  SLIDING_WINDOW: [
    "Remember: in sliding window, we maintain a window and slide it.",
    "Check: are you updating the window incrementally or recalculating?",
    "Key insight: each element should be added and removed at most once.",
  ],
  TWO_POINTERS: [
    "With two pointers, think about when each pointer should move.",
    "Check: what condition determines which pointer moves?",
    "Key insight: the pointers should converge toward the solution.",
  ],
  DFS: [
    "In DFS, we explore as deep as possible before backtracking.",
    "Check: are you marking nodes as visited? Are you backtracking correctly?",
    "Key insight: recursive calls should explore neighbors systematically.",
  ],
  BFS: [
    "In BFS, we explore level by level.",
    "Check: are you processing nodes in the correct order?",
    "Key insight: use a queue to ensure level-order traversal.",
  ],
  BINARY_SEARCH: [
    "Binary search requires a sorted/monotonic property.",
    "Check: are you eliminating the correct half each time?",
    "Key insight: the search space should shrink by half each iteration.",
  ],
  DYNAMIC_PROGRAMMING: [
    "In DP, we build solutions from smaller subproblems.",
    "Check: what's your recurrence relation? Base case?",
    "Key insight: ensure subproblems don't overlap or are memoized.",
  ],
  GREEDY: [
    "Greedy makes locally optimal choices.",
    "Check: does making the local best choice lead to global optimum?",
    "Key insight: prove or verify the greedy choice property holds.",
  ],
  BACKTRACKING: [
    "Backtracking explores all possibilities and prunes invalid paths.",
    "Check: are you undoing choices when backtracking?",
    "Key insight: maintain valid state at each decision point.",
  ],
};

// ============ Helper Functions ============

function randomChoice<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function interpolate(template: string, context: Record<string, string>): string {
  let result = template;
  for (const [key, value] of Object.entries(context)) {
    result = result.replace(new RegExp(`\\{${key}\\}`, 'g'), value);
  }
  return result;
}

// ============ Main Functions ============

/**
 * Generate a deterministic Socratic Repair response
 * This provides immediate feedback without needing AI
 */
export function generateSocraticRepairResponse(
  context: SocraticRepairContext
): SocraticRepairResponse {
  const errorType = context.currentError.errorType;

  // Generate pause message
  const pauseMessage = randomChoice(PAUSE_MESSAGES[errorType]);

  // Generate rewind reference
  const stepLabel = `Step ${context.previousValidStep.stepId + 1}`;
  const rewindReference = {
    stepLabel,
    quotedContent: context.previousValidStep.userAnswer
      ? `You wrote: "${context.previousValidStep.userAnswer}"`
      : `In **${context.previousValidStep.stepTitle}**, you established: ${context.previousValidStep.stepContent}`,
  };

  // Generate comparison prompt
  const comparisonPrompt = `Now, look at your current answer and compare it to what you established in ${stepLabel}.`;

  // Generate bridge question
  const bridgeTemplate = randomChoice(BRIDGE_QUESTION_TEMPLATES[errorType]);
  const bridgeQuestion = interpolate(bridgeTemplate, {
    stepLabel,
    concept: context.violatedPrinciple.name,
    condition: 'the constraint is violated',
    pattern: context.problemContext.pattern,
    characteristic: 'unusual properties',
    complexity: 'the target complexity',
    invariant: context.violatedPrinciple.description,
    state: 'the tracking variable',
    coveredPart: 'part of the solution',
    missingPart: 'remaining cases',
    n: 'the expected number',
  });

  // Generate gentle nudge (pattern-specific if available)
  const patternHints = PATTERN_HINTS[context.problemContext.pattern];
  const gentleNudge = patternHints
    ? randomChoice(patternHints)
    : `Hint: ${context.violatedPrinciple.description}`;

  // Determine related concepts
  const relatedConcepts = [context.violatedPrinciple.category];

  return {
    pauseMessage,
    rewindReference,
    comparisonPrompt,
    bridgeQuestion,
    gentleNudge,
    relatedConcepts,
    highlightStepId: context.previousValidStep.stepId,
  };
}

/**
 * Classify error type from validation result
 */
export function classifyErrorType(
  feedback: string,
  pattern: PatternId
): ErrorType {
  const lowerFeedback = feedback.toLowerCase();

  // Check for gibberish/invalid input
  if (
    lowerFeedback.includes('gibberish') ||
    lowerFeedback.includes('invalid') ||
    lowerFeedback.includes("didn't understand") ||
    /^[a-z]{5,}$/.test(feedback.trim()) // Random letter sequences
  ) {
    return 'gibberish_input';
  }

  // Check for incomplete
  if (
    lowerFeedback.includes('incomplete') ||
    lowerFeedback.includes('missing') ||
    lowerFeedback.includes('not addressed')
  ) {
    return 'incomplete_answer';
  }

  // Check for off-by-one
  if (
    lowerFeedback.includes('off by one') ||
    lowerFeedback.includes('boundary') ||
    lowerFeedback.includes('index')
  ) {
    return 'off_by_one';
  }

  // Check for complexity issues
  if (
    lowerFeedback.includes('complexity') ||
    lowerFeedback.includes('time limit') ||
    lowerFeedback.includes('too slow')
  ) {
    return 'complexity_issue';
  }

  // Check for invariant violation
  if (
    lowerFeedback.includes('invariant') ||
    lowerFeedback.includes('assumption')
  ) {
    return 'invariant_violation';
  }

  // Check for edge case issues
  if (
    lowerFeedback.includes('edge case') ||
    lowerFeedback.includes('empty') ||
    lowerFeedback.includes('null')
  ) {
    return 'missing_edge_case';
  }

  // Check for wrong pattern
  if (
    lowerFeedback.includes('pattern') ||
    lowerFeedback.includes('approach') ||
    lowerFeedback.includes('different method')
  ) {
    return 'wrong_pattern';
  }

  // Check for state management
  if (
    lowerFeedback.includes('state') ||
    lowerFeedback.includes('update') ||
    lowerFeedback.includes('track')
  ) {
    return 'state_management';
  }

  // Default to logic error
  return 'logic_error';
}

/**
 * Build repair context from validation failure
 */
export function buildRepairContext(
  pattern: PatternId,
  problemTitle: string,
  previousStepId: number,
  previousStepTitle: string,
  previousStepContent: string,
  previousUserAnswer: string | undefined,
  currentInput: string,
  feedbackMessage: string
): SocraticRepairContext {
  const errorType = classifyErrorType(feedbackMessage, pattern);

  // Determine violated principle based on error type
  const principleMap: Record<ErrorType, { name: string; description: string; category: PrincipleCategory }> = {
    logic_error: {
      name: 'Logical Correctness',
      description: 'The code logic should correctly implement the algorithm.',
      category: 'algorithm',
    },
    off_by_one: {
      name: 'Boundary Handling',
      description: 'Loop indices and array bounds must be precise.',
      category: 'edge_cases',
    },
    wrong_pattern: {
      name: 'Pattern Selection',
      description: 'The chosen pattern should match the problem structure.',
      category: 'algorithm',
    },
    missing_edge_case: {
      name: 'Edge Case Coverage',
      description: 'All special cases must be handled explicitly.',
      category: 'edge_cases',
    },
    complexity_issue: {
      name: 'Complexity Budget',
      description: 'Solution must meet the time/space requirements.',
      category: 'complexity',
    },
    invariant_violation: {
      name: 'Loop Invariant',
      description: 'The invariant must hold at every iteration.',
      category: 'invariants',
    },
    boundary_error: {
      name: 'Boundary Conditions',
      description: 'First and last elements require special attention.',
      category: 'edge_cases',
    },
    state_management: {
      name: 'State Updates',
      description: 'State must be updated correctly at each step.',
      category: 'data_structure',
    },
    gibberish_input: {
      name: 'Clear Communication',
      description: 'Explanations should be clear and relevant.',
      category: 'algorithm',
    },
    incomplete_answer: {
      name: 'Complete Solution',
      description: 'All requirements must be addressed.',
      category: 'algorithm',
    },
    other: {
      name: 'General Correctness',
      description: 'The solution should be correct and complete.',
      category: 'algorithm',
    },
  };

  const principle = principleMap[errorType];

  return {
    previousValidStep: {
      stepId: previousStepId,
      stepTitle: previousStepTitle,
      stepContent: previousStepContent,
      userAnswer: previousUserAnswer,
    },
    currentError: {
      description: feedbackMessage,
      errorType,
      studentInput: currentInput,
    },
    violatedPrinciple: {
      name: principle.name,
      description: principle.description,
      category: principle.category,
    },
    problemContext: {
      pattern,
      problemTitle,
    },
  };
}

/**
 * Check if input appears to be gibberish
 */
export function isGibberishInput(input: string): boolean {
  const trimmed = input.trim().toLowerCase();

  // Too short to be meaningful
  if (trimmed.length < 3) {
    return true;
  }

  // Only letters with no spaces (like "adadadadad")
  if (/^[a-z]+$/.test(trimmed) && trimmed.length > 5) {
    // Check for repetitive patterns
    const uniqueChars = new Set(trimmed).size;
    if (uniqueChars <= 3 && trimmed.length > 8) {
      return true;
    }
  }

  // Random key mashing patterns
  if (/^[asdfghjkl;]+$/i.test(trimmed) || /^[qwertyuiop]+$/i.test(trimmed)) {
    return true;
  }

  // No actual words (check for at least one recognizable word)
  const words = trimmed.split(/\s+/);
  const commonWords = ['the', 'a', 'is', 'to', 'for', 'in', 'of', 'and', 'or', 'it', 'we', 'use', 'loop', 'if', 'while', 'return', 'array', 'list'];
  const hasRealWord = words.some(word =>
    word.length >= 3 && (commonWords.includes(word) || /^[a-z]+$/.test(word))
  );

  if (!hasRealWord && trimmed.length > 10) {
    return true;
  }

  return false;
}

/**
 * Validation outcome types
 */
export type ValidationOutcome =
  | 'ACCEPT'
  | 'REJECT_INVALID'
  | 'REJECT_INCORRECT'
  | 'UNSURE';

/**
 * Classify validation outcome
 */
export function classifyValidationOutcome(
  isValid: boolean,
  isCorrect: boolean,
  confidence: number
): ValidationOutcome {
  if (!isValid) {
    return 'REJECT_INVALID';
  }

  if (isCorrect) {
    return 'ACCEPT';
  }

  if (confidence < 0.5) {
    return 'UNSURE';
  }

  return 'REJECT_INCORRECT';
}
