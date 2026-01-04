import { eq, and, desc } from 'drizzle-orm';
import type { AttemptRepo } from '@scaffold/core/ports';
import type { Attempt, AttemptId } from '@scaffold/core/entities';
import type { TenantId } from '@scaffold/core/entities';
import type { PatternId } from '@scaffold/core/entities';
import type { RungLevel } from '@scaffold/core/entities';
import type { DbClient } from '../client.js';
import { attempts, steps } from '../schema.js';

export function createAttemptRepo(db: DbClient): AttemptRepo {
  return {
    async findById(tenantId: TenantId, id: AttemptId): Promise<Attempt | null> {
      const result = await db.query.attempts.findFirst({
        where: and(eq(attempts.tenantId, tenantId), eq(attempts.id, id)),
      });

      if (!result) return null;

      const attemptSteps = await db.query.steps.findMany({
        where: eq(steps.attemptId, id),
        orderBy: [steps.startedAt],
      });

      return mapToAttempt(result, attemptSteps);
    },

    async findByUser(
      tenantId: TenantId,
      userId: string,
      options?: {
        pattern?: PatternId;
        rung?: RungLevel;
        limit?: number;
      }
    ): Promise<readonly Attempt[]> {
      const conditions = [
        eq(attempts.tenantId, tenantId),
        eq(attempts.userId, userId),
      ];

      if (options?.pattern) {
        conditions.push(eq(attempts.pattern, options.pattern));
      }
      if (options?.rung) {
        conditions.push(eq(attempts.rung, options.rung));
      }

      const results = await db.query.attempts.findMany({
        where: and(...conditions),
        orderBy: [desc(attempts.startedAt)],
        limit: options?.limit ?? 100,
      });

      return Promise.all(
        results.map(async (r) => {
          const attemptSteps = await db.query.steps.findMany({
            where: eq(steps.attemptId, r.id),
            orderBy: [steps.startedAt],
          });
          return mapToAttempt(r, attemptSteps);
        })
      );
    },

    async findActive(tenantId: TenantId, userId: string): Promise<Attempt | null> {
      const activeStates = ['THINKING_GATE', 'CODING', 'REFLECTION', 'HINT'];

      const result = await db.query.attempts.findFirst({
        where: and(
          eq(attempts.tenantId, tenantId),
          eq(attempts.userId, userId)
        ),
        orderBy: [desc(attempts.startedAt)],
      });

      if (!result || !activeStates.includes(result.state)) {
        return null;
      }

      const attemptSteps = await db.query.steps.findMany({
        where: eq(steps.attemptId, result.id),
        orderBy: [steps.startedAt],
      });

      return mapToAttempt(result, attemptSteps);
    },

    async findCompletedByPatternRung(
      tenantId: TenantId,
      userId: string,
      pattern: PatternId,
      rung: RungLevel,
      limit: number
    ): Promise<readonly Attempt[]> {
      const results = await db.query.attempts.findMany({
        where: and(
          eq(attempts.tenantId, tenantId),
          eq(attempts.userId, userId),
          eq(attempts.pattern, pattern),
          eq(attempts.rung, rung),
          eq(attempts.state, 'COMPLETED')
        ),
        orderBy: [desc(attempts.completedAt)],
        limit,
      });

      return Promise.all(
        results.map(async (r) => {
          const attemptSteps = await db.query.steps.findMany({
            where: eq(steps.attemptId, r.id),
            orderBy: [steps.startedAt],
          });
          return mapToAttempt(r, attemptSteps);
        })
      );
    },

    async save(attempt: Attempt): Promise<Attempt> {
      await db.insert(attempts).values({
        id: attempt.id,
        tenantId: attempt.tenantId,
        userId: attempt.userId,
        problemId: attempt.problemId,
        pattern: attempt.pattern,
        rung: attempt.rung,
        state: attempt.state,
        hintsUsed: attempt.hintsUsed as string[],
        codeSubmissions: attempt.codeSubmissions,
        score: attempt.score,
        startedAt: attempt.startedAt,
        completedAt: attempt.completedAt,
      });

      return attempt;
    },

    async update(attempt: Attempt): Promise<Attempt> {
      await db
        .update(attempts)
        .set({
          state: attempt.state,
          hintsUsed: attempt.hintsUsed as string[],
          codeSubmissions: attempt.codeSubmissions,
          score: attempt.score,
          completedAt: attempt.completedAt,
        })
        .where(eq(attempts.id, attempt.id));

      // Insert any new steps
      for (const step of attempt.steps) {
        const existing = await db.query.steps.findFirst({
          where: eq(steps.id, step.id),
        });
        if (!existing) {
          await db.insert(steps).values({
            id: step.id,
            attemptId: step.attemptId,
            type: step.type,
            result: step.result,
            data: step.data,
            startedAt: step.startedAt,
            completedAt: step.completedAt,
          });
        }
      }

      return attempt;
    },
  };
}

function mapToAttempt(row: typeof attempts.$inferSelect, stepRows: (typeof steps.$inferSelect)[]): Attempt {
  return {
    id: row.id,
    tenantId: row.tenantId,
    userId: row.userId,
    problemId: row.problemId,
    pattern: row.pattern as PatternId,
    rung: row.rung as RungLevel,
    state: row.state as Attempt['state'],
    steps: stepRows.map((s) => ({
      id: s.id,
      attemptId: s.attemptId,
      type: s.type as any,
      result: s.result as any,
      data: s.data as any,
      startedAt: s.startedAt,
      completedAt: s.completedAt,
    })),
    hintsUsed: (row.hintsUsed ?? []) as Attempt['hintsUsed'],
    codeSubmissions: row.codeSubmissions,
    score: row.score as Attempt['score'],
    startedAt: row.startedAt,
    completedAt: row.completedAt,
  };
}
