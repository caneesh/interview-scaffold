/**
 * In-Memory Bug Hunt Repository
 *
 * Stores bug hunt items and attempts in memory.
 * Seed data is loaded from @scaffold/core.
 */

import type { BugHuntRepo } from '@scaffold/core/ports';
import type { BugHuntItem, BugHuntAttempt } from '@scaffold/core';
import { getAllBugHuntItems } from '@scaffold/core';

// In-memory storage
const itemsStore = new Map<string, BugHuntItem>();
const attemptsStore = new Map<string, BugHuntAttempt>();

// Initialize with seed data
function initializeSeedData(tenantId: string) {
  const seedItems = getAllBugHuntItems();
  const now = new Date();

  for (const item of seedItems) {
    const fullItem: BugHuntItem = {
      ...item,
      tenantId,
      createdAt: now,
    };
    itemsStore.set(`${tenantId}:${item.id}`, fullItem);
  }
}

// Initialize seed data for demo tenant
initializeSeedData('demo');

export function createInMemoryBugHuntRepo(): BugHuntRepo {
  return {
    async listItems(tenantId) {
      // Ensure seed data exists for tenant
      const hasItems = Array.from(itemsStore.keys()).some(k => k.startsWith(`${tenantId}:`));
      if (!hasItems) {
        initializeSeedData(tenantId);
      }

      return Array.from(itemsStore.values()).filter(item => item.tenantId === tenantId);
    },

    async findItemById(tenantId, itemId) {
      return itemsStore.get(`${tenantId}:${itemId}`) ?? null;
    },

    async listItemsByPattern(tenantId, pattern) {
      const items = await this.listItems(tenantId);
      return items.filter(item => item.pattern === pattern);
    },

    async createAttempt(attempt) {
      attemptsStore.set(`${attempt.tenantId}:${attempt.id}`, attempt);
      return attempt;
    },

    async findAttemptById(tenantId, attemptId) {
      return attemptsStore.get(`${tenantId}:${attemptId}`) ?? null;
    },

    async updateAttempt(attempt) {
      attemptsStore.set(`${attempt.tenantId}:${attempt.id}`, attempt);
      return attempt;
    },

    async listAttemptsByUser(tenantId, userId) {
      return Array.from(attemptsStore.values()).filter(
        attempt => attempt.tenantId === tenantId && attempt.userId === userId
      );
    },

    async countUserAttemptsForItem(tenantId, userId, itemId) {
      const attempts = await this.listAttemptsByUser(tenantId, userId);
      return attempts.filter(a => a.itemId === itemId).length;
    },
  };
}

// Singleton instance
export const bugHuntRepo = createInMemoryBugHuntRepo();
