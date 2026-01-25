/**
 * Coding Evaluator - runs code submissions against test cases
 *
 * Uses the Piston code executor for sandboxed execution.
 * Produces evaluation results suitable for persisting to coding_test_results.
 */

import type { CodeExecutor } from '@scaffold/core/use-cases';
import type { Submission, TestResultData } from '@scaffold/core/entities';

/**
 * Test case from content body
 */
export interface ContentTestCase {
  readonly input: string;
  readonly expectedOutput: string;
  readonly isHidden?: boolean;
  readonly explanation?: string;
}

/**
 * Input for coding evaluation
 */
export interface CodingEvaluationInput {
  /** The user's code submission */
  readonly submission: Pick<Submission, 'contentText' | 'contentJson' | 'language'>;
  /** Test cases from the content body */
  readonly testCases: readonly ContentTestCase[];
  /** Optional hidden tests for additional validation */
  readonly hiddenTests?: readonly ContentTestCase[];
}

/**
 * Per-test result suitable for persistence
 */
export interface CodingTestResultData {
  readonly testIndex: number;
  readonly passed: boolean;
  readonly isHidden: boolean;
  /** Expected value - null for hidden tests */
  readonly expected: string | null;
  /** Actual output - null for hidden tests that failed */
  readonly actual: string | null;
  readonly stdout: string | null;
  readonly stderr: string | null;
  readonly durationMs: number | null;
  readonly error: string | null;
}

/**
 * Summary of evaluation results
 */
export interface CodingEvaluationSummary {
  readonly passed: boolean;
  readonly testsPassed: number;
  readonly testsTotal: number;
  readonly visibleTestsPassed: number;
  readonly visibleTestsTotal: number;
  readonly hiddenTestsPassed: number;
  readonly hiddenTestsTotal: number;
  readonly hasExecutionError: boolean;
  readonly executionErrorMessage?: string;
}

/**
 * Output from coding evaluation
 */
export interface CodingEvaluationOutput {
  readonly summary: CodingEvaluationSummary;
  readonly testResults: readonly CodingTestResultData[];
}

/**
 * Error thrown when code runner is not configured
 */
export class CodeRunnerNotConfiguredError extends Error {
  constructor() {
    super(
      'Code execution service is not configured. ' +
      'Set PISTON_API_URL environment variable to enable code execution, ' +
      'or set DEV_SIMULATOR=true to use simulated results for development.'
    );
    this.name = 'CodeRunnerNotConfiguredError';
  }
}

/**
 * Error thrown when submission has no code
 */
export class NoCodeProvidedError extends Error {
  constructor() {
    super('No code provided in submission. Check contentText or contentJson.code.');
    this.name = 'NoCodeProvidedError';
  }
}

/**
 * Error thrown when language is not specified
 */
export class LanguageNotSpecifiedError extends Error {
  constructor() {
    super('Programming language not specified in submission.');
    this.name = 'LanguageNotSpecifiedError';
  }
}

/**
 * Error thrown when no test cases are available
 */
export class NoTestCasesError extends Error {
  constructor() {
    super('No test cases available for this content.');
    this.name = 'NoTestCasesError';
  }
}

/**
 * Extract code from submission
 */
function extractCode(submission: CodingEvaluationInput['submission']): string | null {
  // Try contentText first
  if (submission.contentText && submission.contentText.trim().length > 0) {
    return submission.contentText;
  }

  // Fall back to contentJson.code
  const json = submission.contentJson as Record<string, unknown>;
  if (json?.code && typeof json.code === 'string' && json.code.trim().length > 0) {
    return json.code;
  }

  return null;
}

/**
 * Convert executor TestResultData to our CodingTestResultData format
 */
function convertToTestResult(
  executorResult: TestResultData,
  testIndex: number,
  isHidden: boolean
): CodingTestResultData {
  return {
    testIndex,
    passed: executorResult.passed,
    isHidden,
    // Hide expected/actual for hidden tests that failed (security)
    expected: isHidden && !executorResult.passed ? null : executorResult.expected,
    actual: isHidden && !executorResult.passed ? null : executorResult.actual,
    stdout: null, // Piston executor doesn't expose this separately
    stderr: null, // Piston executor doesn't expose this separately
    durationMs: null, // Piston executor doesn't expose this
    error: executorResult.error ?? null,
  };
}

/**
 * Run coding evaluation using the provided code executor
 *
 * @param input - Submission, test cases, and optional hidden tests
 * @param codeExecutor - The code execution service
 * @returns Evaluation summary and per-test results
 */
export async function runCodingEvaluation(
  input: CodingEvaluationInput,
  codeExecutor: CodeExecutor
): Promise<CodingEvaluationOutput> {
  const { submission, testCases, hiddenTests = [] } = input;

  // Validate code is present
  const code = extractCode(submission);
  if (!code) {
    throw new NoCodeProvidedError();
  }

  // Validate language is present
  const language = submission.language;
  if (!language) {
    throw new LanguageNotSpecifiedError();
  }

  // Combine visible and hidden test cases
  const allTestCases = [
    ...testCases.map((tc) => ({ ...tc, isHidden: tc.isHidden ?? false })),
    ...hiddenTests.map((tc) => ({ ...tc, isHidden: true })),
  ];

  if (allTestCases.length === 0) {
    throw new NoTestCasesError();
  }

  // Run code against all test cases
  const executorInput = allTestCases.map((tc) => ({
    input: tc.input,
    expectedOutput: tc.expectedOutput,
  }));

  let executorResults: readonly TestResultData[];
  let executionErrorMessage: string | undefined;

  try {
    executorResults = await codeExecutor.execute(code, language, executorInput);
  } catch (error) {
    // Execution failed entirely - mark all tests as failed
    const errorMsg = error instanceof Error ? error.message : 'Unknown execution error';
    executionErrorMessage = errorMsg;
    executorResults = executorInput.map((tc) => ({
      input: tc.input,
      expected: tc.expectedOutput,
      actual: '',
      passed: false as const,
      error: errorMsg,
    }));
  }

  // Convert results to our format
  const testResults: CodingTestResultData[] = executorResults.map((result, index) => {
    const isHidden = allTestCases[index]?.isHidden ?? false;
    return convertToTestResult(result, index, isHidden);
  });

  // Compute summary statistics
  const visibleResults = testResults.filter((r) => !r.isHidden);
  const hiddenResults = testResults.filter((r) => r.isHidden);

  const visiblePassed = visibleResults.filter((r) => r.passed).length;
  const hiddenPassed = hiddenResults.filter((r) => r.passed).length;
  const totalPassed = visiblePassed + hiddenPassed;

  const summary: CodingEvaluationSummary = {
    passed: totalPassed === allTestCases.length,
    testsPassed: totalPassed,
    testsTotal: allTestCases.length,
    visibleTestsPassed: visiblePassed,
    visibleTestsTotal: visibleResults.length,
    hiddenTestsPassed: hiddenPassed,
    hiddenTestsTotal: hiddenResults.length,
    hasExecutionError: !!executionErrorMessage,
    executionErrorMessage,
  };

  return {
    summary,
    testResults,
  };
}

/**
 * Run simulated coding evaluation (for DEV_SIMULATOR=true)
 *
 * Returns fake results based on whether code is present.
 * Use only for development when Piston is not available.
 */
export function runSimulatedCodingEvaluation(
  input: CodingEvaluationInput
): CodingEvaluationOutput {
  const { submission, testCases, hiddenTests = [] } = input;

  const code = extractCode(submission);
  const hasCode = !!code;

  // Combine visible and hidden test cases
  const allTestCases = [
    ...testCases.map((tc) => ({ ...tc, isHidden: tc.isHidden ?? false })),
    ...hiddenTests.map((tc) => ({ ...tc, isHidden: true })),
  ];

  // If no test cases, create a single simulated result
  if (allTestCases.length === 0) {
    const singleResult: CodingTestResultData = {
      testIndex: 0,
      passed: hasCode,
      isHidden: false,
      expected: 'expected output',
      actual: hasCode ? 'expected output' : 'no output',
      stdout: '',
      stderr: hasCode ? '' : 'No code provided',
      durationMs: 10,
      error: hasCode ? null : 'No code to execute',
    };

    return {
      summary: {
        passed: hasCode,
        testsPassed: hasCode ? 1 : 0,
        testsTotal: 1,
        visibleTestsPassed: hasCode ? 1 : 0,
        visibleTestsTotal: 1,
        hiddenTestsPassed: 0,
        hiddenTestsTotal: 0,
        hasExecutionError: false,
      },
      testResults: [singleResult],
    };
  }

  // Simulate results for each test case
  const testResults: CodingTestResultData[] = allTestCases.map((tc, index) => ({
    testIndex: index,
    passed: hasCode,
    isHidden: tc.isHidden ?? false,
    expected: tc.isHidden && !hasCode ? null : tc.expectedOutput,
    actual: hasCode ? tc.expectedOutput : '',
    stdout: '',
    stderr: hasCode ? '' : 'No code provided',
    durationMs: 10,
    error: hasCode ? null : 'No code to execute',
  }));

  const visibleResults = testResults.filter((r) => !r.isHidden);
  const hiddenResults = testResults.filter((r) => r.isHidden);

  const visiblePassed = visibleResults.filter((r) => r.passed).length;
  const hiddenPassed = hiddenResults.filter((r) => r.passed).length;
  const totalPassed = visiblePassed + hiddenPassed;

  return {
    summary: {
      passed: hasCode && totalPassed === allTestCases.length,
      testsPassed: totalPassed,
      testsTotal: allTestCases.length,
      visibleTestsPassed: visiblePassed,
      visibleTestsTotal: visibleResults.length,
      hiddenTestsPassed: hiddenPassed,
      hiddenTestsTotal: hiddenResults.length,
      hasExecutionError: false,
    },
    testResults,
  };
}

/**
 * Extract test cases from content body
 *
 * Handles both the new ContentBody format and legacy Problem format.
 */
export function extractTestCasesFromContent(
  contentBody: Record<string, unknown>
): { testCases: ContentTestCase[]; hiddenTests: ContentTestCase[] } {
  const testCases: ContentTestCase[] = [];
  const hiddenTests: ContentTestCase[] = [];

  // Try to get testCases array
  const rawTestCases = contentBody.testCases;
  if (Array.isArray(rawTestCases)) {
    for (const tc of rawTestCases) {
      if (
        typeof tc === 'object' &&
        tc !== null &&
        'input' in tc &&
        'expectedOutput' in tc
      ) {
        const testCase: ContentTestCase = {
          input: String(tc.input ?? ''),
          expectedOutput: String(tc.expectedOutput ?? ''),
          isHidden: Boolean(tc.isHidden),
          explanation: typeof tc.explanation === 'string' ? tc.explanation : undefined,
        };

        if (testCase.isHidden) {
          hiddenTests.push(testCase);
        } else {
          testCases.push(testCase);
        }
      }
    }
  }

  // Try to get largeHiddenTests array (always hidden)
  const rawLargeHiddenTests = contentBody.largeHiddenTests;
  if (Array.isArray(rawLargeHiddenTests)) {
    for (const tc of rawLargeHiddenTests) {
      if (
        typeof tc === 'object' &&
        tc !== null &&
        'input' in tc &&
        'expectedOutput' in tc
      ) {
        hiddenTests.push({
          input: String(tc.input ?? ''),
          expectedOutput: String(tc.expectedOutput ?? ''),
          isHidden: true,
          explanation: typeof tc.explanation === 'string' ? tc.explanation : undefined,
        });
      }
    }
  }

  return { testCases, hiddenTests };
}
