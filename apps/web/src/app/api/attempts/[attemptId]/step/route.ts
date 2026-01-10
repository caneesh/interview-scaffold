import { NextRequest, NextResponse } from 'next/server';
import { submitStep } from '@scaffold/core/use-cases';
import { SubmitThinkingGateRequestSchema, SubmitReflectionRequestSchema } from '@scaffold/contracts';
import { attemptRepo, contentRepo, eventSink, clock, idGenerator } from '@/lib/deps';
import type { StepData } from '@scaffold/core/entities';
import { DEMO_TENANT_ID, DEMO_USER_ID } from '@/lib/constants';

/**
 * POST /api/attempts/[attemptId]/step
 *
 * Submits a step (thinking gate or reflection)
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { attemptId: string } }
) {
  try {
    const tenantId = request.headers.get('x-tenant-id') ?? DEMO_TENANT_ID;
    const userId = request.headers.get('x-user-id') ?? DEMO_USER_ID;

    const body = await request.json();
    const stepType = body.stepType as string;

    let stepData: StepData;

    if (stepType === 'THINKING_GATE') {
      const parsed = SubmitThinkingGateRequestSchema.safeParse({
        ...body,
        attemptId: params.attemptId,
      });

      if (!parsed.success) {
        return NextResponse.json(
          { error: { code: 'VALIDATION_ERROR', message: parsed.error.message } },
          { status: 400 }
        );
      }

      stepData = {
        type: 'THINKING_GATE',
        selectedPattern: parsed.data.selectedPattern,
        statedInvariant: parsed.data.statedInvariant,
        statedComplexity: parsed.data.statedComplexity ?? null,
      };
    } else if (stepType === 'REFLECTION') {
      const parsed = SubmitReflectionRequestSchema.safeParse({
        ...body,
        attemptId: params.attemptId,
      });

      if (!parsed.success) {
        return NextResponse.json(
          { error: { code: 'VALIDATION_ERROR', message: parsed.error.message } },
          { status: 400 }
        );
      }

      stepData = {
        type: 'REFLECTION',
        selectedOptionId: parsed.data.selectedOptionId,
        correct: body.correct ?? false, // In production, server would determine correctness
      };
    } else {
      return NextResponse.json(
        { error: { code: 'INVALID_STEP_TYPE', message: `Unknown step type: ${stepType}` } },
        { status: 400 }
      );
    }

    const result = await submitStep(
      {
        tenantId,
        userId,
        attemptId: params.attemptId,
        stepType: stepType as 'THINKING_GATE' | 'REFLECTION',
        data: stepData,
      },
      { attemptRepo, contentRepo, eventSink, clock, idGenerator }
    );

    // Include validation result for THINKING_GATE steps
    return NextResponse.json({
      attempt: result.attempt,
      step: result.step,
      passed: result.passed,
      ...(result.validation && { validation: result.validation }),
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
