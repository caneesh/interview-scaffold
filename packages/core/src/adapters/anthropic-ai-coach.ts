/**
 * Anthropic AI Coach Adapter
 *
 * Production implementation of AICoachPort using Anthropic's API.
 * Environment-gated: only active when API key is provided.
 *
 * NOTE: This adapter is platform-agnostic and requires fetch and
 * API key to be provided via configuration or dependency injection.
 */

import type { AICoachPort } from '../ports/ai-coach.js';
import { validateAIResponse, getSystemPrompt, buildUserPrompt } from '../ports/ai-coach.js';
import type {
  AICoachRequest,
  AICoachResponse,
  GuidanceType,
} from '../entities/diagnostic-coach.js';

// ============ Configuration ============

/** Minimal RequestInit type for fetch */
export interface FetchRequestInit {
  method?: string;
  headers?: Record<string, string>;
  body?: string;
}

/** Minimal Response type for fetch */
export interface FetchResponse {
  ok: boolean;
  status: number;
  statusText: string;
  json(): Promise<unknown>;
}

/** Type for fetch function */
export type FetchFn = (url: string, init?: FetchRequestInit) => Promise<FetchResponse>;

export interface AnthropicCoachConfig {
  /** Anthropic API key - required for AI coaching */
  readonly apiKey: string;
  /** Fetch function to use - required for platform compatibility */
  readonly fetchFn: FetchFn;
  /** Model to use (default: claude-3-haiku-20240307) */
  readonly model?: string;
  /** Max tokens for response (default: 1024) */
  readonly maxTokens?: number;
  /** Temperature for generation (default: 0.7) */
  readonly temperature?: number;
  /** Logger for errors/warnings (optional) */
  readonly logger?: {
    warn: (message: string) => void;
    error: (message: string) => void;
    log: (message: string) => void;
  };
}

// ============ Anthropic API Types ============

interface AnthropicMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface AnthropicRequest {
  model: string;
  max_tokens: number;
  temperature?: number;
  system: string;
  messages: AnthropicMessage[];
}

interface AnthropicResponse {
  content: Array<{
    type: 'text';
    text: string;
  }>;
  stop_reason: string;
  usage: {
    input_tokens: number;
    output_tokens: number;
  };
}

// ============ Default Values ============

const DEFAULT_MODEL = 'claude-3-haiku-20240307';
const DEFAULT_MAX_TOKENS = 1024;
const DEFAULT_TEMPERATURE = 0.7;

// Default logger that does nothing
const nullLogger = {
  warn: () => {},
  error: () => {},
  log: () => {},
};

// ============ Create Anthropic Coach ============

/**
 * Creates an AI coach powered by Anthropic's Claude.
 *
 * The coach requires an API key - if not provided, isEnabled() returns false.
 */
export function createAnthropicAICoach(config: AnthropicCoachConfig): AICoachPort {
  const {
    apiKey,
    fetchFn,
    model = DEFAULT_MODEL,
    maxTokens = DEFAULT_MAX_TOKENS,
    temperature = DEFAULT_TEMPERATURE,
    logger = nullLogger,
  } = config;

  if (!apiKey) {
    return {
      isEnabled: () => false,
      getGuidance: async () => null,
      validateResponse: () => ({ valid: true }),
    };
  }

  return {
    isEnabled(): boolean {
      return Boolean(apiKey);
    },

    async getGuidance(request: AICoachRequest): Promise<AICoachResponse | null> {
      try {
        const systemPrompt = getSystemPrompt(request.stage);
        const userPrompt = buildUserPrompt(request);

        const anthropicRequest: AnthropicRequest = {
          model,
          max_tokens: maxTokens,
          temperature,
          system: systemPrompt,
          messages: [
            { role: 'user', content: userPrompt },
          ],
        };

        const response = await fetchFn('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': apiKey,
            'anthropic-version': '2023-06-01',
          },
          body: JSON.stringify(anthropicRequest),
        });

        if (!response.ok) {
          logger.error(`Anthropic API error: ${response.status} ${response.statusText}`);
          return null;
        }

        const data = await response.json() as AnthropicResponse;
        const text = data.content[0]?.text;

        if (!text) {
          return null;
        }

        // Parse the response into structured guidance
        const coachResponse = parseCoachResponse(text, request.stage);

        // Validate the response
        const validation = validateAIResponse(coachResponse);
        if (!validation.valid) {
          logger.warn(`AI response validation failed: ${validation.reason}`);
          return null;
        }

        return coachResponse;
      } catch (error) {
        logger.error(`Error calling Anthropic API: ${error}`);
        return null;
      }
    },

    validateResponse(response: AICoachResponse): { valid: boolean; reason?: string } {
      return validateAIResponse(response);
    },
  };
}

// ============ Response Parsing ============

/**
 * Parse AI text response into structured AICoachResponse
 */
function parseCoachResponse(
  text: string,
  stage: AICoachRequest['stage']
): AICoachResponse {
  // Extract questions (lines starting with "?" or ending with "?")
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
  const questions: string[] = [];

  for (const line of lines) {
    if (line.endsWith('?') || line.startsWith('?')) {
      questions.push(line.replace(/^\?+\s*/, ''));
    }
  }

  // Determine guidance type based on content
  const guidanceType = inferGuidanceType(text, stage);

  // Extract checklist items if present
  const checklist = extractChecklist(text);

  return {
    guidance: text,
    guidanceType,
    questions: questions.slice(0, 5), // Limit to 5 questions
    checklist: checklist.length > 0 ? checklist : undefined,
    suggestedNextStage: undefined, // Let the use case determine this
    confidence: 0.8, // Default confidence
  };
}

function inferGuidanceType(text: string, stage: string): GuidanceType {
  const lowerText = text.toLowerCase();

  // Check for specific patterns
  if (lowerText.includes('checklist') || (lowerText.includes('verify') && stage === 'VERIFY')) {
    return 'checklist';
  }

  if (lowerText.includes('what if') || lowerText.includes('consider')) {
    return 'counterexample';
  }

  if (lowerText.includes('pattern') || lowerText.includes('common cause')) {
    return 'pattern_hint';
  }

  if (lowerText.includes('next step') || lowerText.includes('try')) {
    return 'next_step';
  }

  if (stage === 'POSTMORTEM') {
    return 'knowledge_card';
  }

  // Default to Socratic question
  return 'socratic_question';
}

function extractChecklist(text: string): readonly string[] {
  const items: string[] = [];
  const lines = text.split('\n');

  for (const line of lines) {
    const trimmed = line.trim();
    // Match checkbox-style items: [ ], [x], - [ ], * [ ]
    if (/^[-*]?\s*\[[ x]\]/.test(trimmed)) {
      items.push(trimmed.replace(/^[-*]?\s*\[[ x]\]\s*/, ''));
    }
    // Match numbered items in verification context
    if (/^\d+\.\s+/.test(trimmed) && text.toLowerCase().includes('verify')) {
      items.push(trimmed.replace(/^\d+\.\s+/, ''));
    }
  }

  return items;
}

// ============ Null Coach Factory ============

/**
 * Creates a null AI coach (for when AI is disabled).
 * This is re-exported here for convenience.
 */
export function createNullAICoachAdapter(): AICoachPort {
  return {
    isEnabled: () => false,
    getGuidance: async () => null,
    validateResponse: () => ({ valid: true }),
  };
}
