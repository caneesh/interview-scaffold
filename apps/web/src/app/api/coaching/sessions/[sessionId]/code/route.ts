import { NextRequest, NextResponse } from 'next/server';
import { AnalyzeCodeRequestSchema } from '@scaffold/contracts';
import { processCodeAnalysis } from '@scaffold/core/learner-centric';
import {
  getCoachingSession,
  setCoachingSession,
  storageToSessionFormat,
  sessionToStorageFormat,
} from '@/lib/coaching-session-store';

/** Maximum code length to accept for analysis (ReDoS protection) */
const MAX_CODE_LENGTH = 10000;

/**
 * POST /api/coaching/sessions/:sessionId/code
 *
 * Analyze code with the silent interviewer
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { sessionId: string } }
) {
  try {
    const body = await request.json();
    const parsed = AnalyzeCodeRequestSchema.safeParse({
      ...body,
      sessionId: params.sessionId,
    });

    if (!parsed.success) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: parsed.error.message } },
        { status: 400 }
      );
    }

    const { sessionId, code, language } = parsed.data;

    // CRITICAL-3: Code length validation to prevent ReDoS attacks
    if (code.length > MAX_CODE_LENGTH) {
      return NextResponse.json(
        {
          error: {
            code: 'CODE_TOO_LONG',
            message: `Code exceeds maximum length of ${MAX_CODE_LENGTH} characters`,
          },
        },
        { status: 400 }
      );
    }

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
    if (session.currentStage !== 'CODING') {
      return NextResponse.json(
        { error: { code: 'WRONG_STAGE', message: 'Not in coding stage' } },
        { status: 400 }
      );
    }

    // Process the code
    const result = processCodeAnalysis(session, problem, code, language);

    // Update stored session with proper type conversion
    setCoachingSession(sessionId, {
      session: sessionToStorageFormat(result.session),
      problem,
    });

    const codingData = result.session.stageData.coding;

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
      observations: (codingData?.observations ?? []).map(o => ({
        id: o.id,
        type: o.type,
        description: o.description,
        lineNumber: o.lineNumber,
      })),
      warnings: (codingData?.warnings ?? []).map(w => ({
        id: w.id,
        type: w.type,
        description: w.description,
        lineNumber: w.lineNumber,
      })),
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const errorStack = error instanceof Error ? error.stack : undefined;
    if (process.env.NODE_ENV !== 'test') {
      console.error(JSON.stringify({
        level: 'error',
        message: 'Error analyzing code',
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
