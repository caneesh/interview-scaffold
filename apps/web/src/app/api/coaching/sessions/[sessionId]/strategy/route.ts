import { NextRequest, NextResponse } from 'next/server';
import { SubmitStrategyRequestSchema, SubmitAdversarialAnswerRequestSchema } from '@scaffold/contracts';
import { processStrategy, processAdversarial } from '@scaffold/core/learner-centric';
import {
  detectMemorization,
  InterviewStateMachine,
} from '@scaffold/core';
import type { MemorizationClassification } from '@scaffold/core';
import {
  getCoachingSession,
  setCoachingSession,
  storageToSessionFormat,
  sessionToStorageFormat,
  storageToMachineContextFormat,
  machineContextToStorageFormat,
  type MemorizationTrackingData,
} from '@/lib/coaching-session-store';

/**
 * Generate a non-accusatory warning message based on memorization classification
 */
function getWarningMessage(classification: MemorizationClassification): string {
  switch (classification) {
    case 'likely_memorized':
      return 'Your strategy explanation appears very polished. ' +
        'To ensure genuine understanding, please explain your approach ' +
        'using different words or by walking through a specific example.';
    case 'partially_memorized':
      return 'Some parts of your explanation seem quite formal. ' +
        'Could you explain the key insight in your own words?';
    default:
      return 'Please provide more detail about your reasoning.';
  }
}

/**
 * POST /api/coaching/sessions/:sessionId/strategy
 *
 * Submit a strategy design
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { sessionId: string } }
) {
  try {
    const body = await request.json();

    // Check if this is an adversarial answer or a strategy submission
    if (body.questionId) {
      // This is an adversarial answer
      const parsed = SubmitAdversarialAnswerRequestSchema.safeParse({
        ...body,
        sessionId: params.sessionId,
      });

      if (!parsed.success) {
        return NextResponse.json(
          { error: { code: 'VALIDATION_ERROR', message: parsed.error.message } },
          { status: 400 }
        );
      }

      return handleAdversarialAnswer(params.sessionId, parsed.data.questionId, parsed.data.answer);
    }

    // This is a strategy submission
    const parsed = SubmitStrategyRequestSchema.safeParse({
      ...body,
      sessionId: params.sessionId,
    });

    if (!parsed.success) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: parsed.error.message } },
        { status: 400 }
      );
    }

    const { sessionId, strategy } = parsed.data;

    const sessionData = getCoachingSession(sessionId);
    if (!sessionData) {
      return NextResponse.json(
        { error: { code: 'SESSION_NOT_FOUND', message: 'Coaching session not found' } },
        { status: 404 }
      );
    }

    // Convert from storage format to session format
    const session = storageToSessionFormat(sessionData.session);
    const { problem } = sessionData;

    // Verify we're in the right stage
    if (session.currentStage !== 'STRATEGY_DESIGN') {
      return NextResponse.json(
        { error: { code: 'WRONG_STAGE', message: 'Not in strategy design stage' } },
        { status: 400 }
      );
    }

    // Get memorization tracking data
    const memTracking = sessionData.memorizationTracking ?? {
      detectionHistory: [],
      activeReprompts: [],
      restrictedHelpLevel: null,
      previousResponses: [],
      stageStartedAt: session.startedAt.toISOString(),
    };

    // Calculate response time
    const responseTimeMs = Date.now() - new Date(memTracking.stageStartedAt).getTime();

    // Run anti-memorization detection on the strategy explanation
    const detectionResult = detectMemorization({
      responseText: strategy,
      previousResponses: memTracking.previousResponses,
      stage: 'STRATEGY_DESIGN',
      problemId: session.problemId,
      pattern: problem.pattern,
      responseTimeMs,
      attemptCount: 1, // First strategy submission
      currentHelpLevel: session.helpLevel,
      // antiCheatMarkers can be added to Problem entity later
    });

    // Handle based on memorization action
    if (detectionResult.action === 'reset_to_feynman') {
      // Strong memorization detected - require Feynman-style re-explanation
      const updatedMemTracking: MemorizationTrackingData = {
        ...memTracking,
        detectionHistory: [
          ...memTracking.detectionHistory,
          {
            stage: 'STRATEGY_DESIGN',
            timestamp: new Date().toISOString(),
            classification: detectionResult.classification,
            confidence: detectionResult.confidence,
            action: detectionResult.action,
          },
        ],
        activeReprompts: detectionResult.reprompts.map(r => ({
          id: r.id,
          question: r.question,
          targetConcept: r.targetConcept,
          answered: false,
        })),
        restrictedHelpLevel: detectionResult.recommendedHelpLevel,
        previousResponses: [...memTracking.previousResponses, strategy],
      };

      setCoachingSession(sessionId, {
        ...sessionData,
        memorizationTracking: updatedMemTracking,
      });

      return NextResponse.json({
        session: {
          id: session.id,
          attemptId: session.attemptId,
          tenantId: session.tenantId,
          userId: session.userId,
          problemId: session.problemId,
          currentStage: session.currentStage,
          helpLevel: detectionResult.recommendedHelpLevel,
          startedAt: session.startedAt.toISOString(),
          completedAt: session.completedAt?.toISOString() ?? null,
        },
        warning: true,
        warningType: detectionResult.classification,
        warningMessage: getWarningMessage(detectionResult.classification),
        requiresReExplanation: true,
        repromptQuestions: detectionResult.reprompts.map(r => ({
          id: r.id,
          question: r.question,
        })),
        allowedHelpLevel: detectionResult.recommendedHelpLevel,
        response: null,
        isReady: false,
        adversarialQuestions: [],
      });
    }

    if (detectionResult.action === 'block_and_reprompt') {
      // Partial memorization - ask follow-up questions
      const updatedMemTracking: MemorizationTrackingData = {
        ...memTracking,
        detectionHistory: [
          ...memTracking.detectionHistory,
          {
            stage: 'STRATEGY_DESIGN',
            timestamp: new Date().toISOString(),
            classification: detectionResult.classification,
            confidence: detectionResult.confidence,
            action: detectionResult.action,
          },
        ],
        activeReprompts: detectionResult.reprompts.map(r => ({
          id: r.id,
          question: r.question,
          targetConcept: r.targetConcept,
          answered: false,
        })),
        previousResponses: [...memTracking.previousResponses, strategy],
      };

      setCoachingSession(sessionId, {
        ...sessionData,
        memorizationTracking: updatedMemTracking,
      });

      return NextResponse.json({
        session: {
          id: session.id,
          attemptId: session.attemptId,
          tenantId: session.tenantId,
          userId: session.userId,
          problemId: session.problemId,
          currentStage: session.currentStage,
          helpLevel: session.helpLevel,
          startedAt: session.startedAt.toISOString(),
          completedAt: session.completedAt?.toISOString() ?? null,
        },
        warning: true,
        warningType: detectionResult.classification,
        warningMessage: getWarningMessage(detectionResult.classification),
        repromptQuestions: detectionResult.reprompts.map(r => ({
          id: r.id,
          question: r.question,
        })),
        response: null,
        isReady: false,
        adversarialQuestions: [],
      });
    }

    // No memorization issues - process the strategy normally
    const result = processStrategy(session, problem, strategy);

    // Update state machine if advancing to coding
    let machineInfo = null;
    if (result.session.currentStage === 'CODING' && sessionData.machineContext) {
      const machineContext = storageToMachineContextFormat(sessionData.machineContext);
      const machine = new InterviewStateMachine(machineContext);
      const transitionResult = machine.process('STAGE_PASSED', {
        attemptId: session.attemptId,
        timestamp: new Date(),
        userId: session.userId,
      });

      if (transitionResult.success) {
        const progress = machine.getProgress();
        machineInfo = {
          currentState: progress.currentState,
          stateIndex: progress.stateIndex,
          percentComplete: progress.percentComplete,
          validEvents: machine.getValidEvents(),
        };
      }
    }

    // Update memorization tracking
    const updatedMemTracking: MemorizationTrackingData = {
      ...memTracking,
      previousResponses: [...memTracking.previousResponses, strategy],
      stageStartedAt: result.session.currentStage !== session.currentStage
        ? new Date().toISOString()
        : memTracking.stageStartedAt,
    };

    // Update stored session with proper type conversion
    setCoachingSession(sessionId, {
      session: sessionToStorageFormat(result.session),
      problem,
      machineContext: sessionData.machineContext,
      memorizationTracking: updatedMemTracking,
    });

    const strategyData = result.session.stageData.strategyDesign;

    return NextResponse.json({
      session: {
        id: result.session.id,
        attemptId: result.session.attemptId,
        tenantId: result.session.tenantId,
        userId: result.session.userId,
        problemId: result.session.problemId,
        currentStage: result.session.currentStage,
        helpLevel: result.session.helpLevel,
        startedAt: result.session.startedAt.toISOString(),
        completedAt: result.session.completedAt?.toISOString() ?? null,
      },
      response: result.response,
      isReady: strategyData?.isReadyToCode ?? false,
      adversarialQuestions: (strategyData?.adversarialQuestions ?? [])
        .filter(q => !q.isResolved)
        .map(q => ({ id: q.id, question: q.question })),
      stateMachine: machineInfo,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const errorStack = error instanceof Error ? error.stack : undefined;
    if (process.env.NODE_ENV !== 'test') {
      console.error(JSON.stringify({
        level: 'error',
        message: 'Error processing strategy',
        error: errorMessage,
        stack: errorStack,
      }));
    }
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'An unexpected error occurred' } },
      { status: 500 }
    );
  }
}

async function handleAdversarialAnswer(
  sessionId: string,
  questionId: string,
  answer: string
) {
  const sessionData = getCoachingSession(sessionId);
  if (!sessionData) {
    return NextResponse.json(
      { error: { code: 'SESSION_NOT_FOUND', message: 'Coaching session not found' } },
      { status: 404 }
    );
  }

  // Convert from storage format to session format
  const session = storageToSessionFormat(sessionData.session);
  const { problem } = sessionData;

  // Verify we're in the right stage
  if (session.currentStage !== 'STRATEGY_DESIGN') {
    return NextResponse.json(
      { error: { code: 'WRONG_STAGE', message: 'Not in strategy design stage' } },
      { status: 400 }
    );
  }

  // Get memorization tracking data
  const memTracking = sessionData.memorizationTracking ?? {
    detectionHistory: [],
    activeReprompts: [],
    restrictedHelpLevel: null,
    previousResponses: [],
    stageStartedAt: session.startedAt.toISOString(),
  };

  // Run anti-memorization detection on adversarial answer
  const detectionResult = detectMemorization({
    responseText: answer,
    previousResponses: memTracking.previousResponses,
    stage: 'STRATEGY_DESIGN',
    problemId: session.problemId,
    pattern: problem.pattern,
    responseTimeMs: Date.now() - new Date(memTracking.stageStartedAt).getTime(),
    attemptCount: memTracking.detectionHistory.filter(h => h.stage === 'STRATEGY_DESIGN').length + 1,
    currentHelpLevel: session.helpLevel,
    // antiCheatMarkers can be added to Problem entity later
  });

  // If memorization detected in adversarial answer, require re-explanation
  if (detectionResult.classification !== 'authentic') {
    const updatedMemTracking: MemorizationTrackingData = {
      ...memTracking,
      detectionHistory: [
        ...memTracking.detectionHistory,
        {
          stage: 'STRATEGY_DESIGN',
          timestamp: new Date().toISOString(),
          classification: detectionResult.classification,
          confidence: detectionResult.confidence,
          action: detectionResult.action,
        },
      ],
      activeReprompts: detectionResult.reprompts.map(r => ({
        id: r.id,
        question: r.question,
        targetConcept: r.targetConcept,
        answered: false,
      })),
      previousResponses: [...memTracking.previousResponses, answer],
    };

    setCoachingSession(sessionId, {
      ...sessionData,
      memorizationTracking: updatedMemTracking,
    });

    return NextResponse.json({
      session: {
        id: session.id,
        attemptId: session.attemptId,
        tenantId: session.tenantId,
        userId: session.userId,
        problemId: session.problemId,
        currentStage: session.currentStage,
        helpLevel: session.helpLevel,
        startedAt: session.startedAt.toISOString(),
        completedAt: session.completedAt?.toISOString() ?? null,
      },
      warning: true,
      warningType: detectionResult.classification,
      warningMessage: 'Your answer to the adversarial question seems quite formal. ' +
        'Please explain in your own words how your strategy handles this case.',
      repromptQuestions: detectionResult.reprompts.map(r => ({
        id: r.id,
        question: r.question,
      })),
      response: null,
      isReady: false,
    });
  }

  // Process the adversarial answer
  const result = processAdversarial(session, problem, questionId, answer);

  // Update memorization tracking
  const updatedMemTracking: MemorizationTrackingData = {
    ...memTracking,
    previousResponses: [...memTracking.previousResponses, answer],
    stageStartedAt: result.session.currentStage !== session.currentStage
      ? new Date().toISOString()
      : memTracking.stageStartedAt,
  };

  // Update stored session with proper type conversion
  setCoachingSession(sessionId, {
    session: sessionToStorageFormat(result.session),
    problem,
    machineContext: sessionData.machineContext,
    memorizationTracking: updatedMemTracking,
  });

  const strategyData = result.session.stageData.strategyDesign;

  return NextResponse.json({
    session: {
      id: result.session.id,
      attemptId: result.session.attemptId,
      tenantId: result.session.tenantId,
      userId: result.session.userId,
      problemId: result.session.problemId,
      currentStage: result.session.currentStage,
      helpLevel: result.session.helpLevel,
      startedAt: result.session.startedAt.toISOString(),
      completedAt: result.session.completedAt?.toISOString() ?? null,
    },
    response: result.response,
    isReady: strategyData?.isReadyToCode ?? false,
  });
}
