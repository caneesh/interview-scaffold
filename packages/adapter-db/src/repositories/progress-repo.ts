import { eq, and, ne, or, isNull } from 'drizzle-orm';
import type { ProgressRepo } from '@scaffold/core/ports';
import type {
  UserTrackProgress,
  UserContentProgress,
  IdempotentProgressResult,
} from '@scaffold/core/entities';
import type { TenantId } from '@scaffold/core/entities';
import type { Track } from '@scaffold/core/entities';
import type { DbClient } from '../client.js';
import { userTrackProgress, userContentProgress } from '../schema.js';

export function createProgressRepo(db: DbClient): ProgressRepo {
  return {
    // ============ Track Progress ============

    async findTrackProgress(
      tenantId: TenantId,
      userId: string,
      track: Track
    ): Promise<UserTrackProgress | null> {
      const result = await db.query.userTrackProgress.findFirst({
        where: and(
          eq(userTrackProgress.tenantId, tenantId),
          eq(userTrackProgress.userId, userId),
          eq(userTrackProgress.track, track)
        ),
      });

      return result ? mapToTrackProgress(result) : null;
    },

    async findAllTrackProgress(
      tenantId: TenantId,
      userId: string
    ): Promise<readonly UserTrackProgress[]> {
      const results = await db.query.userTrackProgress.findMany({
        where: and(
          eq(userTrackProgress.tenantId, tenantId),
          eq(userTrackProgress.userId, userId)
        ),
      });

      return results.map(mapToTrackProgress);
    },

    async saveTrackProgress(progress: UserTrackProgress): Promise<UserTrackProgress> {
      await db.insert(userTrackProgress).values({
        id: progress.id,
        tenantId: progress.tenantId,
        userId: progress.userId,
        track: progress.track,
        masteryScore: progress.masteryScore,
        attemptsCount: progress.attemptsCount,
        completedCount: progress.completedCount,
        lastActivityAt: progress.lastActivityAt,
        updatedAt: progress.updatedAt,
        lastAppliedAttemptId: progress.lastAppliedAttemptId,
      });

      return progress;
    },

    async updateTrackProgressIfNotApplied(
      progress: UserTrackProgress,
      attemptId: string
    ): Promise<IdempotentProgressResult<UserTrackProgress>> {
      // Check if this attempt has already been applied
      const existing = await this.findTrackProgress(
        progress.tenantId,
        progress.userId,
        progress.track
      );

      // If the attempt was already applied, return no-op
      if (existing?.lastAppliedAttemptId === attemptId) {
        return { progress: existing, wasApplied: false };
      }

      // Prepare progress with the new attempt ID
      const updatedProgress: UserTrackProgress = {
        ...progress,
        lastAppliedAttemptId: attemptId,
      };

      if (existing) {
        // Update with idempotency check using conditional update
        const result = await db
          .update(userTrackProgress)
          .set({
            masteryScore: updatedProgress.masteryScore,
            attemptsCount: updatedProgress.attemptsCount,
            completedCount: updatedProgress.completedCount,
            lastActivityAt: updatedProgress.lastActivityAt,
            updatedAt: updatedProgress.updatedAt,
            lastAppliedAttemptId: attemptId,
          })
          .where(
            and(
              eq(userTrackProgress.id, existing.id),
              // Only update if lastAppliedAttemptId is different or null
              or(
                isNull(userTrackProgress.lastAppliedAttemptId),
                ne(userTrackProgress.lastAppliedAttemptId, attemptId)
              )
            )
          )
          .returning();

        if (result.length === 0) {
          // Race condition: another request already applied this attempt
          const current = await this.findTrackProgress(
            progress.tenantId,
            progress.userId,
            progress.track
          );
          return { progress: current ?? existing, wasApplied: false };
        }

        return { progress: mapToTrackProgress(result[0]!), wasApplied: true };
      }

      // Insert new progress with attempt ID
      await this.saveTrackProgress({ ...updatedProgress, id: progress.id });
      return { progress: updatedProgress, wasApplied: true };
    },

    // ============ Content Progress ============

    async findContentProgressByContentItem(
      tenantId: TenantId,
      userId: string,
      contentItemId: string
    ): Promise<UserContentProgress | null> {
      const result = await db.query.userContentProgress.findFirst({
        where: and(
          eq(userContentProgress.tenantId, tenantId),
          eq(userContentProgress.userId, userId),
          eq(userContentProgress.contentItemId, contentItemId)
        ),
      });

      return result ? mapToContentProgress(result) : null;
    },

    async findContentProgressByProblem(
      tenantId: TenantId,
      userId: string,
      problemId: string
    ): Promise<UserContentProgress | null> {
      const result = await db.query.userContentProgress.findFirst({
        where: and(
          eq(userContentProgress.tenantId, tenantId),
          eq(userContentProgress.userId, userId),
          eq(userContentProgress.problemId, problemId)
        ),
      });

      return result ? mapToContentProgress(result) : null;
    },

    async findAllContentProgress(
      tenantId: TenantId,
      userId: string
    ): Promise<readonly UserContentProgress[]> {
      const results = await db.query.userContentProgress.findMany({
        where: and(
          eq(userContentProgress.tenantId, tenantId),
          eq(userContentProgress.userId, userId)
        ),
      });

      return results.map(mapToContentProgress);
    },

    async findContentProgressByTrack(
      tenantId: TenantId,
      userId: string,
      track: Track
    ): Promise<readonly UserContentProgress[]> {
      const results = await db.query.userContentProgress.findMany({
        where: and(
          eq(userContentProgress.tenantId, tenantId),
          eq(userContentProgress.userId, userId),
          eq(userContentProgress.track, track)
        ),
      });

      return results.map(mapToContentProgress);
    },

    async saveContentProgress(progress: UserContentProgress): Promise<UserContentProgress> {
      await db.insert(userContentProgress).values({
        id: progress.id,
        tenantId: progress.tenantId,
        userId: progress.userId,
        contentItemId: progress.contentItemId,
        problemId: progress.problemId,
        track: progress.track,
        attemptsCount: progress.attemptsCount,
        bestScore: progress.bestScore,
        lastScore: progress.lastScore,
        completedAt: progress.completedAt,
        lastAttemptAt: progress.lastAttemptAt,
        updatedAt: progress.updatedAt,
        lastAppliedAttemptId: progress.lastAppliedAttemptId,
      });

      return progress;
    },

    async updateContentProgressIfNotApplied(
      progress: UserContentProgress,
      attemptId: string
    ): Promise<IdempotentProgressResult<UserContentProgress>> {
      // Determine which lookup to use based on available IDs
      let existing: UserContentProgress | null = null;
      if (progress.contentItemId) {
        existing = await this.findContentProgressByContentItem(
          progress.tenantId,
          progress.userId,
          progress.contentItemId
        );
      } else if (progress.problemId) {
        existing = await this.findContentProgressByProblem(
          progress.tenantId,
          progress.userId,
          progress.problemId
        );
      }

      // If the attempt was already applied, return no-op
      if (existing?.lastAppliedAttemptId === attemptId) {
        return { progress: existing, wasApplied: false };
      }

      // Prepare progress with the new attempt ID
      const updatedProgress: UserContentProgress = {
        ...progress,
        lastAppliedAttemptId: attemptId,
      };

      if (existing) {
        // Update with idempotency check using conditional update
        const result = await db
          .update(userContentProgress)
          .set({
            attemptsCount: updatedProgress.attemptsCount,
            bestScore: updatedProgress.bestScore,
            lastScore: updatedProgress.lastScore,
            completedAt: updatedProgress.completedAt,
            lastAttemptAt: updatedProgress.lastAttemptAt,
            updatedAt: updatedProgress.updatedAt,
            lastAppliedAttemptId: attemptId,
          })
          .where(
            and(
              eq(userContentProgress.id, existing.id),
              // Only update if lastAppliedAttemptId is different or null
              or(
                isNull(userContentProgress.lastAppliedAttemptId),
                ne(userContentProgress.lastAppliedAttemptId, attemptId)
              )
            )
          )
          .returning();

        if (result.length === 0) {
          // Race condition: another request already applied this attempt
          let current: UserContentProgress | null = null;
          if (progress.contentItemId) {
            current = await this.findContentProgressByContentItem(
              progress.tenantId,
              progress.userId,
              progress.contentItemId
            );
          } else if (progress.problemId) {
            current = await this.findContentProgressByProblem(
              progress.tenantId,
              progress.userId,
              progress.problemId
            );
          }
          return { progress: current ?? existing, wasApplied: false };
        }

        return { progress: mapToContentProgress(result[0]!), wasApplied: true };
      }

      // Insert new progress with attempt ID
      await this.saveContentProgress({ ...updatedProgress, id: progress.id });
      return { progress: updatedProgress, wasApplied: true };
    },
  };
}

function mapToTrackProgress(
  row: typeof userTrackProgress.$inferSelect
): UserTrackProgress {
  return {
    id: row.id,
    tenantId: row.tenantId,
    userId: row.userId,
    track: row.track as Track,
    masteryScore: row.masteryScore,
    attemptsCount: row.attemptsCount,
    completedCount: row.completedCount,
    lastActivityAt: row.lastActivityAt,
    updatedAt: row.updatedAt,
    lastAppliedAttemptId: row.lastAppliedAttemptId,
  };
}

function mapToContentProgress(
  row: typeof userContentProgress.$inferSelect
): UserContentProgress {
  return {
    id: row.id,
    tenantId: row.tenantId,
    userId: row.userId,
    contentItemId: row.contentItemId,
    problemId: row.problemId,
    track: row.track as Track,
    attemptsCount: row.attemptsCount,
    bestScore: row.bestScore,
    lastScore: row.lastScore,
    completedAt: row.completedAt,
    lastAttemptAt: row.lastAttemptAt,
    updatedAt: row.updatedAt,
    lastAppliedAttemptId: row.lastAppliedAttemptId,
  };
}
