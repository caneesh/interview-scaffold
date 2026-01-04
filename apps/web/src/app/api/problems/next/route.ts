import { NextRequest, NextResponse } from 'next/server';
import { getNextProblem } from '@scaffold/core/use-cases';
import { GetNextProblemRequestSchema } from '@scaffold/contracts';
import { contentRepo, skillRepo, attemptRepo } from '@/lib/deps';

export const dynamic = 'force-dynamic';

/**
 * GET /api/problems/next
 *
 * Returns the next recommended problem for the user
 */
export async function GET(request: NextRequest) {
  try {
    const tenantId = request.headers.get('x-tenant-id') ?? 'default';
    const userId = request.headers.get('x-user-id') ?? 'demo';

    // Parse optional query params
    const { searchParams } = new URL(request.url);
    const pattern = searchParams.get('pattern') ?? undefined;
    const rungParam = searchParams.get('rung');
    const rung = rungParam ? parseInt(rungParam, 10) : undefined;

    const parsed = GetNextProblemRequestSchema.safeParse({ pattern, rung });

    const result = await getNextProblem(
      {
        tenantId,
        userId,
        pattern: parsed.success ? parsed.data.pattern : undefined,
        rung: parsed.success ? parsed.data.rung : undefined,
      },
      { contentRepo, skillRepo, attemptRepo }
    );

    return NextResponse.json({
      problem: result.problem,
      reason: result.reason,
    });
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'An unexpected error occurred' } },
      { status: 500 }
    );
  }
}
