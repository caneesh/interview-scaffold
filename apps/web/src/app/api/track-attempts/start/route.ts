import { NextRequest, NextResponse } from 'next/server';
import { StartTrackAttemptRequestSchema } from '@scaffold/contracts';
import { contentBankRepo, trackAttemptRepo, clock, idGenerator } from '@/lib/deps';
import { DEMO_TENANT_ID, DEMO_USER_ID } from '@/lib/constants';

/**
 * POST /api/track-attempts/start
 *
 * Starts a new track-based attempt using the content bank system.
 * For legacy problem-based attempts, use /api/attempts/start instead.
 *
 * Request body:
 * - track: 'coding_interview' | 'debug_lab' | 'system_design'
 * - contentItemId: UUID of the content item to attempt
 * - versionId?: UUID of specific version (optional, defaults to published)
 *
 * NO business logic here - only orchestration
 */
export async function POST(request: NextRequest) {
  try {
    // Get tenant and user from headers (in production, from auth)
    const tenantId = request.headers.get('x-tenant-id') ?? DEMO_TENANT_ID;
    const userId = request.headers.get('x-user-id') ?? DEMO_USER_ID;

    const body = await request.json();

    // Parse and validate request body
    const parsed = StartTrackAttemptRequestSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: parsed.error.message } },
        { status: 400 }
      );
    }

    const { track, contentItemId, versionId } = parsed.data;

    // Check for existing active track attempt for this content
    const existingAttempt = await trackAttemptRepo.findActiveByContent(
      tenantId,
      userId,
      contentItemId
    );

    if (existingAttempt) {
      // Get the content for resuming
      const content = versionId
        ? await contentBankRepo.getContentVersion(versionId)
        : await contentBankRepo.getPublishedContentVersion(contentItemId);

      const item = await contentBankRepo.getContentItem(contentItemId);

      if (!content || !item) {
        return NextResponse.json(
          { error: { code: 'CONTENT_NOT_FOUND', message: 'Content not found' } },
          { status: 404 }
        );
      }

      return NextResponse.json({
        attemptId: existingAttempt.id,
        track: existingAttempt.track,
        content: { item, version: content },
        startedAt: existingAttempt.startedAt,
        resumed: true,
      });
    }

    // Get content item and version
    const item = await contentBankRepo.getContentItem(contentItemId);
    if (!item) {
      return NextResponse.json(
        { error: { code: 'CONTENT_NOT_FOUND', message: 'Content item not found' } },
        { status: 404 }
      );
    }

    // Verify track matches
    if (item.track !== track) {
      return NextResponse.json(
        { error: { code: 'TRACK_MISMATCH', message: `Content item is for track '${item.track}', not '${track}'` } },
        { status: 400 }
      );
    }

    // Get the version to use
    const version = versionId
      ? await contentBankRepo.getContentVersion(versionId)
      : await contentBankRepo.getPublishedContentVersion(contentItemId);

    if (!version) {
      return NextResponse.json(
        { error: { code: 'VERSION_NOT_FOUND', message: versionId ? 'Content version not found' : 'No published version available' } },
        { status: 404 }
      );
    }

    // Create the track attempt
    const now = clock.now();
    const attemptId = idGenerator.generate();

    const attempt = await trackAttemptRepo.create({
      id: attemptId,
      tenantId,
      userId,
      track,
      contentItemId,
      versionId: version.id,
      status: 'active',
      startedAt: now,
    });

    // Log the track attempt start
    console.log('[track-attempt] Started:', {
      attemptId: attempt.id,
      track,
      contentItemId,
      versionId: version.id,
      userId,
      timestamp: now,
    });

    return NextResponse.json({
      attemptId: attempt.id,
      track: attempt.track,
      content: { item, version },
      startedAt: attempt.startedAt,
    });
  } catch (error) {
    if (error instanceof Error && 'code' in error) {
      return NextResponse.json(
        { error: { code: (error as any).code, message: error.message } },
        { status: 400 }
      );
    }

    console.error('Unexpected error starting track attempt:', error);
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'An unexpected error occurred' } },
      { status: 500 }
    );
  }
}
