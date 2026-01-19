/**
 * Deterministic Guidance Rules
 *
 * Rule-based coaching guidance that works without AI.
 * Used as fallback when AI is disabled or returns invalid output.
 */

import type {
  DiagnosticStage,
  DiagnosticEvidence,
  GuidanceType,
} from '../entities/diagnostic-coach.js';

// ============ Rule Types ============

export interface DeterministicRule {
  readonly id: string;
  readonly stage: DiagnosticStage;
  readonly priority: number; // Higher = checked first
  readonly condition: (evidence: DiagnosticEvidence) => boolean;
  readonly guidance: string;
  readonly guidanceType: GuidanceType;
  readonly questions: readonly string[];
}

// ============ TRIAGE Stage Rules ============

const triageRules: readonly DeterministicRule[] = [
  {
    id: 'triage-no-evidence',
    stage: 'TRIAGE',
    priority: 100,
    condition: (e) => !e.triage,
    guidance: 'Start by classifying the defect. Look at the symptoms and determine the category, severity, and priority.',
    guidanceType: 'next_step',
    questions: [
      'What type of failure are you seeing? (test failure, crash, timeout, wrong output)',
      'How severe is this bug? Does it block core functionality or is it a minor issue?',
      'How urgent is the fix? Is this affecting production users right now?',
    ],
  },
  {
    id: 'triage-missing-category',
    stage: 'TRIAGE',
    priority: 90,
    condition: (e) => e.triage !== undefined && !e.triage.defectCategory,
    guidance: 'You need to classify the defect category. This helps narrow down the debugging approach.',
    guidanceType: 'socratic_question',
    questions: [
      'Is this a logic error (wrong output), a resource issue (leak, exhaustion), or a concurrency problem?',
      'Does the bug reproduce consistently, or is it intermittent?',
      'Are there any environment-specific factors (timezone, locale, container)?',
    ],
  },
  {
    id: 'triage-missing-severity',
    stage: 'TRIAGE',
    priority: 80,
    condition: (e) => e.triage !== undefined && !e.triage.severity,
    guidance: 'Assess the severity of the defect based on its impact.',
    guidanceType: 'socratic_question',
    questions: [
      'What is the blast radius? How many users or systems are affected?',
      'Is there data loss or corruption involved?',
      'Can users work around this issue, or is it a complete blocker?',
    ],
  },
  {
    id: 'triage-complete',
    stage: 'TRIAGE',
    priority: 10,
    condition: (e) => Boolean(e.triage?.defectCategory && e.triage?.severity && e.triage?.priority),
    guidance: 'Triage is complete. You can now move to establishing reproduction.',
    guidanceType: 'next_step',
    questions: [
      'Are you confident in your classification? Any second thoughts?',
    ],
  },
];

// ============ REPRODUCE Stage Rules ============

const reproduceRules: readonly DeterministicRule[] = [
  {
    id: 'reproduce-no-evidence',
    stage: 'REPRODUCE',
    priority: 100,
    condition: (e) => !e.reproduction,
    guidance: 'Establish a deterministic way to reproduce the bug. Without reliable reproduction, debugging is guesswork.',
    guidanceType: 'next_step',
    questions: [
      'Can you describe the exact steps to trigger the bug?',
      'What inputs cause the failure?',
      'Does it fail every time, or only sometimes?',
    ],
  },
  {
    id: 'reproduce-intermittent',
    stage: 'REPRODUCE',
    priority: 90,
    condition: (e) => e.reproduction !== undefined && !e.reproduction.isDeterministic,
    guidance: 'Intermittent bugs are tricky. Try to identify the varying factor that causes inconsistency.',
    guidanceType: 'socratic_question',
    questions: [
      'Is timing a factor? Does it depend on how fast operations complete?',
      'Is there randomness involved? Shuffling, random IDs, or non-deterministic iteration?',
      'Does it depend on system state? Cached values, connection pools, previous requests?',
    ],
  },
  {
    id: 'reproduce-no-command',
    stage: 'REPRODUCE',
    priority: 80,
    condition: (e) => e.reproduction !== undefined && e.reproduction.steps.length > 0 && !e.reproduction.reproCommand,
    guidance: 'You have steps, but can you automate the reproduction? A test or script makes verification easier.',
    guidanceType: 'checklist',
    questions: [
      'Can you write a failing test case that captures this bug?',
      'What\'s the minimal setup required to reproduce?',
    ],
  },
  {
    id: 'reproduce-complete',
    stage: 'REPRODUCE',
    priority: 10,
    condition: (e) => Boolean(e.reproduction?.steps.length && e.reproduction?.isDeterministic),
    guidance: 'Good! You have a reproducible bug. Time to localize it to specific code.',
    guidanceType: 'next_step',
    questions: [
      'Ready to narrow down where the bug is occurring?',
    ],
  },
];

// ============ LOCALIZE Stage Rules ============

const localizeRules: readonly DeterministicRule[] = [
  {
    id: 'localize-no-evidence',
    stage: 'LOCALIZE',
    priority: 100,
    condition: (e) => !e.localization,
    guidance: 'Narrow down the bug to specific files or functions. Use binary search on the codebase.',
    guidanceType: 'next_step',
    questions: [
      'Looking at the error or failing test, which module is the entry point?',
      'Can you identify which layer the bug is in? (UI, API, business logic, data)',
      'Is there a stack trace? What does it tell you?',
    ],
  },
  {
    id: 'localize-too-broad',
    stage: 'LOCALIZE',
    priority: 90,
    condition: (e) => e.localization !== undefined && e.localization.suspectedFiles.length > 5,
    guidance: 'You\'ve identified many potential locations. Try to narrow down further.',
    guidanceType: 'socratic_question',
    questions: [
      'Can you use logging or print statements to trace the execution path?',
      'Which of these files is closest to where the error manifests?',
      'Can you comment out code sections to isolate the problem?',
    ],
  },
  {
    id: 'localize-has-stack-trace',
    stage: 'LOCALIZE',
    priority: 85,
    condition: (e) => Boolean(e.localization?.stackTrace),
    guidance: 'You have a stack trace. Work backwards from the error to find the root cause.',
    guidanceType: 'checklist',
    questions: [
      'What\'s at the top of the stack (where error was thrown)?',
      'What\'s the first frame that\'s your code (not library code)?',
      'What values were passed that led to this failure?',
    ],
  },
  {
    id: 'localize-complete',
    stage: 'LOCALIZE',
    priority: 10,
    condition: (e) => Boolean(
      (e.localization?.suspectedFiles.length && e.localization.suspectedFiles.length <= 3) ||
      e.localization?.suspectedFunctions.length
    ),
    guidance: 'You\'ve narrowed down the location. Time to form hypotheses about the root cause.',
    guidanceType: 'next_step',
    questions: [
      'What do you think is going wrong in this code?',
    ],
  },
];

// ============ HYPOTHESIZE Stage Rules ============

const hypothesizeRules: readonly DeterministicRule[] = [
  {
    id: 'hypothesize-no-evidence',
    stage: 'HYPOTHESIZE',
    priority: 100,
    condition: (e) => !e.hypotheses || e.hypotheses.length === 0,
    guidance: 'Form hypotheses about what could cause this bug. Think about common patterns.',
    guidanceType: 'next_step',
    questions: [
      'Based on the defect category, what are common causes?',
      'What assumptions might the code be making that could be wrong?',
      'Are there edge cases that might not be handled?',
    ],
  },
  {
    id: 'hypothesize-all-rejected',
    stage: 'HYPOTHESIZE',
    priority: 90,
    condition: (e) => e.hypotheses !== undefined && e.hypotheses.length > 0 && e.hypotheses.every(h => h.status === 'rejected'),
    guidance: 'All hypotheses rejected. Time to think differently or go back to localization.',
    guidanceType: 'socratic_question',
    questions: [
      'Did you miss any potential causes?',
      'Is there something unusual about the input or environment?',
      'Should you expand your search to more code areas?',
    ],
  },
  {
    id: 'hypothesize-untested',
    stage: 'HYPOTHESIZE',
    priority: 80,
    condition: (e) => e.hypotheses !== undefined && e.hypotheses.some(h => h.status === 'untested'),
    guidance: 'You have untested hypotheses. Test them before forming new ones.',
    guidanceType: 'checklist',
    questions: [
      'What experiment would confirm or reject this hypothesis?',
      'Can you add logging to verify your assumption?',
      'What would you expect to see if this hypothesis is correct?',
    ],
  },
  {
    id: 'hypothesize-confirmed',
    stage: 'HYPOTHESIZE',
    priority: 10,
    condition: (e) => e.hypotheses !== undefined && e.hypotheses.some(h => h.status === 'confirmed'),
    guidance: 'You\'ve confirmed a hypothesis! Now implement the fix.',
    guidanceType: 'next_step',
    questions: [
      'How will you fix this root cause?',
      'Are there similar issues elsewhere in the code?',
    ],
  },
];

// ============ FIX Stage Rules ============

const fixRules: readonly DeterministicRule[] = [
  {
    id: 'fix-no-attempt',
    stage: 'FIX',
    priority: 100,
    condition: (e) => !e.fixAttempts || e.fixAttempts.length === 0,
    guidance: 'Implement your fix. Keep changes minimal and focused.',
    guidanceType: 'checklist',
    questions: [
      'What\'s the smallest change that would fix this?',
      'Are you fixing the root cause or just the symptom?',
      'Will this fix break anything else?',
    ],
  },
  {
    id: 'fix-failed-attempt',
    stage: 'FIX',
    priority: 90,
    condition: (e) => e.fixAttempts !== undefined && e.fixAttempts.length > 0 && !e.fixAttempts.some(f => f.testsPassed),
    guidance: 'Your fix didn\'t work. Analyze why and try a different approach.',
    guidanceType: 'socratic_question',
    questions: [
      'What does the test failure tell you about your fix?',
      'Did your fix address the actual root cause?',
      'Should you reconsider your hypothesis?',
    ],
  },
  {
    id: 'fix-tests-pass',
    stage: 'FIX',
    priority: 10,
    condition: (e) => e.fixAttempts !== undefined && e.fixAttempts.some(f => f.testsPassed),
    guidance: 'Tests are passing! Time to verify the fix more thoroughly.',
    guidanceType: 'next_step',
    questions: [
      'Are you confident this is the right fix?',
      'Did you check edge cases?',
    ],
  },
];

// ============ VERIFY Stage Rules ============

const verifyRules: readonly DeterministicRule[] = [
  {
    id: 'verify-no-evidence',
    stage: 'VERIFY',
    priority: 100,
    condition: (e) => !e.verification,
    guidance: 'Verify your fix thoroughly before considering it done.',
    guidanceType: 'checklist',
    questions: [
      'Do all existing tests pass?',
      'Have you tested edge cases?',
      'Have you run regression tests?',
    ],
  },
  {
    id: 'verify-visible-fail',
    stage: 'VERIFY',
    priority: 90,
    condition: (e) => e.verification !== undefined && !e.verification.visibleTestsPassed,
    guidance: 'Some tests are still failing. Go back and revise your fix.',
    guidanceType: 'next_step',
    questions: [
      'Which tests are failing?',
      'Is it the same failure or a new one?',
    ],
  },
  {
    id: 'verify-no-edge-cases',
    stage: 'VERIFY',
    priority: 80,
    condition: (e) => e.verification !== undefined && e.verification.edgeCasesChecked.length === 0,
    guidance: 'Have you verified edge cases? Think about boundary conditions.',
    guidanceType: 'checklist',
    questions: [
      'What happens with empty input?',
      'What about very large inputs?',
      'What about special characters or null values?',
    ],
  },
  {
    id: 'verify-complete',
    stage: 'VERIFY',
    priority: 10,
    condition: (e) => Boolean(e.verification?.visibleTestsPassed && e.verification?.regressionTestsPassed),
    guidance: 'Verification complete! Time for a postmortem to lock in your learning.',
    guidanceType: 'next_step',
    questions: [
      'Ready to document what you learned?',
    ],
  },
];

// ============ POSTMORTEM Stage Rules ============

const postmortemRules: readonly DeterministicRule[] = [
  {
    id: 'postmortem-start',
    stage: 'POSTMORTEM',
    priority: 100,
    condition: () => true,
    guidance: 'Reflect on your debugging journey and document what you learned.',
    guidanceType: 'checklist',
    questions: [
      'What was the root cause of the bug?',
      'How could this bug have been prevented?',
      'What would you do differently next time?',
      'What patterns or anti-patterns did you encounter?',
    ],
  },
];

// ============ All Rules ============

export const ALL_DETERMINISTIC_RULES: readonly DeterministicRule[] = [
  ...triageRules,
  ...reproduceRules,
  ...localizeRules,
  ...hypothesizeRules,
  ...fixRules,
  ...verifyRules,
  ...postmortemRules,
];

// ============ Rule Engine ============

export interface DeterministicGuidance {
  readonly guidance: string;
  readonly guidanceType: GuidanceType;
  readonly questions: readonly string[];
  readonly ruleId: string;
}

/**
 * Get deterministic guidance for a stage
 */
export function getDeterministicGuidance(
  stage: DiagnosticStage,
  evidence: DiagnosticEvidence
): DeterministicGuidance {
  // Filter rules for this stage
  const stageRules = ALL_DETERMINISTIC_RULES.filter(r => r.stage === stage);

  // Sort by priority (higher first)
  const sorted = [...stageRules].sort((a, b) => b.priority - a.priority);

  // Find first matching rule
  for (const rule of sorted) {
    if (rule.condition(evidence)) {
      return {
        guidance: rule.guidance,
        guidanceType: rule.guidanceType,
        questions: rule.questions,
        ruleId: rule.id,
      };
    }
  }

  // Fallback if no rules match (shouldn't happen)
  return {
    guidance: `Continue working on the ${stage} stage.`,
    guidanceType: 'next_step',
    questions: ['What progress have you made?'],
    ruleId: 'fallback',
  };
}
