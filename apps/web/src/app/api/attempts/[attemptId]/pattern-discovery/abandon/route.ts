import { NextRequest, NextResponse } from 'next/server';
import { abandonPatternDiscovery } from '@scaffold/core/use-cases';
import { AbandonPatternDiscoveryRequestSchema } from '@scaffold/contracts';
import { attemptRepo, clock } from '@/lib/deps';
import { DEMO_TENANT_ID, DEMO_USER_ID } from '@/lib/constants';

/**
 * POST /api/attempts/[attemptId]/pattern-discovery/abandon
 *
 * Abandons an in-progress pattern discovery session
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { attemptId: string } }
) {
  try {
    const tenantId = request.headers.get('x-tenant-id') ?? DEMO_TENANT_ID;
    const userId = request.headers.get('x-user-id') ?? DEMO_USER_ID;

    const body = await request.json();
    const parsed = AbandonPatternDiscoveryRequestSchema.safeParse({
      ...body,
      attemptId: params.attemptId,
    });

    if (!parsed.success) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: parsed.error.message } },
        { status: 400 }
      );
    }

    await abandonPatternDiscovery(
      {
        tenantId,
        userId,
        attemptId: params.attemptId,
        stepId: parsed.data.stepId,
      },
      { attemptRepo, clock }
    );

    return NextResponse.json({
      success: true,
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
