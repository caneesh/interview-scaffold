/**
 * Bug Hunt Repository Port
 *
 * Abstracts storage for bug hunt items and attempts.
 */

import type { TenantId } from '../entities/tenant.js';
import type { BugHuntItem, BugHuntAttempt } from '../entities/bug-hunt.js';

export interface BugHuntRepo {
  /**
   * Get all bug hunt items for a tenant
   */
  listItems(tenantId: TenantId): Promise<BugHuntItem[]>;

  /**
   * Get a specific bug hunt item
   */
  findItemById(tenantId: TenantId, itemId: string): Promise<BugHuntItem | null>;

  /**
   * Get bug hunt items filtered by pattern
   */
  listItemsByPattern(tenantId: TenantId, pattern: string): Promise<BugHuntItem[]>;

  /**
   * Create a new bug hunt attempt
   */
  createAttempt(attempt: BugHuntAttempt): Promise<BugHuntAttempt>;

  /**
   * Get a specific bug hunt attempt
   */
  findAttemptById(tenantId: TenantId, attemptId: string): Promise<BugHuntAttempt | null>;

  /**
   * Update a bug hunt attempt
   */
  updateAttempt(attempt: BugHuntAttempt): Promise<BugHuntAttempt>;

  /**
   * List attempts for a user
   */
  listAttemptsByUser(tenantId: TenantId, userId: string): Promise<BugHuntAttempt[]>;

  /**
   * Count attempts for a specific item by a user
   */
  countUserAttemptsForItem(tenantId: TenantId, userId: string, itemId: string): Promise<number>;
}
