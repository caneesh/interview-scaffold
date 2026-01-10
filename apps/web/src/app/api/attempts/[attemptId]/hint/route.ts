import { NextRequest, NextResponse } from 'next/server';
import { submitStep } from '@scaffold/core/use-cases';
import { attemptRepo, contentRepo, eventSink, clock, idGenerator } from '@/lib/deps';
import type { HintLevel } from '@scaffold/core/entities';
import { DEMO_TENANT_ID, DEMO_USER_ID } from '@/lib/constants';

/**
 * Hint levels in order of increasing helpfulness
 */
const HINT_LEVEL_ORDER: readonly HintLevel[] = [
  'DIRECTIONAL_QUESTION',
  'HEURISTIC_HINT',
  'CONCEPT_INJECTION',
  'MICRO_EXAMPLE',
  'PATCH_SNIPPET',
];

/**
 * Demo hints for demonstration purposes
 */
const DEMO_HINTS: Record<HintLevel, string> = {
  DIRECTIONAL_QUESTION: 'Have you considered what data structure would help track elements efficiently as you iterate?',
  HEURISTIC_HINT: 'Think about using a hash map to store elements you\'ve seen, allowing O(1) lookup.',
  CONCEPT_INJECTION: 'The sliding window pattern maintains a window of elements and adjusts boundaries based on conditions.',
  MICRO_EXAMPLE: 'Example: For [2,1,3] with target 4, window [2,1] sums to 3, expand right to include 3...',
  PATCH_SNIPPET: '// Initialize window\nlet left = 0, sum = 0;\nfor (let right = 0; right < nums.length; right++) {\n  sum += nums[right];\n  while (sum > target) sum -= nums[left++];\n}',
};

/**
 * POST /api/attempts/[attemptId]/hint
 *
 * Requests the next hint for an attempt
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { attemptId: string } }
) {
  try {
    const tenantId = request.headers.get('x-tenant-id') ?? DEMO_TENANT_ID;
    const userId = request.headers.get('x-user-id') ?? DEMO_USER_ID;

    // Get current attempt to determine next hint level
    const attempt = await attemptRepo.findById(tenantId, params.attemptId);
    if (!attempt) {
      return NextResponse.json(
        { error: { code: 'ATTEMPT_NOT_FOUND', message: 'Attempt not found' } },
        { status: 404 }
      );
    }

    // Determine next hint level
    const hintsUsedCount = attempt.hintsUsed.length;
    if (hintsUsedCount >= HINT_LEVEL_ORDER.length) {
      return NextResponse.json(
        { error: { code: 'NO_MORE_HINTS', message: 'All hints have been used' } },
        { status: 400 }
      );
    }

    const nextLevel = HINT_LEVEL_ORDER[hintsUsedCount];
    if (!nextLevel) {
      return NextResponse.json(
        { error: { code: 'NO_MORE_HINTS', message: 'All hints have been used' } },
        { status: 400 }
      );
    }
    const hintText = DEMO_HINTS[nextLevel];

    const result = await submitStep(
      {
        tenantId,
        userId,
        attemptId: params.attemptId,
        stepType: 'HINT',
        data: {
          type: 'HINT',
          level: nextLevel,
          text: hintText,
        },
      },
      { attemptRepo, contentRepo, eventSink, clock, idGenerator }
    );

    return NextResponse.json({
      attempt: result.attempt,
      hint: {
        level: nextLevel,
        text: hintText,
      },
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
