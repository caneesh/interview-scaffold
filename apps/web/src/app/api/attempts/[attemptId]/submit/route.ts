import { NextRequest, NextResponse } from 'next/server';
import { submitCode } from '@scaffold/core/use-cases';
import type { CodeExecutor } from '@scaffold/core/use-cases';
import { SubmitCodeRequestSchema } from '@scaffold/contracts';
import { attemptRepo, contentRepo, eventSink, clock, idGenerator } from '@/lib/deps';
import type { TestResultData } from '@scaffold/core/entities';

/**
 * Simple code executor for demo - in production, use sandboxed execution
 */
const demoCodeExecutor: CodeExecutor = {
  async execute(
    _code: string,
    _language: string,
    testCases: readonly { input: string; expectedOutput: string }[]
  ): Promise<readonly TestResultData[]> {
    // Demo: simulate test execution
    // In production, this would run code in a sandboxed environment
    return testCases.map((tc) => ({
      input: tc.input,
      expected: tc.expectedOutput,
      actual: tc.expectedOutput, // Demo: always pass
      passed: true,
      error: null,
    }));
  },
};

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
    const tenantId = request.headers.get('x-tenant-id') ?? 'default';
    const userId = request.headers.get('x-user-id') ?? 'demo';

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
        eventSink,
        clock,
        idGenerator,
        codeExecutor: demoCodeExecutor,
      }
    );

    return NextResponse.json({
      attempt: result.attempt,
      testResults: result.testResults,
      passed: result.passed,
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
