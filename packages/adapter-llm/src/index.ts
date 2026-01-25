import Anthropic from '@anthropic-ai/sdk';
import type {
  LLMValidationPort,
  LLMValidationRequest,
  LLMValidationResponse,
} from '@scaffold/core/validation';
import type { PatternId } from '@scaffold/core/entities';

/**
 * LLM Client for generating hints, reflections, and other AI content
 * This is optional - the core use-cases work without it
 */

export interface LLMClient {
  generateHint(params: GenerateHintParams): Promise<GenerateHintResult>;
  generateReflection(params: GenerateReflectionParams): Promise<GenerateReflectionResult>;
  evaluateThinkingGate(params: EvaluateThinkingGateParams): Promise<EvaluateThinkingGateResult>;
  evaluateCode(params: EvaluateCodeParams): Promise<EvaluateCodeResult>;
}

export interface GenerateHintParams {
  problemStatement: string;
  pattern: string;
  hintLevel: string;
  previousHints: string[];
  userCode?: string;
  failedTests?: { input: string; expected: string; actual: string }[];
}

export interface GenerateHintResult {
  hint: string;
  nextAction: string;
}

export interface GenerateReflectionParams {
  problemStatement: string;
  pattern: string;
  userCode: string;
  failedTests: { input: string; expected: string; actual: string }[];
}

export interface GenerateReflectionResult {
  question: string;
  options: { id: string; text: string; isCorrect: boolean }[];
}

export interface EvaluateThinkingGateParams {
  problemStatement: string;
  expectedPattern: string;
  userSelectedPattern: string;
  userStatedInvariant: string;
}

export interface EvaluateThinkingGateResult {
  patternCorrect: boolean;
  invariantQuality: 'good' | 'partial' | 'poor';
  feedback: string;
}

export interface EvaluateCodeParams {
  code: string;
  language: string;
  expectedPattern: string;
  problemStatement: string;
  testResults: { input: string; expected: string; actual: string; passed: boolean }[];
  heuristicErrors: { type: string; message: string }[];
}

export interface EvaluateCodeResult {
  grade: 'PASS' | 'PARTIAL' | 'FAIL';
  confidence: number;
  patternRecognized: string | null;
  errors: { type: string; severity: 'ERROR' | 'WARNING'; message: string; lineNumber?: number }[];
  feedback: string;
  suggestedMicroLesson: string | null;
}

export function createLLMClient(apiKey: string): LLMClient {
  const anthropic = new Anthropic({ apiKey });

  return {
    async generateHint(params: GenerateHintParams): Promise<GenerateHintResult> {
      const response = await anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 500,
        messages: [
          {
            role: 'user',
            content: `You are a Socratic tutor helping a student with a coding problem.

Problem: ${params.problemStatement}
Pattern: ${params.pattern}
Hint Level: ${params.hintLevel}
Previous Hints: ${params.previousHints.join('\n')}
${params.userCode ? `User Code:\n${params.userCode}` : ''}
${params.failedTests ? `Failed Tests:\n${JSON.stringify(params.failedTests)}` : ''}

Generate a hint at the specified level. Do not reveal the solution.
Respond with JSON: { "hint": "...", "nextAction": "..." }`,
          },
        ],
      });

      const text = response.content[0]?.type === 'text' ? response.content[0].text : '';
      return JSON.parse(text);
    },

    async generateReflection(params: GenerateReflectionParams): Promise<GenerateReflectionResult> {
      const response = await anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 500,
        messages: [
          {
            role: 'user',
            content: `You are a Socratic tutor helping a student reflect on their failed attempt.

Problem: ${params.problemStatement}
Pattern: ${params.pattern}
User Code:\n${params.userCode}
Failed Tests:\n${JSON.stringify(params.failedTests)}

Generate a multiple choice reflection question that helps the student identify their mistake.
Respond with JSON: { "question": "...", "options": [{ "id": "A", "text": "...", "isCorrect": false }, ...] }`,
          },
        ],
      });

      const text = response.content[0]?.type === 'text' ? response.content[0].text : '';
      return JSON.parse(text);
    },

    async evaluateThinkingGate(params: EvaluateThinkingGateParams): Promise<EvaluateThinkingGateResult> {
      const response = await anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 300,
        messages: [
          {
            role: 'user',
            content: `Evaluate a student's thinking gate submission.

Problem: ${params.problemStatement}
Expected Pattern: ${params.expectedPattern}
User Selected Pattern: ${params.userSelectedPattern}
User Stated Invariant: ${params.userStatedInvariant}

Evaluate the submission. Be strict about pattern selection, lenient about invariant wording.
Respond with JSON: { "patternCorrect": true/false, "invariantQuality": "good"|"partial"|"poor", "feedback": "..." }`,
          },
        ],
      });

      const text = response.content[0]?.type === 'text' ? response.content[0].text : '';
      return JSON.parse(text);
    },

    async evaluateCode(params: EvaluateCodeParams): Promise<EvaluateCodeResult> {
      const testSummary = params.testResults.map((t) =>
        `Input: ${t.input} | Expected: ${t.expected} | Actual: ${t.actual} | ${t.passed ? 'PASS' : 'FAIL'}`
      ).join('\n');

      const heuristicSummary = params.heuristicErrors.length > 0
        ? params.heuristicErrors.map((e) => `${e.type}: ${e.message}`).join('\n')
        : 'None';

      const response = await anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 800,
        messages: [
          {
            role: 'user',
            content: `You are a coding tutor evaluating a student's code submission. Grade the code based on correctness, pattern usage, and code quality.

## Problem Statement
${params.problemStatement}

## Expected Pattern
${params.expectedPattern}

## Student's Code (${params.language})
\`\`\`${params.language}
${params.code}
\`\`\`

## Test Results
${testSummary}

## Heuristic Errors Detected
${heuristicSummary}

## Grading Rubric
- PASS: All tests pass AND correct pattern used AND no critical errors
- PARTIAL: Most tests pass OR correct pattern with minor issues
- FAIL: Many tests fail OR wrong pattern OR critical errors

Evaluate the code and respond with ONLY valid JSON (no markdown):
{
  "grade": "PASS" | "PARTIAL" | "FAIL",
  "confidence": 0.0-1.0,
  "patternRecognized": "pattern name or null",
  "errors": [{ "type": "string", "severity": "ERROR" | "WARNING", "message": "string", "lineNumber": number | null }],
  "feedback": "constructive feedback for the student",
  "suggestedMicroLesson": "lesson topic or null"
}`,
          },
        ],
      });

      const text = response.content[0]?.type === 'text' ? response.content[0].text : '';
      // Extract JSON from response (handle potential markdown code blocks)
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('Failed to parse LLM response as JSON');
      }
      return JSON.parse(jsonMatch[0]);
    },
  };
}

/**
 * Creates an LLMValidationPort adapter that uses the LLMClient for rubric grading.
 * This bridges the adapter-llm package with the core validation port interface.
 */
export function createLLMValidationAdapter(
  client: LLMClient,
  problemStatement: string
): LLMValidationPort {
  return {
    async validateCode(request: LLMValidationRequest): Promise<LLMValidationResponse | null> {
      try {
        const result = await client.evaluateCode({
          code: request.code,
          language: request.language,
          expectedPattern: request.expectedPattern,
          problemStatement,
          testResults: request.testResults.map((t) => ({
            input: t.input,
            expected: t.expected,
            actual: t.actual,
            passed: t.passed,
          })),
          heuristicErrors: request.heuristicErrors.map((e) => ({
            type: e.type,
            message: e.message,
          })),
        });

        return {
          grade: result.grade,
          confidence: result.confidence,
          patternRecognized: result.patternRecognized as PatternId | null,
          errors: result.errors.map((e) => ({
            type: e.type,
            severity: e.severity,
            message: e.message,
            lineNumber: e.lineNumber,
          })),
          feedback: result.feedback,
          suggestedMicroLesson: result.suggestedMicroLesson,
        };
      } catch {
        // Graceful degradation - fall back to heuristics only
        return null;
      }
    },

    isEnabled(): boolean {
      return true;
    },
  };
}

/**
 * Creates an LLMValidationPort that is always disabled.
 * Use this when LLM validation should be off.
 */
export function createNullLLMValidation(): LLMValidationPort {
  return {
    validateCode: () => Promise.resolve(null),
    isEnabled: () => false,
  };
}

// Export Socratic Coach adapter
export * from './socratic-coach-adapter.js';
