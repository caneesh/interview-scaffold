import { describe, it, expect, beforeEach } from 'vitest';
import {
  recommendNextProblem,
  getMotivationalMessage,
  problemCatalog,
  recommendationTypes,
} from './recommendationService';

describe('recommendationService', () => {
  describe('problemCatalog', () => {
    it('should contain multiple problems', () => {
      expect(problemCatalog.length).toBeGreaterThan(0);
    });

    it('should have valid structure for each problem', () => {
      problemCatalog.forEach((problem) => {
        expect(problem).toHaveProperty('id');
        expect(problem).toHaveProperty('title');
        expect(problem).toHaveProperty('difficulty');
        expect(problem).toHaveProperty('pattern');
        expect(['Easy', 'Medium', 'Hard']).toContain(problem.difficulty);
      });
    });

    it('should have unique problem IDs', () => {
      const ids = problemCatalog.map((p) => p.id);
      const uniqueIds = [...new Set(ids)];
      expect(ids.length).toBe(uniqueIds.length);
    });

    it('should have problems for multiple patterns', () => {
      const patterns = [...new Set(problemCatalog.map((p) => p.pattern))];
      expect(patterns.length).toBeGreaterThan(1);
    });
  });

  describe('recommendationTypes', () => {
    it('should have all required recommendation types', () => {
      expect(recommendationTypes).toHaveProperty('variation');
      expect(recommendationTypes).toHaveProperty('newTopic');
      expect(recommendationTypes).toHaveProperty('reinforcement');
      expect(recommendationTypes).toHaveProperty('easyWin');
      expect(recommendationTypes).toHaveProperty('stretch');
    });

    it('should have valid structure for each type', () => {
      Object.values(recommendationTypes).forEach((type) => {
        expect(type).toHaveProperty('type');
        expect(type).toHaveProperty('emoji');
        expect(type).toHaveProperty('label');
        expect(type).toHaveProperty('color');
        expect(type).toHaveProperty('description');
      });
    });
  });

  describe('recommendNextProblem', () => {
    const baseProblemId = 'problem_101'; // Detect Cycle in Linked List

    it('should return a recommendation object with required properties', () => {
      const result = recommendNextProblem({
        currentProblemId: baseProblemId,
        hintsUsed: 2,
        timeSpentMinutes: 15,
        completedProblemIds: [baseProblemId],
      });

      expect(result).toHaveProperty('problem');
      expect(result).toHaveProperty('type');
      expect(result).toHaveProperty('reason');
      expect(result).toHaveProperty('confidence');
    });

    it('should not recommend the same problem that was just completed', () => {
      const result = recommendNextProblem({
        currentProblemId: baseProblemId,
        hintsUsed: 0,
        timeSpentMinutes: 10,
        completedProblemIds: [baseProblemId],
      });

      expect(result.problem.id).not.toBe(baseProblemId);
    });

    it('should not recommend already completed problems', () => {
      const completedIds = ['problem_101', 'problem_102', 'problem_103'];
      const result = recommendNextProblem({
        currentProblemId: 'problem_101',
        hintsUsed: 2,
        timeSpentMinutes: 15,
        completedProblemIds: completedIds,
      });

      expect(completedIds).not.toContain(result.problem.id);
    });

    describe('performance-based recommendations', () => {
      it('should recommend reinforcement when user is struggling (many hints)', () => {
        const result = recommendNextProblem({
          currentProblemId: baseProblemId,
          hintsUsed: 10, // Many hints = struggling
          timeSpentMinutes: 30, // Long time
          completedProblemIds: [baseProblemId],
        });

        // Should recommend same pattern for reinforcement
        const currentProblem = problemCatalog.find((p) => p.id === baseProblemId);
        expect(result.problem.pattern).toBe(currentProblem.pattern);
      });

      it('should recommend same or easier difficulty when struggling', () => {
        const result = recommendNextProblem({
          currentProblemId: baseProblemId, // Medium difficulty
          hintsUsed: 10,
          timeSpentMinutes: 30,
          completedProblemIds: [baseProblemId],
        });

        const difficulties = { Easy: 1, Medium: 2, Hard: 3 };
        const currentDifficulty = difficulties['Medium'];
        const recommendedDifficulty = difficulties[result.problem.difficulty];

        expect(recommendedDifficulty).toBeLessThanOrEqual(currentDifficulty);
      });

      it('should recommend challenge when user is excelling (no hints, fast)', () => {
        const result = recommendNextProblem({
          currentProblemId: baseProblemId,
          hintsUsed: 0, // No hints = excelling
          timeSpentMinutes: 5, // Fast completion
          completedProblemIds: [baseProblemId],
        });

        // Should recommend variation or new topic (excelling user gets challenged)
        expect(['variation', 'newTopic', 'reinforcement']).toContain(result.type.type);
      });
    });

    describe('fallback behavior', () => {
      it('should return a valid recommendation even with unknown problem ID', () => {
        const result = recommendNextProblem({
          currentProblemId: 'unknown_problem_id',
          hintsUsed: 0,
          timeSpentMinutes: 10,
          completedProblemIds: [],
        });

        expect(result).toHaveProperty('problem');
        expect(result.problem).toBeTruthy();
      });

      it('should return a recommendation when most problems are completed', () => {
        const allButOne = problemCatalog.slice(0, -1).map((p) => p.id);
        const result = recommendNextProblem({
          currentProblemId: allButOne[0],
          hintsUsed: 2,
          timeSpentMinutes: 15,
          completedProblemIds: allButOne,
        });

        expect(result).toHaveProperty('problem');
      });
    });

    describe('confidence scores', () => {
      it('should return confidence between 0 and 1', () => {
        const result = recommendNextProblem({
          currentProblemId: baseProblemId,
          hintsUsed: 2,
          timeSpentMinutes: 15,
          completedProblemIds: [baseProblemId],
        });

        expect(result.confidence).toBeGreaterThanOrEqual(0);
        expect(result.confidence).toBeLessThanOrEqual(1);
      });
    });

    describe('reason messages', () => {
      it('should provide a non-empty reason string', () => {
        const result = recommendNextProblem({
          currentProblemId: baseProblemId,
          hintsUsed: 2,
          timeSpentMinutes: 15,
          completedProblemIds: [baseProblemId],
        });

        expect(typeof result.reason).toBe('string');
        expect(result.reason.length).toBeGreaterThan(0);
      });
    });
  });

  describe('getMotivationalMessage', () => {
    it('should return flawless message for 0 hints', () => {
      const result = getMotivationalMessage(0, 5);

      expect(result.emoji).toBe('🏆');
      expect(result.title).toBe('Flawless Victory!');
    });

    it('should return excellent message for few hints', () => {
      const result = getMotivationalMessage(2, 5); // 2 hints for 5 steps = low ratio

      expect(result.emoji).toBe('🌟');
      expect(result.title).toBe('Excellent Work!');
    });

    it('should return great job message for moderate hints', () => {
      const result = getMotivationalMessage(6, 5); // moderate ratio

      expect(result.emoji).toBe('💪');
      expect(result.title).toBe('Great Job!');
    });

    it('should return keep growing message for many hints', () => {
      const result = getMotivationalMessage(15, 5); // high ratio

      expect(result.emoji).toBe('📈');
      expect(result.title).toBe('Keep Growing!');
    });

    it('should always return a valid message structure', () => {
      [0, 1, 5, 10, 20].forEach((hintsUsed) => {
        const result = getMotivationalMessage(hintsUsed, 5);

        expect(result).toHaveProperty('emoji');
        expect(result).toHaveProperty('title');
        expect(result).toHaveProperty('message');
        expect(result.message.length).toBeGreaterThan(0);
      });
    });
  });
});

describe('Pattern-based recommendations', () => {
  it('should have problems for two-pointers pattern', () => {
    const twoPointerProblems = problemCatalog.filter(
      (p) => p.pattern === 'two-pointers'
    );
    expect(twoPointerProblems.length).toBeGreaterThan(0);
  });

  it('should have problems for sliding-window pattern', () => {
    const slidingWindowProblems = problemCatalog.filter(
      (p) => p.pattern === 'sliding-window'
    );
    expect(slidingWindowProblems.length).toBeGreaterThan(0);
  });

  it('should have problems for binary-search pattern', () => {
    const binarySearchProblems = problemCatalog.filter(
      (p) => p.pattern === 'binary-search'
    );
    expect(binarySearchProblems.length).toBeGreaterThan(0);
  });

  it('should have problems for dfs-bfs pattern', () => {
    const dfsBfsProblems = problemCatalog.filter(
      (p) => p.pattern === 'dfs-bfs'
    );
    expect(dfsBfsProblems.length).toBeGreaterThan(0);
  });

  it('should have problems for dynamic-programming pattern', () => {
    const dpProblems = problemCatalog.filter(
      (p) => p.pattern === 'dynamic-programming'
    );
    expect(dpProblems.length).toBeGreaterThan(0);
  });
});

describe('Difficulty distribution', () => {
  it('should have Easy problems', () => {
    const easyProblems = problemCatalog.filter((p) => p.difficulty === 'Easy');
    expect(easyProblems.length).toBeGreaterThan(0);
  });

  it('should have Medium problems', () => {
    const mediumProblems = problemCatalog.filter((p) => p.difficulty === 'Medium');
    expect(mediumProblems.length).toBeGreaterThan(0);
  });

  it('should have Hard problems', () => {
    const hardProblems = problemCatalog.filter((p) => p.difficulty === 'Hard');
    expect(hardProblems.length).toBeGreaterThan(0);
  });
});
