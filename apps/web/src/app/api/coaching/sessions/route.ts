import { NextRequest, NextResponse } from 'next/server';
import { StartCoachingSessionRequestSchema } from '@scaffold/contracts';
import { createCoachingSession } from '@scaffold/core/learner-centric';
import { attemptRepo, contentRepo, idGenerator } from '@/lib/deps';
import { DEMO_TENANT_ID, DEMO_USER_ID } from '@/lib/constants';
import { setCoachingSession, sessionToStorageFormat } from '@/lib/coaching-session-store';

/**
 * POST /api/coaching/sessions
 *
 * Start a new coaching session for an attempt
 */
export async function POST(request: NextRequest) {
  try {
    const tenantId = request.headers.get('x-tenant-id') ?? DEMO_TENANT_ID;
    const userId = request.headers.get('x-user-id') ?? DEMO_USER_ID;

    const body = await request.json();
    const parsed = StartCoachingSessionRequestSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: parsed.error.message } },
        { status: 400 }
      );
    }

    const { attemptId, problemId } = parsed.data;

    // Verify attempt exists
    const attempt = await attemptRepo.findById(tenantId, attemptId);
    if (!attempt) {
      return NextResponse.json(
        { error: { code: 'ATTEMPT_NOT_FOUND', message: 'Attempt not found' } },
        { status: 404 }
      );
    }

    // Get problem
    const problem = await contentRepo.findById(tenantId, problemId);
    if (!problem) {
      return NextResponse.json(
        { error: { code: 'PROBLEM_NOT_FOUND', message: 'Problem not found' } },
        { status: 404 }
      );
    }

    // Create coaching session
    const sessionId = idGenerator.generate();
    const session = createCoachingSession(
      sessionId,
      attemptId,
      tenantId,
      userId,
      problem
    );

    // Store session with proper type conversion (dates as ISO strings)
    setCoachingSession(sessionId, {
      session: sessionToStorageFormat(session),
      problem,
    });

    // Get initial questions from problem framing data
    const initialQuestions = session.stageData.problemFraming?.currentQuestionBatch ?? [];

    return NextResponse.json({
      session: {
        id: session.id,
        attemptId: session.attemptId,
        tenantId: session.tenantId,
        userId: session.userId,
        problemId: session.problemId,
        currentStage: session.currentStage,
        helpLevel: session.helpLevel,
        startedAt: session.startedAt.toISOString(),
        completedAt: session.completedAt?.toISOString() ?? null,
      },
      initialQuestions,
    });
  } catch (error) {
    // Log error with context for debugging
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const errorStack = error instanceof Error ? error.stack : undefined;
    // In production, use structured logging (e.g., pino, winston)
    // For now, log with structured format
    if (process.env.NODE_ENV !== 'test') {
      console.error(JSON.stringify({
        level: 'error',
        message: 'Error creating coaching session',
        error: errorMessage,
        stack: errorStack,
      }));
    }
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'An unexpected error occurred' } },
      { status: 500 }
    );
  }
}
