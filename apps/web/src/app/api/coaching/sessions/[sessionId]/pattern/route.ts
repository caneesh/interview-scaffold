import { NextRequest, NextResponse } from 'next/server';
import { SubmitPatternSelectionRequestSchema } from '@scaffold/contracts';
import { processPatternRecognition } from '@scaffold/core/learner-centric';
import {
  detectMemorization,
  InterviewStateMachine,
} from '@scaffold/core';
import type { HelpLevel, MemorizationDetectionResult, MemorizationClassification } from '@scaffold/core';
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
      return 'It looks like you may have seen this problem before. ' +
        'To help you build genuine understanding, please answer a few additional questions ' +
        'about your reasoning.';
    case 'partially_memorized':
      return 'Your explanation seems quite polished. ' +
        'To ensure you understand the underlying concepts, ' +
        'please elaborate on your reasoning with these follow-up questions.';
    default:
      return 'Please provide more detail about your reasoning.';
  }
}

/**
 * POST /api/coaching/sessions/:sessionId/pattern
 *
 * Submit a pattern selection with justification
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { sessionId: string } }
) {
  try {
    const body = await request.json();
    const parsed = SubmitPatternSelectionRequestSchema.safeParse({
      ...body,
      sessionId: params.sessionId,
    });

    if (!parsed.success) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: parsed.error.message } },
        { status: 400 }
      );
    }

    const { sessionId, selectedPattern, justification } = parsed.data;

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
    if (session.currentStage !== 'PATTERN_RECOGNITION') {
      return NextResponse.json(
        { error: { code: 'WRONG_STAGE', message: 'Not in pattern recognition stage' } },
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

    // Run anti-memorization detection on the justification
    const detectionResult = detectMemorization({
      responseText: justification,
      previousResponses: memTracking.previousResponses,
      stage: 'PATTERN_RECOGNITION',
      problemId: session.problemId,
      pattern: problem.pattern,
      responseTimeMs,
      attemptCount: (session.stageData.patternRecognition?.attempts.length ?? 0) + 1,
      currentHelpLevel: session.helpLevel,
      // antiCheatMarkers can be added to Problem entity later
    });

    // If memorization detected, return reprompt questions and update tracking
    if (detectionResult.classification !== 'authentic') {
      // Update memorization tracking
      const updatedMemTracking: MemorizationTrackingData = {
        ...memTracking,
        detectionHistory: [
          ...memTracking.detectionHistory,
          {
            stage: 'PATTERN_RECOGNITION',
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
        previousResponses: [...memTracking.previousResponses, justification],
      };

      // Update session with memorization tracking
      setCoachingSession(sessionId, {
        ...sessionData,
        memorizationTracking: updatedMemTracking,
      });

      // Return warning with reprompt questions
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
        repromptQuestions: detectionResult.reprompts.map(r => ({
          id: r.id,
          question: r.question,
        })),
        allowedHelpLevel: detectionResult.recommendedHelpLevel,
        explanation: detectionResult.explanation,
        response: null,
        status: 'PENDING',
        isCorrect: false,
      });
    }

    // Process the pattern selection (no memorization detected)
    const result = processPatternRecognition(session, problem, selectedPattern, justification);

    // Update state machine if advancing
    let machineInfo = null;
    if (result.shouldAdvance && sessionData.machineContext) {
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

    // Update memorization tracking with successful response
    const updatedMemTracking: MemorizationTrackingData = {
      ...memTracking,
      previousResponses: [...memTracking.previousResponses, justification],
      // Reset stage timer if advancing
      stageStartedAt: result.shouldAdvance
        ? new Date().toISOString()
        : memTracking.stageStartedAt,
    };

    // Update stored session with proper type conversion
    setCoachingSession(sessionId, {
      session: sessionToStorageFormat(result.session),
      problem,
      machineContext: machineInfo && sessionData.machineContext
        ? machineContextToStorageFormat(
            storageToMachineContextFormat(sessionData.machineContext)
          )
        : sessionData.machineContext,
      memorizationTracking: updatedMemTracking,
    });

    const patternData = result.session.stageData.patternRecognition;

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
      status: patternData?.status ?? 'PENDING',
      isCorrect: result.shouldAdvance,
      stateMachine: machineInfo,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const errorStack = error instanceof Error ? error.stack : undefined;
    if (process.env.NODE_ENV !== 'test') {
      console.error(JSON.stringify({
        level: 'error',
        message: 'Error processing pattern selection',
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
