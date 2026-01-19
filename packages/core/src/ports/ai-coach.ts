/**
 * AI Coach Port
 *
 * Port interface for AI coaching services.
 * Implementations can be Anthropic, OpenAI, or null (deterministic only).
 */

import type {
  DiagnosticStage,
  DiagnosticEvidence,
  AICoachRequest,
  AICoachResponse,
  ProblemContext,
  GuidanceType,
} from '../entities/diagnostic-coach.js';

// ============ Port Interface ============

export interface AICoachPort {
  /**
   * Check if AI coaching is available (env var set, API reachable)
   */
  isEnabled(): boolean;

  /**
   * Get coaching guidance for the current stage
   *
   * @returns AI guidance or null if AI unavailable/errored
   */
  getGuidance(request: AICoachRequest): Promise<AICoachResponse | null>;

  /**
   * Validate that AI response doesn't contain forbidden content
   */
  validateResponse(response: AICoachResponse): { valid: boolean; reason?: string };
}

// ============ Null Implementation (No AI) ============

/**
 * Creates a null AI coach that always returns null.
 * Forces the system to use deterministic rules only.
 */
export function createNullAICoach(): AICoachPort {
  return {
    isEnabled: () => false,

    getGuidance: async () => null,

    validateResponse: () => ({ valid: true }),
  };
}

// ============ Response Validation ============

/**
 * Validates AI response to ensure it doesn't spoil the answer.
 * This is defense-in-depth for when the AI misbehaves.
 */
export function validateAIResponse(
  response: AICoachResponse
): { valid: boolean; reason?: string } {
  const { guidance } = response;

  // Check for code blocks (markdown or indented)
  if (/```[\s\S]*```/.test(guidance)) {
    return { valid: false, reason: 'Response contains code block' };
  }

  // Check for inline code with programming keywords
  const codeKeywords = /\b(function|const|let|var|return|if|else|for|while|class|import|export|async|await)\b/;
  const inlineCodeMatches = guidance.match(/`[^`]+`/g) || [];
  for (const match of inlineCodeMatches) {
    if (codeKeywords.test(match)) {
      return { valid: false, reason: 'Response contains code in inline backticks' };
    }
  }

  // Check for line number references (like "line 42" or "on line 15")
  if (/\b(line|Line)\s+\d+\b/.test(guidance)) {
    return { valid: false, reason: 'Response references specific line numbers' };
  }

  // Check for direct fix instructions
  const fixPhrases = [
    /\bchange\s+.+\s+to\s+.+\b/i,
    /\breplace\s+.+\s+with\s+.+\b/i,
    /\bset\s+.+\s+(to|=)\s+.+\b/i,
    /\bthe\s+fix\s+is\b/i,
    /\bjust\s+(add|remove|change)\b/i,
  ];

  for (const pattern of fixPhrases) {
    if (pattern.test(guidance)) {
      return { valid: false, reason: 'Response contains direct fix instruction' };
    }
  }

  return { valid: true };
}

// ============ System Prompts ============

/**
 * System prompt for AI coach by stage
 */
export function getSystemPrompt(stage: DiagnosticStage): string {
  const basePrompt = `You are a debugging coach helping a developer fix a bug. Your role is to guide their thinking, NOT to give them the answer.

STRICT RULES:
1. NEVER include code blocks (no markdown code fences)
2. NEVER reference specific line numbers
3. NEVER give direct fixes like "change X to Y" or "replace A with B"
4. NEVER reveal the exact bug or solution
5. Use Socratic questioning to guide the developer
6. Help them form their own hypotheses
7. Validate their thinking without confirming/denying correctness

You may:
- Ask clarifying questions
- Suggest debugging techniques
- Point out areas to investigate
- Challenge assumptions with questions
- Provide checklists for verification`;

  const stagePrompts: Record<DiagnosticStage, string> = {
    TRIAGE: `${basePrompt}

CURRENT STAGE: TRIAGE
Help the developer classify the bug:
- Category (functional, concurrency, resource, etc.)
- Severity (how bad is it?)
- Priority (how urgent?)

Ask questions about symptoms, not solutions.`,

    REPRODUCE: `${basePrompt}

CURRENT STAGE: REPRODUCE
Help the developer establish reliable reproduction:
- What inputs trigger the bug?
- Is it deterministic or intermittent?
- What's the minimal reproduction case?

Focus on observation, not explanation.`,

    LOCALIZE: `${basePrompt}

CURRENT STAGE: LOCALIZE
Help the developer narrow down the bug location:
- Which module/file is involved?
- What's the execution path?
- Where does behavior diverge from expectation?

Guide them to use logging, binary search, or stack traces.`,

    HYPOTHESIZE: `${basePrompt}

CURRENT STAGE: HYPOTHESIZE
Help the developer form testable hypotheses:
- What could cause this behavior?
- What assumptions might be wrong?
- How would they test each hypothesis?

Don't confirm or deny hypotheses - guide them to test.`,

    FIX: `${basePrompt}

CURRENT STAGE: FIX
The developer is implementing a fix. Help them think through:
- Is this addressing the root cause?
- What side effects might this have?
- How can they validate the fix?

Do NOT suggest what to fix - they must decide.`,

    VERIFY: `${basePrompt}

CURRENT STAGE: VERIFY
Help the developer verify their fix thoroughly:
- Are all tests passing?
- What edge cases should be checked?
- Could this fix introduce regressions?

Provide a verification checklist.`,

    POSTMORTEM: `${basePrompt}

CURRENT STAGE: POSTMORTEM
Help the developer reflect on the debugging process:
- What was the root cause?
- How could this have been prevented?
- What did they learn?

Help them generate a knowledge card for future reference.`,
  };

  return stagePrompts[stage];
}

// ============ User Prompt Builder ============

export function buildUserPrompt(request: AICoachRequest): string {
  const { stage, problemContext, evidence, userMessage } = request;

  let prompt = `## Problem Context
Title: ${problemContext.problemTitle}
Statement: ${problemContext.problemStatement}

Visible Test Cases:
${problemContext.visibleTestCases.map((tc, i) => `${i + 1}. ${tc}`).join('\n')}
`;

  if (problemContext.defectCategory) {
    prompt += `\nDefect Category (from triage): ${problemContext.defectCategory}`;
  }

  if (problemContext.signals?.length) {
    prompt += `\nSignals: ${problemContext.signals.join(', ')}`;
  }

  prompt += `\n\n## Current Stage: ${stage}\n`;

  // Add relevant evidence
  if (evidence.triage) {
    prompt += `\n### Triage Evidence
- Category: ${evidence.triage.defectCategory}
- Severity: ${evidence.triage.severity}
- Priority: ${evidence.triage.priority}
- Observations: ${evidence.triage.observations}`;
  }

  if (evidence.reproduction) {
    prompt += `\n### Reproduction Evidence
- Steps: ${evidence.reproduction.steps.join(' → ')}
- Deterministic: ${evidence.reproduction.isDeterministic}`;
    if (evidence.reproduction.reproCommand) {
      prompt += `\n- Command: ${evidence.reproduction.reproCommand}`;
    }
  }

  if (evidence.localization) {
    prompt += `\n### Localization Evidence
- Suspected Files: ${evidence.localization.suspectedFiles.join(', ') || 'none yet'}
- Suspected Functions: ${evidence.localization.suspectedFunctions.join(', ') || 'none yet'}`;
    if (evidence.localization.stackTrace) {
      prompt += `\n- Has stack trace: yes`;
    }
  }

  if (evidence.hypotheses?.length) {
    prompt += `\n### Hypotheses`;
    for (const h of evidence.hypotheses) {
      prompt += `\n- [${h.status}] ${h.hypothesis}`;
    }
  }

  if (evidence.fixAttempts?.length) {
    prompt += `\n### Fix Attempts`;
    for (const f of evidence.fixAttempts) {
      prompt += `\n- ${f.approach}: ${f.testsPassed ? 'PASSED' : 'FAILED'}`;
    }
  }

  if (userMessage) {
    prompt += `\n\n## Developer's Question/Message
${userMessage}`;
  }

  prompt += `\n\n## Your Task
Provide Socratic guidance for the ${stage} stage. Ask questions, don't give answers.`;

  return prompt;
}
