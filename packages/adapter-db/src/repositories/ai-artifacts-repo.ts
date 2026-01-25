/**
 * Unified AI Artifacts Repository Adapter
 *
 * Implements UnifiedAICoachRepoPort using Drizzle ORM.
 * Handles AI feedback and Socratic turn storage for the unified content bank model.
 */

import { eq, and, desc, sql } from 'drizzle-orm';
import type {
  UnifiedAICoachRepoPort,
  UnifiedAIFeedback,
  AIFeedbackId,
  UnifiedAIFeedbackType,
  AIFeedbackOutput,
  UnifiedSocraticTurn,
  SocraticTurnId,
  SocraticRole,
  UnifiedSocraticQuestion,
  SocraticValidation,
} from '@scaffold/core/ports';
import type { AttemptId, SubmissionId } from '@scaffold/core/entities';
import type { DbClient } from '../client.js';
import { aiFeedback, socraticTurns } from '../schema.js';

export function createUnifiedAIArtifactsRepo(db: DbClient): UnifiedAICoachRepoPort {
  return {
    // ============ AI Feedback ============

    async writeAIFeedback(params: {
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
    }): Promise<UnifiedAIFeedback> {
      const [inserted] = await db
        .insert(aiFeedback)
        .values({
          id: params.id,
          userId: params.userId,
          attemptId: params.attemptId ?? null,
          submissionId: params.submissionId ?? null,
          type: params.type,
          model: params.model,
          promptVersion: params.promptVersion,
          inputHash: params.inputHash,
          output: params.output as Record<string, unknown>,
          evidence: params.evidence ?? null,
        })
        .returning();

      if (!inserted) {
        throw new Error('Failed to insert AI feedback');
      }

      return mapToAIFeedback(inserted);
    },

    async getAIFeedback(id: AIFeedbackId): Promise<UnifiedAIFeedback | null> {
      const result = await db.query.aiFeedback.findFirst({
        where: eq(aiFeedback.id, id),
      });

      return result ? mapToAIFeedback(result) : null;
    },

    async getAIFeedbackByInputHash(inputHash: string): Promise<UnifiedAIFeedback | null> {
      const result = await db.query.aiFeedback.findFirst({
        where: eq(aiFeedback.inputHash, inputHash),
        orderBy: [desc(aiFeedback.createdAt)],
      });

      return result ? mapToAIFeedback(result) : null;
    },

    async listAIFeedbackForAttempt(
      attemptId: AttemptId,
      options?: {
        type?: UnifiedAIFeedbackType;
        limit?: number;
      }
    ): Promise<readonly UnifiedAIFeedback[]> {
      const conditions = [eq(aiFeedback.attemptId, attemptId)];

      if (options?.type) {
        conditions.push(eq(aiFeedback.type, options.type));
      }

      const results = await db.query.aiFeedback.findMany({
        where: and(...conditions),
        orderBy: [desc(aiFeedback.createdAt)],
        limit: options?.limit ?? 100,
      });

      return results.map(mapToAIFeedback);
    },

    // ============ Socratic Turns ============

    async appendSocraticTurn(params: {
      id: SocraticTurnId;
      attemptId: AttemptId;
      userId: string;
      turnIndex: number;
      role: SocraticRole;
      message: string;
      question?: UnifiedSocraticQuestion | null;
      validation?: SocraticValidation | null;
    }): Promise<UnifiedSocraticTurn> {
      const [inserted] = await db
        .insert(socraticTurns)
        .values({
          id: params.id,
          attemptId: params.attemptId,
          userId: params.userId,
          turnIndex: params.turnIndex,
          role: params.role,
          message: params.message,
          question: params.question as Record<string, unknown> | null,
          validation: params.validation as Record<string, unknown> | null,
        })
        .returning();

      if (!inserted) {
        throw new Error('Failed to insert Socratic turn');
      }

      return mapToSocraticTurn(inserted);
    },

    async getSocraticTurn(id: SocraticTurnId): Promise<UnifiedSocraticTurn | null> {
      const result = await db.query.socraticTurns.findFirst({
        where: eq(socraticTurns.id, id),
      });

      return result ? mapToSocraticTurn(result) : null;
    },

    async listSocraticTurns(
      attemptId: AttemptId,
      options?: {
        limit?: number;
        offset?: number;
      }
    ): Promise<readonly UnifiedSocraticTurn[]> {
      const results = await db.query.socraticTurns.findMany({
        where: eq(socraticTurns.attemptId, attemptId),
        orderBy: [socraticTurns.turnIndex],
        limit: options?.limit ?? 1000,
        offset: options?.offset ?? 0,
      });

      return results.map(mapToSocraticTurn);
    },

    async getLatestTurnIndex(attemptId: AttemptId): Promise<number> {
      const result = await db
        .select({ maxIndex: sql<number>`coalesce(max(turn_index), -1)::int` })
        .from(socraticTurns)
        .where(eq(socraticTurns.attemptId, attemptId));

      return (result[0]?.maxIndex ?? -1) + 1;
    },

    async countSocraticTurns(attemptId: AttemptId): Promise<number> {
      const result = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(socraticTurns)
        .where(eq(socraticTurns.attemptId, attemptId));

      return result[0]?.count ?? 0;
    },
  };
}

function mapToAIFeedback(
  row: typeof aiFeedback.$inferSelect
): UnifiedAIFeedback {
  return {
    id: row.id,
    userId: row.userId,
    attemptId: row.attemptId,
    submissionId: row.submissionId,
    type: row.type as UnifiedAIFeedbackType,
    model: row.model,
    promptVersion: row.promptVersion,
    inputHash: row.inputHash,
    output: row.output as AIFeedbackOutput,
    evidence: row.evidence as Record<string, unknown> | null,
    createdAt: row.createdAt,
  };
}

function mapToSocraticTurn(
  row: typeof socraticTurns.$inferSelect
): UnifiedSocraticTurn {
  return {
    id: row.id,
    attemptId: row.attemptId,
    userId: row.userId,
    turnIndex: row.turnIndex,
    role: row.role as SocraticRole,
    message: row.message,
    question: row.question as UnifiedSocraticQuestion | null,
    validation: row.validation as SocraticValidation | null,
    createdAt: row.createdAt,
  };
}
