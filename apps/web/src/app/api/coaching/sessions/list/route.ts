import { NextRequest, NextResponse } from 'next/server';
import { DEMO_TENANT_ID, DEMO_USER_ID } from '@/lib/constants';
import { getCoachingSessionsByUser } from '@/lib/coaching-session-store';

export const dynamic = 'force-dynamic';

/**
 * GET /api/coaching/sessions/list
 *
 * Returns all coaching sessions for the current user
 */
export async function GET(request: NextRequest) {
  try {
    const tenantId = request.headers.get('x-tenant-id') ?? DEMO_TENANT_ID;
    const userId = request.headers.get('x-user-id') ?? DEMO_USER_ID;

    const sessions = getCoachingSessionsByUser(tenantId, userId);

    return NextResponse.json({
      sessions: sessions.map(data => ({
        id: data.session.id,
        attemptId: data.session.attemptId,
        problemId: data.session.problemId,
        problemTitle: data.problem.title,
        problemPattern: data.problem.pattern,
        problemRung: data.problem.rung,
        currentStage: data.session.currentStage,
        helpLevel: data.session.helpLevel,
        startedAt: data.session.startedAt,
        completedAt: data.session.completedAt,
        isCompleted: data.session.completedAt !== null,
      })),
      total: sessions.length,
    });
  } catch (error) {
    console.error('Error listing coaching sessions:', error);
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'An unexpected error occurred' } },
      { status: 500 }
    );
  }
}
