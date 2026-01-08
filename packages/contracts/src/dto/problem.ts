/**
 * Problem DTOs - Data Transfer Objects for problems.
 */

import type { Difficulty, Language } from '@learning/core';

export interface CodeTemplateDTO {
  language: Language;
  code: string;
}

export interface ProblemStepDTO {
  stepId: string;
  order: number;
  description: string;
  hints: string[];
  placeholderCode: CodeTemplateDTO[];
  timeEstimateSec: number;
}

export interface PatternSelectionDTO {
  question: string;
  options: {
    id: string;
    text: string;
    isCorrect: boolean;
    feedback: string;
  }[];
  explanation: string;
}

export interface InterviewQuestionDTO {
  question: string;
  correctAnswer: string;
  partialAnswers: string[];
  incorrectAnswers: string[];
  followUpHints: string[];
}

export interface StrategyStepDTO {
  prompt: string;
  requiredConcepts: string[];
  minScore: number;
  hints: string[];
}

export interface ProblemDTO {
  id: string;
  patternId: string;
  title: string;
  slug: string;
  description: string;
  difficulty: Difficulty;
  supportedLanguages: Language[];
  defaultLanguage: Language;
  patternSelection: PatternSelectionDTO | null;
  interviewQuestion: InterviewQuestionDTO | null;
  strategyStep: StrategyStepDTO | null;
  steps: ProblemStepDTO[];
  tags: string[];
  estimatedTimeSec: number;
}

export interface ProblemSummaryDTO {
  id: string;
  title: string;
  difficulty: Difficulty;
  patternId: string;
  tags: string[];
  estimatedTimeSec: number;
  isCompleted: boolean;
  masteryScore: number | null;
}

export interface ProblemListRequestDTO {
  patternId?: string;
  difficulty?: Difficulty;
  tags?: string[];
  limit?: number;
  offset?: number;
}

export interface ProblemListResponseDTO {
  problems: ProblemSummaryDTO[];
  total: number;
  hasMore: boolean;
}
