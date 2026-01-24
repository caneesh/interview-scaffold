import { NextRequest, NextResponse } from 'next/server';
import { SubmitDebugGateRequestSchema } from '@scaffold/contracts';
import {
  submitDebugGate,
  DebugGateError,
  getGatePrompt,
} from '@scaffold/core/debug-track';
import type { TenantId } from '@scaffold/core/entities';
import { DEMO_TENANT_ID, DEMO_USER_ID } from '@/lib/constants';
import { inMemoryDebugScenarioRepo, inMemoryDebugAttemptRepo } from '@/lib/debug-track-repos';
import { clock } from '@/lib/deps';

// Null event sink for now
const nullEventSink = {
  emit: async () => {},
};

// Simple heuristic evaluator
const heuristicEvaluator = {
  async evaluate(
    gate: string,
    answer: string,
    scenario: { expectedFindings: readonly string[]; patternKey: string }
  ) {
    const answerLower = answer.toLowerCase();
    const answerLength = answer.trim().length;

    // Minimum length check
    if (answerLength < 20) {
      return {
        isCorrect: false,
        confidence: 0.9,
        feedback: 'Your answer is too brief. Please provide more detail.',
        rubricScores: {
          ACCURACY: 0.2,
          COMPLETENESS: 0.1,
          SPECIFICITY: 0.1,
          TECHNICAL_DEPTH: 0.1,
          CLARITY: 0.5,
          ACTIONABILITY: 0.2,
        } as const,
        nextGate: null,
        allowProceed: false,
      };
    }

    // Check for keyword matches
    let matchScore = 0;
    for (const finding of scenario.expectedFindings) {
      const keywords = finding.toLowerCase().split(/\s+/).filter((w) => w.length > 3);
      for (const keyword of keywords) {
        if (answerLower.includes(keyword)) {
          matchScore += 0.1;
        }
      }
    }

    const normalizedScore = Math.min(1, matchScore);
    const isCorrect = normalizedScore >= 0.3;
    const allowProceed = answerLength >= 50 || normalizedScore >= 0.2;

    return {
      isCorrect,
      confidence: 0.7,
      feedback: isCorrect
        ? 'Good analysis! Moving to the next gate.'
        : allowProceed
        ? 'Partial credit. You can proceed to the next gate.'
        : 'Please provide more detail in your analysis.',
      rubricScores: {
        ACCURACY: normalizedScore,
        COMPLETENESS: Math.min(1, answerLength / 200),
        SPECIFICITY: normalizedScore * 0.8,
        TECHNICAL_DEPTH: normalizedScore * 0.7,
        CLARITY: 0.6,
        ACTIONABILITY: normalizedScore * 0.5,
      } as const,
      nextGate: null,
      allowProceed,
    };
  },
  isLLMAvailable: () => false,
};

/**
 * POST /api/debug/attempts/[attemptId]/submit
 *
 * Submits an answer for the current gate.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ attemptId: string }> }
) {
  try {
    const { attemptId } = await params;
    const tenantId = (request.headers.get('x-tenant-id') ?? DEMO_TENANT_ID) as TenantId;
    const userId = request.headers.get('x-user-id') ?? DEMO_USER_ID;

    const body = await request.json();
    const parsed = SubmitDebugGateRequestSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: parsed.error.message } },
        { status: 400 }
      );
    }

    const result = await submitDebugGate(
      {
        tenantId,
        userId,
        attemptId,
        gateId: parsed.data.gateId,
        answer: parsed.data.answer,
      },
      {
        debugScenarioRepo: inMemoryDebugScenarioRepo,
        debugAttemptRepo: inMemoryDebugAttemptRepo,
        debugEvaluator: heuristicEvaluator,
        eventSink: nullEventSink,
        clock,
      }
    );

    const nextGatePrompt = result.nextGate ? getGatePrompt(result.nextGate) : null;

    return NextResponse.json({
      attempt: result.attempt,
      evaluation: result.evaluationResult,
      nextGatePrompt,
      isComplete: result.attempt.status === 'COMPLETED',
    });
  } catch (error) {
    if (error instanceof DebugGateError) {
      return NextResponse.json(
        { error: { code: error.code, message: error.message } },
        { status: 400 }
      );
    }

    console.error('Error submitting debug gate:', error);
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'An unexpected error occurred' } },
      { status: 500 }
    );
  }
}
