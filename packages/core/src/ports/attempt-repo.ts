import type { Attempt, AttemptId, TrackAttempt, LegacyAttempt } from '../entities/attempt.js';
import type { TenantId } from '../entities/tenant.js';
import type { PatternId } from '../entities/pattern.js';
import type { RungLevel } from '../entities/rung.js';
import type { Track } from '../entities/track.js';
import type { ContentItemId, ContentVersionId } from '../entities/content-item.js';

/**
 * Parameters for creating a track-based attempt
 */
export interface CreateTrackAttemptParams {
  userId: string;
  tenantId: TenantId;
  track: Track;
  contentItemId: ContentItemId;
  contentVersionId?: ContentVersionId | null;
  pattern: PatternId;
  rung: RungLevel;
}

/**
 * AttemptRepo - port for attempt persistence
 *
 * Supports both legacy problem-based attempts and track-based content bank attempts.
 */
export interface AttemptRepo {
  /**
   * Find an attempt by ID - returns unified Attempt (legacy or track-based)
   */
  findById(tenantId: TenantId, id: AttemptId): Promise<Attempt | null>;

  findByUser(
    tenantId: TenantId,
    userId: string,
    options?: {
      pattern?: PatternId;
      rung?: RungLevel;
      limit?: number;
    }
  ): Promise<readonly Attempt[]>;

  /**
   * Find last N completed attempts for a specific pattern+rung
   * Used for mastery calculation (e.g., last 5 attempts)
   * Returns attempts sorted by completedAt descending (most recent first)
   */
  findCompletedByPatternRung(
    tenantId: TenantId,
    userId: string,
    pattern: PatternId,
    rung: RungLevel,
    limit: number
  ): Promise<readonly Attempt[]>;

  findActive(tenantId: TenantId, userId: string): Promise<Attempt | null>;

  /**
   * Find an active track-based attempt for a specific content item.
   * Used to check for existing attempts when starting a new one.
   */
  findActiveByContent(
    tenantId: TenantId,
    userId: string,
    contentItemId: ContentItemId
  ): Promise<TrackAttempt | null>;

  /**
   * Find attempts by track, optionally filtered by user.
   * Returns attempts sorted by startedAt descending.
   */
  findByTrack(
    tenantId: TenantId,
    track: Track,
    options?: {
      userId?: string;
      limit?: number;
    }
  ): Promise<readonly TrackAttempt[]>;

  /**
   * Save a legacy problem-based attempt
   */
  save(attempt: LegacyAttempt): Promise<LegacyAttempt>;

  /**
   * Create a new track-based attempt
   */
  createTrackAttempt(params: CreateTrackAttemptParams): Promise<TrackAttempt>;

  /**
   * Update any attempt (legacy or track-based)
   */
  update(attempt: Attempt): Promise<Attempt>;
}
