/**
 * In-Memory Debug Track Repository Implementations
 *
 * Uses seed data from @scaffold/core for local development without PostgreSQL.
 * Follows the pattern from in-memory-repos.ts.
 */

import type {
  DebugScenarioRepo,
  DebugAttemptRepo,
  DebugScenarioFilter,
  DebugAttemptFilter,
} from '@scaffold/core/debug-track';
import type {
  DebugScenario,
  DebugAttempt,
  GateSubmission,
} from '@scaffold/core/debug-track';
import type { TenantId } from '@scaffold/core/entities';
import { getAllSeedDebugScenarios } from '@scaffold/core/data';

// In-memory storage with persistence across hot reloads
declare global {
  // eslint-disable-next-line no-var
  var __debugScenariosStore: DebugScenario[] | undefined;
  // eslint-disable-next-line no-var
  var __debugAttemptsStore: Map<string, DebugAttempt> | undefined;
}

// Initialize scenarios from seed data
const debugScenarios = globalThis.__debugScenariosStore ?? getAllSeedDebugScenarios();
globalThis.__debugScenariosStore = debugScenarios;

const debugAttempts = globalThis.__debugAttemptsStore ?? new Map<string, DebugAttempt>();
globalThis.__debugAttemptsStore = debugAttempts;

/**
 * In-Memory Debug Scenario Repository
 */
export const inMemoryDebugScenarioRepo: DebugScenarioRepo = {
  async findById(id: string): Promise<DebugScenario | null> {
    const scenario = debugScenarios.find((s) => s.id === id);
    return scenario ?? null;
  },

  async findAll(filter?: DebugScenarioFilter): Promise<readonly DebugScenario[]> {
    let results = [...debugScenarios];

    if (filter?.category) {
      results = results.filter((s) => s.category === filter.category);
    }
    if (filter?.difficulty) {
      results = results.filter((s) => s.difficulty === filter.difficulty);
    }
    if (filter?.tags && filter.tags.length > 0) {
      results = results.filter((s) =>
        filter.tags!.some((tag) => s.tags.includes(tag))
      );
    }

    const offset = filter?.offset ?? 0;
    const limit = filter?.limit ?? 100;
    return results.slice(offset, offset + limit);
  },

  async count(filter?: DebugScenarioFilter): Promise<number> {
    const results = await this.findAll(filter);
    return results.length;
  },
};

/**
 * In-Memory Debug Attempt Repository
 */
export const inMemoryDebugAttemptRepo: DebugAttemptRepo = {
  async save(attempt: DebugAttempt): Promise<DebugAttempt> {
    debugAttempts.set(attempt.attemptId, { ...attempt });
    return attempt;
  },

  async findById(
    tenantId: TenantId,
    attemptId: string
  ): Promise<DebugAttempt | null> {
    const attempt = debugAttempts.get(attemptId);
    if (!attempt || attempt.tenantId !== tenantId) return null;
    return { ...attempt };
  },

  async update(attempt: DebugAttempt): Promise<DebugAttempt> {
    debugAttempts.set(attempt.attemptId, { ...attempt });
    return attempt;
  },

  async appendGateSubmission(
    tenantId: TenantId,
    attemptId: string,
    submission: GateSubmission
  ): Promise<DebugAttempt> {
    const attempt = debugAttempts.get(attemptId);
    if (!attempt || attempt.tenantId !== tenantId) {
      throw new Error(`Attempt not found: ${attemptId}`);
    }

    const updated: DebugAttempt = {
      ...attempt,
      gateHistory: [...attempt.gateHistory, submission],
    };

    debugAttempts.set(attemptId, updated);
    return updated;
  },

  async findActiveByUser(
    tenantId: TenantId,
    userId: string
  ): Promise<DebugAttempt | null> {
    for (const attempt of debugAttempts.values()) {
      if (
        attempt.tenantId === tenantId &&
        attempt.userId === userId &&
        attempt.status === 'IN_PROGRESS'
      ) {
        return { ...attempt };
      }
    }
    return null;
  },

  async findByUser(
    tenantId: TenantId,
    userId: string,
    filter?: DebugAttemptFilter
  ): Promise<readonly DebugAttempt[]> {
    let results = Array.from(debugAttempts.values()).filter(
      (a) => a.tenantId === tenantId && a.userId === userId
    );

    if (filter?.scenarioId) {
      results = results.filter((a) => a.scenarioId === filter.scenarioId);
    }
    if (filter?.status) {
      results = results.filter((a) => a.status === filter.status);
    }

    // Sort by startedAt descending
    results.sort((a, b) => b.startedAt.getTime() - a.startedAt.getTime());

    const offset = filter?.offset ?? 0;
    const limit = filter?.limit ?? 100;
    return results.slice(offset, offset + limit);
  },
};
