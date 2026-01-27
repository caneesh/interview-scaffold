import { NextRequest, NextResponse } from 'next/server';
import { startAttempt } from '@scaffold/core/use-cases';
import { StartAttemptRequestSchema } from '@scaffold/contracts';
import { attemptRepo, contentRepo, skillRepo, eventSink, clock, idGenerator } from '@/lib/deps';
import { isLegacyAttempt, ATTEMPT_V2_MODES, type AttemptV2Mode } from '@scaffold/core/entities';
import { DEMO_TENANT_ID, DEMO_USER_ID } from '@/lib/constants';

/**
 * POST /api/attempts/start
 *
 * Starts a new coding problem attempt using the legacy problem-based system.
 * For track-based attempts using the content bank, use /api/track-attempts/start instead.
 *
 * Optional V2 flow parameters:
 * - useV2Flow: boolean - Enable the 5-step V2 flow (UNDERSTAND -> PLAN -> IMPLEMENT -> VERIFY -> REFLECT)
 * - mode: 'BEGINNER' | 'EXPERT' - Scaffolding level (default: BEGINNER)
 *
 * NO business logic here - only orchestration
 */
export async function POST(request: NextRequest) {
  try {
    // Get tenant and user from headers (in production, from auth)
    const tenantId = request.headers.get('x-tenant-id') ?? DEMO_TENANT_ID;
    const userId = request.headers.get('x-user-id') ?? DEMO_USER_ID;

    const body = await request.json();

    return handleLegacyAttempt(tenantId, userId, body);
  } catch (error) {
    if (error instanceof Error && 'code' in error) {
      return NextResponse.json(
        { error: { code: (error as any).code, message: error.message } },
        { status: 400 }
      );
    }

    console.error('Unexpected error:', error);
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'An unexpected error occurred' } },
      { status: 500 }
    );
  }
}

/**
 * Handle legacy problem-based attempt
 */
async function handleLegacyAttempt(
  tenantId: string,
  userId: string,
  body: unknown
): Promise<NextResponse> {
  // Check for existing active attempt - return it instead of erroring
  const activeAttempt = await attemptRepo.findActive(tenantId, userId);
  if (activeAttempt) {
    // Only resume legacy attempts; track attempts should use a different endpoint
    if (!isLegacyAttempt(activeAttempt)) {
      return NextResponse.json(
        { error: { code: 'TRACK_ATTEMPT_IN_PROGRESS', message: 'A track-based attempt is in progress. Complete it or use /api/track-attempts/start.' } },
        { status: 400 }
      );
    }
    const problem = await contentRepo.findById(tenantId, activeAttempt.problemId);
    return NextResponse.json({
      attempt: activeAttempt,
      problem,
      resumed: true,
    });
  }

  // Parse and validate request body
  const parsed = StartAttemptRequestSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: { code: 'VALIDATION_ERROR', message: parsed.error.message } },
      { status: 400 }
    );
  }

  // Check for V2 flow options
  // These are optional and not part of the standard schema
  const useV2Flow = Boolean((body as Record<string, unknown>).useV2Flow);
  const rawMode = (body as Record<string, unknown>).mode as string | undefined;
  const mode: AttemptV2Mode =
    rawMode && ATTEMPT_V2_MODES.includes(rawMode as AttemptV2Mode)
      ? (rawMode as AttemptV2Mode)
      : 'BEGINNER';

  // Call core use-case
  const result = await startAttempt(
    {
      tenantId,
      userId,
      problemId: parsed.data.problemId,
      useV2Flow,
      mode,
    },
    {
      attemptRepo,
      contentRepo,
      skillRepo,
      eventSink,
      clock,
      idGenerator,
    }
  );

  // Return response (matches contracts schema)
  return NextResponse.json({
    attempt: result.attempt,
    problem: result.problem,
    isV2: useV2Flow,
  });
}
