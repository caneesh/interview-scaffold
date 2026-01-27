import { NextRequest, NextResponse } from 'next/server';
import { attemptRepo } from '@/lib/deps';
import {
  isV2Attempt,
  type PlanPayload,
  type PlanInvariant,
} from '@scaffold/core/entities';
import { assertCanTransition, InvalidTransitionError } from '@scaffold/core/validation';
import { DEMO_TENANT_ID, DEMO_USER_ID } from '@/lib/constants';

/**
 * Request body for choosing a pattern
 */
interface ChoosePatternRequest {
  patternId: string;
  confidence: number; // 1-5
  invariantText?: string;
  invariantBuilder?: {
    templateId: string;
    choices: Record<string, number>;
  };
  complexity?: string;
}

/**
 * Response from pattern choice
 */
interface ChoosePatternResponse {
  accepted: boolean;
  match: 'GOOD' | 'MAYBE' | 'MISMATCH';
  rationale: string;
  discoveryRecommended: boolean;
  invariantFeedback?: string;
  attempt: unknown;
}

// Low confidence threshold that triggers discovery recommendation
const LOW_CONFIDENCE_THRESHOLD = 2;

/**
 * POST /api/attempts/[attemptId]/plan/choose
 *
 * Selects a pattern and optionally defines an invariant.
 * In beginner mode, low confidence triggers pattern discovery flow.
 *
 * Transitions to IMPLEMENT step on success.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { attemptId: string } }
) {
  try {
    const tenantId = request.headers.get('x-tenant-id') ?? DEMO_TENANT_ID;
    const userId = request.headers.get('x-user-id') ?? DEMO_USER_ID;

    // Parse request body
    const body = (await request.json()) as ChoosePatternRequest;

    // Validate
    if (!body.patternId || body.patternId.trim().length === 0) {
      return NextResponse.json(
        {
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Pattern ID is required',
          },
        },
        { status: 400 }
      );
    }

    if (typeof body.confidence !== 'number' || body.confidence < 1 || body.confidence > 5) {
      return NextResponse.json(
        {
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Confidence must be a number between 1 and 5',
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

    // Verify we're in the PLAN step
    if (attempt.v2Step !== 'PLAN') {
      return NextResponse.json(
        {
          error: {
            code: 'INVALID_STEP',
            message: `Cannot choose pattern in ${attempt.v2Step} step`,
          },
        },
        { status: 409 }
      );
    }

    // Build invariant if provided
    let invariant: PlanInvariant | null = null;
    if (body.invariantText || body.invariantBuilder) {
      invariant = {
        text: body.invariantText?.trim() || '',
        builderUsed: !!body.invariantBuilder,
        templateId: body.invariantBuilder?.templateId,
        templateChoices: body.invariantBuilder?.choices,
      };
    }

    // Check if low confidence in beginner mode
    const isLowConfidence = body.confidence <= LOW_CONFIDENCE_THRESHOLD;
    const shouldTriggerDiscovery =
      isLowConfidence && attempt.mode === 'BEGINNER';

    // TODO: Call LLM to validate pattern choice
    // The LLM would:
    // 1. Check if the pattern is reasonable for the problem
    // 2. Provide match assessment (GOOD/MAYBE/MISMATCH)
    // 3. Give rationale without revealing solution
    // 4. Optionally provide invariant feedback
    // IMPORTANT: Never confirm if pattern is "correct"

    // Placeholder pattern validation
    const matchAssessment: 'GOOD' | 'MAYBE' | 'MISMATCH' = 'GOOD';
    const rationale =
      'Your pattern choice aligns with the problem characteristics. The invariant captures the key insight.';
    const invariantFeedback = invariant
      ? 'Good invariant! Make sure to maintain this property throughout your implementation.'
      : undefined;

    // Update plan payload
    const planPayload: PlanPayload = {
      suggestedPatterns: attempt.planPayload?.suggestedPatterns ?? [],
      chosenPattern: body.patternId.trim(),
      userConfidence: body.confidence,
      invariant,
      complexity: body.complexity?.trim() ?? null,
      discoveryTriggered: shouldTriggerDiscovery,
    };

    // If discovery is triggered, stay in PLAN step
    if (shouldTriggerDiscovery) {
      const updatedAttempt = await attemptRepo.update({
        ...attempt,
        planPayload,
      });

      const response: ChoosePatternResponse = {
        accepted: false,
        match: matchAssessment,
        rationale:
          'Your confidence seems low. Let me help you discover the right pattern through guided questions.',
        discoveryRecommended: true,
        invariantFeedback,
        attempt: updatedAttempt,
      };

      return NextResponse.json(response);
    }

    // Transition to IMPLEMENT
    try {
      assertCanTransition(attempt, 'IMPLEMENT');
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

    const updatedAttempt = await attemptRepo.update({
      ...attempt,
      planPayload,
      v2Step: 'IMPLEMENT',
    });

    const response: ChoosePatternResponse = {
      accepted: true,
      match: matchAssessment,
      rationale,
      discoveryRecommended: false,
      invariantFeedback,
      attempt: updatedAttempt,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error choosing pattern:', error);
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'An unexpected error occurred' } },
      { status: 500 }
    );
  }
}
