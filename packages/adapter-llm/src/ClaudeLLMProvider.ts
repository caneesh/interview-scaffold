/**
 * Claude API implementation of LLMProvider.
 */

import type {
  LLMProvider,
  LLMMessage,
  LLMResponse,
  LLMConfig,
  CodeReviewRequest,
  CodeReviewResponse,
  HintRequest,
} from '@learning/core';

export interface ClaudeConfig {
  apiKey: string;
  apiUrl?: string;
  defaultModel?: string;
  defaultMaxTokens?: number;
}

export class ClaudeLLMProvider implements LLMProvider {
  private readonly apiUrl: string;
  private readonly defaultModel: string;
  private readonly defaultMaxTokens: number;

  constructor(private readonly config: ClaudeConfig) {
    this.apiUrl = config.apiUrl ?? 'https://api.anthropic.com/v1/messages';
    this.defaultModel = config.defaultModel ?? 'claude-3-haiku-20240307';
    this.defaultMaxTokens = config.defaultMaxTokens ?? 1024;
  }

  async chat(messages: readonly LLMMessage[], config?: LLMConfig): Promise<LLMResponse> {
    const response = await fetch(this.apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.config.apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: config?.model ?? this.defaultModel,
        max_tokens: config?.maxTokens ?? this.defaultMaxTokens,
        temperature: config?.temperature ?? 0.7,
        messages: messages.filter(m => m.role !== 'system').map(m => ({
          role: m.role,
          content: m.content,
        })),
        system: messages.find(m => m.role === 'system')?.content,
      }),
    });

    if (!response.ok) {
      throw new Error(`Claude API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json() as {
      content: { text: string }[];
      usage?: { input_tokens: number; output_tokens: number };
    };

    return {
      content: data.content[0]?.text ?? '',
      usage: data.usage ? {
        inputTokens: data.usage.input_tokens,
        outputTokens: data.usage.output_tokens,
      } : undefined,
      cached: false,
    };
  }

  async reviewCode(request: CodeReviewRequest): Promise<CodeReviewResponse> {
    const systemPrompt = `You are an expert code reviewer. Review the provided code and give constructive feedback.
Focus on: correctness, efficiency, readability, and best practices.
${request.focusAreas ? `Pay special attention to: ${request.focusAreas.join(', ')}` : ''}
Respond in JSON format with: { "feedback": string, "suggestions": string[], "issues": [{ "severity": "error"|"warning"|"info", "message": string, "line"?: number }] }`;

    const userPrompt = `Review this ${request.language} code:

Context: ${request.context}

\`\`\`${request.language}
${request.code}
\`\`\``;

    const response = await this.chat([
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ]);

    try {
      const parsed = JSON.parse(response.content) as CodeReviewResponse;
      return parsed;
    } catch {
      return {
        feedback: response.content,
        suggestions: [],
        issues: [],
      };
    }
  }

  async generateHint(request: HintRequest): Promise<string> {
    const previousHintsText = request.previousHints.length > 0
      ? `Previous hints given:\n${request.previousHints.map((h, i) => `${i + 1}. ${h}`).join('\n')}\n\nProvide the next hint that builds on these.`
      : 'This is the first hint.';

    const systemPrompt = `You are a helpful coding tutor. Generate a hint to help the student solve the problem.
The hint should guide them toward the solution without giving it away directly.
Be encouraging and educational. Keep hints concise (1-2 sentences).`;

    const userPrompt = `Problem: ${request.problemDescription}

Current step: ${request.stepDescription}

Student's current code (${request.language}):
\`\`\`${request.language}
${request.currentCode}
\`\`\`

${previousHintsText}`;

    const response = await this.chat([
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ], {
      maxTokens: 256,
      temperature: 0.7,
    });

    return response.content;
  }

  async explainConcept(concept: string, context?: string): Promise<string> {
    const systemPrompt = `You are an expert computer science tutor. Explain concepts clearly and concisely.
Use examples when helpful. Keep explanations focused and practical.`;

    const userPrompt = context
      ? `Explain "${concept}" in the context of ${context}.`
      : `Explain "${concept}" in the context of programming and algorithms.`;

    const response = await this.chat([
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ], {
      maxTokens: 512,
      temperature: 0.5,
    });

    return response.content;
  }
}

/**
 * Creates a Claude provider that uses a proxy endpoint (for browser use).
 */
export function createProxiedClaudeProvider(proxyUrl: string): LLMProvider {
  return new ProxiedClaudeLLMProvider(proxyUrl);
}

class ProxiedClaudeLLMProvider implements LLMProvider {
  constructor(private readonly proxyUrl: string) {}

  async chat(messages: readonly LLMMessage[], config?: LLMConfig): Promise<LLMResponse> {
    const response = await fetch(this.proxyUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messages,
        config,
      }),
    });

    if (!response.ok) {
      throw new Error(`Proxy error: ${response.status}`);
    }

    return await response.json() as LLMResponse;
  }

  async reviewCode(request: CodeReviewRequest): Promise<CodeReviewResponse> {
    const response = await fetch(`${this.proxyUrl}/review`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      throw new Error(`Proxy error: ${response.status}`);
    }

    return await response.json() as CodeReviewResponse;
  }

  async generateHint(request: HintRequest): Promise<string> {
    const response = await fetch(`${this.proxyUrl}/hint`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      throw new Error(`Proxy error: ${response.status}`);
    }

    const data = await response.json() as { hint: string };
    return data.hint;
  }

  async explainConcept(concept: string, context?: string): Promise<string> {
    const response = await fetch(`${this.proxyUrl}/explain`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ concept, context }),
    });

    if (!response.ok) {
      throw new Error(`Proxy error: ${response.status}`);
    }

    const data = await response.json() as { explanation: string };
    return data.explanation;
  }
}
