/**
 * Validate Socratic Response Use Case
 *
 * Validates a student's response to a Socratic question and determines
 * the next action. All validation must be evidence-based.
 *
 * Core principle: Validation must reference evidenceRefs from the attempt context.
 */

import type { TenantId } from '../entities/tenant.js';
import type { AttemptId, Attempt, LegacyAttempt } from '../entities/attempt.js';
import { isLegacyAttempt } from '../entities/attempt.js';
import type { Problem } from '../entities/problem.js';
import type { CodingData, ThinkingGateData, HintLevel, TestResultData } from '../entities/step.js';
import type { AttemptRepo } from '../ports/attempt-repo.js';
import type { ContentRepo } from '../ports/content-repo.js';
import type { Clock } from '../ports/clock.js';
import type { IdGenerator } from '../ports/id-generator.js';
import type {
  SocraticCoachPort,
  SocraticContext,
  SocraticQuestion,
  SocraticValidationResult,
  SocraticNextActionResult,
  EvidenceRef,
  SocraticValidationContext,
  ValidateSocraticResponseResult,
  SocraticTurn,
} from '../ports/socratic-coach.js';
import type { AIArtifactsRepo, AIFeedback, SocraticSession } from '../ports/ai-artifacts-repo.js';
import { validateSocraticCoachResponse } from '../ports/socratic-coach.js';

// ============ Input/Output Types ============

export interface ValidateSocraticResponseInput {
  readonly tenantId: TenantId;
  readonly userId: string;
  readonly attemptId: AttemptId;
  readonly questionId: string;
  readonly userResponse: string;
}

export interface ValidateSocraticResponseOutput {
  readonly validation: SocraticValidationResult;
  readonly followUpQuestion?: SocraticQuestion;
  readonly nextAction: SocraticNextActionResult;
  readonly source: 'ai' | 'deterministic';
  readonly session: SocraticSession;
}

export interface ValidateSocraticResponseDeps {
  readonly attemptRepo: AttemptRepo;
  readonly contentRepo: ContentRepo;
  readonly aiArtifactsRepo: AIArtifactsRepo;
  readonly socraticCoach: SocraticCoachPort;
  readonly clock: Clock;
  readonly idGenerator: IdGenerator;
}

// ============ Errors ============

export class ValidateSocraticResponseError extends Error {
  constructor(
    message: string,
    public readonly code: string
  ) {
    super(message);
    this.name = 'ValidateSocraticResponseError';
  }
}

// ============ Use Case ============

export async function validateSocraticResponse(
  input: ValidateSocraticResponseInput,
  deps: ValidateSocraticResponseDeps
): Promise<ValidateSocraticResponseOutput> {
  const { tenantId, userId, attemptId, questionId, userResponse } = input;
  const {
    attemptRepo,
    contentRepo,
    aiArtifactsRepo,
    socraticCoach,
    clock,
    idGenerator,
  } = deps;

  // ============ 1. Load Attempt and Validate ============

  const attemptRaw = await attemptRepo.findById(tenantId, attemptId);
  if (!attemptRaw) {
    throw new ValidateSocraticResponseError('Attempt not found', 'ATTEMPT_NOT_FOUND');
  }

  // Socratic validation only works with legacy problem-based attempts
  if (!isLegacyAttempt(attemptRaw)) {
    throw new ValidateSocraticResponseError(
      'Socratic validation only supports legacy problem-based attempts',
      'TRACK_ATTEMPT_NOT_SUPPORTED'
    );
  }
  const attempt: LegacyAttempt = attemptRaw;

  if (attempt.userId !== userId) {
    throw new ValidateSocraticResponseError('Unauthorized', 'UNAUTHORIZED');
  }

  // ============ 2. Load Problem ============

  const problem = await contentRepo.findById(tenantId, attempt.problemId);
  if (!problem) {
    throw new ValidateSocraticResponseError('Problem not found', 'PROBLEM_NOT_FOUND');
  }

  // ============ 3. Load Socratic Session ============

  const session = await aiArtifactsRepo.getSessionByAttempt(tenantId, attemptId);
  if (!session) {
    throw new ValidateSocraticResponseError('No active Socratic session', 'NO_SESSION');
  }

  // Verify the question being answered is the current one
  if (session.currentQuestionId !== questionId) {
    throw new ValidateSocraticResponseError(
      'Question ID does not match current session question',
      'QUESTION_MISMATCH'
    );
  }

  // ============ 4. Load the Question Being Answered ============

  const questionFeedback = await aiArtifactsRepo.getFeedbackByAttempt(
    tenantId,
    attemptId,
    'socratic_question'
  );

  const questionContent = questionFeedback.find(
    (f) => (f.content as SocraticQuestion).id === questionId
  )?.content as SocraticQuestion | undefined;

  if (!questionContent) {
    throw new ValidateSocraticResponseError('Question not found', 'QUESTION_NOT_FOUND');
  }

  // ============ 5. Build Context ============

  const attemptContext = buildSocraticContext(attempt, problem, session.turns);

  const validationContext: SocraticValidationContext = {
    question: questionContent,
    userResponse,
    attemptContext,
    successCriteria: questionContent.successCriteria,
  };

  // ============ 6. Validate Response (AI or Deterministic) ============

  let result: ValidateSocraticResponseResult;
  const now = clock.now();

  if (socraticCoach.isEnabled()) {
    const aiResult = await socraticCoach.validateSocraticResponse(validationContext);

    if (aiResult) {
      const validation = validateSocraticCoachResponse(aiResult);

      if (validation.valid) {
        result = aiResult;
      } else {
        // AI response invalid, fall back to deterministic
        result = validateDeterministically(validationContext, idGenerator, attempt);
      }
    } else {
      // AI failed, fall back to deterministic
      result = validateDeterministically(validationContext, idGenerator, attempt);
    }
  } else {
    // AI not enabled, use deterministic
    result = validateDeterministically(validationContext, idGenerator, attempt);
  }

  // ============ 7. Persist AI Feedback Artifacts ============

  // Save validation result
  const validationFeedback: AIFeedback = {
    id: idGenerator.generate(),
    tenantId,
    attemptId,
    type: 'socratic_validation',
    content: result.validation,
    source: result.source,
    createdAt: now,
  };
  await aiArtifactsRepo.saveFeedback(validationFeedback);

  // Save follow-up question if present
  if (result.followUpQuestion) {
    const followUpFeedback: AIFeedback = {
      id: idGenerator.generate(),
      tenantId,
      attemptId,
      type: 'socratic_question',
      content: result.followUpQuestion,
      source: result.source,
      createdAt: now,
    };
    await aiArtifactsRepo.saveFeedback(followUpFeedback);
  }

  // ============ 8. Add User Turn to Session ============

  const userTurn: SocraticTurn = {
    id: idGenerator.generate(),
    role: 'user',
    content: userResponse,
    metadata: {
      questionId,
      validationResult: result.validation,
      timestamp: now,
    },
  };

  let updatedSession = await aiArtifactsRepo.addTurn(tenantId, session.id, userTurn);

  // ============ 9. Add Follow-up Question Turn if Present ============

  if (result.followUpQuestion) {
    const assistantTurn: SocraticTurn = {
      id: idGenerator.generate(),
      role: 'assistant',
      content: result.followUpQuestion.question,
      metadata: {
        questionId: result.followUpQuestion.id,
        timestamp: now,
      },
    };

    updatedSession = await aiArtifactsRepo.addTurn(tenantId, session.id, assistantTurn);
    await aiArtifactsRepo.setCurrentQuestion(tenantId, session.id, result.followUpQuestion.id);
  } else if (result.validation.nextAction === 'complete') {
    // End the Socratic session if complete
    updatedSession = await aiArtifactsRepo.endSession(tenantId, session.id);
  } else {
    // Clear current question if not continuing with follow-up
    await aiArtifactsRepo.setCurrentQuestion(tenantId, session.id, null);
  }

  return {
    validation: result.validation,
    followUpQuestion: result.followUpQuestion,
    nextAction: result.nextAction,
    source: result.source,
    session: updatedSession,
  };
}

// ============ Context Builder ============

function buildSocraticContext(
  attempt: Attempt,
  problem: Problem,
  previousTurns: readonly SocraticTurn[]
): SocraticContext {
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
    previousTurns,
    hintsUsed: attempt.hintsUsed,
    codeSubmissions: attempt.codeSubmissions,
  };
}

// ============ Deterministic Validation ============

/**
 * Validate response deterministically when AI is unavailable.
 * Uses keyword matching and heuristics.
 */
function validateDeterministically(
  context: SocraticValidationContext,
  idGenerator: IdGenerator,
  attempt: Attempt
): ValidateSocraticResponseResult {
  const { question, userResponse, attemptContext, successCriteria } = context;
  const { testResults, pattern, hintsUsed, codeSubmissions } = attemptContext;

  // Build evidence refs from context
  const failedTests = testResults.filter((t: TestResultData) => !t.passed);
  const evidenceRefs: EvidenceRef[] = failedTests.map((test: TestResultData, i: number) => ({
    source: 'test_result' as const,
    sourceId: `test-${i}`,
    description: `Test failed: expected "${test.expected}" but got "${test.actual}"`,
  }));

  // Add attempt history evidence
  evidenceRefs.push({
    source: 'attempt_history' as const,
    sourceId: `attempt-${attempt.id}`,
    description: `${codeSubmissions} code submission(s), ${hintsUsed.length} hint(s) used`,
  });

  // Analyze the response
  const analysis = analyzeResponse(userResponse, question, pattern, successCriteria);

  // Determine next action based on analysis
  let nextAction: SocraticNextActionResult['action'];
  let escalateToHintLevel: HintLevel | undefined;

  if (analysis.isCorrect) {
    // Good understanding, allow retry
    nextAction = 'allow_retry';
  } else if (analysis.partialUnderstanding) {
    // Some understanding, continue with follow-up
    nextAction = 'ask_socratic_question';
  } else if (hintsUsed.length < 2) {
    // Poor understanding, escalate to hint
    nextAction = 'provide_hint';
    escalateToHintLevel = getNextHintLevel(hintsUsed);
  } else {
    // Already used hints, suggest trace
    nextAction = 'suggest_trace';
  }

  const validation: SocraticValidationResult = {
    isCorrect: analysis.isCorrect,
    feedback: analysis.feedback,
    nextAction: analysis.isCorrect
      ? 'complete'
      : analysis.partialUnderstanding
        ? 'continue'
        : 'escalate',
    evidenceRefs,
    confidence: 0.6, // Lower confidence for deterministic
    escalateToHintLevel,
  };

  // Generate follow-up question if continuing
  let followUpQuestion: SocraticQuestion | undefined;
  if (validation.nextAction === 'continue' && question.followUpQuestions?.length) {
    const followUpText = question.followUpQuestions[0];
    if (followUpText) {
      followUpQuestion = {
        id: idGenerator.generate(),
        question: followUpText,
        targetConcept: question.targetConcept,
        difficulty: question.difficulty === 'challenge' ? 'probe' : 'hint',
        evidenceRefs,
        successCriteria: question.successCriteria,
      };
    }
  }

  const nextActionResult: SocraticNextActionResult = {
    action: nextAction,
    reason: analysis.feedback,
    evidenceRefs,
    actionData: escalateToHintLevel ? { hintLevel: escalateToHintLevel } : undefined,
  };

  return {
    validation,
    followUpQuestion,
    nextAction: nextActionResult,
    source: 'deterministic',
  };
}

/**
 * Analyze the user's response using heuristics
 */
function analyzeResponse(
  response: string,
  question: SocraticQuestion,
  pattern: string,
  successCriteria?: readonly string[]
): { isCorrect: boolean; partialUnderstanding: boolean; feedback: string } {
  const responseLower = response.toLowerCase();
  const responseWords = new Set(responseLower.split(/\s+/));

  // Check response length (too short is usually insufficient)
  if (response.trim().length < 20) {
    return {
      isCorrect: false,
      partialUnderstanding: false,
      feedback: 'Your response is quite brief. Can you elaborate on your thinking?',
    };
  }

  // Pattern-specific keywords that indicate understanding
  const patternKeywords: Record<string, string[]> = {
    SLIDING_WINDOW: ['window', 'shrink', 'expand', 'left', 'right', 'boundary', 'condition'],
    TWO_POINTERS: ['pointer', 'left', 'right', 'converge', 'move', 'advance'],
    PREFIX_SUM: ['prefix', 'sum', 'cumulative', 'range', 'precompute'],
    BINARY_SEARCH: ['mid', 'half', 'search', 'low', 'high', 'target'],
    BFS: ['queue', 'level', 'visited', 'neighbor', 'breadth'],
    DFS: ['recursion', 'recursive', 'stack', 'backtrack', 'depth', 'base case'],
    DYNAMIC_PROGRAMMING: ['subproblem', 'dp', 'memoize', 'table', 'recurrence'],
    BACKTRACKING: ['choice', 'undo', 'constraint', 'prune', 'explore'],
    GREEDY: ['optimal', 'local', 'choice', 'sort'],
    HEAP: ['heap', 'priority', 'max', 'min', 'push', 'pop'],
    TRIE: ['node', 'prefix', 'character', 'traverse'],
    UNION_FIND: ['find', 'union', 'parent', 'root', 'component'],
    INTERVAL_MERGING: ['interval', 'overlap', 'merge', 'sort', 'boundary'],
  };

  const keywords = patternKeywords[pattern] ?? [];
  const matchedKeywords = keywords.filter((k) => responseWords.has(k));

  // Check for indication of understanding the problem
  const problemUnderstandingPhrases = [
    'the issue is',
    'the problem is',
    'i think',
    'because',
    'when',
    'should',
    'need to',
    'have to',
    'forgot to',
    'missing',
  ];

  const hasExplanation = problemUnderstandingPhrases.some((phrase) =>
    responseLower.includes(phrase)
  );

  // Check for specific issues mentioned
  const issueIndicators = [
    'off by one',
    'boundary',
    'edge case',
    'empty',
    'null',
    'undefined',
    'infinite',
    'loop',
    'condition',
    'wrong',
    'incorrect',
  ];

  const mentionsIssue = issueIndicators.some((indicator) =>
    responseLower.includes(indicator)
  );

  // Score the response
  const keywordScore = matchedKeywords.length / Math.max(keywords.length, 1);
  const explanationBonus = hasExplanation ? 0.2 : 0;
  const issueBonus = mentionsIssue ? 0.2 : 0;

  const totalScore = keywordScore + explanationBonus + issueBonus;

  // Check against success criteria if provided
  let criteriaMatch = 0;
  if (successCriteria && successCriteria.length > 0) {
    for (const criterion of successCriteria) {
      const criterionWords = criterion.toLowerCase().split(/\s+/);
      const matches = criterionWords.filter((w) => responseLower.includes(w)).length;
      if (matches >= criterionWords.length * 0.3) {
        criteriaMatch++;
      }
    }
  }

  const criteriaScore = successCriteria?.length
    ? criteriaMatch / successCriteria.length
    : totalScore;

  const finalScore = (totalScore + criteriaScore) / 2;

  if (finalScore >= 0.6) {
    return {
      isCorrect: true,
      partialUnderstanding: true,
      feedback: `Good thinking! You've identified key aspects of the ${question.targetConcept}. Try implementing your insight and see if it helps.`,
    };
  } else if (finalScore >= 0.3) {
    return {
      isCorrect: false,
      partialUnderstanding: true,
      feedback: `You're on the right track thinking about ${question.targetConcept}. Let's dig a bit deeper into the specifics.`,
    };
  } else {
    return {
      isCorrect: false,
      partialUnderstanding: false,
      feedback: `Let's focus more specifically on ${question.targetConcept}. Consider what changes at each step of your algorithm.`,
    };
  }
}

/**
 * Get the next hint level to escalate to
 */
function getNextHintLevel(hintsUsed: readonly HintLevel[]): HintLevel {
  const hintOrder: HintLevel[] = [
    'DIRECTIONAL_QUESTION',
    'HEURISTIC_HINT',
    'CONCEPT_INJECTION',
    'MICRO_EXAMPLE',
    'PATCH_SNIPPET',
  ];

  const usedSet = new Set(hintsUsed);
  for (const level of hintOrder) {
    if (!usedSet.has(level)) {
      return level;
    }
  }

  // All hints used, return the last level
  return 'PATCH_SNIPPET';
}
