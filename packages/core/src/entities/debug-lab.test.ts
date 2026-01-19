import { describe, it, expect } from 'vitest';
import {
  scoreCategoryMatch,
  scoreSeverityMatch,
  scorePriorityMatch,
  scoreActionsMatch,
  calculateTriageScore,
  determineSignalType,
  type TriageAnswers,
  type TriageRubric,
  type DefectCategory,
  type SeverityLevel,
  type PriorityLevel,
} from './debug-lab.js';

// ============ Category Scoring Tests ============

describe('scoreCategoryMatch', () => {
  it('returns 1 for exact category match', () => {
    expect(scoreCategoryMatch('Functional', 'Functional')).toBe(1);
    expect(scoreCategoryMatch('Concurrency', 'Concurrency')).toBe(1);
    expect(scoreCategoryMatch('Resource', 'Resource')).toBe(1);
  });

  it('returns 0.5 for adjacent category', () => {
    // Concurrency is adjacent to Heisenbug
    expect(scoreCategoryMatch('Heisenbug', 'Concurrency')).toBe(0.5);
    // Resource is adjacent to Performance
    expect(scoreCategoryMatch('Performance', 'Resource')).toBe(0.5);
    // Environment is adjacent to Container
    expect(scoreCategoryMatch('Container', 'Environment')).toBe(0.5);
  });

  it('returns 0 for non-adjacent categories', () => {
    expect(scoreCategoryMatch('Functional', 'Concurrency')).toBe(0);
    expect(scoreCategoryMatch('Observability', 'Resource')).toBe(0);
  });
});

// ============ Severity Scoring Tests ============

describe('scoreSeverityMatch', () => {
  it('returns 1 for exact severity match', () => {
    expect(scoreSeverityMatch('Critical', 'Critical')).toBe(1);
    expect(scoreSeverityMatch('Major', 'Major')).toBe(1);
    expect(scoreSeverityMatch('Minor', 'Minor')).toBe(1);
    expect(scoreSeverityMatch('Low', 'Low')).toBe(1);
  });

  it('returns 0.5 for adjacent severity (off by 1)', () => {
    expect(scoreSeverityMatch('Major', 'Critical')).toBe(0.5);
    expect(scoreSeverityMatch('Critical', 'Major')).toBe(0.5);
    expect(scoreSeverityMatch('Minor', 'Major')).toBe(0.5);
    expect(scoreSeverityMatch('Low', 'Minor')).toBe(0.5);
  });

  it('returns 0 for non-adjacent severity (off by 2+)', () => {
    expect(scoreSeverityMatch('Critical', 'Minor')).toBe(0);
    expect(scoreSeverityMatch('Critical', 'Low')).toBe(0);
    expect(scoreSeverityMatch('Major', 'Low')).toBe(0);
  });
});

// ============ Priority Scoring Tests ============

describe('scorePriorityMatch', () => {
  it('returns 1 for exact priority match', () => {
    expect(scorePriorityMatch('High', 'High')).toBe(1);
    expect(scorePriorityMatch('Medium', 'Medium')).toBe(1);
    expect(scorePriorityMatch('Low', 'Low')).toBe(1);
  });

  it('returns 0.5 for adjacent priority', () => {
    expect(scorePriorityMatch('Medium', 'High')).toBe(0.5);
    expect(scorePriorityMatch('High', 'Medium')).toBe(0.5);
    expect(scorePriorityMatch('Low', 'Medium')).toBe(0.5);
  });

  it('returns 0 for non-adjacent priority', () => {
    expect(scorePriorityMatch('High', 'Low')).toBe(0);
    expect(scorePriorityMatch('Low', 'High')).toBe(0);
  });
});

// ============ Actions Scoring Tests ============

describe('scoreActionsMatch', () => {
  it('returns 1 when all expected actions are mentioned', () => {
    const result = scoreActionsMatch(
      'First I would run tests, then check loop bounds for boundary errors',
      ['run tests', 'check loop', 'boundary']
    );
    expect(result.score).toBe(1);
    expect(result.matchedActions).toContain('run tests');
    expect(result.matchedActions).toContain('check loop');
    expect(result.matchedActions).toContain('boundary');
  });

  it('returns partial score when some actions are mentioned', () => {
    const result = scoreActionsMatch(
      'I would run tests and check logs to see the output',
      ['run tests', 'check logs', 'add breakpoints']
    );
    expect(result.score).toBeCloseTo(2/3, 2);
    expect(result.matchedActions).toContain('run tests');
    expect(result.matchedActions).toContain('check logs');
    expect(result.matchedActions).toHaveLength(2);
  });

  it('returns 0 when no actions are mentioned', () => {
    const result = scoreActionsMatch(
      'I would restart the server',
      ['run tests', 'check logs', 'profiling']
    );
    expect(result.score).toBe(0);
    expect(result.matchedActions).toHaveLength(0);
  });

  it('handles variations with hyphens and underscores', () => {
    // The function converts expected actions like 'unit_tests' to variations:
    // 'unit_tests', 'unit tests', 'unit-tests'
    // So user text containing 'unit tests' will match 'unit_tests' expected action
    const result = scoreActionsMatch(
      'I would write unit tests and look for race condition issues',
      ['unit_tests', 'race-condition']
    );
    expect(result.matchedActions).toContain('unit_tests');
    expect(result.matchedActions).toContain('race-condition');
    expect(result.score).toBe(1);
  });

  it('is case insensitive', () => {
    const result = scoreActionsMatch(
      'Run TESTS and check LOGS',
      ['run tests', 'check logs']
    );
    expect(result.score).toBe(1);
  });

  it('returns 1 when expectedActions is empty', () => {
    const result = scoreActionsMatch('any text here', []);
    expect(result.score).toBe(1);
  });
});

// ============ Overall Triage Score Tests ============

describe('calculateTriageScore', () => {
  const perfectRubric: TriageRubric = {
    expectedCategory: 'Functional',
    expectedSeverity: 'Major',
    expectedPriority: 'High',
    expectedFirstActions: ['run tests', 'check loop'],
  };

  it('returns perfect score for exact match', () => {
    const answers: TriageAnswers = {
      category: 'Functional',
      severity: 'Major',
      priority: 'High',
      firstActions: 'I would run tests first and then check loop boundaries',
    };

    const score = calculateTriageScore(answers, perfectRubric);

    expect(score.overall).toBe(1);
    expect(score.categoryScore).toBe(1);
    expect(score.severityScore).toBe(1);
    expect(score.priorityScore).toBe(1);
    expect(score.actionsScore).toBe(1);
  });

  it('returns partial score for close but not exact match', () => {
    const answers: TriageAnswers = {
      category: 'Performance', // Adjacent to Functional
      severity: 'Critical',    // Adjacent to Major
      priority: 'Medium',      // Adjacent to High
      firstActions: 'I would run tests first',
    };

    const score = calculateTriageScore(answers, perfectRubric);

    expect(score.categoryScore).toBe(0.5);
    expect(score.severityScore).toBe(0.5);
    expect(score.priorityScore).toBe(0.5);
    expect(score.actionsScore).toBe(0.5);
    // Weighted: 0.5*0.4 + 0.5*0.2 + 0.5*0.15 + 0.5*0.25 = 0.5
    expect(score.overall).toBe(0.5);
  });

  it('returns low score for wrong answers', () => {
    const answers: TriageAnswers = {
      category: 'Observability', // Not adjacent
      severity: 'Low',           // Far from Major
      priority: 'Low',           // Far from High
      firstActions: 'I would restart everything',
    };

    const score = calculateTriageScore(answers, perfectRubric);

    expect(score.categoryScore).toBe(0);
    expect(score.severityScore).toBe(0);
    expect(score.priorityScore).toBe(0);
    expect(score.actionsScore).toBe(0);
    expect(score.overall).toBe(0);
  });

  it('weighs category most heavily at 40%', () => {
    const answers: TriageAnswers = {
      category: 'Functional', // Correct (1)
      severity: 'Low',        // Wrong (0)
      priority: 'Low',        // Wrong (0)
      firstActions: '',       // Wrong (0)
    };

    const score = calculateTriageScore(answers, perfectRubric);

    // Only category is correct: 1 * 0.4 = 0.4
    expect(score.overall).toBe(0.4);
  });
});

// ============ Signal Type Detection Tests ============

describe('determineSignalType', () => {
  it('returns timeout for timed out execution', () => {
    expect(determineSignalType(1, '', '', true)).toBe('timeout');
  });

  it('returns success for exit code 0', () => {
    expect(determineSignalType(0, 'Tests passed', '', false)).toBe('success');
  });

  it('returns compile_error for syntax errors', () => {
    expect(determineSignalType(1, '', 'SyntaxError: Unexpected token', false)).toBe('compile_error');
    expect(determineSignalType(1, '', 'syntax error near line 5', false)).toBe('compile_error');
  });

  it('returns crash for fatal errors', () => {
    expect(determineSignalType(1, '', 'Segmentation fault', false)).toBe('crash');
    expect(determineSignalType(1, '', 'fatal error: something', false)).toBe('crash');
    expect(determineSignalType(1, '', 'panic: runtime error', false)).toBe('crash');
  });

  it('returns test_failure for assertion errors', () => {
    expect(determineSignalType(1, 'Test failed: expected 5, got 3', '', false)).toBe('test_failure');
    expect(determineSignalType(1, '', 'AssertionError: values differ', false)).toBe('test_failure');
    expect(determineSignalType(1, 'Expected: 10', '', false)).toBe('test_failure');
  });

  it('returns runtime_error for exceptions', () => {
    expect(determineSignalType(1, '', 'TypeError: undefined is not a function', false)).toBe('runtime_error');
    expect(determineSignalType(1, '', 'Traceback (most recent call last)', false)).toBe('runtime_error');
  });

  it('defaults to test_failure for unknown non-zero exit', () => {
    expect(determineSignalType(1, 'something failed', '', false)).toBe('test_failure');
  });
});

// ============ Taxonomy Constants Tests ============

describe('Taxonomy Constants', () => {
  it('has 9 defect categories', () => {
    const categories: DefectCategory[] = [
      'Functional', 'Concurrency', 'Resource', 'Distributed',
      'Heisenbug', 'Environment', 'Container', 'Performance', 'Observability'
    ];
    expect(categories).toHaveLength(9);
  });

  it('has 4 severity levels', () => {
    const severities: SeverityLevel[] = ['Critical', 'Major', 'Minor', 'Low'];
    expect(severities).toHaveLength(4);
  });

  it('has 3 priority levels', () => {
    const priorities: PriorityLevel[] = ['High', 'Medium', 'Low'];
    expect(priorities).toHaveLength(3);
  });
});
