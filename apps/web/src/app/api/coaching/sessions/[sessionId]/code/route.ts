import { NextRequest, NextResponse } from 'next/server';
import { AnalyzeCodeRequestSchema } from '@scaffold/contracts';
import { processCodeAnalysis } from '@scaffold/core/learner-centric';
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
 * Common editorial patterns in code that may indicate copy-paste
 */
const EDITORIAL_CODE_PATTERNS = [
  // Common editorial variable names
  /\b(optimal|memo|dp_table|cache_map)\s*=/i,
  // Common editorial comments
  /\/\/\s*(optimal|efficient|best)\s+solution/i,
  /\/\/\s*time:\s*O\([^)]+\)/i,
  /\/\/\s*space:\s*O\([^)]+\)/i,
  // Highly polished structure
  /^\s*\/\*\*[\s\S]*?\*\/\s*function/m,
];

/**
 * Check if code matches common editorial patterns
 */
function detectEditorialCodePatterns(code: string): {
  detected: boolean;
  patterns: string[];
} {
  const detectedPatterns: string[] = [];

  for (const pattern of EDITORIAL_CODE_PATTERNS) {
    if (pattern.test(code)) {
      detectedPatterns.push(pattern.source);
    }
  }

  return {
    detected: detectedPatterns.length >= 2, // Require multiple matches
    patterns: detectedPatterns,
  };
}

/**
 * Generate a non-accusatory warning message for code
 */
function getCodeWarningMessage(classification: MemorizationClassification): string {
  switch (classification) {
    case 'likely_memorized':
      return 'Your code appears very polished. While this might be your style, ' +
        'could you explain how you arrived at this implementation? ' +
        'What alternatives did you consider?';
    case 'partially_memorized':
      return 'Some patterns in your code are quite common in editorials. ' +
        'Please walk through your reasoning for the key parts of your solution.';
    default:
      return 'Please explain your implementation approach.';
  }
}

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

    // Get memorization tracking data
    const memTracking = sessionData.memorizationTracking ?? {
      detectionHistory: [],
      activeReprompts: [],
      restrictedHelpLevel: null,
      previousResponses: [],
      stageStartedAt: session.startedAt.toISOString(),
    };

    // Check for editorial code patterns
    const editorialCheck = detectEditorialCodePatterns(code);

    // Check against problem-specific anti-cheat markers if available
    // Note: antiCheatMarkers can be added to Problem entity later
    const antiCheatMarkers: string[] = [];
    const foundMarkers: string[] = [];
    for (const marker of antiCheatMarkers) {
      if (code.toLowerCase().includes(marker.toLowerCase())) {
        foundMarkers.push(marker);
      }
    }

    // Build a list of code-related warnings
    const codeWarnings: Array<{
      type: 'editorial_pattern' | 'anti_cheat_marker';
      message: string;
      severity: 'info' | 'warning';
    }> = [];

    if (editorialCheck.detected) {
      codeWarnings.push({
        type: 'editorial_pattern',
        message: 'Your code contains patterns commonly found in online editorials. ' +
          'This is just an observation - please make sure you understand each line.',
        severity: 'info',
      });
    }

    if (foundMarkers.length > 0) {
      codeWarnings.push({
        type: 'anti_cheat_marker',
        message: 'Your code contains some distinctive patterns. ' +
          'If you arrived at this solution independently, great! ' +
          'Otherwise, try to develop your own approach.',
        severity: 'warning',
      });

      // Update memorization tracking with the detection
      const updatedMemTracking: MemorizationTrackingData = {
        ...memTracking,
        detectionHistory: [
          ...memTracking.detectionHistory,
          {
            stage: 'CODING',
            timestamp: new Date().toISOString(),
            classification: 'partially_memorized',
            confidence: 0.5,
            action: 'continue', // Don't block coding, just warn
          },
        ],
      };

      setCoachingSession(sessionId, {
        ...sessionData,
        memorizationTracking: updatedMemTracking,
      });
    }

    // Process the code
    const result = processCodeAnalysis(session, problem, code, language);

    // Update state machine if advancing to reflection
    let machineInfo = null;
    if (result.session.currentStage === 'REFLECTION' && sessionData.machineContext) {
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
      // Include anti-cheat warnings
      antiCheatWarnings: codeWarnings,
      stateMachine: machineInfo,
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
