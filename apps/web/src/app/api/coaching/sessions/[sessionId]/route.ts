import { NextRequest, NextResponse } from 'next/server';
import { getSessionProgress } from '@scaffold/core/learner-centric';
import { getCoachingSession, storageToSessionFormat } from '@/lib/coaching-session-store';

/**
 * GET /api/coaching/sessions/:sessionId
 *
 * Get current coaching session state
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { sessionId: string } }
) {
  try {
    const { sessionId } = params;

    const sessionData = getCoachingSession(sessionId);
    if (!sessionData) {
      return NextResponse.json(
        { error: { code: 'SESSION_NOT_FOUND', message: 'Coaching session not found' } },
        { status: 404 }
      );
    }

    // Convert from storage format (ISO strings) to session format (Dates)
    const session = storageToSessionFormat(sessionData.session);
    const progress = getSessionProgress(session);

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
      currentStage: session.currentStage,
      progress: {
        stageIndex: progress.stageIndex,
        totalStages: progress.totalStages,
        percentComplete: progress.percentComplete,
      },
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const errorStack = error instanceof Error ? error.stack : undefined;
    if (process.env.NODE_ENV !== 'test') {
      console.error(JSON.stringify({
        level: 'error',
        message: 'Error getting coaching session',
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
