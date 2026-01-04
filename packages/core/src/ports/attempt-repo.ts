import type { Attempt, AttemptId } from '../entities/attempt.js';
import type { TenantId } from '../entities/tenant.js';
import type { PatternId } from '../entities/pattern.js';
import type { RungLevel } from '../entities/rung.js';

/**
 * AttemptRepo - port for attempt persistence
 */
export interface AttemptRepo {
  findById(tenantId: TenantId, id: AttemptId): Promise<Attempt | null>;

  findByUser(
    tenantId: TenantId,
    userId: string,
    options?: {
      pattern?: PatternId;
      rung?: RungLevel;
      limit?: number;
    }
  ): Promise<readonly Attempt[]>;

  /**
   * Find last N completed attempts for a specific pattern+rung
   * Used for mastery calculation (e.g., last 5 attempts)
   * Returns attempts sorted by completedAt descending (most recent first)
   */
  findCompletedByPatternRung(
    tenantId: TenantId,
    userId: string,
    pattern: PatternId,
    rung: RungLevel,
    limit: number
  ): Promise<readonly Attempt[]>;

  findActive(tenantId: TenantId, userId: string): Promise<Attempt | null>;

  save(attempt: Attempt): Promise<Attempt>;

  update(attempt: Attempt): Promise<Attempt>;
}
