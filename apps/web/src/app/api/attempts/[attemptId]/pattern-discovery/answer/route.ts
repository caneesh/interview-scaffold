import { NextRequest, NextResponse } from 'next/server';
import { submitPatternDiscoveryAnswer } from '@scaffold/core/use-cases';
import { SubmitPatternDiscoveryAnswerRequestSchema } from '@scaffold/contracts';
import { attemptRepo, contentRepo, clock } from '@/lib/deps';
import { DEMO_TENANT_ID, DEMO_USER_ID } from '@/lib/constants';

/**
 * POST /api/attempts/[attemptId]/pattern-discovery/answer
 *
 * Submits an answer to a pattern discovery question
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { attemptId: string } }
) {
  try {
    const tenantId = request.headers.get('x-tenant-id') ?? DEMO_TENANT_ID;
    const userId = request.headers.get('x-user-id') ?? DEMO_USER_ID;

    const body = await request.json();
    const parsed = SubmitPatternDiscoveryAnswerRequestSchema.safeParse({
      ...body,
      attemptId: params.attemptId,
    });

    if (!parsed.success) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: parsed.error.message } },
        { status: 400 }
      );
    }

    const result = await submitPatternDiscoveryAnswer(
      {
        tenantId,
        userId,
        attemptId: params.attemptId,
        stepId: parsed.data.stepId,
        questionId: parsed.data.questionId,
        answer: parsed.data.answer,
      },
      { attemptRepo, contentRepo, clock }
    );

    return NextResponse.json({
      nextQuestion: result.nextQuestion,
      nextQuestionId: result.nextQuestionId,
      discoveredPattern: result.discoveredPattern,
      completed: result.completed,
      qaLog: result.qaLog.map(qa => ({
        questionId: qa.questionId,
        question: qa.question,
        answer: qa.answer,
        timestamp: qa.timestamp.toISOString(),
      })),
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
