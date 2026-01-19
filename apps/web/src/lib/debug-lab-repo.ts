/**
 * In-Memory Debug Lab Repository
 *
 * Stores debug lab items and attempts in memory.
 * Seed data is loaded from @scaffold/core.
 *
 * Uses globalThis to persist data across Next.js hot reloads in dev mode.
 */

import type { DebugLabRepo } from '@scaffold/core/ports';
import type { DebugLabItem, DebugLabAttempt, DefectCategory, DebugLabDifficulty } from '@scaffold/core';
import { getAllDebugLabItems } from '@scaffold/core';

// Extend globalThis to include our stores
declare global {
  // eslint-disable-next-line no-var
  var __debugLabItemsStore: Map<string, DebugLabItem> | undefined;
  // eslint-disable-next-line no-var
  var __debugLabAttemptsStore: Map<string, DebugLabAttempt> | undefined;
}

// In-memory storage - use globalThis to persist across hot reloads
const itemsStore = globalThis.__debugLabItemsStore ?? new Map<string, DebugLabItem>();
const attemptsStore = globalThis.__debugLabAttemptsStore ?? new Map<string, DebugLabAttempt>();

// Store references in globalThis for persistence
globalThis.__debugLabItemsStore = itemsStore;
globalThis.__debugLabAttemptsStore = attemptsStore;

// Initialize with seed data
function initializeSeedData(tenantId: string) {
  const seedItems = getAllDebugLabItems();
  const now = new Date();

  for (const item of seedItems) {
    const fullItem: DebugLabItem = {
      ...item,
      tenantId,
      createdAt: now,
    };
    itemsStore.set(`${tenantId}:${item.id}`, fullItem);
  }
}

// Initialize seed data for demo tenant (only if not already initialized)
if (!Array.from(itemsStore.keys()).some(k => k.startsWith('demo:'))) {
  initializeSeedData('demo');
}
// Also init for the UUID tenant
if (!Array.from(itemsStore.keys()).some(k => k.startsWith('00000000-0000-0000-0000-000000000001:'))) {
  initializeSeedData('00000000-0000-0000-0000-000000000001');
}

export function createInMemoryDebugLabRepo(): DebugLabRepo {
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

    async listItemsByCategory(tenantId, category: DefectCategory) {
      const items = await this.listItems(tenantId);
      return items.filter(item => item.defectCategory === category);
    },

    async listItemsByDifficulty(tenantId, difficulty: DebugLabDifficulty) {
      const items = await this.listItems(tenantId);
      return items.filter(item => item.difficulty === difficulty);
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

    async getNextItem(tenantId, userId) {
      const items = await this.listItems(tenantId);
      const attempts = await this.listAttemptsByUser(tenantId, userId);

      // Find items the user hasn't passed yet
      const passedItemIds = new Set(
        attempts
          .filter(a => a.status === 'PASSED')
          .map(a => a.itemId)
      );

      // Sort by difficulty: EASY first, then MEDIUM, HARD, EXPERT
      const difficultyOrder = ['EASY', 'MEDIUM', 'HARD', 'EXPERT'];
      const availableItems = items
        .filter(item => !passedItemIds.has(item.id))
        .sort((a, b) => difficultyOrder.indexOf(a.difficulty) - difficultyOrder.indexOf(b.difficulty));

      return availableItems[0] ?? null;
    },
  };
}

// Singleton instance
export const debugLabRepo = createInMemoryDebugLabRepo();
