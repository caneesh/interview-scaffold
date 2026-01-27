/**
 * Explain Failure Use Case
 *
 * Explains why a test case failed WITHOUT revealing the solution.
 * Guides debugging conceptually rather than providing code fixes.
 *
 * Called by: POST /api/attempts/{id}/verify/explain-failure
 *
 * CRITICAL: This use case must NEVER output code solutions.
 * All outputs are validated through guardrails to ensure no code leakage.
 */

import type { TenantId } from '../../entities/tenant.js';
import type { Problem } from '../../entities/problem.js';
import type { AttemptV2LLMPort, VerifyExplainOutput } from '../../prompts/index.js';
import {
  VERIFY_EXPLAIN_FAILURE,
  callVerifyExplain,
  applyGuardrails,
  detectSolutionLeak,
} from '../../prompts/index.js';

// ============ Types ============

export interface ExplainFailureInput {
  readonly tenantId: TenantId;
  readonly attemptId: string;
  readonly userId: string;
  readonly problem: Problem;
  readonly userCode: string;
  readonly testIndex: number;
  readonly testInput: string;
  readonly expected: string;
  readonly actual: string;
  readonly errorMessage?: string;
  readonly userExplanation: string; // What user thinks went wrong
}

export interface ExplainFailureOutput {
  readonly likelyBugType: string;
  readonly failingCaseExplanation: string;
  readonly suggestedNextDebugStep: string;
  readonly source: 'ai' | 'deterministic';
}

export interface ExplainFailureDeps {
  readonly llm: AttemptV2LLMPort;
}

// ============ Errors ============

export class ExplainFailureError extends Error {
  constructor(
    message: string,
    public readonly code: string
  ) {
    super(message);
    this.name = 'ExplainFailureError';
  }
}

// ============ Bug Type Categories ============

const BUG_TYPES = {
  OFF_BY_ONE: 'Off-by-one error',
  WRONG_CONDITION: 'Wrong condition or comparison',
  MISSING_EDGE_CASE: 'Missing edge case handling',
  WRONG_INITIALIZATION: 'Wrong initialization',
  WRONG_UPDATE: 'Incorrect state update',
  WRONG_TERMINATION: 'Incorrect loop termination',
  TYPE_ERROR: 'Type or data handling error',
  LOGIC_ERROR: 'Logic error in algorithm',
  BOUNDARY_ERROR: 'Boundary or index error',
  RETURN_ERROR: 'Wrong or missing return value',
} as const;

type BugType = (typeof BUG_TYPES)[keyof typeof BUG_TYPES];

// ============ Use Case ============

export async function explainFailure(
  input: ExplainFailureInput,
  deps: ExplainFailureDeps
): Promise<ExplainFailureOutput> {
  const {
    problem,
    userCode,
    testInput,
    expected,
    actual,
    errorMessage,
    userExplanation,
  } = input;
  const { llm } = deps;

  // Try AI explanation with strict guardrails
  if (llm.isEnabled()) {
    const result = await callVerifyExplain(llm, VERIFY_EXPLAIN_FAILURE, {
      problemStatement: problem.statement,
      userCode,
      testInput,
      expectedOutput: expected,
      actualOutput: actual,
      errorMessage: errorMessage ?? 'No error message',
    });

    if (result.success && result.data) {
      // Double-check guardrails specifically for code content
      const explanationText = [
        result.data.likelyBugType,
        result.data.failingCaseExplanation,
        result.data.suggestedNextDebugStep,
      ].join(' ');

      const leakCheck = detectSolutionLeak(explanationText);

      if (leakCheck.riskLevel === 'high' || leakCheck.riskLevel === 'critical') {
        // Guardrail triggered: AI explanation contained solution hints
        // Fall back to deterministic explanation to avoid leaking solution
        return explainDeterministic(testInput, expected, actual, errorMessage);
      }

      // Sanitize each field individually
      const sanitizedExplanation = applyGuardrails(
        result.data.failingCaseExplanation,
        'explanation'
      );
      const sanitizedDebugStep = applyGuardrails(
        result.data.suggestedNextDebugStep,
        'hint'
      );

      return {
        likelyBugType: result.data.likelyBugType,
        failingCaseExplanation: sanitizedExplanation.sanitizedOutput ?? result.data.failingCaseExplanation,
        suggestedNextDebugStep: sanitizedDebugStep.sanitizedOutput ?? result.data.suggestedNextDebugStep,
        source: 'ai',
      };
    }
  }

  // Fall back to deterministic explanation
  return explainDeterministic(testInput, expected, actual, errorMessage);
}

// ============ Deterministic Fallback ============

function explainDeterministic(
  testInput: string,
  expected: string,
  actual: string,
  errorMessage?: string
): ExplainFailureOutput {
  // Analyze the failure pattern
  const bugType = inferBugType(testInput, expected, actual, errorMessage);
  const explanation = generateExplanation(testInput, expected, actual, errorMessage);
  const debugStep = generateDebugStep(bugType);

  return {
    likelyBugType: bugType,
    failingCaseExplanation: explanation,
    suggestedNextDebugStep: debugStep,
    source: 'deterministic',
  };
}

/**
 * Infer the likely bug type from failure characteristics
 */
function inferBugType(
  testInput: string,
  expected: string,
  actual: string,
  errorMessage?: string
): BugType {
  // Check for runtime errors
  if (errorMessage) {
    const lowerError = errorMessage.toLowerCase();
    if (lowerError.includes('index') || lowerError.includes('range') || lowerError.includes('bounds')) {
      return BUG_TYPES.BOUNDARY_ERROR;
    }
    if (lowerError.includes('type') || lowerError.includes('undefined') || lowerError.includes('null')) {
      return BUG_TYPES.TYPE_ERROR;
    }
    if (lowerError.includes('recursion') || lowerError.includes('stack') || lowerError.includes('infinite')) {
      return BUG_TYPES.WRONG_TERMINATION;
    }
  }

  // Check for edge case patterns in input
  const inputLower = testInput.toLowerCase();
  if (inputLower === '[]' || inputLower === '' || inputLower === 'null' || inputLower === '""') {
    return BUG_TYPES.MISSING_EDGE_CASE;
  }

  // Check for single element input
  try {
    const parsed = JSON.parse(testInput);
    if (Array.isArray(parsed) && parsed.length === 1) {
      return BUG_TYPES.MISSING_EDGE_CASE;
    }
  } catch {
    // Not JSON, continue
  }

  // Check for off-by-one patterns
  try {
    const expectedNum = Number(expected);
    const actualNum = Number(actual);
    if (!isNaN(expectedNum) && !isNaN(actualNum)) {
      const diff = Math.abs(expectedNum - actualNum);
      if (diff === 1) {
        return BUG_TYPES.OFF_BY_ONE;
      }
    }
  } catch {
    // Not numeric, continue
  }

  // Check for boolean/condition errors
  if ((expected === 'true' && actual === 'false') || (expected === 'false' && actual === 'true')) {
    return BUG_TYPES.WRONG_CONDITION;
  }

  // Check for empty output
  if (actual === '[]' || actual === '' || actual === 'null' || actual === 'undefined') {
    return BUG_TYPES.RETURN_ERROR;
  }

  // Default to logic error
  return BUG_TYPES.LOGIC_ERROR;
}

/**
 * Generate a conceptual explanation of the failure
 */
function generateExplanation(
  testInput: string,
  expected: string,
  actual: string,
  errorMessage?: string
): string {
  if (errorMessage) {
    return `The code encountered a runtime error on this test case. This often indicates the algorithm is accessing something that doesn't exist or operating on the wrong type of data. The error occurred when processing input: "${truncate(testInput, 50)}".`;
  }

  if (actual === 'undefined' || actual === 'null' || actual === '') {
    return `The code returned no value or an empty result for this input. This suggests the algorithm might be missing a return statement in certain code paths, or the logic isn't reaching the case that should produce output.`;
  }

  // Check for input characteristics
  try {
    const parsed = JSON.parse(testInput);
    if (Array.isArray(parsed)) {
      if (parsed.length === 0) {
        return `This test case uses an empty input. The algorithm needs to handle the case where there are no elements to process. Empty inputs often require special handling before the main logic runs.`;
      }
      if (parsed.length === 1) {
        return `This test case has only a single element. Single-element cases sometimes behave differently because there's nothing to compare against or the usual iteration patterns don't apply the same way.`;
      }
      if (new Set(parsed).size === 1) {
        return `This test case has all identical elements. When all values are the same, certain comparisons or tracking logic might not behave as expected.`;
      }
    }
  } catch {
    // Not JSON, use generic
  }

  return `The code produced a different result than expected for this input. Compare what your algorithm does step by step with what the problem requires. Focus on where the actual output diverges from the expected output.`;
}

/**
 * Generate a debugging step based on bug type
 */
function generateDebugStep(bugType: BugType): string {
  const steps: Record<BugType, string> = {
    [BUG_TYPES.OFF_BY_ONE]: 'Trace through your loop indices and boundary conditions. Check if you should be using < vs <= or 0 vs 1 as starting/ending values.',
    [BUG_TYPES.WRONG_CONDITION]: 'Examine your conditional statements. Write out the condition in plain English and verify it matches the problem requirements.',
    [BUG_TYPES.MISSING_EDGE_CASE]: 'Add handling for this specific input at the beginning of your function. What should the answer be for this edge case?',
    [BUG_TYPES.WRONG_INITIALIZATION]: 'Check the initial values of your variables. What should they be before processing any input?',
    [BUG_TYPES.WRONG_UPDATE]: 'Trace through one iteration of your main logic. At each step, write down what values change and verify they match your intent.',
    [BUG_TYPES.WRONG_TERMINATION]: 'Check your loop or recursion termination conditions. Is there a case where it continues longer than it should or stops too early?',
    [BUG_TYPES.TYPE_ERROR]: 'Check what types of values your variables hold at each point. Is anything becoming null, undefined, or the wrong type?',
    [BUG_TYPES.LOGIC_ERROR]: 'Walk through your algorithm on paper with this exact input. At each step, write down what happens and compare to what should happen.',
    [BUG_TYPES.BOUNDARY_ERROR]: 'Check all array/string accesses. Verify that indices are always within valid bounds, especially at the start and end of loops.',
    [BUG_TYPES.RETURN_ERROR]: 'Trace all paths through your code. Is there a path that doesn\'t return a value? Check if your return statement is in the right place.',
  };

  return steps[bugType] ?? 'Trace through your algorithm step by step with this input and compare to the expected behavior.';
}

/**
 * Truncate string for display
 */
function truncate(str: string, maxLen: number): string {
  return str.length > maxLen ? str.slice(0, maxLen - 3) + '...' : str;
}
