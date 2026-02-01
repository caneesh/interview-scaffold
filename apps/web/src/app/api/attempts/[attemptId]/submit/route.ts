import { NextRequest, NextResponse } from 'next/server';
import { submitCode, submitCodeForTrackAttempt } from '@scaffold/core/use-cases';
import { SubmitCodeRequestSchema } from '@scaffold/contracts';
import {
  attemptRepo,
  contentRepo,
  skillRepo,
  eventSink,
  clock,
  idGenerator,
  codeExecutor,
  getLLMValidation,
  loadAttemptContext,
  progressRepo,
} from '@/lib/deps';
import { isLegacyAttempt } from '@scaffold/core/entities';
import { contentToProblem, isCodingInterviewBody } from '@scaffold/core/adapters';
import { DEMO_TENANT_ID, DEMO_USER_ID } from '@/lib/constants';

/**
 * POST /api/attempts/[attemptId]/submit
 *
 * Submits code for evaluation.
 * Supports both legacy problem-based attempts and track-based content bank attempts.
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

    // Load attempt context (works for both legacy and track-based attempts)
    const context = await loadAttemptContext(tenantId, parsed.data.attemptId, { userId });
    const { attempt } = context;

    // Determine the problem/content and statement for LLM validation
    let problemStatement: string;

    if (context.content.type === 'problem') {
      // Legacy problem-based attempt
      problemStatement = context.content.problem.statement;

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
          progressRepo,
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
    } else {
      // Track-based content bank attempt - convert to Problem for compatibility
      const { item, version } = context.content;

      // Verify this is coding interview content
      if (!isCodingInterviewBody(version.body)) {
        return NextResponse.json(
          { error: { code: 'INVALID_CONTENT_TYPE', message: 'Content is not a coding interview problem' } },
          { status: 400 }
        );
      }

      // Convert content item to Problem entity
      const problem = contentToProblem(item, version);
      problemStatement = problem.statement;

      // Use the track-based submission use-case if available,
      // or fall back to using the problem wrapper with submitCode
      const result = await submitCodeForTrackAttempt(
        {
          tenantId,
          userId,
          attemptId: parsed.data.attemptId,
          code: parsed.data.code,
          language: parsed.data.language,
          problem, // Pass the converted problem
        },
        {
          attemptRepo,
          skillRepo,
          eventSink,
          clock,
          idGenerator,
          codeExecutor,
          llmValidation: getLLMValidation(problemStatement),
          progressRepo,
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
    }
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
