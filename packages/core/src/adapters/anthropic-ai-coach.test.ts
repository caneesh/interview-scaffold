/**
 * Tests for Anthropic AI Coach Adapter
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  createAnthropicAICoach,
  createNullAICoachAdapter,
} from './anthropic-ai-coach.js';
import type { AICoachRequest } from '../entities/diagnostic-coach.js';

describe('Anthropic AI Coach Adapter', () => {
  const mockFetch = vi.fn();

  beforeEach(() => {
    mockFetch.mockReset();
  });

  const baseRequest: AICoachRequest = {
    stage: 'TRIAGE',
    problemContext: {
      problemId: 'p1',
      problemTitle: 'Binary Search Bug',
      problemStatement: 'Fix the binary search',
      visibleTestCases: ['test(1) === true'],
    },
    evidence: {},
  };

  describe('createAnthropicAICoach', () => {
    it('should return isEnabled false when no API key', () => {
      const coach = createAnthropicAICoach({ apiKey: '', fetchFn: mockFetch });
      expect(coach.isEnabled()).toBe(false);
    });

    it('should return isEnabled true when API key provided', () => {
      const coach = createAnthropicAICoach({ apiKey: 'test-key', fetchFn: mockFetch });
      expect(coach.isEnabled()).toBe(true);
    });

    it('should return null from getGuidance when no API key', async () => {
      const coach = createAnthropicAICoach({ apiKey: '', fetchFn: mockFetch });
      const result = await coach.getGuidance(baseRequest);
      expect(result).toBeNull();
    });

    it('should call Anthropic API with correct format', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          content: [{ type: 'text', text: 'What type of error are you seeing?' }],
          stop_reason: 'end_turn',
          usage: { input_tokens: 100, output_tokens: 50 },
        }),
      });

      const coach = createAnthropicAICoach({
        apiKey: 'test-key',
        fetchFn: mockFetch,
      });
      await coach.getGuidance(baseRequest);

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.anthropic.com/v1/messages',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            'x-api-key': 'test-key',
            'anthropic-version': '2023-06-01',
          }),
        })
      );

      const body = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(body.model).toBeDefined();
      expect(body.system).toContain('debugging coach');
      expect(body.messages).toHaveLength(1);
      expect(body.messages[0].role).toBe('user');
    });

    it('should parse valid response into AICoachResponse', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          content: [{
            type: 'text',
            text: 'What symptoms are you observing?\nIs the bug reproducible?\nHave you checked the inputs?',
          }],
          stop_reason: 'end_turn',
          usage: { input_tokens: 100, output_tokens: 50 },
        }),
      });

      const coach = createAnthropicAICoach({
        apiKey: 'test-key',
        fetchFn: mockFetch,
      });
      const result = await coach.getGuidance(baseRequest);

      expect(result).not.toBeNull();
      expect(result!.guidance).toContain('symptoms');
      expect(result!.questions.length).toBeGreaterThan(0);
      expect(result!.guidanceType).toBeDefined();
    });

    it('should return null on API error', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
      });

      const coach = createAnthropicAICoach({
        apiKey: 'test-key',
        fetchFn: mockFetch,
      });
      const result = await coach.getGuidance(baseRequest);

      expect(result).toBeNull();
    });

    it('should return null on network error', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const coach = createAnthropicAICoach({
        apiKey: 'test-key',
        fetchFn: mockFetch,
      });
      const result = await coach.getGuidance(baseRequest);

      expect(result).toBeNull();
    });

    it('should reject response with code blocks', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          content: [{
            type: 'text',
            text: 'Here is the fix:\n```javascript\nreturn x + 1;\n```',
          }],
          stop_reason: 'end_turn',
          usage: { input_tokens: 100, output_tokens: 50 },
        }),
      });

      const coach = createAnthropicAICoach({
        apiKey: 'test-key',
        fetchFn: mockFetch,
      });
      const result = await coach.getGuidance(baseRequest);

      // Should return null because response contains code blocks
      expect(result).toBeNull();
    });

    it('should reject response with line numbers', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          content: [{
            type: 'text',
            text: 'Look at line 42 for the bug.',
          }],
          stop_reason: 'end_turn',
          usage: { input_tokens: 100, output_tokens: 50 },
        }),
      });

      const coach = createAnthropicAICoach({
        apiKey: 'test-key',
        fetchFn: mockFetch,
      });
      const result = await coach.getGuidance(baseRequest);

      expect(result).toBeNull();
    });

    it('should extract questions from response', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          content: [{
            type: 'text',
            text: 'Let me guide you:\nWhat does the error message say?\nHave you tried logging the values?\nCould this be an edge case issue?',
          }],
          stop_reason: 'end_turn',
          usage: { input_tokens: 100, output_tokens: 50 },
        }),
      });

      const coach = createAnthropicAICoach({
        apiKey: 'test-key',
        fetchFn: mockFetch,
      });
      const result = await coach.getGuidance(baseRequest);

      expect(result!.questions).toContain('What does the error message say?');
      expect(result!.questions).toContain('Have you tried logging the values?');
    });

    it('should extract checklist from response', async () => {
      const verifyRequest: AICoachRequest = {
        ...baseRequest,
        stage: 'VERIFY',
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          content: [{
            type: 'text',
            text: 'Verification checklist:\n[ ] All tests pass\n[ ] Edge cases verified\n[ ] No regressions',
          }],
          stop_reason: 'end_turn',
          usage: { input_tokens: 100, output_tokens: 50 },
        }),
      });

      const coach = createAnthropicAICoach({
        apiKey: 'test-key',
        fetchFn: mockFetch,
      });
      const result = await coach.getGuidance(verifyRequest);

      expect(result!.checklist).toBeDefined();
      expect(result!.checklist).toContain('All tests pass');
      expect(result!.guidanceType).toBe('checklist');
    });

    it('should use custom model and config', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          content: [{ type: 'text', text: 'Guidance here?' }],
          stop_reason: 'end_turn',
          usage: { input_tokens: 100, output_tokens: 50 },
        }),
      });

      const coach = createAnthropicAICoach({
        apiKey: 'test-key',
        model: 'claude-3-opus-20240229',
        maxTokens: 2048,
        temperature: 0.5,
        fetchFn: mockFetch,
      });

      await coach.getGuidance(baseRequest);

      const body = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(body.model).toBe('claude-3-opus-20240229');
      expect(body.max_tokens).toBe(2048);
      expect(body.temperature).toBe(0.5);
    });

    it('should use provided logger for errors', async () => {
      const mockLogger = {
        warn: vi.fn(),
        error: vi.fn(),
        log: vi.fn(),
      };

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Server Error',
      });

      const coach = createAnthropicAICoach({
        apiKey: 'test-key',
        fetchFn: mockFetch,
        logger: mockLogger,
      });

      await coach.getGuidance(baseRequest);

      expect(mockLogger.error).toHaveBeenCalled();
    });
  });

  describe('createNullAICoachAdapter', () => {
    it('should return disabled coach', () => {
      const coach = createNullAICoachAdapter();
      expect(coach.isEnabled()).toBe(false);
    });

    it('should return null from getGuidance', async () => {
      const coach = createNullAICoachAdapter();
      const result = await coach.getGuidance(baseRequest);
      expect(result).toBeNull();
    });

    it('should validate any response as valid', () => {
      const coach = createNullAICoachAdapter();
      const result = coach.validateResponse({
        guidance: 'Any guidance',
        guidanceType: 'socratic_question',
        confidence: 0.8,
      });
      expect(result.valid).toBe(true);
    });
  });

  describe('validateResponse', () => {
    it('should validate responses using standard validation', () => {
      const coach = createAnthropicAICoach({
        apiKey: 'test-key',
        fetchFn: mockFetch,
      });

      const validResponse = {
        guidance: 'What patterns do you see?',
        guidanceType: 'socratic_question' as const,
        confidence: 0.8,
      };

      const invalidResponse = {
        guidance: 'Change line 42 to fix the bug',
        guidanceType: 'next_step' as const,
        confidence: 0.9,
      };

      expect(coach.validateResponse(validResponse).valid).toBe(true);
      expect(coach.validateResponse(invalidResponse).valid).toBe(false);
    });
  });
});
