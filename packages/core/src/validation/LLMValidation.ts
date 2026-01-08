/**
 * Optional LLM-based validation with strict JSON schema.
 * PURE TypeScript - no framework dependencies.
 * OFF by default - must be explicitly enabled.
 */

import type { LLMProvider, LLMMessage, LLMConfig } from '../ports/LLMProvider.js';
import type { GradeResult, ValidationError, CheckpointType } from './types.js';
import { GradeResult as GradeResultEnum } from './types.js';
import type { Language, PatternId } from '../entities/types.js';

// ============================================================================
// LLM Validation Constants
// ============================================================================

export const LLM_VALIDATION_CONSTANTS = {
  /** Whether LLM validation is enabled by default */
  ENABLED_BY_DEFAULT: false,

  /** Maximum tokens for LLM response */
  MAX_TOKENS: 500,

  /** Temperature for deterministic responses */
  TEMPERATURE: 0,

  /** Timeout for LLM requests (ms) */
  TIMEOUT_MS: 10000,
} as const;

// ============================================================================
// Strict JSON Schema Types
// ============================================================================

export interface LLMValidationRequest {
  readonly checkpoint: CheckpointType;
  readonly submission: string;
  readonly patternId: PatternId;
  readonly language: Language;
  readonly context: string;
}

export interface LLMValidationResponse {
  readonly grade: GradeResult;
  readonly score: number;
  readonly feedback: string;
  readonly errors: readonly LLMError[];
  readonly suggestions: readonly string[];
}

export interface LLMError {
  readonly type: string;
  readonly message: string;
  readonly line?: number;
}

// JSON Schema for strict response format
export const LLM_RESPONSE_SCHEMA = {
  type: 'object',
  required: ['grade', 'score', 'feedback', 'errors', 'suggestions'],
  properties: {
    grade: { enum: ['PASS', 'PARTIAL', 'FAIL'] },
    score: { type: 'number', minimum: 0, maximum: 100 },
    feedback: { type: 'string' },
    errors: {
      type: 'array',
      items: {
        type: 'object',
        required: ['type', 'message'],
        properties: {
          type: { type: 'string' },
          message: { type: 'string' },
          line: { type: 'number' },
        },
      },
    },
    suggestions: {
      type: 'array',
      items: { type: 'string' },
    },
  },
} as const;

// ============================================================================
// LLM Validation Functions
// ============================================================================

export interface LLMValidatorConfig {
  readonly enabled: boolean;
  readonly provider: LLMProvider | null;
  readonly fallbackToRules: boolean;
}

/**
 * Creates default LLM validator config (disabled).
 */
export function createDefaultLLMConfig(): LLMValidatorConfig {
  return {
    enabled: LLM_VALIDATION_CONSTANTS.ENABLED_BY_DEFAULT,
    provider: null,
    fallbackToRules: true,
  };
}

/**
 * Validates submission using LLM with strict JSON output.
 */
export async function validateWithLLM(
  request: LLMValidationRequest,
  config: LLMValidatorConfig
): Promise<LLMValidationResponse | null> {
  if (!config.enabled || !config.provider) {
    return null;
  }

  try {
    const systemPrompt = buildSystemPrompt(request.checkpoint);
    const userPrompt = buildUserPrompt(request);

    const messages: LLMMessage[] = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ];

    const llmConfig: LLMConfig = {
      maxTokens: LLM_VALIDATION_CONSTANTS.MAX_TOKENS,
      temperature: LLM_VALIDATION_CONSTANTS.TEMPERATURE,
    };

    const response = await config.provider.chat(messages, llmConfig);

    // Parse and validate JSON response
    const parsed = parseAndValidateResponse(response.content);
    return parsed;
  } catch (error) {
    console.error('LLM validation failed:', error);
    return null;
  }
}

/**
 * Builds system prompt for LLM validation.
 */
function buildSystemPrompt(checkpoint: CheckpointType): string {
  return `You are a strict code review assistant. Validate the submission for the ${checkpoint} checkpoint.

You MUST respond with valid JSON matching this exact schema:
{
  "grade": "PASS" | "PARTIAL" | "FAIL",
  "score": number (0-100),
  "feedback": "string",
  "errors": [{ "type": "string", "message": "string", "line": number? }],
  "suggestions": ["string"]
}

Grading criteria:
- PASS (80-100): Meets all requirements
- PARTIAL (50-79): Meets some requirements
- FAIL (0-49): Does not meet requirements

Be strict and objective. Focus on:
- Correctness of the approach/code
- Completeness of the solution
- Following the pattern correctly

Respond ONLY with the JSON object, no additional text.`;
}

/**
 * Builds user prompt with submission details.
 */
function buildUserPrompt(request: LLMValidationRequest): string {
  return `Checkpoint: ${request.checkpoint}
Pattern: ${request.patternId}
Language: ${request.language}

Context: ${request.context}

Submission:
\`\`\`${request.language}
${request.submission}
\`\`\`

Validate this submission and respond with JSON.`;
}

/**
 * Parses and validates LLM response against schema.
 */
function parseAndValidateResponse(content: string): LLMValidationResponse | null {
  try {
    // Extract JSON from response (handle markdown code blocks)
    const jsonContent = extractJSON(content);
    const parsed = JSON.parse(jsonContent);

    // Validate against schema
    if (!isValidResponse(parsed)) {
      console.error('LLM response does not match schema');
      return null;
    }

    // Normalize grade
    const grade = normalizeGrade(parsed.grade);

    return {
      grade,
      score: parsed.score,
      feedback: parsed.feedback,
      errors: parsed.errors ?? [],
      suggestions: parsed.suggestions ?? [],
    };
  } catch (error) {
    console.error('Failed to parse LLM response:', error);
    return null;
  }
}

/**
 * Extracts JSON from potentially wrapped content.
 */
function extractJSON(content: string): string {
  // Remove markdown code blocks if present
  let cleaned = content.trim();

  if (cleaned.startsWith('```json')) {
    cleaned = cleaned.slice(7);
  } else if (cleaned.startsWith('```')) {
    cleaned = cleaned.slice(3);
  }

  if (cleaned.endsWith('```')) {
    cleaned = cleaned.slice(0, -3);
  }

  return cleaned.trim();
}

/**
 * Validates response structure.
 */
function isValidResponse(parsed: unknown): parsed is LLMValidationResponse {
  if (typeof parsed !== 'object' || parsed === null) return false;

  const obj = parsed as Record<string, unknown>;

  if (!['PASS', 'PARTIAL', 'FAIL'].includes(obj['grade'] as string)) return false;
  if (typeof obj['score'] !== 'number') return false;
  if (typeof obj['feedback'] !== 'string') return false;
  if (!Array.isArray(obj['errors'])) return false;
  if (!Array.isArray(obj['suggestions'])) return false;

  return true;
}

/**
 * Normalizes grade string to enum value.
 */
function normalizeGrade(grade: string): GradeResult {
  switch (grade.toUpperCase()) {
    case 'PASS':
      return GradeResultEnum.PASS;
    case 'PARTIAL':
      return GradeResultEnum.PARTIAL;
    default:
      return GradeResultEnum.FAIL;
  }
}

/**
 * Converts LLM errors to ValidationErrors.
 */
export function convertLLMErrors(
  llmErrors: readonly LLMError[]
): ValidationError[] {
  return llmErrors.map(err => ({
    type: 'LOGIC_ERROR' as const,
    message: err.message,
    ...(err.line !== undefined ? { line: err.line } : {}),
    severity: 'error' as const,
  }));
}
