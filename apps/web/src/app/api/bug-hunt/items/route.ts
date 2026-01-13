import { NextRequest, NextResponse } from 'next/server';
import { bugHuntRepo } from '@/lib/bug-hunt-repo';
import { DEMO_TENANT_ID } from '@/lib/constants';

/**
 * GET /api/bug-hunt/items
 *
 * List all bug hunt items (without solutions)
 * Optional query param: ?pattern=SLIDING_WINDOW
 */
export async function GET(request: NextRequest) {
  try {
    const tenantId = request.headers.get('x-tenant-id') ?? DEMO_TENANT_ID;
    const pattern = request.nextUrl.searchParams.get('pattern');

    let items;
    if (pattern) {
      items = await bugHuntRepo.listItemsByPattern(tenantId, pattern);
    } else {
      items = await bugHuntRepo.listItems(tenantId);
    }

    // Strip solution details before sending to client
    const safeItems = items.map(item => ({
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
    }));

    return NextResponse.json({ items: safeItems });
  } catch (error) {
    console.error('Error listing bug hunt items:', error);
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Failed to list items' } },
      { status: 500 }
    );
  }
}
