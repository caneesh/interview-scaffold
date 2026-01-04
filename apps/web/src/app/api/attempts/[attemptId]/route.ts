import { NextRequest, NextResponse } from 'next/server';
import { attemptRepo, contentRepo } from '@/lib/deps';

/**
 * GET /api/attempts/[attemptId]
 *
 * Returns the attempt with its associated problem
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { attemptId: string } }
) {
  try {
    const tenantId = request.headers.get('x-tenant-id') ?? 'default';

    const attempt = await attemptRepo.findById(tenantId, params.attemptId);
    if (!attempt) {
      return NextResponse.json(
        { error: { code: 'ATTEMPT_NOT_FOUND', message: 'Attempt not found' } },
        { status: 404 }
      );
    }

    const problem = await contentRepo.findById(tenantId, attempt.problemId);

    return NextResponse.json({
      attempt,
      problem,
    });
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'An unexpected error occurred' } },
      { status: 500 }
    );
  }
}
