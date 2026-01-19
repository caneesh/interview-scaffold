import { describe, it, expect } from 'vitest';
import {
  computeCognitiveLoadScore,
  createInitialCognitiveLoadState,
  createInitialSessionLoadMetrics,
  createInitialStepLoadMetrics,
  recordStepActivation,
  recordStepTimeSpent,
  recordWrongAttempt,
  recordHintUnlock,
  recordStepCompletion,
  updateCognitiveLoadAfterStep,
  getUIConfigForLoadScore,
  shortenHintForHighLoad,
  reduceMCQToBinary,
  isSimplifiedModeActive,
  getLoadScoreLabel,
  getLoadScoreColor,
  DEFAULT_COGNITIVE_LOAD_THRESHOLDS,
  HIGH_LOAD_UI_CONFIG,
  MEDIUM_LOAD_UI_CONFIG,
  LOW_LOAD_UI_CONFIG,
} from './cognitive-load-governor.js';

describe('Cognitive Load Governor', () => {
  describe('createInitialCognitiveLoadState', () => {
    it('should create initial state with low score', () => {
      const state = createInitialCognitiveLoadState();
      expect(state.score).toBe('low');
      expect(state.previousScore).toBe('low');
      expect(state.simplifiedModeActive).toBe(false);
      expect(state.scoreHistory).toEqual([]);
    });
  });

  describe('createInitialSessionLoadMetrics', () => {
    it('should create empty metrics', () => {
      const metrics = createInitialSessionLoadMetrics();
      expect(metrics.stepMetrics).toEqual([]);
      expect(metrics.totalTimeSpentSeconds).toBe(0);
      expect(metrics.totalWrongAttempts).toBe(0);
      expect(metrics.circuitBreakerState).toBe('MONITORING');
    });
  });

  describe('computeCognitiveLoadScore', () => {
    it('should return current score with insufficient data', () => {
      const metrics = createInitialSessionLoadMetrics();
      const state = createInitialCognitiveLoadState();

      // Only 1 step, threshold is 2
      metrics.stepMetrics.push(createInitialStepLoadMetrics(0));
      metrics.stepMetrics[0].timeSpentSeconds = 10;

      const score = computeCognitiveLoadScore(metrics, state);
      expect(score).toBe('low'); // stays at current
    });

    it('should return high score with multiple struggle signals', () => {
      const metrics = createInitialSessionLoadMetrics();
      const state = createInitialCognitiveLoadState();

      // Add steps with struggle indicators
      metrics.stepMetrics.push(createInitialStepLoadMetrics(0));
      metrics.stepMetrics.push(createInitialStepLoadMetrics(1));
      metrics.stepMetrics[0].timeSpentSeconds = 200; // high time
      metrics.stepMetrics[0].wrongAttempts = 5; // high wrong attempts
      metrics.stepMetrics[1].timeSpentSeconds = 200;
      metrics.stepMetrics[1].wrongAttempts = 5;
      metrics.totalTimeSpentSeconds = 400;
      metrics.totalWrongAttempts = 10;
      metrics.totalHintsUnlocked = 20; // fast hint escalation
      metrics.stuckStepCount = 2; // multiple stuck steps

      const score = computeCognitiveLoadScore(metrics, state);
      expect(score).toBe('high');
    });

    it('should return medium score with some struggle signals', () => {
      const metrics = createInitialSessionLoadMetrics();
      const state = createInitialCognitiveLoadState();

      // Add steps with moderate struggle
      metrics.stepMetrics.push(createInitialStepLoadMetrics(0));
      metrics.stepMetrics.push(createInitialStepLoadMetrics(1));
      metrics.stepMetrics[0].timeSpentSeconds = 60;
      metrics.stepMetrics[0].wrongAttempts = 4; // above threshold
      metrics.stepMetrics[1].timeSpentSeconds = 60;
      metrics.stepMetrics[1].wrongAttempts = 4;
      metrics.totalTimeSpentSeconds = 120;
      metrics.totalWrongAttempts = 8; // avg = 4 (above threshold of 3)
      metrics.stuckStepCount = 2; // at threshold

      const score = computeCognitiveLoadScore(metrics, state);
      expect(score).toBe('medium');
    });

    it('should return low score with minimal struggle', () => {
      const metrics = createInitialSessionLoadMetrics();
      const state = createInitialCognitiveLoadState();

      // Add steps with no struggle
      metrics.stepMetrics.push(createInitialStepLoadMetrics(0));
      metrics.stepMetrics.push(createInitialStepLoadMetrics(1));
      metrics.stepMetrics[0].timeSpentSeconds = 30;
      metrics.stepMetrics[0].wrongAttempts = 1;
      metrics.stepMetrics[1].timeSpentSeconds = 30;
      metrics.stepMetrics[1].wrongAttempts = 0;
      metrics.totalTimeSpentSeconds = 60;
      metrics.totalWrongAttempts = 1;
      metrics.totalHintsUnlocked = 1;

      const score = computeCognitiveLoadScore(metrics, state);
      expect(score).toBe('low');
    });

    it('should trigger high load when circuit breaker is active', () => {
      const metrics = createInitialSessionLoadMetrics();
      const state = createInitialCognitiveLoadState();

      metrics.stepMetrics.push(createInitialStepLoadMetrics(0));
      metrics.stepMetrics.push(createInitialStepLoadMetrics(1));
      metrics.stepMetrics[0].timeSpentSeconds = 30;
      metrics.stepMetrics[1].timeSpentSeconds = 30;
      metrics.totalTimeSpentSeconds = 60;
      metrics.circuitBreakerState = 'TRIPPED'; // Circuit breaker active

      const score = computeCognitiveLoadScore(metrics, state);
      expect(score).toBe('high');
    });
  });

  describe('recordStepTimeSpent', () => {
    it('should update time spent', () => {
      let metrics = createInitialSessionLoadMetrics();
      metrics = recordStepActivation(metrics, 0);
      metrics = recordStepTimeSpent(metrics, 0, 60);

      expect(metrics.stepMetrics[0].timeSpentSeconds).toBe(60);
      expect(metrics.totalTimeSpentSeconds).toBe(60);
    });

    it('should increment stuck count when step exceeds 2 minutes', () => {
      let metrics = createInitialSessionLoadMetrics();
      metrics = recordStepActivation(metrics, 0);
      metrics = recordStepTimeSpent(metrics, 0, 60);
      expect(metrics.stuckStepCount).toBe(0);

      metrics = recordStepTimeSpent(metrics, 0, 130); // > 120 seconds
      expect(metrics.stuckStepCount).toBe(1);
    });
  });

  describe('recordWrongAttempt', () => {
    it('should increment wrong attempts', () => {
      let metrics = createInitialSessionLoadMetrics();
      metrics = recordWrongAttempt(metrics, 0);
      metrics = recordWrongAttempt(metrics, 0);

      expect(metrics.stepMetrics[0].wrongAttempts).toBe(2);
      expect(metrics.totalWrongAttempts).toBe(2);
    });
  });

  describe('recordHintUnlock', () => {
    it('should track hint unlocks', () => {
      let metrics = createInitialSessionLoadMetrics();
      metrics = recordHintUnlock(metrics, 0, 1);
      metrics = recordHintUnlock(metrics, 0, 2);

      expect(metrics.stepMetrics[0].currentHintLevel).toBe(2);
      expect(metrics.totalHintsUnlocked).toBe(2);
    });

    it('should track reveal usage at level 5', () => {
      let metrics = createInitialSessionLoadMetrics();
      metrics = recordHintUnlock(metrics, 0, 5);

      expect(metrics.stepMetrics[0].revealUsed).toBe(true);
      expect(metrics.revealCount).toBe(1);
    });
  });

  describe('updateCognitiveLoadAfterStep', () => {
    it('should update state and return event on score change', () => {
      const metrics = createInitialSessionLoadMetrics();
      const state = createInitialCognitiveLoadState();

      // Set up high load conditions
      metrics.stepMetrics.push(createInitialStepLoadMetrics(0));
      metrics.stepMetrics.push(createInitialStepLoadMetrics(1));
      metrics.totalTimeSpentSeconds = 400;
      metrics.totalWrongAttempts = 10;
      metrics.stuckStepCount = 3;
      metrics.stepMetrics[0].timeSpentSeconds = 200;
      metrics.stepMetrics[1].timeSpentSeconds = 200;

      const { state: newState, event } = updateCognitiveLoadAfterStep(state, metrics);

      expect(newState.score).toBe('high');
      expect(newState.previousScore).toBe('low');
      expect(newState.simplifiedModeActive).toBe(true);
      expect(event).not.toBeNull();
      expect(event?.type).toBe('cognitive_load_increased');
    });

    it('should track recovery steps when load stays high', () => {
      const metrics = createInitialSessionLoadMetrics();
      const state = createInitialCognitiveLoadState();
      state.score = 'high';
      state.stepsSinceLowLoad = 0;

      // Mild conditions but still high load
      metrics.stepMetrics.push(createInitialStepLoadMetrics(0));
      metrics.stepMetrics.push(createInitialStepLoadMetrics(1));
      metrics.totalTimeSpentSeconds = 200;
      metrics.totalWrongAttempts = 8;
      metrics.stuckStepCount = 2;
      metrics.stepMetrics[0].timeSpentSeconds = 100;
      metrics.stepMetrics[1].timeSpentSeconds = 100;

      const { state: newState } = updateCognitiveLoadAfterStep(state, metrics);

      expect(newState.stepsSinceLowLoad).toBeGreaterThanOrEqual(1);
    });
  });

  describe('getUIConfigForLoadScore', () => {
    it('should return high load config', () => {
      const config = getUIConfigForLoadScore('high');
      expect(config).toEqual(HIGH_LOAD_UI_CONFIG);
      expect(config.singleActiveStep).toBe(true);
      expect(config.reduceMCQToBinary).toBe(true);
    });

    it('should return medium load config', () => {
      const config = getUIConfigForLoadScore('medium');
      expect(config).toEqual(MEDIUM_LOAD_UI_CONFIG);
    });

    it('should return low load config', () => {
      const config = getUIConfigForLoadScore('low');
      expect(config).toEqual(LOW_LOAD_UI_CONFIG);
      expect(config.singleActiveStep).toBe(false);
      expect(config.reduceMCQToBinary).toBe(false);
    });
  });

  describe('shortenHintForHighLoad', () => {
    it('should return first sentence', () => {
      const hint = 'This is the first sentence. This is the second sentence. And a third.';
      const shortened = shortenHintForHighLoad(hint);
      expect(shortened).toBe('This is the first sentence.');
    });

    it('should handle question marks', () => {
      const hint = 'Have you considered this approach? More details here.';
      const shortened = shortenHintForHighLoad(hint);
      expect(shortened).toBe('Have you considered this approach?');
    });

    it('should truncate long text without sentence breaks', () => {
      const hint = 'a'.repeat(150);
      const shortened = shortenHintForHighLoad(hint);
      expect(shortened.length).toBe(103); // 100 + '...'
      expect(shortened.endsWith('...')).toBe(true);
    });

    it('should return short text as-is', () => {
      const hint = 'Short hint';
      const shortened = shortenHintForHighLoad(hint);
      expect(shortened).toBe('Short hint');
    });
  });

  describe('reduceMCQToBinary', () => {
    it('should return 2 options with correct + distractor', () => {
      const options = [
        { label: 'A', isCorrect: true },
        { label: 'B', isCorrect: false },
        { label: 'C', isCorrect: false },
        { label: 'D', isCorrect: false },
      ];

      const reduced = reduceMCQToBinary(options);

      expect(reduced.length).toBe(2);
      expect(reduced.some((o) => o.isCorrect)).toBe(true);
      expect(reduced.some((o) => !o.isCorrect)).toBe(true);
    });

    it('should return original if already 2 or fewer', () => {
      const options = [
        { label: 'A', isCorrect: true },
        { label: 'B', isCorrect: false },
      ];

      const reduced = reduceMCQToBinary(options);
      expect(reduced).toEqual(options);
    });
  });

  describe('utility functions', () => {
    it('isSimplifiedModeActive should handle null state', () => {
      expect(isSimplifiedModeActive(null)).toBe(false);
    });

    it('isSimplifiedModeActive should return simplifiedModeActive', () => {
      const state = createInitialCognitiveLoadState();
      state.simplifiedModeActive = true;
      expect(isSimplifiedModeActive(state)).toBe(true);
    });

    it('getLoadScoreLabel should return human-readable labels', () => {
      expect(getLoadScoreLabel('high')).toBe('High Cognitive Load');
      expect(getLoadScoreLabel('medium')).toBe('Moderate Cognitive Load');
      expect(getLoadScoreLabel('low')).toBe('Low Cognitive Load');
    });

    it('getLoadScoreColor should return colors', () => {
      expect(getLoadScoreColor('high')).toBe('#ef4444');
      expect(getLoadScoreColor('medium')).toBe('#f59e0b');
      expect(getLoadScoreColor('low')).toBe('#22c55e');
    });
  });
});
