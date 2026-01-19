/**
 * Debug Lab Repository Port
 *
 * Abstracts storage for debug lab items and attempts.
 */

import type { TenantId } from '../entities/tenant.js';
import type { DebugLabItem, DebugLabAttempt, DefectCategory, DebugLabDifficulty } from '../entities/debug-lab.js';

export interface DebugLabRepo {
  /**
   * Get all debug lab items for a tenant
   */
  listItems(tenantId: TenantId): Promise<DebugLabItem[]>;

  /**
   * Get a specific debug lab item
   */
  findItemById(tenantId: TenantId, itemId: string): Promise<DebugLabItem | null>;

  /**
   * Get debug lab items filtered by defect category
   */
  listItemsByCategory(tenantId: TenantId, category: DefectCategory): Promise<DebugLabItem[]>;

  /**
   * Get debug lab items filtered by difficulty
   */
  listItemsByDifficulty(tenantId: TenantId, difficulty: DebugLabDifficulty): Promise<DebugLabItem[]>;

  /**
   * Create a new debug lab attempt
   */
  createAttempt(attempt: DebugLabAttempt): Promise<DebugLabAttempt>;

  /**
   * Get a specific debug lab attempt
   */
  findAttemptById(tenantId: TenantId, attemptId: string): Promise<DebugLabAttempt | null>;

  /**
   * Update a debug lab attempt
   */
  updateAttempt(attempt: DebugLabAttempt): Promise<DebugLabAttempt>;

  /**
   * List attempts for a user
   */
  listAttemptsByUser(tenantId: TenantId, userId: string): Promise<DebugLabAttempt[]>;

  /**
   * Count attempts for a specific item by a user
   */
  countUserAttemptsForItem(tenantId: TenantId, userId: string, itemId: string): Promise<number>;

  /**
   * Get the next recommended item for a user (not yet completed)
   */
  getNextItem(tenantId: TenantId, userId: string): Promise<DebugLabItem | null>;
}
