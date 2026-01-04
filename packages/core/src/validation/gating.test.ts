import { describe, it, expect } from 'vitest';
import {
  makeGatingDecision,
  getMicroLesson,
  MICRO_LESSONS,
  type GatingContext,
} from './gating.js';
import type { ErrorEvent, RubricResult } from './types.js';

describe('Gating Rules', () => {
  const createContext = (overrides: Partial<GatingContext> = {}): GatingContext => ({
    pattern: 'SLIDING_WINDOW',
    rung: 1,
    rubric: { grade: 'PASS', score: 1, criteria: [] },
    errors: [],
    attemptCount: 1,
    hintsUsed: 0,
    previousFailures: [],
    ...overrides,
  });

  describe('makeGatingDecision', () => {
    describe('BLOCK_SUBMISSION - Forbidden concepts', () => {
      it('should block when forbidden concept with ERROR severity is detected', () => {
        const context = createContext({
          errors: [
            {
              type: 'FORBIDDEN_CONCEPT',
              severity: 'ERROR',
              message: 'Brute force approach detected',
            },
          ],
        });

        const decision = makeGatingDecision(context);
        expect(decision.action).toBe('BLOCK_SUBMISSION');
        expect(decision.reason).toContain('Forbidden concept');
      });

      it('should not block for WARNING severity forbidden concepts', () => {
        const context = createContext({
          rubric: { grade: 'PASS', score: 1, criteria: [] },
          errors: [
            {
              type: 'FORBIDDEN_CONCEPT',
              severity: 'WARNING',
              message: 'Consider a better approach',
            },
          ],
        });

        const decision = makeGatingDecision(context);
        expect(decision.action).not.toBe('BLOCK_SUBMISSION');
      });
    });

    describe('SHOW_MICRO_LESSON - Pattern-specific errors', () => {
      it('should show sliding window micro-lesson for nested loops', () => {
        const context = createContext({
          pattern: 'SLIDING_WINDOW',
          rubric: { grade: 'FAIL', score: 0, criteria: [] },
          errors: [
            {
              type: 'NESTED_LOOPS_DETECTED',
              severity: 'ERROR',
              message: 'O(n²) approach detected',
            },
          ],
        });

        const decision = makeGatingDecision(context);
        expect(decision.action).toBe('SHOW_MICRO_LESSON');
        expect(decision.microLessonId).toBe('sliding_window_intro');
      });

      it('should show shrink micro-lesson for wrong shrink mechanism', () => {
        const context = createContext({
          pattern: 'SLIDING_WINDOW',
          rubric: { grade: 'FAIL', score: 0, criteria: [] },
          errors: [
            {
              type: 'WRONG_SHRINK_MECHANISM',
              severity: 'WARNING',
              message: 'Using if instead of while',
            },
          ],
        });

        const decision = makeGatingDecision(context);
        expect(decision.action).toBe('SHOW_MICRO_LESSON');
        expect(decision.microLessonId).toBe('sliding_window_shrink');
      });

      it('should show DFS visited micro-lesson for missing visited check', () => {
        const context = createContext({
          pattern: 'DFS',
          rubric: { grade: 'FAIL', score: 0, criteria: [] },
          errors: [
            {
              type: 'MISSING_VISITED_CHECK',
              severity: 'ERROR',
              message: 'No visited tracking',
            },
          ],
        });

        const decision = makeGatingDecision(context);
        expect(decision.action).toBe('SHOW_MICRO_LESSON');
        expect(decision.microLessonId).toBe('dfs_visited_tracking');
      });

      it('should show backtracking micro-lesson for missing backtrack', () => {
        const context = createContext({
          pattern: 'DFS',
          rubric: { grade: 'FAIL', score: 0, criteria: [] },
          errors: [
            {
              type: 'MISSING_BACKTRACK',
              severity: 'ERROR',
              message: 'No backtrack found',
            },
          ],
        });

        const decision = makeGatingDecision(context);
        expect(decision.action).toBe('SHOW_MICRO_LESSON');
        expect(decision.microLessonId).toBe('dfs_backtracking');
      });

      it('should show struggle micro-lesson after 3+ attempts', () => {
        const context = createContext({
          rubric: { grade: 'PARTIAL', score: 0.5, criteria: [] },
          attemptCount: 3,
        });

        const decision = makeGatingDecision(context);
        expect(decision.action).toBe('SHOW_MICRO_LESSON');
        expect(decision.reason).toContain('Multiple attempts');
      });
    });

    describe('REQUIRE_REFLECTION', () => {
      it('should require reflection for repeated same error', () => {
        const context = createContext({
          rubric: { grade: 'FAIL', score: 0, criteria: [] },
          errors: [
            { type: 'WRONG_OUTPUT', severity: 'ERROR', message: 'Test failed' },
          ],
          previousFailures: ['WRONG_OUTPUT', 'WRONG_OUTPUT'],
        });

        const decision = makeGatingDecision(context);
        expect(decision.action).toBe('REQUIRE_REFLECTION');
        expect(decision.requiredReflectionType).toBe('error_analysis');
      });

      it('should require reflection after FAIL grade', () => {
        const context = createContext({
          rubric: { grade: 'FAIL', score: 0.2, criteria: [] },
        });

        const decision = makeGatingDecision(context);
        expect(decision.action).toBe('REQUIRE_REFLECTION');
        expect(decision.requiredReflectionType).toBe('failure_analysis');
      });
    });

    describe('PROCEED', () => {
      it('should proceed on PASS grade', () => {
        const context = createContext({
          rubric: { grade: 'PASS', score: 0.9, criteria: [] },
        });

        const decision = makeGatingDecision(context);
        expect(decision.action).toBe('PROCEED');
      });

      it('should proceed on PARTIAL with few hints', () => {
        const context = createContext({
          rubric: { grade: 'PARTIAL', score: 0.6, criteria: [] },
          hintsUsed: 1,
        });

        const decision = makeGatingDecision(context);
        expect(decision.action).toBe('PROCEED');
        expect(decision.reason).toContain('Partial credit');
      });

      it('should not proceed on PARTIAL with many hints', () => {
        const context = createContext({
          rubric: { grade: 'PARTIAL', score: 0.6, criteria: [] },
          hintsUsed: 5,
        });

        const decision = makeGatingDecision(context);
        // Should fall through to default reflection
        expect(decision.action).toBe('REQUIRE_REFLECTION');
      });
    });

    describe('Priority ordering', () => {
      it('should prioritize block over micro-lesson', () => {
        const context = createContext({
          pattern: 'SLIDING_WINDOW',
          errors: [
            { type: 'FORBIDDEN_CONCEPT', severity: 'ERROR', message: 'Blocked' },
            { type: 'NESTED_LOOPS_DETECTED', severity: 'ERROR', message: 'Nested' },
          ],
        });

        const decision = makeGatingDecision(context);
        expect(decision.action).toBe('BLOCK_SUBMISSION');
      });

      it('should prioritize micro-lesson over reflection', () => {
        const context = createContext({
          pattern: 'SLIDING_WINDOW',
          rubric: { grade: 'FAIL', score: 0, criteria: [] },
          errors: [
            { type: 'NESTED_LOOPS_DETECTED', severity: 'ERROR', message: 'Nested' },
          ],
        });

        const decision = makeGatingDecision(context);
        expect(decision.action).toBe('SHOW_MICRO_LESSON');
      });
    });
  });

  describe('getMicroLesson', () => {
    it('should return micro-lesson by id', () => {
      const lesson = getMicroLesson('sliding_window_intro');
      expect(lesson).toBeDefined();
      expect(lesson?.pattern).toBe('SLIDING_WINDOW');
      expect(lesson?.title).toBe('Sliding Window Fundamentals');
    });

    it('should return undefined for unknown id', () => {
      const lesson = getMicroLesson('unknown_lesson');
      expect(lesson).toBeUndefined();
    });

    it('should have examples for each lesson', () => {
      const lesson = getMicroLesson('sliding_window_shrink');
      expect(lesson?.examples.length).toBeGreaterThan(0);
      expect(lesson?.examples[0]?.before).toBeDefined();
      expect(lesson?.examples[0]?.after).toBeDefined();
    });
  });

  describe('MICRO_LESSONS', () => {
    it('should have lessons for sliding window pattern', () => {
      const swLessons = MICRO_LESSONS.filter(l => l.pattern === 'SLIDING_WINDOW');
      expect(swLessons.length).toBeGreaterThanOrEqual(2);
    });

    it('should have lessons for DFS pattern', () => {
      const dfsLessons = MICRO_LESSONS.filter(l => l.pattern === 'DFS');
      expect(dfsLessons.length).toBeGreaterThanOrEqual(2);
    });

    it('should have valid duration for all lessons', () => {
      for (const lesson of MICRO_LESSONS) {
        expect(['SHORT', 'MEDIUM', 'LONG']).toContain(lesson.duration);
      }
    });

    it('should have non-empty content for all lessons', () => {
      for (const lesson of MICRO_LESSONS) {
        expect(lesson.content.length).toBeGreaterThan(0);
        expect(lesson.title.length).toBeGreaterThan(0);
      }
    });
  });
});
