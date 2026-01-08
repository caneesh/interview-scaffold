import { describe, it, expect } from 'vitest';
import {
  calculateConfidenceScore,
  scoreToConfidenceLevel,
  isLowConfidence,
  CONFIDENCE_LEVEL_THRESHOLDS,
} from '../../src/policies/ConfidenceThresholds.js';

describe('ConfidenceThresholds', () => {
  describe('calculateConfidenceScore', () => {
    it('should calculate high score for fast, correct, no hints', () => {
      const score = calculateConfidenceScore({
        timeTakenSec: 30,
        timeBudgetSec: 60,
        isCorrect: true,
        hintsUsed: 0,
        selfAssessment: 'HIGH',
        isFirstTry: true,
      });

      expect(score).toBeGreaterThan(0.7);
    });

    it('should calculate low score for slow, incorrect, many hints', () => {
      const score = calculateConfidenceScore({
        timeTakenSec: 180,
        timeBudgetSec: 60,
        isCorrect: false,
        hintsUsed: 5,
        selfAssessment: 'LOW',
        isFirstTry: false,
      });

      expect(score).toBeLessThan(0.4);
    });

    it('should apply first try bonus', () => {
      const withFirstTry = calculateConfidenceScore({
        timeTakenSec: 50,
        timeBudgetSec: 60,
        isCorrect: true,
        hintsUsed: 1,
        selfAssessment: null,
        isFirstTry: true,
      });

      const withoutFirstTry = calculateConfidenceScore({
        timeTakenSec: 50,
        timeBudgetSec: 60,
        isCorrect: true,
        hintsUsed: 1,
        selfAssessment: null,
        isFirstTry: false,
      });

      expect(withFirstTry).toBeGreaterThan(withoutFirstTry);
    });

    it('should handle null self assessment', () => {
      const score = calculateConfidenceScore({
        timeTakenSec: 50,
        timeBudgetSec: 60,
        isCorrect: true,
        hintsUsed: 0,
        selfAssessment: null,
        isFirstTry: true,
      });

      expect(score).toBeGreaterThan(0);
      expect(score).toBeLessThanOrEqual(1);
    });
  });

  describe('scoreToConfidenceLevel', () => {
    it('should map scores to correct levels', () => {
      expect(scoreToConfidenceLevel(0.8)).toBe('HIGH');
      expect(scoreToConfidenceLevel(0.75)).toBe('HIGH');
      expect(scoreToConfidenceLevel(0.6)).toBe('MEDIUM');
      expect(scoreToConfidenceLevel(0.45)).toBe('MEDIUM');
      expect(scoreToConfidenceLevel(0.3)).toBe('LOW');
      expect(scoreToConfidenceLevel(0)).toBe('LOW');
    });
  });

  describe('isLowConfidence', () => {
    it('should detect time overrun', () => {
      expect(isLowConfidence({
        timeTakenSec: 100,
        timeBudgetSec: 60,
        accuracy: 0.8,
        consecutiveWrong: 0,
        hintsUsed: 0,
      })).toBe(true);
    });

    it('should detect low accuracy', () => {
      expect(isLowConfidence({
        timeTakenSec: 30,
        timeBudgetSec: 60,
        accuracy: 0.3,
        consecutiveWrong: 0,
        hintsUsed: 0,
      })).toBe(true);
    });

    it('should detect consecutive wrong answers', () => {
      expect(isLowConfidence({
        timeTakenSec: 30,
        timeBudgetSec: 60,
        accuracy: 0.8,
        consecutiveWrong: 3,
        hintsUsed: 0,
      })).toBe(true);
    });

    it('should detect excessive hint usage', () => {
      expect(isLowConfidence({
        timeTakenSec: 30,
        timeBudgetSec: 60,
        accuracy: 0.8,
        consecutiveWrong: 0,
        hintsUsed: 4,
      })).toBe(true);
    });

    it('should return false for good performance', () => {
      expect(isLowConfidence({
        timeTakenSec: 30,
        timeBudgetSec: 60,
        accuracy: 0.8,
        consecutiveWrong: 0,
        hintsUsed: 1,
      })).toBe(false);
    });
  });
});
