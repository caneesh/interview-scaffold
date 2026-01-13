import { NextRequest, NextResponse } from 'next/server';
import { bugHuntRepo } from '@/lib/bug-hunt-repo';
import { DEMO_TENANT_ID } from '@/lib/constants';

/**
 * GET /api/bug-hunt/items/[itemId]
 *
 * Get a specific bug hunt item (without solution)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { itemId: string } }
) {
  try {
    const tenantId = request.headers.get('x-tenant-id') ?? DEMO_TENANT_ID;

    const item = await bugHuntRepo.findItemById(tenantId, params.itemId);
    if (!item) {
      return NextResponse.json(
        { error: { code: 'NOT_FOUND', message: 'Bug hunt item not found' } },
        { status: 404 }
      );
    }

    // Strip solution details before sending to client
    const safeItem = {
      id: item.id,
      tenantId: item.tenantId,
      pattern: item.pattern,
      difficulty: item.difficulty,
      language: item.language,
      code: item.code,
      prompt: item.prompt,
      title: item.title,
      createdAt: item.createdAt,
      // Intentionally omitting: expectedBugLines, expectedConcepts, explanation
    };

    return NextResponse.json({ item: safeItem });
  } catch (error) {
    console.error('Error fetching bug hunt item:', error);
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch item' } },
      { status: 500 }
    );
  }
}
