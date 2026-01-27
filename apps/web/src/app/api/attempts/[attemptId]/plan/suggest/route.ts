import { NextRequest, NextResponse } from 'next/server';
import { attemptRepo } from '@/lib/deps';
import {
  isV2Attempt,
  type PlanPayload,
  type SuggestedPattern,
} from '@scaffold/core/entities';
import { DEMO_TENANT_ID, DEMO_USER_ID } from '@/lib/constants';

/**
 * Request body for pattern suggestions
 */
interface SuggestPatternsRequest {
  // User's understanding summary (optional, uses stored payload if not provided)
  explanation?: string;
}

/**
 * Response with pattern suggestions
 */
interface SuggestPatternsResponse {
  candidates: Array<{
    patternId: string;
    name: string;
    reason: string;
    confidence: number;
  }>;
  recommendedNextAction: string;
  attempt: unknown;
}

/**
 * POST /api/attempts/[attemptId]/plan/suggest
 *
 * Gets AI-suggested patterns based on the user's understanding.
 * The AI analyzes the problem and user's explanation to suggest
 * 2-3 candidate patterns without revealing the solution.
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

    // Parse request body (optional)
    let body: SuggestPatternsRequest = {};
    try {
      body = await request.json();
    } catch {
      // Empty body is okay
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
            message: `Cannot suggest patterns in ${attempt.v2Step} step`,
          },
        },
        { status: 409 }
      );
    }

    // Get explanation from request or stored payload
    const explanation =
      body.explanation?.trim() || attempt.understandPayload?.explanation || '';

    if (!explanation) {
      return NextResponse.json(
        {
          error: {
            code: 'NO_EXPLANATION',
            message: 'No explanation available. Complete the UNDERSTAND step first.',
          },
        },
        { status: 400 }
      );
    }

    // TODO: Call LLM to suggest patterns
    // The LLM would:
    // 1. Analyze the problem and user's understanding
    // 2. Suggest 2-3 candidate patterns
    // 3. Explain why each pattern might apply
    // 4. Provide confidence scores
    // IMPORTANT: Never reveal which pattern is "correct"

    // Placeholder pattern suggestions
    // In production, this would come from an LLM call
    const suggestedPatterns: SuggestedPattern[] = [
      {
        patternId: 'two-pointers',
        name: 'Two Pointers',
        reason:
          'This problem involves finding pairs or subsequences, which often benefits from a two-pointer approach.',
        aiConfidence: 0.75,
      },
      {
        patternId: 'sliding-window',
        name: 'Sliding Window',
        reason:
          'The problem mentions contiguous elements or subarrays, suggesting a sliding window could be effective.',
        aiConfidence: 0.6,
      },
      {
        patternId: 'hash-map',
        name: 'Hash Map',
        reason:
          'Looking up elements or tracking occurrences efficiently might benefit from a hash map approach.',
        aiConfidence: 0.5,
      },
    ];

    // Update plan payload with suggestions
    const planPayload: PlanPayload = {
      suggestedPatterns,
      chosenPattern: attempt.planPayload?.chosenPattern ?? null,
      userConfidence: attempt.planPayload?.userConfidence ?? null,
      invariant: attempt.planPayload?.invariant ?? null,
      complexity: attempt.planPayload?.complexity ?? null,
      discoveryTriggered: attempt.planPayload?.discoveryTriggered ?? false,
    };

    const updatedAttempt = await attemptRepo.update({
      ...attempt,
      planPayload,
    });

    const response: SuggestPatternsResponse = {
      candidates: suggestedPatterns.map((p) => ({
        patternId: p.patternId,
        name: p.name,
        reason: p.reason,
        confidence: p.aiConfidence,
      })),
      recommendedNextAction:
        'Review each pattern suggestion and select the one that best matches your approach to solving this problem.',
      attempt: updatedAttempt,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error suggesting patterns:', error);
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'An unexpected error occurred' } },
      { status: 500 }
    );
  }
}
