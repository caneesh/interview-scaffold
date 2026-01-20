import { NextRequest, NextResponse } from 'next/server';
import { RequestHelpRequestSchema } from '@scaffold/contracts';
import { processHelp, createInitialHelpState, HELP_LEVEL_PENALTIES } from '@scaffold/core/learner-centric';
import type { HelpState } from '@scaffold/core/learner-centric';
import {
  getCoachingSession,
  setCoachingSession,
  storageToSessionFormat,
  sessionToStorageFormat,
} from '@/lib/coaching-session-store';

// Track help state per session
const helpStates = new Map<string, HelpState>();

/** Rate limiting: minimum time between help requests in milliseconds */
const HELP_REQUEST_COOLDOWN_MS = 5000; // 5 seconds

/**
 * POST /api/coaching/sessions/:sessionId/help
 *
 * Request help at a specific level
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { sessionId: string } }
) {
  try {
    const body = await request.json();
    const parsed = RequestHelpRequestSchema.safeParse({
      ...body,
      sessionId: params.sessionId,
    });

    if (!parsed.success) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: parsed.error.message } },
        { status: 400 }
      );
    }

    const { sessionId, requestedLevel, explicitlyRequested, context } = parsed.data;

    const sessionData = getCoachingSession(sessionId);
    if (!sessionData) {
      return NextResponse.json(
        { error: { code: 'SESSION_NOT_FOUND', message: 'Coaching session not found' } },
        { status: 404 }
      );
    }

    // MAJOR-5: Rate limiting for help requests
    const now = new Date();
    if (sessionData.lastHelpRequestAt) {
      const lastRequest = new Date(sessionData.lastHelpRequestAt);
      const timeSinceLastRequest = now.getTime() - lastRequest.getTime();
      if (timeSinceLastRequest < HELP_REQUEST_COOLDOWN_MS) {
        const waitTime = Math.ceil((HELP_REQUEST_COOLDOWN_MS - timeSinceLastRequest) / 1000);
        return NextResponse.json(
          {
            error: {
              code: 'RATE_LIMITED',
              message: `Please wait ${waitTime} seconds before requesting help again`,
            },
          },
          { status: 429 }
        );
      }
    }

    // Convert from storage format to session format
    const session = storageToSessionFormat(sessionData.session);
    const { problem } = sessionData;

    // Get or create help state
    let helpState = helpStates.get(sessionId);
    if (!helpState) {
      helpState = createInitialHelpState();
    }

    // Process help request
    const result = processHelp(
      session,
      helpState,
      problem,
      requestedLevel,
      explicitlyRequested ?? false,
      context
    );

    // Update stored session with rate limiting timestamp and proper type conversion
    setCoachingSession(sessionId, {
      session: sessionToStorageFormat(result.session),
      problem,
      lastHelpRequestAt: now.toISOString(),
    });
    helpStates.set(sessionId, result.helpState);

    const penalty = HELP_LEVEL_PENALTIES[result.helpState.currentLevel];

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
      level: result.helpState.currentLevel,
      penalty,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const errorStack = error instanceof Error ? error.stack : undefined;
    if (process.env.NODE_ENV !== 'test') {
      console.error(JSON.stringify({
        level: 'error',
        message: 'Error processing help request',
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
