/**
 * In-Memory Repository Implementations
 * Uses seed data from @scaffold/core for local development without PostgreSQL
 */

import { randomUUID } from 'crypto';
import type { AttemptRepo, SkillRepo, ContentRepo, IdempotentUpdateResult, CreateTrackAttemptParams } from '@scaffold/core/ports';
import type {
  Attempt,
  LegacyAttempt,
  TrackAttempt,
  PatternId,
  RungLevel,
  Problem,
  SkillState,
  SkillMatrix,
  Track,
  ContentItemId,
} from '@scaffold/core/entities';
import { ALL_SEED_PROBLEMS, type SeedProblem } from '@scaffold/core/data';

// Convert seed problem to Problem entity
function seedToProblem(seed: SeedProblem, tenantId: string): Problem {
  return {
    id: seed.id,
    tenantId,
    title: seed.title,
    statement: seed.statement,
    pattern: seed.pattern,
    rung: seed.rung,
    targetComplexity: seed.targetComplexity,
    hints: [...seed.hints],
    testCases: seed.testCases.map((tc) => ({
      input: tc.input,
      expectedOutput: tc.expectedOutput,
      isHidden: tc.isHidden,
      explanation: tc.explanation,
    })),
    timeoutBudgetMs: seed.timeoutBudgetMs,
    largeHiddenTests: seed.largeHiddenTests?.map((tc) => ({
      input: tc.input,
      expectedOutput: tc.expectedOutput,
      isHidden: tc.isHidden,
      explanation: tc.explanation,
    })),
    createdAt: new Date(),
  };
}

// In-memory storage with persistence across hot reloads
// In development, Next.js hot reloads can clear module-level variables,
// so we use globalThis to maintain state across reloads.
declare global {
  // eslint-disable-next-line no-var
  var __attemptsStore: Map<string, Attempt> | undefined;
  // eslint-disable-next-line no-var
  var __skillsStore: Map<string, SkillState> | undefined;
}

const attempts = globalThis.__attemptsStore ?? new Map<string, Attempt>();
globalThis.__attemptsStore = attempts;

const skills = globalThis.__skillsStore ?? new Map<string, SkillState>();
globalThis.__skillsStore = skills;

/**
 * In-Memory Content Repository
 */
export const inMemoryContentRepo: ContentRepo = {
  async findById(tenantId: string, problemId: string): Promise<Problem | null> {
    const seed = ALL_SEED_PROBLEMS.find(p => p.id === problemId);
    if (!seed) return null;
    return seedToProblem(seed, tenantId);
  },

  async findByPatternAndRung(tenantId: string, pattern: PatternId, rung: RungLevel): Promise<readonly Problem[]> {
    return ALL_SEED_PROBLEMS
      .filter(p => p.pattern === pattern && p.rung === rung)
      .map(p => seedToProblem(p, tenantId));
  },

  async findAll(tenantId: string, options?: { pattern?: PatternId; rung?: RungLevel; limit?: number; offset?: number }): Promise<readonly Problem[]> {
    let problems = [...ALL_SEED_PROBLEMS];

    if (options?.pattern) {
      problems = problems.filter(p => p.pattern === options.pattern);
    }
    if (options?.rung !== undefined) {
      problems = problems.filter(p => p.rung === options.rung);
    }

    const offset = options?.offset ?? 0;
    const limit = options?.limit ?? problems.length;

    return problems
      .slice(offset, offset + limit)
      .map(p => seedToProblem(p, tenantId));
  },

  async countByPatternAndRung(tenantId: string, pattern: PatternId, rung: RungLevel): Promise<number> {
    return ALL_SEED_PROBLEMS.filter(p => p.pattern === pattern && p.rung === rung).length;
  },
};

/**
 * Type guard to check if an attempt is a track attempt
 */
function isTrackAttempt(attempt: Attempt): attempt is TrackAttempt {
  return 'contentItemId' in attempt && attempt.contentItemId !== undefined;
}

/**
 * In-Memory Attempt Repository
 */
export const inMemoryAttemptRepo: AttemptRepo = {
  async findById(tenantId: string, attemptId: string): Promise<Attempt | null> {
    const attempt = attempts.get(attemptId);
    if (!attempt || attempt.tenantId !== tenantId) return null;
    return { ...attempt };
  },

  async findByUser(
    tenantId: string,
    userId: string,
    options?: { pattern?: PatternId; rung?: RungLevel; limit?: number }
  ): Promise<readonly Attempt[]> {
    let result = Array.from(attempts.values())
      .filter(a => a.tenantId === tenantId && a.userId === userId);

    if (options?.pattern) {
      result = result.filter(a => a.pattern === options.pattern);
    }
    if (options?.rung !== undefined) {
      result = result.filter(a => a.rung === options.rung);
    }

    result.sort((a, b) => b.startedAt.getTime() - a.startedAt.getTime());

    if (options?.limit) {
      result = result.slice(0, options.limit);
    }

    return result;
  },

  async findCompletedByPatternRung(
    tenantId: string,
    userId: string,
    pattern: PatternId,
    rung: RungLevel,
    limit: number
  ): Promise<readonly Attempt[]> {
    return Array.from(attempts.values())
      .filter(a =>
        a.tenantId === tenantId &&
        a.userId === userId &&
        a.pattern === pattern &&
        a.rung === rung &&
        a.state === 'COMPLETED' &&
        a.completedAt !== null
      )
      .sort((a, b) => (b.completedAt?.getTime() ?? 0) - (a.completedAt?.getTime() ?? 0))
      .slice(0, limit);
  },

  async findActive(tenantId: string, userId: string): Promise<Attempt | null> {
    const active = Array.from(attempts.values())
      .find(a =>
        a.tenantId === tenantId &&
        a.userId === userId &&
        a.state !== 'COMPLETED' &&
        a.state !== 'ABANDONED'
      );
    return active ?? null;
  },

  async findActiveByContent(
    tenantId: string,
    userId: string,
    contentItemId: ContentItemId
  ): Promise<TrackAttempt | null> {
    const active = Array.from(attempts.values())
      .find(a =>
        a.tenantId === tenantId &&
        a.userId === userId &&
        isTrackAttempt(a) &&
        a.contentItemId === contentItemId &&
        a.state !== 'COMPLETED' &&
        a.state !== 'ABANDONED'
      );
    return active as TrackAttempt | undefined ?? null;
  },

  async findByTrack(
    tenantId: string,
    track: Track,
    options?: { userId?: string; limit?: number }
  ): Promise<readonly TrackAttempt[]> {
    let result = Array.from(attempts.values())
      .filter(a =>
        a.tenantId === tenantId &&
        isTrackAttempt(a) &&
        a.track === track
      ) as TrackAttempt[];

    if (options?.userId) {
      result = result.filter(a => a.userId === options.userId);
    }

    result.sort((a, b) => b.startedAt.getTime() - a.startedAt.getTime());

    if (options?.limit) {
      result = result.slice(0, options.limit);
    }

    return result;
  },

  async save(attempt: LegacyAttempt): Promise<LegacyAttempt> {
    attempts.set(attempt.id, { ...attempt });
    return attempt;
  },

  async createTrackAttempt(params: CreateTrackAttemptParams): Promise<TrackAttempt> {
    const id = randomUUID();
    const now = new Date();

    // Calculate hint budget based on rung (lower rungs get more hints)
    const hintBudgetByRung: Record<number, number> = { 1: 6, 2: 5, 3: 4, 4: 3, 5: 2 };
    const hintBudget = hintBudgetByRung[params.rung] ?? 3;

    const attempt: TrackAttempt = {
      id,
      tenantId: params.tenantId,
      userId: params.userId,
      track: params.track,
      contentItemId: params.contentItemId,
      contentVersionId: params.contentVersionId ?? null,
      pattern: params.pattern,
      rung: params.rung,
      state: 'THINKING_GATE',
      steps: [],
      hintsUsed: [],
      codeSubmissions: 0,
      score: null,
      startedAt: now,
      completedAt: null,
      // V2 fields - defaults for track attempts
      mode: 'BEGINNER',
      v2Step: null, // null means legacy flow by default
      understandPayload: null,
      planPayload: null,
      verifyPayload: null,
      reflectPayload: null,
      hintBudget,
      hintsUsedCount: 0,
    };

    attempts.set(id, attempt);
    return attempt;
  },

  async update(attempt: Attempt): Promise<Attempt> {
    attempts.set(attempt.id, { ...attempt });
    return attempt;
  },
};

/**
 * In-Memory Skill Repository
 */
export const inMemorySkillRepo: SkillRepo = {
  async findByUserAndPattern(
    tenantId: string,
    userId: string,
    pattern: PatternId,
    rung: RungLevel
  ): Promise<SkillState | null> {
    const key = `${tenantId}:${userId}:${pattern}:${rung}`;
    return skills.get(key) ?? null;
  },

  async findAllByUser(tenantId: string, userId: string): Promise<readonly SkillState[]> {
    return Array.from(skills.values())
      .filter(s => s.tenantId === tenantId && s.userId === userId);
  },

  async getSkillMatrix(tenantId: string, userId: string): Promise<SkillMatrix> {
    const userSkills = await this.findAllByUser(tenantId, userId);
    return {
      userId,
      skills: userSkills,
    };
  },

  async save(skill: SkillState): Promise<SkillState> {
    const key = `${skill.tenantId}:${skill.userId}:${skill.pattern}:${skill.rung}`;
    skills.set(key, { ...skill });
    return skill;
  },

  async update(skill: SkillState): Promise<SkillState> {
    const key = `${skill.tenantId}:${skill.userId}:${skill.pattern}:${skill.rung}`;
    skills.set(key, { ...skill });
    return skill;
  },

  async upsert(skill: SkillState): Promise<SkillState> {
    const key = `${skill.tenantId}:${skill.userId}:${skill.pattern}:${skill.rung}`;
    skills.set(key, { ...skill });
    return skill;
  },

  async updateIfNotApplied(skill: SkillState, attemptId: string): Promise<IdempotentUpdateResult> {
    const key = `${skill.tenantId}:${skill.userId}:${skill.pattern}:${skill.rung}`;
    const existing = skills.get(key);

    // Check if this attempt was already applied
    if (existing?.lastAppliedAttemptId === attemptId) {
      return { skill: existing, wasApplied: false };
    }

    // Apply the update
    const updated = { ...skill, lastAppliedAttemptId: attemptId };
    skills.set(key, updated);
    return { skill: updated, wasApplied: true };
  },
};
