/**
 * RunPatternDiscovery use-case.
 * Handles pattern discovery through Socratic questioning.
 */

import type { TenantId, UserId, PatternId, SessionId } from '../entities/types.js';
import type { Clock } from '../ports/Clock.js';
import type { EventSink } from '../ports/EventSink.js';
import { EventType, createLearningEvent, type DiscoveryEvent } from '../entities/LearningEvent.js';
import type {
  DiscoveryResult,
  SocraticQuestion,
} from '../drills/types.js';
import type { DiscoverySession, DiscoveryProgress } from '../drills/PatternDiscovery.js';
import {
  createDiscoverySession,
  getCurrentQuestion,
  submitDiscoveryAnswer,
  evaluateDiscovery,
  getFollowUp,
  calculateDiscoveryProgress,
  getAvailableDiscoveryPatterns,
} from '../drills/PatternDiscovery.js';

// ============================================================================
// Session Storage (in-memory for now)
// ============================================================================

const activeSessions = new Map<string, DiscoverySession>();

// ============================================================================
// Start Discovery
// ============================================================================

export interface StartPatternDiscoveryInput {
  readonly tenantId: TenantId;
  readonly userId: UserId;
  readonly patternId: PatternId;
}

export interface StartPatternDiscoveryOutput {
  readonly sessionId: SessionId;
  readonly patternName: string;
  readonly firstQuestion: SocraticQuestion;
  readonly progress: DiscoveryProgress;
}

export interface StartPatternDiscoveryDeps {
  readonly clock: Clock;
  readonly eventSink: EventSink;
}

export async function startPatternDiscovery(
  input: StartPatternDiscoveryInput,
  deps: StartPatternDiscoveryDeps
): Promise<StartPatternDiscoveryOutput | null> {
  const { tenantId, userId, patternId } = input;
  const { clock, eventSink } = deps;

  // Generate session ID
  const sessionId = `discovery-${userId}-${patternId}-${clock.now()}` as SessionId;

  // Create session
  const session = createDiscoverySession(sessionId, patternId);
  if (!session) {
    return null;
  }

  // Store session
  const sessionKey = `${tenantId}-${sessionId}`;
  activeSessions.set(sessionKey, session);

  // Get first question
  const firstQuestion = getCurrentQuestion(session);
  if (!firstQuestion) {
    return null;
  }

  // Emit event
  await eventSink.record(createLearningEvent<DiscoveryEvent>({
    tenantId,
    userId,
    type: EventType.DISCOVERY_STARTED,
    patternId,
    sessionId,
    metadata: {},
  }));

  return {
    sessionId,
    patternName: session.config.patternName,
    firstQuestion,
    progress: calculateDiscoveryProgress(session),
  };
}

// ============================================================================
// Answer Question
// ============================================================================

export interface AnswerDiscoveryQuestionInput {
  readonly tenantId: TenantId;
  readonly userId: UserId;
  readonly sessionId: SessionId;
  readonly answer: 'yes' | 'no' | 'depends';
}

export interface AnswerDiscoveryQuestionOutput {
  readonly followUp: string | null;
  readonly nextQuestion: SocraticQuestion | null;
  readonly progress: DiscoveryProgress;
  readonly isComplete: boolean;
  readonly result: DiscoveryResult | null;
}

export async function answerDiscoveryQuestion(
  input: AnswerDiscoveryQuestionInput,
  deps: StartPatternDiscoveryDeps
): Promise<AnswerDiscoveryQuestionOutput | null> {
  const { tenantId, userId, sessionId, answer } = input;
  const { clock, eventSink } = deps;

  // Get session
  const sessionKey = `${tenantId}-${sessionId}`;
  const session = activeSessions.get(sessionKey);
  if (!session) {
    return null;
  }

  // Get follow-up before submitting
  const followUp = getFollowUp(session, answer);

  // Submit answer
  const updatedSession = submitDiscoveryAnswer(session, answer);
  activeSessions.set(sessionKey, updatedSession);

  // Get next question
  const nextQuestion = getCurrentQuestion(updatedSession);
  const progress = calculateDiscoveryProgress(updatedSession);

  // If complete, evaluate and emit events
  let result: DiscoveryResult | null = null;
  if (updatedSession.isComplete) {
    result = evaluateDiscovery(updatedSession);

    // Emit discovery completed event
    await eventSink.record(createLearningEvent<DiscoveryEvent>({
      tenantId,
      userId,
      type: EventType.DISCOVERY_COMPLETED,
      patternId: result.patternId,
      sessionId,
      metadata: {
        inferredCorrectly: result.inferredCorrectly,
        answersCorrect: result.answersCorrect,
        answersTotal: result.answersTotal,
        countsAsHint1: result.countsAsHint1,
      },
    }));

    // Clean up session
    activeSessions.delete(sessionKey);
  }

  return {
    followUp,
    nextQuestion,
    progress,
    isComplete: updatedSession.isComplete,
    result,
  };
}

// ============================================================================
// Get Available Patterns
// ============================================================================

export interface GetDiscoveryPatternsOutput {
  readonly patterns: readonly {
    readonly patternId: PatternId;
    readonly patternName: string;
    readonly questionCount: number;
  }[];
}

export function getDiscoveryPatterns(): GetDiscoveryPatternsOutput {
  const patterns = getAvailableDiscoveryPatterns().map(config => ({
    patternId: config.patternId,
    patternName: config.patternName,
    questionCount: config.questions.length,
  }));

  return { patterns };
}

// ============================================================================
// Get Session State
// ============================================================================

export interface GetDiscoverySessionInput {
  readonly tenantId: TenantId;
  readonly sessionId: SessionId;
}

export interface GetDiscoverySessionOutput {
  readonly session: DiscoverySession;
  readonly currentQuestion: SocraticQuestion | null;
  readonly progress: DiscoveryProgress;
}

export function getDiscoverySession(
  input: GetDiscoverySessionInput
): GetDiscoverySessionOutput | null {
  const { tenantId, sessionId } = input;
  const sessionKey = `${tenantId}-${sessionId}`;
  const session = activeSessions.get(sessionKey);

  if (!session) {
    return null;
  }

  return {
    session,
    currentQuestion: getCurrentQuestion(session),
    progress: calculateDiscoveryProgress(session),
  };
}
