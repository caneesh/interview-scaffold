import { NextRequest, NextResponse } from 'next/server';
import { debugLabRepo } from '@/lib/debug-lab-repo';
import { DEMO_TENANT_ID, DEMO_USER_ID } from '@/lib/constants';
import { clock, pistonClient } from '@/lib/deps';
import { determineSignalType, type ExecutionResult, type DebugLabSubmission } from '@scaffold/core';

/**
 * POST /api/debug-lab/:attemptId/submit
 *
 * Submit final code fix and explanation
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ attemptId: string }> }
) {
  try {
    const tenantId = request.headers.get('x-tenant-id') ?? DEMO_TENANT_ID;
    const userId = request.headers.get('x-user-id') ?? DEMO_USER_ID;
    const { attemptId } = await params;

    const body = await request.json();
    const { files, explanation } = body as { files: Record<string, string>; explanation: string };

    if (!files || typeof files !== 'object') {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: 'files is required' } },
        { status: 400 }
      );
    }

    if (!explanation || explanation.length < 10) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: 'explanation must be at least 10 characters' } },
        { status: 400 }
      );
    }

    // Find attempt
    const attempt = await debugLabRepo.findAttemptById(tenantId, attemptId);
    if (!attempt) {
      return NextResponse.json(
        { error: { code: 'NOT_FOUND', message: 'Attempt not found' } },
        { status: 404 }
      );
    }

    // Verify ownership
    if (attempt.userId !== userId) {
      return NextResponse.json(
        { error: { code: 'FORBIDDEN', message: 'Not your attempt' } },
        { status: 403 }
      );
    }

    // Get the item
    const item = await debugLabRepo.findItemById(tenantId, attempt.itemId);
    if (!item) {
      return NextResponse.json(
        { error: { code: 'NOT_FOUND', message: 'Item not found' } },
        { status: 404 }
      );
    }

    // Check if triage is required but not completed
    if (item.requiredTriage && attempt.status === 'STARTED') {
      return NextResponse.json(
        { error: { code: 'TRIAGE_REQUIRED', message: 'Please complete triage before submitting' } },
        { status: 400 }
      );
    }

    // Execute tests
    const executionResult = await executeTests(item, files);

    // Also run hidden tests if they exist
    let hiddenTestsResult: ExecutionResult['hiddenTestsResult'];
    if (item.hiddenTests && item.hiddenTests.length > 0) {
      const hiddenResult = await executeHiddenTests({
        files: item.files,
        hiddenTests: item.hiddenTests,
        testCommand: item.testCommand,
        language: item.language,
      }, files);
      hiddenTestsResult = {
        passed: hiddenResult.passed,
        testsPassed: hiddenResult.testsPassed,
        testsTotal: hiddenResult.testsTotal,
      };
    }

    // Determine final pass/fail
    const passed = executionResult.passed && (!hiddenTestsResult || hiddenTestsResult.passed);

    // Create submission
    const submission: DebugLabSubmission = {
      files,
      explanation,
      submittedAt: clock.now(),
    };

    // Update attempt
    const now = clock.now();
    const updatedAttempt = await debugLabRepo.updateAttempt({
      ...attempt,
      status: passed ? 'PASSED' : 'FAILED',
      submission,
      executionResult: {
        ...executionResult,
        hiddenTestsResult,
      },
      submissionCount: attempt.submissionCount + 1,
      completedAt: now,
    });

    // Build response
    const response: {
      attempt: typeof updatedAttempt;
      executionResult: ExecutionResult;
      passed: boolean;
      taxonomy: {
        defectCategory: typeof item.defectCategory;
        severity: typeof item.severity;
        priority: typeof item.priority;
        signals: typeof item.signals;
      };
      solutionExplanation?: string;
    } = {
      attempt: updatedAttempt,
      executionResult: {
        ...executionResult,
        hiddenTestsResult,
      },
      passed,
      taxonomy: {
        defectCategory: item.defectCategory,
        severity: item.severity,
        priority: item.priority,
        signals: item.signals,
      },
    };

    // Include solution explanation on pass or after 3 attempts
    if (passed || attempt.submissionCount >= 2) {
      response.solutionExplanation = item.solutionExplanation;
    }

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error submitting debug lab:', error);
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Failed to submit' } },
      { status: 500 }
    );
  }
}

/**
 * Execute tests for a debug lab item
 */
async function executeTests(
  item: {
    files: readonly { path: string; content: string; editable: boolean }[];
    testCommand: string;
    language: string;
  },
  modifiedFiles: Record<string, string>
): Promise<ExecutionResult> {
  const startTime = Date.now();

  // Build the workspace: merge original files with modifications
  const pistonFiles: { name: string; content: string }[] = [];

  for (const file of item.files) {
    const content = modifiedFiles[file.path] ?? file.content;
    pistonFiles.push({ name: file.path, content });
  }

  // Extract the test file from the testCommand (e.g., "node test.js" -> "test.js")
  const testFile = item.testCommand.replace('node ', '').trim();

  try {
    // Execute tests directly using Piston
    // The test files include inline test frameworks that don't need external deps
    const response = await pistonClient.execute({
      language: 'javascript',
      version: '*',
      files: pistonFiles,
      run_timeout: 30000,
      compile_timeout: 10000,
      // Specify which file to run
      main: testFile,
    });

    const stdout = response.run.stdout || '';
    const stderr = response.run.stderr || '';
    const exitCode = response.run.code;
    const timedOut = response.run.signal === 'SIGKILL';

    const { testsPassed, testsTotal } = parseTestOutput(stdout);
    const signalType = determineSignalType(exitCode, stdout, stderr, timedOut);

    return {
      passed: exitCode === 0 && signalType === 'success',
      signalType,
      testsPassed,
      testsTotal,
      stdout,
      stderr,
      exitCode,
      executionTimeMs: Date.now() - startTime,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return {
      passed: false,
      signalType: 'runtime_error',
      testsPassed: 0,
      testsTotal: 0,
      stdout: '',
      stderr: errorMessage,
      exitCode: 1,
      executionTimeMs: Date.now() - startTime,
    };
  }
}

/**
 * Execute hidden tests
 */
async function executeHiddenTests(
  item: {
    files: readonly { path: string; content: string; editable: boolean }[];
    hiddenTests?: readonly { path: string; content: string; editable: boolean }[];
    testCommand: string;
    language: string;
  },
  modifiedFiles: Record<string, string>
): Promise<ExecutionResult> {
  const startTime = Date.now();

  if (!item.hiddenTests || item.hiddenTests.length === 0) {
    return {
      passed: true,
      signalType: 'success',
      testsPassed: 0,
      testsTotal: 0,
      stdout: 'No hidden tests',
      stderr: '',
      exitCode: 0,
      executionTimeMs: 0,
    };
  }

  // Merge source files (not test files) with hidden tests
  const pistonFiles: { name: string; content: string }[] = [];

  for (const file of item.files) {
    // Skip test files from original (we'll use hidden tests)
    if (file.path === 'test.js' || file.path.includes('.test.')) continue;
    const content = modifiedFiles[file.path] ?? file.content;
    pistonFiles.push({ name: file.path, content });
  }

  for (const file of item.hiddenTests) {
    pistonFiles.push({ name: file.path, content: file.content });
  }

  // Hidden tests should have a test.js file
  const testFile = 'test.js';

  try {
    const response = await pistonClient.execute({
      language: 'javascript',
      version: '*',
      files: pistonFiles,
      run_timeout: 30000,
      compile_timeout: 10000,
      main: testFile,
    });

    const stdout = response.run.stdout || '';
    const stderr = response.run.stderr || '';
    const exitCode = response.run.code;
    const timedOut = response.run.signal === 'SIGKILL';

    const { testsPassed, testsTotal } = parseTestOutput(stdout);
    const signalType = determineSignalType(exitCode, stdout, stderr, timedOut);

    return {
      passed: exitCode === 0 && signalType === 'success',
      signalType,
      testsPassed,
      testsTotal,
      stdout,
      stderr,
      exitCode,
      executionTimeMs: Date.now() - startTime,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return {
      passed: false,
      signalType: 'runtime_error',
      testsPassed: 0,
      testsTotal: 0,
      stdout: '',
      stderr: errorMessage,
      exitCode: 1,
      executionTimeMs: Date.now() - startTime,
    };
  }
}

/**
 * Parse test output to extract test counts
 * Supports format: "Tests: X passed, Y total"
 */
function parseTestOutput(stdout: string): { testsPassed: number; testsTotal: number } {
  // Our inline test framework outputs: "Tests: X passed, Y total"
  const testsMatch = stdout.match(/Tests:\s+(\d+)\s+passed,\s+(\d+)\s+total/);
  if (testsMatch && testsMatch[1] && testsMatch[2]) {
    return {
      testsPassed: parseInt(testsMatch[1], 10),
      testsTotal: parseInt(testsMatch[2], 10),
    };
  }

  // Count checkmarks and X marks as fallback
  const passedCount = (stdout.match(/✓/g) || []).length;
  const failedCount = (stdout.match(/✗/g) || []).length;

  if (passedCount > 0 || failedCount > 0) {
    return {
      testsPassed: passedCount,
      testsTotal: passedCount + failedCount,
    };
  }

  return { testsPassed: 0, testsTotal: 0 };
}
