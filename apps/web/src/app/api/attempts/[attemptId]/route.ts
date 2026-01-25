import { NextRequest, NextResponse } from 'next/server';
import { attemptRepo, contentRepo, contentBankRepo } from '@/lib/deps';
import { isLegacyAttempt, isTrackAttempt } from '@scaffold/core/entities';
import { DEMO_TENANT_ID } from '@/lib/constants';

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
    const tenantId = request.headers.get('x-tenant-id') ?? DEMO_TENANT_ID;

    const attempt = await attemptRepo.findById(tenantId, params.attemptId);
    if (!attempt) {
      return NextResponse.json(
        { error: { code: 'ATTEMPT_NOT_FOUND', message: 'Attempt not found' } },
        { status: 404 }
      );
    }

    // For legacy attempts, fetch the problem from contentRepo
    // For track attempts, fetch the content item from contentBankRepo
    let problem = null;
    let contentItem = null;

    if (isLegacyAttempt(attempt)) {
      problem = await contentRepo.findById(tenantId, attempt.problemId);
    } else if (isTrackAttempt(attempt)) {
      contentItem = await contentBankRepo.getContentItem(attempt.contentItemId);
    }

    return NextResponse.json({
      attempt,
      problem,
      contentItem,
    });
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'An unexpected error occurred' } },
      { status: 500 }
    );
  }
}
