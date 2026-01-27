import { NextRequest, NextResponse } from 'next/server';
import { attemptRepo } from '@/lib/deps';
import { isV2Attempt, ATTEMPT_V2_MODES, type AttemptV2Mode } from '@scaffold/core/entities';
import { DEMO_TENANT_ID, DEMO_USER_ID } from '@/lib/constants';

/**
 * POST /api/attempts/[attemptId]/mode
 *
 * Sets the mode (BEGINNER or EXPERT) for a V2 attempt.
 * Mode affects scaffolding level and skip permissions.
 *
 * Request body:
 * {
 *   mode: 'BEGINNER' | 'EXPERT'
 * }
 *
 * Response:
 * {
 *   attempt: Attempt
 * }
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { attemptId: string } }
) {
  try {
    const tenantId = request.headers.get('x-tenant-id') ?? DEMO_TENANT_ID;
    const userId = request.headers.get('x-user-id') ?? DEMO_USER_ID;

    // Parse request body
    const body = await request.json();
    const mode = body.mode as AttemptV2Mode;

    // Validate mode
    if (!mode || !ATTEMPT_V2_MODES.includes(mode)) {
      return NextResponse.json(
        {
          error: {
            code: 'INVALID_MODE',
            message: `Mode must be one of: ${ATTEMPT_V2_MODES.join(', ')}`,
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
            message: 'Cannot set mode on a legacy (v1) attempt',
          },
        },
        { status: 400 }
      );
    }

    // Update the attempt with new mode
    const updatedAttempt = await attemptRepo.update({
      ...attempt,
      mode,
    });

    return NextResponse.json({
      attempt: updatedAttempt,
    });
  } catch (error) {
    console.error('Error setting attempt mode:', error);
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'An unexpected error occurred' } },
      { status: 500 }
    );
  }
}
