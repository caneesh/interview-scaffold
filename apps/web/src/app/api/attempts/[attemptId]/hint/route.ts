import { NextRequest, NextResponse } from 'next/server';
import { submitStep } from '@scaffold/core/use-cases';
import { generateHint, getHintBudgetState, isHintBudgetExhausted } from '@scaffold/core/hints';
import { attemptRepo, contentRepo, eventSink, clock, idGenerator } from '@/lib/deps';
import type { HintLevel } from '@scaffold/core/entities';
import { isLegacyAttempt } from '@scaffold/core/entities';
import { DEMO_TENANT_ID, DEMO_USER_ID } from '@/lib/constants';

/**
 * POST /api/attempts/[attemptId]/hint
 *
 * Requests the next hint for an attempt
 * Uses the hint generation pipeline with budget enforcement
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { attemptId: string } }
) {
  try {
    const tenantId = request.headers.get('x-tenant-id') ?? DEMO_TENANT_ID;
    const userId = request.headers.get('x-user-id') ?? DEMO_USER_ID;

    // Get current attempt
    const attempt = await attemptRepo.findById(tenantId, params.attemptId);
    if (!attempt) {
      return NextResponse.json(
        { error: { code: 'ATTEMPT_NOT_FOUND', message: 'Attempt not found' } },
        { status: 404 }
      );
    }

    // Hints only work with legacy problem-based attempts
    if (!isLegacyAttempt(attempt)) {
      return NextResponse.json(
        { error: { code: 'TRACK_ATTEMPT_NOT_SUPPORTED', message: 'Hints only support legacy problem-based attempts' } },
        { status: 400 }
      );
    }

    // Check if hint budget is exhausted
    if (isHintBudgetExhausted(attempt.hintsUsed)) {
      const budget = getHintBudgetState(attempt.hintsUsed);
      return NextResponse.json(
        {
          error: {
            code: 'HINT_BUDGET_EXHAUSTED',
            message: 'Hint budget exhausted. No more hints available.',
          },
          budget,
        },
        { status: 400 }
      );
    }

    // Get the problem for context-aware hint generation
    const problem = await contentRepo.findById(tenantId, attempt.problemId);
    if (!problem) {
      return NextResponse.json(
        { error: { code: 'PROBLEM_NOT_FOUND', message: 'Problem not found' } },
        { status: 404 }
      );
    }

    // Generate the hint using the pipeline
    const hintResult = generateHint({
      problem,
      hintsUsed: attempt.hintsUsed,
    });

    if (!hintResult) {
      return NextResponse.json(
        { error: { code: 'NO_MORE_HINTS', message: 'No more hints available' } },
        { status: 400 }
      );
    }

    // Record the hint as a step
    const result = await submitStep(
      {
        tenantId,
        userId,
        attemptId: params.attemptId,
        stepType: 'HINT',
        data: {
          type: 'HINT',
          level: hintResult.level,
          text: hintResult.text,
        },
      },
      { attemptRepo, contentRepo, eventSink, clock, idGenerator }
    );

    // Get updated budget state
    const budget = getHintBudgetState(result.attempt.hintsUsed);

    return NextResponse.json({
      attempt: result.attempt,
      hint: {
        level: hintResult.level,
        text: hintResult.text,
        cost: hintResult.cost,
      },
      budget,
      isLastHint: hintResult.isLastHint,
    });
  } catch (error) {
    if (error instanceof Error && 'code' in error) {
      return NextResponse.json(
        { error: { code: (error as any).code, message: error.message } },
        { status: 400 }
      );
    }

    console.error('Unexpected error:', error);
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'An unexpected error occurred' } },
      { status: 500 }
    );
  }
}
