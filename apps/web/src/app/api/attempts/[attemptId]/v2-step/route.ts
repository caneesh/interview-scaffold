import { NextRequest, NextResponse } from 'next/server';
import { attemptRepo } from '@/lib/deps';
import {
  isV2Attempt,
  ATTEMPT_V2_STEPS,
  type AttemptV2Step,
} from '@scaffold/core/entities';
import {
  assertCanTransition,
  InvalidTransitionError,
  getValidNextSteps,
} from '@scaffold/core/validation';
import { DEMO_TENANT_ID, DEMO_USER_ID } from '@/lib/constants';

/**
 * Request body for step transition
 */
interface TransitionStepRequest {
  targetStep: AttemptV2Step;
}

/**
 * GET /api/attempts/[attemptId]/v2-step
 *
 * Returns the current V2 step and valid next steps for the attempt.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { attemptId: string } }
) {
  try {
    const tenantId = request.headers.get('x-tenant-id') ?? DEMO_TENANT_ID;
    const userId = request.headers.get('x-user-id') ?? DEMO_USER_ID;

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

    // Check if V2 attempt
    if (!isV2Attempt(attempt)) {
      return NextResponse.json({
        isV2: false,
        currentStep: null,
        validNextSteps: [],
        mode: attempt.mode,
      });
    }

    return NextResponse.json({
      isV2: true,
      currentStep: attempt.v2Step,
      validNextSteps: getValidNextSteps(attempt),
      mode: attempt.mode,
    });
  } catch (error) {
    console.error('Error getting V2 step:', error);
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'An unexpected error occurred' } },
      { status: 500 }
    );
  }
}

/**
 * POST /api/attempts/[attemptId]/v2-step
 *
 * Transitions to a new V2 step.
 * Used for:
 * - Expert mode skip (e.g., UNDERSTAND -> PLAN without full validation)
 * - Retry from VERIFY -> IMPLEMENT
 *
 * Most transitions happen automatically via other endpoints (e.g., understand/submit).
 * This endpoint is for explicit navigation.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { attemptId: string } }
) {
  try {
    const tenantId = request.headers.get('x-tenant-id') ?? DEMO_TENANT_ID;
    const userId = request.headers.get('x-user-id') ?? DEMO_USER_ID;

    // Parse request body
    const body = (await request.json()) as TransitionStepRequest;

    // Validate target step
    if (!body.targetStep || !ATTEMPT_V2_STEPS.includes(body.targetStep)) {
      return NextResponse.json(
        {
          error: {
            code: 'INVALID_STEP',
            message: `Target step must be one of: ${ATTEMPT_V2_STEPS.join(', ')}`,
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
            message: 'Cannot transition a legacy (v1) attempt',
          },
        },
        { status: 400 }
      );
    }

    // Validate transition
    try {
      assertCanTransition(attempt, body.targetStep);
    } catch (error) {
      if (error instanceof InvalidTransitionError) {
        return NextResponse.json(
          {
            error: {
              code: error.code,
              message: error.message,
              currentStep: error.currentStep,
              targetStep: error.targetStep,
              suggestion: error.suggestion,
            },
          },
          { status: 409 }
        );
      }
      throw error;
    }

    // Perform transition
    const updatedAttempt = await attemptRepo.update({
      ...attempt,
      v2Step: body.targetStep,
    });

    return NextResponse.json({
      success: true,
      previousStep: attempt.v2Step,
      currentStep: body.targetStep,
      validNextSteps: getValidNextSteps(updatedAttempt),
      attempt: updatedAttempt,
    });
  } catch (error) {
    console.error('Error transitioning step:', error);
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'An unexpected error occurred' } },
      { status: 500 }
    );
  }
}
