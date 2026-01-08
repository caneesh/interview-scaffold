import type { TestResultData } from '@scaffold/core/entities';
import type { CodeExecutor } from '@scaffold/core/use-cases';
import type { PistonExecutorConfig, PistonOutputStage } from './types.js';
import { createPistonClient, type PistonClient, PistonApiError } from './piston-client.js';
import { LANGUAGE_CONFIGS, normalizeLanguage } from './language-configs.js';
import { getWrapper } from './wrappers/index.js';

const MAX_CODE_LENGTH = 50000; // 50KB

export function createPistonExecutor(
  config: PistonExecutorConfig = {}
): CodeExecutor {
  const client = createPistonClient(config);

  return {
    async execute(
      code: string,
      language: string,
      testCases: readonly { input: string; expectedOutput: string }[]
    ): Promise<readonly TestResultData[]> {
      // Validate language
      const normalizedLang = normalizeLanguage(language);
      if (!normalizedLang) {
        return createErrorResults(testCases, `Unsupported language: ${language}`);
      }

      // Validate code length
      if (code.length > MAX_CODE_LENGTH) {
        return createErrorResults(testCases, 'Code exceeds maximum length (50KB)');
      }

      // Validate non-empty code
      if (code.trim().length === 0) {
        return createErrorResults(testCases, 'Code cannot be empty');
      }

      const langConfig = LANGUAGE_CONFIGS[normalizedLang];
      const wrapper = getWrapper(normalizedLang);

      // Extract function name from user code
      const functionName = wrapper.extractFunctionName(code);
      if (!functionName) {
        return createErrorResults(
          testCases,
          'Could not detect function name in code. Make sure your code contains a function definition.'
        );
      }

      // Execute each test case with delay to respect rate limits
      const results: TestResultData[] = [];
      const RATE_LIMIT_DELAY_MS = 250; // Piston public API: 1 req per 200ms

      for (let i = 0; i < testCases.length; i++) {
        // Add delay between requests to avoid rate limiting
        if (i > 0) {
          await sleep(RATE_LIMIT_DELAY_MS);
        }

        const result = await executeTestCase(
          client,
          langConfig,
          wrapper,
          code,
          functionName,
          testCases[i]!,
          config
        );
        results.push(result);
      }

      return results;
    },
  };
}

async function executeTestCase(
  client: PistonClient,
  langConfig: typeof LANGUAGE_CONFIGS[keyof typeof LANGUAGE_CONFIGS],
  wrapper: ReturnType<typeof getWrapper>,
  userCode: string,
  functionName: string,
  testCase: { input: string; expectedOutput: string },
  config: PistonExecutorConfig
): Promise<TestResultData> {
  try {
    const wrappedCode = wrapper.wrap(userCode, testCase.input, functionName);

    const response = await client.execute({
      language: langConfig.pistonLanguage,
      version: langConfig.pistonVersion,
      files: [
        {
          name: langConfig.fileName,
          content: wrappedCode,
        },
      ],
      compile_timeout: config.compileTimeout ?? langConfig.compileTimeout,
      run_timeout: config.runTimeout ?? langConfig.runTimeout,
      run_memory_limit: config.memoryLimit ?? -1,
    });

    // Check for compilation errors
    if (response.compile && response.compile.code !== 0) {
      return {
        input: testCase.input,
        expected: testCase.expectedOutput,
        actual: '',
        passed: false,
        error: `Compilation error: ${response.compile.stderr || response.compile.message || 'Unknown compilation error'}`,
      };
    }

    // Check for runtime errors
    if (response.run.code !== 0 || response.run.status) {
      const errorMessage = mapStatusToError(response.run);
      return {
        input: testCase.input,
        expected: testCase.expectedOutput,
        actual: '',
        passed: false,
        error: errorMessage,
      };
    }

    // Parse output
    const { result: actual, error } = wrapper.parseOutput(response.run.stdout);

    if (error) {
      return {
        input: testCase.input,
        expected: testCase.expectedOutput,
        actual: '',
        passed: false,
        error: `Runtime error: ${error}`,
      };
    }

    const passed = compareOutput(actual, testCase.expectedOutput);

    return {
      input: testCase.input,
      expected: testCase.expectedOutput,
      actual,
      passed,
      error: null,
    };
  } catch (error) {
    const errorMessage =
      error instanceof PistonApiError
        ? `Code execution service error: ${error.message}`
        : error instanceof Error
          ? error.message
          : 'Unknown error during code execution';

    return {
      input: testCase.input,
      expected: testCase.expectedOutput,
      actual: '',
      passed: false,
      error: errorMessage,
    };
  }
}

function mapStatusToError(run: PistonOutputStage): string {
  switch (run.status) {
    case 'TO':
      return 'Time Limit Exceeded';
    case 'RE':
      return `Runtime Error: ${run.stderr || run.message || 'Unknown error'}`;
    case 'SG':
      return `Process killed by signal: ${run.signal}`;
    case 'OL':
      return 'Output Limit Exceeded';
    case 'XX':
      return 'Internal execution error';
    default:
      if (run.stderr) {
        return `Runtime Error: ${run.stderr}`;
      }
      if (run.message) {
        return run.message;
      }
      return 'Execution failed';
  }
}

function compareOutput(actual: string, expected: string): boolean {
  // Normalize both outputs for comparison
  const normalizeOutput = (s: string): string => {
    // Parse JSON if possible for proper comparison
    try {
      const parsed = JSON.parse(s);
      return JSON.stringify(parsed);
    } catch {
      // Not JSON, normalize whitespace
      return s.trim().replace(/\s+/g, ' ');
    }
  };

  const normalizedActual = normalizeOutput(actual);
  const normalizedExpected = normalizeOutput(expected);

  return normalizedActual === normalizedExpected;
}

function createErrorResults(
  testCases: readonly { input: string; expectedOutput: string }[],
  error: string
): TestResultData[] {
  return testCases.map((tc) => ({
    input: tc.input,
    expected: tc.expectedOutput,
    actual: '',
    passed: false,
    error,
  }));
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Creates a PistonExecutor with graceful fallback on service unavailability.
 */
export function createPistonExecutorWithFallback(
  config: PistonExecutorConfig = {}
): CodeExecutor {
  const executor = createPistonExecutor(config);

  return {
    async execute(code, language, testCases) {
      try {
        return await executor.execute(code, language, testCases);
      } catch {
        // Service unavailable - return all tests as failed with error
        return testCases.map((tc) => ({
          input: tc.input,
          expected: tc.expectedOutput,
          actual: '',
          passed: false,
          error: 'Code execution service temporarily unavailable',
        }));
      }
    },
  };
}
