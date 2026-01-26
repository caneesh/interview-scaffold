/**
 * POST /api/admin/generator/run/[runId]/publish
 *
 * Publish approved candidates from a run to the content bank.
 * Requires admin access.
 */

import { NextRequest, NextResponse } from 'next/server';
import { publishCandidates } from '@scaffold/core/use-cases';
import { generatorRepo, idGenerator, isAdmin } from '@/lib/generator-deps';
import { contentBankRepo } from '@/lib/deps';

export const dynamic = 'force-dynamic';

interface RouteParams {
  params: Promise<{
    runId: string;
  }>;
}

/**
 * POST /api/admin/generator/run/[runId]/publish
 *
 * Publish all approved candidates from the run.
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    // Check admin access
    const adminEmail = request.headers.get('x-admin-email');
    if (!isAdmin(adminEmail)) {
      return NextResponse.json(
        { error: { code: 'UNAUTHORIZED', message: 'Admin access required' } },
        { status: 403 }
      );
    }

    const { runId } = await params;

    const run = await generatorRepo.getRun(runId);
    if (!run) {
      return NextResponse.json(
        { error: { code: 'NOT_FOUND', message: 'Run not found' } },
        { status: 404 }
      );
    }

    // Get approved candidates
    const approvedCandidates = await generatorRepo.listCandidatesForRun(runId, { status: 'approved' });

    if (approvedCandidates.length === 0) {
      return NextResponse.json({
        published: [],
        errors: [],
        message: 'No approved candidates to publish',
      });
    }

    // Publish them
    const result = await publishCandidates(
      {
        candidateIds: approvedCandidates.map(c => c.id),
        ladderId: run.ladderId ?? undefined,
        publishedBy: adminEmail ?? undefined,
      },
      { generatorRepo, contentBankRepo, idGenerator }
    );

    return NextResponse.json({
      published: result.publishedItems.map(item => ({
        candidateId: item.candidateId,
        contentItemId: item.contentItemId,
        contentVersionId: item.contentVersionId,
        nodeId: item.nodeId,
      })),
      errors: result.errors,
      summary: {
        total: approvedCandidates.length,
        published: result.publishedItems.length,
        failed: result.errors.length,
      },
    });
  } catch (error) {
    console.error('Error publishing candidates:', error);
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Failed to publish candidates' } },
      { status: 500 }
    );
  }
}
