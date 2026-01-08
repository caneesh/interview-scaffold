/**
 * Supabase implementation of ProgressRepo.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type {
  ProgressRepo,
  MEPAttemptSummary,
  TenantId,
  UserId,
  ProblemId,
  PatternId,
  MicroDrillId,
  AttemptId,
  SessionId,
  ProblemProgress,
  PatternProgress,
  DrillProgress,
  UserStats,
  ProblemAttempt,
  DrillAttempt,
  Session,
} from '@learning/core';

export class SupabaseProgressRepo implements ProgressRepo {
  constructor(private readonly client: SupabaseClient) {}

  // Problem Progress
  async getProblemProgress(
    tenantId: TenantId,
    userId: UserId,
    problemId: ProblemId
  ): Promise<ProblemProgress | null> {
    const { data, error } = await this.client
      .from('problem_progress')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('user_id', userId)
      .eq('problem_id', problemId)
      .single();

    if (error || !data) return null;
    return this.mapProblemProgress(data);
  }

  async getProblemProgressByUser(
    tenantId: TenantId,
    userId: UserId
  ): Promise<readonly ProblemProgress[]> {
    const { data, error } = await this.client
      .from('problem_progress')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('user_id', userId);

    if (error || !data) return [];
    return data.map(this.mapProblemProgress);
  }

  async saveProblemProgress(progress: ProblemProgress): Promise<void> {
    const { error } = await this.client
      .from('problem_progress')
      .upsert({
        tenant_id: progress.tenantId,
        user_id: progress.userId,
        problem_id: progress.problemId,
        is_completed: progress.isCompleted,
        best_time_sec: progress.bestTimeSec,
        attempt_count: progress.attemptCount,
        last_attempt_at: progress.lastAttemptAt ? new Date(progress.lastAttemptAt).toISOString() : null,
        hints_used_total: progress.hintsUsedTotal,
        confidence_level: progress.confidenceLevel,
        mastery_score: progress.masteryScore,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'tenant_id,user_id,problem_id',
      });

    if (error) throw new Error(`Failed to save problem progress: ${error.message}`);
  }

  // Pattern Progress
  async getPatternProgress(
    tenantId: TenantId,
    userId: UserId,
    patternId: PatternId
  ): Promise<PatternProgress | null> {
    const { data, error } = await this.client
      .from('pattern_progress')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('user_id', userId)
      .eq('pattern_id', patternId)
      .single();

    if (error || !data) return null;
    return this.mapPatternProgress(data);
  }

  async getPatternProgressByUser(
    tenantId: TenantId,
    userId: UserId
  ): Promise<readonly PatternProgress[]> {
    const { data, error } = await this.client
      .from('pattern_progress')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('user_id', userId);

    if (error || !data) return [];
    return data.map(this.mapPatternProgress);
  }

  async savePatternProgress(progress: PatternProgress): Promise<void> {
    const { error } = await this.client
      .from('pattern_progress')
      .upsert({
        tenant_id: progress.tenantId,
        user_id: progress.userId,
        pattern_id: progress.patternId,
        problems_completed: progress.problemsCompleted,
        problems_total: progress.problemsTotal,
        drills_completed: progress.drillsCompleted,
        drills_total: progress.drillsTotal,
        average_accuracy: progress.averageAccuracy,
        average_time_sec: progress.averageTimeSec,
        confidence_level: progress.confidenceLevel,
        mastery_score: progress.masteryScore,
        last_practiced_at: progress.lastPracticedAt ? new Date(progress.lastPracticedAt).toISOString() : null,
        streak: progress.streak,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'tenant_id,user_id,pattern_id',
      });

    if (error) throw new Error(`Failed to save pattern progress: ${error.message}`);
  }

  // Drill Progress
  async getDrillProgress(
    tenantId: TenantId,
    userId: UserId,
    drillId: MicroDrillId
  ): Promise<DrillProgress | null> {
    const { data, error } = await this.client
      .from('drill_progress')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('user_id', userId)
      .eq('drill_id', drillId)
      .single();

    if (error || !data) return null;
    return this.mapDrillProgress(data);
  }

  async getDrillProgressByUser(
    tenantId: TenantId,
    userId: UserId
  ): Promise<readonly DrillProgress[]> {
    const { data, error } = await this.client
      .from('drill_progress')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('user_id', userId);

    if (error || !data) return [];
    return data.map(this.mapDrillProgress);
  }

  async saveDrillProgress(progress: DrillProgress): Promise<void> {
    const { error } = await this.client
      .from('drill_progress')
      .upsert({
        tenant_id: progress.tenantId,
        user_id: progress.userId,
        drill_id: progress.drillId,
        is_completed: progress.isCompleted,
        best_time_sec: progress.bestTimeSec,
        attempt_count: progress.attemptCount,
        correct_count: progress.correctCount,
        last_attempt_at: progress.lastAttemptAt ? new Date(progress.lastAttemptAt).toISOString() : null,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'tenant_id,user_id,drill_id',
      });

    if (error) throw new Error(`Failed to save drill progress: ${error.message}`);
  }

  // User Stats
  async getUserStats(tenantId: TenantId, userId: UserId): Promise<UserStats | null> {
    const { data, error } = await this.client
      .from('user_stats')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('user_id', userId)
      .single();

    if (error || !data) return null;
    return this.mapUserStats(data);
  }

  async saveUserStats(stats: UserStats): Promise<void> {
    const { error } = await this.client
      .from('user_stats')
      .upsert({
        tenant_id: stats.tenantId,
        user_id: stats.userId,
        total_problems_completed: stats.totalProblemsCompleted,
        total_drills_completed: stats.totalDrillsCompleted,
        total_time_spent_sec: stats.totalTimeSpentSec,
        current_streak: stats.currentStreak,
        longest_streak: stats.longestStreak,
        last_active_at: stats.lastActiveAt ? new Date(stats.lastActiveAt).toISOString() : null,
        preferred_difficulty: stats.preferredDifficulty,
        strong_patterns: stats.strongPatterns,
        weak_patterns: stats.weakPatterns,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'tenant_id,user_id',
      });

    if (error) throw new Error(`Failed to save user stats: ${error.message}`);
  }

  // Attempts
  async getAttempt(tenantId: TenantId, attemptId: AttemptId): Promise<ProblemAttempt | DrillAttempt | null> {
    // Try problem attempts first
    const { data: problemData } = await this.client
      .from('problem_attempts')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('id', attemptId)
      .single();

    if (problemData) return this.mapProblemAttempt(problemData);

    // Try drill attempts
    const { data: drillData } = await this.client
      .from('drill_attempts')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('id', attemptId)
      .single();

    if (drillData) return this.mapDrillAttempt(drillData);

    return null;
  }

  async getProblemAttempts(
    tenantId: TenantId,
    userId: UserId,
    problemId: ProblemId
  ): Promise<readonly ProblemAttempt[]> {
    const { data, error } = await this.client
      .from('problem_attempts')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('user_id', userId)
      .eq('problem_id', problemId)
      .order('created_at', { ascending: false });

    if (error || !data) return [];
    return data.map(this.mapProblemAttempt);
  }

  async getDrillAttempts(
    tenantId: TenantId,
    userId: UserId,
    drillId: MicroDrillId
  ): Promise<readonly DrillAttempt[]> {
    const { data, error } = await this.client
      .from('drill_attempts')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('user_id', userId)
      .eq('drill_id', drillId)
      .order('created_at', { ascending: false });

    if (error || !data) return [];
    return data.map(this.mapDrillAttempt);
  }

  async saveAttempt(attempt: ProblemAttempt | DrillAttempt): Promise<void> {
    if ('problemId' in attempt) {
      await this.saveProblemAttempt(attempt);
    } else {
      await this.saveDrillAttempt(attempt);
    }
  }

  private async saveProblemAttempt(attempt: ProblemAttempt): Promise<void> {
    const { error } = await this.client
      .from('problem_attempts')
      .upsert({
        id: attempt.id,
        tenant_id: attempt.tenantId,
        user_id: attempt.userId,
        problem_id: attempt.problemId,
        session_id: attempt.sessionId,
        mode: attempt.mode,
        status: attempt.status,
        language: attempt.language,
        time_budget_sec: attempt.timeBudgetSec,
        pattern_selection_correct: attempt.patternSelectionCorrect,
        interview_answer_correct: attempt.interviewAnswerCorrect,
        strategy_score: attempt.strategyScore,
        step_attempts: attempt.stepAttempts,
        metrics: attempt.metrics,
        started_at: new Date(attempt.startedAt).toISOString(),
        completed_at: attempt.completedAt ? new Date(attempt.completedAt).toISOString() : null,
        updated_at: new Date().toISOString(),
      });

    if (error) throw new Error(`Failed to save problem attempt: ${error.message}`);
  }

  private async saveDrillAttempt(attempt: DrillAttempt): Promise<void> {
    const { error } = await this.client
      .from('drill_attempts')
      .upsert({
        id: attempt.id,
        tenant_id: attempt.tenantId,
        user_id: attempt.userId,
        drill_id: attempt.drillId,
        session_id: attempt.sessionId,
        mode: attempt.mode,
        status: attempt.status,
        time_budget_sec: attempt.timeBudgetSec,
        answer: attempt.answer,
        is_correct: attempt.isCorrect,
        hints_used: attempt.hintsUsed,
        time_taken_sec: attempt.timeTakenSec,
        errors: attempt.errors,
        confidence_rating: attempt.confidenceRating,
        started_at: new Date(attempt.startedAt).toISOString(),
        completed_at: attempt.completedAt ? new Date(attempt.completedAt).toISOString() : null,
        updated_at: new Date().toISOString(),
      });

    if (error) throw new Error(`Failed to save drill attempt: ${error.message}`);
  }

  // Sessions
  async getSession(tenantId: TenantId, sessionId: SessionId): Promise<Session | null> {
    const { data, error } = await this.client
      .from('sessions')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('id', sessionId)
      .single();

    if (error || !data) return null;
    return this.mapSession(data);
  }

  async getActiveSession(tenantId: TenantId, userId: UserId): Promise<Session | null> {
    const { data, error } = await this.client
      .from('sessions')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('user_id', userId)
      .eq('status', 'ACTIVE')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (error || !data) return null;
    return this.mapSession(data);
  }

  async getUserSessions(
    tenantId: TenantId,
    userId: UserId,
    limit = 10
  ): Promise<readonly Session[]> {
    const { data, error } = await this.client
      .from('sessions')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error || !data) return [];
    return data.map(this.mapSession);
  }

  async saveSession(session: Session): Promise<void> {
    const { error } = await this.client
      .from('sessions')
      .upsert({
        id: session.id,
        tenant_id: session.tenantId,
        user_id: session.userId,
        type: session.type,
        status: session.status,
        config: session.config,
        items: session.items,
        current_item_index: session.currentItemIndex,
        metrics: session.metrics,
        started_at: new Date(session.startedAt).toISOString(),
        completed_at: session.completedAt ? new Date(session.completedAt).toISOString() : null,
        updated_at: new Date().toISOString(),
      });

    if (error) throw new Error(`Failed to save session: ${error.message}`);
  }

  // Mappers
  private mapProblemProgress(data: Record<string, unknown>): ProblemProgress {
    return {
      tenantId: data['tenant_id'] as TenantId,
      userId: data['user_id'] as UserId,
      problemId: data['problem_id'] as ProblemId,
      isCompleted: data['is_completed'] as boolean,
      bestTimeSec: data['best_time_sec'] as number | null,
      attemptCount: data['attempt_count'] as number,
      lastAttemptAt: data['last_attempt_at'] ? new Date(data['last_attempt_at'] as string).getTime() : null,
      hintsUsedTotal: data['hints_used_total'] as number,
      confidenceLevel: data['confidence_level'] as ProblemProgress['confidenceLevel'],
      masteryScore: data['mastery_score'] as number,
      createdAt: new Date(data['created_at'] as string).getTime(),
      updatedAt: new Date(data['updated_at'] as string).getTime(),
    };
  }

  private mapPatternProgress(data: Record<string, unknown>): PatternProgress {
    return {
      tenantId: data['tenant_id'] as TenantId,
      userId: data['user_id'] as UserId,
      patternId: data['pattern_id'] as PatternId,
      problemsCompleted: data['problems_completed'] as number,
      problemsTotal: data['problems_total'] as number,
      drillsCompleted: data['drills_completed'] as number,
      drillsTotal: data['drills_total'] as number,
      averageAccuracy: data['average_accuracy'] as number,
      averageTimeSec: data['average_time_sec'] as number,
      confidenceLevel: data['confidence_level'] as PatternProgress['confidenceLevel'],
      masteryScore: data['mastery_score'] as number,
      rungLevel: (data['rung_level'] as number) ?? 1,
      lastPracticedAt: data['last_practiced_at'] ? new Date(data['last_practiced_at'] as string).getTime() : null,
      streak: data['streak'] as number,
      createdAt: new Date(data['created_at'] as string).getTime(),
      updatedAt: new Date(data['updated_at'] as string).getTime(),
    };
  }

  private mapDrillProgress(data: Record<string, unknown>): DrillProgress {
    return {
      tenantId: data['tenant_id'] as TenantId,
      userId: data['user_id'] as UserId,
      drillId: data['drill_id'] as MicroDrillId,
      isCompleted: data['is_completed'] as boolean,
      bestTimeSec: data['best_time_sec'] as number | null,
      attemptCount: data['attempt_count'] as number,
      correctCount: data['correct_count'] as number,
      lastAttemptAt: data['last_attempt_at'] ? new Date(data['last_attempt_at'] as string).getTime() : null,
      createdAt: new Date(data['created_at'] as string).getTime(),
      updatedAt: new Date(data['updated_at'] as string).getTime(),
    };
  }

  private mapUserStats(data: Record<string, unknown>): UserStats {
    return {
      tenantId: data['tenant_id'] as TenantId,
      userId: data['user_id'] as UserId,
      totalProblemsCompleted: data['total_problems_completed'] as number,
      totalDrillsCompleted: data['total_drills_completed'] as number,
      totalTimeSpentSec: data['total_time_spent_sec'] as number,
      currentStreak: data['current_streak'] as number,
      longestStreak: data['longest_streak'] as number,
      lastActiveAt: data['last_active_at'] ? new Date(data['last_active_at'] as string).getTime() : null,
      preferredDifficulty: data['preferred_difficulty'] as UserStats['preferredDifficulty'],
      strongPatterns: (data['strong_patterns'] as PatternId[]) ?? [],
      weakPatterns: (data['weak_patterns'] as PatternId[]) ?? [],
      createdAt: new Date(data['created_at'] as string).getTime(),
      updatedAt: new Date(data['updated_at'] as string).getTime(),
    };
  }

  private mapProblemAttempt(data: Record<string, unknown>): ProblemAttempt {
    return {
      id: data['id'] as AttemptId,
      tenantId: data['tenant_id'] as TenantId,
      userId: data['user_id'] as UserId,
      problemId: data['problem_id'] as ProblemId,
      sessionId: data['session_id'] as SessionId | null,
      mode: data['mode'] as ProblemAttempt['mode'],
      status: data['status'] as ProblemAttempt['status'],
      language: data['language'] as ProblemAttempt['language'],
      timeBudgetSec: data['time_budget_sec'] as number | null,
      patternSelectionCorrect: data['pattern_selection_correct'] as boolean | null,
      interviewAnswerCorrect: data['interview_answer_correct'] as boolean | null,
      strategyScore: data['strategy_score'] as number | null,
      stepAttempts: (data['step_attempts'] as ProblemAttempt['stepAttempts']) ?? [],
      metrics: data['metrics'] as ProblemAttempt['metrics'],
      startedAt: new Date(data['started_at'] as string).getTime(),
      completedAt: data['completed_at'] ? new Date(data['completed_at'] as string).getTime() : null,
      createdAt: new Date(data['created_at'] as string).getTime(),
      updatedAt: new Date(data['updated_at'] as string).getTime(),
    };
  }

  private mapDrillAttempt(data: Record<string, unknown>): DrillAttempt {
    return {
      id: data['id'] as AttemptId,
      tenantId: data['tenant_id'] as TenantId,
      userId: data['user_id'] as UserId,
      drillId: data['drill_id'] as MicroDrillId,
      sessionId: data['session_id'] as SessionId | null,
      mode: data['mode'] as DrillAttempt['mode'],
      status: data['status'] as DrillAttempt['status'],
      timeBudgetSec: data['time_budget_sec'] as number | null,
      answer: data['answer'] as string,
      isCorrect: data['is_correct'] as boolean,
      hintsUsed: data['hints_used'] as number,
      timeTakenSec: data['time_taken_sec'] as number,
      errors: (data['errors'] as DrillAttempt['errors']) ?? [],
      confidenceRating: data['confidence_rating'] as DrillAttempt['confidenceRating'],
      startedAt: new Date(data['started_at'] as string).getTime(),
      completedAt: data['completed_at'] ? new Date(data['completed_at'] as string).getTime() : null,
      createdAt: new Date(data['created_at'] as string).getTime(),
      updatedAt: new Date(data['updated_at'] as string).getTime(),
    };
  }

  private mapSession(data: Record<string, unknown>): Session {
    return {
      id: data['id'] as SessionId,
      tenantId: data['tenant_id'] as TenantId,
      userId: data['user_id'] as UserId,
      type: data['type'] as Session['type'],
      status: data['status'] as Session['status'],
      config: data['config'] as Session['config'],
      items: (data['items'] as Session['items']) ?? [],
      currentItemIndex: data['current_item_index'] as number,
      metrics: data['metrics'] as Session['metrics'],
      startedAt: new Date(data['started_at'] as string).getTime(),
      completedAt: data['completed_at'] ? new Date(data['completed_at'] as string).getTime() : null,
      createdAt: new Date(data['created_at'] as string).getTime(),
      updatedAt: new Date(data['updated_at'] as string).getTime(),
    };
  }

  // MEP-specific queries
  async getRecentAttempts(
    tenantId: TenantId,
    userId: UserId,
    patternId: PatternId,
    limit: number
  ): Promise<readonly MEPAttemptSummary[]> {
    const { data, error } = await this.client
      .from('problem_attempts')
      .select('problem_id, pattern_id, score, retry_count, error_types, completed_at, is_sibling')
      .eq('tenant_id', tenantId)
      .eq('user_id', userId)
      .eq('pattern_id', patternId)
      .order('completed_at', { ascending: false })
      .limit(limit);

    if (error) {
      throw new Error(`Failed to get recent attempts: ${error.message}`);
    }

    return (data ?? []).map(row => this.mapMEPAttemptSummary(row));
  }

  async getAttemptsByPattern(
    tenantId: TenantId,
    userId: UserId,
    patternId: PatternId
  ): Promise<readonly MEPAttemptSummary[]> {
    const { data, error } = await this.client
      .from('problem_attempts')
      .select('problem_id, pattern_id, score, retry_count, error_types, completed_at, is_sibling')
      .eq('tenant_id', tenantId)
      .eq('user_id', userId)
      .eq('pattern_id', patternId)
      .order('completed_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to get attempts by pattern: ${error.message}`);
    }

    return (data ?? []).map(row => this.mapMEPAttemptSummary(row));
  }

  private mapMEPAttemptSummary(data: Record<string, unknown>): MEPAttemptSummary {
    return {
      problemId: data['problem_id'] as ProblemId,
      patternId: data['pattern_id'] as PatternId,
      score: (data['score'] as number) ?? 0,
      retryCount: (data['retry_count'] as number) ?? 0,
      errorTypes: (data['error_types'] as string[]) ?? [],
      endedAt: data['completed_at'] ? new Date(data['completed_at'] as string).getTime() : null,
      isSibling: (data['is_sibling'] as boolean) ?? false,
    };
  }
}
