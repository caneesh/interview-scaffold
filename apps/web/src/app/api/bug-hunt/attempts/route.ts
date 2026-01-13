import { NextRequest, NextResponse } from 'next/server';
import { bugHuntRepo } from '@/lib/bug-hunt-repo';
import { idGenerator, clock } from '@/lib/deps';
import { DEMO_TENANT_ID, DEMO_USER_ID } from '@/lib/constants';
import { StartBugHuntAttemptRequestSchema } from '@scaffold/contracts';

/**
 * GET /api/bug-hunt/attempts
 *
 * List user's bug hunt attempts
 */
export async function GET(request: NextRequest) {
  try {
    const tenantId = request.headers.get('x-tenant-id') ?? DEMO_TENANT_ID;
    const userId = request.headers.get('x-user-id') ?? DEMO_USER_ID;

    const attempts = await bugHuntRepo.listAttemptsByUser(tenantId, userId);

    return NextResponse.json({ attempts });
  } catch (error) {
    console.error('Error listing bug hunt attempts:', error);
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Failed to list attempts' } },
      { status: 500 }
    );
  }
}

/**
 * POST /api/bug-hunt/attempts
 *
 * Start a new bug hunt attempt
 */
export async function POST(request: NextRequest) {
  try {
    const tenantId = request.headers.get('x-tenant-id') ?? DEMO_TENANT_ID;
    const userId = request.headers.get('x-user-id') ?? DEMO_USER_ID;

    const body = await request.json();
    const parsed = StartBugHuntAttemptRequestSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: parsed.error.message } },
        { status: 400 }
      );
    }

    const { itemId } = parsed.data;

    // Verify item exists
    const item = await bugHuntRepo.findItemById(tenantId, itemId);
    if (!item) {
      return NextResponse.json(
        { error: { code: 'NOT_FOUND', message: 'Bug hunt item not found' } },
        { status: 404 }
      );
    }

    // Count existing attempts
    const attemptCount = await bugHuntRepo.countUserAttemptsForItem(tenantId, userId, itemId);

    // Create new attempt
    const attempt = await bugHuntRepo.createAttempt({
      id: idGenerator.generate(),
      tenantId,
      userId,
      itemId,
      submission: null,
      validation: null,
      startedAt: clock.now(),
      completedAt: null,
      attemptNumber: attemptCount + 1,
    });

    // Return attempt with safe item (no solution)
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
    };

    return NextResponse.json({ attempt, item: safeItem });
  } catch (error) {
    console.error('Error starting bug hunt attempt:', error);
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Failed to start attempt' } },
      { status: 500 }
    );
  }
}
