import type { Problem, ProblemId } from '../entities/problem.js';
import type { TenantId } from '../entities/tenant.js';
import type { PatternId } from '../entities/pattern.js';
import type { RungLevel } from '../entities/rung.js';

/**
 * ContentRepo - port for problem content access
 */
export interface ContentRepo {
  findById(tenantId: TenantId, id: ProblemId): Promise<Problem | null>;

  findByPatternAndRung(
    tenantId: TenantId,
    pattern: PatternId,
    rung: RungLevel
  ): Promise<readonly Problem[]>;

  findAll(
    tenantId: TenantId,
    options?: {
      pattern?: PatternId;
      rung?: RungLevel;
      limit?: number;
      offset?: number;
    }
  ): Promise<readonly Problem[]>;

  countByPatternAndRung(
    tenantId: TenantId,
    pattern: PatternId,
    rung: RungLevel
  ): Promise<number>;
}
