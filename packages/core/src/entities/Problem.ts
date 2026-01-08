/**
 * Problem entity - represents a coding problem with scaffolded steps.
 * PURE TypeScript - no framework dependencies.
 */

import type {
  ProblemId,
  TenantId,
  PatternId,
  StepId,
  Difficulty,
  Language,
} from './types.js';

export interface CodeTemplate {
  readonly language: Language;
  readonly code: string;
}

export interface ValidationRule {
  readonly language: Language;
  readonly type: 'regex' | 'ast' | 'test';
  readonly rule: string;
}

export interface ProblemStep {
  readonly stepId: StepId;
  readonly order: number;
  readonly description: string;
  readonly hints: readonly string[];
  readonly placeholderCode: readonly CodeTemplate[];
  readonly validationRules: readonly ValidationRule[];
  readonly timeEstimateSec: number;
}

export interface PatternSelectionOption {
  readonly id: string;
  readonly text: string;
  readonly isCorrect: boolean;
  readonly feedback: string;
}

export interface PatternSelection {
  readonly question: string;
  readonly options: readonly PatternSelectionOption[];
  readonly explanation: string;
}

export interface InterviewQuestion {
  readonly question: string;
  readonly correctAnswer: string;
  readonly partialAnswers: readonly string[];
  readonly incorrectAnswers: readonly string[];
  readonly followUpHints: readonly string[];
}

export interface StrategyStep {
  readonly prompt: string;
  readonly requiredConcepts: readonly string[];
  readonly minScore: number;
  readonly hints: readonly string[];
}

export interface Problem {
  readonly id: ProblemId;
  readonly tenantId: TenantId;
  readonly patternId: PatternId;
  readonly title: string;
  readonly slug: string;
  readonly description: string;
  readonly difficulty: Difficulty;
  readonly supportedLanguages: readonly Language[];
  readonly defaultLanguage: Language;
  readonly patternSelection: PatternSelection | null;
  readonly interviewQuestion: InterviewQuestion | null;
  readonly strategyStep: StrategyStep | null;
  readonly steps: readonly ProblemStep[];
  readonly solutionCode: readonly CodeTemplate[];
  readonly testCases: readonly string[];
  readonly tags: readonly string[];
  readonly estimatedTimeSec: number;
  readonly published: boolean;
  readonly createdAt: number;
  readonly updatedAt: number;
}

// Factory function
export function createProblem(
  params: Omit<Problem, 'createdAt' | 'updatedAt'> & {
    createdAt?: number;
    updatedAt?: number;
  }
): Problem {
  const now = Date.now();
  return {
    ...params,
    createdAt: params.createdAt ?? now,
    updatedAt: params.updatedAt ?? now,
  };
}
