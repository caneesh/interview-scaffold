/**
 * MicroDrill entity - small, focused exercises for pattern reinforcement.
 * PURE TypeScript - no framework dependencies.
 */

import type {
  MicroDrillId,
  TenantId,
  PatternId,
  Difficulty,
  DrillType,
  Language,
} from './types.js';

export interface DrillOption {
  readonly id: string;
  readonly text: string;
  readonly isCorrect: boolean;
  readonly feedback: string;
}

export interface DrillCodeSnippet {
  readonly language: Language;
  readonly code: string;
  readonly highlightLines?: readonly number[];
}

export interface MicroDrill {
  readonly id: MicroDrillId;
  readonly tenantId: TenantId;
  readonly patternId: PatternId;
  readonly type: DrillType;
  readonly difficulty: Difficulty;
  readonly title: string;
  readonly description: string;
  readonly prompt: string;
  readonly codeSnippet: DrillCodeSnippet | null;
  readonly options: readonly DrillOption[] | null;
  readonly expectedAnswer: string | null;
  readonly hints: readonly string[];
  readonly explanation: string;
  readonly timeBudgetSec: number;
  readonly tags: readonly string[];
  readonly order: number;
  readonly published: boolean;
  readonly createdAt: number;
  readonly updatedAt: number;
}

// Factory function
export function createMicroDrill(
  params: Omit<MicroDrill, 'createdAt' | 'updatedAt'> & {
    createdAt?: number;
    updatedAt?: number;
  }
): MicroDrill {
  const now = Date.now();
  return {
    ...params,
    createdAt: params.createdAt ?? now,
    updatedAt: params.updatedAt ?? now,
  };
}
