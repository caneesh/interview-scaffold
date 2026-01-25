/**
 * Socratic Coach Port
 *
 * Port interface for evidence-gated AI coaching services.
 * Implementations can be Anthropic, OpenAI, or null (deterministic only).
 *
 * CRITICAL: All outputs MUST include evidenceRefs citing evaluation data.
 * If evidence is insufficient, return nextAction: 'needs_more_info'.
 */

import type { PatternId } from '../entities/pattern.js';
import type { RungLevel } from '../entities/rung.js';
import type { TestResultData, HintLevel } from '../entities/step.js';

// ============ Evidence Reference Types ============

export type EvidenceSource =
  | 'test_result'
  | 'gate_outcome'
  | 'attempt_history'
  | 'hint_ladder'
  | 'pattern_discovery'
  | 'submission';

export interface EvidenceRef {
  readonly source: EvidenceSource;
  readonly sourceId: string;
  readonly description: string;
  readonly detail?: string;
}

// ============ Mistake Analysis ============

export interface MistakeAnalysis {
  readonly testsFailed: readonly string[];
  readonly conceptMissed: string;
  readonly evidenceRefs: readonly EvidenceRef[];
  readonly suggestedFocus: string;
  readonly confidence: number;
  readonly pattern: PatternId;
  readonly attemptCount: number;
}

// ============ Socratic Question ============

export type SocraticDifficulty = 'hint' | 'probe' | 'challenge';

export interface SocraticQuestion {
  readonly id: string;
  readonly question: string;
  readonly targetConcept: string;
  readonly difficulty: SocraticDifficulty;
  readonly evidenceRefs: readonly EvidenceRef[];
  readonly successCriteria?: readonly string[];
  readonly followUpQuestions?: readonly string[];
}

// ============ Validation Result ============

export type SocraticNextAction =
  | 'continue'
  | 'retry'
  | 'escalate'
  | 'complete'
  | 'needs_more_info';

export interface SocraticValidationResult {
  readonly isCorrect: boolean;
  readonly feedback: string;
  readonly nextAction: SocraticNextAction;
  readonly evidenceRefs: readonly EvidenceRef[];
  readonly confidence: number;
  readonly escalateToHintLevel?: HintLevel;
}

// ============ Next Action ============

export type NextActionType =
  | 'ask_socratic_question'
  | 'provide_hint'
  | 'suggest_trace'
  | 'suggest_test_case'
  | 'prompt_pattern_review'
  | 'prompt_invariant_review'
  | 'allow_retry'
  | 'mark_complete'
  | 'needs_more_info';

export interface SocraticNextActionResult {
  readonly action: NextActionType;
  readonly reason: string;
  readonly evidenceRefs: readonly EvidenceRef[];
  readonly actionData?: Record<string, unknown>;
}

// ============ Socratic Turn ============

export interface SocraticTurn {
  readonly id: string;
  readonly role: 'assistant' | 'user';
  readonly content: string;
  readonly metadata: {
    readonly questionId?: string;
    readonly validationResult?: SocraticValidationResult;
    readonly timestamp: Date;
  };
}

// ============ Context Types ============

export interface SocraticContext {
  readonly attemptId: string;
  readonly problemId: string;
  readonly problemStatement: string;
  readonly pattern: PatternId;
  readonly rung: RungLevel;
  readonly latestCode: string;
  readonly language: string;
  readonly testResults: readonly TestResultData[];
  readonly thinkingGateData?: {
    readonly selectedPattern: string | null;
    readonly statedInvariant: string | null;
    readonly passed: boolean;
  };
  readonly previousTurns: readonly SocraticTurn[];
  readonly hintsUsed: readonly HintLevel[];
  readonly codeSubmissions: number;
}

export interface SocraticValidationContext {
  readonly question: SocraticQuestion;
  readonly userResponse: string;
  readonly attemptContext: SocraticContext;
  readonly successCriteria?: readonly string[];
}

// ============ Port Response Types ============

export interface GenerateSocraticQuestionResult {
  readonly question: SocraticQuestion;
  readonly mistakeAnalysis: MistakeAnalysis;
  readonly nextAction: SocraticNextActionResult;
  readonly source: 'ai' | 'deterministic';
}

export interface ValidateSocraticResponseResult {
  readonly validation: SocraticValidationResult;
  readonly followUpQuestion?: SocraticQuestion;
  readonly nextAction: SocraticNextActionResult;
  readonly source: 'ai' | 'deterministic';
}

// ============ Port Interface ============

export interface SocraticCoachPort {
  /**
   * Check if AI coaching is available (env var set, API reachable)
   */
  isEnabled(): boolean;

  /**
   * Generate a Socratic question based on evidence from test failures,
   * gate misses, and attempt history.
   *
   * MUST return evidenceRefs in all outputs.
   * If evidence insufficient, nextAction will be 'needs_more_info'.
   *
   * @param context - Evidence from evaluation runs and attempt history
   * @returns Generated question with evidence references, or null on error
   */
  generateSocraticQuestion(
    context: SocraticContext
  ): Promise<GenerateSocraticQuestionResult | null>;

  /**
   * Validate a student's response to a Socratic question.
   *
   * MUST return evidenceRefs in validation result.
   * If unable to validate, nextAction will be 'needs_more_info'.
   *
   * @param context - The question, user response, and attempt context
   * @returns Validation result with evidence references, or null on error
   */
  validateSocraticResponse(
    context: SocraticValidationContext
  ): Promise<ValidateSocraticResponseResult | null>;

  /**
   * Validate that AI response contains required evidence references
   * and doesn't contain forbidden content (code blocks, answers, etc.)
   */
  validateResponse(
    response: GenerateSocraticQuestionResult | ValidateSocraticResponseResult
  ): { valid: boolean; reason?: string };
}

// ============ Null Implementation ============

/**
 * Creates a null Socratic coach that always returns null.
 * Forces the system to use deterministic rules only.
 */
export function createNullSocraticCoach(): SocraticCoachPort {
  return {
    isEnabled: () => false,
    generateSocraticQuestion: async () => null,
    validateSocraticResponse: async () => null,
    validateResponse: () => ({ valid: true }),
  };
}

// ============ Response Validation ============

/**
 * Validates Socratic coach response to ensure:
 * 1. Has required evidence references
 * 2. Doesn't contain code blocks or direct answers
 * 3. Questions don't reveal the solution
 */
export function validateSocraticCoachResponse(
  response: GenerateSocraticQuestionResult | ValidateSocraticResponseResult
): { valid: boolean; reason?: string } {
  // Check for evidence refs
  if ('question' in response && response.question) {
    if (!response.question.evidenceRefs || response.question.evidenceRefs.length === 0) {
      return { valid: false, reason: 'Question missing evidence references' };
    }
  }

  if ('mistakeAnalysis' in response && response.mistakeAnalysis) {
    if (!response.mistakeAnalysis.evidenceRefs || response.mistakeAnalysis.evidenceRefs.length === 0) {
      return { valid: false, reason: 'Mistake analysis missing evidence references' };
    }
  }

  if ('validation' in response && response.validation) {
    // Validation can have empty evidence refs for 'needs_more_info' cases
    if (response.validation.nextAction !== 'needs_more_info') {
      if (!response.validation.evidenceRefs || response.validation.evidenceRefs.length === 0) {
        return { valid: false, reason: 'Validation missing evidence references' };
      }
    }
  }

  // Check question text for forbidden content
  if ('question' in response && response.question) {
    const questionText = response.question.question;

    // Check for code blocks
    if (/```[\s\S]*```/.test(questionText)) {
      return { valid: false, reason: 'Question contains code block' };
    }

    // Check for inline code with programming keywords
    const codeKeywords = /\b(function|const|let|var|return|if|else|for|while|class|def|import|export)\b/;
    const inlineCodeMatches = questionText.match(/`[^`]+`/g) || [];
    for (const match of inlineCodeMatches) {
      if (codeKeywords.test(match)) {
        return { valid: false, reason: 'Question contains code in inline backticks' };
      }
    }

    // Check for direct answer phrases
    const answerPhrases = [
      /\bthe\s+(answer|solution)\s+is\b/i,
      /\byou\s+should\s+(use|write|add|remove|change)\b/i,
      /\bjust\s+(add|remove|change|use)\b/i,
      /\bthe\s+bug\s+is\s+(at|on|in)\b/i,
    ];

    for (const pattern of answerPhrases) {
      if (pattern.test(questionText)) {
        return { valid: false, reason: 'Question appears to reveal the answer' };
      }
    }
  }

  // Check validation feedback for forbidden content
  if ('validation' in response && response.validation) {
    const feedback = response.validation.feedback;

    if (/```[\s\S]*```/.test(feedback)) {
      return { valid: false, reason: 'Validation feedback contains code block' };
    }
  }

  return { valid: true };
}
