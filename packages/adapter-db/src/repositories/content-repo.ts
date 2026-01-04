import { eq, and, sql } from 'drizzle-orm';
import type { ContentRepo } from '@scaffold/core/ports';
import type { Problem, ProblemId } from '@scaffold/core/entities';
import type { TenantId } from '@scaffold/core/entities';
import type { PatternId } from '@scaffold/core/entities';
import type { RungLevel } from '@scaffold/core/entities';
import type { DbClient } from '../client.js';
import { problems } from '../schema.js';

export function createContentRepo(db: DbClient): ContentRepo {
  return {
    async findById(tenantId: TenantId, id: ProblemId): Promise<Problem | null> {
      const result = await db.query.problems.findFirst({
        where: and(eq(problems.tenantId, tenantId), eq(problems.id, id)),
      });

      return result ? mapToProblem(result) : null;
    },

    async findByPatternAndRung(
      tenantId: TenantId,
      pattern: PatternId,
      rung: RungLevel
    ): Promise<readonly Problem[]> {
      const results = await db.query.problems.findMany({
        where: and(
          eq(problems.tenantId, tenantId),
          eq(problems.pattern, pattern),
          eq(problems.rung, rung)
        ),
      });

      return results.map(mapToProblem);
    },

    async findAll(
      tenantId: TenantId,
      options?: {
        pattern?: PatternId;
        rung?: RungLevel;
        limit?: number;
        offset?: number;
      }
    ): Promise<readonly Problem[]> {
      const conditions = [eq(problems.tenantId, tenantId)];

      if (options?.pattern) {
        conditions.push(eq(problems.pattern, options.pattern));
      }
      if (options?.rung) {
        conditions.push(eq(problems.rung, options.rung));
      }

      const results = await db.query.problems.findMany({
        where: and(...conditions),
        limit: options?.limit ?? 100,
        offset: options?.offset ?? 0,
      });

      return results.map(mapToProblem);
    },

    async countByPatternAndRung(
      tenantId: TenantId,
      pattern: PatternId,
      rung: RungLevel
    ): Promise<number> {
      const result = await db
        .select({ count: sql<number>`count(*)` })
        .from(problems)
        .where(
          and(
            eq(problems.tenantId, tenantId),
            eq(problems.pattern, pattern),
            eq(problems.rung, rung)
          )
        );

      return Number(result[0]?.count ?? 0);
    },
  };
}

function mapToProblem(row: typeof problems.$inferSelect): Problem {
  return {
    id: row.id,
    tenantId: row.tenantId,
    title: row.title,
    statement: row.statement,
    pattern: row.pattern as PatternId,
    rung: row.rung as RungLevel,
    targetComplexity: row.targetComplexity,
    testCases: (row.testCases ?? []).map((tc: any) => ({
      input: tc.input,
      expectedOutput: tc.expectedOutput,
      isHidden: tc.isHidden,
      explanation: tc.explanation,
    })),
    hints: (row.hints ?? []) as string[],
    createdAt: row.createdAt,
  };
}
