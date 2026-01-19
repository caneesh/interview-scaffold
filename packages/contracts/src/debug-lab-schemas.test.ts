import { describe, it, expect } from 'vitest';
import {
  DefectCategorySchema,
  SeverityLevelSchema,
  PriorityLevelSchema,
  DebugSignalSchema,
  DebugToolSchema,
  DebugLabDifficultySchema,
  DebugLabLanguageSchema,
  DebugLabStatusSchema,
  ExecutionSignalTypeSchema,
  DebugLabFileSchema,
  TriageAnswersSchema,
  TriageScoreSchema,
  TriageRubricSchema,
  ExecutionResultSchema,
  DebugLabSubmissionSchema,
  DebugLabItemSchema,
  DebugLabAttemptSchema,
  ObservabilitySnapshotSchema,
  REDMetricsSchema,
  USEMetricsSchema,
} from './schemas.js';

// ============ Enum Schema Tests ============

describe('DefectCategorySchema', () => {
  it('accepts valid categories', () => {
    expect(DefectCategorySchema.parse('Functional')).toBe('Functional');
    expect(DefectCategorySchema.parse('Concurrency')).toBe('Concurrency');
    expect(DefectCategorySchema.parse('Resource')).toBe('Resource');
    expect(DefectCategorySchema.parse('Distributed')).toBe('Distributed');
    expect(DefectCategorySchema.parse('Heisenbug')).toBe('Heisenbug');
    expect(DefectCategorySchema.parse('Environment')).toBe('Environment');
    expect(DefectCategorySchema.parse('Container')).toBe('Container');
    expect(DefectCategorySchema.parse('Performance')).toBe('Performance');
    expect(DefectCategorySchema.parse('Observability')).toBe('Observability');
  });

  it('rejects invalid categories', () => {
    expect(() => DefectCategorySchema.parse('Invalid')).toThrow();
    expect(() => DefectCategorySchema.parse('')).toThrow();
    expect(() => DefectCategorySchema.parse(123)).toThrow();
  });
});

describe('SeverityLevelSchema', () => {
  it('accepts valid severity levels', () => {
    expect(SeverityLevelSchema.parse('Critical')).toBe('Critical');
    expect(SeverityLevelSchema.parse('Major')).toBe('Major');
    expect(SeverityLevelSchema.parse('Minor')).toBe('Minor');
    expect(SeverityLevelSchema.parse('Low')).toBe('Low');
  });

  it('rejects invalid severity levels', () => {
    expect(() => SeverityLevelSchema.parse('High')).toThrow();
    expect(() => SeverityLevelSchema.parse('critical')).toThrow();
  });
});

describe('PriorityLevelSchema', () => {
  it('accepts valid priority levels', () => {
    expect(PriorityLevelSchema.parse('High')).toBe('High');
    expect(PriorityLevelSchema.parse('Medium')).toBe('Medium');
    expect(PriorityLevelSchema.parse('Low')).toBe('Low');
  });

  it('rejects invalid priority levels', () => {
    expect(() => PriorityLevelSchema.parse('Critical')).toThrow();
  });
});

describe('DebugSignalSchema', () => {
  it('accepts valid signals', () => {
    expect(DebugSignalSchema.parse('failing_tests')).toBe('failing_tests');
    expect(DebugSignalSchema.parse('timeout')).toBe('timeout');
    expect(DebugSignalSchema.parse('crash')).toBe('crash');
    expect(DebugSignalSchema.parse('inconsistent_repro')).toBe('inconsistent_repro');
    expect(DebugSignalSchema.parse('metrics_red')).toBe('metrics_red');
  });

  it('rejects invalid signals', () => {
    expect(() => DebugSignalSchema.parse('unknown_signal')).toThrow();
  });
});

describe('DebugLabDifficultySchema', () => {
  it('accepts all difficulty levels', () => {
    expect(DebugLabDifficultySchema.parse('EASY')).toBe('EASY');
    expect(DebugLabDifficultySchema.parse('MEDIUM')).toBe('MEDIUM');
    expect(DebugLabDifficultySchema.parse('HARD')).toBe('HARD');
    expect(DebugLabDifficultySchema.parse('EXPERT')).toBe('EXPERT');
  });
});

describe('DebugLabStatusSchema', () => {
  it('accepts all status values', () => {
    expect(DebugLabStatusSchema.parse('STARTED')).toBe('STARTED');
    expect(DebugLabStatusSchema.parse('TRIAGE_COMPLETED')).toBe('TRIAGE_COMPLETED');
    expect(DebugLabStatusSchema.parse('SUBMITTED')).toBe('SUBMITTED');
    expect(DebugLabStatusSchema.parse('PASSED')).toBe('PASSED');
    expect(DebugLabStatusSchema.parse('FAILED')).toBe('FAILED');
  });
});

// ============ Complex Schema Tests ============

describe('TriageAnswersSchema', () => {
  it('accepts valid triage answers', () => {
    const validAnswers = {
      category: 'Functional',
      severity: 'Major',
      priority: 'High',
      firstActions: 'Run tests and check the logs carefully',
    };

    const result = TriageAnswersSchema.parse(validAnswers);
    expect(result.category).toBe('Functional');
    expect(result.severity).toBe('Major');
    expect(result.priority).toBe('High');
    expect(result.firstActions).toBe('Run tests and check the logs carefully');
  });

  it('rejects firstActions shorter than 10 characters', () => {
    const invalidAnswers = {
      category: 'Functional',
      severity: 'Major',
      priority: 'High',
      firstActions: 'Too short',
    };

    expect(() => TriageAnswersSchema.parse(invalidAnswers)).toThrow();
  });

  it('rejects invalid category', () => {
    const invalidAnswers = {
      category: 'InvalidCategory',
      severity: 'Major',
      priority: 'High',
      firstActions: 'Valid actions text here',
    };

    expect(() => TriageAnswersSchema.parse(invalidAnswers)).toThrow();
  });
});

describe('TriageScoreSchema', () => {
  it('accepts valid triage score', () => {
    const validScore = {
      overall: 0.75,
      categoryScore: 1,
      severityScore: 0.5,
      priorityScore: 1,
      actionsScore: 0.5,
      matchedActions: ['run tests', 'check logs'],
    };

    const result = TriageScoreSchema.parse(validScore);
    expect(result.overall).toBe(0.75);
    expect(result.matchedActions).toHaveLength(2);
  });

  it('rejects scores outside 0-1 range', () => {
    expect(() => TriageScoreSchema.parse({
      overall: 1.5,
      categoryScore: 1,
      severityScore: 1,
      priorityScore: 1,
      actionsScore: 1,
      matchedActions: [],
    })).toThrow();

    expect(() => TriageScoreSchema.parse({
      overall: -0.1,
      categoryScore: 1,
      severityScore: 1,
      priorityScore: 1,
      actionsScore: 1,
      matchedActions: [],
    })).toThrow();
  });
});

describe('ExecutionResultSchema', () => {
  it('accepts valid execution result', () => {
    const validResult = {
      passed: true,
      signalType: 'success',
      testsPassed: 5,
      testsTotal: 5,
      stdout: 'All tests passed',
      stderr: '',
      exitCode: 0,
      executionTimeMs: 1234,
    };

    const result = ExecutionResultSchema.parse(validResult);
    expect(result.passed).toBe(true);
    expect(result.signalType).toBe('success');
    expect(result.testsPassed).toBe(5);
  });

  it('accepts execution result with hidden tests', () => {
    const resultWithHidden = {
      passed: true,
      signalType: 'success',
      testsPassed: 5,
      testsTotal: 5,
      stdout: 'All tests passed',
      stderr: '',
      exitCode: 0,
      executionTimeMs: 1234,
      hiddenTestsResult: {
        passed: true,
        testsPassed: 3,
        testsTotal: 3,
      },
    };

    const result = ExecutionResultSchema.parse(resultWithHidden);
    expect(result.hiddenTestsResult?.passed).toBe(true);
    expect(result.hiddenTestsResult?.testsPassed).toBe(3);
  });

  it('rejects invalid signal type', () => {
    expect(() => ExecutionResultSchema.parse({
      passed: false,
      signalType: 'invalid_signal',
      testsPassed: 0,
      testsTotal: 5,
      stdout: '',
      stderr: 'error',
      exitCode: 1,
      executionTimeMs: 100,
    })).toThrow();
  });
});

describe('DebugLabFileSchema', () => {
  it('accepts valid file', () => {
    const validFile = {
      path: 'src/main.js',
      content: 'console.log("hello");',
      editable: true,
    };

    const result = DebugLabFileSchema.parse(validFile);
    expect(result.path).toBe('src/main.js');
    expect(result.editable).toBe(true);
  });

  it('rejects missing required fields', () => {
    expect(() => DebugLabFileSchema.parse({
      path: 'src/main.js',
    })).toThrow();
  });
});

describe('DebugLabSubmissionSchema', () => {
  it('accepts valid submission', () => {
    const validSubmission = {
      files: { 'src/main.js': 'fixed code here' },
      explanation: 'Fixed the off-by-one error in the loop',
      submittedAt: new Date().toISOString(),
    };

    const result = DebugLabSubmissionSchema.parse(validSubmission);
    expect(result.files['src/main.js']).toBe('fixed code here');
  });

  it('rejects explanation shorter than 10 characters', () => {
    expect(() => DebugLabSubmissionSchema.parse({
      files: { 'src/main.js': 'code' },
      explanation: 'Too short',
      submittedAt: new Date().toISOString(),
    })).toThrow();
  });
});

describe('ObservabilitySnapshotSchema', () => {
  it('accepts valid RED metrics', () => {
    const validSnapshot = {
      red: [{
        rate: 100.5,
        errorRate: 0.02,
        duration: { p50: 10, p95: 50, p99: 100 },
        label: 'api/users',
      }],
    };

    const result = ObservabilitySnapshotSchema.parse(validSnapshot);
    expect(result.red).toHaveLength(1);
    expect(result.red![0].rate).toBe(100.5);
  });

  it('accepts valid USE metrics', () => {
    const validSnapshot = {
      use: [{
        utilization: 0.75,
        saturation: 5,
        errors: 2,
        resource: 'cpu',
      }],
    };

    const result = ObservabilitySnapshotSchema.parse(validSnapshot);
    expect(result.use).toHaveLength(1);
    expect(result.use![0].utilization).toBe(0.75);
  });

  it('accepts logs array', () => {
    const validSnapshot = {
      logs: [
        '[INFO] Server started',
        '[ERROR] Connection failed',
      ],
      timestamp: '2024-01-15T10:00:00Z',
    };

    const result = ObservabilitySnapshotSchema.parse(validSnapshot);
    expect(result.logs).toHaveLength(2);
    expect(result.timestamp).toBe('2024-01-15T10:00:00Z');
  });

  it('rejects error rate outside 0-1 range', () => {
    expect(() => REDMetricsSchema.parse({
      rate: 100,
      errorRate: 1.5, // Invalid: > 1
      duration: { p50: 10, p95: 50, p99: 100 },
    })).toThrow();
  });

  it('rejects utilization outside 0-1 range', () => {
    expect(() => USEMetricsSchema.parse({
      utilization: 1.5, // Invalid: > 1
      saturation: 0,
      errors: 0,
      resource: 'cpu',
    })).toThrow();
  });
});

describe('DebugLabItemSchema', () => {
  it('accepts valid debug lab item', () => {
    const validItem = {
      id: 'test-item-1',
      tenantId: 'tenant-1',
      title: 'Off-by-one Error',
      description: 'Find and fix the off-by-one bug',
      difficulty: 'EASY',
      language: 'javascript',
      files: [{
        path: 'src/main.js',
        content: 'function sum(arr) { let s = 0; for (let i = 0; i < arr.length - 1; i++) { s += arr[i]; } return s; }',
        editable: true,
      }],
      testCommand: 'npm test',
      defectCategory: 'Functional',
      severity: 'Major',
      priority: 'High',
      signals: ['failing_tests'],
      toolsExpected: ['unit_tests', 'code_review'],
      requiredTriage: true,
      triageRubric: {
        expectedCategory: 'Functional',
        expectedSeverity: 'Major',
        expectedPriority: 'High',
        expectedFirstActions: ['run tests'],
      },
      createdAt: new Date().toISOString(),
    };

    const result = DebugLabItemSchema.parse(validItem);
    expect(result.id).toBe('test-item-1');
    expect(result.defectCategory).toBe('Functional');
    expect(result.signals).toContain('failing_tests');
  });

  it('rejects item with invalid language', () => {
    expect(() => DebugLabItemSchema.parse({
      id: 'test-item-1',
      tenantId: 'tenant-1',
      title: 'Test',
      description: 'Test',
      difficulty: 'EASY',
      language: 'rust', // Not supported
      files: [],
      testCommand: 'test',
      defectCategory: 'Functional',
      severity: 'Major',
      priority: 'High',
      signals: [],
      toolsExpected: [],
      requiredTriage: false,
      createdAt: new Date().toISOString(),
    })).toThrow();
  });
});

describe('DebugLabAttemptSchema', () => {
  it('accepts valid attempt', () => {
    const validAttempt = {
      id: 'attempt-1',
      tenantId: 'tenant-1',
      userId: 'user-1',
      itemId: 'item-1',
      status: 'STARTED',
      triageAnswers: null,
      triageScore: null,
      submission: null,
      executionResult: null,
      testRunCount: 0,
      submissionCount: 1,
      startedAt: new Date().toISOString(),
      completedAt: null,
    };

    const result = DebugLabAttemptSchema.parse(validAttempt);
    expect(result.id).toBe('attempt-1');
    expect(result.status).toBe('STARTED');
  });

  it('accepts attempt with triage completed', () => {
    const attemptWithTriage = {
      id: 'attempt-1',
      tenantId: 'tenant-1',
      userId: 'user-1',
      itemId: 'item-1',
      status: 'TRIAGE_COMPLETED',
      triageAnswers: {
        category: 'Functional',
        severity: 'Major',
        priority: 'High',
        firstActions: 'Run tests and review the code',
      },
      triageScore: {
        overall: 0.85,
        categoryScore: 1,
        severityScore: 1,
        priorityScore: 1,
        actionsScore: 0.4,
        matchedActions: ['run tests'],
      },
      submission: null,
      executionResult: null,
      testRunCount: 0,
      submissionCount: 1,
      startedAt: new Date().toISOString(),
      completedAt: null,
    };

    const result = DebugLabAttemptSchema.parse(attemptWithTriage);
    expect(result.status).toBe('TRIAGE_COMPLETED');
    expect(result.triageAnswers?.category).toBe('Functional');
    expect(result.triageScore?.overall).toBe(0.85);
  });

  it('accepts completed attempt with full data', () => {
    const completedAttempt = {
      id: 'attempt-1',
      tenantId: 'tenant-1',
      userId: 'user-1',
      itemId: 'item-1',
      status: 'PASSED',
      triageAnswers: {
        category: 'Functional',
        severity: 'Major',
        priority: 'High',
        firstActions: 'Run tests and review code',
      },
      triageScore: {
        overall: 1,
        categoryScore: 1,
        severityScore: 1,
        priorityScore: 1,
        actionsScore: 1,
        matchedActions: ['run tests', 'review code'],
      },
      submission: {
        files: { 'src/main.js': 'fixed code' },
        explanation: 'Fixed the loop boundary condition',
        submittedAt: new Date().toISOString(),
      },
      executionResult: {
        passed: true,
        signalType: 'success',
        testsPassed: 4,
        testsTotal: 4,
        stdout: 'All tests passed',
        stderr: '',
        exitCode: 0,
        executionTimeMs: 500,
      },
      testRunCount: 2,
      submissionCount: 1,
      startedAt: new Date().toISOString(),
      completedAt: new Date().toISOString(),
    };

    const result = DebugLabAttemptSchema.parse(completedAttempt);
    expect(result.status).toBe('PASSED');
    expect(result.submission?.explanation).toBe('Fixed the loop boundary condition');
    expect(result.executionResult?.passed).toBe(true);
    expect(result.completedAt).not.toBeNull();
  });
});
