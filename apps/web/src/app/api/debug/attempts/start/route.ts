import { NextRequest, NextResponse } from 'next/server';
import { StartDebugAttemptRequestSchema } from '@scaffold/contracts';
import {
  startDebugAttempt,
  DebugAttemptError,
  getGatePrompt,
} from '@scaffold/core/debug-track';
import type { TenantId } from '@scaffold/core/entities';
import { DEMO_TENANT_ID, DEMO_USER_ID } from '@/lib/constants';
import { inMemoryDebugScenarioRepo, inMemoryDebugAttemptRepo } from '@/lib/debug-track-repos';
import { clock, idGenerator } from '@/lib/deps';

// Null event sink for now (events are logged but not persisted)
const nullEventSink = {
  emit: async () => {},
};

/**
 * POST /api/debug/attempts/start
 *
 * Starts a new debug track attempt for a scenario.
 * Returns the attempt with scenario details and first gate prompt.
 */
export async function POST(request: NextRequest) {
  try {
    const tenantId = (request.headers.get('x-tenant-id') ?? DEMO_TENANT_ID) as TenantId;
    const userId = request.headers.get('x-user-id') ?? DEMO_USER_ID;

    // Parse and validate request body
    const body = await request.json();
    const parsed = StartDebugAttemptRequestSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: parsed.error.message } },
        { status: 400 }
      );
    }

    // Use the core use case
    const result = await startDebugAttempt(
      {
        tenantId,
        userId,
        scenarioId: parsed.data.scenarioId,
      },
      {
        debugScenarioRepo: inMemoryDebugScenarioRepo,
        debugAttemptRepo: inMemoryDebugAttemptRepo,
        eventSink: nullEventSink,
        clock,
        idGenerator,
      }
    );

    // Mask sensitive fields for client response
    const maskedScenario = {
      id: result.scenario.id,
      category: result.scenario.category,
      patternKey: result.scenario.patternKey,
      difficulty: result.scenario.difficulty,
      symptomDescription: result.scenario.symptomDescription,
      codeArtifacts: result.scenario.codeArtifacts.map((a) => ({
        id: a.id,
        filename: a.filename,
        code: a.code,
        language: a.language,
        description: a.description,
        // Exclude bugLines
      })),
      tags: result.scenario.tags,
      createdAt: result.scenario.createdAt,
    };

    return NextResponse.json({
      attempt: result.attempt,
      scenario: maskedScenario,
      currentGatePrompt: getGatePrompt(result.attempt.currentGate),
    });
  } catch (error) {
    if (error instanceof DebugAttemptError) {
      return NextResponse.json(
        { error: { code: error.code, message: error.message } },
        { status: 400 }
      );
    }

    console.error('Error starting debug attempt:', error);
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'An unexpected error occurred' } },
      { status: 500 }
    );
  }
}
