/**
 * Scoring Tests
 * Tests debug attempt scoring calculations.
 */

import { describe, it, expect } from 'vitest';
import {
  computeTimeToDiagnosis,
  computeFixAccuracy,
  computeHintsPenalty,
  computeEdgeCasesScore,
  computeExplanationQuality,
  computeDebugScore,
  getLetterGrade,
  getPerformanceLevel,
  getScoreBreakdown,
} from './scoring.js';
import type { DebugAttempt, DebugScenario, GateSubmission, EvaluationResult } from './entities.js';

// ============ Test Helpers ============

function createMockAttempt(overrides: Partial<DebugAttempt> = {}): DebugAttempt {
  return {
    attemptId: 'attempt-1',
    tenantId: 'tenant-1',
    userId: 'user-1',
    scenarioId: 'scenario-1',
    currentGate: 'REFLECTION',
    gateHistory: [],
    hintsUsed: 0,
    timers: [],
    status: 'COMPLETED',
    startedAt: new Date('2024-01-01T10:00:00Z'),
    completedAt: new Date('2024-01-01T10:10:00Z'),
    scoreJson: null,
    retriesPerGate: {
      SYMPTOM_CLASSIFICATION: 1,
      DETERMINISM_ANALYSIS: 1,
      PATTERN_CLASSIFICATION: 1,
      ROOT_CAUSE_HYPOTHESIS: 1,
      FIX_STRATEGY: 1,
      REGRESSION_PREVENTION: 1,
      REFLECTION: 1,
    },
    ...overrides,
  };
}

function createMockScenario(overrides: Partial<DebugScenario> = {}): DebugScenario {
  return {
    id: 'scenario-1',
    category: 'CONCURRENCY',
    patternKey: 'race-condition',
    difficulty: 'INTERMEDIATE',
    symptomDescription: 'Test description',
    codeArtifacts: [],
    expectedFindings: ['shared state'],
    fixStrategies: ['add lock'],
    regressionExpectation: 'Add tests',
    hintLadder: ['Hint 1', 'Hint 2'],
    tags: [],
    createdAt: new Date('2024-01-01'),
    ...overrides,
  };
}

function createPassSubmission(
  gateId: DebugAttempt['currentGate'],
  timestamp: Date,
  rubricOverrides: Partial<EvaluationResult['rubricScores']> = {}
): GateSubmission {
  return {
    gateId,
    answer: 'correct answer',
    timestamp,
    evaluationResult: {
      isCorrect: true,
      confidence: 1.0,
      feedback: 'Correct',
      rubricScores: {
        ACCURACY: 1.0,
        COMPLETENESS: 1.0,
        SPECIFICITY: 1.0,
        TECHNICAL_DEPTH: 1.0,
        CLARITY: 1.0,
        ACTIONABILITY: 1.0,
        ...rubricOverrides,
      },
      nextGate: null,
      allowProceed: true,
    },
  };
}

// ============ Tests ============

describe('computeTimeToDiagnosis', () => {
  it('returns excellent score for fast diagnosis', () => {
    const attempt = createMockAttempt({
      startedAt: new Date('2024-01-01T10:00:00Z'),
      gateHistory: [
        createPassSubmission(
          'PATTERN_CLASSIFICATION',
          new Date('2024-01-01T10:00:30Z') // 30 seconds
        ),
      ],
    });

    const result = computeTimeToDiagnosis(attempt, new Date('2024-01-01T10:10:00Z'));

    expect(result.durationMs).toBe(30_000);
    expect(result.score).toBe(100);
  });

  it('returns good score for 2 minute diagnosis', () => {
    const attempt = createMockAttempt({
      startedAt: new Date('2024-01-01T10:00:00Z'),
      gateHistory: [
        createPassSubmission(
          'PATTERN_CLASSIFICATION',
          new Date('2024-01-01T10:02:00Z') // 2 minutes
        ),
      ],
    });

    const result = computeTimeToDiagnosis(attempt, new Date('2024-01-01T10:10:00Z'));

    expect(result.durationMs).toBe(120_000);
    expect(result.score).toBe(80);
  });

  it('returns acceptable score for 4 minute diagnosis', () => {
    const attempt = createMockAttempt({
      startedAt: new Date('2024-01-01T10:00:00Z'),
      gateHistory: [
        createPassSubmission(
          'PATTERN_CLASSIFICATION',
          new Date('2024-01-01T10:04:00Z')
        ),
      ],
    });

    const result = computeTimeToDiagnosis(attempt, new Date('2024-01-01T10:10:00Z'));

    expect(result.score).toBe(60);
  });

  it('uses current time if pattern gate not passed', () => {
    const attempt = createMockAttempt({
      startedAt: new Date('2024-01-01T10:00:00Z'),
      gateHistory: [],
    });

    const now = new Date('2024-01-01T10:15:00Z'); // 15 minutes
    const result = computeTimeToDiagnosis(attempt, now);

    expect(result.durationMs).toBe(900_000);
    expect(result.score).toBe(20);
  });
});

describe('computeFixAccuracy', () => {
  it('returns 100% when all gates passed first try', () => {
    const attempt = createMockAttempt({
      gateHistory: [
        createPassSubmission('SYMPTOM_CLASSIFICATION', new Date()),
        createPassSubmission('DETERMINISM_ANALYSIS', new Date()),
        createPassSubmission('PATTERN_CLASSIFICATION', new Date()),
      ],
      retriesPerGate: {
        SYMPTOM_CLASSIFICATION: 1,
        DETERMINISM_ANALYSIS: 1,
        PATTERN_CLASSIFICATION: 1,
        ROOT_CAUSE_HYPOTHESIS: 0,
        FIX_STRATEGY: 0,
        REGRESSION_PREVENTION: 0,
        REFLECTION: 0,
      },
    });

    expect(computeFixAccuracy(attempt)).toBe(100);
  });

  it('returns lower score with retries', () => {
    const attempt = createMockAttempt({
      gateHistory: [
        createPassSubmission('SYMPTOM_CLASSIFICATION', new Date()),
        createPassSubmission('DETERMINISM_ANALYSIS', new Date()),
      ],
      retriesPerGate: {
        SYMPTOM_CLASSIFICATION: 3, // Multiple retries
        DETERMINISM_ANALYSIS: 1, // First try
        PATTERN_CLASSIFICATION: 0,
        ROOT_CAUSE_HYPOTHESIS: 0,
        FIX_STRATEGY: 0,
        REGRESSION_PREVENTION: 0,
        REFLECTION: 0,
      },
    });

    expect(computeFixAccuracy(attempt)).toBe(50);
  });

  it('returns 0 when no gates passed', () => {
    const attempt = createMockAttempt({
      gateHistory: [],
    });

    expect(computeFixAccuracy(attempt)).toBe(0);
  });
});

describe('computeHintsPenalty', () => {
  it('returns 0 for no hints', () => {
    expect(computeHintsPenalty(0)).toBe(0);
  });

  it('returns 5 per hint', () => {
    expect(computeHintsPenalty(1)).toBe(5);
    expect(computeHintsPenalty(2)).toBe(10);
    expect(computeHintsPenalty(3)).toBe(15);
  });

  it('caps at maximum penalty', () => {
    expect(computeHintsPenalty(10)).toBe(30);
  });
});

describe('computeEdgeCasesScore', () => {
  it('returns score based on regression gate rubric', () => {
    const attempt = createMockAttempt({
      gateHistory: [
        createPassSubmission('REGRESSION_PREVENTION', new Date(), {
          COMPLETENESS: 0.9,
          ACTIONABILITY: 0.8,
        }),
      ],
    });

    const score = computeEdgeCasesScore(attempt);
    expect(score).toBeCloseTo(85, 0); // (0.9 + 0.8) / 2 * 100
  });

  it('returns 0 when regression gate not passed', () => {
    const attempt = createMockAttempt({ gateHistory: [] });
    expect(computeEdgeCasesScore(attempt)).toBe(0);
  });
});

describe('computeExplanationQuality', () => {
  it('averages hypothesis and reflection scores', () => {
    const attempt = createMockAttempt({
      gateHistory: [
        createPassSubmission('ROOT_CAUSE_HYPOTHESIS', new Date(), {
          TECHNICAL_DEPTH: 0.8,
          CLARITY: 0.9,
        }),
        createPassSubmission('REFLECTION', new Date(), {
          CLARITY: 0.7,
          SPECIFICITY: 0.8,
        }),
      ],
    });

    const score = computeExplanationQuality(attempt);
    // ((0.8+0.9)/2 + (0.7+0.8)/2) / 2 * 100 = 80
    expect(score).toBe(80);
  });

  it('returns 0 when no relevant gates passed', () => {
    const attempt = createMockAttempt({ gateHistory: [] });
    expect(computeExplanationQuality(attempt)).toBe(0);
  });
});

describe('computeDebugScore', () => {
  it('computes comprehensive score for completed attempt', () => {
    const now = new Date('2024-01-01T10:05:00Z');
    const attempt = createMockAttempt({
      startedAt: new Date('2024-01-01T10:00:00Z'),
      completedAt: now,
      hintsUsed: 0,
      gateHistory: [
        createPassSubmission('SYMPTOM_CLASSIFICATION', new Date('2024-01-01T10:00:30Z')),
        createPassSubmission('DETERMINISM_ANALYSIS', new Date('2024-01-01T10:01:00Z')),
        createPassSubmission('PATTERN_CLASSIFICATION', new Date('2024-01-01T10:01:30Z')),
        createPassSubmission('ROOT_CAUSE_HYPOTHESIS', new Date('2024-01-01T10:02:00Z')),
        createPassSubmission('FIX_STRATEGY', new Date('2024-01-01T10:02:30Z')),
        createPassSubmission('REGRESSION_PREVENTION', new Date('2024-01-01T10:03:00Z')),
        createPassSubmission('REFLECTION', new Date('2024-01-01T10:03:30Z')),
      ],
      retriesPerGate: {
        SYMPTOM_CLASSIFICATION: 1,
        DETERMINISM_ANALYSIS: 1,
        PATTERN_CLASSIFICATION: 1,
        ROOT_CAUSE_HYPOTHESIS: 1,
        FIX_STRATEGY: 1,
        REGRESSION_PREVENTION: 1,
        REFLECTION: 1,
      },
    });

    const scenario = createMockScenario({ category: 'CONCURRENCY' });
    const score = computeDebugScore(attempt, scenario, now);

    expect(score.overall).toBeGreaterThan(0);
    expect(score.overall).toBeLessThanOrEqual(100);
    expect(score.timeToDiagnosisMs).toBe(90_000);
    expect(score.fixAccuracy).toBe(100);
    expect(score.hintsPenalty).toBe(0);
    expect(score.categoryWeight).toBe(1.3); // CONCURRENCY weight
    expect(score.gateScores).toBeDefined();
  });

  it('applies hint penalty', () => {
    const now = new Date('2024-01-01T10:05:00Z');
    const attempt = createMockAttempt({
      startedAt: new Date('2024-01-01T10:00:00Z'),
      hintsUsed: 3,
      gateHistory: [
        createPassSubmission('PATTERN_CLASSIFICATION', new Date('2024-01-01T10:01:00Z')),
      ],
    });

    const scenario = createMockScenario();
    const score = computeDebugScore(attempt, scenario, now);

    expect(score.hintsPenalty).toBe(15); // 3 * 5
  });

  it('applies category weight', () => {
    const now = new Date('2024-01-01T10:05:00Z');
    const attempt = createMockAttempt({
      gateHistory: [
        createPassSubmission('PATTERN_CLASSIFICATION', new Date('2024-01-01T10:01:00Z')),
      ],
    });

    const functionalScenario = createMockScenario({ category: 'FUNCTIONAL_LOGIC' });
    const distributedScenario = createMockScenario({ category: 'DISTRIBUTED' });

    const functionalScore = computeDebugScore(attempt, functionalScenario, now);
    const distributedScore = computeDebugScore(attempt, distributedScenario, now);

    expect(functionalScore.categoryWeight).toBe(1.0);
    expect(distributedScore.categoryWeight).toBe(1.4);
  });
});

describe('getLetterGrade', () => {
  it('returns correct letter grades', () => {
    expect(getLetterGrade(95)).toBe('A');
    expect(getLetterGrade(85)).toBe('B');
    expect(getLetterGrade(75)).toBe('C');
    expect(getLetterGrade(65)).toBe('D');
    expect(getLetterGrade(55)).toBe('F');
  });
});

describe('getPerformanceLevel', () => {
  it('returns correct performance levels', () => {
    expect(getPerformanceLevel(95)).toBe('Expert');
    expect(getPerformanceLevel(80)).toBe('Proficient');
    expect(getPerformanceLevel(65)).toBe('Developing');
    expect(getPerformanceLevel(45)).toBe('Beginner');
    expect(getPerformanceLevel(30)).toBe('Needs Practice');
  });
});

describe('getScoreBreakdown', () => {
  it('returns human-readable breakdown', () => {
    const score = {
      overall: 85,
      timeToDiagnosisMs: 90_000,
      fixAccuracy: 100,
      hintsPenalty: 5,
      edgeCasesConsidered: 80,
      explanationQuality: 90,
      categoryWeight: 1.3,
      gateScores: {
        SYMPTOM_CLASSIFICATION: 100,
        DETERMINISM_ANALYSIS: 100,
        PATTERN_CLASSIFICATION: 100,
        ROOT_CAUSE_HYPOTHESIS: 100,
        FIX_STRATEGY: 100,
        REGRESSION_PREVENTION: 100,
        REFLECTION: 100,
      },
    };

    const breakdown = getScoreBreakdown(score);

    expect(breakdown).toContain('Overall Score: 85/100');
    expect(breakdown).toContain('Time to Diagnosis: 90s');
    expect(breakdown).toContain('Fix Accuracy: 100%');
    expect(breakdown).toContain('Hints Penalty: -5');
  });
});
