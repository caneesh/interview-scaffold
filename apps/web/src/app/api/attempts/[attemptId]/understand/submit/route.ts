import { NextRequest, NextResponse } from 'next/server';
import { attemptRepo, clock } from '@/lib/deps';
import {
  isV2Attempt,
  type UnderstandPayload,
  type UnderstandAIAssessment,
} from '@scaffold/core/entities';
import { assertCanTransition, InvalidTransitionError } from '@scaffold/core/validation';
import { DEMO_TENANT_ID, DEMO_USER_ID } from '@/lib/constants';

/**
 * Request body for submitting understanding
 */
interface SubmitUnderstandRequest {
  explanation: string;
  inputOutputDescription: string;
  constraintsDescription: string;
  exampleWalkthrough: string;
  wrongApproach: string;
}

/**
 * Response from understanding submission
 */
interface SubmitUnderstandResponse {
  status: 'PASS' | 'NEEDS_WORK';
  strengths: string[];
  gaps: string[];
  followupQuestions: string[];
  solutionLeakRisk: 'low' | 'medium' | 'high';
  attempt: unknown;
}

// Minimum lengths for validation
const MIN_EXPLANATION_LENGTH = 50;
const MIN_FIELD_LENGTH = 20;

/**
 * POST /api/attempts/[attemptId]/understand/submit
 *
 * Submits the user's understanding explanation for AI evaluation.
 * The AI evaluates whether the user understands the problem without
 * revealing any solution details.
 *
 * On PASS: Transitions to PLAN step
 * On NEEDS_WORK: Returns feedback and follow-up questions
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

    // Parse and validate request body
    const body = (await request.json()) as SubmitUnderstandRequest;

    // Basic validation
    const validationErrors: string[] = [];

    if (!body.explanation || body.explanation.trim().length < MIN_EXPLANATION_LENGTH) {
      validationErrors.push(
        `Explanation must be at least ${MIN_EXPLANATION_LENGTH} characters`
      );
    }

    if (
      !body.inputOutputDescription ||
      body.inputOutputDescription.trim().length < MIN_FIELD_LENGTH
    ) {
      validationErrors.push(
        `Input/output description must be at least ${MIN_FIELD_LENGTH} characters`
      );
    }

    if (
      !body.constraintsDescription ||
      body.constraintsDescription.trim().length < MIN_FIELD_LENGTH
    ) {
      validationErrors.push(
        `Constraints description must be at least ${MIN_FIELD_LENGTH} characters`
      );
    }

    if (
      !body.exampleWalkthrough ||
      body.exampleWalkthrough.trim().length < MIN_FIELD_LENGTH
    ) {
      validationErrors.push(
        `Example walkthrough must be at least ${MIN_FIELD_LENGTH} characters`
      );
    }

    if (!body.wrongApproach || body.wrongApproach.trim().length < MIN_FIELD_LENGTH) {
      validationErrors.push(
        `Wrong approach must be at least ${MIN_FIELD_LENGTH} characters`
      );
    }

    if (validationErrors.length > 0) {
      return NextResponse.json(
        {
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Request validation failed',
            details: validationErrors,
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
            message: `Cannot submit understanding in ${attempt.v2Step} step`,
          },
        },
        { status: 409 }
      );
    }

    // TODO: Call LLM to evaluate understanding
    // For now, return a placeholder response
    // The actual LLM implementation would:
    // 1. Send the explanation to an AI model
    // 2. Evaluate understanding without revealing solution
    // 3. Identify strengths and gaps
    // 4. Generate follow-up questions if needed

    // Placeholder AI assessment - in production this would be an LLM call
    // IMPORTANT: Never include solution hints in the assessment
    const aiAssessment: UnderstandAIAssessment = {
      status: 'PASS', // Placeholder - real LLM would evaluate
      strengths: [
        'Good identification of inputs and outputs',
        'Clear understanding of constraints',
      ],
      gaps: [],
      followupQuestions: [],
    };

    // Detect solution leak risk (placeholder)
    const solutionLeakRisk: 'low' | 'medium' | 'high' = 'low';

    // Update understand payload
    const understandPayload: UnderstandPayload = {
      explanation: body.explanation.trim(),
      inputOutputDescription: body.inputOutputDescription.trim(),
      constraintsDescription: body.constraintsDescription.trim(),
      exampleWalkthrough: body.exampleWalkthrough.trim(),
      wrongApproach: body.wrongApproach.trim(),
      aiAssessment,
      followups: attempt.understandPayload?.followups ?? [],
    };

    // If PASS, transition to PLAN
    let updatedAttempt;
    if (aiAssessment.status === 'PASS') {
      // Verify transition is allowed
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
      // Stay in UNDERSTAND, update payload with feedback
      updatedAttempt = await attemptRepo.update({
        ...attempt,
        understandPayload,
      });
    }

    const response: SubmitUnderstandResponse = {
      status: aiAssessment.status,
      strengths: [...aiAssessment.strengths],
      gaps: [...aiAssessment.gaps],
      followupQuestions: [...aiAssessment.followupQuestions],
      solutionLeakRisk,
      attempt: updatedAttempt,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error submitting understanding:', error);
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'An unexpected error occurred' } },
      { status: 500 }
    );
  }
}
