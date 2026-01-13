import { NextRequest, NextResponse } from 'next/server';
import { startAttempt } from '@scaffold/core/use-cases';
import { StartAttemptRequestSchema } from '@scaffold/contracts';
import { attemptRepo, contentRepo, skillRepo, eventSink, clock, idGenerator } from '@/lib/deps';
import { DEMO_TENANT_ID, DEMO_USER_ID } from '@/lib/constants';

/**
 * POST /api/attempts/start
 *
 * This route handler:
 * 1. Validates input with Zod schema from contracts
 * 2. Calls core use-case (pure business logic)
 * 3. Returns DTO from contracts
 *
 * NO business logic here - only orchestration
 */
export async function POST(request: NextRequest) {
  try {
    // Get tenant and user from headers (in production, from auth)
    const tenantId = request.headers.get('x-tenant-id') ?? DEMO_TENANT_ID;
    const userId = request.headers.get('x-user-id') ?? DEMO_USER_ID;

    // Check for existing active attempt - return it instead of erroring
    const activeAttempt = await attemptRepo.findActive(tenantId, userId);
    if (activeAttempt) {
      const problem = await contentRepo.findById(tenantId, activeAttempt.problemId);
      return NextResponse.json({
        attempt: activeAttempt,
        problem,
        resumed: true,
      });
    }

    // Parse and validate request body
    const body = await request.json();
    const parsed = StartAttemptRequestSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: parsed.error.message } },
        { status: 400 }
      );
    }

    // Call core use-case
    const result = await startAttempt(
      {
        tenantId,
        userId,
        problemId: parsed.data.problemId,
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
    });
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
