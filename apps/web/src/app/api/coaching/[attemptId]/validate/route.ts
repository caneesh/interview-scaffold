import { NextRequest, NextResponse } from 'next/server';
import { ValidateResponseRequestSchema } from '@scaffold/contracts';
import {
  attemptRepo,
  aiCoachRepo,
  socraticCoach,
  idGenerator,
} from '@/lib/deps';
import { isLegacyAttempt } from '@scaffold/core/entities';
import { DEMO_TENANT_ID, DEMO_USER_ID } from '@/lib/constants';

/**
 * POST /api/coaching/[attemptId]/validate
 *
 * Validates a user's response to a Socratic question.
 * Creates a new turn with the user's response and validation result.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { attemptId: string } }
) {
  try {
    const tenantId = request.headers.get('x-tenant-id') ?? DEMO_TENANT_ID;
    const userId = request.headers.get('x-user-id') ?? DEMO_USER_ID;
    const { attemptId } = params;

    // Verify the attempt exists and belongs to the user
    const attempt = await attemptRepo.findById(tenantId, attemptId);
    if (!attempt) {
      return NextResponse.json(
        { error: { code: 'ATTEMPT_NOT_FOUND', message: 'Attempt not found' } },
        { status: 404 }
      );
    }

    if (attempt.userId !== userId) {
      return NextResponse.json(
        { error: { code: 'FORBIDDEN', message: 'Attempt does not belong to user' } },
        { status: 403 }
      );
    }

    // Coaching validation only supports legacy problem-based attempts
    if (!isLegacyAttempt(attempt)) {
      return NextResponse.json(
        { error: { code: 'TRACK_ATTEMPT_NOT_SUPPORTED', message: 'Coaching validation only supports legacy problem-based attempts' } },
        { status: 400 }
      );
    }

    // Parse and validate request body
    const body = await request.json();
    const parsed = ValidateResponseRequestSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: parsed.error.message } },
        { status: 400 }
      );
    }

    const { turnId, response } = parsed.data;

    // Get the question turn being responded to
    const questionTurn = await aiCoachRepo.getSocraticTurn(turnId);
    if (!questionTurn) {
      return NextResponse.json(
        { error: { code: 'TURN_NOT_FOUND', message: 'Question turn not found' } },
        { status: 404 }
      );
    }

    if (questionTurn.attemptId !== attemptId) {
      return NextResponse.json(
        { error: { code: 'TURN_MISMATCH', message: 'Turn does not belong to this attempt' } },
        { status: 400 }
      );
    }

    // Get the current turn index for the new turn
    const nextTurnIndex = await aiCoachRepo.getLatestTurnIndex(attemptId) + 1;

    // Validate the response
    let validationResult: {
      isCorrect: boolean;
      confidence: number;
      feedback?: string;
      misconceptions?: string[];
      nextQuestionHint?: string;
    };
    let nextAction: 'continue' | 'retry' | 'escalate' | 'complete' | 'needs_more_info';
    let followUpQuestion: string | undefined;
    let source: 'ai' | 'deterministic' = 'deterministic';

    // Try AI-based validation if socratic coach is enabled
    if (socraticCoach.isEnabled() && questionTurn.question) {
      const existingTurns = await aiCoachRepo.listSocraticTurns(attemptId, { limit: 100 });

      const aiResult = await socraticCoach.validateSocraticResponse({
        question: {
          id: questionTurn.id,
          question: questionTurn.message,
          targetConcept: questionTurn.question.targetConcept ?? '',
          difficulty: questionTurn.question.questionType as 'hint' | 'probe' | 'challenge',
          evidenceRefs: [],
        },
        userResponse: response,
        attemptContext: {
          attemptId,
          problemId: attempt.problemId,
          problemStatement: '',
          pattern: attempt.pattern,
          rung: attempt.rung,
          latestCode: '',
          language: 'python',
          testResults: [],
          previousTurns: existingTurns.map((t) => ({
            id: t.id,
            role: t.role as 'assistant' | 'user',
            content: t.message,
            metadata: {
              timestamp: t.createdAt,
            },
          })),
          hintsUsed: attempt.hintsUsed,
          codeSubmissions: attempt.codeSubmissions,
        },
      });

      if (aiResult) {
        validationResult = {
          isCorrect: aiResult.validation.isCorrect,
          confidence: aiResult.validation.confidence,
          feedback: aiResult.validation.feedback,
        };
        nextAction = aiResult.nextAction.action as typeof nextAction;
        followUpQuestion = aiResult.followUpQuestion?.question;
        source = 'ai';
      } else {
        // Fall back to deterministic
        const deterministicResult = validateDeterministic(response, questionTurn.question);
        validationResult = deterministicResult.validation;
        nextAction = deterministicResult.nextAction;
        followUpQuestion = deterministicResult.followUpQuestion;
      }
    } else {
      // Use deterministic validation
      const deterministicResult = validateDeterministic(response, questionTurn.question);
      validationResult = deterministicResult.validation;
      nextAction = deterministicResult.nextAction;
      followUpQuestion = deterministicResult.followUpQuestion;
    }

    // Create and persist the user's response turn
    const turn = await aiCoachRepo.appendSocraticTurn({
      id: idGenerator.generate(),
      attemptId,
      userId,
      turnIndex: nextTurnIndex,
      role: 'user',
      message: response,
      question: null,
      validation: validationResult,
    });

    return NextResponse.json({
      turn,
      validation: validationResult,
      followUpQuestion,
      nextAction,
      source,
    });
  } catch (error) {
    console.error('Error validating response:', error);
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Failed to validate response' } },
      { status: 500 }
    );
  }
}

/**
 * Perform deterministic validation of a user response
 */
function validateDeterministic(
  response: string,
  question: { questionType?: string; targetConcept?: string } | null
): {
  validation: {
    isCorrect: boolean;
    confidence: number;
    feedback?: string;
    misconceptions?: string[];
    nextQuestionHint?: string;
  };
  nextAction: 'continue' | 'retry' | 'escalate' | 'complete' | 'needs_more_info';
  followUpQuestion?: string;
} {
  // Simple heuristics for validation
  const responseLength = response.trim().length;
  const hasSubstance = responseLength > 20;
  const mentionsPattern = /pattern|algorithm|approach|structure|complexity/i.test(response);

  if (!hasSubstance) {
    return {
      validation: {
        isCorrect: false,
        confidence: 0.9,
        feedback: 'Your response is too brief. Please provide more detail about your thinking.',
        misconceptions: ['incomplete_reasoning'],
      },
      nextAction: 'retry',
    };
  }

  if (!mentionsPattern && question?.targetConcept?.includes('pattern')) {
    return {
      validation: {
        isCorrect: false,
        confidence: 0.6,
        feedback: 'Consider discussing the algorithmic pattern or data structure you are using.',
        nextQuestionHint: 'pattern_identification',
      },
      nextAction: 'continue',
      followUpQuestion: 'What specific algorithm or data structure pattern would best solve this problem?',
    };
  }

  // Default: accept the response and continue
  return {
    validation: {
      isCorrect: true,
      confidence: 0.7,
      feedback: 'Good reasoning. Let\'s explore further.',
    },
    nextAction: 'continue',
  };
}
