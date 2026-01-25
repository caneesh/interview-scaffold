/**
 * AttemptContext - unified accessor for attempt data regardless of type
 *
 * This provides a consistent interface for loading attempt context needed
 * for submissions, evaluations, and coaching, regardless of whether the
 * attempt is a legacy problem-based attempt or a track-based content bank attempt.
 */

import type { Attempt, LegacyAttempt, TrackAttempt, isLegacyAttempt } from '../entities/attempt.js';
import type { Problem } from '../entities/problem.js';
import type { ContentItem, ContentVersion } from '../entities/content-item.js';
import type { Track } from '../entities/track.js';
import type { TenantId } from '../entities/tenant.js';
import type { AttemptRepo } from './attempt-repo.js';
import type { ContentRepo } from './content-repo.js';
import type { ContentBankRepoPort } from './content-bank-repo.js';

/**
 * Unified attempt context - provides all data needed for submissions/evaluation
 */
export interface AttemptContext {
  /** The attempt itself */
  readonly attempt: Attempt;

  /** Track type (derived from attempt or content) */
  readonly track: Track;

  /** User ID from the attempt */
  readonly userId: string;

  /** Tenant ID from the attempt */
  readonly tenantId: TenantId;

  /**
   * Content source - either a legacy problem or content item with version.
   * Exactly one will be set based on attempt type.
   */
  readonly content:
    | { type: 'problem'; problem: Problem }
    | { type: 'content_item'; item: ContentItem; version: ContentVersion };
}

/**
 * Error thrown when attempt context cannot be loaded
 */
export class AttemptContextError extends Error {
  constructor(
    public readonly code: 'ATTEMPT_NOT_FOUND' | 'CONTENT_NOT_FOUND' | 'FORBIDDEN',
    message: string
  ) {
    super(message);
    this.name = 'AttemptContextError';
  }
}

/**
 * Options for loading attempt context
 */
export interface LoadAttemptContextOptions {
  /** If provided, verifies the attempt belongs to this user */
  userId?: string;
}

/**
 * Factory function to create the loadAttemptContext accessor.
 *
 * This accessor handles both legacy problem-based attempts and
 * track-based content bank attempts transparently.
 */
export function createAttemptContextLoader(deps: {
  attemptRepo: AttemptRepo;
  contentRepo: ContentRepo;
  contentBankRepo: ContentBankRepoPort;
}) {
  const { attemptRepo, contentRepo, contentBankRepo } = deps;

  /**
   * Load complete attempt context for an attempt ID.
   *
   * @param tenantId - Tenant ID for the attempt
   * @param attemptId - The attempt ID to load
   * @param options - Optional configuration (e.g., user verification)
   * @returns AttemptContext with all data needed for submissions/evaluation
   * @throws AttemptContextError if attempt or content not found, or if user mismatch
   */
  async function loadAttemptContext(
    tenantId: TenantId,
    attemptId: string,
    options?: LoadAttemptContextOptions
  ): Promise<AttemptContext> {
    // Load the attempt
    const attempt = await attemptRepo.findById(tenantId, attemptId);

    if (!attempt) {
      throw new AttemptContextError('ATTEMPT_NOT_FOUND', 'Attempt not found');
    }

    // Verify user ownership if requested
    if (options?.userId && attempt.userId !== options.userId) {
      throw new AttemptContextError('FORBIDDEN', 'Attempt does not belong to user');
    }

    // Determine if this is a legacy or track attempt and load content accordingly
    if (isLegacyAttemptType(attempt)) {
      // Legacy problem-based attempt
      const problem = await contentRepo.findById(tenantId, attempt.problemId);

      if (!problem) {
        throw new AttemptContextError('CONTENT_NOT_FOUND', 'Problem not found');
      }

      return {
        attempt,
        track: 'coding_interview', // Legacy attempts are always coding interview
        userId: attempt.userId,
        tenantId: attempt.tenantId,
        content: { type: 'problem', problem },
      };
    } else {
      // Track-based content bank attempt
      const trackAttempt = attempt as TrackAttempt;

      const item = await contentBankRepo.getContentItem(trackAttempt.contentItemId);
      if (!item) {
        throw new AttemptContextError('CONTENT_NOT_FOUND', 'Content item not found');
      }

      // Get the version - either the specific one from attempt or latest published
      const version = trackAttempt.contentVersionId
        ? await contentBankRepo.getContentVersion(trackAttempt.contentVersionId)
        : await contentBankRepo.getPublishedContentVersion(trackAttempt.contentItemId);

      if (!version) {
        throw new AttemptContextError(
          'CONTENT_NOT_FOUND',
          trackAttempt.contentVersionId
            ? 'Content version not found'
            : 'No published version available'
        );
      }

      return {
        attempt,
        track: trackAttempt.track,
        userId: attempt.userId,
        tenantId: attempt.tenantId,
        content: { type: 'content_item', item, version },
      };
    }
  }

  return loadAttemptContext;
}

/**
 * Type guard to check if an attempt is a legacy attempt
 * (has problemId, no contentItemId)
 */
function isLegacyAttemptType(attempt: Attempt): attempt is LegacyAttempt {
  return 'problemId' in attempt && attempt.problemId !== undefined;
}

/**
 * Type alias for the loadAttemptContext function
 */
export type LoadAttemptContextFn = ReturnType<typeof createAttemptContextLoader>;
