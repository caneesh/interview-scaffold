import { NextRequest, NextResponse } from 'next/server';
import { attemptRepo, clock } from '@/lib/deps';
import {
  isV2Attempt,
  type UnderstandPayload,
  type UnderstandFollowup,
  type UnderstandAIAssessment,
} from '@scaffold/core/entities';
import { assertCanTransition, InvalidTransitionError } from '@scaffold/core/validation';
import { DEMO_TENANT_ID, DEMO_USER_ID } from '@/lib/constants';

/**
 * Request body for answering a follow-up question
 */
interface FollowupAnswerRequest {
  question: string;
  answer: string;
}

/**
 * POST /api/attempts/[attemptId]/understand/followup
 *
 * Submits an answer to a follow-up question from the AI.
 * The AI may ask follow-up questions to clarify understanding gaps.
 *
 * After answering, the AI re-evaluates and may:
 * - Return PASS and transition to PLAN
 * - Ask additional follow-up questions
 * - Return NEEDS_WORK with updated feedback
 *
 * Rate limit: Consider adding rate limiting for LLM calls
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { attemptId: string } }
) {
  try {
    const tenantId = request.headers.get('x-tenant-id') ?? DEMO_TENANT_ID;
    const userId = request.headers.get('x-user-id') ?? DEMO_USER_ID;

    // Parse request body
    const body = (await request.json()) as FollowupAnswerRequest;

    // Validate
    if (!body.question || body.question.trim().length === 0) {
      return NextResponse.json(
        {
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Question is required',
          },
        },
        { status: 400 }
      );
    }

    if (!body.answer || body.answer.trim().length < 10) {
      return NextResponse.json(
        {
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Answer must be at least 10 characters',
          },
        },
        { status: 400 }
      );
    }

    // Get attempt
    const attempt = await attemptRepo.findById(tenantId, params.attemptId);
    if (!attempt) {
      return NextResponse.json(
        { error: { code: 'ATTEMPT_NOT_FOUND', message: 'Attempt not found' } },
        { status: 404 }
      );
    }

    // Verify user owns the attempt
    if (attempt.userId !== userId) {
      return NextResponse.json(
        { error: { code: 'FORBIDDEN', message: 'You do not own this attempt' } },
        { status: 403 }
      );
    }

    // Verify this is a V2 attempt
    if (!isV2Attempt(attempt)) {
      return NextResponse.json(
        {
          error: {
            code: 'NOT_V2_ATTEMPT',
            message: 'This endpoint is only for V2 attempts',
          },
        },
        { status: 400 }
      );
    }

    // Verify we're in the UNDERSTAND step
    if (attempt.v2Step !== 'UNDERSTAND') {
      return NextResponse.json(
        {
          error: {
            code: 'INVALID_STEP',
            message: `Cannot answer follow-up in ${attempt.v2Step} step`,
          },
        },
        { status: 409 }
      );
    }

    // Verify we have an initial understanding submission
    if (!attempt.understandPayload?.explanation) {
      return NextResponse.json(
        {
          error: {
            code: 'NO_UNDERSTANDING',
            message: 'Must submit initial understanding before answering follow-ups',
          },
        },
        { status: 400 }
      );
    }

    // Create the followup record
    const followup: UnderstandFollowup = {
      question: body.question.trim(),
      answer: body.answer.trim(),
      timestamp: clock.now(),
    };

    // TODO: Call LLM to re-evaluate with the new answer
    // The LLM would consider:
    // 1. Original explanation
    // 2. All follow-up Q&As so far
    // 3. Whether gaps have been addressed
    // IMPORTANT: Never include solution hints

    // Placeholder AI re-assessment
    const aiAssessment: UnderstandAIAssessment = {
      status: 'PASS', // Placeholder - real LLM would evaluate
      strengths: [
        ...(attempt.understandPayload.aiAssessment?.strengths ?? []),
        'Good clarification on follow-up question',
      ],
      gaps: [],
      followupQuestions: [],
    };

    // Update understand payload with new followup
    const understandPayload: UnderstandPayload = {
      ...attempt.understandPayload,
      aiAssessment,
      followups: [...attempt.understandPayload.followups, followup],
    };

    // If PASS, transition to PLAN
    let updatedAttempt;
    if (aiAssessment.status === 'PASS') {
      try {
        assertCanTransition(attempt, 'PLAN');
      } catch (error) {
        if (error instanceof InvalidTransitionError) {
          return NextResponse.json(
            {
              error: {
                code: error.code,
                message: error.message,
                suggestion: error.suggestion,
              },
            },
            { status: 409 }
          );
        }
        throw error;
      }

      updatedAttempt = await attemptRepo.update({
        ...attempt,
        understandPayload,
        v2Step: 'PLAN',
      });
    } else {
      updatedAttempt = await attemptRepo.update({
        ...attempt,
        understandPayload,
      });
    }

    return NextResponse.json({
      status: aiAssessment.status,
      strengths: [...aiAssessment.strengths],
      gaps: [...aiAssessment.gaps],
      followupQuestions: [...aiAssessment.followupQuestions],
      attempt: updatedAttempt,
    });
  } catch (error) {
    console.error('Error answering follow-up:', error);
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'An unexpected error occurred' } },
      { status: 500 }
    );
  }
}
