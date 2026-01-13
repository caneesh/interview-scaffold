import { NextRequest, NextResponse } from 'next/server';
import { bugHuntRepo } from '@/lib/bug-hunt-repo';
import { clock } from '@/lib/deps';
import { DEMO_TENANT_ID, DEMO_USER_ID } from '@/lib/constants';
import { BugHuntSubmissionSchema } from '@scaffold/contracts';
import { validateBugHuntSubmission } from '@scaffold/core';

/**
 * POST /api/bug-hunt/attempts/[attemptId]/submit
 *
 * Submit answer for a bug hunt attempt
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { attemptId: string } }
) {
  try {
    const tenantId = request.headers.get('x-tenant-id') ?? DEMO_TENANT_ID;
    const userId = request.headers.get('x-user-id') ?? DEMO_USER_ID;

    const body = await request.json();

    // Validate submission
    const parsed = BugHuntSubmissionSchema.safeParse(body.submission ?? body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: parsed.error.message } },
        { status: 400 }
      );
    }

    const submission = parsed.data;

    // Get the attempt
    const attempt = await bugHuntRepo.findAttemptById(tenantId, params.attemptId);
    if (!attempt) {
      return NextResponse.json(
        { error: { code: 'NOT_FOUND', message: 'Attempt not found' } },
        { status: 404 }
      );
    }

    // Verify user owns attempt
    if (attempt.userId !== userId) {
      return NextResponse.json(
        { error: { code: 'UNAUTHORIZED', message: 'You do not own this attempt' } },
        { status: 403 }
      );
    }

    // Check if already submitted
    if (attempt.completedAt) {
      return NextResponse.json(
        { error: { code: 'ALREADY_SUBMITTED', message: 'This attempt has already been submitted' } },
        { status: 400 }
      );
    }

    // Get the item (with solution data for validation)
    const item = await bugHuntRepo.findItemById(tenantId, attempt.itemId);
    if (!item) {
      return NextResponse.json(
        { error: { code: 'NOT_FOUND', message: 'Bug hunt item not found' } },
        { status: 404 }
      );
    }

    // Validate the submission
    const validation = validateBugHuntSubmission(submission, item);

    // Optional: Add LLM feedback if enabled
    // This is env-gated and doesn't override deterministic validation
    // TODO: Implement LLM grader when needed

    // Update the attempt
    const updatedAttempt = await bugHuntRepo.updateAttempt({
      ...attempt,
      submission,
      validation,
      completedAt: clock.now(),
    });

    // Prepare response
    const response: Record<string, unknown> = {
      attempt: updatedAttempt,
      validation,
    };

    // Include explanation if correct or partial
    if (validation.result === 'CORRECT' || validation.result === 'PARTIAL') {
      response.explanation = item.explanation;
    }

    // Include hint if incorrect and first attempt
    if (validation.result === 'INCORRECT' && attempt.attemptNumber === 1 && item.hint) {
      response.hint = item.hint;
    }

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error submitting bug hunt attempt:', error);
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Failed to submit attempt' } },
      { status: 500 }
    );
  }
}
