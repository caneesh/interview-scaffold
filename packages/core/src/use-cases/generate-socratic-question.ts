/**
 * Generate Socratic Question Use Case
 *
 * Takes attemptId + evidence (test failures, gate misses) and generates
 * an evidence-gated Socratic question to guide the student without
 * revealing the answer.
 *
 * Core principle: All outputs MUST include evidenceRefs from evaluation data.
 */

import type { TenantId } from '../entities/tenant.js';
import type { AttemptId, Attempt } from '../entities/attempt.js';
import type { Problem } from '../entities/problem.js';
import type { CodingData, ThinkingGateData, TestResultData } from '../entities/step.js';
import type { AttemptRepo } from '../ports/attempt-repo.js';
import type { ContentRepo } from '../ports/content-repo.js';
import type { Clock } from '../ports/clock.js';
import type { IdGenerator } from '../ports/id-generator.js';
import type {
  SocraticCoachPort,
  SocraticContext,
  SocraticQuestion,
  MistakeAnalysis,
  SocraticNextActionResult,
  EvidenceRef,
  SocraticDifficulty,
  GenerateSocraticQuestionResult,
} from '../ports/socratic-coach.js';
import type { AIArtifactsRepo, AIFeedback, SocraticSession } from '../ports/ai-artifacts-repo.js';
import { validateSocraticCoachResponse } from '../ports/socratic-coach.js';

// ============ Input/Output Types ============

export interface GenerateSocraticQuestionInput {
  readonly tenantId: TenantId;
  readonly userId: string;
  readonly attemptId: AttemptId;
  readonly focusConcept?: string;
  readonly preferredDifficulty?: SocraticDifficulty;
}

export interface GenerateSocraticQuestionOutput {
  readonly question: SocraticQuestion;
  readonly mistakeAnalysis: MistakeAnalysis;
  readonly nextAction: SocraticNextActionResult;
  readonly source: 'ai' | 'deterministic';
  readonly session: SocraticSession;
}

export interface GenerateSocraticQuestionDeps {
  readonly attemptRepo: AttemptRepo;
  readonly contentRepo: ContentRepo;
  readonly aiArtifactsRepo: AIArtifactsRepo;
  readonly socraticCoach: SocraticCoachPort;
  readonly clock: Clock;
  readonly idGenerator: IdGenerator;
}

// ============ Errors ============

export class GenerateSocraticQuestionError extends Error {
  constructor(
    message: string,
    public readonly code: string
  ) {
    super(message);
    this.name = 'GenerateSocraticQuestionError';
  }
}

// ============ Use Case ============

export async function generateSocraticQuestion(
  input: GenerateSocraticQuestionInput,
  deps: GenerateSocraticQuestionDeps
): Promise<GenerateSocraticQuestionOutput> {
  const { tenantId, userId, attemptId, focusConcept, preferredDifficulty } = input;
  const {
    attemptRepo,
    contentRepo,
    aiArtifactsRepo,
    socraticCoach,
    clock,
    idGenerator,
  } = deps;

  // ============ 1. Load Attempt and Validate ============

  const attempt = await attemptRepo.findById(tenantId, attemptId);
  if (!attempt) {
    throw new GenerateSocraticQuestionError('Attempt not found', 'ATTEMPT_NOT_FOUND');
  }

  if (attempt.userId !== userId) {
    throw new GenerateSocraticQuestionError('Unauthorized', 'UNAUTHORIZED');
  }

  // Must have at least one coding submission with test results
  const codingSteps = attempt.steps.filter((s) => s.type === 'CODING');
  if (codingSteps.length === 0) {
    throw new GenerateSocraticQuestionError(
      'No code submissions to analyze',
      'NO_SUBMISSIONS'
    );
  }

  // ============ 2. Load Problem ============

  const problem = await contentRepo.findById(tenantId, attempt.problemId);
  if (!problem) {
    throw new GenerateSocraticQuestionError('Problem not found', 'PROBLEM_NOT_FOUND');
  }

  // ============ 3. Build Evidence Context ============

  const context = buildSocraticContext(attempt, problem);

  // ============ 4. Get or Create Socratic Session ============

  const session = await aiArtifactsRepo.getOrCreateSession(tenantId, attemptId, userId);

  // Build context with session turns
  const fullContext: SocraticContext = {
    ...context,
    previousTurns: session.turns,
  };

  // ============ 5. Generate Question (AI or Deterministic) ============

  let result: GenerateSocraticQuestionResult;
  const now = clock.now();

  if (socraticCoach.isEnabled()) {
    const aiResult = await socraticCoach.generateSocraticQuestion(fullContext);

    if (aiResult) {
      const validation = validateSocraticCoachResponse(aiResult);

      if (validation.valid) {
        result = aiResult;
      } else {
        // AI response invalid, fall back to deterministic
        result = generateDeterministicQuestion(fullContext, idGenerator, focusConcept, preferredDifficulty);
      }
    } else {
      // AI failed, fall back to deterministic
      result = generateDeterministicQuestion(fullContext, idGenerator, focusConcept, preferredDifficulty);
    }
  } else {
    // AI not enabled, use deterministic
    result = generateDeterministicQuestion(fullContext, idGenerator, focusConcept, preferredDifficulty);
  }

  // ============ 6. Persist AI Feedback Artifacts ============

  // Save mistake analysis
  const mistakeAnalysisFeedback: AIFeedback = {
    id: idGenerator.generate(),
    tenantId,
    attemptId,
    type: 'mistake_analysis',
    content: result.mistakeAnalysis,
    source: result.source,
    createdAt: now,
  };
  await aiArtifactsRepo.saveFeedback(mistakeAnalysisFeedback);

  // Save Socratic question
  const questionFeedback: AIFeedback = {
    id: idGenerator.generate(),
    tenantId,
    attemptId,
    type: 'socratic_question',
    content: result.question,
    source: result.source,
    createdAt: now,
  };
  await aiArtifactsRepo.saveFeedback(questionFeedback);

  // ============ 7. Add Assistant Turn to Session ============

  const assistantTurn = {
    id: idGenerator.generate(),
    role: 'assistant' as const,
    content: result.question.question,
    metadata: {
      questionId: result.question.id,
      timestamp: now,
    },
  };

  const updatedSession = await aiArtifactsRepo.addTurn(tenantId, session.id, assistantTurn);
  await aiArtifactsRepo.setCurrentQuestion(tenantId, session.id, result.question.id);

  return {
    question: result.question,
    mistakeAnalysis: result.mistakeAnalysis,
    nextAction: result.nextAction,
    source: result.source,
    session: updatedSession,
  };
}

// ============ Context Builder ============

function buildSocraticContext(
  attempt: Attempt,
  problem: Problem
): Omit<SocraticContext, 'previousTurns'> {
  // Get latest coding step
  const codingSteps = attempt.steps.filter((s) => s.type === 'CODING');
  const latestCodingStep = codingSteps[codingSteps.length - 1];
  const codingData = latestCodingStep?.data as CodingData | undefined;

  // Get thinking gate data
  const thinkingGateStep = attempt.steps.find((s) => s.type === 'THINKING_GATE');
  const thinkingGateData = thinkingGateStep?.data as ThinkingGateData | undefined;

  return {
    attemptId: attempt.id,
    problemId: problem.id,
    problemStatement: problem.statement,
    pattern: attempt.pattern,
    rung: attempt.rung,
    latestCode: codingData?.code ?? '',
    language: codingData?.language ?? 'unknown',
    testResults: codingData?.testResults ?? [],
    thinkingGateData: thinkingGateData
      ? {
          selectedPattern: thinkingGateData.selectedPattern,
          statedInvariant: thinkingGateData.statedInvariant,
          passed: thinkingGateStep?.result === 'PASS',
        }
      : undefined,
    hintsUsed: attempt.hintsUsed,
    codeSubmissions: attempt.codeSubmissions,
  };
}

// ============ Deterministic Fallback ============

/**
 * Generate a deterministic Socratic question when AI is unavailable.
 * Uses heuristics based on test failure patterns.
 */
function generateDeterministicQuestion(
  context: SocraticContext,
  idGenerator: IdGenerator,
  focusConcept?: string,
  preferredDifficulty?: SocraticDifficulty
): GenerateSocraticQuestionResult {
  const { testResults, pattern, codeSubmissions, thinkingGateData, hintsUsed } = context;

  // Analyze test failures
  const failedTests = testResults.filter((t) => !t.passed);
  const passedTests = testResults.filter((t) => t.passed);

  // Build evidence refs from test results
  const evidenceRefs: EvidenceRef[] = failedTests.map((test, i) => ({
    source: 'test_result' as const,
    sourceId: `test-${i}`,
    description: `Test failed: expected "${test.expected}" but got "${test.actual}"`,
    detail: test.error ?? undefined,
  }));

  // Add thinking gate evidence if relevant
  if (thinkingGateData && !thinkingGateData.passed) {
    evidenceRefs.push({
      source: 'gate_outcome' as const,
      sourceId: 'thinking-gate',
      description: 'Thinking gate not passed',
      detail: thinkingGateData.selectedPattern ?? undefined,
    });
  }

  // Determine the concept to focus on
  const conceptMissed = focusConcept ?? determineConceptFromPattern(pattern, failedTests);

  // Determine difficulty based on attempt count and hints used
  const difficulty: SocraticDifficulty =
    preferredDifficulty ??
    (hintsUsed.length > 2
      ? 'hint'
      : codeSubmissions > 3
        ? 'hint'
        : codeSubmissions > 1
          ? 'probe'
          : 'challenge');

  // Generate question based on failure pattern
  const question = generateQuestionForPattern(
    pattern,
    failedTests,
    passedTests,
    difficulty,
    conceptMissed,
    idGenerator.generate()
  );

  // Add evidence to question
  const questionWithEvidence: SocraticQuestion = {
    ...question,
    evidenceRefs,
  };

  // Build mistake analysis
  const mistakeAnalysis: MistakeAnalysis = {
    testsFailed: failedTests.map((_, i) => `test-${i}`),
    conceptMissed,
    evidenceRefs,
    suggestedFocus: `Focus on ${conceptMissed} in the ${pattern} pattern`,
    confidence: 0.7,
    pattern,
    attemptCount: codeSubmissions,
  };

  // Build next action
  const nextAction: SocraticNextActionResult = {
    action: 'ask_socratic_question',
    reason: `Student has ${failedTests.length} failing test(s) after ${codeSubmissions} submission(s)`,
    evidenceRefs,
  };

  return {
    question: questionWithEvidence,
    mistakeAnalysis,
    nextAction,
    source: 'deterministic',
  };
}

/**
 * Determine the most likely concept missed based on pattern and failures
 */
function determineConceptFromPattern(
  pattern: string,
  failedTests: readonly TestResultData[]
): string {
  // Analyze failure patterns
  const hasEmptyInput = failedTests.some((t) => t.input.includes('[]') || t.input === '');
  const hasSingleElement = failedTests.some((t) => {
    const parsed = tryParseArray(t.input);
    return parsed && parsed.length === 1;
  });
  const hasAllSame = failedTests.some((t) => {
    const parsed = tryParseArray(t.input);
    return parsed && new Set(parsed).size === 1;
  });

  // Pattern-specific concepts
  const patternConcepts: Record<string, string[]> = {
    SLIDING_WINDOW: ['window boundaries', 'window expansion', 'window contraction', 'condition check'],
    TWO_POINTERS: ['pointer movement', 'convergence condition', 'boundary handling'],
    PREFIX_SUM: ['prefix computation', 'range query', 'index handling'],
    BINARY_SEARCH: ['search space', 'mid calculation', 'termination condition'],
    BFS: ['queue operations', 'visited tracking', 'level processing'],
    DFS: ['recursion base case', 'visited tracking', 'backtracking'],
    DYNAMIC_PROGRAMMING: ['subproblem definition', 'recurrence relation', 'base cases'],
    BACKTRACKING: ['choice making', 'constraint checking', 'undoing choices'],
    GREEDY: ['local optimal choice', 'proof of correctness', 'sorting prerequisite'],
    HEAP: ['heap property', 'insertion/extraction', 'priority handling'],
    TRIE: ['node structure', 'traversal', 'word boundaries'],
    UNION_FIND: ['find operation', 'union operation', 'path compression'],
    INTERVAL_MERGING: ['sorting', 'overlap detection', 'merge logic'],
  };

  const concepts = patternConcepts[pattern] ?? ['algorithm implementation'];

  // Select concept based on failure pattern
  if (hasEmptyInput) {
    return 'edge case handling (empty input)';
  }
  if (hasSingleElement) {
    return 'edge case handling (single element)';
  }
  if (hasAllSame) {
    return 'edge case handling (duplicate values)';
  }

  // Default to first concept for the pattern
  return concepts[0] ?? 'algorithm implementation';
}

/**
 * Generate a question appropriate for the pattern and difficulty
 */
function generateQuestionForPattern(
  pattern: string,
  failedTests: readonly TestResultData[],
  _passedTests: readonly TestResultData[],
  difficulty: SocraticDifficulty,
  concept: string,
  questionId: string
): Omit<SocraticQuestion, 'evidenceRefs'> {
  // Base questions by difficulty
  const hintQuestions: Record<string, string> = {
    SLIDING_WINDOW: 'When does your window need to shrink? What condition tells you it\'s too large?',
    TWO_POINTERS: 'What makes your pointers move? When should each one advance?',
    PREFIX_SUM: 'What does each position in your prefix sum represent? How do you use it for range queries?',
    BINARY_SEARCH: 'How do you know which half to search next? What if the target isn\'t in the array?',
    BFS: 'How do you know when you\'ve visited a node? What determines the order of exploration?',
    DFS: 'What stops your recursion? What do you do after exploring a path?',
    DYNAMIC_PROGRAMMING: 'What smaller problems make up this larger one? How do you combine them?',
    BACKTRACKING: 'When do you need to undo a choice? How do you know a path won\'t work?',
    GREEDY: 'Why is the local optimal choice also globally optimal? Can you prove it?',
    HEAP: 'What element should be at the top of your heap? When do you push or pop?',
    TRIE: 'How do you represent the end of a word? How do you traverse to find matches?',
    UNION_FIND: 'What does "find" return? When should two sets be combined?',
    INTERVAL_MERGING: 'How do you detect overlapping intervals? What determines if two intervals merge?',
  };

  const probeQuestions: Record<string, string> = {
    SLIDING_WINDOW: 'Walk me through what happens to your window when processing this failing test input. What state changes at each step?',
    TWO_POINTERS: 'For this failing test, where are your pointers at the moment the wrong result is produced?',
    PREFIX_SUM: 'Can you trace through how you\'re calculating the prefix sum and using it for the query in this failing case?',
    BINARY_SEARCH: 'What values do your low, mid, and high pointers have when the algorithm terminates incorrectly?',
    BFS: 'Draw out the queue state at each step for the failing test. Where does it diverge from expected?',
    DFS: 'Trace the call stack for the failing test. At what point does the recursion produce the wrong result?',
    DYNAMIC_PROGRAMMING: 'What value is stored in your DP table for the subproblem related to this failing test?',
    BACKTRACKING: 'At what choice point does your algorithm make a decision that leads to the wrong answer?',
    GREEDY: 'Walk through your greedy choices for this input. Which choice leads to a suboptimal result?',
    HEAP: 'What sequence of push/pop operations happens for this input? Where does the heap state go wrong?',
    TRIE: 'Trace the trie traversal for this failing query. Where does it fail to find the expected result?',
    UNION_FIND: 'What does the disjoint set forest look like after processing this input? Which union is incorrect?',
    INTERVAL_MERGING: 'List the intervals in sorted order for this input. Which pair should merge but doesn\'t?',
  };

  const challengeQuestions: Record<string, string> = {
    SLIDING_WINDOW: 'Your code passes some tests but fails others. What invariant should your window maintain that might be violated?',
    TWO_POINTERS: 'Compare a passing and failing test input. What property differs that your algorithm handles incorrectly?',
    PREFIX_SUM: 'Why does the direct approach work but yours doesn\'t for this input? What\'s the relationship between them?',
    BINARY_SEARCH: 'Your code finds some values but not others. What assumption about the search space might be wrong?',
    BFS: 'Some paths are found correctly, others aren\'t. What about the graph structure affects which paths work?',
    DFS: 'Your recursion terminates correctly sometimes but not always. What condition determines when it fails?',
    DYNAMIC_PROGRAMMING: 'Your DP solution works for smaller inputs. What changes as the input grows that breaks it?',
    BACKTRACKING: 'Some valid solutions are found, others are missed. What pruning condition might be too aggressive?',
    GREEDY: 'Your greedy choice works for most inputs. Can you construct an input where it definitely fails?',
    HEAP: 'Your heap-based solution has the right idea. What edge case in the heap operations might cause issues?',
    TRIE: 'Your trie handles most queries correctly. What about certain word patterns might it miss?',
    UNION_FIND: 'Some unions work correctly. What pattern of unions might cause incorrect groupings?',
    INTERVAL_MERGING: 'Some merges are correct, others aren\'t. What about the interval boundaries trips up your logic?',
  };

  // Select question set based on difficulty
  const questions =
    difficulty === 'hint'
      ? hintQuestions
      : difficulty === 'probe'
        ? probeQuestions
        : challengeQuestions;

  const baseQuestion =
    questions[pattern] ??
    `Think about the ${concept} aspect of your solution. What might be going wrong?`;

  // Add context about specific failures if probe or challenge
  let questionText = baseQuestion;
  if (difficulty !== 'hint' && failedTests.length > 0) {
    const failedTest = failedTests[0];
    if (failedTest) {
      questionText += ` Consider the test case with input "${truncate(failedTest.input, 50)}".`;
    }
  }

  return {
    id: questionId,
    question: questionText,
    targetConcept: concept,
    difficulty,
    successCriteria: [
      'Identifies the specific issue in their approach',
      'Explains the expected behavior vs actual behavior',
      'Proposes a concrete change to fix the issue',
    ],
    followUpQuestions:
      difficulty === 'challenge'
        ? [probeQuestions[pattern] ?? baseQuestion]
        : difficulty === 'probe'
          ? [hintQuestions[pattern] ?? baseQuestion]
          : undefined,
  };
}

// ============ Helpers ============

function tryParseArray(input: string): unknown[] | null {
  try {
    const parsed = JSON.parse(input);
    return Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function truncate(str: string, maxLen: number): string {
  return str.length > maxLen ? str.slice(0, maxLen - 3) + '...' : str;
}
