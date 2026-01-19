/**
 * Diagnostic Coaching Use Cases
 *
 * Implements the coaching logic for each diagnostic stage.
 * This is the core logic that:
 * 1. Gets guidance (AI or deterministic)
 * 2. Validates responses
 * 3. Manages stage transitions
 * 4. Persists evidence
 */

import type {
  DiagnosticSession,
  DiagnosticStage,
  DiagnosticEvidence,
  TriageEvidence,
  ReproductionEvidence,
  LocalizationEvidence,
  HypothesisEvidence,
  FixAttemptEvidence,
  VerificationEvidence,
  AICoachRequest,
  AICoachResponse,
  ProblemContext,
  GuidanceType,
} from '../entities/diagnostic-coach.js';
import {
  createDiagnosticSession,
  transitionStage,
  addEvidence,
  addGuidanceEntry,
  isStageComplete,
  canTransitionTo,
} from '../entities/diagnostic-coach.js';
import type { AICoachPort } from '../ports/ai-coach.js';
import { validateAIResponse } from '../ports/ai-coach.js';
import type { DiagnosticSessionRepo } from '../ports/diagnostic-session-repo.js';
import { getDeterministicGuidance, type DeterministicGuidance } from '../coaching/deterministic-rules.js';
import type { IdGenerator } from '../ports/id-generator.js';

// ============ Common Types ============

export interface CoachingResult {
  readonly success: boolean;
  readonly session: DiagnosticSession;
  readonly guidance?: {
    readonly content: string;
    readonly type: GuidanceType;
    readonly questions: readonly string[];
    readonly source: 'ai' | 'deterministic';
  };
  readonly suggestedNextStage?: DiagnosticStage;
  readonly error?: string;
}

export interface StageTransitionResult {
  readonly success: boolean;
  readonly session: DiagnosticSession;
  readonly error?: string;
}

// ============ Start Session Use Case ============

export interface StartSessionInput {
  readonly attemptId: string;
  readonly tenantId: string;
  readonly userId: string;
  readonly problemContext: ProblemContext;
  readonly aiEnabled: boolean;
}

export async function startDiagnosticSession(
  input: StartSessionInput,
  deps: {
    sessionRepo: DiagnosticSessionRepo;
    idGenerator: IdGenerator;
  }
): Promise<DiagnosticSession> {
  // Check if session already exists for this attempt
  const existing = await deps.sessionRepo.getByAttemptId(input.attemptId);
  if (existing) {
    return existing;
  }

  // Create new session
  const session = createDiagnosticSession(
    deps.idGenerator.generate(),
    input.attemptId,
    input.tenantId,
    input.userId,
    input.aiEnabled
  );

  return deps.sessionRepo.save(session);
}

// ============ Get Guidance Use Case ============

export interface GetGuidanceInput {
  readonly sessionId: string;
  readonly userMessage?: string;
  readonly problemContext: ProblemContext;
}

export async function getCoachingGuidance(
  input: GetGuidanceInput,
  deps: {
    sessionRepo: DiagnosticSessionRepo;
    aiCoach: AICoachPort;
  }
): Promise<CoachingResult> {
  const session = await deps.sessionRepo.getById(input.sessionId);
  if (!session) {
    return { success: false, session: null as any, error: 'Session not found' };
  }

  const request: AICoachRequest = {
    stage: session.currentStage,
    problemContext: input.problemContext,
    evidence: session.evidence,
    userMessage: input.userMessage,
  };

  let guidance: CoachingResult['guidance'];
  let updatedSession = session;

  // Try AI guidance if enabled
  if (session.aiEnabled && deps.aiCoach.isEnabled()) {
    const aiResponse = await deps.aiCoach.getGuidance(request);

    if (aiResponse) {
      const validation = validateAIResponse(aiResponse);

      if (validation.valid) {
        guidance = {
          content: aiResponse.guidance,
          type: aiResponse.guidanceType,
          questions: aiResponse.questions ?? [],
          source: 'ai',
        };

        // Record AI guidance in session
        updatedSession = addGuidanceEntry(session, {
          stage: session.currentStage,
          type: aiResponse.guidanceType,
          content: aiResponse.guidance,
        });
        updatedSession = await deps.sessionRepo.save(updatedSession);
      }
      // If AI response is invalid, fall through to deterministic
    }
  }

  // Fall back to deterministic guidance
  if (!guidance) {
    const deterministic = getDeterministicGuidance(session.currentStage, session.evidence);
    guidance = {
      content: deterministic.guidance,
      type: deterministic.guidanceType,
      questions: deterministic.questions,
      source: 'deterministic',
    };

    // Record deterministic guidance in session
    updatedSession = addGuidanceEntry(updatedSession, {
      stage: session.currentStage,
      type: deterministic.guidanceType,
      content: deterministic.guidance,
    });
    updatedSession = await deps.sessionRepo.save(updatedSession);
  }

  // Check if stage can be advanced
  const suggestedNextStage = isStageComplete(session.currentStage, session.evidence)
    ? getNextStage(session.currentStage)
    : undefined;

  return {
    success: true,
    session: updatedSession,
    guidance,
    suggestedNextStage,
  };
}

// ============ Submit Triage Use Case (Stage 1) ============

export interface SubmitTriageInput {
  readonly sessionId: string;
  readonly defectCategory: string;
  readonly severity: string;
  readonly priority: string;
  readonly observations: string;
}

export async function submitTriage(
  input: SubmitTriageInput,
  deps: { sessionRepo: DiagnosticSessionRepo }
): Promise<StageTransitionResult> {
  const session = await deps.sessionRepo.getById(input.sessionId);
  if (!session) {
    return { success: false, session: null as any, error: 'Session not found' };
  }

  if (session.currentStage !== 'TRIAGE') {
    return { success: false, session, error: `Cannot submit triage in ${session.currentStage} stage` };
  }

  const triageEvidence: TriageEvidence = {
    defectCategory: input.defectCategory,
    severity: input.severity,
    priority: input.priority,
    observations: input.observations,
    timestamp: new Date(),
  };

  let updatedSession = addEvidence(session, 'triage', triageEvidence);
  updatedSession = await deps.sessionRepo.save(updatedSession);

  return { success: true, session: updatedSession };
}

// ============ Submit Reproduction Use Case (Stage 2) ============

export interface SubmitReproductionInput {
  readonly sessionId: string;
  readonly steps: readonly string[];
  readonly isDeterministic: boolean;
  readonly reproCommand?: string;
  readonly successRate?: number;
}

export async function submitReproduction(
  input: SubmitReproductionInput,
  deps: { sessionRepo: DiagnosticSessionRepo }
): Promise<StageTransitionResult> {
  const session = await deps.sessionRepo.getById(input.sessionId);
  if (!session) {
    return { success: false, session: null as any, error: 'Session not found' };
  }

  if (session.currentStage !== 'REPRODUCE') {
    return { success: false, session, error: `Cannot submit reproduction in ${session.currentStage} stage` };
  }

  const reproEvidence: ReproductionEvidence = {
    steps: input.steps,
    isDeterministic: input.isDeterministic,
    reproCommand: input.reproCommand,
    successRate: input.successRate,
    timestamp: new Date(),
  };

  let updatedSession = addEvidence(session, 'reproduction', reproEvidence);
  updatedSession = await deps.sessionRepo.save(updatedSession);

  return { success: true, session: updatedSession };
}

// ============ Submit Localization Use Case (Stage 3) ============

export interface SubmitLocalizationInput {
  readonly sessionId: string;
  readonly suspectedFiles: readonly string[];
  readonly suspectedFunctions: readonly string[];
  readonly stackTrace?: string;
  readonly narrowingHistory?: readonly string[];
}

export async function submitLocalization(
  input: SubmitLocalizationInput,
  deps: { sessionRepo: DiagnosticSessionRepo }
): Promise<StageTransitionResult> {
  const session = await deps.sessionRepo.getById(input.sessionId);
  if (!session) {
    return { success: false, session: null as any, error: 'Session not found' };
  }

  if (session.currentStage !== 'LOCALIZE') {
    return { success: false, session, error: `Cannot submit localization in ${session.currentStage} stage` };
  }

  const localizeEvidence: LocalizationEvidence = {
    suspectedFiles: input.suspectedFiles,
    suspectedFunctions: input.suspectedFunctions,
    stackTrace: input.stackTrace,
    narrowingHistory: input.narrowingHistory,
    timestamp: new Date(),
  };

  let updatedSession = addEvidence(session, 'localization', localizeEvidence);
  updatedSession = await deps.sessionRepo.save(updatedSession);

  return { success: true, session: updatedSession };
}

// ============ Submit Hypothesis Use Case (Stage 4) ============

export interface SubmitHypothesisInput {
  readonly sessionId: string;
  readonly hypothesis: string;
  readonly testMethod: string;
}

export async function submitHypothesis(
  input: SubmitHypothesisInput,
  deps: { sessionRepo: DiagnosticSessionRepo; idGenerator: IdGenerator }
): Promise<StageTransitionResult> {
  const session = await deps.sessionRepo.getById(input.sessionId);
  if (!session) {
    return { success: false, session: null as any, error: 'Session not found' };
  }

  if (session.currentStage !== 'HYPOTHESIZE') {
    return { success: false, session, error: `Cannot submit hypothesis in ${session.currentStage} stage` };
  }

  const newHypothesis: HypothesisEvidence = {
    id: deps.idGenerator.generate(),
    hypothesis: input.hypothesis,
    testMethod: input.testMethod,
    status: 'untested',
    timestamp: new Date(),
  };

  const existingHypotheses = session.evidence.hypotheses ?? [];
  let updatedSession = addEvidence(session, 'hypotheses', [...existingHypotheses, newHypothesis]);
  updatedSession = await deps.sessionRepo.save(updatedSession);

  return { success: true, session: updatedSession };
}

export interface UpdateHypothesisInput {
  readonly sessionId: string;
  readonly hypothesisId: string;
  readonly status: 'confirmed' | 'rejected';
  readonly evidence?: string;
}

export async function updateHypothesis(
  input: UpdateHypothesisInput,
  deps: { sessionRepo: DiagnosticSessionRepo }
): Promise<StageTransitionResult> {
  const session = await deps.sessionRepo.getById(input.sessionId);
  if (!session) {
    return { success: false, session: null as any, error: 'Session not found' };
  }

  const hypotheses = session.evidence.hypotheses ?? [];
  const idx = hypotheses.findIndex(h => h.id === input.hypothesisId);
  if (idx === -1) {
    return { success: false, session, error: 'Hypothesis not found' };
  }

  const updatedHypotheses = hypotheses.map((h, i) =>
    i === idx ? { ...h, status: input.status, evidence: input.evidence } : h
  );

  let updatedSession = addEvidence(session, 'hypotheses', updatedHypotheses);
  updatedSession = await deps.sessionRepo.save(updatedSession);

  return { success: true, session: updatedSession };
}

// ============ Submit Fix Attempt Use Case (Stage 5) ============

export interface SubmitFixAttemptInput {
  readonly sessionId: string;
  readonly hypothesisId: string;
  readonly approach: string;
  readonly filesModified: readonly string[];
  readonly testsPassed: boolean;
  readonly testOutput?: string;
}

export async function submitFixAttempt(
  input: SubmitFixAttemptInput,
  deps: { sessionRepo: DiagnosticSessionRepo; idGenerator: IdGenerator }
): Promise<StageTransitionResult> {
  const session = await deps.sessionRepo.getById(input.sessionId);
  if (!session) {
    return { success: false, session: null as any, error: 'Session not found' };
  }

  if (session.currentStage !== 'FIX') {
    return { success: false, session, error: `Cannot submit fix attempt in ${session.currentStage} stage` };
  }

  const fixAttempt: FixAttemptEvidence = {
    id: deps.idGenerator.generate(),
    hypothesisId: input.hypothesisId,
    approach: input.approach,
    filesModified: input.filesModified,
    testsPassed: input.testsPassed,
    testOutput: input.testOutput,
    timestamp: new Date(),
  };

  const existingAttempts = session.evidence.fixAttempts ?? [];
  let updatedSession = addEvidence(session, 'fixAttempts', [...existingAttempts, fixAttempt]);
  updatedSession = await deps.sessionRepo.save(updatedSession);

  return { success: true, session: updatedSession };
}

// ============ Submit Verification Use Case (Stage 6) ============

export interface SubmitVerificationInput {
  readonly sessionId: string;
  readonly visibleTestsPassed: boolean;
  readonly hiddenTestsPassed?: boolean;
  readonly edgeCasesChecked: readonly string[];
  readonly regressionTestsPassed: boolean;
}

export async function submitVerification(
  input: SubmitVerificationInput,
  deps: { sessionRepo: DiagnosticSessionRepo }
): Promise<StageTransitionResult> {
  const session = await deps.sessionRepo.getById(input.sessionId);
  if (!session) {
    return { success: false, session: null as any, error: 'Session not found' };
  }

  if (session.currentStage !== 'VERIFY') {
    return { success: false, session, error: `Cannot submit verification in ${session.currentStage} stage` };
  }

  const verification: VerificationEvidence = {
    visibleTestsPassed: input.visibleTestsPassed,
    hiddenTestsPassed: input.hiddenTestsPassed,
    edgeCasesChecked: input.edgeCasesChecked,
    regressionTestsPassed: input.regressionTestsPassed,
    timestamp: new Date(),
  };

  let updatedSession = addEvidence(session, 'verification', verification);
  updatedSession = await deps.sessionRepo.save(updatedSession);

  return { success: true, session: updatedSession };
}

// ============ Stage Transition Use Case ============

export interface TransitionStageInput {
  readonly sessionId: string;
  readonly targetStage: DiagnosticStage;
  readonly reason?: string;
}

export async function transitionDiagnosticStage(
  input: TransitionStageInput,
  deps: { sessionRepo: DiagnosticSessionRepo }
): Promise<StageTransitionResult> {
  const session = await deps.sessionRepo.getById(input.sessionId);
  if (!session) {
    return { success: false, session: null as any, error: 'Session not found' };
  }

  if (!canTransitionTo(session.currentStage, input.targetStage)) {
    return {
      success: false,
      session,
      error: `Cannot transition from ${session.currentStage} to ${input.targetStage}`,
    };
  }

  try {
    let updatedSession = transitionStage(session, input.targetStage, input.reason);
    updatedSession = await deps.sessionRepo.save(updatedSession);
    return { success: true, session: updatedSession };
  } catch (err) {
    return { success: false, session, error: (err as Error).message };
  }
}

// ============ Helper Functions ============

function getNextStage(current: DiagnosticStage): DiagnosticStage | undefined {
  const order: DiagnosticStage[] = [
    'TRIAGE',
    'REPRODUCE',
    'LOCALIZE',
    'HYPOTHESIZE',
    'FIX',
    'VERIFY',
    'POSTMORTEM',
  ];
  const idx = order.indexOf(current);
  return idx < order.length - 1 ? order[idx + 1] : undefined;
}
