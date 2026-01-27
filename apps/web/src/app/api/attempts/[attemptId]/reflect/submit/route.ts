import { NextRequest, NextResponse } from 'next/server';
import { attemptRepo, clock } from '@/lib/deps';
import { isV2Attempt, type ReflectPayload } from '@scaffold/core/entities';
import { assertCanTransition, InvalidTransitionError } from '@scaffold/core/validation';
import { DEMO_TENANT_ID, DEMO_USER_ID } from '@/lib/constants';

/**
 * Request body for submitting reflection
 */
interface SubmitReflectRequest {
  cuesNextTime: string[];
  invariantSummary: string;
  microLessonId?: string;
  adversaryChallengeCompleted?: boolean;
}

/**
 * Response from reflection submission
 */
interface SubmitReflectResponse {
  completed: boolean;
  attempt: unknown;
}

/**
 * POST /api/attempts/[attemptId]/reflect/submit
 *
 * Submits the reflection for a completed attempt.
 * This captures learnings and transitions to COMPLETE state.
 *
 * The reflection includes:
 * - Cues for next time (what to remember)
 * - Invariant summary (key insight)
 * - Optional micro-lesson link
 * - Optional adversary challenge completion
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { attemptId: string } }
) {
  try {
    const tenantId = request.headers.get('x-tenant-id') ?? DEMO_TENANT_ID;
    const userId = request.headers.get('x-user-id') ?? DEMO_USER_ID;

    // Parse request body
    const body = (await request.json()) as SubmitReflectRequest;

    // Validate
    if (!Array.isArray(body.cuesNextTime)) {
      return NextResponse.json(
        {
          error: {
            code: 'VALIDATION_ERROR',
            message: 'cuesNextTime must be an array of strings',
          },
        },
        { status: 400 }
      );
    }

    if (!body.invariantSummary || body.invariantSummary.trim().length < 10) {
      return NextResponse.json(
        {
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invariant summary must be at least 10 characters',
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

    // Verify we're in the REFLECT step
    if (attempt.v2Step !== 'REFLECT') {
      return NextResponse.json(
        {
          error: {
            code: 'INVALID_STEP',
            message: `Cannot submit reflection in ${attempt.v2Step} step`,
          },
        },
        { status: 409 }
      );
    }

    // Verify transition is allowed
    try {
      assertCanTransition(attempt, 'COMPLETE');
    } catch (error) {
      if (error instanceof InvalidTransitionError) {
        return NextResponse.json(
          {
            error: {
              code: error.code,
              message: error.message,
              suggestion: error.suggestion,
            },
          },
          { status: 409 }
        );
      }
      throw error;
    }

    // Build reflect payload
    const reflectPayload: ReflectPayload = {
      cuesNextTime: body.cuesNextTime.map((c) => c.trim()).filter((c) => c.length > 0),
      invariantSummary: body.invariantSummary.trim(),
      microLessonId: body.microLessonId?.trim() ?? null,
      adversaryChallengeCompleted: body.adversaryChallengeCompleted ?? false,
    };

    // Update attempt to COMPLETE state
    const updatedAttempt = await attemptRepo.update({
      ...attempt,
      reflectPayload,
      v2Step: 'COMPLETE',
      state: 'COMPLETED',
      completedAt: clock.now(),
    });

    const response: SubmitReflectResponse = {
      completed: true,
      attempt: updatedAttempt,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error submitting reflection:', error);
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'An unexpected error occurred' } },
      { status: 500 }
    );
  }
}
