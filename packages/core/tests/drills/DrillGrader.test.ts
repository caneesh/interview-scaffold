import { describe, it, expect } from 'vitest';
import {
  gradeDrill,
  selectDrillsForErrorTypes,
  calculateDrillProgress,
} from '../../src/drills/DrillGrader.js';
import type {
  MCQDrill,
  ShortTextDrill,
  TrueFalseDrill,
  DrillResult,
  Drill,
} from '../../src/drills/types.js';
import { DRILL_CONSTANTS } from '../../src/drills/types.js';
import { MicroDrillId, PatternId } from '../../src/entities/types.js';

describe('DrillGrader', () => {
  describe('MCQ Grading', () => {
    const createMCQDrill = (): MCQDrill => ({
      id: MicroDrillId('drill-1'),
      format: 'MCQ',
      question: 'What pattern is best for finding a contiguous subarray?',
      options: [
        { id: '0', text: 'Two Pointers', isCorrect: false },
        { id: '1', text: 'Sliding Window', isCorrect: true, explanation: 'Sliding window is optimal for contiguous subarrays.' },
        { id: '2', text: 'Binary Search', isCorrect: false },
        { id: '3', text: 'Hash Map', isCorrect: false },
      ],
      patternId: PatternId('sliding-window'),
      targetErrorType: 'PATTERN_MISAPPLY',
      difficulty: 'EASY',
      estimatedTimeSec: 30,
    });

    it('should grade correct MCQ answer', () => {
      const drill = createMCQDrill();
      const result = gradeDrill(drill, {
        drillId: drill.id,
        answer: '1',
        timeTakenSec: 20,
      });

      expect(result.isCorrect).toBe(true);
      expect(result.score).toBe(DRILL_CONSTANTS.PASS_SCORE);
      expect(result.correctAnswer).toBe('1');
    });

    it('should grade incorrect MCQ answer', () => {
      const drill = createMCQDrill();
      const result = gradeDrill(drill, {
        drillId: drill.id,
        answer: '0',
        timeTakenSec: 20,
      });

      expect(result.isCorrect).toBe(false);
      expect(result.score).toBe(0);
    });

    it('should include explanation for correct answer', () => {
      const drill = createMCQDrill();
      const result = gradeDrill(drill, {
        drillId: drill.id,
        answer: '1',
        timeTakenSec: 20,
      });

      expect(result.explanation).toBeDefined();
      expect(result.explanation).toContain('optimal');
    });
  });

  describe('Short Text Grading', () => {
    const createShortTextDrill = (): ShortTextDrill => ({
      id: MicroDrillId('drill-2'),
      format: 'SHORT_TEXT',
      question: 'What is the time complexity of sliding window?',
      acceptedAnswers: ['O(n)', 'O(N)', 'linear', 'Linear'],
      caseSensitive: false,
      patternId: PatternId('sliding-window'),
      targetErrorType: 'INCORRECT_COMPLEXITY',
      difficulty: 'MEDIUM',
      estimatedTimeSec: 45,
    });

    it('should accept correct answer case-insensitively', () => {
      const drill = createShortTextDrill();
      const result = gradeDrill(drill, {
        drillId: drill.id,
        answer: 'o(n)',
        timeTakenSec: 30,
      });

      expect(result.isCorrect).toBe(true);
    });

    it('should accept alternative correct answers', () => {
      const drill = createShortTextDrill();
      const result = gradeDrill(drill, {
        drillId: drill.id,
        answer: 'linear',
        timeTakenSec: 30,
      });

      expect(result.isCorrect).toBe(true);
    });

    it('should reject incorrect answer', () => {
      const drill = createShortTextDrill();
      const result = gradeDrill(drill, {
        drillId: drill.id,
        answer: 'O(n^2)',
        timeTakenSec: 30,
      });

      expect(result.isCorrect).toBe(false);
    });
  });

  describe('True/False Grading', () => {
    const createTrueFalseDrill = (): TrueFalseDrill => ({
      id: MicroDrillId('drill-3'),
      format: 'TRUE_FALSE',
      statement: 'Sliding window always uses two pointers.',
      correctAnswer: true,
      explanation: 'Sliding window uses left and right pointers to define the window.',
      patternId: PatternId('sliding-window'),
      targetErrorType: null,
      difficulty: 'EASY',
      estimatedTimeSec: 15,
    });

    it('should grade correct true/false answer', () => {
      const drill = createTrueFalseDrill();
      const result = gradeDrill(drill, {
        drillId: drill.id,
        answer: true,
        timeTakenSec: 10,
      });

      expect(result.isCorrect).toBe(true);
    });

    it('should accept string "true" as true', () => {
      const drill = createTrueFalseDrill();
      const result = gradeDrill(drill, {
        drillId: drill.id,
        answer: 'true',
        timeTakenSec: 10,
      });

      expect(result.isCorrect).toBe(true);
    });

    it('should include explanation', () => {
      const drill = createTrueFalseDrill();
      const result = gradeDrill(drill, {
        drillId: drill.id,
        answer: true,
        timeTakenSec: 10,
      });

      expect(result.explanation).toBeDefined();
    });
  });

  describe('Time Penalty', () => {
    it('should apply no penalty within estimated time', () => {
      const drill: MCQDrill = {
        id: MicroDrillId('drill-4'),
        format: 'MCQ',
        question: 'Test',
        options: [{ id: '0', text: 'Correct', isCorrect: true }],
        patternId: PatternId('two-pointers'),
        targetErrorType: null,
        difficulty: 'EASY',
        estimatedTimeSec: 30,
      };

      const result = gradeDrill(drill, {
        drillId: drill.id,
        answer: '0',
        timeTakenSec: 25,
      });

      expect(result.score).toBe(100);
    });

    it('should apply penalty for overtime', () => {
      const drill: MCQDrill = {
        id: MicroDrillId('drill-5'),
        format: 'MCQ',
        question: 'Test',
        options: [{ id: '0', text: 'Correct', isCorrect: true }],
        patternId: PatternId('two-pointers'),
        targetErrorType: null,
        difficulty: 'EASY',
        estimatedTimeSec: 30,
      };

      const result = gradeDrill(drill, {
        drillId: drill.id,
        answer: '0',
        timeTakenSec: 50, // 20 seconds over
      });

      // 2 intervals of 10 seconds = 10% penalty
      expect(result.score).toBe(90);
    });
  });

  describe('selectDrillsForErrorTypes', () => {
    const drills: Drill[] = [
      {
        id: MicroDrillId('d1'),
        format: 'MCQ',
        question: 'Q1',
        options: [],
        patternId: PatternId('two-pointers'),
        targetErrorType: 'NESTED_LOOP_IN_SLIDING_WINDOW',
        difficulty: 'HARD',
        estimatedTimeSec: 60,
      },
      {
        id: MicroDrillId('d2'),
        format: 'MCQ',
        question: 'Q2',
        options: [],
        patternId: PatternId('two-pointers'),
        targetErrorType: 'NESTED_LOOP_IN_SLIDING_WINDOW',
        difficulty: 'EASY',
        estimatedTimeSec: 30,
      },
      {
        id: MicroDrillId('d3'),
        format: 'MCQ',
        question: 'Q3',
        options: [],
        patternId: PatternId('two-pointers'),
        targetErrorType: 'MISSING_VISITED_SET',
        difficulty: 'MEDIUM',
        estimatedTimeSec: 45,
      },
    ];

    it('should select drills matching error types', () => {
      const selected = selectDrillsForErrorTypes(drills, ['NESTED_LOOP_IN_SLIDING_WINDOW']);

      expect(selected.length).toBe(2);
      expect(selected.every(d => d.targetErrorType === 'NESTED_LOOP_IN_SLIDING_WINDOW')).toBe(true);
    });

    it('should sort by difficulty (easier first)', () => {
      const selected = selectDrillsForErrorTypes(drills, ['NESTED_LOOP_IN_SLIDING_WINDOW']);

      expect(selected[0]?.difficulty).toBe('EASY');
      expect(selected[1]?.difficulty).toBe('HARD');
    });

    it('should respect limit', () => {
      const selected = selectDrillsForErrorTypes(drills, ['NESTED_LOOP_IN_SLIDING_WINDOW'], 1);

      expect(selected.length).toBe(1);
    });
  });

  describe('calculateDrillProgress', () => {
    it('should calculate empty progress', () => {
      const progress = calculateDrillProgress([]);

      expect(progress.totalAttempts).toBe(0);
      expect(progress.accuracy).toBe(0);
      expect(progress.needsReinforcement).toBe(true);
    });

    it('should calculate progress with attempts', () => {
      const results: DrillResult[] = [
        { drillId: MicroDrillId('d1'), isCorrect: true, score: 100, feedback: '', correctAnswer: '', timeTakenSec: 30 },
        { drillId: MicroDrillId('d1'), isCorrect: true, score: 100, feedback: '', correctAnswer: '', timeTakenSec: 25 },
        { drillId: MicroDrillId('d1'), isCorrect: false, score: 0, feedback: '', correctAnswer: '', timeTakenSec: 40 },
      ];

      const progress = calculateDrillProgress(results);

      expect(progress.totalAttempts).toBe(3);
      expect(progress.correctAttempts).toBe(2);
      expect(progress.accuracy).toBeCloseTo(0.67, 1);
      expect(progress.needsReinforcement).toBe(true); // < 80%
    });

    it('should not need reinforcement at 80%+ accuracy', () => {
      const results: DrillResult[] = [
        { drillId: MicroDrillId('d1'), isCorrect: true, score: 100, feedback: '', correctAnswer: '', timeTakenSec: 30 },
        { drillId: MicroDrillId('d1'), isCorrect: true, score: 100, feedback: '', correctAnswer: '', timeTakenSec: 25 },
        { drillId: MicroDrillId('d1'), isCorrect: true, score: 100, feedback: '', correctAnswer: '', timeTakenSec: 28 },
        { drillId: MicroDrillId('d1'), isCorrect: true, score: 100, feedback: '', correctAnswer: '', timeTakenSec: 32 },
        { drillId: MicroDrillId('d1'), isCorrect: false, score: 0, feedback: '', correctAnswer: '', timeTakenSec: 40 },
      ];

      const progress = calculateDrillProgress(results);

      expect(progress.accuracy).toBe(0.8);
      expect(progress.needsReinforcement).toBe(false);
    });
  });
});
