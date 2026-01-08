/**
 * Progress DTOs - Data Transfer Objects for user progress.
 */

import type { Difficulty, ConfidenceLevel } from '@learning/core';

export interface ProblemProgressDTO {
  problemId: string;
  isCompleted: boolean;
  bestTimeSec: number | null;
  attemptCount: number;
  lastAttemptAt: string | null;
  hintsUsedTotal: number;
  confidenceLevel: ConfidenceLevel;
  masteryScore: number;
}

export interface PatternProgressDTO {
  patternId: string;
  patternName: string;
  problemsCompleted: number;
  problemsTotal: number;
  drillsCompleted: number;
  drillsTotal: number;
  averageAccuracy: number;
  averageTimeSec: number;
  confidenceLevel: ConfidenceLevel;
  masteryScore: number;
  lastPracticedAt: string | null;
  streak: number;
}

export interface UserStatsDTO {
  totalProblemsCompleted: number;
  totalDrillsCompleted: number;
  totalTimeSpentSec: number;
  currentStreak: number;
  longestStreak: number;
  lastActiveAt: string | null;
  preferredDifficulty: Difficulty;
  strongPatterns: string[];
  weakPatterns: string[];
}

export interface DashboardDTO {
  userStats: UserStatsDTO;
  recentActivity: ActivityItemDTO[];
  patternProgress: PatternProgressDTO[];
  recommendedNext: RecommendedItemDTO[];
  dailyGoal: DailyGoalDTO;
}

export interface ActivityItemDTO {
  type: 'problem' | 'drill' | 'session';
  itemId: string;
  title: string;
  timestamp: string;
  result: 'completed' | 'partial' | 'skipped';
  timeTakenSec: number;
}

export interface RecommendedItemDTO {
  type: 'problem' | 'drill';
  itemId: string;
  title: string;
  reason: string;
  priority: number;
}

export interface DailyGoalDTO {
  targetItems: number;
  completedItems: number;
  targetTimeSec: number;
  elapsedTimeSec: number;
  streakDays: number;
  isCompleted: boolean;
}
