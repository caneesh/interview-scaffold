import { NextRequest, NextResponse } from 'next/server';
import { debugLabRepo } from '@/lib/debug-lab-repo';
import { DEMO_TENANT_ID, DEMO_USER_ID } from '@/lib/constants';
import { pistonClient } from '@/lib/deps';
import { determineSignalType, type ExecutionResult } from '@scaffold/core';

/**
 * POST /api/debug-lab/:attemptId/run-tests
 *
 * Run tests on modified files (optional, before final submit)
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
    const { files } = body as { files: Record<string, string> };

    if (!files || typeof files !== 'object') {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: 'files is required' } },
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
        { error: { code: 'TRIAGE_REQUIRED', message: 'Please complete triage before running tests' } },
        { status: 400 }
      );
    }

    // Execute tests
    const executionResult = await executeTests(item, files);

    // Update attempt with test run count
    const updatedAttempt = await debugLabRepo.updateAttempt({
      ...attempt,
      testRunCount: attempt.testRunCount + 1,
      executionResult,
    });

    return NextResponse.json({
      attempt: updatedAttempt,
      executionResult,
    });
  } catch (error) {
    console.error('Error running tests:', error);
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Failed to run tests' } },
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
    hiddenTests?: readonly { path: string; content: string; editable: boolean }[];
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

    // Parse test results from output
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
    // Execution failed entirely
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
