import { NextRequest, NextResponse } from 'next/server';
import { contentRepo } from '@/lib/deps';
import { DEMO_TENANT_ID } from '@/lib/constants';

export const dynamic = 'force-dynamic';

/**
 * GET /api/problems/list
 *
 * Returns all available problems for coaching sessions
 */
export async function GET(request: NextRequest) {
  try {
    const tenantId = request.headers.get('x-tenant-id') ?? DEMO_TENANT_ID;

    // Parse optional query params for filtering
    const { searchParams } = new URL(request.url);
    const pattern = searchParams.get('pattern') ?? undefined;
    const rungParam = searchParams.get('rung');
    const rung = rungParam ? parseInt(rungParam, 10) : undefined;

    const problems = await contentRepo.findAll(tenantId, {
      pattern: pattern as any,
      rung: rung as any,
    });

    // Group problems by pattern for easier display
    const byPattern = problems.reduce((acc, problem) => {
      const key = problem.pattern;
      if (!acc[key]) {
        acc[key] = [];
      }
      acc[key].push({
        id: problem.id,
        title: problem.title,
        pattern: problem.pattern,
        rung: problem.rung,
        statement: problem.statement,
        targetComplexity: problem.targetComplexity,
        hasHints: problem.hints.length > 0,
        testCaseCount: problem.testCases.length,
      });
      return acc;
    }, {} as Record<string, any[]>);

    return NextResponse.json({
      problems: problems.map(p => ({
        id: p.id,
        title: p.title,
        pattern: p.pattern,
        rung: p.rung,
        statement: p.statement,
        targetComplexity: p.targetComplexity,
        hasHints: p.hints.length > 0,
        testCaseCount: p.testCases.length,
      })),
      byPattern,
      total: problems.length,
    });
  } catch (error) {
    console.error('Error listing problems:', error);
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'An unexpected error occurred' } },
      { status: 500 }
    );
  }
}
