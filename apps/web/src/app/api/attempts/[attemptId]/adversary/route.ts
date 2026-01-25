import { NextRequest, NextResponse } from 'next/server';
import { selectAdversaryPrompt } from '@scaffold/core/adversary';
import type { AdversaryChallengeData, Step } from '@scaffold/core/entities';
import { isLegacyAttempt } from '@scaffold/core/entities';
import { attemptRepo, contentRepo, clock, idGenerator } from '@/lib/deps';
import { DEMO_TENANT_ID, DEMO_USER_ID } from '@/lib/constants';

/**
 * GET /api/attempts/[attemptId]/adversary
 *
 * Gets an adversary challenge for a completed attempt.
 * Returns a random constraint mutation prompt based on the problem's pattern.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { attemptId: string } }
) {
  try {
    const tenantId = request.headers.get('x-tenant-id') ?? DEMO_TENANT_ID;
    const userId = request.headers.get('x-user-id') ?? DEMO_USER_ID;

    // Fetch the attempt
    const attempt = await attemptRepo.findById(tenantId, params.attemptId);
    if (!attempt) {
      return NextResponse.json(
        { error: { code: 'NOT_FOUND', message: 'Attempt not found' } },
        { status: 404 }
      );
    }

    if (attempt.userId !== userId) {
      return NextResponse.json(
        { error: { code: 'FORBIDDEN', message: 'Not your attempt' } },
        { status: 403 }
      );
    }

    // Adversary challenges only work with legacy problem-based attempts
    if (!isLegacyAttempt(attempt)) {
      return NextResponse.json(
        { error: { code: 'TRACK_ATTEMPT_NOT_SUPPORTED', message: 'Adversary challenges only support legacy problem-based attempts' } },
        { status: 400 }
      );
    }

    // Only offer adversary challenge for completed attempts
    if (attempt.state !== 'COMPLETED') {
      return NextResponse.json(
        { error: { code: 'INVALID_STATE', message: 'Attempt is not completed' } },
        { status: 400 }
      );
    }

    // Check if there's already an adversary challenge step
    const existingChallenge = attempt.steps.find(s => s.type === 'ADVERSARY_CHALLENGE');
    if (existingChallenge) {
      const data = existingChallenge.data as AdversaryChallengeData;
      return NextResponse.json({
        challenge: {
          stepId: existingChallenge.id,
          prompt: data.prompt,
          userResponse: data.userResponse,
          skipped: data.skipped,
          completed: data.userResponse !== null || data.skipped,
        },
      });
    }

    // Get the problem to check for custom prompts
    const problem = await contentRepo.findById(tenantId, attempt.problemId);

    // Select a prompt based on pattern
    const prompt = selectAdversaryPrompt(
      attempt.pattern,
      problem?.adversaryPrompts
    );

    if (!prompt) {
      return NextResponse.json({
        challenge: null,
        message: 'No adversary challenge available for this pattern',
      });
    }

    // Create the adversary challenge step
    const stepId = idGenerator.generate();
    const stepData: AdversaryChallengeData = {
      type: 'ADVERSARY_CHALLENGE',
      prompt,
      userResponse: null,
      skipped: false,
      respondedAt: null,
    };

    const newStep: Step = {
      id: stepId,
      attemptId: attempt.id,
      type: 'ADVERSARY_CHALLENGE',
      result: null,
      data: stepData,
      startedAt: clock.now(),
      completedAt: null,
    };

    // Add the step to the attempt
    const updatedAttempt = {
      ...attempt,
      steps: [...attempt.steps, newStep],
    };
    await attemptRepo.save(updatedAttempt);

    return NextResponse.json({
      challenge: {
        stepId,
        prompt,
        userResponse: null,
        skipped: false,
        completed: false,
      },
    });
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'An unexpected error occurred' } },
      { status: 500 }
    );
  }
}

/**
 * POST /api/attempts/[attemptId]/adversary
 *
 * Submits a response to the adversary challenge.
 * Body: { stepId: string, response: string } or { stepId: string, skip: true }
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { attemptId: string } }
) {
  try {
    const tenantId = request.headers.get('x-tenant-id') ?? DEMO_TENANT_ID;
    const userId = request.headers.get('x-user-id') ?? DEMO_USER_ID;

    const body = await request.json();
    const { stepId, response, skip } = body as {
      stepId: string;
      response?: string;
      skip?: boolean;
    };

    if (!stepId) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: 'stepId is required' } },
        { status: 400 }
      );
    }

    if (!skip && (!response || response.trim().length === 0)) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: 'response is required when not skipping' } },
        { status: 400 }
      );
    }

    // Fetch the attempt
    const attempt = await attemptRepo.findById(tenantId, params.attemptId);
    if (!attempt) {
      return NextResponse.json(
        { error: { code: 'NOT_FOUND', message: 'Attempt not found' } },
        { status: 404 }
      );
    }

    if (attempt.userId !== userId) {
      return NextResponse.json(
        { error: { code: 'FORBIDDEN', message: 'Not your attempt' } },
        { status: 403 }
      );
    }

    // Adversary challenges only work with legacy problem-based attempts
    if (!isLegacyAttempt(attempt)) {
      return NextResponse.json(
        { error: { code: 'TRACK_ATTEMPT_NOT_SUPPORTED', message: 'Adversary challenges only support legacy problem-based attempts' } },
        { status: 400 }
      );
    }

    // Find the adversary challenge step
    const stepIndex = attempt.steps.findIndex(s => s.id === stepId && s.type === 'ADVERSARY_CHALLENGE');
    if (stepIndex === -1) {
      return NextResponse.json(
        { error: { code: 'NOT_FOUND', message: 'Adversary challenge step not found' } },
        { status: 404 }
      );
    }

    const step = attempt.steps[stepIndex]!;
    const stepData = step.data as AdversaryChallengeData;

    // Check if already completed
    if (stepData.userResponse !== null || stepData.skipped) {
      return NextResponse.json(
        { error: { code: 'ALREADY_COMPLETED', message: 'Challenge already completed' } },
        { status: 400 }
      );
    }

    // Update the step
    const updatedStepData: AdversaryChallengeData = {
      ...stepData,
      userResponse: skip ? null : response!.trim(),
      skipped: !!skip,
      respondedAt: clock.now(),
    };

    const updatedStep: Step = {
      ...step,
      data: updatedStepData,
      result: 'PASS',
      completedAt: clock.now(),
    };

    // Update the attempt with the modified step
    const updatedSteps = [...attempt.steps];
    updatedSteps[stepIndex] = updatedStep;

    const updatedAttempt = {
      ...attempt,
      steps: updatedSteps,
    };
    await attemptRepo.save(updatedAttempt);

    return NextResponse.json({
      success: true,
      challenge: {
        stepId,
        prompt: stepData.prompt,
        userResponse: updatedStepData.userResponse,
        skipped: updatedStepData.skipped,
        completed: true,
      },
    });
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'An unexpected error occurred' } },
      { status: 500 }
    );
  }
}
