/**
 * Pattern entity - represents an algorithmic pattern (e.g., Two Pointers, Sliding Window).
 * PURE TypeScript - no framework dependencies.
 */

import type { PatternId, TenantId, Difficulty, Language } from './types.js';

export interface PatternTemplate {
  readonly language: Language;
  readonly code: string;
  readonly explanation: string;
}

export interface PatternVariant {
  readonly name: string;
  readonly description: string;
  readonly difficulty: Difficulty;
}

export interface Pattern {
  readonly id: PatternId;
  readonly tenantId: TenantId;
  readonly name: string;
  readonly slug: string;
  readonly description: string;
  readonly category: string;
  readonly difficulty: Difficulty;
  readonly timeComplexity: string;
  readonly spaceComplexity: string;
  readonly primitives: readonly string[];
  readonly templates: readonly PatternTemplate[];
  readonly variants: readonly PatternVariant[];
  readonly commonMistakes: readonly string[];
  readonly whenToUse: readonly string[];
  readonly relatedPatterns: readonly PatternId[];
  readonly createdAt: number;
  readonly updatedAt: number;
}

// Factory function
export function createPattern(
  params: Omit<Pattern, 'createdAt' | 'updatedAt'> & {
    createdAt?: number;
    updatedAt?: number;
  }
): Pattern {
  const now = Date.now();
  return {
    ...params,
    createdAt: params.createdAt ?? now,
    updatedAt: params.updatedAt ?? now,
  };
}
