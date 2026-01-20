import { NextRequest, NextResponse } from 'next/server';
import { SubmitFramingAnswerRequestSchema } from '@scaffold/contracts';
import { processProblemFraming } from '@scaffold/core/learner-centric';
import {
  getCoachingSession,
  setCoachingSession,
  storageToSessionFormat,
  sessionToStorageFormat,
} from '@/lib/coaching-session-store';

/**
 * POST /api/coaching/sessions/:sessionId/framing
 *
 * Submit an answer to a problem framing question
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { sessionId: string } }
) {
  try {
    const body = await request.json();
    const parsed = SubmitFramingAnswerRequestSchema.safeParse({
      ...body,
      sessionId: params.sessionId,
    });

    if (!parsed.success) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: parsed.error.message } },
        { status: 400 }
      );
    }

    const { sessionId, questionId, answer } = parsed.data;

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
    if (session.currentStage !== 'PROBLEM_FRAMING') {
      return NextResponse.json(
        { error: { code: 'WRONG_STAGE', message: 'Not in problem framing stage' } },
        { status: 400 }
      );
    }

    // Process the answer
    const result = processProblemFraming(session, problem, questionId, answer);

    // Update stored session with proper type conversion
    setCoachingSession(sessionId, {
      session: sessionToStorageFormat(result.session),
      problem,
    });

    const framingData = result.session.stageData.problemFraming;

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
      understandingScore: framingData?.understandingScore ?? 0,
      isComplete: framingData?.isComplete ?? false,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const errorStack = error instanceof Error ? error.stack : undefined;
    if (process.env.NODE_ENV !== 'test') {
      console.error(JSON.stringify({
        level: 'error',
        message: 'Error processing framing answer',
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
