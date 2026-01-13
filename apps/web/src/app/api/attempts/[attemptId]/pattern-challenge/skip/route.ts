import { NextRequest, NextResponse } from 'next/server';
import { skipPatternChallenge } from '@scaffold/core/use-cases';
import { SkipPatternChallengeRequestSchema } from '@scaffold/contracts';
import { attemptRepo, clock } from '@/lib/deps';
import { DEMO_TENANT_ID, DEMO_USER_ID } from '@/lib/constants';

/**
 * POST /api/attempts/[attemptId]/pattern-challenge/skip
 *
 * Skips the Advocate's Trap challenge, proceeding with original pattern.
 * User doesn't provide a response but keeps their original selection.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { attemptId: string } }
) {
  try {
    const tenantId = request.headers.get('x-tenant-id') ?? DEMO_TENANT_ID;
    const userId = request.headers.get('x-user-id') ?? DEMO_USER_ID;

    const body = await request.json();
    const parsed = SkipPatternChallengeRequestSchema.safeParse({
      ...body,
      attemptId: params.attemptId,
    });

    if (!parsed.success) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: parsed.error.message } },
        { status: 400 }
      );
    }

    const result = await skipPatternChallenge(
      {
        tenantId,
        userId,
        attemptId: params.attemptId,
        stepId: parsed.data.stepId,
      },
      { attemptRepo, clock }
    );

    return NextResponse.json({
      attempt: result.attempt,
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
