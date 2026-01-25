/**
 * Submissions Repository Adapter
 *
 * Implements SubmissionsRepoPort using Drizzle ORM.
 */

import { eq, and, desc, sql } from 'drizzle-orm';
import type { SubmissionsRepoPort } from '@scaffold/core/ports';
import type {
  Submission,
  SubmissionId,
  SubmissionType,
  SubmissionContent,
} from '@scaffold/core/entities';
import type { AttemptId } from '@scaffold/core/entities';
import type { DbClient } from '../client.js';
import { submissions } from '../schema.js';

export function createSubmissionsRepo(db: DbClient): SubmissionsRepoPort {
  return {
    async createSubmission(params: {
      id: SubmissionId;
      attemptId: AttemptId;
      userId: string;
      type: SubmissionType;
      language?: string | null;
      contentText?: string | null;
      contentJson?: SubmissionContent;
      isFinal?: boolean;
    }): Promise<Submission> {
      const [inserted] = await db
        .insert(submissions)
        .values({
          id: params.id,
          attemptId: params.attemptId,
          userId: params.userId,
          type: params.type,
          language: params.language ?? null,
          contentText: params.contentText ?? null,
          contentJson: (params.contentJson ?? {}) as Record<string, unknown>,
          isFinal: params.isFinal ?? false,
        })
        .returning();

      if (!inserted) {
        throw new Error('Failed to insert submission');
      }

      return mapToSubmission(inserted);
    },

    async getSubmission(id: SubmissionId): Promise<Submission | null> {
      const result = await db.query.submissions.findFirst({
        where: eq(submissions.id, id),
      });

      return result ? mapToSubmission(result) : null;
    },

    async listSubmissionsForAttempt(
      attemptId: AttemptId,
      options?: {
        type?: SubmissionType;
        limit?: number;
        offset?: number;
      }
    ): Promise<readonly Submission[]> {
      const conditions = [eq(submissions.attemptId, attemptId)];

      if (options?.type) {
        conditions.push(eq(submissions.type, options.type));
      }

      const results = await db.query.submissions.findMany({
        where: and(...conditions),
        orderBy: [desc(submissions.createdAt)],
        limit: options?.limit ?? 100,
        offset: options?.offset ?? 0,
      });

      return results.map(mapToSubmission);
    },

    async getLatestSubmission(
      attemptId: AttemptId,
      type?: SubmissionType
    ): Promise<Submission | null> {
      const conditions = [eq(submissions.attemptId, attemptId)];

      if (type) {
        conditions.push(eq(submissions.type, type));
      }

      const result = await db.query.submissions.findFirst({
        where: and(...conditions),
        orderBy: [desc(submissions.createdAt)],
      });

      return result ? mapToSubmission(result) : null;
    },

    async markSubmissionFinal(id: SubmissionId): Promise<Submission> {
      const [updated] = await db
        .update(submissions)
        .set({ isFinal: true })
        .where(eq(submissions.id, id))
        .returning();

      if (!updated) {
        throw new Error(`Submission not found: ${id}`);
      }

      return mapToSubmission(updated);
    },

    async countSubmissionsForAttempt(
      attemptId: AttemptId,
      type?: SubmissionType
    ): Promise<number> {
      const conditions = [eq(submissions.attemptId, attemptId)];

      if (type) {
        conditions.push(eq(submissions.type, type));
      }

      const result = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(submissions)
        .where(and(...conditions));

      return result[0]?.count ?? 0;
    },
  };
}

function mapToSubmission(
  row: typeof submissions.$inferSelect
): Submission {
  return {
    id: row.id,
    attemptId: row.attemptId,
    userId: row.userId,
    type: row.type as SubmissionType,
    language: row.language,
    contentText: row.contentText,
    contentJson: (row.contentJson ?? {}) as SubmissionContent,
    isFinal: row.isFinal,
    createdAt: row.createdAt,
  };
}
