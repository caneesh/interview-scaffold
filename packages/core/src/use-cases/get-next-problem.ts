import type { TenantId } from '../entities/tenant.js';
import type { PatternId } from '../entities/pattern.js';
import type { RungLevel } from '../entities/rung.js';
import type { Problem } from '../entities/problem.js';
import type { ContentRepo } from '../ports/content-repo.js';
import type { SkillRepo } from '../ports/skill-repo.js';
import type { AttemptRepo } from '../ports/attempt-repo.js';
import { isRungUnlockedForUser, RUNG_UNLOCK_THRESHOLD } from '../entities/skill-state.js';
import { selectSibling, createSelectionSeed } from './select-sibling.js';
import { isLegacyAttempt } from '../entities/attempt.js';

export interface GetNextProblemInput {
  readonly tenantId: TenantId;
  readonly userId: string;
  readonly pattern?: PatternId;
  readonly rung?: RungLevel;
}

export interface GetNextProblemOutput {
  readonly problem: Problem | null;
  readonly reason: string;
}

export interface GetNextProblemDeps {
  readonly contentRepo: ContentRepo;
  readonly skillRepo: SkillRepo;
  readonly attemptRepo: AttemptRepo;
}

export async function getNextProblem(
  input: GetNextProblemInput,
  deps: GetNextProblemDeps
): Promise<GetNextProblemOutput> {
  const { tenantId, userId, pattern, rung } = input;
  const { contentRepo, skillRepo, attemptRepo } = deps;

  // Get user's skill matrix
  const skills = await skillRepo.findAllByUser(tenantId, userId);

  // Get user's recent attempts to avoid repeats
  // Only consider legacy attempts (with problemId) for problem selection
  const recentAttempts = await attemptRepo.findByUser(tenantId, userId, {
    limit: 10,
  });
  const recentProblemIds = new Set(
    recentAttempts
      .filter(isLegacyAttempt)
      .map((a) => a.problemId)
  );

  // If pattern and rung specified, check if unlocked
  if (pattern && rung) {
    if (!isRungUnlockedForUser(skills, pattern, rung)) {
      return {
        problem: null,
        reason: `Rung ${rung} for ${pattern} is not unlocked yet`,
      };
    }

    const problems = await contentRepo.findByPatternAndRung(
      tenantId,
      pattern,
      rung
    );

    // Use deterministic selection
    const seed = createSelectionSeed(userId, pattern, rung);
    const selection = selectSibling({
      candidates: problems,
      excludeProblemIds: [...recentProblemIds],
      seed,
      offset: recentAttempts.length,
    });

    if (!selection.problem) {
      return {
        problem: null,
        reason: `No new problems available for ${pattern} rung ${rung}`,
      };
    }

    return { problem: selection.problem, reason: selection.reason };
  }

  // Otherwise, find the best next problem based on skill gaps
  // Strategy: find lowest unlocked rung with score < mastery threshold
  for (const skill of skills) {
    if (skill.score < RUNG_UNLOCK_THRESHOLD) {
      const problems = await contentRepo.findByPatternAndRung(
        tenantId,
        skill.pattern,
        skill.rung
      );

      // Use deterministic selection
      const seed = createSelectionSeed(userId, skill.pattern, skill.rung);
      const selection = selectSibling({
        candidates: problems,
        excludeProblemIds: [...recentProblemIds],
        seed,
        offset: recentAttempts.length,
      });

      if (selection.problem) {
        return {
          problem: selection.problem,
          reason: `Practicing ${skill.pattern} rung ${skill.rung} (score: ${skill.score})`,
        };
      }
    }
  }

  // Default: start with first pattern, first rung
  // Only return rung 1 problems for new users (higher rungs are locked)
  const allProblems = await contentRepo.findAll(tenantId, { rung: 1, limit: 10 });
  const seed = createSelectionSeed(userId, 'default', 1);
  const selection = selectSibling({
    candidates: allProblems,
    excludeProblemIds: [...recentProblemIds],
    seed,
    offset: 0,
  });

  return {
    problem: selection.problem,
    reason: selection.problem ? 'Starting fresh' : 'No problems available',
  };
}
