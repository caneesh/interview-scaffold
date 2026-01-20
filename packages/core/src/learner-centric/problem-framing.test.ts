import { describe, it, expect } from 'vitest';
import {
  assessAnswerQuality,
  generateInitialQuestions,
  generateFollowUpQuestions,
  calculateUnderstandingScore,
  isFramingComplete,
  processFramingAnswer,
  createInitialFramingData,
  MAX_QUESTIONS_PER_BATCH,
  UNDERSTANDING_THRESHOLD,
} from './problem-framing.js';
import type { ProblemFramingData, ProblemFramingQuestion } from './types.js';
import type { Problem } from '../entities/problem.js';

// Test fixtures
const mockProblem: Problem = {
  id: 'test-problem-1',
  tenantId: 'test-tenant',
  title: 'Two Sum',
  statement: 'Given an array of integers nums and an integer target, return indices of the two numbers such that they add up to target.',
  pattern: 'TWO_POINTERS',
  rung: 1,
  targetComplexity: 'O(n)',
  testCases: [],
  hints: [],
  createdAt: new Date(),
};

describe('Problem Framing Module', () => {
  describe('assessAnswerQuality', () => {
    it('should classify very short answers as SHALLOW', () => {
      const quality = assessAnswerQuality('idk', 'What is the input?', 'INPUT_OUTPUT');
      expect(quality).toBe('SHALLOW');
    });

    it('should classify short answers as SHALLOW', () => {
      const quality = assessAnswerQuality('an array', 'What is the input?', 'INPUT_OUTPUT');
      expect(quality).toBe('SHALLOW');
    });

    it('should classify answers with many filler phrases as SHALLOW', () => {
      const quality = assessAnswerQuality(
        'I think maybe probably it is something like an array idk',
        'What is the input?',
        'INPUT_OUTPUT'
      );
      expect(quality).toBe('SHALLOW');
    });

    it('should classify substantive answers as ADEQUATE', () => {
      const quality = assessAnswerQuality(
        'The input is an array of integers because we need to find pairs',
        'What is the input?',
        'INPUT_OUTPUT'
      );
      expect(quality).toBe('ADEQUATE');
    });

    it('should classify detailed answers with engagement keywords as DEEP', () => {
      const quality = assessAnswerQuality(
        'The input is an array of integers and a target sum. Because we need to find two numbers that add up to the target, this implies we need to check pairs. The constraint means we should look for an efficient approach.',
        'What is the input?',
        'INPUT_OUTPUT'
      );
      expect(quality).toBe('DEEP');
    });
  });

  describe('generateInitialQuestions', () => {
    it('should generate at most MAX_QUESTIONS_PER_BATCH questions', () => {
      const questions = generateInitialQuestions(mockProblem);
      expect(questions.length).toBeLessThanOrEqual(MAX_QUESTIONS_PER_BATCH);
    });

    it('should generate questions with different categories', () => {
      const questions = generateInitialQuestions(mockProblem);
      const categories = new Set(questions.map(q => q.category));
      expect(categories.size).toBeGreaterThan(1);
    });

    it('should not repeat asked categories', () => {
      const asked = ['INPUT_OUTPUT', 'CONSTRAINTS'] as const;
      const questions = generateInitialQuestions(mockProblem, asked);
      const categories = questions.map(q => q.category);
      expect(categories).not.toContain('INPUT_OUTPUT');
      expect(categories).not.toContain('CONSTRAINTS');
    });
  });

  describe('generateFollowUpQuestions', () => {
    it('should generate follow-ups for shallow answers', () => {
      const shallowQuestions: ProblemFramingQuestion[] = [
        {
          id: 'q1',
          question: 'What is the input?',
          category: 'INPUT_OUTPUT',
          userAnswer: 'an array',
          answerQuality: 'SHALLOW',
          followUpQuestion: null,
          timestamp: new Date(),
        },
      ];
      const followUps = generateFollowUpQuestions(shallowQuestions, mockProblem);
      expect(followUps.length).toBeGreaterThan(0);
    });

    it('should not generate follow-ups for adequate/deep answers', () => {
      const goodQuestions: ProblemFramingQuestion[] = [
        {
          id: 'q1',
          question: 'What is the input?',
          category: 'INPUT_OUTPUT',
          userAnswer: 'an array of integers and a target sum',
          answerQuality: 'ADEQUATE',
          followUpQuestion: null,
          timestamp: new Date(),
        },
      ];
      const followUps = generateFollowUpQuestions(goodQuestions, mockProblem);
      expect(followUps.length).toBe(0);
    });
  });

  describe('calculateUnderstandingScore', () => {
    it('should return 0 for no answered questions', () => {
      const score = calculateUnderstandingScore([]);
      expect(score).toBe(0);
    });

    it('should return low score for all shallow answers', () => {
      const questions: ProblemFramingQuestion[] = [
        { id: 'q1', question: '', category: 'INPUT_OUTPUT', userAnswer: 'x', answerQuality: 'SHALLOW', followUpQuestion: null, timestamp: new Date() },
        { id: 'q2', question: '', category: 'CONSTRAINTS', userAnswer: 'x', answerQuality: 'SHALLOW', followUpQuestion: null, timestamp: new Date() },
      ];
      const score = calculateUnderstandingScore(questions);
      expect(score).toBeLessThan(0.3);
    });

    it('should return high score for all deep answers', () => {
      const questions: ProblemFramingQuestion[] = [
        { id: 'q1', question: '', category: 'INPUT_OUTPUT', userAnswer: 'detailed answer', answerQuality: 'DEEP', followUpQuestion: null, timestamp: new Date() },
        { id: 'q2', question: '', category: 'CONSTRAINTS', userAnswer: 'detailed answer', answerQuality: 'DEEP', followUpQuestion: null, timestamp: new Date() },
      ];
      const score = calculateUnderstandingScore(questions);
      expect(score).toBe(1);
    });
  });

  describe('isFramingComplete', () => {
    it('should return true when understanding score meets threshold', () => {
      const data: ProblemFramingData = {
        questions: [],
        currentQuestionBatch: [],
        isComplete: false,
        understandingScore: UNDERSTANDING_THRESHOLD + 0.1,
      };
      expect(isFramingComplete(data)).toBe(true);
    });

    it('should return false when score is below threshold', () => {
      const data: ProblemFramingData = {
        questions: [],
        currentQuestionBatch: [],
        isComplete: false,
        understandingScore: UNDERSTANDING_THRESHOLD - 0.1,
      };
      expect(isFramingComplete(data)).toBe(false);
    });
  });

  describe('processFramingAnswer', () => {
    it('should update question with answer and quality', () => {
      const data = createInitialFramingData(mockProblem);
      const questionId = data.questions[0]?.id ?? '';

      const result = processFramingAnswer(
        { problem: mockProblem, questionId, answer: 'The input is an array of integers because we need pairs' },
        data
      );

      expect(result.quality).toBe('ADEQUATE');
      expect(result.understandingScore).toBeGreaterThan(0);
    });

    it('should generate follow-up for shallow answer', () => {
      const data = createInitialFramingData(mockProblem);
      const questionId = data.questions[0]?.id ?? '';

      const result = processFramingAnswer(
        { problem: mockProblem, questionId, answer: 'idk' },
        data
      );

      expect(result.quality).toBe('SHALLOW');
      expect(result.followUp).not.toBeNull();
    });

    it('should throw error for unknown question ID', () => {
      const data = createInitialFramingData(mockProblem);

      expect(() =>
        processFramingAnswer(
          { problem: mockProblem, questionId: 'unknown-id', answer: 'test' },
          data
        )
      ).toThrow('Question not found');
    });
  });

  describe('createInitialFramingData', () => {
    it('should create data with initial questions', () => {
      const data = createInitialFramingData(mockProblem);

      expect(data.questions.length).toBeGreaterThan(0);
      expect(data.currentQuestionBatch.length).toBeGreaterThan(0);
      expect(data.isComplete).toBe(false);
      expect(data.understandingScore).toBe(0);
    });
  });
});
