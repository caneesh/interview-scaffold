import { NextRequest, NextResponse } from 'next/server';
import { GetNextContentRequestSchema } from '@scaffold/contracts';
import { contentBankRepo, attemptRepo } from '@/lib/deps';
import { DEMO_TENANT_ID, DEMO_USER_ID } from '@/lib/constants';

export const dynamic = 'force-dynamic';

/**
 * GET /api/content/next
 *
 * Track-aware content selection endpoint.
 * Returns the next recommended content item for a given track.
 *
 * Query params:
 * - track: 'coding_interview' | 'debug_lab' | 'system_design' (required)
 * - pattern: string (optional) - filter by pattern/category
 * - rung: number (optional) - filter by difficulty rung
 * - difficulty: 'easy' | 'medium' | 'hard' (optional)
 */
export async function GET(request: NextRequest) {
  try {
    const tenantId = request.headers.get('x-tenant-id') ?? DEMO_TENANT_ID;
    const userId = request.headers.get('x-user-id') ?? DEMO_USER_ID;

    // Parse query params
    const { searchParams } = new URL(request.url);
    const track = searchParams.get('track');
    const pattern = searchParams.get('pattern') ?? undefined;
    const rungParam = searchParams.get('rung');
    const rung = rungParam ? parseInt(rungParam, 10) : undefined;
    const difficulty = searchParams.get('difficulty') ?? undefined;

    // Validate with Zod
    const parsed = GetNextContentRequestSchema.safeParse({
      track,
      pattern,
      rung,
      difficulty,
    });

    if (!parsed.success) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: parsed.error.message } },
        { status: 400 }
      );
    }

    // Get user's completed attempts for this track to filter out already-done content
    const userAttempts = await attemptRepo.findByUser(tenantId, userId, {});
    const completedProblemIds = new Set(
      userAttempts
        .filter((a) => a.state === 'COMPLETED')
        .map((a) => a.problemId)
    );

    // Query content bank for available content
    const content = await contentBankRepo.listPublishedContent({
      tenantId,
      track: parsed.data.track,
      pattern: parsed.data.pattern,
      rung: parsed.data.rung,
      difficulty: parsed.data.difficulty,
      limit: 50,
    });

    // Filter out already completed content and find next recommended
    const availableContent = content.filter(
      (c) => !completedProblemIds.has(c.item.id)
    );

    if (availableContent.length === 0) {
      return NextResponse.json({
        content: null,
        reason: `All ${parsed.data.track} content completed! Check back later for new challenges.`,
      });
    }

    // Simple recommendation: prefer easier content first, then by creation date
    const sortedContent = [...availableContent].sort((a, b) => {
      // Sort by rung (lower first)
      const rungA = a.item.rung ?? 999;
      const rungB = b.item.rung ?? 999;
      if (rungA !== rungB) return rungA - rungB;

      // Then by difficulty
      const diffOrder = { easy: 0, medium: 1, hard: 2 };
      const diffA = diffOrder[a.item.difficulty] ?? 1;
      const diffB = diffOrder[b.item.difficulty] ?? 1;
      if (diffA !== diffB) return diffA - diffB;

      // Then by creation date (older first)
      return a.item.createdAt.getTime() - b.item.createdAt.getTime();
    });

    const recommended = sortedContent[0]!;

    return NextResponse.json({
      content: {
        item: recommended.item,
        version: recommended.version,
      },
      reason: `Recommended based on difficulty progression (${recommended.item.difficulty}, rung ${recommended.item.rung ?? 'N/A'})`,
    });
  } catch (error) {
    console.error('Error getting next content:', error);
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Failed to get next content' } },
      { status: 500 }
    );
  }
}
