import { NextRequest, NextResponse } from 'next/server';
import { submitCode } from '@scaffold/core/use-cases';
import { SubmitCodeRequestSchema } from '@scaffold/contracts';
import { attemptRepo, contentRepo, skillRepo, eventSink, clock, idGenerator, codeExecutor, getLLMValidation } from '@/lib/deps';
import { DEMO_TENANT_ID, DEMO_USER_ID } from '@/lib/constants';

/**
 * POST /api/attempts/[attemptId]/submit
 *
 * Submits code for evaluation
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { attemptId: string } }
) {
  try {
    const tenantId = request.headers.get('x-tenant-id') ?? DEMO_TENANT_ID;
    const userId = request.headers.get('x-user-id') ?? DEMO_USER_ID;

    const body = await request.json();
    const parsed = SubmitCodeRequestSchema.safeParse({
      ...body,
      attemptId: params.attemptId,
    });

    if (!parsed.success) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: parsed.error.message } },
        { status: 400 }
      );
    }

    // Get attempt and problem for LLM validation context
    const attempt = await attemptRepo.findById(tenantId, parsed.data.attemptId);
    if (!attempt) {
      return NextResponse.json(
        { error: { code: 'ATTEMPT_NOT_FOUND', message: 'Attempt not found' } },
        { status: 404 }
      );
    }
    const problem = await contentRepo.findById(tenantId, attempt.problemId);
    const problemStatement = problem?.statement ?? '';

    const result = await submitCode(
      {
        tenantId,
        userId,
        attemptId: parsed.data.attemptId,
        code: parsed.data.code,
        language: parsed.data.language,
      },
      {
        attemptRepo,
        contentRepo,
        skillRepo,
        eventSink,
        clock,
        idGenerator,
        codeExecutor,
        llmValidation: getLLMValidation(problemStatement),
      }
    );

    return NextResponse.json({
      attempt: result.attempt,
      testResults: result.testResults,
      passed: result.passed,
      validation: result.validation,
      gatingDecision: result.gatingDecision,
      score: result.score,
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
