/**
 * GET /api/admin/generator/run/[runId]
 *
 * Get details of a specific generation run.
 * Requires admin access.
 */

import { NextRequest, NextResponse } from 'next/server';
import { generatorRepo, isAdmin } from '@/lib/generator-deps';

export const dynamic = 'force-dynamic';

interface RouteParams {
  params: Promise<{
    runId: string;
  }>;
}

/**
 * GET /api/admin/generator/run/[runId]
 *
 * Get run details including all candidates.
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
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

    // Get all candidates for this run
    const candidates = await generatorRepo.listCandidatesForRun(runId);

    // Group candidates by status
    const byStatus = {
      proposed: candidates.filter(c => c.status === 'proposed'),
      approved: candidates.filter(c => c.status === 'approved'),
      rejected: candidates.filter(c => c.status === 'rejected'),
      published: candidates.filter(c => c.status === 'published'),
    };

    // Group candidates by level
    const byLevel: Record<number, typeof candidates> = {};
    for (let level = 0; level <= 4; level++) {
      byLevel[level] = candidates.filter(c => c.level === level);
    }

    return NextResponse.json({
      run: {
        id: run.id,
        patternId: run.patternId,
        ladderId: run.ladderId,
        targetCount: run.targetCount,
        promptVersion: run.promptVersion,
        model: run.model,
        status: run.status,
        metrics: run.metrics,
        createdBy: run.createdBy,
        createdAt: run.createdAt,
        completedAt: run.completedAt,
      },
      candidates: candidates.map(c => ({
        id: c.id,
        level: c.level,
        title: c.candidate.title,
        summary: c.candidate.summary,
        difficulty: c.candidate.difficulty,
        status: c.status,
        validation: c.validation,
        createdAt: c.createdAt,
      })),
      summary: {
        total: candidates.length,
        byStatus: {
          proposed: byStatus.proposed.length,
          approved: byStatus.approved.length,
          rejected: byStatus.rejected.length,
          published: byStatus.published.length,
        },
        byLevel: Object.fromEntries(
          Object.entries(byLevel).map(([level, cands]) => [level, cands.length])
        ),
      },
    });
  } catch (error) {
    console.error('Error getting generation run:', error);
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Failed to get generation run' } },
      { status: 500 }
    );
  }
}
