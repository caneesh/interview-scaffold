import { NextRequest, NextResponse } from 'next/server';
import { debugLabRepo } from '@/lib/debug-lab-repo';
import { DEMO_TENANT_ID, DEMO_USER_ID } from '@/lib/constants';
import { TriageAnswersSchema } from '@scaffold/contracts';
import { calculateTriageScore } from '@scaffold/core';

/**
 * POST /api/debug-lab/:attemptId/triage
 *
 * Submit triage answers for a debug lab attempt
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
    const parsed = TriageAnswersSchema.safeParse(body.triageAnswers);

    if (!parsed.success) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: parsed.error.message } },
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

    // Check status
    if (attempt.status !== 'STARTED') {
      return NextResponse.json(
        { error: { code: 'INVALID_STATE', message: 'Triage already submitted or attempt completed' } },
        { status: 400 }
      );
    }

    // Get the item to check if triage is required and get rubric
    const item = await debugLabRepo.findItemById(tenantId, attempt.itemId);
    if (!item) {
      return NextResponse.json(
        { error: { code: 'NOT_FOUND', message: 'Item not found' } },
        { status: 404 }
      );
    }

    const triageAnswers = parsed.data;

    // Calculate triage score if rubric exists
    let triageScore = null;
    let rubricExplanation: string | undefined;

    if (item.triageRubric) {
      triageScore = calculateTriageScore(triageAnswers, item.triageRubric);
      rubricExplanation = item.triageRubric.explanation;
    }

    // Update attempt
    const updatedAttempt = await debugLabRepo.updateAttempt({
      ...attempt,
      status: 'TRIAGE_COMPLETED',
      triageAnswers,
      triageScore,
    });

    return NextResponse.json({
      attempt: updatedAttempt,
      triageScore,
      rubricExplanation,
    });
  } catch (error) {
    console.error('Error submitting triage:', error);
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Failed to submit triage' } },
      { status: 500 }
    );
  }
}
