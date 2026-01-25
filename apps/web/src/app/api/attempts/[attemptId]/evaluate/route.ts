import { NextRequest, NextResponse } from 'next/server';
import { TriggerEvaluationRequestSchema } from '@scaffold/contracts';
import {
  evaluationsRepo,
  submissionsRepo,
  attemptRepo,
  trackAttemptRepo,
  idGenerator,
  clock,
} from '@/lib/deps';
import { DEMO_TENANT_ID, DEMO_USER_ID } from '@/lib/constants';
import type { Track } from '@scaffold/core/entities';

/**
 * POST /api/attempts/[attemptId]/evaluate
 *
 * Triggers an evaluation run for an attempt.
 * Creates a queued evaluation run and returns the run ID/status.
 *
 * The actual evaluation is performed asynchronously (in a real system,
 * this would be picked up by a worker).
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { attemptId: string } }
) {
  try {
    const tenantId = request.headers.get('x-tenant-id') ?? DEMO_TENANT_ID;
    const userId = request.headers.get('x-user-id') ?? DEMO_USER_ID;
    const { attemptId } = params;

    // Try to find the attempt in both legacy and track systems
    let track: Track = 'coding_interview'; // Default track
    const legacyAttempt = await attemptRepo.findById(tenantId, attemptId);
    const trackAttempt = await trackAttemptRepo.findById(tenantId, attemptId);

    if (!legacyAttempt && !trackAttempt) {
      return NextResponse.json(
        { error: { code: 'ATTEMPT_NOT_FOUND', message: 'Attempt not found' } },
        { status: 404 }
      );
    }

    const attemptUserId = legacyAttempt?.userId ?? trackAttempt?.userId;
    if (attemptUserId !== userId) {
      return NextResponse.json(
        { error: { code: 'FORBIDDEN', message: 'Attempt does not belong to user' } },
        { status: 403 }
      );
    }

    // Determine track from track attempt or default
    if (trackAttempt) {
      track = trackAttempt.track;
    }

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
    let submission = null;
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

    // In a real system, we would:
    // 1. Publish a message to a queue for async processing
    // 2. A worker would pick up the message and run the evaluation
    // 3. The worker would update the evaluation run status

    // For now, we'll simulate immediate execution for coding_tests
    // P0 fix: Wrap in try-catch to ensure evaluation run status is updated on error
    if (evaluationType === 'coding_tests' && submission) {
      try {
        // This would normally be done by a worker
        await runCodingTestsEvaluation(evaluationRun.id, submission, attemptId, userId, track);
      } catch (evalError) {
        console.error('Evaluation execution failed:', evalError);
        // Mark the evaluation as failed so it doesn't stay in queued status
        try {
          await evaluationsRepo.markEvaluationRunCompleted(evaluationRun.id, {
            status: 'failed',
            summary: {
              error: 'Evaluation execution failed',
              details: evalError instanceof Error ? evalError.message : 'Unknown error',
            },
          });
        } catch (markError) {
          console.error('Failed to mark evaluation as failed:', markError);
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

    // Verify the attempt exists and belongs to the user
    const legacyAttempt = await attemptRepo.findById(tenantId, attemptId);
    const trackAttempt = await trackAttemptRepo.findById(tenantId, attemptId);

    if (!legacyAttempt && !trackAttempt) {
      return NextResponse.json(
        { error: { code: 'ATTEMPT_NOT_FOUND', message: 'Attempt not found' } },
        { status: 404 }
      );
    }

    const attemptUserId = legacyAttempt?.userId ?? trackAttempt?.userId;
    if (attemptUserId !== userId) {
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
 * Run coding tests evaluation (simplified inline execution)
 *
 * In a real system, this would be done by a worker process.
 */
async function runCodingTestsEvaluation(
  evaluationRunId: string,
  submission: { contentText: string | null; contentJson: Record<string, unknown> },
  attemptId: string,
  userId: string,
  track: Track
): Promise<void> {
  try {
    // Mark as running
    await evaluationsRepo.markEvaluationRunRunning(evaluationRunId);

    // In a real implementation, we would:
    // 1. Get the content/problem for this attempt
    // 2. Extract test cases
    // 3. Execute the submission code against test cases
    // 4. Record results

    // For now, simulate a simple pass/fail based on whether there's code
    const hasCode = submission.contentText || submission.contentJson?.code;

    // Simulate test results
    const testResults = [
      {
        testIndex: 0,
        passed: !!hasCode,
        isHidden: false,
        expected: 'expected output',
        actual: hasCode ? 'expected output' : 'no output',
        stdout: '',
        stderr: hasCode ? '' : 'No code provided',
        durationMs: 10,
        error: hasCode ? null : 'No code to execute',
      },
    ];

    // Write test results
    await evaluationsRepo.writeCodingTestResults(evaluationRunId, testResults);

    // Mark as completed
    const passed = testResults.every((r) => r.passed);
    await evaluationsRepo.markEvaluationRunCompleted(evaluationRunId, {
      status: 'succeeded',
      summary: {
        passed,
        testsPassed: testResults.filter((r) => r.passed).length,
        testsTotal: testResults.length,
      },
      details: {
        testResults,
      },
    });
  } catch (error) {
    // Mark as failed
    await evaluationsRepo.markEvaluationRunCompleted(evaluationRunId, {
      status: 'failed',
      summary: {
        error: error instanceof Error ? error.message : 'Unknown error',
      },
    });
  }
}
