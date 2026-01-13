import { NextRequest, NextResponse } from 'next/server';
import { startPatternDiscovery } from '@scaffold/core/use-cases';
import { StartPatternDiscoveryRequestSchema } from '@scaffold/contracts';
import { attemptRepo, contentRepo, clock, idGenerator } from '@/lib/deps';
import { DEMO_TENANT_ID, DEMO_USER_ID } from '@/lib/constants';

/**
 * POST /api/attempts/[attemptId]/pattern-discovery/start
 *
 * Starts a pattern discovery session (Socratic guided flow)
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { attemptId: string } }
) {
  try {
    const tenantId = request.headers.get('x-tenant-id') ?? DEMO_TENANT_ID;
    const userId = request.headers.get('x-user-id') ?? DEMO_USER_ID;

    const body = await request.json();
    const parsed = StartPatternDiscoveryRequestSchema.safeParse({
      ...body,
      attemptId: params.attemptId,
    });

    if (!parsed.success) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: parsed.error.message } },
        { status: 400 }
      );
    }

    const result = await startPatternDiscovery(
      {
        tenantId,
        userId,
        attemptId: params.attemptId,
        preferSocratic: parsed.data.mode === 'SOCRATIC',
      },
      { attemptRepo, contentRepo, clock, idGenerator }
    );

    return NextResponse.json({
      stepId: result.step.id,
      mode: result.mode,
      question: result.question,
      questionId: result.questionId,
    });
  } catch (error) {
    if (error instanceof Error && 'code' in error) {
      return NextResponse.json(
        { error: { code: (error as any).code, message: error.message } },
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
