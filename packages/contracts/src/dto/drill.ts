/**
 * MicroDrill DTOs - Data Transfer Objects for drills.
 */

import type { Difficulty, DrillType, Language } from '@learning/core';

export interface DrillCodeSnippetDTO {
  language: Language;
  code: string;
  highlightLines?: number[];
}

export interface DrillOptionDTO {
  id: string;
  text: string;
}

export interface MicroDrillDTO {
  id: string;
  patternId: string;
  type: DrillType;
  difficulty: Difficulty;
  title: string;
  description: string;
  prompt: string;
  codeSnippet: DrillCodeSnippetDTO | null;
  options: DrillOptionDTO[] | null;
  hints: string[];
  timeBudgetSec: number;
  tags: string[];
}

export interface DrillAnswerDTO {
  answer: string;
  timeTakenSec: number;
  hintsUsed: number;
}

export interface DrillResultDTO {
  isCorrect: boolean;
  explanation: string;
  correctAnswer: string | null;
  feedback: string;
}

export interface GetNextDrillRequestDTO {
  patternId?: string;
  difficulty?: Difficulty;
  excludeDrillIds?: string[];
}

export interface GetNextDrillResponseDTO {
  drill: MicroDrillDTO | null;
  reason: string;
  patternContext?: {
    patternId: string;
    drillsCompleted: number;
    drillsRequired: number;
    accuracy: number;
  };
}
