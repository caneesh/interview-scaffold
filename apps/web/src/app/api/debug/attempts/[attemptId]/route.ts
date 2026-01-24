import { NextRequest, NextResponse } from 'next/server';
import { getGatePrompt } from '@scaffold/core/debug-track';
import type { TenantId } from '@scaffold/core/entities';
import { DEMO_TENANT_ID, DEMO_USER_ID } from '@/lib/constants';
import { inMemoryDebugScenarioRepo, inMemoryDebugAttemptRepo } from '@/lib/debug-track-repos';

/**
 * GET /api/debug/attempts/[attemptId]
 *
 * Returns attempt details including scenario (without sensitive data).
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ attemptId: string }> }
) {
  try {
    const { attemptId } = await params;
    const tenantId = (request.headers.get('x-tenant-id') ?? DEMO_TENANT_ID) as TenantId;
    const userId = request.headers.get('x-user-id') ?? DEMO_USER_ID;

    const attempt = await inMemoryDebugAttemptRepo.findById(tenantId, attemptId);
    if (!attempt) {
      return NextResponse.json(
        { error: { code: 'ATTEMPT_NOT_FOUND', message: 'Attempt not found' } },
        { status: 404 }
      );
    }

    if (attempt.userId !== userId) {
      return NextResponse.json(
        { error: { code: 'FORBIDDEN', message: 'You do not own this attempt' } },
        { status: 403 }
      );
    }

    const scenario = await inMemoryDebugScenarioRepo.findById(attempt.scenarioId);
    if (!scenario) {
      return NextResponse.json(
        { error: { code: 'SCENARIO_NOT_FOUND', message: 'Scenario not found' } },
        { status: 404 }
      );
    }

    // Mask sensitive fields for client response
    const maskedScenario = {
      id: scenario.id,
      category: scenario.category,
      patternKey: scenario.patternKey,
      difficulty: scenario.difficulty,
      symptomDescription: scenario.symptomDescription,
      codeArtifacts: scenario.codeArtifacts.map((a) => ({
        id: a.id,
        filename: a.filename,
        code: a.code,
        language: a.language,
        description: a.description,
        // Exclude bugLines
      })),
      tags: scenario.tags,
      createdAt: scenario.createdAt,
    };

    const currentGatePrompt = attempt.status === 'IN_PROGRESS'
      ? getGatePrompt(attempt.currentGate)
      : null;

    return NextResponse.json({
      attempt,
      scenario: maskedScenario,
      currentGatePrompt,
    });
  } catch (error) {
    console.error('Error getting debug attempt:', error);
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'An unexpected error occurred' } },
      { status: 500 }
    );
  }
}
