import { eq, and } from 'drizzle-orm';
import type { SkillRepo } from '@scaffold/core/ports';
import type { SkillState, SkillMatrix } from '@scaffold/core/entities';
import type { TenantId } from '@scaffold/core/entities';
import type { PatternId } from '@scaffold/core/entities';
import type { RungLevel } from '@scaffold/core/entities';
import type { DbClient } from '../client.js';
import { skills } from '../schema.js';

export function createSkillRepo(db: DbClient): SkillRepo {
  return {
    async findByUserAndPattern(
      tenantId: TenantId,
      userId: string,
      pattern: PatternId,
      rung: RungLevel
    ): Promise<SkillState | null> {
      const result = await db.query.skills.findFirst({
        where: and(
          eq(skills.tenantId, tenantId),
          eq(skills.userId, userId),
          eq(skills.pattern, pattern),
          eq(skills.rung, rung)
        ),
      });

      return result ? mapToSkillState(result) : null;
    },

    async findAllByUser(
      tenantId: TenantId,
      userId: string
    ): Promise<readonly SkillState[]> {
      const results = await db.query.skills.findMany({
        where: and(eq(skills.tenantId, tenantId), eq(skills.userId, userId)),
      });

      return results.map(mapToSkillState);
    },

    async getSkillMatrix(
      tenantId: TenantId,
      userId: string
    ): Promise<SkillMatrix> {
      const userSkills = await this.findAllByUser(tenantId, userId);
      return {
        userId,
        skills: userSkills,
      };
    },

    async save(skill: SkillState): Promise<SkillState> {
      await db.insert(skills).values({
        id: skill.id,
        tenantId: skill.tenantId,
        userId: skill.userId,
        pattern: skill.pattern,
        rung: skill.rung,
        score: skill.score,
        attemptsCount: skill.attemptsCount,
        lastAttemptAt: skill.lastAttemptAt,
        unlockedAt: skill.unlockedAt,
        updatedAt: skill.updatedAt,
      });

      return skill;
    },

    async update(skill: SkillState): Promise<SkillState> {
      await db
        .update(skills)
        .set({
          score: skill.score,
          attemptsCount: skill.attemptsCount,
          lastAttemptAt: skill.lastAttemptAt,
          updatedAt: skill.updatedAt,
        })
        .where(eq(skills.id, skill.id));

      return skill;
    },

    async upsert(skill: SkillState): Promise<SkillState> {
      const existing = await this.findByUserAndPattern(
        skill.tenantId,
        skill.userId,
        skill.pattern,
        skill.rung
      );

      if (existing) {
        return this.update({ ...skill, id: existing.id });
      }

      return this.save(skill);
    },
  };
}

function mapToSkillState(row: typeof skills.$inferSelect): SkillState {
  return {
    id: row.id,
    tenantId: row.tenantId,
    userId: row.userId,
    pattern: row.pattern as PatternId,
    rung: row.rung as RungLevel,
    score: row.score,
    attemptsCount: row.attemptsCount,
    lastAttemptAt: row.lastAttemptAt,
    unlockedAt: row.unlockedAt,
    updatedAt: row.updatedAt,
  };
}
