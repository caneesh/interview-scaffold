import { NextRequest, NextResponse } from 'next/server';
import { GetNextQuestionRequestSchema } from '@scaffold/contracts';
import {
  attemptRepo,
  aiCoachRepo,
  socraticCoach,
  idGenerator,
  clock,
} from '@/lib/deps';
import { DEMO_TENANT_ID, DEMO_USER_ID } from '@/lib/constants';

/**
 * POST /api/coaching/[attemptId]/next-question
 *
 * Generates the next Socratic coaching question for an attempt.
 * Uses AI (if available) or deterministic rules to generate questions.
 *
 * The question and turn are persisted for conversation history.
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

    // Parse optional context from request body
    const body = await request.json().catch(() => ({}));
    const parsed = GetNextQuestionRequestSchema.safeParse(body);

    // Get existing turns for this attempt
    const existingTurns = await aiCoachRepo.listSocraticTurns(attemptId, { limit: 100 });
    const nextTurnIndex = await aiCoachRepo.getLatestTurnIndex(attemptId) + 1;

    // Determine question based on coaching state
    let questionResult: {
      question: string;
      questionType: string;
      targetConcept?: string;
      options?: string[];
      source: 'ai' | 'deterministic';
    };

    // Try AI-based generation if socratic coach is enabled
    if (socraticCoach.isEnabled() && parsed.success && parsed.data.context) {
      const context = parsed.data.context;

      // Build context for AI
      const aiResult = await socraticCoach.generateSocraticQuestion({
        attemptId,
        problemId: attempt.problemId,
        problemStatement: '', // Would come from content repo
        pattern: attempt.pattern,
        rung: attempt.rung,
        latestCode: context.latestCode ?? '',
        language: context.language ?? 'python',
        testResults: context.testResults ?? [],
        thinkingGateData: undefined,
        previousTurns: existingTurns.map((t) => ({
          id: t.id,
          role: t.role as 'assistant' | 'user',
          content: t.message,
          metadata: {
            questionId: t.question?.questionType,
            timestamp: t.createdAt,
          },
        })),
        hintsUsed: attempt.hintsUsed,
        codeSubmissions: attempt.codeSubmissions,
      });

      if (aiResult) {
        questionResult = {
          question: aiResult.question.question,
          questionType: aiResult.question.difficulty,
          targetConcept: aiResult.question.targetConcept,
          options: undefined,
          source: 'ai',
        };
      } else {
        // Fall back to deterministic
        questionResult = generateDeterministicQuestion(existingTurns.length, attempt);
      }
    } else {
      // Use deterministic question generation
      questionResult = generateDeterministicQuestion(existingTurns.length, attempt);
    }

    // Create and persist the turn
    const turn = await aiCoachRepo.appendSocraticTurn({
      id: idGenerator.generate(),
      attemptId,
      userId,
      turnIndex: nextTurnIndex,
      role: 'assistant',
      message: questionResult.question,
      question: {
        questionType: questionResult.questionType,
        targetConcept: questionResult.targetConcept,
        options: questionResult.options,
      },
      validation: null,
    });

    return NextResponse.json({
      turn,
      question: questionResult.question,
      questionType: questionResult.questionType,
      targetConcept: questionResult.targetConcept,
      options: questionResult.options,
      source: questionResult.source,
    });
  } catch (error) {
    console.error('Error generating next question:', error);
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Failed to generate question' } },
      { status: 500 }
    );
  }
}

interface DeterministicQuestion {
  question: string;
  questionType: string;
  targetConcept: string;
}

/**
 * Generate a deterministic Socratic question based on attempt state
 */
function generateDeterministicQuestion(
  turnCount: number,
  _attempt: { pattern: string; state: string; hintsUsed: readonly string[] }
): {
  question: string;
  questionType: string;
  targetConcept?: string;
  options?: string[];
  source: 'deterministic';
} {
  // Question progression based on turn count
  const questions: DeterministicQuestion[] = [
    {
      question: 'What is the core pattern or approach you are considering for this problem?',
      questionType: 'clarifying',
      targetConcept: 'pattern_identification',
    },
    {
      question: 'Can you explain why this pattern fits the problem constraints?',
      questionType: 'probing',
      targetConcept: 'pattern_justification',
    },
    {
      question: 'What edge cases might break your current approach?',
      questionType: 'challenging',
      targetConcept: 'edge_case_analysis',
    },
    {
      question: 'How does your solution handle the time/space complexity requirements?',
      questionType: 'probing',
      targetConcept: 'complexity_analysis',
    },
    {
      question: 'If the input size were 10x larger, would your approach still work efficiently?',
      questionType: 'hypothetical',
      targetConcept: 'scalability',
    },
  ];

  const questionIndex = Math.min(turnCount, questions.length - 1);
  const selected = questions[questionIndex]!;

  return {
    question: selected.question,
    questionType: selected.questionType,
    targetConcept: selected.targetConcept,
    source: 'deterministic',
  };
}
