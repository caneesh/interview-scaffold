/**
 * LLM Generator Port - Provider-neutral interface for problem generation
 *
 * This port defines the contract for LLM-based problem generation.
 * Adapters can implement this interface for different LLM providers
 * (OpenAI, Anthropic, local models, etc.).
 */

import type { ProblemSpecV1 } from '@scaffold/contracts';

/**
 * Input for generating problems
 */
export interface GenerateProblemInput {
  /** Pattern ID to generate problems for (e.g., 'SLIDING_WINDOW', 'TWO_POINTERS') */
  patternId: string;

  /** Difficulty level (0-4, where 0 is easiest) */
  level: number;

  /** Number of problems to generate */
  count: number;

  /** Existing titles for deduplication */
  existingTitles: string[];

  /** Version of the prompt template */
  promptVersion: string;

  /** Optional seed for reproducibility */
  seed?: string;

  /** Optional additional context for generation */
  context?: {
    /** Focus on specific data structures (e.g., 'arrays', 'strings', 'trees') */
    focusAreas?: string[];
    /** Avoid these topics */
    excludeTopics?: string[];
    /** Target complexity (e.g., 'O(n)', 'O(n log n)') */
    targetComplexity?: string;
  };
}

/**
 * Output from problem generation
 */
export interface GenerateProblemOutput {
  /** Generated problem candidates */
  candidates: ProblemSpecV1[];

  /** Model used for generation */
  model: string;

  /** Tokens used (if available from provider) */
  tokensUsed?: number;

  /** Generation duration in milliseconds */
  durationMs?: number;

  /** Any warnings from generation */
  warnings?: string[];
}

/**
 * LLM Generator Port - interface for LLM problem generation
 *
 * Implementations should:
 * 1. Generate ORIGINAL problems only (no copyrighted content)
 * 2. Return valid ProblemSpecV1 candidates
 * 3. Track model and token usage for auditing
 * 4. Handle rate limiting and retries internally
 */
export interface LLMGeneratorPort {
  /**
   * Generate problem candidates for a pattern and level
   *
   * @param input - Generation parameters
   * @returns Generated problem candidates with metadata
   * @throws Error if generation fails after retries
   */
  generateProblems(input: GenerateProblemInput): Promise<GenerateProblemOutput>;

  /**
   * Check if the generator is available
   *
   * @returns true if the generator can accept requests
   */
  isAvailable(): Promise<boolean>;

  /**
   * Get the model identifier being used
   *
   * @returns Model identifier string
   */
  getModelId(): string;
}

/**
 * Factory function type for creating LLM generators
 */
export type LLMGeneratorFactory = (config: LLMGeneratorConfig) => LLMGeneratorPort;

/**
 * Configuration for LLM generators
 */
export interface LLMGeneratorConfig {
  /** API key or credentials */
  apiKey?: string;

  /** Model to use (e.g., 'claude-3-opus', 'gpt-4') */
  model?: string;

  /** Maximum tokens for generation */
  maxTokens?: number;

  /** Temperature for generation (0-1) */
  temperature?: number;

  /** Timeout in milliseconds */
  timeoutMs?: number;

  /** Maximum retries on failure */
  maxRetries?: number;
}

/**
 * Null implementation for testing without LLM
 */
export function createNullLLMGenerator(): LLMGeneratorPort {
  return {
    async generateProblems(): Promise<GenerateProblemOutput> {
      return {
        candidates: [],
        model: 'null',
        warnings: ['LLM generation is disabled'],
      };
    },

    async isAvailable(): Promise<boolean> {
      return false;
    },

    getModelId(): string {
      return 'null';
    },
  };
}
