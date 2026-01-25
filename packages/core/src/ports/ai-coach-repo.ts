/**
 * Unified AI Coach Repository Port
 *
 * Port interface for AI feedback and Socratic turn storage in the unified data model.
 * This is distinct from the existing AIArtifactsRepo which uses a different schema.
 */

import type { AttemptId } from '../entities/attempt.js';
import type { SubmissionId } from '../entities/submission.js';

// Import directly from entity files to avoid conflicts with exports in index.ts
import type {
  AIFeedback as UnifiedAIFeedback,
  AIFeedbackId,
  AIFeedbackType as UnifiedAIFeedbackType,
  AIFeedbackOutput,
} from '../entities/ai-feedback.js';
import type {
  SocraticTurn as UnifiedSocraticTurn,
  SocraticTurnId,
  SocraticRole,
  SocraticQuestion as UnifiedSocraticQuestion,
  SocraticValidation,
} from '../entities/socratic-turn.js';

// Re-export the types with Unified prefix for consumers
export type {
  UnifiedAIFeedback,
  AIFeedbackId,
  UnifiedAIFeedbackType,
  AIFeedbackOutput,
  UnifiedSocraticTurn,
  SocraticTurnId,
  SocraticRole,
  UnifiedSocraticQuestion,
  SocraticValidation,
};

/**
 * Unified AI Coach Repository Port
 *
 * Uses the new unified data model for content bank integration.
 */
export interface UnifiedAICoachRepoPort {
  // ============ AI Feedback ============

  /**
   * Write AI feedback
   */
  writeAIFeedback(params: {
    id: AIFeedbackId;
    userId: string;
    attemptId?: AttemptId | null;
    submissionId?: SubmissionId | null;
    type: UnifiedAIFeedbackType;
    model: string;
    promptVersion: string;
    inputHash: string;
    output: AIFeedbackOutput;
    evidence?: Record<string, unknown> | null;
  }): Promise<UnifiedAIFeedback>;

  /**
   * Get AI feedback by ID
   */
  getAIFeedback(id: AIFeedbackId): Promise<UnifiedAIFeedback | null>;

  /**
   * Get AI feedback by input hash (for deduplication)
   */
  getAIFeedbackByInputHash(inputHash: string): Promise<UnifiedAIFeedback | null>;

  /**
   * List AI feedback for an attempt
   */
  listAIFeedbackForAttempt(
    attemptId: AttemptId,
    options?: {
      type?: UnifiedAIFeedbackType;
      limit?: number;
    }
  ): Promise<readonly UnifiedAIFeedback[]>;

  // ============ Socratic Turns ============

  /**
   * Append a Socratic turn to an attempt's conversation
   */
  appendSocraticTurn(params: {
    id: SocraticTurnId;
    attemptId: AttemptId;
    userId: string;
    turnIndex: number;
    role: SocraticRole;
    message: string;
    question?: UnifiedSocraticQuestion | null;
    validation?: SocraticValidation | null;
  }): Promise<UnifiedSocraticTurn>;

  /**
   * Get a Socratic turn by ID
   */
  getSocraticTurn(id: SocraticTurnId): Promise<UnifiedSocraticTurn | null>;

  /**
   * List Socratic turns for an attempt
   */
  listSocraticTurns(
    attemptId: AttemptId,
    options?: {
      limit?: number;
      offset?: number;
    }
  ): Promise<readonly UnifiedSocraticTurn[]>;

  /**
   * Get the latest turn index for an attempt
   */
  getLatestTurnIndex(attemptId: AttemptId): Promise<number>;

  /**
   * Count Socratic turns for an attempt
   */
  countSocraticTurns(attemptId: AttemptId): Promise<number>;
}
