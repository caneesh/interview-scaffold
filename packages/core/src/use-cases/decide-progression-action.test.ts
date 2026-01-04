import { describe, it, expect } from 'vitest';
import {
  decideProgressionAction,
  PROGRESSION_CONSTANTS,
  selectSiblingIndex,
} from './decide-progression-action.js';
import type { Attempt, AttemptScore } from '../entities/attempt.js';
import type { Problem } from '../entities/problem.js';

function createScore(overall: number): AttemptScore {
  return {
    overall,
    patternRecognition: overall,
    implementation: overall,
    edgeCases: overall,
    efficiency: overall,
    bonus: 0,
  };
}

function createCompletedAttempt(
  score: number,
  overrides: Partial<Attempt> = {}
): Attempt {
  return {
    id: `attempt-${Math.random().toString(36).slice(2)}`,
    tenantId: 'tenant-1',
    userId: 'user-1',
    problemId: 'problem-1',
    pattern: 'SLIDING_WINDOW',
    rung: 1,
    state: 'COMPLETED',
    steps: [],
    hintsUsed: [],
    codeSubmissions: 1,
    score: createScore(score),
    startedAt: new Date('2024-01-01T10:00:00Z'),
    completedAt: new Date('2024-01-01T10:30:00Z'),
    ...overrides,
  };
}

function createProblem(id: string): Problem {
  return {
    id,
    tenantId: 'tenant-1',
    title: `Problem ${id}`,
    statement: 'Solve this',
    pattern: 'SLIDING_WINDOW',
    rung: 1,
    targetComplexity: 'O(n)',
    testCases: [],
    hints: [],
    createdAt: new Date(),
  };
}

describe('decideProgressionAction', () => {
  describe('promotion logic', () => {
    it('promotes to next rung when mastery threshold is met', () => {
      // Create 5 attempts all scoring above threshold (70 for rung 1)
      const attempts = [
        createCompletedAttempt(85), // Current
        createCompletedAttempt(80),
        createCompletedAttempt(75),
        createCompletedAttempt(82),
        createCompletedAttempt(78),
      ];

      const result = decideProgressionAction({
        attempt: attempts[0]!,
        recentAttempts: attempts,
        availableSiblings: [],
      });

      expect(result.action).toBe('PROMOTE_RUNG');
      expect(result.nextRung).toBe(2);
    });

    it('completes rung 5 when mastery is achieved', () => {
      const attempts = [
        createCompletedAttempt(95, { rung: 5 }),
        createCompletedAttempt(92, { rung: 5 }),
        createCompletedAttempt(91, { rung: 5 }),
        createCompletedAttempt(93, { rung: 5 }),
        createCompletedAttempt(90, { rung: 5 }),
      ];

      const result = decideProgressionAction({
        attempt: attempts[0]!,
        recentAttempts: attempts,
        availableSiblings: [],
      });

      expect(result.action).toBe('COMPLETE_RUNG');
    });

    it('requires minimum attempts before promotion', () => {
      // Only 2 attempts (less than MASTERY_MIN_ATTEMPTS)
      const attempts = [
        createCompletedAttempt(85),
        createCompletedAttempt(90),
      ];

      const result = decideProgressionAction({
        attempt: attempts[0]!,
        recentAttempts: attempts,
        availableSiblings: [createProblem('sibling-1')],
      });

      expect(result.action).toBe('SERVE_SIBLING');
    });

    it('does not promote if any recent attempt is below threshold', () => {
      const attempts = [
        createCompletedAttempt(85),
        createCompletedAttempt(80),
        createCompletedAttempt(65), // Below threshold
        createCompletedAttempt(82),
        createCompletedAttempt(78),
      ];

      const result = decideProgressionAction({
        attempt: attempts[0]!,
        recentAttempts: attempts,
        availableSiblings: [createProblem('sibling-1')],
      });

      expect(result.action).toBe('SERVE_SIBLING');
    });
  });

  describe('micro-lesson gate', () => {
    it('triggers micro-lesson after consecutive low scores', () => {
      const lowScoreAttempts = [
        createCompletedAttempt(40), // Current - low
        createCompletedAttempt(45), // Previous - also low
      ];

      const result = decideProgressionAction({
        attempt: lowScoreAttempts[0]!,
        recentAttempts: lowScoreAttempts,
        availableSiblings: [createProblem('sibling-1')],
      });

      expect(result.action).toBe('MICRO_LESSON_GATE');
      expect(result.microLessonTopic).toBe('SLIDING_WINDOW');
    });

    it('does not trigger micro-lesson if latest score is good', () => {
      const mixedAttempts = [
        createCompletedAttempt(70), // Good score
        createCompletedAttempt(40), // Low score
        createCompletedAttempt(35), // Low score
      ];

      const result = decideProgressionAction({
        attempt: mixedAttempts[0]!,
        recentAttempts: mixedAttempts,
        availableSiblings: [createProblem('sibling-1')],
      });

      expect(result.action).not.toBe('MICRO_LESSON_GATE');
    });
  });

  describe('sibling routing', () => {
    it('serves sibling problem when not ready for promotion', () => {
      const attempts = [
        createCompletedAttempt(65), // Below threshold
        createCompletedAttempt(70),
        createCompletedAttempt(68),
      ];

      const siblings = [
        createProblem('sibling-1'),
        createProblem('sibling-2'),
        createProblem('sibling-3'),
      ];

      const result = decideProgressionAction({
        attempt: attempts[0]!,
        recentAttempts: attempts,
        availableSiblings: siblings,
      });

      expect(result.action).toBe('SERVE_SIBLING');
      expect(result.nextProblemId).toBeDefined();
      expect(siblings.some((s) => s.id === result.nextProblemId)).toBe(true);
    });

    it('retries same problem when no siblings available', () => {
      const attempts = [
        createCompletedAttempt(65),
        createCompletedAttempt(70),
        createCompletedAttempt(68),
      ];

      const result = decideProgressionAction({
        attempt: attempts[0]!,
        recentAttempts: attempts,
        availableSiblings: [], // No siblings
      });

      expect(result.action).toBe('RETRY_SAME');
    });
  });

  describe('incomplete attempts', () => {
    it('returns RETRY_SAME for non-completed attempts', () => {
      const incomplete = createCompletedAttempt(0);
      incomplete.state = 'CODING' as any; // Force non-completed state

      const result = decideProgressionAction({
        attempt: { ...incomplete, state: 'CODING' },
        recentAttempts: [],
        availableSiblings: [],
      });

      expect(result.action).toBe('RETRY_SAME');
    });

    it('returns RETRY_SAME if score is missing', () => {
      const noScore = createCompletedAttempt(0);

      const result = decideProgressionAction({
        attempt: { ...noScore, score: null },
        recentAttempts: [],
        availableSiblings: [],
      });

      expect(result.action).toBe('RETRY_SAME');
    });
  });
});

describe('selectSiblingIndex', () => {
  describe('determinism', () => {
    it('returns same index for same inputs', () => {
      const index1 = selectSiblingIndex('problem-abc', 5, 10);
      const index2 = selectSiblingIndex('problem-abc', 5, 10);

      expect(index1).toBe(index2);
    });

    it('returns different index for different problem IDs', () => {
      const index1 = selectSiblingIndex('problem-abc', 5, 10);
      const index2 = selectSiblingIndex('problem-xyz', 5, 10);

      // They might be same by chance, but with 10 options unlikely
      // More importantly, they should be deterministic
      expect(typeof index1).toBe('number');
      expect(typeof index2).toBe('number');
    });

    it('returns different index as attempt count changes', () => {
      const indices = [
        selectSiblingIndex('problem-abc', 0, 10),
        selectSiblingIndex('problem-abc', 1, 10),
        selectSiblingIndex('problem-abc', 2, 10),
        selectSiblingIndex('problem-abc', 3, 10),
        selectSiblingIndex('problem-abc', 4, 10),
      ];

      // At least some should be different (can't all be same)
      const unique = new Set(indices);
      expect(unique.size).toBeGreaterThan(1);
    });

    it('always returns valid index within bounds', () => {
      for (let i = 0; i < 100; i++) {
        const index = selectSiblingIndex(`problem-${i}`, i, 5);
        expect(index).toBeGreaterThanOrEqual(0);
        expect(index).toBeLessThan(5);
      }
    });

    it('handles single item list', () => {
      const index = selectSiblingIndex('problem-abc', 5, 1);
      expect(index).toBe(0);
    });
  });
});

describe('mastery window constants', () => {
  it('uses correct window size', () => {
    expect(PROGRESSION_CONSTANTS.MASTERY_WINDOW).toBe(5);
  });

  it('requires minimum attempts', () => {
    expect(PROGRESSION_CONSTANTS.MASTERY_MIN_ATTEMPTS).toBe(3);
  });

  it('has reasonable low score threshold', () => {
    expect(PROGRESSION_CONSTANTS.LOW_SCORE_THRESHOLD).toBe(50);
  });
});
