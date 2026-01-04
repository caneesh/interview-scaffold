import type { TenantId } from '../entities/tenant.js';
import type { SkillMatrix, SkillState } from '../entities/skill-state.js';
import type { PatternId, PATTERNS } from '../entities/pattern.js';
import type { RungLevel, RUNG_LEVELS } from '../entities/rung.js';
import type { SkillRepo } from '../ports/skill-repo.js';
import { isRungUnlockedForUser } from '../entities/skill-state.js';

export interface GetSkillMatrixInput {
  readonly tenantId: TenantId;
  readonly userId: string;
}

export interface GetSkillMatrixOutput {
  readonly matrix: SkillMatrix;
  readonly unlockedRungs: readonly UnlockedRung[];
  readonly recommendedNext: RecommendedNext | null;
}

export interface UnlockedRung {
  readonly pattern: PatternId;
  readonly rung: RungLevel;
  readonly score: number;
}

export interface RecommendedNext {
  readonly pattern: PatternId;
  readonly rung: RungLevel;
  readonly reason: string;
}

export interface GetSkillMatrixDeps {
  readonly skillRepo: SkillRepo;
}

export async function getSkillMatrix(
  input: GetSkillMatrixInput,
  deps: GetSkillMatrixDeps
): Promise<GetSkillMatrixOutput> {
  const { tenantId, userId } = input;
  const { skillRepo } = deps;

  const matrix = await skillRepo.getSkillMatrix(tenantId, userId);

  // Compute unlocked rungs
  const unlockedRungs: UnlockedRung[] = [];
  for (const skill of matrix.skills) {
    if (isRungUnlockedForUser(matrix.skills, skill.pattern, skill.rung)) {
      unlockedRungs.push({
        pattern: skill.pattern,
        rung: skill.rung,
        score: skill.score,
      });
    }
  }

  // Find recommended next
  const recommendedNext = findRecommendedNext(matrix.skills);

  return {
    matrix,
    unlockedRungs,
    recommendedNext,
  };
}

function findRecommendedNext(
  skills: readonly SkillState[]
): RecommendedNext | null {
  // Strategy: find the skill with lowest score that needs improvement
  let candidate: RecommendedNext | null = null;
  let lowestScore = 1.0;

  for (const skill of skills) {
    // Only recommend unlocked rungs
    if (!isRungUnlockedForUser(skills, skill.pattern, skill.rung)) {
      continue;
    }

    // Prefer skills below mastery threshold
    if (skill.score < 0.7 && skill.score < lowestScore) {
      lowestScore = skill.score;
      candidate = {
        pattern: skill.pattern,
        rung: skill.rung,
        reason: `Score ${Math.round(skill.score * 100)}% - needs practice`,
      };
    }
  }

  // If no skill below threshold, check for next unlockable rung
  if (!candidate) {
    for (const skill of skills) {
      if (skill.score >= 0.7 && skill.rung < 5) {
        const nextRung = (skill.rung + 1) as RungLevel;
        const hasNext = skills.some(
          (s) => s.pattern === skill.pattern && s.rung === nextRung
        );
        if (!hasNext) {
          return {
            pattern: skill.pattern,
            rung: nextRung,
            reason: `Ready to advance to rung ${nextRung}`,
          };
        }
      }
    }
  }

  return candidate;
}
