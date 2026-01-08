/**
 * LLMProvider port - interface for LLM interactions.
 * PURE TypeScript - no framework dependencies.
 */

export interface LLMMessage {
  readonly role: 'system' | 'user' | 'assistant';
  readonly content: string;
}

export interface LLMResponse {
  readonly content: string;
  readonly usage?: {
    readonly inputTokens: number;
    readonly outputTokens: number;
  };
  readonly cached: boolean;
}

export interface LLMConfig {
  readonly model?: string;
  readonly maxTokens?: number;
  readonly temperature?: number;
  readonly stopSequences?: readonly string[];
}

export interface CodeReviewRequest {
  readonly code: string;
  readonly language: string;
  readonly context: string;
  readonly focusAreas?: readonly string[];
}

export interface CodeReviewResponse {
  readonly feedback: string;
  readonly suggestions: readonly string[];
  readonly issues: readonly {
    readonly severity: 'error' | 'warning' | 'info';
    readonly message: string;
    readonly line?: number;
  }[];
}

export interface HintRequest {
  readonly problemDescription: string;
  readonly currentCode: string;
  readonly language: string;
  readonly stepDescription: string;
  readonly previousHints: readonly string[];
}

export interface LLMProvider {
  /**
   * Sends a chat completion request.
   */
  chat(messages: readonly LLMMessage[], config?: LLMConfig): Promise<LLMResponse>;

  /**
   * Reviews code and provides feedback.
   */
  reviewCode(request: CodeReviewRequest): Promise<CodeReviewResponse>;

  /**
   * Generates a hint for the current step.
   */
  generateHint(request: HintRequest): Promise<string>;

  /**
   * Explains a concept.
   */
  explainConcept(concept: string, context?: string): Promise<string>;
}

/**
 * No-op LLM provider for testing or when LLM is disabled.
 */
export const NoOpLLMProvider: LLMProvider = {
  chat: async () => ({ content: '', cached: false }),
  reviewCode: async () => ({ feedback: '', suggestions: [], issues: [] }),
  generateHint: async () => 'No hints available.',
  explainConcept: async () => 'No explanation available.',
};
