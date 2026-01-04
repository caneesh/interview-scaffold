import type { SkillState, SkillMatrix } from '../entities/skill-state.js';
import type { TenantId } from '../entities/tenant.js';
import type { PatternId } from '../entities/pattern.js';
import type { RungLevel } from '../entities/rung.js';

/**
 * SkillRepo - port for skill state persistence
 */
export interface SkillRepo {
  findByUserAndPattern(
    tenantId: TenantId,
    userId: string,
    pattern: PatternId,
    rung: RungLevel
  ): Promise<SkillState | null>;

  findAllByUser(tenantId: TenantId, userId: string): Promise<readonly SkillState[]>;

  getSkillMatrix(tenantId: TenantId, userId: string): Promise<SkillMatrix>;

  save(skill: SkillState): Promise<SkillState>;

  update(skill: SkillState): Promise<SkillState>;

  upsert(skill: SkillState): Promise<SkillState>;
}
