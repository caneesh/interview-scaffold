/**
 * Debug Scenario Repository Adapter
 *
 * Implements DebugScenarioRepo port using Drizzle ORM.
 */

import { eq, and, sql } from 'drizzle-orm';
import type { DebugScenarioRepo, DebugScenarioFilter } from '@scaffold/core/debug-track';
import type {
  DebugScenario,
  CodeArtifact,
} from '@scaffold/core/debug-track';
import type {
  DebugPatternCategory,
  DebugDifficulty,
} from '@scaffold/core/debug-track';
import type { DbClient } from '../client.js';
import { debugScenarios } from '../schema.js';

export function createDebugScenarioRepo(db: DbClient): DebugScenarioRepo {
  return {
    async findById(id: string): Promise<DebugScenario | null> {
      const result = await db.query.debugScenarios.findFirst({
        where: eq(debugScenarios.id, id),
      });

      if (!result) return null;

      return mapToDebugScenario(result);
    },

    async findAll(filter?: DebugScenarioFilter): Promise<readonly DebugScenario[]> {
      const conditions = buildFilterConditions(filter);

      const results = await db.query.debugScenarios.findMany({
        where: conditions.length > 0 ? and(...conditions) : undefined,
        orderBy: [debugScenarios.createdAt],
        limit: filter?.limit ?? 100,
        offset: filter?.offset ?? 0,
      });

      return results.map(mapToDebugScenario);
    },

    async count(filter?: DebugScenarioFilter): Promise<number> {
      const conditions = buildFilterConditions(filter);

      const result = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(debugScenarios)
        .where(conditions.length > 0 ? and(...conditions) : undefined);

      return result[0]?.count ?? 0;
    },
  };
}

function buildFilterConditions(filter?: DebugScenarioFilter) {
  const conditions = [];

  if (filter?.category) {
    conditions.push(eq(debugScenarios.category, filter.category));
  }
  if (filter?.difficulty) {
    conditions.push(eq(debugScenarios.difficulty, filter.difficulty));
  }
  // Note: tags filter would require JSON array contains query
  // which varies by database. Skipping for now.

  return conditions;
}

function mapToDebugScenario(
  row: typeof debugScenarios.$inferSelect
): DebugScenario {
  return {
    id: row.id,
    category: row.category as DebugPatternCategory,
    patternKey: row.patternKey,
    difficulty: row.difficulty as DebugDifficulty,
    symptomDescription: row.symptomDescription,
    codeArtifacts: (row.codeArtifacts as unknown as CodeArtifact[]) ?? [],
    expectedFindings: (row.expectedFindings as string[]) ?? [],
    fixStrategies: (row.fixStrategies as string[]) ?? [],
    regressionExpectation: row.regressionExpectation,
    hintLadder: (row.hintLadder as string[]) ?? [],
    tags: (row.tags as string[]) ?? [],
    createdAt: row.createdAt,
  };
}
