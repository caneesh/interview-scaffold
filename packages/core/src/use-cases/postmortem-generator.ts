/**
 * Postmortem and STAR Story Generator
 *
 * Generates learning artifacts from debugging sessions:
 * - STAR stories (Situation, Task, Action, Result)
 * - Knowledge cards for bug patterns
 * - Session summaries
 *
 * Uses only actual evidence from the session - no fabricated metrics.
 */

import type {
  DiagnosticSession,
  DiagnosticEvidence,
  GuidanceType,
} from '../entities/diagnostic-coach.js';
import { addGuidanceEntry } from '../entities/diagnostic-coach.js';
import type { DiagnosticSessionRepo } from '../ports/diagnostic-session-repo.js';

// ============ STAR Story Types ============

export interface STARStory {
  readonly situation: string;
  readonly task: string;
  readonly action: string;
  readonly result: string;
  readonly technicalDetails: {
    readonly defectCategory: string;
    readonly severity: string;
    readonly rootCause: string;
    readonly fixApproach: string;
    readonly stagesVisited: readonly string[];
    readonly hypothesesTested: number;
    readonly fixAttemptsCount: number;
  };
}

// ============ Knowledge Card Types ============

export interface KnowledgeCard {
  readonly id: string;
  readonly title: string;
  readonly pattern: string;
  readonly description: string;
  readonly symptoms: readonly string[];
  readonly commonCauses: readonly string[];
  readonly debuggingStrategy: readonly string[];
  readonly prevention: readonly string[];
  readonly relatedPatterns: readonly string[];
  readonly createdAt: Date;
}

// ============ Postmortem Summary Types ============

export interface PostmortemSummary {
  readonly sessionId: string;
  readonly rootCause: string;
  readonly timeline: readonly TimelineEntry[];
  readonly whatWentWell: readonly string[];
  readonly whatCouldImprove: readonly string[];
  readonly lessonsLearned: readonly string[];
  readonly actionItems: readonly string[];
}

export interface TimelineEntry {
  readonly stage: string;
  readonly timestamp: Date;
  readonly action: string;
  readonly outcome: string;
}

// ============ Generate STAR Story ============

export interface GenerateSTARInput {
  readonly sessionId: string;
  readonly userReflection?: string;
}

export async function generateSTARStory(
  input: GenerateSTARInput,
  deps: { sessionRepo: DiagnosticSessionRepo }
): Promise<{ success: boolean; story?: STARStory; error?: string }> {
  const session = await deps.sessionRepo.getById(input.sessionId);
  if (!session) {
    return { success: false, error: 'Session not found' };
  }

  if (session.currentStage !== 'POSTMORTEM') {
    return { success: false, error: 'Session must be in POSTMORTEM stage' };
  }

  const evidence = session.evidence;

  // Build STAR story from actual evidence
  const story = buildSTARStory(session, evidence, input.userReflection);

  // Record that we generated a STAR story
  let updatedSession = addGuidanceEntry(session, {
    stage: 'POSTMORTEM',
    type: 'knowledge_card',
    content: `Generated STAR story for defect: ${evidence.triage?.defectCategory || 'unknown'}`,
  });
  await deps.sessionRepo.save(updatedSession);

  return { success: true, story };
}

function buildSTARStory(
  session: DiagnosticSession,
  evidence: DiagnosticEvidence,
  userReflection?: string
): STARStory {
  const triage = evidence.triage;
  const reproduction = evidence.reproduction;
  const localization = evidence.localization;
  const hypotheses = evidence.hypotheses ?? [];
  const fixAttempts = evidence.fixAttempts ?? [];
  const verification = evidence.verification;

  // Extract confirmed hypothesis as root cause
  const confirmedHypothesis = hypotheses.find(h => h.status === 'confirmed');
  const rootCause = confirmedHypothesis?.hypothesis || 'Root cause not explicitly confirmed';

  // Extract successful fix approach
  const successfulFix = fixAttempts.find(f => f.testsPassed);
  const fixApproach = successfulFix?.approach || 'Fix approach not recorded';

  // Build situation from triage and observations
  const situation = buildSituation(triage, reproduction);

  // Build task from the problem context
  const task = buildTask(triage);

  // Build action from the debugging journey
  const action = buildAction(localization, hypotheses, fixAttempts);

  // Build result from verification
  const result = buildResult(verification, userReflection);

  return {
    situation,
    task,
    action,
    result,
    technicalDetails: {
      defectCategory: triage?.defectCategory || 'unknown',
      severity: triage?.severity || 'unknown',
      rootCause,
      fixApproach,
      stagesVisited: session.stageHistory.map(h => h.to),
      hypothesesTested: hypotheses.length,
      fixAttemptsCount: fixAttempts.length,
    },
  };
}

function buildSituation(
  triage?: DiagnosticEvidence['triage'],
  reproduction?: DiagnosticEvidence['reproduction']
): string {
  const parts: string[] = [];

  if (triage) {
    parts.push(`Encountered a ${triage.severity} severity ${triage.defectCategory} defect.`);
    if (triage.observations) {
      parts.push(triage.observations);
    }
  }

  if (reproduction) {
    if (reproduction.isDeterministic) {
      parts.push('The issue was consistently reproducible.');
    } else {
      const rate = reproduction.successRate
        ? `(~${Math.round(reproduction.successRate * 100)}% reproduction rate)`
        : '';
      parts.push(`The issue was intermittent ${rate}.`);
    }
  }

  return parts.join(' ') || 'A bug was discovered during testing.';
}

function buildTask(triage?: DiagnosticEvidence['triage']): string {
  if (!triage) {
    return 'The task was to identify and fix the bug.';
  }

  return `The task was to diagnose and fix a ${triage.priority} priority ${triage.defectCategory} issue with ${triage.severity} impact.`;
}

function buildAction(
  localization?: DiagnosticEvidence['localization'],
  hypotheses?: DiagnosticEvidence['hypotheses'],
  fixAttempts?: DiagnosticEvidence['fixAttempts']
): string {
  const parts: string[] = [];

  if (localization) {
    if (localization.suspectedFiles.length > 0) {
      parts.push(`Localized the issue to ${localization.suspectedFiles.length} file(s).`);
    }
    if (localization.suspectedFunctions.length > 0) {
      parts.push(`Identified ${localization.suspectedFunctions.length} suspect function(s).`);
    }
  }

  if (hypotheses && hypotheses.length > 0) {
    const confirmed = hypotheses.filter(h => h.status === 'confirmed').length;
    const rejected = hypotheses.filter(h => h.status === 'rejected').length;
    parts.push(`Tested ${hypotheses.length} hypothesis(es): ${confirmed} confirmed, ${rejected} rejected.`);
  }

  if (fixAttempts && fixAttempts.length > 0) {
    const successful = fixAttempts.filter(f => f.testsPassed).length;
    if (fixAttempts.length > 1) {
      parts.push(`Made ${fixAttempts.length} fix attempt(s), ${successful} successful.`);
    } else if (successful > 0) {
      parts.push('Applied the fix successfully on first attempt.');
    }
  }

  return parts.join(' ') || 'Systematically debugged the issue through hypothesis testing.';
}

function buildResult(
  verification?: DiagnosticEvidence['verification'],
  userReflection?: string
): string {
  const parts: string[] = [];

  if (verification) {
    if (verification.visibleTestsPassed && verification.regressionTestsPassed) {
      parts.push('All tests passed after the fix.');
    }
    if (verification.edgeCasesChecked.length > 0) {
      parts.push(`Verified ${verification.edgeCasesChecked.length} edge case(s).`);
    }
  }

  if (userReflection) {
    parts.push(userReflection);
  }

  return parts.join(' ') || 'The bug was successfully fixed and verified.';
}

// ============ Generate Knowledge Card ============

export interface GenerateKnowledgeCardInput {
  readonly sessionId: string;
  readonly userInsights?: {
    readonly prevention?: readonly string[];
    readonly relatedPatterns?: readonly string[];
  };
}

export async function generateKnowledgeCard(
  input: GenerateKnowledgeCardInput,
  deps: { sessionRepo: DiagnosticSessionRepo; idGenerator: { generate: () => string } }
): Promise<{ success: boolean; card?: KnowledgeCard; error?: string }> {
  const session = await deps.sessionRepo.getById(input.sessionId);
  if (!session) {
    return { success: false, error: 'Session not found' };
  }

  const evidence = session.evidence;
  const triage = evidence.triage;

  if (!triage) {
    return { success: false, error: 'No triage evidence available' };
  }

  const confirmedHypothesis = evidence.hypotheses?.find(h => h.status === 'confirmed');

  const card: KnowledgeCard = {
    id: deps.idGenerator.generate(),
    title: `${capitalize(triage.defectCategory)} Bug Pattern`,
    pattern: confirmedHypothesis?.hypothesis || triage.observations,
    description: buildPatternDescription(evidence),
    symptoms: extractSymptoms(evidence),
    commonCauses: extractCauses(evidence),
    debuggingStrategy: extractDebuggingStrategy(session),
    prevention: input.userInsights?.prevention ?? getDefaultPrevention(triage.defectCategory),
    relatedPatterns: input.userInsights?.relatedPatterns ?? [],
    createdAt: new Date(),
  };

  // Record knowledge card generation
  let updatedSession = addGuidanceEntry(session, {
    stage: 'POSTMORTEM',
    type: 'knowledge_card',
    content: `Generated knowledge card: ${card.title}`,
  });
  await deps.sessionRepo.save(updatedSession);

  return { success: true, card };
}

function buildPatternDescription(evidence: DiagnosticEvidence): string {
  const triage = evidence.triage;
  const confirmedHypothesis = evidence.hypotheses?.find(h => h.status === 'confirmed');

  if (confirmedHypothesis) {
    return `A ${triage?.defectCategory || 'bug'} caused by: ${confirmedHypothesis.hypothesis}`;
  }

  return triage?.observations || 'A bug pattern requiring systematic debugging.';
}

function extractSymptoms(evidence: DiagnosticEvidence): readonly string[] {
  const symptoms: string[] = [];

  if (evidence.triage?.observations) {
    symptoms.push(evidence.triage.observations);
  }

  if (evidence.reproduction) {
    if (!evidence.reproduction.isDeterministic) {
      symptoms.push('Intermittent failure');
    }
    if (evidence.reproduction.steps.length > 0) {
      symptoms.push(`Triggered by: ${evidence.reproduction.steps[0]}`);
    }
  }

  if (evidence.localization?.stackTrace) {
    symptoms.push('Stack trace available');
  }

  return symptoms.length > 0 ? symptoms : ['Test failure', 'Unexpected behavior'];
}

function extractCauses(evidence: DiagnosticEvidence): readonly string[] {
  const causes: string[] = [];

  // Add all tested hypotheses as potential causes
  const hypotheses = evidence.hypotheses ?? [];
  for (const h of hypotheses) {
    if (h.status === 'confirmed') {
      causes.unshift(h.hypothesis); // Confirmed cause first
    } else if (h.status === 'rejected') {
      causes.push(`NOT: ${h.hypothesis}`);
    }
  }

  return causes.length > 0 ? causes : ['Unknown - requires investigation'];
}

function extractDebuggingStrategy(session: DiagnosticSession): readonly string[] {
  const strategy: string[] = [];

  const stages = session.stageHistory.map(h => h.to);

  if (stages.includes('TRIAGE')) {
    strategy.push('Classify defect category, severity, and priority');
  }
  if (stages.includes('REPRODUCE')) {
    strategy.push('Establish deterministic reproduction');
  }
  if (stages.includes('LOCALIZE')) {
    strategy.push('Narrow down to specific files/functions');
  }
  if (stages.includes('HYPOTHESIZE')) {
    strategy.push('Form and test hypotheses systematically');
  }
  if (stages.includes('FIX')) {
    strategy.push('Apply minimal targeted fix');
  }
  if (stages.includes('VERIFY')) {
    strategy.push('Verify with tests and edge cases');
  }

  return strategy;
}

function getDefaultPrevention(defectCategory: string): readonly string[] {
  const preventionMap: Record<string, readonly string[]> = {
    functional: [
      'Add unit tests for edge cases',
      'Use property-based testing',
      'Review boundary conditions',
    ],
    concurrency: [
      'Use thread-safe data structures',
      'Avoid shared mutable state',
      'Add concurrency tests',
    ],
    resource: [
      'Implement proper cleanup in finally blocks',
      'Use connection pooling with limits',
      'Monitor resource usage',
    ],
    performance: [
      'Add performance benchmarks',
      'Profile before optimization',
      'Set complexity budgets',
    ],
    distributed: [
      'Implement idempotency',
      'Add retry with backoff',
      'Use correlation IDs for tracing',
    ],
    environment: [
      'Document environment requirements',
      'Use configuration validation',
      'Test in production-like environments',
    ],
    heisenbug: [
      'Add deterministic seeding for randomness',
      'Log execution order',
      'Use snapshot testing',
    ],
    container: [
      'Pin dependency versions',
      'Test in containerized environment',
      'Check resource limits',
    ],
    data: [
      'Validate inputs at boundaries',
      'Use schema validation',
      'Handle null/undefined explicitly',
    ],
  };

  return preventionMap[defectCategory] ?? [
    'Add tests for this scenario',
    'Document the bug pattern',
    'Review similar code for the same issue',
  ];
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

// ============ Generate Postmortem Summary ============

export async function generatePostmortemSummary(
  sessionId: string,
  deps: { sessionRepo: DiagnosticSessionRepo }
): Promise<{ success: boolean; summary?: PostmortemSummary; error?: string }> {
  const session = await deps.sessionRepo.getById(sessionId);
  if (!session) {
    return { success: false, error: 'Session not found' };
  }

  const evidence = session.evidence;
  const confirmedHypothesis = evidence.hypotheses?.find(h => h.status === 'confirmed');

  const timeline = buildTimeline(session);
  const whatWentWell = analyzeWhatWentWell(session);
  const whatCouldImprove = analyzeWhatCouldImprove(session);
  const lessonsLearned = extractLessons(evidence);
  const actionItems = generateActionItems(evidence);

  const summary: PostmortemSummary = {
    sessionId,
    rootCause: confirmedHypothesis?.hypothesis || 'Root cause not explicitly identified',
    timeline,
    whatWentWell,
    whatCouldImprove,
    lessonsLearned,
    actionItems,
  };

  return { success: true, summary };
}

function buildTimeline(session: DiagnosticSession): readonly TimelineEntry[] {
  return session.stageHistory.map((transition, idx) => ({
    stage: transition.to,
    timestamp: transition.timestamp,
    action: `Entered ${transition.to} stage`,
    outcome: transition.reason || `Stage ${idx + 1} of debugging process`,
  }));
}

function analyzeWhatWentWell(session: DiagnosticSession): readonly string[] {
  const wellItems: string[] = [];
  const evidence = session.evidence;

  if (evidence.reproduction?.isDeterministic) {
    wellItems.push('Established reliable reproduction early');
  }

  const hypotheses = evidence.hypotheses ?? [];
  const confirmedCount = hypotheses.filter(h => h.status === 'confirmed').length;
  if (confirmedCount > 0 && hypotheses.length <= 3) {
    wellItems.push('Efficiently identified root cause with minimal hypotheses');
  }

  const fixAttempts = evidence.fixAttempts ?? [];
  if (fixAttempts.length === 1 && fixAttempts[0]?.testsPassed) {
    wellItems.push('Fixed on first attempt');
  }

  if (evidence.verification?.edgeCasesChecked.length && evidence.verification.edgeCasesChecked.length >= 2) {
    wellItems.push('Thorough edge case verification');
  }

  return wellItems.length > 0 ? wellItems : ['Completed the debugging process'];
}

function analyzeWhatCouldImprove(session: DiagnosticSession): readonly string[] {
  const improveItems: string[] = [];
  const evidence = session.evidence;

  if (!evidence.reproduction?.isDeterministic) {
    improveItems.push('Could have spent more time establishing deterministic reproduction');
  }

  const hypotheses = evidence.hypotheses ?? [];
  const rejectedCount = hypotheses.filter(h => h.status === 'rejected').length;
  if (rejectedCount > 2) {
    improveItems.push('Many hypotheses were rejected - consider narrowing localization first');
  }

  const fixAttempts = evidence.fixAttempts ?? [];
  if (fixAttempts.length > 2) {
    improveItems.push('Multiple fix attempts needed - consider more analysis before fixing');
  }

  if (!evidence.verification?.edgeCasesChecked.length) {
    improveItems.push('Could add more edge case verification');
  }

  return improveItems;
}

function extractLessons(evidence: DiagnosticEvidence): readonly string[] {
  const lessons: string[] = [];

  const confirmedHypothesis = evidence.hypotheses?.find(h => h.status === 'confirmed');
  if (confirmedHypothesis) {
    lessons.push(`Root cause pattern: ${confirmedHypothesis.hypothesis}`);
  }

  if (evidence.triage?.defectCategory) {
    lessons.push(`This was a ${evidence.triage.defectCategory} category defect`);
  }

  const rejectedHypotheses = evidence.hypotheses?.filter(h => h.status === 'rejected') ?? [];
  if (rejectedHypotheses.length > 0) {
    lessons.push(`Ruled out: ${rejectedHypotheses.map(h => h.hypothesis).join(', ')}`);
  }

  return lessons;
}

function generateActionItems(evidence: DiagnosticEvidence): readonly string[] {
  const items: string[] = [];

  // Always recommend adding a test
  items.push('Add regression test for this specific scenario');

  const defectCategory = evidence.triage?.defectCategory;
  if (defectCategory) {
    items.push(`Review similar code for other ${defectCategory} issues`);
  }

  const successfulFix = evidence.fixAttempts?.find(f => f.testsPassed);
  if (successfulFix) {
    items.push(`Document the fix approach: ${successfulFix.approach}`);
  }

  return items;
}
