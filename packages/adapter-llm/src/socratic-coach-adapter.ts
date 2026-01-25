/**
 * Socratic Coach LLM Adapter
 *
 * Implements the SocraticCoachPort using Anthropic's Claude API with
 * two-pass prompting: Analyzer -> Verifier pattern.
 *
 * CRITICAL DESIGN PRINCIPLES:
 * 1. All outputs MUST include evidenceRefs - if missing, reject and return needs_more_info
 * 2. Questions must NOT reveal the answer or contain code
 * 3. Two-pass prompting ensures evidence citations are validated
 */

import Anthropic from '@anthropic-ai/sdk';
import type {
  SocraticCoachPort,
  SocraticContext,
  SocraticValidationContext,
  GenerateSocraticQuestionResult,
  ValidateSocraticResponseResult,
  SocraticQuestion,
  MistakeAnalysis,
  SocraticNextActionResult,
  SocraticValidationResult,
  EvidenceRef,
} from '@scaffold/core/ports';
import { validateSocraticCoachResponse } from '@scaffold/core/ports';
import type { TestResultData } from '@scaffold/core/entities';

// ============ Configuration ============

export interface SocraticCoachAdapterConfig {
  apiKey: string;
  model?: string;
  maxTokens?: number;
  temperature?: number;
  /**
   * Optional callback for error tracking/logging.
   * Called when LLM returns invalid schema or API errors occur.
   * Enables storing error metadata to ai_feedback for observability.
   */
  onError?: (error: SocraticCoachError) => void;
}

export interface SocraticCoachError {
  type: 'api_error' | 'parse_error' | 'validation_error';
  message: string;
  context?: Record<string, unknown>;
  timestamp: Date;
}

const DEFAULT_MODEL = 'claude-sonnet-4-20250514';
const DEFAULT_MAX_TOKENS = 1500;
const DEFAULT_TEMPERATURE = 0.3;

// ============ Adapter Implementation ============

export function createSocraticCoachAdapter(config: SocraticCoachAdapterConfig): SocraticCoachPort {
  const anthropic = new Anthropic({ apiKey: config.apiKey });
  const model = config.model ?? DEFAULT_MODEL;
  const maxTokens = config.maxTokens ?? DEFAULT_MAX_TOKENS;
  const temperature = config.temperature ?? DEFAULT_TEMPERATURE;
  const onError = config.onError;

  /**
   * Report error via callback for observability/storage
   */
  function reportError(type: SocraticCoachError['type'], message: string, context?: Record<string, unknown>): void {
    if (onError) {
      onError({ type, message, context, timestamp: new Date() });
    }
  }

  /**
   * Build a safe needs_more_info result when we cannot produce a valid response.
   * This ensures fail-closed behavior: no AI claims without evidence.
   */
  function buildSafeNeedsMoreInfoResult(
    context: SocraticContext,
    reason: string
  ): GenerateSocraticQuestionResult {
    const minimalEvidenceRef: EvidenceRef = {
      source: 'attempt_history',
      sourceId: `attempt-${context.attemptId}`,
      description: `Unable to generate AI response: ${reason}`,
    };

    return {
      question: {
        id: `q-fallback-${Date.now()}`,
        question: 'I need more information to help you effectively. Can you tell me more about what you\'re trying to accomplish?',
        targetConcept: 'understanding',
        difficulty: 'probe',
        evidenceRefs: [minimalEvidenceRef],
      },
      mistakeAnalysis: {
        testsFailed: [],
        conceptMissed: 'unknown - insufficient evidence',
        evidenceRefs: [minimalEvidenceRef],
        suggestedFocus: 'Gather more context',
        confidence: 0,
        pattern: context.pattern,
        attemptCount: context.codeSubmissions,
      },
      nextAction: {
        action: 'needs_more_info',
        reason,
        evidenceRefs: [minimalEvidenceRef],
      },
      source: 'ai',
    };
  }

  return {
    isEnabled(): boolean {
      return Boolean(config.apiKey);
    },

    async generateSocraticQuestion(
      context: SocraticContext
    ): Promise<GenerateSocraticQuestionResult | null> {
      try {
        // ============ Pass 1: Analyzer ============
        const analyzerPrompt = buildAnalyzerPrompt(context);
        const analyzerResponse = await anthropic.messages.create({
          model,
          max_tokens: maxTokens,
          temperature,
          messages: [
            { role: 'user', content: analyzerPrompt },
          ],
        });

        const analyzerText = extractText(analyzerResponse);
        const analyzerResult = parseAnalyzerResponse(analyzerText, context);

        if (!analyzerResult) {
          reportError('parse_error', 'Failed to parse analyzer response', {
            responseText: analyzerText.slice(0, 500),
            attemptId: context.attemptId,
          });
          // FAIL CLOSED: Return needs_more_info instead of null
          return buildSafeNeedsMoreInfoResult(context, 'AI response could not be parsed');
        }

        // Check if analyzer returned needs_more_info
        if (analyzerResult.nextAction.action === 'needs_more_info') {
          return analyzerResult;
        }

        // ============ Pass 2: Verifier ============
        const verifierPrompt = buildVerifierPrompt(context, analyzerResult);
        const verifierResponse = await anthropic.messages.create({
          model,
          max_tokens: 800,
          temperature: 0.1, // Lower temperature for verification
          messages: [
            { role: 'user', content: verifierPrompt },
          ],
        });

        const verifierText = extractText(verifierResponse);
        const verifiedResult = parseVerifierResponse(verifierText, analyzerResult);

        // Validate the final result - CRITICAL EVIDENCE GATING
        const validation = validateSocraticCoachResponse(verifiedResult);
        if (!validation.valid) {
          reportError('validation_error', validation.reason ?? 'Validation failed', {
            attemptId: context.attemptId,
            validationReason: validation.reason,
          });
          // FAIL CLOSED: Return needs_more_info when validation fails
          return buildSafeNeedsMoreInfoResult(
            context,
            `AI response failed validation: ${validation.reason ?? 'missing evidence'}`
          );
        }

        return verifiedResult;
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        reportError('api_error', errorMessage, {
          attemptId: context.attemptId,
        });
        // Return null to let use-case fall back to deterministic
        // This is the safest option for API failures
        return null;
      }
    },

    async validateSocraticResponse(
      context: SocraticValidationContext
    ): Promise<ValidateSocraticResponseResult | null> {
      /**
       * Build a safe needs_more_info validation result when we cannot produce a valid response.
       * This ensures fail-closed behavior: no AI claims without evidence.
       */
      function buildSafeValidationResult(reason: string): ValidateSocraticResponseResult {
        const minimalEvidenceRef: EvidenceRef = {
          source: 'attempt_history',
          sourceId: `question-${context.question.id}`,
          description: `Unable to validate response: ${reason}`,
        };

        return {
          validation: {
            isCorrect: false,
            feedback: 'I need more context to provide helpful feedback. Let\'s continue exploring your understanding.',
            nextAction: 'needs_more_info',
            evidenceRefs: [minimalEvidenceRef],
            confidence: 0,
          },
          nextAction: {
            action: 'needs_more_info',
            reason,
            evidenceRefs: [minimalEvidenceRef],
          },
          source: 'ai',
        };
      }

      try {
        // ============ Pass 1: Validation Analysis ============
        const validationPrompt = buildValidationPrompt(context);
        const validationResponse = await anthropic.messages.create({
          model,
          max_tokens: maxTokens,
          temperature,
          messages: [
            { role: 'user', content: validationPrompt },
          ],
        });

        const validationText = extractText(validationResponse);
        const result = parseValidationResponse(validationText, context);

        if (!result) {
          reportError('parse_error', 'Failed to parse validation response', {
            responseText: validationText.slice(0, 500),
            questionId: context.question.id,
          });
          // FAIL CLOSED: Return needs_more_info instead of null
          return buildSafeValidationResult('AI response could not be parsed');
        }

        // ============ Pass 2: Verify No Answers Revealed ============
        const verifyNoAnswersPrompt = buildVerifyNoAnswersPrompt(result);
        const verifyResponse = await anthropic.messages.create({
          model,
          max_tokens: 300,
          temperature: 0.1,
          messages: [
            { role: 'user', content: verifyNoAnswersPrompt },
          ],
        });

        const verifyText = extractText(verifyResponse);
        if (verifyText.toLowerCase().includes('contains_answer')) {
          // Feedback reveals answer, reject and return safe version
          reportError('validation_error', 'AI feedback contained answer - sanitized', {
            questionId: context.question.id,
          });
          return {
            ...result,
            validation: {
              ...result.validation,
              feedback: 'Let\'s continue working through this together. Can you tell me more about your approach?',
            },
          };
        }

        return result;
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        reportError('api_error', errorMessage, {
          questionId: context.question.id,
        });
        // Return null to let use-case fall back to deterministic
        // This is the safest option for API failures
        return null;
      }
    },

    validateResponse(
      response: GenerateSocraticQuestionResult | ValidateSocraticResponseResult
    ): { valid: boolean; reason?: string } {
      return validateSocraticCoachResponse(response);
    },
  };
}

// ============ Analyzer Prompt ============

function buildAnalyzerPrompt(context: SocraticContext): string {
  const {
    problemStatement,
    pattern,
    rung,
    latestCode,
    language,
    testResults,
    thinkingGateData,
    previousTurns,
    hintsUsed,
    codeSubmissions,
  } = context;

  // Build test results evidence
  const failedTests = testResults.filter((t: TestResultData) => !t.passed);
  const testEvidence = failedTests
    .map((t: TestResultData, i: number) => `  Test ${i + 1}: Input="${t.input}" Expected="${t.expected}" Actual="${t.actual}"${t.error ? ` Error="${t.error}"` : ''}`)
    .join('\n');

  // Build previous turns context
  const turnsContext = previousTurns.length > 0
    ? previousTurns.map((t) => `${t.role.toUpperCase()}: ${t.content}`).join('\n')
    : 'No previous dialogue.';

  return `You are analyzing a student's coding attempt to generate a Socratic question. Based ONLY on the evidence provided, identify what concept the student is struggling with.

## STRICT RULES
1. You MUST cite specific evidenceRefs for every claim
2. You MUST NOT reveal the answer or give direct fixes
3. You MUST NOT include code blocks or specific line numbers to change
4. Questions should guide thinking, not give solutions
5. If evidence is insufficient, respond with nextAction: "needs_more_info"

## EVIDENCE

### Problem Statement
${problemStatement}

### Expected Pattern: ${pattern} (Rung ${rung})

### Test Results (Ground Truth)
${testEvidence || 'All tests passed'}

### Student's Code (${language})
\`\`\`${language}
${latestCode}
\`\`\`

### Thinking Gate
- Pattern Selected: ${thinkingGateData?.selectedPattern ?? 'N/A'}
- Invariant Stated: ${thinkingGateData?.statedInvariant ?? 'N/A'}
- Passed: ${thinkingGateData?.passed ?? 'N/A'}

### Attempt History
- Code Submissions: ${codeSubmissions}
- Hints Used: ${hintsUsed.length > 0 ? hintsUsed.join(', ') : 'None'}

### Previous Socratic Dialogue
${turnsContext}

## YOUR TASK
Analyze the evidence and generate:
1. A MistakeAnalysis identifying the concept the student is struggling with
2. A SocraticQuestion that guides them without giving the answer
3. A NextAction recommendation

Respond with ONLY valid JSON in this format:
{
  "mistakeAnalysis": {
    "testsFailed": ["test-0", "test-1"],
    "conceptMissed": "window shrinking condition",
    "evidenceRefs": [
      {"source": "test_result", "sourceId": "test-0", "description": "Test shows incorrect output when..."}
    ],
    "suggestedFocus": "Focus on when to shrink the window",
    "confidence": 0.85,
    "pattern": "${pattern}",
    "attemptCount": ${codeSubmissions}
  },
  "question": {
    "id": "q-${Date.now()}",
    "question": "Your Socratic question here (NO code, NO direct answers)",
    "targetConcept": "window shrinking",
    "difficulty": "probe",
    "evidenceRefs": [
      {"source": "test_result", "sourceId": "test-0", "description": "This test fails when..."}
    ],
    "successCriteria": ["criterion 1", "criterion 2"],
    "followUpQuestions": ["follow-up if needed"]
  },
  "nextAction": {
    "action": "ask_socratic_question",
    "reason": "Student shows partial understanding but needs guidance on X",
    "evidenceRefs": [
      {"source": "attempt_history", "sourceId": "attempt", "description": "${codeSubmissions} submissions"}
    ]
  }
}`;
}

// ============ Verifier Prompt ============

function buildVerifierPrompt(
  context: SocraticContext,
  analyzerResult: GenerateSocraticQuestionResult
): string {
  const { testResults } = context;
  const { question, mistakeAnalysis } = analyzerResult;

  return `You are verifying a Socratic question to ensure it:
1. Does NOT reveal the answer or solution
2. Does NOT contain code blocks or specific fixes
3. Has valid evidenceRefs that match the test results
4. Guides thinking without giving away the answer

## ANALYZER OUTPUT
Question: "${question.question}"
Target Concept: ${question.targetConcept}
Evidence Refs: ${JSON.stringify(question.evidenceRefs)}

Mistake Analysis: ${mistakeAnalysis.conceptMissed}
Mistake Evidence: ${JSON.stringify(mistakeAnalysis.evidenceRefs)}

## ACTUAL TEST RESULTS
${testResults.map((t: TestResultData, i: number) => `test-${i}: passed=${t.passed} input="${t.input}" expected="${t.expected}" actual="${t.actual}"`).join('\n')}

## VERIFICATION CHECKLIST
1. Does the question reveal the answer? (must be NO)
2. Does the question contain code? (must be NO)
3. Do the evidenceRefs reference actual test results? (must be YES)
4. Is the question appropriately Socratic? (must be YES)

Respond with JSON:
{
  "isValid": true/false,
  "issues": ["list of issues if any"],
  "revisedQuestion": "revised question if issues found (optional)",
  "revisedEvidenceRefs": [...] (optional, only if refs need correction)
}`;
}

// ============ Validation Prompt ============

function buildValidationPrompt(context: SocraticValidationContext): string {
  const { question, userResponse, attemptContext, successCriteria } = context;
  const { testResults, pattern, codeSubmissions, hintsUsed } = attemptContext;

  const failedTests = testResults.filter((t: TestResultData) => !t.passed);

  return `You are validating a student's response to a Socratic question.

## THE QUESTION ASKED
"${question.question}"
Target Concept: ${question.targetConcept}

## STUDENT'S RESPONSE
"${userResponse}"

## SUCCESS CRITERIA
${successCriteria?.map((c: string, i: number) => `${i + 1}. ${c}`).join('\n') || 'No specific criteria defined.'}

## EVIDENCE CONTEXT
- Pattern: ${pattern}
- Code Submissions: ${codeSubmissions}
- Hints Used: ${hintsUsed.join(', ') || 'None'}
- Failed Tests: ${failedTests.length}

## YOUR TASK
Evaluate whether the student's response demonstrates understanding of the concept.

IMPORTANT:
- Your feedback MUST NOT reveal the answer or solution
- Your feedback MUST NOT contain code
- If the student is wrong, guide them gently without telling them the fix
- Include evidenceRefs citing what led to your assessment

Respond with JSON:
{
  "validation": {
    "isCorrect": true/false,
    "feedback": "Feedback that does NOT reveal the answer",
    "nextAction": "continue" | "retry" | "escalate" | "complete" | "needs_more_info",
    "evidenceRefs": [{"source": "...", "sourceId": "...", "description": "..."}],
    "confidence": 0.0-1.0
  },
  "followUpQuestion": {
    "id": "q-followup",
    "question": "Follow-up question if nextAction is continue",
    "targetConcept": "${question.targetConcept}",
    "difficulty": "hint" | "probe",
    "evidenceRefs": [...]
  },
  "nextAction": {
    "action": "ask_socratic_question" | "provide_hint" | "allow_retry" | "mark_complete",
    "reason": "...",
    "evidenceRefs": [...]
  }
}`;
}

// ============ Verify No Answers Prompt ============

function buildVerifyNoAnswersPrompt(result: ValidateSocraticResponseResult): string {
  return `Check if this feedback reveals the solution to a coding problem:

Feedback: "${result.validation.feedback}"

${result.followUpQuestion ? `Follow-up Question: "${result.followUpQuestion.question}"` : ''}

If the feedback or question:
- Contains specific code fixes
- Tells the student exactly what to change
- Reveals the algorithm or solution

Respond with "CONTAINS_ANSWER"

Otherwise respond with "SAFE"`;
}

// ============ Response Parsers ============

function extractText(response: Anthropic.Message): string {
  const content = response.content[0];
  return content?.type === 'text' ? content.text : '';
}

function parseAnalyzerResponse(
  text: string,
  context: SocraticContext
): GenerateSocraticQuestionResult | null {
  try {
    // Extract JSON from response (handle potential markdown code blocks)
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return null;
    }

    const parsed = JSON.parse(jsonMatch[0]) as {
      mistakeAnalysis?: Partial<MistakeAnalysis>;
      question?: Partial<SocraticQuestion>;
      nextAction?: Partial<SocraticNextActionResult>;
    };

    // Build evidence refs from failed tests if not provided
    const failedTests = context.testResults.filter((t: TestResultData) => !t.passed);
    const defaultEvidenceRefs: EvidenceRef[] = failedTests.map((t: TestResultData, i: number) => ({
      source: 'test_result' as const,
      sourceId: `test-${i}`,
      description: `Test failed: expected "${t.expected}" but got "${t.actual}"`,
    }));

    // Ensure all required fields have evidence
    const mistakeAnalysis: MistakeAnalysis = {
      testsFailed: parsed.mistakeAnalysis?.testsFailed ?? failedTests.map((_: TestResultData, i: number) => `test-${i}`),
      conceptMissed: parsed.mistakeAnalysis?.conceptMissed ?? 'unknown concept',
      evidenceRefs: (parsed.mistakeAnalysis?.evidenceRefs?.length ?? 0) > 0
        ? parsed.mistakeAnalysis!.evidenceRefs as readonly EvidenceRef[]
        : defaultEvidenceRefs,
      suggestedFocus: parsed.mistakeAnalysis?.suggestedFocus ?? 'Review your approach',
      confidence: parsed.mistakeAnalysis?.confidence ?? 0.5,
      pattern: context.pattern,
      attemptCount: context.codeSubmissions,
    };

    const question: SocraticQuestion = {
      id: parsed.question?.id ?? `q-${Date.now()}`,
      question: parsed.question?.question ?? 'What do you think might be going wrong?',
      targetConcept: parsed.question?.targetConcept ?? mistakeAnalysis.conceptMissed,
      difficulty: parsed.question?.difficulty ?? 'probe',
      evidenceRefs: (parsed.question?.evidenceRefs?.length ?? 0) > 0
        ? parsed.question!.evidenceRefs as readonly EvidenceRef[]
        : defaultEvidenceRefs,
      successCriteria: parsed.question?.successCriteria,
      followUpQuestions: parsed.question?.followUpQuestions,
    };

    const nextAction: SocraticNextActionResult = {
      action: parsed.nextAction?.action ?? 'ask_socratic_question',
      reason: parsed.nextAction?.reason ?? 'Guiding student through the problem',
      evidenceRefs: (parsed.nextAction?.evidenceRefs?.length ?? 0) > 0
        ? parsed.nextAction!.evidenceRefs as readonly EvidenceRef[]
        : defaultEvidenceRefs,
      actionData: parsed.nextAction?.actionData,
    };

    return {
      question,
      mistakeAnalysis,
      nextAction,
      source: 'ai',
    };
  } catch (_error: unknown) {
    return null;
  }
}

function parseVerifierResponse(
  text: string,
  originalResult: GenerateSocraticQuestionResult
): GenerateSocraticQuestionResult {
  try {
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return originalResult;
    }

    const parsed = JSON.parse(jsonMatch[0]) as {
      isValid?: boolean;
      revisedQuestion?: string;
      revisedEvidenceRefs?: EvidenceRef[];
    };

    if (parsed.isValid) {
      return originalResult;
    }

    // Apply revisions if provided
    if (parsed.revisedQuestion) {
      return {
        ...originalResult,
        question: {
          ...originalResult.question,
          question: parsed.revisedQuestion,
          evidenceRefs: parsed.revisedEvidenceRefs ?? originalResult.question.evidenceRefs,
        },
      };
    }

    return originalResult;
  } catch (_error: unknown) {
    return originalResult;
  }
}

function parseValidationResponse(
  text: string,
  context: SocraticValidationContext
): ValidateSocraticResponseResult | null {
  try {
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return null;
    }

    const parsed = JSON.parse(jsonMatch[0]) as {
      validation?: Partial<SocraticValidationResult>;
      followUpQuestion?: Partial<SocraticQuestion>;
      nextAction?: Partial<SocraticNextActionResult>;
    };

    // Build default evidence refs
    const failedTests = context.attemptContext.testResults.filter((t: TestResultData) => !t.passed);
    const defaultEvidenceRefs: EvidenceRef[] = failedTests.map((t: TestResultData, i: number) => ({
      source: 'test_result' as const,
      sourceId: `test-${i}`,
      description: `Test result: ${t.passed ? 'passed' : 'failed'}`,
    }));

    const validation: SocraticValidationResult = {
      isCorrect: parsed.validation?.isCorrect ?? false,
      feedback: parsed.validation?.feedback ?? 'Let\'s continue exploring this concept.',
      nextAction: parsed.validation?.nextAction ?? 'continue',
      evidenceRefs: (parsed.validation?.evidenceRefs?.length ?? 0) > 0
        ? parsed.validation!.evidenceRefs as readonly EvidenceRef[]
        : defaultEvidenceRefs,
      confidence: parsed.validation?.confidence ?? 0.5,
      escalateToHintLevel: parsed.validation?.escalateToHintLevel,
    };

    let followUpQuestion: SocraticQuestion | undefined;
    if (parsed.followUpQuestion && validation.nextAction === 'continue') {
      followUpQuestion = {
        id: parsed.followUpQuestion.id ?? `q-followup-${Date.now()}`,
        question: parsed.followUpQuestion.question ?? '',
        targetConcept: parsed.followUpQuestion.targetConcept ?? context.question.targetConcept,
        difficulty: parsed.followUpQuestion.difficulty ?? 'hint',
        evidenceRefs: (parsed.followUpQuestion.evidenceRefs?.length ?? 0) > 0
          ? parsed.followUpQuestion.evidenceRefs as readonly EvidenceRef[]
          : defaultEvidenceRefs,
      };
    }

    const nextAction: SocraticNextActionResult = {
      action: parsed.nextAction?.action ?? 'ask_socratic_question',
      reason: parsed.nextAction?.reason ?? validation.feedback,
      evidenceRefs: (parsed.nextAction?.evidenceRefs?.length ?? 0) > 0
        ? parsed.nextAction!.evidenceRefs as readonly EvidenceRef[]
        : defaultEvidenceRefs,
    };

    return {
      validation,
      followUpQuestion,
      nextAction,
      source: 'ai',
    };
  } catch (_error: unknown) {
    return null;
  }
}

// ============ Null Implementation ============

export function createNullSocraticCoachAdapter(): SocraticCoachPort {
  return {
    isEnabled: () => false,
    generateSocraticQuestion: async () => null,
    validateSocraticResponse: async () => null,
    validateResponse: () => ({ valid: true }),
  };
}
