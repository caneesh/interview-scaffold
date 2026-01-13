import { NextRequest, NextResponse } from 'next/server';
import { checkPatternChallenge } from '@scaffold/core/use-cases';
import { CheckPatternChallengeRequestSchema } from '@scaffold/contracts';
import { attemptRepo, contentRepo, clock, idGenerator } from '@/lib/deps';
import { DEMO_TENANT_ID, DEMO_USER_ID } from '@/lib/constants';

/**
 * POST /api/attempts/[attemptId]/pattern-challenge/check
 *
 * Checks if a pattern selection should trigger the Advocate's Trap challenge.
 * Called before submitting thinking gate to potentially intercept with a challenge.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { attemptId: string } }
) {
  try {
    const tenantId = request.headers.get('x-tenant-id') ?? DEMO_TENANT_ID;
    const userId = request.headers.get('x-user-id') ?? DEMO_USER_ID;

    const body = await request.json();
    const parsed = CheckPatternChallengeRequestSchema.safeParse({
      ...body,
      attemptId: params.attemptId,
    });

    if (!parsed.success) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: parsed.error.message } },
        { status: 400 }
      );
    }

    const result = await checkPatternChallenge(
      {
        tenantId,
        userId,
        attemptId: params.attemptId,
        selectedPattern: parsed.data.selectedPattern,
        statedInvariant: parsed.data.statedInvariant,
      },
      { attemptRepo, contentRepo, clock, idGenerator }
    );

    return NextResponse.json(result);
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
