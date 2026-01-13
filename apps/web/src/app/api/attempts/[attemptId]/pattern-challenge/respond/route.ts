import { NextRequest, NextResponse } from 'next/server';
import { respondToPatternChallenge } from '@scaffold/core/use-cases';
import { RespondPatternChallengeRequestSchema } from '@scaffold/contracts';
import { attemptRepo, clock } from '@/lib/deps';
import { DEMO_TENANT_ID, DEMO_USER_ID } from '@/lib/constants';

/**
 * POST /api/attempts/[attemptId]/pattern-challenge/respond
 *
 * Submits user's response to the Advocate's Trap challenge.
 * User can either keep their original pattern or change to a new one.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { attemptId: string } }
) {
  try {
    const tenantId = request.headers.get('x-tenant-id') ?? DEMO_TENANT_ID;
    const userId = request.headers.get('x-user-id') ?? DEMO_USER_ID;

    const body = await request.json();
    const parsed = RespondPatternChallengeRequestSchema.safeParse({
      ...body,
      attemptId: params.attemptId,
    });

    if (!parsed.success) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: parsed.error.message } },
        { status: 400 }
      );
    }

    const result = await respondToPatternChallenge(
      {
        tenantId,
        userId,
        attemptId: params.attemptId,
        stepId: parsed.data.stepId,
        response: parsed.data.response,
        decision: parsed.data.decision,
        newPattern: parsed.data.newPattern,
      },
      { attemptRepo, clock }
    );

    return NextResponse.json({
      attempt: result.attempt,
      step: result.step,
      finalPattern: result.finalPattern,
    });
  } catch (error) {
    if (error instanceof Error && 'code' in error) {
      return NextResponse.json(
        { error: { code: (error as { code: string }).code, message: error.message } },
        { status: 400 }
      );
    }

    console.error('Unexpected error:', error);
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'An unexpected error occurred' } },
      { status: 500 }
    );
  }
}
