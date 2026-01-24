import { NextRequest, NextResponse } from 'next/server';
import {
  finalizeDebugAttempt,
  DebugAttemptError,
} from '@scaffold/core/debug-track';
import type { TenantId } from '@scaffold/core/entities';
import { DEMO_TENANT_ID, DEMO_USER_ID } from '@/lib/constants';
import { inMemoryDebugScenarioRepo, inMemoryDebugAttemptRepo } from '@/lib/debug-track-repos';
import { clock } from '@/lib/deps';

// Null event sink for now
const nullEventSink = {
  emit: async () => {},
};

/**
 * POST /api/debug/attempts/[attemptId]/finalize
 *
 * Finalizes the attempt, computing the final score.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ attemptId: string }> }
) {
  try {
    const { attemptId } = await params;
    const tenantId = (request.headers.get('x-tenant-id') ?? DEMO_TENANT_ID) as TenantId;
    const userId = request.headers.get('x-user-id') ?? DEMO_USER_ID;

    const result = await finalizeDebugAttempt(
      {
        tenantId,
        userId,
        attemptId,
      },
      {
        debugScenarioRepo: inMemoryDebugScenarioRepo,
        debugAttemptRepo: inMemoryDebugAttemptRepo,
        eventSink: nullEventSink,
        clock,
      }
    );

    const durationMs = result.attempt.completedAt
      ? result.attempt.completedAt.getTime() - result.attempt.startedAt.getTime()
      : 0;

    return NextResponse.json({
      attempt: result.attempt,
      score: result.score,
      summary: {
        gatesCompleted: result.attempt.gateHistory.length,
        totalGates: 7,
        hintsUsed: result.attempt.hintsUsed,
        timeSpentSeconds: Math.floor(durationMs / 1000),
      },
    });
  } catch (error) {
    if (error instanceof DebugAttemptError) {
      return NextResponse.json(
        { error: { code: error.code, message: error.message } },
        { status: 400 }
      );
    }

    console.error('Error finalizing debug attempt:', error);
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'An unexpected error occurred' } },
      { status: 500 }
    );
  }
}
