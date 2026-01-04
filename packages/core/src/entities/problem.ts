import type { PatternId } from './pattern.js';
import type { RungLevel } from './rung.js';
import type { TenantId } from './tenant.js';

/**
 * Problem - a coding problem with pattern and difficulty
 */
export interface Problem {
  readonly id: string;
  readonly tenantId: TenantId;
  readonly title: string;
  readonly statement: string;
  readonly pattern: PatternId;
  readonly rung: RungLevel;
  readonly targetComplexity: string;
  readonly testCases: readonly TestCase[];
  readonly hints: readonly string[];
  readonly createdAt: Date;
}

export interface TestCase {
  readonly input: string;
  readonly expectedOutput: string;
  readonly isHidden: boolean;
  readonly explanation?: string;
}

export type ProblemId = string;
