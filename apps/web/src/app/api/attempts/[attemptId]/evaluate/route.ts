import { NextRequest, NextResponse } from 'next/server';
import { TriggerEvaluationRequestSchema } from '@scaffold/contracts';
import {
  evaluationsRepo,
  submissionsRepo,
  attemptRepo,
  contentBankRepo,
  contentRepo,
  idGenerator,
  codeExecutor,
} from '@/lib/deps';
import { DEMO_TENANT_ID, DEMO_USER_ID } from '@/lib/constants';
import type { Track, Submission, TrackAttempt } from '@scaffold/core/entities';
import { isLegacyAttempt, isTrackAttempt } from '@scaffold/core/entities';
import {
  runCodingEvaluation,
  runSimulatedCodingEvaluation,
  extractTestCasesFromContent,
  NoCodeProvidedError,
  LanguageNotSpecifiedError,
  NoTestCasesError,
  type CodingEvaluationOutput,
} from '@/lib/evaluators/coding-evaluator';

/**
 * Check if simulator mode is enabled.
 * Simulator mode is ONLY enabled when DEV_SIMULATOR=true explicitly.
 * Default is false (real execution).
 */
function isSimulatorMode(): boolean {
  return process.env.DEV_SIMULATOR === 'true';
}

/**
 * POST /api/attempts/[attemptId]/evaluate
 *
 * Triggers an evaluation run for an attempt.
 * Creates a queued evaluation run and returns the run ID/status.
 *
 * For coding_interview track:
 * - Runs real code execution via Piston (default)
 * - Set DEV_SIMULATOR=true to use simulated results (development only)
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { attemptId: string } }
) {
  try {
    const tenantId = request.headers.get('x-tenant-id') ?? DEMO_TENANT_ID;
    const userId = request.headers.get('x-user-id') ?? DEMO_USER_ID;
    const { attemptId } = params;

    // Find the attempt using unified repo (handles both legacy and track attempts)
    const attempt = await attemptRepo.findById(tenantId, attemptId);

    if (!attempt) {
      return NextResponse.json(
        { error: { code: 'ATTEMPT_NOT_FOUND', message: 'Attempt not found' } },
        { status: 404 }
      );
    }

    if (attempt.userId !== userId) {
      return NextResponse.json(
        { error: { code: 'FORBIDDEN', message: 'Attempt does not belong to user' } },
        { status: 403 }
      );
    }

    // Determine track from attempt type
    const track: Track = isTrackAttempt(attempt) ? attempt.track : 'coding_interview';

    // Parse and validate request body
    const body = await request.json().catch(() => ({}));
    const parsed = TriggerEvaluationRequestSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: parsed.error.message } },
        { status: 400 }
      );
    }

    const { submissionId, type } = parsed.data;

    // Get the submission to evaluate
    let submission: Submission | null = null;
    if (submissionId) {
      submission = await submissionsRepo.getSubmission(submissionId);
      if (!submission || submission.attemptId !== attemptId) {
        return NextResponse.json(
          { error: { code: 'SUBMISSION_NOT_FOUND', message: 'Submission not found' } },
          { status: 404 }
        );
      }
    } else {
      // Use latest submission for this attempt
      submission = await submissionsRepo.getLatestSubmission(attemptId);
    }

    // Determine evaluation type based on track if not specified
    const evaluationType = type ?? getDefaultEvaluationType(track);

    // Create the evaluation run in queued status
    const evaluationRun = await evaluationsRepo.createEvaluationRunQueued({
      id: idGenerator.generate(),
      attemptId,
      submissionId: submission?.id ?? null,
      userId,
      track,
      type: evaluationType,
    });

    // Execute evaluation for coding_tests
    if (evaluationType === 'coding_tests' && submission) {
      try {
        // Determine content source based on attempt type
        const trackAttemptData: { contentItemId: string; versionId: string } | null =
          isTrackAttempt(attempt)
            ? { contentItemId: attempt.contentItemId, versionId: attempt.contentVersionId ?? '' }
            : null;

        const legacyProblemId = isLegacyAttempt(attempt) ? attempt.problemId : null;

        await runCodingTestsEvaluation(
          evaluationRun.id,
          submission,
          attemptId,
          tenantId,
          trackAttemptData,
          legacyProblemId
        );
      } catch (evalError) {
        console.error('Evaluation execution failed:', evalError);

        // Determine appropriate error response
        const errorInfo = getEvaluationErrorInfo(evalError);

        // Mark the evaluation as failed
        try {
          await evaluationsRepo.markEvaluationRunCompleted(evaluationRun.id, {
            status: 'failed',
            summary: {
              error: errorInfo.message,
              errorCode: errorInfo.code,
            },
          });
        } catch (markError) {
          console.error('Failed to mark evaluation as failed:', markError);
        }

        // For configuration errors, return a clear actionable response
        if (errorInfo.isConfigError) {
          return NextResponse.json(
            {
              error: {
                code: errorInfo.code,
                message: errorInfo.message,
              },
              evaluationRun: await evaluationsRepo.getEvaluationRun(evaluationRun.id),
            },
            { status: 503 }
          );
        }
      }
    }

    // Return the evaluation run (may be queued or already completed)
    const finalRun = await evaluationsRepo.getEvaluationRun(evaluationRun.id);

    return NextResponse.json({ evaluationRun: finalRun }, { status: 202 });
  } catch (error) {
    console.error('Error triggering evaluation:', error);
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Failed to trigger evaluation' } },
      { status: 500 }
    );
  }
}

/**
 * GET /api/attempts/[attemptId]/evaluate
 *
 * Gets the latest evaluation run status and results for an attempt.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { attemptId: string } }
) {
  try {
    const tenantId = request.headers.get('x-tenant-id') ?? DEMO_TENANT_ID;
    const userId = request.headers.get('x-user-id') ?? DEMO_USER_ID;
    const { attemptId } = params;

    // Verify the attempt exists and belongs to the user using unified repo
    const attempt = await attemptRepo.findById(tenantId, attemptId);

    if (!attempt) {
      return NextResponse.json(
        { error: { code: 'ATTEMPT_NOT_FOUND', message: 'Attempt not found' } },
        { status: 404 }
      );
    }

    if (attempt.userId !== userId) {
      return NextResponse.json(
        { error: { code: 'FORBIDDEN', message: 'Attempt does not belong to user' } },
        { status: 403 }
      );
    }

    // Get the latest evaluation run
    const evaluationRun = await evaluationsRepo.getLatestEvaluationRun(attemptId);

    if (!evaluationRun) {
      return NextResponse.json({
        evaluationRun: null,
      });
    }

    // Get test results if it's a coding tests evaluation
    let testResults = undefined;
    if (evaluationRun.type === 'coding_tests') {
      testResults = await evaluationsRepo.getCodingTestResults(evaluationRun.id);
    }

    return NextResponse.json({
      evaluationRun,
      testResults,
    });
  } catch (error) {
    console.error('Error getting evaluation:', error);
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Failed to get evaluation' } },
      { status: 500 }
    );
  }
}

/**
 * Get the default evaluation type based on track
 */
function getDefaultEvaluationType(track: Track): 'coding_tests' | 'debug_gate' | 'rubric' | 'ai_review' {
  switch (track) {
    case 'coding_interview':
      return 'coding_tests';
    case 'debug_lab':
      return 'debug_gate';
    case 'system_design':
      return 'rubric';
    default:
      return 'coding_tests';
  }
}

/**
 * Extract error info for user-friendly error responses
 */
function getEvaluationErrorInfo(error: unknown): {
  code: string;
  message: string;
  isConfigError: boolean;
} {
  if (error instanceof NoCodeProvidedError) {
    return {
      code: 'NO_CODE_PROVIDED',
      message: error.message,
      isConfigError: false,
    };
  }

  if (error instanceof LanguageNotSpecifiedError) {
    return {
      code: 'LANGUAGE_NOT_SPECIFIED',
      message: error.message,
      isConfigError: false,
    };
  }

  if (error instanceof NoTestCasesError) {
    return {
      code: 'NO_TEST_CASES',
      message: error.message,
      isConfigError: true,
    };
  }

  // Check for Piston-related errors
  if (error instanceof Error) {
    if (error.message.includes('ECONNREFUSED') || error.message.includes('fetch failed')) {
      return {
        code: 'CODE_RUNNER_UNAVAILABLE',
        message:
          'Code execution service is not available. ' +
          'Ensure PISTON_API_URL is set and the Piston service is running, ' +
          'or set DEV_SIMULATOR=true to use simulated results.',
        isConfigError: true,
      };
    }
  }

  return {
    code: 'EVALUATION_FAILED',
    message: error instanceof Error ? error.message : 'Unknown evaluation error',
    isConfigError: false,
  };
}

/**
 * Run coding tests evaluation with real code execution or simulation
 *
 * Content source priority:
 * 1. trackAttempt - uses content bank via versionId
 * 2. legacyProblemId - uses legacy content repo
 */
async function runCodingTestsEvaluation(
  evaluationRunId: string,
  submission: Submission,
  attemptId: string,
  tenantId: string,
  trackAttempt: { contentItemId: string; versionId: string } | null,
  legacyProblemId: string | null
): Promise<void> {
  // Mark as running
  await evaluationsRepo.markEvaluationRunRunning(evaluationRunId);

  // Get test cases from content
  let testCases: ReturnType<typeof extractTestCasesFromContent>;

  if (trackAttempt) {
    // New track-based attempt - get content from content bank
    const contentVersion = await contentBankRepo.getContentVersion(trackAttempt.versionId);
    if (!contentVersion) {
      throw new Error('Content version not found for this attempt');
    }
    testCases = extractTestCasesFromContent(contentVersion.body);
  } else if (legacyProblemId) {
    // Legacy attempt - get problem from content repo
    const problem = await contentRepo.findById(tenantId, legacyProblemId);
    if (!problem) {
      throw new Error('Problem not found for this attempt');
    }
    // Convert legacy problem format to content body format
    testCases = extractTestCasesFromContent({
      testCases: problem.testCases,
      largeHiddenTests: problem.largeHiddenTests,
    });
  } else {
    throw new Error('No content source found for this attempt');
  }

  // Run evaluation - real or simulated based on DEV_SIMULATOR env
  let evaluationOutput: CodingEvaluationOutput;

  if (isSimulatorMode()) {
    console.log('[evaluate] Running in SIMULATOR mode (DEV_SIMULATOR=true)');
    evaluationOutput = runSimulatedCodingEvaluation({
      submission: {
        contentText: submission.contentText,
        contentJson: submission.contentJson as Record<string, unknown>,
        language: submission.language,
      },
      testCases: testCases.testCases,
      hiddenTests: testCases.hiddenTests,
    });
  } else {
    console.log('[evaluate] Running REAL code execution via Piston');
    evaluationOutput = await runCodingEvaluation(
      {
        submission: {
          contentText: submission.contentText,
          contentJson: submission.contentJson as Record<string, unknown>,
          language: submission.language,
        },
        testCases: testCases.testCases,
        hiddenTests: testCases.hiddenTests,
      },
      codeExecutor
    );
  }

  // Persist test results
  await evaluationsRepo.writeCodingTestResults(
    evaluationRunId,
    evaluationOutput.testResults.map((r) => ({
      testIndex: r.testIndex,
      passed: r.passed,
      isHidden: r.isHidden,
      expected: r.expected,
      actual: r.actual,
      stdout: r.stdout,
      stderr: r.stderr,
      durationMs: r.durationMs,
      error: r.error,
    }))
  );

  // Mark as completed
  await evaluationsRepo.markEvaluationRunCompleted(evaluationRunId, {
    status: 'succeeded',
    summary: {
      passed: evaluationOutput.summary.passed,
      testsPassed: evaluationOutput.summary.testsPassed,
      testsTotal: evaluationOutput.summary.testsTotal,
      visibleTestsPassed: evaluationOutput.summary.visibleTestsPassed,
      visibleTestsTotal: evaluationOutput.summary.visibleTestsTotal,
      hiddenTestsPassed: evaluationOutput.summary.hiddenTestsPassed,
      hiddenTestsTotal: evaluationOutput.summary.hiddenTestsTotal,
      hasExecutionError: evaluationOutput.summary.hasExecutionError,
      executionErrorMessage: evaluationOutput.summary.executionErrorMessage,
      simulatorMode: isSimulatorMode(),
    },
    details: {
      testResults: evaluationOutput.testResults,
    },
  });
}
