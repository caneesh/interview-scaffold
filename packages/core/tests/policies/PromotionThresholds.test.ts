import { describe, it, expect } from 'vitest';
import {
  getMasteryLevel,
  canUnlockNextDifficulty,
  shouldSuggestEasier,
  mapConfidenceToScore,
  MASTERY_THRESHOLDS,
  PROBLEMS_TO_UNLOCK_NEXT_DIFFICULTY,
} from '../../src/policies/PromotionThresholds.js';

describe('PromotionThresholds', () => {
  describe('getMasteryLevel', () => {
    it('should return EXPERT for scores >= 90', () => {
      expect(getMasteryLevel(90)).toBe('EXPERT');
      expect(getMasteryLevel(95)).toBe('EXPERT');
      expect(getMasteryLevel(100)).toBe('EXPERT');
    });

    it('should return ADVANCED for scores >= 75', () => {
      expect(getMasteryLevel(75)).toBe('ADVANCED');
      expect(getMasteryLevel(80)).toBe('ADVANCED');
      expect(getMasteryLevel(89)).toBe('ADVANCED');
    });

    it('should return INTERMEDIATE for scores >= 50', () => {
      expect(getMasteryLevel(50)).toBe('INTERMEDIATE');
      expect(getMasteryLevel(60)).toBe('INTERMEDIATE');
      expect(getMasteryLevel(74)).toBe('INTERMEDIATE');
    });

    it('should return BEGINNER for scores < 50', () => {
      expect(getMasteryLevel(0)).toBe('BEGINNER');
      expect(getMasteryLevel(25)).toBe('BEGINNER');
      expect(getMasteryLevel(49)).toBe('BEGINNER');
    });
  });

  describe('canUnlockNextDifficulty', () => {
    it('should unlock MEDIUM after 5 EASY problems with good accuracy', () => {
      expect(canUnlockNextDifficulty('EASY', 5, 0.7)).toBe(true);
      expect(canUnlockNextDifficulty('EASY', 4, 0.7)).toBe(false);
      expect(canUnlockNextDifficulty('EASY', 5, 0.5)).toBe(false);
    });

    it('should unlock HARD after 5 MEDIUM problems', () => {
      expect(canUnlockNextDifficulty('MEDIUM', 5, 0.7)).toBe(true);
      expect(canUnlockNextDifficulty('MEDIUM', 3, 0.8)).toBe(false);
    });

    it('should not unlock beyond HARD', () => {
      expect(canUnlockNextDifficulty('HARD', 10, 0.9)).toBe(false);
    });
  });

  describe('shouldSuggestEasier', () => {
    it('should suggest easier after 3 consecutive failures', () => {
      expect(shouldSuggestEasier(3, 'MEDIUM')).toBe(true);
      expect(shouldSuggestEasier(3, 'HARD')).toBe(true);
      expect(shouldSuggestEasier(2, 'MEDIUM')).toBe(false);
    });

    it('should not suggest easier when already at EASY', () => {
      expect(shouldSuggestEasier(5, 'EASY')).toBe(false);
    });
  });

  describe('mapConfidenceToScore', () => {
    it('should map confidence levels to scores', () => {
      expect(mapConfidenceToScore('LOW')).toBe(0.33);
      expect(mapConfidenceToScore('MEDIUM')).toBe(0.66);
      expect(mapConfidenceToScore('HIGH')).toBe(1.0);
    });
  });
});
