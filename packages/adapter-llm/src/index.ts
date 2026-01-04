import Anthropic from '@anthropic-ai/sdk';

/**
 * LLM Client for generating hints, reflections, and other AI content
 * This is optional - the core use-cases work without it
 */

export interface LLMClient {
  generateHint(params: GenerateHintParams): Promise<GenerateHintResult>;
  generateReflection(params: GenerateReflectionParams): Promise<GenerateReflectionResult>;
  evaluateThinkingGate(params: EvaluateThinkingGateParams): Promise<EvaluateThinkingGateResult>;
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

export function createLLMClient(apiKey: string): LLMClient {
  const anthropic = new Anthropic({ apiKey });

  return {
    async generateHint(params: GenerateHintParams): Promise<GenerateHintResult> {
      const response = await anthropic.messages.create({
        model: 'claude-3-5-sonnet-20241022',
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
        model: 'claude-3-5-sonnet-20241022',
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
        model: 'claude-3-5-sonnet-20241022',
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
  };
}
