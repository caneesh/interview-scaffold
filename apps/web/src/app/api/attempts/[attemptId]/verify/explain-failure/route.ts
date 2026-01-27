import { NextRequest, NextResponse } from 'next/server';
import { attemptRepo, clock } from '@/lib/deps';
import {
  isV2Attempt,
  type VerifyPayload,
  type VerifyFailureExplanation,
} from '@scaffold/core/entities';
import { DEMO_TENANT_ID, DEMO_USER_ID } from '@/lib/constants';

/**
 * Request body for explaining a test failure
 */
interface ExplainFailureRequest {
  testIndex: number;
  testInput: string;
  expected: string;
  actual: string;
  userExplanation: string;
}

/**
 * Response with AI guidance on the failure
 */
interface ExplainFailureResponse {
  likelyBugType: string;
  failingCaseExplanation: string;
  suggestedNextDebugStep: string;
  // Note: NEVER contains solution code
  attempt: unknown;
}

/**
 * POST /api/attempts/[attemptId]/verify/explain-failure
 *
 * Gets AI help explaining why a test failed.
 * The user provides their explanation of why they think it failed,
 * and the AI provides guidance without revealing the solution.
 *
 * Rate limit: Consider adding rate limiting for LLM calls
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { attemptId: string } }
) {
  try {
    const tenantId = request.headers.get('x-tenant-id') ?? DEMO_TENANT_ID;
    const userId = request.headers.get('x-user-id') ?? DEMO_USER_ID;

    // Parse request body
    const body = (await request.json()) as ExplainFailureRequest;

    // Validate
    if (typeof body.testIndex !== 'number' || body.testIndex < 0) {
      return NextResponse.json(
        {
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Valid test index is required',
          },
        },
        { status: 400 }
      );
    }

    if (!body.userExplanation || body.userExplanation.trim().length < 10) {
      return NextResponse.json(
        {
          error: {
            code: 'VALIDATION_ERROR',
            message: 'User explanation must be at least 10 characters',
          },
        },
        { status: 400 }
      );
    }

    // Get attempt
    const attempt = await attemptRepo.findById(tenantId, params.attemptId);
    if (!attempt) {
      return NextResponse.json(
        { error: { code: 'ATTEMPT_NOT_FOUND', message: 'Attempt not found' } },
        { status: 404 }
      );
    }

    // Verify user owns the attempt
    if (attempt.userId !== userId) {
      return NextResponse.json(
        { error: { code: 'FORBIDDEN', message: 'You do not own this attempt' } },
        { status: 403 }
      );
    }

    // Verify this is a V2 attempt
    if (!isV2Attempt(attempt)) {
      return NextResponse.json(
        {
          error: {
            code: 'NOT_V2_ATTEMPT',
            message: 'This endpoint is only for V2 attempts',
          },
        },
        { status: 400 }
      );
    }

    // Verify we're in the VERIFY step
    if (attempt.v2Step !== 'VERIFY') {
      return NextResponse.json(
        {
          error: {
            code: 'INVALID_STEP',
            message: `Cannot explain failure in ${attempt.v2Step} step`,
          },
        },
        { status: 409 }
      );
    }

    // Verify we have test results
    if (!attempt.verifyPayload?.testResults?.length) {
      return NextResponse.json(
        {
          error: {
            code: 'NO_TEST_RESULTS',
            message: 'No test results available. Run tests first.',
          },
        },
        { status: 400 }
      );
    }

    // TODO: Call LLM to explain the failure
    // The LLM would:
    // 1. Analyze the test case (input, expected, actual)
    // 2. Consider the user's explanation
    // 3. Identify likely bug types
    // 4. Suggest debugging steps
    // IMPORTANT: Never provide solution code

    // Placeholder AI guidance
    const likelyBugType = 'Off-by-one error or boundary condition';
    const failingCaseExplanation =
      'Based on the difference between expected and actual output, it appears the code may not be handling edge cases correctly. Consider what happens at the boundaries of your loop or array access.';
    const suggestedNextDebugStep =
      'Try tracing through your code manually with this specific input. Pay attention to loop conditions and array indices.';

    // Create failure explanation record
    const failureExplanation: VerifyFailureExplanation = {
      testIndex: body.testIndex,
      userExplanation: body.userExplanation.trim(),
      aiGuidance: `${likelyBugType}: ${failingCaseExplanation} ${suggestedNextDebugStep}`,
      timestamp: clock.now(),
    };

    // Update verify payload with new explanation
    const verifyPayload: VerifyPayload = {
      testResults: attempt.verifyPayload.testResults,
      failureExplanations: [
        ...attempt.verifyPayload.failureExplanations,
        failureExplanation,
      ],
      traceNotes: attempt.verifyPayload.traceNotes,
    };

    const updatedAttempt = await attemptRepo.update({
      ...attempt,
      verifyPayload,
    });

    const response: ExplainFailureResponse = {
      likelyBugType,
      failingCaseExplanation,
      suggestedNextDebugStep,
      attempt: updatedAttempt,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error explaining failure:', error);
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'An unexpected error occurred' } },
      { status: 500 }
    );
  }
}
