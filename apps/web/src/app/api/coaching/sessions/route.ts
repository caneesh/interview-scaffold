import { NextRequest, NextResponse } from 'next/server';
import { StartCoachingSessionRequestSchema } from '@scaffold/contracts';
import { createCoachingSession } from '@scaffold/core/learner-centric';
import { createInitialContext, InterviewStateMachine } from '@scaffold/core';
import { attemptRepo, contentRepo, idGenerator } from '@/lib/deps';
import { DEMO_TENANT_ID, DEMO_USER_ID } from '@/lib/constants';
import {
  setCoachingSession,
  sessionToStorageFormat,
  machineContextToStorageFormat,
  createInitialMemorizationTracking,
} from '@/lib/coaching-session-store';

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

    const { problemId } = parsed.data;
    // Auto-generate attemptId if not provided
    const attemptId = parsed.data.attemptId ?? idGenerator.generate();

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

    // Initialize state machine context for formal state transitions
    const machineContext = createInitialContext({
      attemptId: sessionId,
      userId,
      problemId,
      pattern: problem.pattern,
    });
    const machine = new InterviewStateMachine(machineContext);

    // Store session with proper type conversion (dates as ISO strings)
    // Include state machine context and memorization tracking
    setCoachingSession(sessionId, {
      session: sessionToStorageFormat(session),
      problem,
      machineContext: machineContextToStorageFormat(machine.getContext()),
      memorizationTracking: createInitialMemorizationTracking(),
    });

    // Get initial questions from problem framing data
    const initialQuestions = session.stageData.problemFraming?.currentQuestionBatch ?? [];

    // Get state machine progress info
    const progress = machine.getProgress();

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
      // Include state machine info in response
      stateMachine: {
        currentState: progress.currentState,
        stateIndex: progress.stateIndex,
        totalStates: progress.totalStates,
        percentComplete: progress.percentComplete,
        validEvents: machine.getValidEvents(),
      },
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
