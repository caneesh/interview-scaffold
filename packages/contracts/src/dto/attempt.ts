/**
 * Attempt DTOs - Data Transfer Objects for attempts.
 */

import type {
  AttemptMode,
  AttemptStatus,
  ErrorTaxonomy,
  ConfidenceLevel,
  Language,
} from '@learning/core';

export interface StepAttemptDTO {
  stepId: string;
  code: string;
  language: Language;
  hintsUsed: number;
  startedAt: string;
  completedAt: string | null;
  errors: ErrorTaxonomy[];
  isCorrect: boolean;
}

export interface AttemptMetricsDTO {
  totalTimeSec: number;
  activeTimeSec: number;
  hintsUsed: number;
  errorsEncountered: ErrorTaxonomy[];
  confidenceRating: ConfidenceLevel | null;
  selfAssessedDifficulty: number | null;
}

export interface StartProblemAttemptRequestDTO {
  problemId: string;
  mode: AttemptMode;
  language: Language;
  timeBudgetSec?: number;
  sessionId?: string;
}

export interface ProblemAttemptDTO {
  id: string;
  problemId: string;
  sessionId: string | null;
  mode: AttemptMode;
  status: AttemptStatus;
  language: Language;
  timeBudgetSec: number | null;
  patternSelectionCorrect: boolean | null;
  interviewAnswerCorrect: boolean | null;
  strategyScore: number | null;
  stepAttempts: StepAttemptDTO[];
  metrics: AttemptMetricsDTO;
  startedAt: string;
  completedAt: string | null;
}

export interface SubmitStepRequestDTO {
  attemptId: string;
  stepId: string;
  code: string;
  language: Language;
}

export interface SubmitStepResponseDTO {
  isCorrect: boolean;
  feedback: string;
  errors: ErrorTaxonomy[];
  nextStepId: string | null;
  isLastStep: boolean;
}

export interface CompleteAttemptRequestDTO {
  attemptId: string;
  confidenceRating?: ConfidenceLevel;
  selfAssessedDifficulty?: number;
}

export interface CompleteAttemptResponseDTO {
  attempt: ProblemAttemptDTO;
  progressUpdate: {
    masteryScoreChange: number;
    newMasteryScore: number;
    streakUpdate: number;
  };
}
