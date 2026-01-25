/**
 * Pattern Challenge Use Case - "Advocate's Trap"
 *
 * Handles the flow when a user's pattern selection triggers a challenge:
 * 1. Check if challenge should be triggered
 * 2. Generate challenge (counterexample or Socratic question)
 * 3. Process user response
 * 4. Record final decision
 */

import type { TenantId } from '../entities/tenant.js';
import type { AttemptId, Attempt, LegacyAttempt } from '../entities/attempt.js';
import { isLegacyAttempt } from '../entities/attempt.js';
import type { Step, PatternChallengeData } from '../entities/step.js';
import type { PatternId } from '../entities/pattern.js';
import type { AttemptRepo } from '../ports/attempt-repo.js';
import type { ContentRepo } from '../ports/content-repo.js';
import type { Clock } from '../ports/clock.js';
import type { IdGenerator } from '../ports/id-generator.js';
import {
  detectPatternMismatch,
  validateCounterexample,
  type PatternChallengeLLMPort,
  createNullPatternChallengeLLM,
} from '../validation/pattern-challenge.js';

// ============ Check Challenge ============

export interface CheckChallengeInput {
  readonly tenantId: TenantId;
  readonly userId: string;
  readonly attemptId: AttemptId;
  readonly selectedPattern: string;
  readonly statedInvariant: string;
}

export interface CheckChallengeOutput {
  readonly shouldChallenge: boolean;
  readonly challenge?: {
    readonly stepId: string;
    readonly mode: 'COUNTEREXAMPLE' | 'SOCRATIC';
    readonly prompt: string;
    readonly counterexample?: string;
    readonly confidenceScore: number;
    readonly reasons: readonly string[];
    readonly suggestedAlternatives: readonly string[];
  };
}

export interface CheckChallengeDeps {
  readonly attemptRepo: AttemptRepo;
  readonly contentRepo: ContentRepo;
  readonly clock: Clock;
  readonly idGenerator: IdGenerator;
  readonly llmPort?: PatternChallengeLLMPort;
}

export class PatternChallengeError extends Error {
  constructor(
    message: string,
    public readonly code: string
  ) {
    super(message);
    this.name = 'PatternChallengeError';
  }
}

/**
 * Check if a pattern selection should trigger a challenge
 * Returns challenge details if triggered, or null if no challenge needed
 */
export async function checkPatternChallenge(
  input: CheckChallengeInput,
  deps: CheckChallengeDeps
): Promise<CheckChallengeOutput> {
  const { tenantId, userId, attemptId, selectedPattern, statedInvariant } = input;
  const { attemptRepo, contentRepo, clock, idGenerator } = deps;
  const llmPort = deps.llmPort ?? createNullPatternChallengeLLM();

  // Get attempt and problem
  const attemptRaw = await attemptRepo.findById(tenantId, attemptId);
  if (!attemptRaw) {
    throw new PatternChallengeError('Attempt not found', 'ATTEMPT_NOT_FOUND');
  }

  // Pattern challenge only works with legacy problem-based attempts
  if (!isLegacyAttempt(attemptRaw)) {
    throw new PatternChallengeError(
      'Pattern challenge only supports legacy problem-based attempts',
      'TRACK_ATTEMPT_NOT_SUPPORTED'
    );
  }
  const attempt: LegacyAttempt = attemptRaw;

  if (attempt.userId !== userId) {
    throw new PatternChallengeError('Unauthorized', 'UNAUTHORIZED');
  }

  if (attempt.state !== 'THINKING_GATE') {
    throw new PatternChallengeError(
      'Pattern challenge only available during thinking gate',
      'INVALID_STATE'
    );
  }

  const problem = await contentRepo.findById(tenantId, attempt.problemId);
  if (!problem) {
    throw new PatternChallengeError('Problem not found', 'PROBLEM_NOT_FOUND');
  }

  // Run rule-based detection
  const result = detectPatternMismatch({
    selectedPattern: selectedPattern as PatternId,
    problem,
    statedInvariant,
  });

  if (!result.shouldChallenge) {
    return { shouldChallenge: false };
  }

  // Generate challenge content
  let mode: 'COUNTEREXAMPLE' | 'SOCRATIC' = 'SOCRATIC';
  let prompt = result.socraticPrompt ?? 'Can you explain why this pattern fits this problem?';
  let counterexample: string | undefined;

  // Try LLM-generated counterexample if available
  if (llmPort.isEnabled() && result.disqualifier) {
    const llmResult = await llmPort.generateCounterexample(
      selectedPattern as PatternId,
      problem,
      result.disqualifier
    );

    if (llmResult) {
      // Validate the counterexample
      const validation = validateCounterexample(llmResult.counterexample, problem);
      if (validation.valid) {
        mode = 'COUNTEREXAMPLE';
        counterexample = llmResult.counterexample;
        prompt = llmResult.explanation;
      }
    }
  }

  // If no LLM counterexample, try LLM Socratic prompt
  if (mode === 'SOCRATIC' && llmPort.isEnabled()) {
    const socraticPrompt = await llmPort.generateSocraticPrompt(
      selectedPattern as PatternId,
      problem,
      statedInvariant
    );
    if (socraticPrompt) {
      prompt = socraticPrompt;
    }
  }

  // Create a challenge step (in pending state)
  const stepId = idGenerator.generate();
  const now = clock.now();

  const challengeData: PatternChallengeData = {
    type: 'PATTERN_CHALLENGE',
    challengedPattern: selectedPattern,
    mode,
    challengePrompt: prompt,
    counterexample,
    userResponse: null,
    decision: null,
    newPattern: null,
    confidenceScore: result.confidenceScore,
    challengeReasons: result.reasons,
    suggestedAlternatives: result.suggestedAlternatives,
  };

  const step: Step = {
    id: stepId,
    attemptId,
    type: 'PATTERN_CHALLENGE',
    result: null, // Not completed yet
    data: challengeData,
    startedAt: now,
    completedAt: null,
  };

  // Add step to attempt
  const updatedAttempt: Attempt = {
    ...attempt,
    steps: [...attempt.steps, step],
  };

  await attemptRepo.update(updatedAttempt);

  return {
    shouldChallenge: true,
    challenge: {
      stepId,
      mode,
      prompt,
      counterexample,
      confidenceScore: result.confidenceScore,
      reasons: result.reasons,
      suggestedAlternatives: result.suggestedAlternatives,
    },
  };
}

// ============ Respond to Challenge ============

export interface RespondToChallengeInput {
  readonly tenantId: TenantId;
  readonly userId: string;
  readonly attemptId: AttemptId;
  readonly stepId: string;
  readonly response: string;
  readonly decision: 'KEEP_PATTERN' | 'CHANGE_PATTERN';
  readonly newPattern?: string;
}

export interface RespondToChallengeOutput {
  readonly attempt: Attempt;
  readonly step: Step;
  readonly finalPattern: string;
}

export interface RespondToChallengeDeps {
  readonly attemptRepo: AttemptRepo;
  readonly clock: Clock;
}

/**
 * Process user's response to a pattern challenge
 */
export async function respondToPatternChallenge(
  input: RespondToChallengeInput,
  deps: RespondToChallengeDeps
): Promise<RespondToChallengeOutput> {
  const { tenantId, userId, attemptId, stepId, response, decision, newPattern } = input;
  const { attemptRepo, clock } = deps;

  const attempt = await attemptRepo.findById(tenantId, attemptId);
  if (!attempt) {
    throw new PatternChallengeError('Attempt not found', 'ATTEMPT_NOT_FOUND');
  }

  if (attempt.userId !== userId) {
    throw new PatternChallengeError('Unauthorized', 'UNAUTHORIZED');
  }

  // Find the challenge step
  const stepIndex = attempt.steps.findIndex(s => s.id === stepId);
  if (stepIndex === -1) {
    throw new PatternChallengeError('Challenge step not found', 'STEP_NOT_FOUND');
  }

  const step = attempt.steps[stepIndex]!;
  if (step.type !== 'PATTERN_CHALLENGE') {
    throw new PatternChallengeError('Invalid step type', 'INVALID_STEP_TYPE');
  }

  const existingData = step.data as PatternChallengeData;
  if (existingData.decision !== null) {
    throw new PatternChallengeError('Challenge already responded to', 'ALREADY_RESPONDED');
  }

  // Validate decision
  if (decision === 'CHANGE_PATTERN' && !newPattern) {
    throw new PatternChallengeError('New pattern required when changing', 'NEW_PATTERN_REQUIRED');
  }

  const now = clock.now();

  // Determine final pattern
  const finalPattern = decision === 'CHANGE_PATTERN'
    ? newPattern!
    : existingData.challengedPattern;

  // Update the step data
  const updatedData: PatternChallengeData = {
    ...existingData,
    userResponse: response,
    decision: decision === 'KEEP_PATTERN' ? 'KEPT_PATTERN' : 'CHANGED_PATTERN',
    newPattern: decision === 'CHANGE_PATTERN' ? newPattern! : null,
  };

  const updatedStep: Step = {
    ...step,
    data: updatedData,
    result: 'PASS', // Challenge completed
    completedAt: now,
  };

  // Update attempt with modified step
  const updatedSteps = [...attempt.steps];
  updatedSteps[stepIndex] = updatedStep;

  const updatedAttempt: Attempt = {
    ...attempt,
    steps: updatedSteps,
  };

  await attemptRepo.update(updatedAttempt);

  return {
    attempt: updatedAttempt,
    step: updatedStep,
    finalPattern,
  };
}

// ============ Skip Challenge ============

export interface SkipChallengeInput {
  readonly tenantId: TenantId;
  readonly userId: string;
  readonly attemptId: AttemptId;
  readonly stepId: string;
}

/**
 * Skip a challenge (user proceeds with original pattern without responding)
 */
export async function skipPatternChallenge(
  input: SkipChallengeInput,
  deps: RespondToChallengeDeps
): Promise<RespondToChallengeOutput> {
  const { tenantId, userId, attemptId, stepId } = input;
  const { attemptRepo, clock } = deps;

  const attempt = await attemptRepo.findById(tenantId, attemptId);
  if (!attempt) {
    throw new PatternChallengeError('Attempt not found', 'ATTEMPT_NOT_FOUND');
  }

  if (attempt.userId !== userId) {
    throw new PatternChallengeError('Unauthorized', 'UNAUTHORIZED');
  }

  const stepIndex = attempt.steps.findIndex(s => s.id === stepId);
  if (stepIndex === -1) {
    throw new PatternChallengeError('Challenge step not found', 'STEP_NOT_FOUND');
  }

  const step = attempt.steps[stepIndex]!;
  if (step.type !== 'PATTERN_CHALLENGE') {
    throw new PatternChallengeError('Invalid step type', 'INVALID_STEP_TYPE');
  }

  const existingData = step.data as PatternChallengeData;
  const now = clock.now();

  const updatedData: PatternChallengeData = {
    ...existingData,
    userResponse: null,
    decision: 'KEPT_PATTERN',
    newPattern: null,
  };

  const updatedStep: Step = {
    ...step,
    data: updatedData,
    result: 'SKIP',
    completedAt: now,
  };

  const updatedSteps = [...attempt.steps];
  updatedSteps[stepIndex] = updatedStep;

  const updatedAttempt: Attempt = {
    ...attempt,
    steps: updatedSteps,
  };

  await attemptRepo.update(updatedAttempt);

  return {
    attempt: updatedAttempt,
    step: updatedStep,
    finalPattern: existingData.challengedPattern,
  };
}
