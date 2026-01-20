import { NextRequest, NextResponse } from 'next/server';
import { SubmitStrategyRequestSchema, SubmitAdversarialAnswerRequestSchema } from '@scaffold/contracts';
import { processStrategy, processAdversarial } from '@scaffold/core/learner-centric';
import {
  getCoachingSession,
  setCoachingSession,
  storageToSessionFormat,
  sessionToStorageFormat,
} from '@/lib/coaching-session-store';

/**
 * POST /api/coaching/sessions/:sessionId/strategy
 *
 * Submit a strategy design
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { sessionId: string } }
) {
  try {
    const body = await request.json();

    // Check if this is an adversarial answer or a strategy submission
    if (body.questionId) {
      // This is an adversarial answer
      const parsed = SubmitAdversarialAnswerRequestSchema.safeParse({
        ...body,
        sessionId: params.sessionId,
      });

      if (!parsed.success) {
        return NextResponse.json(
          { error: { code: 'VALIDATION_ERROR', message: parsed.error.message } },
          { status: 400 }
        );
      }

      return handleAdversarialAnswer(params.sessionId, parsed.data.questionId, parsed.data.answer);
    }

    // This is a strategy submission
    const parsed = SubmitStrategyRequestSchema.safeParse({
      ...body,
      sessionId: params.sessionId,
    });

    if (!parsed.success) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: parsed.error.message } },
        { status: 400 }
      );
    }

    const { sessionId, strategy } = parsed.data;

    const sessionData = getCoachingSession(sessionId);
    if (!sessionData) {
      return NextResponse.json(
        { error: { code: 'SESSION_NOT_FOUND', message: 'Coaching session not found' } },
        { status: 404 }
      );
    }

    // Convert from storage format to session format
    const session = storageToSessionFormat(sessionData.session);
    const { problem } = sessionData;

    // Verify we're in the right stage
    if (session.currentStage !== 'STRATEGY_DESIGN') {
      return NextResponse.json(
        { error: { code: 'WRONG_STAGE', message: 'Not in strategy design stage' } },
        { status: 400 }
      );
    }

    // Process the strategy
    const result = processStrategy(session, problem, strategy);

    // Update stored session with proper type conversion
    setCoachingSession(sessionId, {
      session: sessionToStorageFormat(result.session),
      problem,
    });

    const strategyData = result.session.stageData.strategyDesign;

    return NextResponse.json({
      session: {
        id: result.session.id,
        attemptId: result.session.attemptId,
        tenantId: result.session.tenantId,
        userId: result.session.userId,
        problemId: result.session.problemId,
        currentStage: result.session.currentStage,
        helpLevel: result.session.helpLevel,
        startedAt: result.session.startedAt.toISOString(),
        completedAt: result.session.completedAt?.toISOString() ?? null,
      },
      response: result.response,
      isReady: strategyData?.isReadyToCode ?? false,
      adversarialQuestions: (strategyData?.adversarialQuestions ?? [])
        .filter(q => !q.isResolved)
        .map(q => ({ id: q.id, question: q.question })),
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const errorStack = error instanceof Error ? error.stack : undefined;
    if (process.env.NODE_ENV !== 'test') {
      console.error(JSON.stringify({
        level: 'error',
        message: 'Error processing strategy',
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

async function handleAdversarialAnswer(
  sessionId: string,
  questionId: string,
  answer: string
) {
  const sessionData = getCoachingSession(sessionId);
  if (!sessionData) {
    return NextResponse.json(
      { error: { code: 'SESSION_NOT_FOUND', message: 'Coaching session not found' } },
      { status: 404 }
    );
  }

  // Convert from storage format to session format
  const session = storageToSessionFormat(sessionData.session);
  const { problem } = sessionData;

  // Verify we're in the right stage
  if (session.currentStage !== 'STRATEGY_DESIGN') {
    return NextResponse.json(
      { error: { code: 'WRONG_STAGE', message: 'Not in strategy design stage' } },
      { status: 400 }
    );
  }

  // Process the adversarial answer
  const result = processAdversarial(session, problem, questionId, answer);

  // Update stored session with proper type conversion
  setCoachingSession(sessionId, {
    session: sessionToStorageFormat(result.session),
    problem,
  });

  const strategyData = result.session.stageData.strategyDesign;

  return NextResponse.json({
    session: {
      id: result.session.id,
      attemptId: result.session.attemptId,
      tenantId: result.session.tenantId,
      userId: result.session.userId,
      problemId: result.session.problemId,
      currentStage: result.session.currentStage,
      helpLevel: result.session.helpLevel,
      startedAt: result.session.startedAt.toISOString(),
      completedAt: result.session.completedAt?.toISOString() ?? null,
    },
    response: result.response,
    isReady: strategyData?.isReadyToCode ?? false,
  });
}
