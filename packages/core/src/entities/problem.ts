import type { PatternId } from './pattern.js';
import type { RungLevel } from './rung.js';
import type { TenantId } from './tenant.js';
import type { AdversaryPrompt } from './step.js';

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
  /** Optional adversary prompts for post-completion challenges */
  readonly adversaryPrompts?: readonly AdversaryPrompt[];
  /** Time budget in ms for large hidden tests (e.g., 500, 1000) */
  readonly timeoutBudgetMs?: number;
  /** Large hidden tests run with budget timeout to detect suboptimal complexity */
  readonly largeHiddenTests?: readonly TestCase[];
  readonly createdAt: Date;
}

export interface TestCase {
  readonly input: string;
  readonly expectedOutput: string;
  readonly isHidden: boolean;
  readonly explanation?: string;
}

export type ProblemId = string;
