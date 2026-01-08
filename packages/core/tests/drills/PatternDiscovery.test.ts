import { describe, it, expect } from 'vitest';
import {
  getDiscoveryConfig,
  createDiscoverySession,
  getCurrentQuestion,
  submitDiscoveryAnswer,
  evaluateDiscovery,
  getFollowUp,
  calculateDiscoveryProgress,
  inferPatternFromConstraints,
  getAvailableDiscoveryPatterns,
} from '../../src/drills/PatternDiscovery.js';
import { DiscoveryConstraint, DISCOVERY_CONFIGS } from '../../src/drills/types.js';
import { PatternId } from '../../src/entities/types.js';

describe('PatternDiscovery', () => {
  describe('getDiscoveryConfig', () => {
    it('should return config for sliding-window', () => {
      const config = getDiscoveryConfig(PatternId('sliding-window'));

      expect(config).not.toBeNull();
      expect(config?.patternName).toBe('Sliding Window');
      expect(config?.questions.length).toBeGreaterThan(0);
    });

    it('should return config for two-pointers', () => {
      const config = getDiscoveryConfig(PatternId('two-pointers'));

      expect(config).not.toBeNull();
      expect(config?.patternName).toBe('Two Pointers');
    });

    it('should return config for merge-intervals', () => {
      const config = getDiscoveryConfig(PatternId('merge-intervals'));

      expect(config).not.toBeNull();
      expect(config?.patternName).toBe('Merge Intervals');
    });

    it('should return null for unknown pattern', () => {
      const config = getDiscoveryConfig(PatternId('unknown'));

      expect(config).toBeNull();
    });
  });

  describe('createDiscoverySession', () => {
    it('should create session for valid pattern', () => {
      const session = createDiscoverySession('session-1', PatternId('sliding-window'));

      expect(session).not.toBeNull();
      expect(session?.sessionId).toBe('session-1');
      expect(session?.currentQuestionIndex).toBe(0);
      expect(session?.isComplete).toBe(false);
    });

    it('should return null for invalid pattern', () => {
      const session = createDiscoverySession('session-1', PatternId('unknown'));

      expect(session).toBeNull();
    });
  });

  describe('Discovery Flow', () => {
    it('should progress through questions', () => {
      let session = createDiscoverySession('session-1', PatternId('sliding-window'));
      expect(session).not.toBeNull();
      if (!session) return;

      const firstQuestion = getCurrentQuestion(session);
      expect(firstQuestion).not.toBeNull();

      session = submitDiscoveryAnswer(session, 'yes');
      expect(session.answers.length).toBe(1);
      expect(session.currentQuestionIndex).toBe(1);
    });

    it('should complete after all questions answered', () => {
      let session = createDiscoverySession('session-1', PatternId('sliding-window'));
      if (!session) return;

      const questionCount = session.config.questions.length;

      for (let i = 0; i < questionCount; i++) {
        session = submitDiscoveryAnswer(session, 'yes');
      }

      expect(session.isComplete).toBe(true);
      expect(session.answers.length).toBe(questionCount);
    });
  });

  describe('evaluateDiscovery', () => {
    it('should correctly evaluate successful discovery', () => {
      let session = createDiscoverySession('session-1', PatternId('sliding-window'));
      if (!session) return;

      // Answer all questions correctly
      for (const question of session.config.questions) {
        session = submitDiscoveryAnswer(session, question.expectedAnswer);
      }

      const result = evaluateDiscovery(session);

      expect(result.inferredCorrectly).toBe(true);
      expect(result.answersCorrect).toBe(session.config.questions.length);
      expect(result.patternName).toBe('Sliding Window');
      expect(result.countsAsHint1).toBe(true);
    });

    it('should identify constraints from correct answers', () => {
      let session = createDiscoverySession('session-1', PatternId('sliding-window'));
      if (!session) return;

      // Answer all correctly
      for (const question of session.config.questions) {
        session = submitDiscoveryAnswer(session, question.expectedAnswer);
      }

      const result = evaluateDiscovery(session);

      expect(result.constraintsIdentified.length).toBeGreaterThan(0);
    });

    it('should fail discovery with wrong answers', () => {
      let session = createDiscoverySession('session-1', PatternId('sliding-window'));
      if (!session) return;

      // Answer all questions wrong
      for (let i = 0; i < session.config.questions.length; i++) {
        session = submitDiscoveryAnswer(session, 'depends');
      }

      const result = evaluateDiscovery(session);

      expect(result.inferredCorrectly).toBe(false);
      expect(result.answersCorrect).toBeLessThan(session.config.revealThreshold);
    });
  });

  describe('getFollowUp', () => {
    it('should return follow-up for yes answer when available', () => {
      const session = createDiscoverySession('session-1', PatternId('sliding-window'));
      if (!session) return;

      const followUp = getFollowUp(session, 'yes');

      // First question for sliding-window has followUpOnYes
      expect(followUp).not.toBeNull();
    });
  });

  describe('calculateDiscoveryProgress', () => {
    it('should calculate initial progress', () => {
      const session = createDiscoverySession('session-1', PatternId('sliding-window'));
      if (!session) return;

      const progress = calculateDiscoveryProgress(session);

      expect(progress.questionsAnswered).toBe(0);
      expect(progress.percentComplete).toBe(0);
      expect(progress.canRevealPattern).toBe(false);
    });

    it('should update progress as questions answered', () => {
      let session = createDiscoverySession('session-1', PatternId('sliding-window'));
      if (!session) return;

      // Answer first question correctly
      const firstQuestion = session.config.questions[0];
      if (!firstQuestion) return;

      session = submitDiscoveryAnswer(session, firstQuestion.expectedAnswer);

      const progress = calculateDiscoveryProgress(session);

      expect(progress.questionsAnswered).toBe(1);
      expect(progress.correctSoFar).toBe(1);
    });

    it('should indicate when pattern can be revealed', () => {
      let session = createDiscoverySession('session-1', PatternId('sliding-window'));
      if (!session) return;

      // Answer threshold number of questions correctly
      for (let i = 0; i < session.config.revealThreshold; i++) {
        const question = session.config.questions[i];
        if (question) {
          session = submitDiscoveryAnswer(session, question.expectedAnswer);
        }
      }

      const progress = calculateDiscoveryProgress(session);

      expect(progress.canRevealPattern).toBe(true);
    });
  });

  describe('inferPatternFromConstraints', () => {
    it('should infer sliding-window from window constraints', () => {
      const constraints: DiscoveryConstraint[] = [
        DiscoveryConstraint.ADJACENCY,
        DiscoveryConstraint.WINDOW,
      ];

      const pattern = inferPatternFromConstraints(constraints);

      expect(pattern).toBe('sliding-window');
    });

    it('should infer two-pointers from order constraints', () => {
      const constraints: DiscoveryConstraint[] = [
        DiscoveryConstraint.ORDER,
        DiscoveryConstraint.EXISTENCE,
      ];

      const pattern = inferPatternFromConstraints(constraints);

      // Two pointers has ORDER constraints
      expect(pattern).not.toBeNull();
    });

    it('should return null for empty constraints', () => {
      const pattern = inferPatternFromConstraints([]);

      expect(pattern).toBeNull();
    });
  });

  describe('getAvailableDiscoveryPatterns', () => {
    it('should return all discovery patterns', () => {
      const patterns = getAvailableDiscoveryPatterns();

      expect(patterns.length).toBeGreaterThan(0);
      expect(patterns).toEqual(DISCOVERY_CONFIGS);
    });
  });

  describe('Word Search, Merge Intervals, Sliding Window Discovery', () => {
    it('should have discovery config for Sliding Window', () => {
      const config = getDiscoveryConfig(PatternId('sliding-window'));
      expect(config).not.toBeNull();
      expect(config?.questions.length).toBeGreaterThanOrEqual(3);
    });

    it('should have discovery config for Merge Intervals', () => {
      const config = getDiscoveryConfig(PatternId('merge-intervals'));
      expect(config).not.toBeNull();
      expect(config?.questions.some(q => q.questionText.includes('intervals'))).toBe(true);
    });

    it('should have discovery config for DFS Grid (Word Search pattern)', () => {
      const config = getDiscoveryConfig(PatternId('dfs-grid'));
      expect(config).not.toBeNull();
      expect(config?.questions.some(q => q.questionText.includes('grid'))).toBe(true);
    });
  });
});
