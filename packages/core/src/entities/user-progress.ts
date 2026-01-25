import type { Track } from './track.js';
import type { TenantId } from './tenant.js';

/**
 * UserTrackProgress - aggregated progress per user per track.
 * Tracks overall mastery and activity across a track (coding_interview, debug_lab, system_design).
 */
export interface UserTrackProgress {
  readonly id: string;
  readonly tenantId: TenantId;
  readonly userId: string;
  readonly track: Track;
  readonly masteryScore: number; // 0-100, aggregated across content
  readonly attemptsCount: number;
  readonly completedCount: number;
  readonly lastActivityAt: Date | null;
  readonly updatedAt: Date;
  // Idempotency: Track which attempt ID was last applied to prevent double-counting
  readonly lastAppliedAttemptId: string | null;
}

export type UserTrackProgressId = string;

/**
 * UserContentProgress - progress per user per content item.
 * Tracks individual problem/scenario completion and scores.
 */
export interface UserContentProgress {
  readonly id: string;
  readonly tenantId: TenantId;
  readonly userId: string;
  readonly contentItemId: string | null; // for unified content items
  readonly problemId: string | null; // for backward compat with existing problems table
  readonly track: Track;
  readonly attemptsCount: number;
  readonly bestScore: number | null; // highest score achieved (0-100)
  readonly lastScore: number | null; // most recent attempt score
  readonly completedAt: Date | null; // first successful completion
  readonly lastAttemptAt: Date | null;
  readonly updatedAt: Date;
  // Idempotency: Track which attempt ID was last applied to prevent double-counting
  readonly lastAppliedAttemptId: string | null;
}

export type UserContentProgressId = string;

/**
 * Summary of a user's progress across all tracks.
 */
export interface UserProgressSummary {
  readonly userId: string;
  readonly trackProgress: readonly UserTrackProgress[];
  readonly contentProgress: readonly UserContentProgress[];
}

/**
 * Result of an idempotent progress update.
 */
export interface IdempotentProgressResult<T> {
  readonly progress: T;
  readonly wasApplied: boolean; // true if update was applied, false if already applied
}
