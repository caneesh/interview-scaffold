/**
 * AI Diagnostic Coach - Core Entities
 *
 * A step-by-step debugging coach that guides users without revealing answers.
 * Uses a state machine to track diagnostic progress.
 *
 * Key principles:
 * - Deterministic truth (tests, exit codes) is the source of correctness
 * - AI provides guidance, not answers
 * - All AI output validated via Zod schemas
 * - Graceful fallback to rule-based guidance when AI unavailable
 */

// ============ Diagnostic Stages (State Machine) ============

/**
 * Stages of the diagnostic process
 */
export const DIAGNOSTIC_STAGES = [
  'TRIAGE',       // Classify the defect category, severity, priority
  'REPRODUCE',    // Establish deterministic reproduction
  'LOCALIZE',     // Narrow down to module/function boundaries
  'HYPOTHESIZE',  // Form hypotheses about root cause
  'FIX',          // Implement the fix (user does this)
  'VERIFY',       // Verify the fix works
  'POSTMORTEM',   // Generate learnings and knowledge cards
] as const;

export type DiagnosticStage = (typeof DIAGNOSTIC_STAGES)[number];

/**
 * Valid stage transitions
 */
export const STAGE_TRANSITIONS: Record<DiagnosticStage, readonly DiagnosticStage[]> = {
  TRIAGE: ['REPRODUCE'],
  REPRODUCE: ['LOCALIZE', 'TRIAGE'], // Can go back to reclassify
  LOCALIZE: ['HYPOTHESIZE', 'REPRODUCE'],
  HYPOTHESIZE: ['FIX', 'LOCALIZE'], // May need more localization
  FIX: ['VERIFY', 'HYPOTHESIZE'], // May need different hypothesis
  VERIFY: ['POSTMORTEM', 'FIX'], // If verify fails, back to fix
  POSTMORTEM: [], // Terminal state
};

// ============ Diagnostic Session ============

/**
 * A diagnostic coaching session tied to an attempt
 */
export interface DiagnosticSession {
  readonly id: string;
  readonly attemptId: string;
  readonly tenantId: string;
  readonly userId: string;

  /** Current stage in the diagnostic process */
  readonly currentStage: DiagnosticStage;

  /** History of stage transitions with timestamps */
  readonly stageHistory: readonly StageTransition[];

  /** Collected evidence at each stage */
  readonly evidence: DiagnosticEvidence;

  /** AI guidance provided (if any) */
  readonly aiGuidance: readonly AIGuidanceEntry[];

  /** Whether AI coaching is enabled for this session */
  readonly aiEnabled: boolean;

  readonly createdAt: Date;
  readonly updatedAt: Date;
}

export interface StageTransition {
  readonly from: DiagnosticStage | null;
  readonly to: DiagnosticStage;
  readonly timestamp: Date;
  readonly reason?: string;
}

// ============ Diagnostic Evidence ============

/**
 * Evidence collected during diagnosis
 */
export interface DiagnosticEvidence {
  // Triage evidence
  readonly triage?: TriageEvidence;

  // Reproduction evidence
  readonly reproduction?: ReproductionEvidence;

  // Localization evidence
  readonly localization?: LocalizationEvidence;

  // Hypothesis evidence
  readonly hypotheses?: readonly HypothesisEvidence[];

  // Fix evidence
  readonly fixAttempts?: readonly FixAttemptEvidence[];

  // Verification evidence
  readonly verification?: VerificationEvidence;
}

export interface TriageEvidence {
  /** User's classification of the defect category */
  readonly defectCategory: string;
  /** User's assessment of severity */
  readonly severity: string;
  /** User's assessment of priority */
  readonly priority: string;
  /** User's initial observations */
  readonly observations: string;
  /** Timestamp of triage */
  readonly timestamp: Date;
}

export interface ReproductionEvidence {
  /** Steps to reproduce */
  readonly steps: readonly string[];
  /** Whether reproduction is deterministic */
  readonly isDeterministic: boolean;
  /** Test command or reproduction script */
  readonly reproCommand?: string;
  /** Reproduction success rate (for intermittent bugs) */
  readonly successRate?: number;
  readonly timestamp: Date;
}

export interface LocalizationEvidence {
  /** Suspected files/modules */
  readonly suspectedFiles: readonly string[];
  /** Suspected functions */
  readonly suspectedFunctions: readonly string[];
  /** Stack trace if available */
  readonly stackTrace?: string;
  /** Binary search narrowing history */
  readonly narrowingHistory?: readonly string[];
  readonly timestamp: Date;
}

export interface HypothesisEvidence {
  readonly id: string;
  /** The hypothesis statement */
  readonly hypothesis: string;
  /** How to test this hypothesis */
  readonly testMethod: string;
  /** Status: untested, confirmed, rejected */
  readonly status: 'untested' | 'confirmed' | 'rejected';
  /** Evidence for/against */
  readonly evidence?: string;
  readonly timestamp: Date;
}

export interface FixAttemptEvidence {
  readonly id: string;
  /** Which hypothesis this fix addresses */
  readonly hypothesisId: string;
  /** Description of the fix approach */
  readonly approach: string;
  /** Files modified */
  readonly filesModified: readonly string[];
  /** Whether tests passed after fix */
  readonly testsPassed: boolean;
  /** Test output */
  readonly testOutput?: string;
  readonly timestamp: Date;
}

export interface VerificationEvidence {
  /** Did all visible tests pass? */
  readonly visibleTestsPassed: boolean;
  /** Did hidden tests pass? (if applicable) */
  readonly hiddenTestsPassed?: boolean;
  /** Edge cases verified */
  readonly edgeCasesChecked: readonly string[];
  /** Regression tests run */
  readonly regressionTestsPassed: boolean;
  readonly timestamp: Date;
}

// ============ AI Guidance ============

/**
 * Record of AI guidance provided
 */
export interface AIGuidanceEntry {
  readonly id: string;
  /** Stage when guidance was provided */
  readonly stage: DiagnosticStage;
  /** Type of guidance */
  readonly type: GuidanceType;
  /** The guidance content (Socratic questions, not answers) */
  readonly content: string;
  /** Whether user found it helpful */
  readonly helpful?: boolean;
  readonly timestamp: Date;
}

export type GuidanceType =
  | 'socratic_question'    // Questions to guide thinking
  | 'checklist'            // Verification checklist
  | 'pattern_hint'         // Hint about common patterns
  | 'next_step'            // Suggested next step
  | 'counterexample'       // Challenge with counterexample
  | 'knowledge_card';      // Learning summary

// ============ AI Request/Response Schemas ============

/**
 * Request to AI for coaching guidance
 */
export interface AICoachRequest {
  readonly stage: DiagnosticStage;
  readonly problemContext: ProblemContext;
  readonly evidence: DiagnosticEvidence;
  readonly userMessage?: string;
}

export interface ProblemContext {
  readonly problemId: string;
  readonly problemTitle: string;
  readonly problemStatement: string;
  /** DO NOT include solution or correct answer */
  readonly visibleTestCases: readonly string[];
  /** Defect category from Debug Lab */
  readonly defectCategory?: string;
  /** Signals like failing_tests, timeout, etc */
  readonly signals?: readonly string[];
}

/**
 * Response from AI coaching
 * MUST NOT contain: code blocks, direct fixes, line numbers to change
 */
export interface AICoachResponse {
  readonly guidance: string;
  readonly guidanceType: GuidanceType;
  /** Socratic questions to ask the user */
  readonly questions?: readonly string[];
  /** Checklist items for verification */
  readonly checklist?: readonly string[];
  /** Suggested stage transition (if appropriate) */
  readonly suggestedNextStage?: DiagnosticStage;
  /** Confidence in the guidance (0-1) */
  readonly confidence: number;
}

// ============ Deterministic Fallback Rules ============

/**
 * Rule-based guidance when AI is unavailable
 */
export interface DeterministicGuidanceRule {
  readonly stage: DiagnosticStage;
  readonly condition: (evidence: DiagnosticEvidence) => boolean;
  readonly guidance: string;
  readonly guidanceType: GuidanceType;
  readonly questions?: readonly string[];
}

// ============ Stage Completion Criteria ============

/**
 * Criteria for completing each stage
 */
export const STAGE_COMPLETION_CRITERIA: Record<DiagnosticStage, (evidence: DiagnosticEvidence) => boolean> = {
  TRIAGE: (e) => Boolean(
    e.triage?.defectCategory &&
    e.triage?.severity &&
    e.triage?.priority
  ),

  REPRODUCE: (e) => Boolean(
    e.reproduction?.steps.length &&
    e.reproduction?.isDeterministic !== undefined
  ),

  LOCALIZE: (e) => Boolean(
    e.localization?.suspectedFiles.length ||
    e.localization?.suspectedFunctions.length
  ),

  HYPOTHESIZE: (e) => Boolean(
    e.hypotheses?.some(h => h.status !== 'rejected')
  ),

  FIX: (e) => Boolean(
    e.fixAttempts?.some(f => f.testsPassed)
  ),

  VERIFY: (e) => Boolean(
    e.verification?.visibleTestsPassed &&
    e.verification?.regressionTestsPassed
  ),

  POSTMORTEM: () => true, // Always complete-able
};

// ============ Helper Functions ============

/**
 * Check if a stage transition is valid
 */
export function canTransitionTo(from: DiagnosticStage, to: DiagnosticStage): boolean {
  return STAGE_TRANSITIONS[from].includes(to);
}

/**
 * Check if current stage is complete
 */
export function isStageComplete(stage: DiagnosticStage, evidence: DiagnosticEvidence): boolean {
  return STAGE_COMPLETION_CRITERIA[stage](evidence);
}

/**
 * Get next recommended stage
 */
export function getRecommendedNextStage(
  currentStage: DiagnosticStage,
  evidence: DiagnosticEvidence
): DiagnosticStage | null {
  const possibleNext = STAGE_TRANSITIONS[currentStage];

  if (possibleNext.length === 0) {
    return null; // Terminal state
  }

  // If current stage is complete, suggest forward progress
  if (isStageComplete(currentStage, evidence)) {
    const nextStage = possibleNext[0];
    return nextStage !== undefined ? nextStage : null; // First option is forward progress
  }

  return null; // Stay in current stage until complete
}

/**
 * Create initial diagnostic session
 */
export function createDiagnosticSession(
  id: string,
  attemptId: string,
  tenantId: string,
  userId: string,
  aiEnabled: boolean
): DiagnosticSession {
  const now = new Date();
  return {
    id,
    attemptId,
    tenantId,
    userId,
    currentStage: 'TRIAGE',
    stageHistory: [{
      from: null,
      to: 'TRIAGE',
      timestamp: now,
    }],
    evidence: {},
    aiGuidance: [],
    aiEnabled,
    createdAt: now,
    updatedAt: now,
  };
}

/**
 * Transition to a new stage
 */
export function transitionStage(
  session: DiagnosticSession,
  newStage: DiagnosticStage,
  reason?: string
): DiagnosticSession {
  if (!canTransitionTo(session.currentStage, newStage)) {
    throw new Error(
      `Invalid transition from ${session.currentStage} to ${newStage}`
    );
  }

  return {
    ...session,
    currentStage: newStage,
    stageHistory: [
      ...session.stageHistory,
      {
        from: session.currentStage,
        to: newStage,
        timestamp: new Date(),
        reason,
      },
    ],
    updatedAt: new Date(),
  };
}

/**
 * Add evidence to a session
 */
export function addEvidence<K extends keyof DiagnosticEvidence>(
  session: DiagnosticSession,
  key: K,
  value: DiagnosticEvidence[K]
): DiagnosticSession {
  return {
    ...session,
    evidence: {
      ...session.evidence,
      [key]: value,
    },
    updatedAt: new Date(),
  };
}

/**
 * Add AI guidance entry
 */
export function addGuidanceEntry(
  session: DiagnosticSession,
  entry: Omit<AIGuidanceEntry, 'id' | 'timestamp'>
): DiagnosticSession {
  const newEntry: AIGuidanceEntry = {
    ...entry,
    id: `guidance-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    timestamp: new Date(),
  };

  return {
    ...session,
    aiGuidance: [...session.aiGuidance, newEntry],
    updatedAt: new Date(),
  };
}
