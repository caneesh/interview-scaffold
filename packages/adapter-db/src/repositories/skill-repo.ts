import { eq, and, ne, or, isNull } from 'drizzle-orm';
import type { SkillRepo, IdempotentUpdateResult } from '@scaffold/core/ports';
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
        lastAppliedAttemptId: skill.lastAppliedAttemptId,
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
          lastAppliedAttemptId: skill.lastAppliedAttemptId,
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

    async updateIfNotApplied(
      skill: SkillState,
      attemptId: string
    ): Promise<IdempotentUpdateResult> {
      // Check if this attempt has already been applied
      const existing = await this.findByUserAndPattern(
        skill.tenantId,
        skill.userId,
        skill.pattern,
        skill.rung
      );

      // If the attempt was already applied, return no-op
      if (existing?.lastAppliedAttemptId === attemptId) {
        return { skill: existing, wasApplied: false };
      }

      // Prepare skill with the new attempt ID
      const updatedSkill: SkillState = {
        ...skill,
        lastAppliedAttemptId: attemptId,
      };

      if (existing) {
        // Update with idempotency check using conditional update
        const result = await db
          .update(skills)
          .set({
            score: updatedSkill.score,
            attemptsCount: updatedSkill.attemptsCount,
            lastAttemptAt: updatedSkill.lastAttemptAt,
            updatedAt: updatedSkill.updatedAt,
            lastAppliedAttemptId: attemptId,
          })
          .where(
            and(
              eq(skills.id, existing.id),
              // Only update if lastAppliedAttemptId is different or null
              or(
                isNull(skills.lastAppliedAttemptId),
                ne(skills.lastAppliedAttemptId, attemptId)
              )
            )
          )
          .returning();

        if (result.length === 0) {
          // Race condition: another request already applied this attempt
          const current = await this.findByUserAndPattern(
            skill.tenantId,
            skill.userId,
            skill.pattern,
            skill.rung
          );
          return { skill: current ?? existing, wasApplied: false };
        }

        return { skill: mapToSkillState(result[0]!), wasApplied: true };
      }

      // Insert new skill with attempt ID
      await this.save({ ...updatedSkill, id: skill.id });
      return { skill: updatedSkill, wasApplied: true };
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
    lastAppliedAttemptId: row.lastAppliedAttemptId,
  };
}
