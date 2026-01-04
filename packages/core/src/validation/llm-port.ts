/**
 * Optional LLM Adapter Port for Validation
 * OFF by default - deterministic heuristics run first
 * LLM only used for ambiguous cases or enhanced feedback
 */

import type { ErrorEvent, RubricGrade } from './types.js';
import type { PatternId } from '../entities/pattern.js';

// ============ LLM Request/Response Types ============

export interface LLMValidationRequest {
  readonly code: string;
  readonly language: string;
  readonly expectedPattern: PatternId;
  readonly testResults: readonly TestResultSummary[];
  readonly heuristicErrors: readonly ErrorEvent[];
}

export interface TestResultSummary {
  readonly input: string;
  readonly expected: string;
  readonly actual: string;
  readonly passed: boolean;
}

export interface LLMValidationResponse {
  readonly grade: RubricGrade;
  readonly confidence: number; // 0-1
  readonly patternRecognized: PatternId | null;
  readonly errors: readonly LLMDetectedError[];
  readonly feedback: string;
  readonly suggestedMicroLesson: string | null;
}

export interface LLMDetectedError {
  readonly type: string;
  readonly severity: 'ERROR' | 'WARNING';
  readonly message: string;
  readonly lineNumber?: number;
}

// ============ LLM Validation Port ============

/**
 * Port for optional LLM-based code validation.
 * Implementations must enforce strict JSON schema validation.
 */
export interface LLMValidationPort {
  /**
   * Validate code using LLM.
   * @returns LLM validation response or null if LLM is disabled/unavailable
   */
  validateCode(request: LLMValidationRequest): Promise<LLMValidationResponse | null>;

  /**
   * Check if LLM validation is enabled.
   */
  isEnabled(): boolean;
}

// ============ Null Implementation (Default - OFF) ============

/**
 * Default null implementation - LLM validation is OFF.
 * Use this when LLM validation is not configured or disabled.
 */
export class NullLLMValidation implements LLMValidationPort {
  validateCode(_request: LLMValidationRequest): Promise<LLMValidationResponse | null> {
    return Promise.resolve(null);
  }

  isEnabled(): boolean {
    return false;
  }
}

// ============ LLM Response Schema (for adapter implementations) ============

/**
 * JSON Schema for LLM response validation.
 * Adapter implementations should use this to validate Claude responses.
 */
export const LLM_VALIDATION_RESPONSE_SCHEMA = {
  type: 'object',
  required: ['grade', 'confidence', 'patternRecognized', 'errors', 'feedback', 'suggestedMicroLesson'],
  properties: {
    grade: {
      type: 'string',
      enum: ['PASS', 'PARTIAL', 'FAIL'],
    },
    confidence: {
      type: 'number',
      minimum: 0,
      maximum: 1,
    },
    patternRecognized: {
      type: ['string', 'null'],
    },
    errors: {
      type: 'array',
      items: {
        type: 'object',
        required: ['type', 'severity', 'message'],
        properties: {
          type: { type: 'string' },
          severity: { type: 'string', enum: ['ERROR', 'WARNING'] },
          message: { type: 'string' },
          lineNumber: { type: 'number' },
        },
      },
    },
    feedback: { type: 'string' },
    suggestedMicroLesson: { type: ['string', 'null'] },
  },
} as const;

// ============ Validation Orchestrator ============

export interface ValidationOrchestratorConfig {
  readonly useLLM: boolean;
  readonly llmConfidenceThreshold: number; // Only use LLM result if confidence >= threshold
}

export const DEFAULT_ORCHESTRATOR_CONFIG: ValidationOrchestratorConfig = {
  useLLM: false, // OFF by default
  llmConfidenceThreshold: 0.8,
};
