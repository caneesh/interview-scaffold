import type {
  UserTrackProgress,
  UserContentProgress,
  IdempotentProgressResult,
} from '../entities/user-progress.js';
import type { TenantId } from '../entities/tenant.js';
import type { Track } from '../entities/track.js';

/**
 * ProgressRepo - port for user progress persistence (TrackE).
 * Provides idempotent operations to prevent double-counting of attempts.
 */
export interface ProgressRepo {
  // ============ Track Progress ============

  /**
   * Find track progress for a user and track.
   */
  findTrackProgress(
    tenantId: TenantId,
    userId: string,
    track: Track
  ): Promise<UserTrackProgress | null>;

  /**
   * Find all track progress for a user across all tracks.
   */
  findAllTrackProgress(
    tenantId: TenantId,
    userId: string
  ): Promise<readonly UserTrackProgress[]>;

  /**
   * Save new track progress.
   */
  saveTrackProgress(progress: UserTrackProgress): Promise<UserTrackProgress>;

  /**
   * Idempotent track progress update - only applies update if attemptId hasn't been applied yet.
   * Returns { progress, wasApplied: true } if update was applied.
   * Returns { progress, wasApplied: false } if already applied (no-op).
   */
  updateTrackProgressIfNotApplied(
    progress: UserTrackProgress,
    attemptId: string
  ): Promise<IdempotentProgressResult<UserTrackProgress>>;

  // ============ Content Progress ============

  /**
   * Find content progress for a user and content item.
   */
  findContentProgressByContentItem(
    tenantId: TenantId,
    userId: string,
    contentItemId: string
  ): Promise<UserContentProgress | null>;

  /**
   * Find content progress for a user and problem (legacy support).
   */
  findContentProgressByProblem(
    tenantId: TenantId,
    userId: string,
    problemId: string
  ): Promise<UserContentProgress | null>;

  /**
   * Find all content progress for a user.
   */
  findAllContentProgress(
    tenantId: TenantId,
    userId: string
  ): Promise<readonly UserContentProgress[]>;

  /**
   * Find all content progress for a user filtered by track.
   */
  findContentProgressByTrack(
    tenantId: TenantId,
    userId: string,
    track: Track
  ): Promise<readonly UserContentProgress[]>;

  /**
   * Save new content progress.
   */
  saveContentProgress(progress: UserContentProgress): Promise<UserContentProgress>;

  /**
   * Idempotent content progress update - only applies update if attemptId hasn't been applied yet.
   * Returns { progress, wasApplied: true } if update was applied.
   * Returns { progress, wasApplied: false } if already applied (no-op).
   */
  updateContentProgressIfNotApplied(
    progress: UserContentProgress,
    attemptId: string
  ): Promise<IdempotentProgressResult<UserContentProgress>>;
}
