import type { SkillState, SkillMatrix } from '../entities/skill-state.js';
import type { TenantId } from '../entities/tenant.js';
import type { PatternId } from '../entities/pattern.js';
import type { RungLevel } from '../entities/rung.js';

/**
 * Result of an idempotent skill update
 */
export interface IdempotentUpdateResult {
  readonly skill: SkillState;
  readonly wasApplied: boolean; // true if update was applied, false if already applied
}

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

  /**
   * Idempotent skill update - only applies update if attemptId hasn't been applied yet
   * Returns { skill, wasApplied: true } if update was applied
   * Returns { skill, wasApplied: false } if already applied (no-op)
   */
  updateIfNotApplied(
    skill: SkillState,
    attemptId: string
  ): Promise<IdempotentUpdateResult>;
}
