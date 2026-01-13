/**
 * Pattern Discovery Use Case
 * Handles the Socratic flow for helping users discover patterns
 */

import type { Attempt } from '../entities/attempt.js';
import type { Problem } from '../entities/problem.js';
import type { Step, PatternDiscoveryData, PatternDiscoveryQA } from '../entities/step.js';
import type { AttemptRepo } from '../ports/attempt-repo.js';
import type { ContentRepo } from '../ports/content-repo.js';
import type { Clock } from '../ports/clock.js';
import type { IdGenerator } from '../ports/id-generator.js';
import {
  runPatternDiscovery,
  getInitialDiscoveryQuestion,
  createNullPatternDiscoveryLLM,
  type PatternDiscoveryLLMPort,
  type PatternDiscoveryContext,
} from '../validation/pattern-discovery.js';

// ============ Errors ============

export class PatternDiscoveryError extends Error {
  constructor(
    message: string,
    public readonly code: string
  ) {
    super(message);
    this.name = 'PatternDiscoveryError';
  }
}

// ============ Types ============

export interface StartPatternDiscoveryInput {
  readonly tenantId: string;
  readonly userId: string;
  readonly attemptId: string;
  readonly preferSocratic?: boolean;
}

export interface StartPatternDiscoveryDeps {
  readonly attemptRepo: AttemptRepo;
  readonly contentRepo: ContentRepo;
  readonly clock: Clock;
  readonly idGenerator: IdGenerator;
  readonly llmPort?: PatternDiscoveryLLMPort;
}

export interface StartPatternDiscoveryOutput {
  readonly step: Step;
  readonly question: string;
  readonly questionId: string;
  readonly mode: 'HEURISTIC' | 'SOCRATIC';
}

export interface SubmitPatternDiscoveryAnswerInput {
  readonly tenantId: string;
  readonly userId: string;
  readonly attemptId: string;
  readonly stepId: string;
  readonly questionId: string;
  readonly answer: string;
}

export interface SubmitPatternDiscoveryAnswerDeps {
  readonly attemptRepo: AttemptRepo;
  readonly contentRepo: ContentRepo;
  readonly clock: Clock;
  readonly llmPort?: PatternDiscoveryLLMPort;
}

export interface SubmitPatternDiscoveryAnswerOutput {
  readonly step: Step;
  /** Next question if discovery continues */
  readonly nextQuestion?: string;
  readonly nextQuestionId?: string;
  /** Discovered pattern if complete */
  readonly discoveredPattern?: string;
  /** Whether discovery is complete */
  readonly completed: boolean;
  /** Full Q/A log */
  readonly qaLog: readonly PatternDiscoveryQA[];
}

export interface AbandonPatternDiscoveryInput {
  readonly tenantId: string;
  readonly userId: string;
  readonly attemptId: string;
  readonly stepId: string;
}

export interface AbandonPatternDiscoveryDeps {
  readonly attemptRepo: AttemptRepo;
  readonly clock: Clock;
}

// ============ Start Pattern Discovery ============

/**
 * Starts a new pattern discovery session
 */
export async function startPatternDiscovery(
  input: StartPatternDiscoveryInput,
  deps: StartPatternDiscoveryDeps
): Promise<StartPatternDiscoveryOutput> {
  const { tenantId, userId, attemptId, preferSocratic } = input;
  const { attemptRepo, contentRepo, clock, idGenerator, llmPort } = deps;

  // 1. Load attempt
  const attempt = await attemptRepo.findById(tenantId, attemptId);
  if (!attempt) {
    throw new PatternDiscoveryError(
      'Attempt not found.',
      'ATTEMPT_NOT_FOUND'
    );
  }

  // 2. Validate state
  if (attempt.state !== 'THINKING_GATE') {
    throw new PatternDiscoveryError(
      `Cannot start pattern discovery in ${attempt.state} state. Pattern discovery is only available during thinking gate.`,
      'INVALID_STATE_FOR_PATTERN_DISCOVERY'
    );
  }

  // 3. Check if there's already an active pattern discovery step
  const existingDiscovery = attempt.steps.find(
    s => s.type === 'PATTERN_DISCOVERY' && s.completedAt === null
  );
  if (existingDiscovery) {
    throw new PatternDiscoveryError(
      'Pattern discovery already in progress. Complete or abandon the current session first.',
      'PATTERN_DISCOVERY_IN_PROGRESS'
    );
  }

  // 4. Load problem for context
  const problem = await contentRepo.findById(tenantId, attempt.problemId);
  if (!problem) {
    throw new PatternDiscoveryError(
      'Problem not found.',
      'PROBLEM_NOT_FOUND'
    );
  }

  // 5. Determine mode and get initial question
  const effectiveLLMPort = llmPort ?? createNullPatternDiscoveryLLM();
  const useSocratic = preferSocratic && effectiveLLMPort.isEnabled();
  const mode = useSocratic ? 'SOCRATIC' : 'HEURISTIC';

  const initialQuestion = getInitialDiscoveryQuestion();

  // 6. Create step
  const now = clock.now();
  const stepId = idGenerator.generate();

  const stepData: PatternDiscoveryData = {
    type: 'PATTERN_DISCOVERY',
    mode,
    qaLog: [],
    discoveredPattern: null,
    completed: false,
  };

  const step: Step = {
    id: stepId,
    attemptId,
    type: 'PATTERN_DISCOVERY',
    result: null,
    data: stepData,
    startedAt: now,
    completedAt: null,
  };

  // 7. Save step to attempt
  const updatedAttempt: Attempt = {
    ...attempt,
    steps: [...attempt.steps, step],
  };

  await attemptRepo.update(updatedAttempt);

  return {
    step,
    question: initialQuestion.question,
    questionId: initialQuestion.questionId,
    mode,
  };
}

// ============ Submit Answer ============

/**
 * Submits an answer to a pattern discovery question
 */
export async function submitPatternDiscoveryAnswer(
  input: SubmitPatternDiscoveryAnswerInput,
  deps: SubmitPatternDiscoveryAnswerDeps
): Promise<SubmitPatternDiscoveryAnswerOutput> {
  const { tenantId, userId, attemptId, stepId, questionId, answer } = input;
  const { attemptRepo, contentRepo, clock, llmPort } = deps;

  // 1. Load attempt
  const attempt = await attemptRepo.findById(tenantId, attemptId);
  if (!attempt) {
    throw new PatternDiscoveryError(
      'Attempt not found.',
      'ATTEMPT_NOT_FOUND'
    );
  }

  // 2. Find the pattern discovery step
  const stepIndex = attempt.steps.findIndex(s => s.id === stepId);
  const step = attempt.steps[stepIndex];
  if (stepIndex === -1 || !step) {
    throw new PatternDiscoveryError(
      'Pattern discovery step not found.',
      'STEP_NOT_FOUND'
    );
  }

  if (step.type !== 'PATTERN_DISCOVERY') {
    throw new PatternDiscoveryError(
      'Step is not a pattern discovery step.',
      'INVALID_STEP_TYPE'
    );
  }

  if (step.completedAt !== null) {
    throw new PatternDiscoveryError(
      'Pattern discovery already completed.',
      'PATTERN_DISCOVERY_COMPLETED'
    );
  }

  const currentData = step.data as PatternDiscoveryData;

  // 3. Load problem for context
  const problem = await contentRepo.findById(tenantId, attempt.problemId);
  if (!problem) {
    throw new PatternDiscoveryError(
      'Problem not found.',
      'PROBLEM_NOT_FOUND'
    );
  }

  // 4. Run discovery engine
  const effectiveLLMPort = llmPort ?? createNullPatternDiscoveryLLM();
  const context: PatternDiscoveryContext = {
    problem,
    qaLog: currentData.qaLog,
  };

  const { result, mode } = await runPatternDiscovery(
    context,
    effectiveLLMPort,
    { questionId, answer }
  );

  // 5. Build updated Q/A log
  const now = clock.now();
  const newQA: PatternDiscoveryQA = {
    questionId,
    question: result.nextQuestion?.question ?? 'Unknown question',
    answer,
    timestamp: now,
  };

  // If we had a previous question, use its text
  // (The answer was to the previous question, not the next one)
  const previousQuestion = QUESTION_TEXT_MAP[questionId];
  if (previousQuestion) {
    (newQA as any).question = previousQuestion;
  }

  const updatedQALog = [...currentData.qaLog, newQA];

  // 6. Update step data
  const updatedData: PatternDiscoveryData = {
    ...currentData,
    qaLog: updatedQALog,
    discoveredPattern: result.discoveredPattern ?? null,
    completed: result.completed,
  };

  const updatedStep: Step = {
    ...step,
    data: updatedData,
    result: result.completed ? 'PASS' : null,
    completedAt: result.completed ? now : null,
  };

  // 7. Update attempt
  const updatedSteps = [...attempt.steps];
  updatedSteps[stepIndex] = updatedStep;

  const updatedAttempt: Attempt = {
    ...attempt,
    steps: updatedSteps,
  };

  await attemptRepo.update(updatedAttempt);

  return {
    step: updatedStep,
    nextQuestion: result.nextQuestion?.question,
    nextQuestionId: result.nextQuestion?.questionId,
    discoveredPattern: result.discoveredPattern,
    completed: result.completed,
    qaLog: updatedQALog,
  };
}

// ============ Abandon Pattern Discovery ============

/**
 * Abandons an in-progress pattern discovery session
 */
export async function abandonPatternDiscovery(
  input: AbandonPatternDiscoveryInput,
  deps: AbandonPatternDiscoveryDeps
): Promise<{ step: Step }> {
  const { tenantId, attemptId, stepId } = input;
  const { attemptRepo, clock } = deps;

  // 1. Load attempt
  const attempt = await attemptRepo.findById(tenantId, attemptId);
  if (!attempt) {
    throw new PatternDiscoveryError(
      'Attempt not found.',
      'ATTEMPT_NOT_FOUND'
    );
  }

  // 2. Find the pattern discovery step
  const stepIndex = attempt.steps.findIndex(s => s.id === stepId);
  const step = attempt.steps[stepIndex];
  if (stepIndex === -1 || !step) {
    throw new PatternDiscoveryError(
      'Pattern discovery step not found.',
      'STEP_NOT_FOUND'
    );
  }

  if (step.type !== 'PATTERN_DISCOVERY') {
    throw new PatternDiscoveryError(
      'Step is not a pattern discovery step.',
      'INVALID_STEP_TYPE'
    );
  }

  if (step.completedAt !== null) {
    throw new PatternDiscoveryError(
      'Pattern discovery already completed.',
      'PATTERN_DISCOVERY_COMPLETED'
    );
  }

  // 3. Mark as abandoned (SKIP result)
  const now = clock.now();
  const currentData = step.data as PatternDiscoveryData;

  const updatedData: PatternDiscoveryData = {
    ...currentData,
    completed: false,
  };

  const updatedStep: Step = {
    ...step,
    data: updatedData,
    result: 'SKIP',
    completedAt: now,
  };

  // 4. Update attempt
  const updatedSteps = [...attempt.steps];
  updatedSteps[stepIndex] = updatedStep;

  const updatedAttempt: Attempt = {
    ...attempt,
    steps: updatedSteps,
  };

  await attemptRepo.update(updatedAttempt);

  return { step: updatedStep };
}

// ============ Helper: Question Text Lookup ============

// Quick lookup for question text by ID
const QUESTION_TEXT_MAP: Record<string, string> = {
  'q1_data_structure': 'What is the main data structure in the input? (array, string, tree, graph, intervals)',
  'q2_array_operation': 'What operation do you need to perform? (find contiguous subarray, find pair, range query, search, optimize)',
  'q2_string_operation': 'What are you looking for in the string? (substring with property, prefix matching, transformation, subsequence)',
  'q2_tree_operation': 'How do you need to traverse or process the tree? (level by level, path from root, all paths, find value)',
  'q2_graph_operation': 'What do you need to find in the graph? (shortest path, connected components, cycles, all paths)',
  'q2_interval_operation': 'What do you need to do with the intervals? (merge overlapping, find conflicts, schedule, count)',
  'q2_general_operation': 'What is the goal? (find optimal solution, generate all possibilities, make choices, find pattern)',
  'q3_window_type': 'Does the subarray/substring need to satisfy a constraint that can be checked incrementally? (at most k distinct, sum equals target, contains all chars)',
  'q3_pair_type': 'Is the array sorted, or can you sort it? Are you looking for a specific sum or condition between pairs?',
  'q3_constraint_type': 'Can the problem be broken into smaller overlapping subproblems? Or does making the locally best choice always lead to the global optimum?',
  'q3_traversal_goal': 'Do you need to find the shortest path/minimum steps, or explore all possibilities/find any valid path?',
  'q3_connectivity': 'Do you need to efficiently check if elements are in the same group, or dynamically merge groups?',
  'q3_interval_goal': 'Do you need to count simultaneous events, or combine/simplify the intervals?',
};
