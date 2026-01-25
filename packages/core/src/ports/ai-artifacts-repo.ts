/**
 * AI Artifacts Repository Port
 *
 * Port for persisting AI-generated feedback artifacts including:
 * - Mistake analyses
 * - Socratic questions
 * - Socratic turns (dialogue history)
 * - Validation results
 */

import type { TenantId } from '../entities/tenant.js';
import type {
  MistakeAnalysis,
  SocraticQuestion,
  SocraticValidationResult,
  SocraticTurn,
  SocraticNextActionResult,
} from './socratic-coach.js';

// ============ AI Feedback Types ============

export type AIFeedbackType =
  | 'mistake_analysis'
  | 'socratic_question'
  | 'socratic_validation'
  | 'next_action';

/**
 * Persisted AI feedback artifact
 */
export interface AIFeedback {
  readonly id: string;
  readonly tenantId: TenantId;
  readonly attemptId: string;
  readonly stepId?: string;
  readonly type: AIFeedbackType;
  readonly content: MistakeAnalysis | SocraticQuestion | SocraticValidationResult | SocraticNextActionResult;
  readonly source: 'ai' | 'deterministic';
  readonly model?: string;
  readonly createdAt: Date;
}

// ============ Socratic Session Types ============

/**
 * A Socratic coaching session tied to an attempt
 */
export interface SocraticSession {
  readonly id: string;
  readonly tenantId: TenantId;
  readonly attemptId: string;
  readonly userId: string;
  readonly turns: readonly SocraticTurn[];
  readonly currentQuestionId: string | null;
  readonly isActive: boolean;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

// ============ Repository Interface ============

export interface AIArtifactsRepo {
  // ============ AI Feedback ============

  /**
   * Save an AI feedback artifact
   */
  saveFeedback(feedback: AIFeedback): Promise<AIFeedback>;

  /**
   * Get feedback by ID
   */
  getFeedbackById(tenantId: TenantId, id: string): Promise<AIFeedback | null>;

  /**
   * Get all feedback for an attempt
   */
  getFeedbackByAttempt(
    tenantId: TenantId,
    attemptId: string,
    type?: AIFeedbackType
  ): Promise<readonly AIFeedback[]>;

  /**
   * Get latest feedback of a specific type for an attempt
   */
  getLatestFeedback(
    tenantId: TenantId,
    attemptId: string,
    type: AIFeedbackType
  ): Promise<AIFeedback | null>;

  // ============ Socratic Sessions ============

  /**
   * Create or get existing Socratic session for an attempt
   */
  getOrCreateSession(
    tenantId: TenantId,
    attemptId: string,
    userId: string
  ): Promise<SocraticSession>;

  /**
   * Get Socratic session by attempt ID
   */
  getSessionByAttempt(tenantId: TenantId, attemptId: string): Promise<SocraticSession | null>;

  /**
   * Add a turn to a Socratic session
   */
  addTurn(
    tenantId: TenantId,
    sessionId: string,
    turn: SocraticTurn
  ): Promise<SocraticSession>;

  /**
   * Update the current question in a session
   */
  setCurrentQuestion(
    tenantId: TenantId,
    sessionId: string,
    questionId: string | null
  ): Promise<SocraticSession>;

  /**
   * End a Socratic session
   */
  endSession(tenantId: TenantId, sessionId: string): Promise<SocraticSession>;
}

// ============ Null Implementation ============

/**
 * In-memory implementation for testing
 */
export function createInMemoryAIArtifactsRepo(): AIArtifactsRepo {
  const feedbacks = new Map<string, AIFeedback>();
  const sessions = new Map<string, SocraticSession>();

  return {
    async saveFeedback(feedback: AIFeedback): Promise<AIFeedback> {
      feedbacks.set(feedback.id, feedback);
      return feedback;
    },

    async getFeedbackById(tenantId: TenantId, id: string): Promise<AIFeedback | null> {
      const feedback = feedbacks.get(id);
      return feedback?.tenantId === tenantId ? feedback : null;
    },

    async getFeedbackByAttempt(
      tenantId: TenantId,
      attemptId: string,
      type?: AIFeedbackType
    ): Promise<readonly AIFeedback[]> {
      return Array.from(feedbacks.values())
        .filter(
          (f) =>
            f.tenantId === tenantId &&
            f.attemptId === attemptId &&
            (type === undefined || f.type === type)
        )
        .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
    },

    async getLatestFeedback(
      tenantId: TenantId,
      attemptId: string,
      type: AIFeedbackType
    ): Promise<AIFeedback | null> {
      const matching = Array.from(feedbacks.values())
        .filter(
          (f) =>
            f.tenantId === tenantId &&
            f.attemptId === attemptId &&
            f.type === type
        )
        .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
      return matching[0] ?? null;
    },

    async getOrCreateSession(
      tenantId: TenantId,
      attemptId: string,
      userId: string
    ): Promise<SocraticSession> {
      // Check for existing session
      for (const session of sessions.values()) {
        if (session.tenantId === tenantId && session.attemptId === attemptId) {
          return session;
        }
      }

      // Create new session
      const now = new Date();
      const session: SocraticSession = {
        id: `socratic-${attemptId}-${Date.now()}`,
        tenantId,
        attemptId,
        userId,
        turns: [],
        currentQuestionId: null,
        isActive: true,
        createdAt: now,
        updatedAt: now,
      };
      sessions.set(session.id, session);
      return session;
    },

    async getSessionByAttempt(
      tenantId: TenantId,
      attemptId: string
    ): Promise<SocraticSession | null> {
      for (const session of sessions.values()) {
        if (session.tenantId === tenantId && session.attemptId === attemptId) {
          return session;
        }
      }
      return null;
    },

    async addTurn(
      tenantId: TenantId,
      sessionId: string,
      turn: SocraticTurn
    ): Promise<SocraticSession> {
      const session = sessions.get(sessionId);
      if (!session || session.tenantId !== tenantId) {
        throw new Error('Session not found');
      }

      const updated: SocraticSession = {
        ...session,
        turns: [...session.turns, turn],
        updatedAt: new Date(),
      };
      sessions.set(sessionId, updated);
      return updated;
    },

    async setCurrentQuestion(
      tenantId: TenantId,
      sessionId: string,
      questionId: string | null
    ): Promise<SocraticSession> {
      const session = sessions.get(sessionId);
      if (!session || session.tenantId !== tenantId) {
        throw new Error('Session not found');
      }

      const updated: SocraticSession = {
        ...session,
        currentQuestionId: questionId,
        updatedAt: new Date(),
      };
      sessions.set(sessionId, updated);
      return updated;
    },

    async endSession(tenantId: TenantId, sessionId: string): Promise<SocraticSession> {
      const session = sessions.get(sessionId);
      if (!session || session.tenantId !== tenantId) {
        throw new Error('Session not found');
      }

      const updated: SocraticSession = {
        ...session,
        isActive: false,
        currentQuestionId: null,
        updatedAt: new Date(),
      };
      sessions.set(sessionId, updated);
      return updated;
    },
  };
}
