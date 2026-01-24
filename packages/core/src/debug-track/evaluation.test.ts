/**
 * Evaluation Heuristics Tests
 * Tests gate-specific evaluation logic with various scenarios.
 */

import { describe, it, expect } from 'vitest';
import { evaluateGate, createHeuristicEvaluator } from './evaluation.js';
import type { DebugScenario, SymptomOption } from './entities.js';

// ============ Test Helpers ============

function createMockScenario(overrides: Partial<DebugScenario> = {}): DebugScenario {
  return {
    id: 'scenario-1',
    category: 'CONCURRENCY',
    patternKey: 'race-condition',
    difficulty: 'INTERMEDIATE',
    symptomDescription: 'The test passes locally but fails intermittently in CI',
    codeArtifacts: [],
    expectedFindings: ['shared state', 'no synchronization', 'race condition'],
    fixStrategies: ['add mutex lock', 'use atomic operations', 'synchronize access'],
    regressionExpectation: 'Add concurrent unit tests and stress testing',
    hintLadder: ['Look at shared state', 'Consider thread safety', 'Add synchronization'],
    tags: ['threading', 'mutex', 'concurrency'],
    expectedDeterminism: 'RACE_CONDITION',
    symptomOptions: [
      { id: 'a', label: 'Network timeout', isCorrect: false },
      { id: 'b', label: 'Race condition in shared state', isCorrect: true },
      { id: 'c', label: 'Memory leak', isCorrect: false },
    ],
    createdAt: new Date('2024-01-01'),
    ...overrides,
  };
}

// ============ Tests ============

describe('SYMPTOM_CLASSIFICATION Gate', () => {
  it('passes on correct MCQ selection by ID', () => {
    const scenario = createMockScenario();
    const result = evaluateGate('SYMPTOM_CLASSIFICATION', 'b', scenario);

    expect(result.isCorrect).toBe(true);
    expect(result.nextGate).toBe('DETERMINISM_ANALYSIS');
    expect(result.allowProceed).toBe(true);
  });

  it('passes on correct MCQ selection by label', () => {
    const scenario = createMockScenario();
    const result = evaluateGate(
      'SYMPTOM_CLASSIFICATION',
      'Race condition in shared state',
      scenario
    );

    expect(result.isCorrect).toBe(true);
  });

  it('fails on incorrect MCQ selection', () => {
    const scenario = createMockScenario();
    const result = evaluateGate('SYMPTOM_CLASSIFICATION', 'a', scenario);

    expect(result.isCorrect).toBe(false);
    expect(result.feedback).toContain('Incorrect');
  });

  it('uses keyword matching when no MCQ options', () => {
    const scenario = createMockScenario({ symptomOptions: undefined });
    const result = evaluateGate(
      'SYMPTOM_CLASSIFICATION',
      'I see shared state being accessed without locks',
      scenario
    );

    expect(result.isCorrect).toBe(true);
    expect(result.matchedKeywords).toContain('shared state');
  });
});

describe('DETERMINISM_ANALYSIS Gate', () => {
  it('passes when race condition keywords detected', () => {
    const scenario = createMockScenario();
    const result = evaluateGate(
      'DETERMINISM_ANALYSIS',
      'This is a race condition caused by concurrent access',
      scenario
    );

    expect(result.isCorrect).toBe(true);
    expect(result.nextGate).toBe('PATTERN_CLASSIFICATION');
    expect(result.matchedKeywords).toContain('race condition');
  });

  it('passes with timing-related keywords', () => {
    const scenario = createMockScenario();
    const result = evaluateGate(
      'DETERMINISM_ANALYSIS',
      'The bug depends on thread timing and ordering',
      scenario
    );

    expect(result.isCorrect).toBe(true);
    expect(result.matchedKeywords).toContain('timing');
  });

  it('gives partial credit for related but incorrect category', () => {
    const scenario = createMockScenario({ expectedDeterminism: 'RACE_CONDITION' });
    const result = evaluateGate(
      'DETERMINISM_ANALYSIS',
      'This is a deterministic bug that always fails',
      scenario
    );

    expect(result.isCorrect).toBe(false);
    expect(result.confidence).toBeGreaterThan(0);
    expect(result.feedback).toContain('DETERMINISTIC');
  });

  it('fails when no determinism keywords detected', () => {
    const scenario = createMockScenario();
    const result = evaluateGate(
      'DETERMINISM_ANALYSIS',
      'The code is broken',
      scenario
    );

    expect(result.isCorrect).toBe(false);
    expect(result.feedback).toContain('Determinism analysis incomplete');
  });
});

describe('PATTERN_CLASSIFICATION Gate', () => {
  it('passes when category matched', () => {
    const scenario = createMockScenario();
    const result = evaluateGate(
      'PATTERN_CLASSIFICATION',
      'This is a concurrency bug',
      scenario
    );

    expect(result.isCorrect).toBe(true);
    expect(result.nextGate).toBe('ROOT_CAUSE_HYPOTHESIS');
  });

  it('passes when pattern key matched', () => {
    const scenario = createMockScenario();
    const result = evaluateGate(
      'PATTERN_CLASSIFICATION',
      'This is a race condition',
      scenario
    );

    expect(result.isCorrect).toBe(true);
  });

  it('gives partial credit for tag matches', () => {
    const scenario = createMockScenario();
    const result = evaluateGate(
      'PATTERN_CLASSIFICATION',
      'This involves threading issues',
      scenario
    );

    expect(result.isCorrect).toBe(false);
    expect(result.confidence).toBe(0.5);
    expect(result.feedback).toContain('threading');
  });

  it('fails when pattern not identified', () => {
    const scenario = createMockScenario();
    const result = evaluateGate(
      'PATTERN_CLASSIFICATION',
      'I do not know what kind of bug this is',
      scenario
    );

    expect(result.isCorrect).toBe(false);
  });
});

describe('ROOT_CAUSE_HYPOTHESIS Gate', () => {
  it('passes with comprehensive hypothesis mentioning findings', () => {
    const scenario = createMockScenario();
    const result = evaluateGate(
      'ROOT_CAUSE_HYPOTHESIS',
      'The root cause is that shared state is accessed by multiple threads without proper synchronization. There is no mutex or lock protecting the critical section, leading to a race condition.',
      scenario
    );

    expect(result.isCorrect).toBe(true);
    expect(result.nextGate).toBe('FIX_STRATEGY');
    expect(result.confidence).toBeGreaterThanOrEqual(0.7);
  });

  it('gives partial credit for incomplete hypothesis', () => {
    const scenario = createMockScenario();
    const result = evaluateGate(
      'ROOT_CAUSE_HYPOTHESIS',
      'The bug is caused by shared state issues',
      scenario
    );

    // May or may not pass depending on threshold
    expect(result.confidence).toBeGreaterThan(0);
    expect(result.matchedKeywords).toContain('shared state');
  });

  it('fails for vague hypothesis', () => {
    const scenario = createMockScenario();
    const result = evaluateGate(
      'ROOT_CAUSE_HYPOTHESIS',
      'The code is wrong',
      scenario
    );

    expect(result.isCorrect).toBe(false);
    expect(result.feedback).toContain('Hypothesis');
  });
});

describe('FIX_STRATEGY Gate', () => {
  it('passes when valid strategy mentioned', () => {
    const scenario = createMockScenario();
    const result = evaluateGate(
      'FIX_STRATEGY',
      'We should add a mutex lock around the shared state access',
      scenario
    );

    expect(result.isCorrect).toBe(true);
    expect(result.nextGate).toBe('REGRESSION_PREVENTION');
    expect(result.matchedKeywords).toContain('add mutex lock');
  });

  it('passes with alternative valid strategy', () => {
    const scenario = createMockScenario();
    const result = evaluateGate(
      'FIX_STRATEGY',
      'Use atomic operations for thread-safe updates',
      scenario
    );

    expect(result.isCorrect).toBe(true);
  });

  it('fails when strategy not recognized', () => {
    const scenario = createMockScenario();
    const result = evaluateGate(
      'FIX_STRATEGY',
      'Just delete the code and rewrite it',
      scenario
    );

    expect(result.isCorrect).toBe(false);
    expect(result.feedback).toContain('not recognized');
  });
});

describe('REGRESSION_PREVENTION Gate', () => {
  it('passes with comprehensive prevention plan', () => {
    const scenario = createMockScenario();
    const result = evaluateGate(
      'REGRESSION_PREVENTION',
      'We should add unit tests for concurrent access, set up monitoring with alerts for race conditions, and add assertion checks for invariants.',
      scenario
    );

    expect(result.isCorrect).toBe(true);
    expect(result.nextGate).toBe('REFLECTION');
    expect(result.matchedKeywords?.length).toBeGreaterThan(2);
  });

  it('passes with testing and monitoring mentioned', () => {
    const scenario = createMockScenario();
    const result = evaluateGate(
      'REGRESSION_PREVENTION',
      'Add regression tests and set up alerting to catch this issue',
      scenario
    );

    expect(result.isCorrect).toBe(true);
  });

  it('fails with insufficient prevention measures', () => {
    const scenario = createMockScenario();
    const result = evaluateGate(
      'REGRESSION_PREVENTION',
      'Hope it does not happen again',
      scenario
    );

    expect(result.isCorrect).toBe(false);
    expect(result.feedback).toContain('incomplete');
  });
});

describe('REFLECTION Gate', () => {
  it('passes with substantive reflection', () => {
    const scenario = createMockScenario();
    const result = evaluateGate(
      'REFLECTION',
      'I learned that race conditions are subtle and require careful synchronization. Next time I will be more careful about shared state access and add concurrent tests from the start.',
      scenario
    );

    expect(result.isCorrect).toBe(true);
    expect(result.nextGate).toBe(null); // Final gate
    expect(result.allowProceed).toBe(true);
  });

  it('passes with minimal but present reflection', () => {
    const scenario = createMockScenario();
    const result = evaluateGate(
      'REFLECTION',
      'I now understand that thread safety is important and I will do better in the future.',
      scenario
    );

    expect(result.isCorrect).toBe(true);
  });

  it('fails with too brief reflection', () => {
    const scenario = createMockScenario();
    const result = evaluateGate(
      'REFLECTION',
      'I learned stuff',
      scenario
    );

    expect(result.isCorrect).toBe(false);
    expect(result.feedback).toContain('more detailed');
  });
});

describe('createHeuristicEvaluator', () => {
  it('creates evaluator that returns correct results', async () => {
    const evaluator = createHeuristicEvaluator();
    const scenario = createMockScenario();

    const result = await evaluator.evaluate(
      'SYMPTOM_CLASSIFICATION',
      'b',
      scenario
    );

    expect(result.isCorrect).toBe(true);
  });

  it('reports LLM as unavailable', () => {
    const evaluator = createHeuristicEvaluator();
    expect(evaluator.isLLMAvailable()).toBe(false);
  });
});
