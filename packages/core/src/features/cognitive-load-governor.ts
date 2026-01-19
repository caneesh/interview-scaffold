/**
 * Cognitive Load Governor
 *
 * Provides adaptive cognitive load management by:
 * 1. Computing load scores from session metrics (pure function)
 * 2. Managing state persistence
 * 3. Providing UI configuration based on load level
 *
 * Key principle: Same inputs always produce same outputs (deterministic)
 *
 * When cognitive load is high, the UI is simplified:
 * - Collapse future steps (show only current)
 * - Reduce MCQ options to binary (2 choices)
 * - Shorten hint text (first sentence only)
 * - Hide optional UI elements
 */

// ============ Types ============

export type CognitiveLoadScore = 'low' | 'medium' | 'high';

export interface StepLoadMetrics {
  readonly stepId: number;
  timeSpentSeconds: number;
  wrongAttempts: number;
  currentHintLevel: number;
  hintUnlockTimestamps: number[];
  revealUsed: boolean;
  isCompleted: boolean;
}

export interface SessionLoadMetrics {
  stepMetrics: StepLoadMetrics[];
  totalTimeSpentSeconds: number;
  totalWrongAttempts: number;
  totalHintsUnlocked: number;
  stuckStepCount: number;
  revealCount: number;
  circuitBreakerState: 'MONITORING' | 'WARNING' | 'TRIPPED' | 'DRILLING' | 'RECOVERED';
}

export interface CognitiveLoadState {
  score: CognitiveLoadScore;
  previousScore: CognitiveLoadScore;
  lastUpdatedAt: string;
  consecutiveHighLoadSteps: number;
  stepsSinceLowLoad: number;
  simplifiedModeActive: boolean;
  scoreHistory: Array<{ score: CognitiveLoadScore; timestamp: string }>;
}

export interface CognitiveLoadThresholds {
  readonly minStepsForAssessment: number;
  readonly highTimePerStepSeconds: number;
  readonly highWrongAttemptsPerStep: number;
  readonly fastHintEscalationRate: number; // hints per minute
  readonly stuckStepCountForHighLoad: number;
  readonly recoveryStepCount: number;
}

export interface HighLoadUIConfig {
  readonly singleActiveStep: boolean;
  readonly collapseFutureSteps: boolean;
  readonly reduceMCQToBinary: boolean;
  readonly shortenHintText: boolean;
  readonly disableOptionalHints: boolean;
  readonly hideErrorWatchOuts: boolean;
  readonly simplifyProgressIndicators: boolean;
}

export interface CognitiveLoadEvent {
  readonly type: 'cognitive_load_increased' | 'cognitive_load_decreased' | 'cognitive_load_assessed';
  readonly timestamp: string;
  readonly previousScore: CognitiveLoadScore;
  readonly newScore: CognitiveLoadScore;
  readonly triggerMetrics: {
    readonly avgTimePerStep: number;
    readonly avgWrongAttempts: number;
    readonly hintEscalationRate: number;
    readonly stuckStepCount: number;
  };
}

// ============ Constants ============

export const DEFAULT_COGNITIVE_LOAD_THRESHOLDS: CognitiveLoadThresholds = {
  minStepsForAssessment: 2,
  highTimePerStepSeconds: 180, // 3 minutes
  highWrongAttemptsPerStep: 3,
  fastHintEscalationRate: 2, // 2 hints per minute
  stuckStepCountForHighLoad: 2,
  recoveryStepCount: 3,
};

export const HIGH_LOAD_UI_CONFIG: HighLoadUIConfig = {
  singleActiveStep: true,
  collapseFutureSteps: true,
  reduceMCQToBinary: true,
  shortenHintText: true,
  disableOptionalHints: true,
  hideErrorWatchOuts: true,
  simplifyProgressIndicators: true,
};

export const MEDIUM_LOAD_UI_CONFIG: HighLoadUIConfig = {
  singleActiveStep: false,
  collapseFutureSteps: true,
  reduceMCQToBinary: false,
  shortenHintText: true,
  disableOptionalHints: false,
  hideErrorWatchOuts: false,
  simplifyProgressIndicators: true,
};

export const LOW_LOAD_UI_CONFIG: HighLoadUIConfig = {
  singleActiveStep: false,
  collapseFutureSteps: false,
  reduceMCQToBinary: false,
  shortenHintText: false,
  disableOptionalHints: false,
  hideErrorWatchOuts: false,
  simplifyProgressIndicators: false,
};

// ============ Factory Functions ============

export function createInitialCognitiveLoadState(): CognitiveLoadState {
  return {
    score: 'low',
    previousScore: 'low',
    lastUpdatedAt: new Date().toISOString(),
    consecutiveHighLoadSteps: 0,
    stepsSinceLowLoad: 0,
    simplifiedModeActive: false,
    scoreHistory: [],
  };
}

export function createInitialSessionLoadMetrics(): SessionLoadMetrics {
  return {
    stepMetrics: [],
    totalTimeSpentSeconds: 0,
    totalWrongAttempts: 0,
    totalHintsUnlocked: 0,
    stuckStepCount: 0,
    revealCount: 0,
    circuitBreakerState: 'MONITORING',
  };
}

export function createInitialStepLoadMetrics(stepId: number): StepLoadMetrics {
  return {
    stepId,
    timeSpentSeconds: 0,
    wrongAttempts: 0,
    currentHintLevel: 0,
    hintUnlockTimestamps: [],
    revealUsed: false,
    isCompleted: false,
  };
}

// ============ Pure Computation Functions ============

/**
 * Compute cognitive load score from session metrics
 *
 * This is a PURE FUNCTION - same inputs always produce same outputs.
 * All state is passed in, nothing is read from storage.
 */
export function computeCognitiveLoadScore(
  metrics: SessionLoadMetrics,
  currentState: CognitiveLoadState,
  thresholds: CognitiveLoadThresholds = DEFAULT_COGNITIVE_LOAD_THRESHOLDS
): CognitiveLoadScore {
  // Not enough data to assess - stay at current score
  if (metrics.stepMetrics.length < thresholds.minStepsForAssessment) {
    return currentState.score;
  }

  // Calculate aggregate metrics
  const activeSteps = metrics.stepMetrics.filter((s) => s.timeSpentSeconds > 0);

  if (activeSteps.length === 0) {
    return currentState.score;
  }

  // Average time per step
  const avgTimePerStep = metrics.totalTimeSpentSeconds / activeSteps.length;

  // Average wrong attempts per step
  const avgWrongAttempts = metrics.totalWrongAttempts / activeSteps.length;

  // Hint escalation rate (hints per minute)
  const sessionDurationMinutes = metrics.totalTimeSpentSeconds / 60;
  const hintEscalationRate =
    sessionDurationMinutes > 0 ? metrics.totalHintsUnlocked / sessionDurationMinutes : 0;

  // Calculate struggle indicators
  const isHighTime = avgTimePerStep > thresholds.highTimePerStepSeconds;
  const isHighWrongAttempts = avgWrongAttempts > thresholds.highWrongAttemptsPerStep;
  const isFastHintEscalation = hintEscalationRate > thresholds.fastHintEscalationRate;
  const hasMultipleStuckSteps = metrics.stuckStepCount >= thresholds.stuckStepCountForHighLoad;
  const hasUsedReveal = metrics.revealCount > 0;
  const isCircuitBreakerActive =
    metrics.circuitBreakerState === 'TRIPPED' ||
    metrics.circuitBreakerState === 'WARNING' ||
    metrics.circuitBreakerState === 'DRILLING';

  // Count struggle signals
  let struggleSignals = 0;
  if (isHighTime) struggleSignals++;
  if (isHighWrongAttempts) struggleSignals++;
  if (isFastHintEscalation) struggleSignals++;
  if (hasMultipleStuckSteps) struggleSignals++;
  if (hasUsedReveal) struggleSignals++;
  if (isCircuitBreakerActive) struggleSignals += 2; // Circuit breaker is a strong signal

  // Determine score based on struggle signals
  // HIGH: 3+ signals or circuit breaker active
  // MEDIUM: 2 signals
  // LOW: 0-1 signals
  if (struggleSignals >= 3 || isCircuitBreakerActive) {
    return 'high';
  } else if (struggleSignals >= 2) {
    return 'medium';
  }

  // Check for recovery from high load
  if (currentState.score === 'high') {
    // Need clean steps to recover
    if (currentState.stepsSinceLowLoad >= thresholds.recoveryStepCount) {
      return 'medium'; // Gradual recovery
    }
    return 'high'; // Stay at high until recovery threshold met
  }

  // Check for recovery from medium load
  if (currentState.score === 'medium') {
    if (struggleSignals === 0 && currentState.stepsSinceLowLoad >= 1) {
      return 'low';
    }
    return 'medium';
  }

  return 'low';
}

// ============ Metrics Update Functions ============

/**
 * Record step activation
 */
export function recordStepActivation(
  metrics: SessionLoadMetrics,
  stepId: number
): SessionLoadMetrics {
  let stepMetrics = metrics.stepMetrics.find((s) => s.stepId === stepId);
  if (!stepMetrics) {
    stepMetrics = createInitialStepLoadMetrics(stepId);
    metrics.stepMetrics.push(stepMetrics);
  }
  return { ...metrics };
}

/**
 * Update time spent on a step
 */
export function recordStepTimeSpent(
  metrics: SessionLoadMetrics,
  stepId: number,
  timeSpentSeconds: number
): SessionLoadMetrics {
  const stepMetrics = metrics.stepMetrics.find((s) => s.stepId === stepId);
  if (stepMetrics) {
    const wasStuck = stepMetrics.timeSpentSeconds > 120;
    stepMetrics.timeSpentSeconds = timeSpentSeconds;

    // Check if step is "stuck" (>2 minutes)
    const nowStuck = timeSpentSeconds > 120;
    if (!wasStuck && nowStuck) {
      metrics.stuckStepCount++;
    }
  }

  // Update total time
  metrics.totalTimeSpentSeconds = metrics.stepMetrics.reduce(
    (sum, s) => sum + s.timeSpentSeconds,
    0
  );

  return { ...metrics };
}

/**
 * Record a wrong attempt on a step
 */
export function recordWrongAttempt(
  metrics: SessionLoadMetrics,
  stepId: number
): SessionLoadMetrics {
  let stepMetrics = metrics.stepMetrics.find((s) => s.stepId === stepId);
  if (!stepMetrics) {
    stepMetrics = createInitialStepLoadMetrics(stepId);
    metrics.stepMetrics.push(stepMetrics);
  }

  stepMetrics.wrongAttempts++;
  metrics.totalWrongAttempts++;

  return { ...metrics };
}

/**
 * Record hint unlock
 */
export function recordHintUnlock(
  metrics: SessionLoadMetrics,
  stepId: number,
  hintLevel: number
): SessionLoadMetrics {
  let stepMetrics = metrics.stepMetrics.find((s) => s.stepId === stepId);
  if (!stepMetrics) {
    stepMetrics = createInitialStepLoadMetrics(stepId);
    metrics.stepMetrics.push(stepMetrics);
  }

  stepMetrics.currentHintLevel = hintLevel;
  stepMetrics.hintUnlockTimestamps.push(Date.now());
  metrics.totalHintsUnlocked++;

  // Track reveal usage (hint level 5 = reveal)
  if (hintLevel === 5) {
    stepMetrics.revealUsed = true;
    metrics.revealCount++;
  }

  return { ...metrics };
}

/**
 * Record step completion
 */
export function recordStepCompletion(
  metrics: SessionLoadMetrics,
  stepId: number
): SessionLoadMetrics {
  const stepMetrics = metrics.stepMetrics.find((s) => s.stepId === stepId);
  if (stepMetrics) {
    stepMetrics.isCompleted = true;
  }

  return { ...metrics };
}

// ============ State Transition Logic ============

/**
 * Update cognitive load state after step submission
 *
 * This function:
 * 1. Computes new score from metrics
 * 2. Handles transitions between states
 * 3. Tracks recovery progress
 */
export function updateCognitiveLoadAfterStep(
  currentState: CognitiveLoadState,
  metrics: SessionLoadMetrics,
  thresholds: CognitiveLoadThresholds = DEFAULT_COGNITIVE_LOAD_THRESHOLDS
): { state: CognitiveLoadState; event: CognitiveLoadEvent | null } {
  const previousScore = currentState.score;
  const newScore = computeCognitiveLoadScore(metrics, currentState, thresholds);

  // No change - just track recovery progress
  if (newScore === previousScore) {
    if (previousScore === 'high' || previousScore === 'medium') {
      currentState.stepsSinceLowLoad++;
    }
    return { state: currentState, event: null };
  }

  // Score changed - create new state
  const newState: CognitiveLoadState = {
    score: newScore,
    previousScore,
    lastUpdatedAt: new Date().toISOString(),
    consecutiveHighLoadSteps: newScore === 'high' ? currentState.consecutiveHighLoadSteps + 1 : 0,
    stepsSinceLowLoad: newScore === 'low' ? 0 : currentState.stepsSinceLowLoad + 1,
    simplifiedModeActive: newScore === 'high',
    scoreHistory: [
      ...currentState.scoreHistory.slice(-9), // Keep last 10
      { score: newScore, timestamp: new Date().toISOString() },
    ],
  };

  // Create event for telemetry
  const event: CognitiveLoadEvent = {
    type:
      scoreOrder(newScore) > scoreOrder(previousScore)
        ? 'cognitive_load_increased'
        : scoreOrder(newScore) < scoreOrder(previousScore)
          ? 'cognitive_load_decreased'
          : 'cognitive_load_assessed',
    timestamp: new Date().toISOString(),
    previousScore,
    newScore,
    triggerMetrics: {
      avgTimePerStep: metrics.totalTimeSpentSeconds / Math.max(1, metrics.stepMetrics.length),
      avgWrongAttempts: metrics.totalWrongAttempts / Math.max(1, metrics.stepMetrics.length),
      hintEscalationRate:
        metrics.totalHintsUnlocked / Math.max(1, metrics.totalTimeSpentSeconds / 60),
      stuckStepCount: metrics.stuckStepCount,
    },
  };

  return { state: newState, event };
}

function scoreOrder(score: CognitiveLoadScore): number {
  switch (score) {
    case 'low':
      return 0;
    case 'medium':
      return 1;
    case 'high':
      return 2;
  }
}

// ============ UI Configuration ============

/**
 * Get UI configuration based on cognitive load score
 */
export function getUIConfigForLoadScore(score: CognitiveLoadScore): HighLoadUIConfig {
  switch (score) {
    case 'high':
      return HIGH_LOAD_UI_CONFIG;
    case 'medium':
      return MEDIUM_LOAD_UI_CONFIG;
    default:
      return LOW_LOAD_UI_CONFIG;
  }
}

/**
 * Shorten hint text to first sentence for high load mode
 */
export function shortenHintForHighLoad(hintContent: string): string {
  // Find first sentence (ends with period, question mark, or exclamation)
  const sentenceMatch = hintContent.match(/^[^.!?]+[.!?]/);
  if (sentenceMatch) {
    return sentenceMatch[0];
  }
  // If no sentence found, return first 100 characters with ellipsis
  return hintContent.length > 100 ? hintContent.slice(0, 100) + '...' : hintContent;
}

/**
 * Reduce MCQ options to binary for high load mode
 * Returns the 2 most relevant options (correct + most plausible distractor)
 */
export function reduceMCQToBinary<T extends { isCorrect?: boolean }>(options: T[]): T[] {
  if (options.length <= 2) return options;

  // Find the correct option
  const correctOption = options.find((o) => o.isCorrect);
  if (!correctOption) return options.slice(0, 2);

  // Find the best distractor (first incorrect option)
  const distractor = options.find((o) => !o.isCorrect);
  if (!distractor) return [correctOption];

  // Randomize order to avoid position bias
  return Math.random() > 0.5 ? [correctOption, distractor] : [distractor, correctOption];
}

// ============ Utility Functions ============

/**
 * Check if simplified mode should be active
 */
export function isSimplifiedModeActive(state: CognitiveLoadState | null): boolean {
  return state?.simplifiedModeActive ?? false;
}

/**
 * Get human-readable label for load score
 */
export function getLoadScoreLabel(score: CognitiveLoadScore): string {
  switch (score) {
    case 'high':
      return 'High Cognitive Load';
    case 'medium':
      return 'Moderate Cognitive Load';
    case 'low':
      return 'Low Cognitive Load';
  }
}

/**
 * Get load score color for UI
 */
export function getLoadScoreColor(score: CognitiveLoadScore): string {
  switch (score) {
    case 'high':
      return '#ef4444'; // red
    case 'medium':
      return '#f59e0b'; // amber
    case 'low':
      return '#22c55e'; // green
  }
}
