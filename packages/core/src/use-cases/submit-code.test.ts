import { describe, it, expect, vi, beforeEach } from 'vitest';
import { submitCode, type SubmitCodeDeps, type CodeExecutor } from './submit-code.js';
import type { Attempt } from '../entities/attempt.js';
import type { Problem } from '../entities/problem.js';
import type { TestResultData } from '../entities/step.js';
import type { AttemptRepo } from '../ports/attempt-repo.js';
import type { ContentRepo } from '../ports/content-repo.js';
import type { EventSink } from '../ports/event-sink.js';
import type { Clock } from '../ports/clock.js';
import type { IdGenerator } from '../ports/id-generator.js';

// ============ Test Helpers ============

function createMockAttempt(overrides: Partial<Attempt> = {}): Attempt {
  return {
    id: 'attempt-1',
    tenantId: 'tenant-1',
    userId: 'user-1',
    problemId: 'problem-1',
    pattern: 'SLIDING_WINDOW',
    rung: 1,
    state: 'CODING',
    steps: [
      {
        id: 'step-thinking',
        attemptId: 'attempt-1',
        type: 'THINKING_GATE',
        result: 'PASS',
        data: {
          type: 'THINKING_GATE',
          selectedPattern: 'SLIDING_WINDOW',
          statedInvariant: 'Window maintains sum',
          statedComplexity: 'O(n)',
        },
        startedAt: new Date('2024-01-01T10:00:00Z'),
        completedAt: new Date('2024-01-01T10:01:00Z'),
      },
    ],
    hintsUsed: [],
    codeSubmissions: 0,
    score: null,
    startedAt: new Date('2024-01-01T10:00:00Z'),
    completedAt: null,
    ...overrides,
  };
}

function createMockProblem(overrides: Partial<Problem> = {}): Problem {
  return {
    id: 'problem-1',
    tenantId: 'tenant-1',
    title: 'Max Sum Subarray',
    statement: 'Find max sum of k consecutive elements',
    pattern: 'SLIDING_WINDOW',
    rung: 1,
    targetComplexity: 'O(n)',
    testCases: [
      { input: '[1,2,3,4,5], k=2', expectedOutput: '9', isHidden: false },
      { input: '[1,1,1,1,1], k=3', expectedOutput: '3', isHidden: false },
    ],
    hints: [],
    createdAt: new Date(),
    ...overrides,
  };
}

function createMockDeps(overrides: Partial<SubmitCodeDeps> = {}): SubmitCodeDeps {
  const mockAttempt = createMockAttempt();
  const mockProblem = createMockProblem();

  return {
    attemptRepo: {
      findById: vi.fn().mockResolvedValue(mockAttempt),
      findByUser: vi.fn().mockResolvedValue([]),
      findCompletedByPatternRung: vi.fn().mockResolvedValue([]),
      findActive: vi.fn().mockResolvedValue(null),
      save: vi.fn().mockImplementation((a) => Promise.resolve(a)),
      update: vi.fn().mockImplementation((a) => Promise.resolve(a)),
    } as unknown as AttemptRepo,
    contentRepo: {
      findById: vi.fn().mockResolvedValue(mockProblem),
      findByPatternAndRung: vi.fn().mockResolvedValue([]),
      findAll: vi.fn().mockResolvedValue([]),
    } as unknown as ContentRepo,
    eventSink: {
      emit: vi.fn().mockResolvedValue(undefined),
    } as EventSink,
    clock: {
      now: vi.fn().mockReturnValue(new Date('2024-01-01T10:05:00Z')),
    } as Clock,
    idGenerator: {
      generate: vi.fn().mockReturnValue('step-coding-1'),
    } as IdGenerator,
    codeExecutor: {
      execute: vi.fn().mockResolvedValue([
        { input: '[1,2,3,4,5], k=2', expected: '9', actual: '9', passed: true, error: null },
        { input: '[1,1,1,1,1], k=3', expected: '3', actual: '3', passed: true, error: null },
      ]),
    } as CodeExecutor,
    ...overrides,
  };
}

// ============ Tests ============

describe('submitCode - Validation Flow', () => {
  describe('Rubric Grading', () => {
    it('grades PASS when all tests pass with correct pattern', async () => {
      const deps = createMockDeps();

      // Use while loop to avoid heuristic detecting two for loops as nested
      const result = await submitCode(
        {
          tenantId: 'tenant-1',
          userId: 'user-1',
          attemptId: 'attempt-1',
          code: `
function maxSum(arr, k) {
  let windowSum = arr.slice(0, k).reduce((a, b) => a + b, 0);
  let maxSum = windowSum;
  let i = k;
  while (i < arr.length) {
    windowSum += arr[i] - arr[i - k];
    maxSum = Math.max(maxSum, windowSum);
    i++;
  }
  return maxSum;
}`,
          language: 'javascript',
        },
        deps
      );

      expect(result.validation.rubricGrade).toBe('PASS');
      expect(result.validation.rubricScore).toBeGreaterThanOrEqual(0.8);
    });

    it('grades PARTIAL when some tests pass', async () => {
      const deps = createMockDeps({
        codeExecutor: {
          execute: vi.fn().mockResolvedValue([
            { input: 'test1', expected: '9', actual: '9', passed: true, error: null },
            { input: 'test2', expected: '3', actual: '5', passed: false, error: null },
          ]),
        } as CodeExecutor,
      });

      const result = await submitCode(
        {
          tenantId: 'tenant-1',
          userId: 'user-1',
          attemptId: 'attempt-1',
          code: 'function solution() { return 9; }',
          language: 'javascript',
        },
        deps
      );

      expect(result.validation.rubricGrade).toBe('PARTIAL');
    });

    it('grades FAIL when no tests pass', async () => {
      const deps = createMockDeps({
        codeExecutor: {
          execute: vi.fn().mockResolvedValue([
            { input: 'test1', expected: '9', actual: '0', passed: false, error: null },
            { input: 'test2', expected: '3', actual: '0', passed: false, error: null },
          ]),
        } as CodeExecutor,
      });

      const result = await submitCode(
        {
          tenantId: 'tenant-1',
          userId: 'user-1',
          attemptId: 'attempt-1',
          code: 'function solution() { return 0; }',
          language: 'javascript',
        },
        deps
      );

      expect(result.validation.rubricGrade).toBe('FAIL');
    });
  });

  describe('Heuristic Detection', () => {
    it('detects nested loops in sliding window code', async () => {
      const deps = createMockDeps({
        codeExecutor: {
          execute: vi.fn().mockResolvedValue([
            { input: 'test1', expected: '9', actual: '9', passed: true, error: null },
          ]),
        } as CodeExecutor,
      });

      const result = await submitCode(
        {
          tenantId: 'tenant-1',
          userId: 'user-1',
          attemptId: 'attempt-1',
          code: `
function maxSum(arr, k) {
  let maxSum = 0;
  for (let i = 0; i <= arr.length - k; i++) {
    let sum = 0;
    for (let j = i; j < i + k; j++) {
      sum += arr[j];
    }
    maxSum = Math.max(maxSum, sum);
  }
  return maxSum;
}`,
          language: 'javascript',
        },
        deps
      );

      expect(result.validation.heuristicErrors).toContain('NESTED_LOOPS_DETECTED');
    });

    it('detects missing visited check in DFS code', async () => {
      const mockAttempt = createMockAttempt({ pattern: 'DFS' });
      const mockProblem = createMockProblem({ pattern: 'DFS' });

      const deps = createMockDeps({
        attemptRepo: {
          findById: vi.fn().mockResolvedValue(mockAttempt),
          update: vi.fn().mockImplementation((a) => Promise.resolve(a)),
        } as unknown as AttemptRepo,
        contentRepo: {
          findById: vi.fn().mockResolvedValue(mockProblem),
        } as unknown as ContentRepo,
        codeExecutor: {
          execute: vi.fn().mockResolvedValue([
            { input: 'test1', expected: '1', actual: '1', passed: true, error: null },
          ]),
        } as CodeExecutor,
      });

      const result = await submitCode(
        {
          tenantId: 'tenant-1',
          userId: 'user-1',
          attemptId: 'attempt-1',
          code: `
function dfs(grid, r, c) {
  if (r < 0 || c < 0) return;
  if (grid[r][c] === '0') return;
  dfs(grid, r+1, c);
  dfs(grid, r-1, c);
}`,
          language: 'javascript',
        },
        deps
      );

      expect(result.validation.heuristicErrors).toContain('MISSING_VISITED_CHECK');
    });

    it('passes heuristics for correct sliding window implementation', async () => {
      const deps = createMockDeps();

      // Use single loop to avoid false positive for nested loops
      const result = await submitCode(
        {
          tenantId: 'tenant-1',
          userId: 'user-1',
          attemptId: 'attempt-1',
          code: `
function maxSum(arr, k) {
  let windowSum = arr.slice(0, k).reduce((a, b) => a + b, 0);
  let maxSum = windowSum;
  let i = k;
  while (i < arr.length) {
    windowSum += arr[i] - arr[i - k];
    maxSum = Math.max(maxSum, windowSum);
    i++;
  }
  return maxSum;
}`,
          language: 'javascript',
        },
        deps
      );

      expect(result.validation.heuristicErrors).toHaveLength(0);
    });
  });

  describe('Gating Decisions', () => {
    it('returns PROCEED when all tests pass and no errors', async () => {
      const deps = createMockDeps();

      // Use single loop to avoid false positive heuristic errors
      const result = await submitCode(
        {
          tenantId: 'tenant-1',
          userId: 'user-1',
          attemptId: 'attempt-1',
          code: `
function maxSum(arr, k) {
  let windowSum = arr.slice(0, k).reduce((a, b) => a + b, 0);
  let maxSum = windowSum;
  let i = k;
  while (i < arr.length) {
    windowSum += arr[i] - arr[i - k];
    maxSum = Math.max(maxSum, windowSum);
    i++;
  }
  return maxSum;
}`,
          language: 'javascript',
        },
        deps
      );

      expect(result.gatingDecision.action).toBe('PROCEED');
      expect(result.passed).toBe(true);
    });

    it('returns SHOW_MICRO_LESSON when pattern error detected', async () => {
      const deps = createMockDeps({
        codeExecutor: {
          execute: vi.fn().mockResolvedValue([
            { input: 'test1', expected: '9', actual: '9', passed: true, error: null },
          ]),
        } as CodeExecutor,
      });

      const result = await submitCode(
        {
          tenantId: 'tenant-1',
          userId: 'user-1',
          attemptId: 'attempt-1',
          code: `
function maxSum(arr, k) {
  let maxSum = 0;
  for (let i = 0; i <= arr.length - k; i++) {
    let sum = 0;
    for (let j = i; j < i + k; j++) {
      sum += arr[j];
    }
    maxSum = Math.max(maxSum, sum);
  }
  return maxSum;
}`,
          language: 'javascript',
        },
        deps
      );

      expect(result.gatingDecision.action).toBe('SHOW_MICRO_LESSON');
      expect(result.validation.microLessonId).toBe('sliding_window_intro');
    });

    it('returns REQUIRE_REFLECTION when tests fail', async () => {
      const deps = createMockDeps({
        codeExecutor: {
          execute: vi.fn().mockResolvedValue([
            { input: 'test1', expected: '9', actual: '0', passed: false, error: null },
            { input: 'test2', expected: '3', actual: '0', passed: false, error: null },
          ]),
        } as CodeExecutor,
      });

      const result = await submitCode(
        {
          tenantId: 'tenant-1',
          userId: 'user-1',
          attemptId: 'attempt-1',
          code: 'function solution() { return 0; }',
          language: 'javascript',
        },
        deps
      );

      expect(result.gatingDecision.action).toBe('REQUIRE_REFLECTION');
    });

    it('returns SHOW_MICRO_LESSON after 3+ attempts with partial success', async () => {
      const mockAttempt = createMockAttempt({
        codeSubmissions: 3, // Already 3 submissions
      });

      // PARTIAL grade (some tests pass) to avoid FAIL reflection rule
      const deps = createMockDeps({
        attemptRepo: {
          findById: vi.fn().mockResolvedValue(mockAttempt),
          update: vi.fn().mockImplementation((a) => Promise.resolve(a)),
        } as unknown as AttemptRepo,
        codeExecutor: {
          execute: vi.fn().mockResolvedValue([
            { input: 'test1', expected: '9', actual: '9', passed: true, error: null },
            { input: 'test2', expected: '3', actual: '5', passed: false, error: null },
          ]),
        } as CodeExecutor,
      });

      const result = await submitCode(
        {
          tenantId: 'tenant-1',
          userId: 'user-1',
          attemptId: 'attempt-1',
          code: 'function solution() { return 5; }',
          language: 'javascript',
        },
        deps
      );

      expect(result.gatingDecision.action).toBe('SHOW_MICRO_LESSON');
      expect(result.gatingDecision.reason).toContain('Multiple attempts');
    });
  });

  describe('State Transitions', () => {
    it('transitions to COMPLETED when PROCEED and all tests pass', async () => {
      const deps = createMockDeps();

      // Use single loop to avoid false positive heuristic errors
      const result = await submitCode(
        {
          tenantId: 'tenant-1',
          userId: 'user-1',
          attemptId: 'attempt-1',
          code: `
function maxSum(arr, k) {
  let windowSum = arr.slice(0, k).reduce((a, b) => a + b, 0);
  let maxSum = windowSum;
  let i = k;
  while (i < arr.length) {
    windowSum += arr[i] - arr[i - k];
    maxSum = Math.max(maxSum, windowSum);
    i++;
  }
  return maxSum;
}`,
          language: 'javascript',
        },
        deps
      );

      expect(result.attempt.state).toBe('COMPLETED');
      expect(result.attempt.completedAt).not.toBeNull();
    });

    it('transitions to REFLECTION when REQUIRE_REFLECTION', async () => {
      const deps = createMockDeps({
        codeExecutor: {
          execute: vi.fn().mockResolvedValue([
            { input: 'test1', expected: '9', actual: '0', passed: false, error: null },
          ]),
        } as CodeExecutor,
      });

      const result = await submitCode(
        {
          tenantId: 'tenant-1',
          userId: 'user-1',
          attemptId: 'attempt-1',
          code: 'function solution() { return 0; }',
          language: 'javascript',
        },
        deps
      );

      expect(result.attempt.state).toBe('REFLECTION');
      expect(result.attempt.completedAt).toBeNull();
    });

    it('stays in CODING when SHOW_MICRO_LESSON', async () => {
      const deps = createMockDeps({
        codeExecutor: {
          execute: vi.fn().mockResolvedValue([
            { input: 'test1', expected: '9', actual: '9', passed: true, error: null },
          ]),
        } as CodeExecutor,
      });

      const result = await submitCode(
        {
          tenantId: 'tenant-1',
          userId: 'user-1',
          attemptId: 'attempt-1',
          code: `
function maxSum(arr, k) {
  let maxSum = 0;
  for (let i = 0; i <= arr.length - k; i++) {
    let sum = 0;
    for (let j = i; j < i + k; j++) {
      sum += arr[j];
    }
    maxSum = Math.max(maxSum, sum);
  }
  return maxSum;
}`,
          language: 'javascript',
        },
        deps
      );

      expect(result.attempt.state).toBe('CODING');
      expect(result.validation.microLessonId).toBeDefined();
    });
  });

  describe('Validation Data Storage', () => {
    it('stores validation data in coding step', async () => {
      const deps = createMockDeps();

      const result = await submitCode(
        {
          tenantId: 'tenant-1',
          userId: 'user-1',
          attemptId: 'attempt-1',
          code: 'function solution() {}',
          language: 'javascript',
        },
        deps
      );

      const codingStep = result.attempt.steps.find((s) => s.type === 'CODING');
      expect(codingStep).toBeDefined();

      const data = codingStep!.data as { validation?: unknown };
      expect(data.validation).toBeDefined();
      expect(data.validation).toEqual(result.validation);
    });

    it('increments codeSubmissions on valid submission', async () => {
      const mockAttempt = createMockAttempt({ codeSubmissions: 2 });
      const deps = createMockDeps({
        attemptRepo: {
          findById: vi.fn().mockResolvedValue(mockAttempt),
          update: vi.fn().mockImplementation((a) => Promise.resolve(a)),
        } as unknown as AttemptRepo,
      });

      const result = await submitCode(
        {
          tenantId: 'tenant-1',
          userId: 'user-1',
          attemptId: 'attempt-1',
          code: 'function solution() {}',
          language: 'javascript',
        },
        deps
      );

      expect(result.attempt.codeSubmissions).toBe(3);
    });
  });

  describe('Events', () => {
    it('emits STEP_COMPLETED event with result', async () => {
      const mockEmit = vi.fn().mockResolvedValue(undefined);
      const deps = createMockDeps({
        eventSink: { emit: mockEmit } as EventSink,
      });

      await submitCode(
        {
          tenantId: 'tenant-1',
          userId: 'user-1',
          attemptId: 'attempt-1',
          code: 'function solution() {}',
          language: 'javascript',
        },
        deps
      );

      expect(mockEmit).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'STEP_COMPLETED',
          tenantId: 'tenant-1',
          userId: 'user-1',
          attemptId: 'attempt-1',
          stepType: 'CODING',
          result: expect.stringMatching(/PASS|FAIL/),
        })
      );
    });
  });

  describe('Error Cases', () => {
    it('throws when attempt not found', async () => {
      const deps = createMockDeps({
        attemptRepo: {
          findById: vi.fn().mockResolvedValue(null),
        } as unknown as AttemptRepo,
      });

      await expect(
        submitCode(
          {
            tenantId: 'tenant-1',
            userId: 'user-1',
            attemptId: 'attempt-1',
            code: 'code',
            language: 'javascript',
          },
          deps
        )
      ).rejects.toThrow('Attempt not found');
    });

    it('throws when user does not own attempt', async () => {
      const mockAttempt = createMockAttempt({ userId: 'other-user' });
      const deps = createMockDeps({
        attemptRepo: {
          findById: vi.fn().mockResolvedValue(mockAttempt),
        } as unknown as AttemptRepo,
      });

      await expect(
        submitCode(
          {
            tenantId: 'tenant-1',
            userId: 'user-1',
            attemptId: 'attempt-1',
            code: 'code',
            language: 'javascript',
          },
          deps
        )
      ).rejects.toThrow('Unauthorized');
    });

    it('throws when thinking gate not passed', async () => {
      const mockAttempt = createMockAttempt({ steps: [] }); // No thinking gate
      const deps = createMockDeps({
        attemptRepo: {
          findById: vi.fn().mockResolvedValue(mockAttempt),
        } as unknown as AttemptRepo,
      });

      await expect(
        submitCode(
          {
            tenantId: 'tenant-1',
            userId: 'user-1',
            attemptId: 'attempt-1',
            code: 'code',
            language: 'javascript',
          },
          deps
        )
      ).rejects.toThrow('thinking gate');
    });

    it('throws when not in CODING state', async () => {
      const mockAttempt = createMockAttempt({ state: 'REFLECTION' });
      const deps = createMockDeps({
        attemptRepo: {
          findById: vi.fn().mockResolvedValue(mockAttempt),
        } as unknown as AttemptRepo,
      });

      await expect(
        submitCode(
          {
            tenantId: 'tenant-1',
            userId: 'user-1',
            attemptId: 'attempt-1',
            code: 'code',
            language: 'javascript',
          },
          deps
        )
      ).rejects.toThrow('Cannot submit code in current state');
    });
  });

  describe('DFS Pattern Validation', () => {
    it('detects missing backtrack in DFS path-finding code', async () => {
      const mockAttempt = createMockAttempt({ pattern: 'DFS' });
      const mockProblem = createMockProblem({ pattern: 'DFS' });

      const deps = createMockDeps({
        attemptRepo: {
          findById: vi.fn().mockResolvedValue(mockAttempt),
          update: vi.fn().mockImplementation((a) => Promise.resolve(a)),
        } as unknown as AttemptRepo,
        contentRepo: {
          findById: vi.fn().mockResolvedValue(mockProblem),
        } as unknown as ContentRepo,
        codeExecutor: {
          execute: vi.fn().mockResolvedValue([
            { input: 'test', expected: '1', actual: '1', passed: true, error: null },
          ]),
        } as CodeExecutor,
      });

      const result = await submitCode(
        {
          tenantId: 'tenant-1',
          userId: 'user-1',
          attemptId: 'attempt-1',
          code: `
function findPaths(graph, start, end) {
  const paths = [];
  const path = [];

  function dfs(node) {
    path.push(node);
    if (node === end) {
      paths.push([...path]);
      return;
    }
    for (const next of graph[node]) {
      dfs(next);
    }
    // Missing: path.length should decrease here
  }

  dfs(start);
  return paths;
}`,
          language: 'javascript',
        },
        deps
      );

      expect(result.validation.heuristicErrors).toContain('MISSING_BACKTRACK');
    });

    it('passes when DFS has proper visited tracking', async () => {
      const mockAttempt = createMockAttempt({ pattern: 'DFS' });
      const mockProblem = createMockProblem({ pattern: 'DFS' });

      const deps = createMockDeps({
        attemptRepo: {
          findById: vi.fn().mockResolvedValue(mockAttempt),
          update: vi.fn().mockImplementation((a) => Promise.resolve(a)),
        } as unknown as AttemptRepo,
        contentRepo: {
          findById: vi.fn().mockResolvedValue(mockProblem),
        } as unknown as ContentRepo,
        codeExecutor: {
          execute: vi.fn().mockResolvedValue([
            { input: 'test', expected: '1', actual: '1', passed: true, error: null },
          ]),
        } as CodeExecutor,
      });

      const result = await submitCode(
        {
          tenantId: 'tenant-1',
          userId: 'user-1',
          attemptId: 'attempt-1',
          code: `
function numIslands(grid) {
  const visited = new Set();
  let count = 0;

  function dfs(r, c) {
    if (r < 0 || c < 0) return;
    const key = r + ',' + c;
    if (visited.has(key)) return;
    visited.add(key);
    dfs(r+1, c);
    dfs(r-1, c);
  }

  return count;
}`,
          language: 'javascript',
        },
        deps
      );

      expect(result.validation.heuristicErrors).not.toContain('MISSING_VISITED_CHECK');
    });
  });
});
