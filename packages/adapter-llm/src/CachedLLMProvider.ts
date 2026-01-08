/**
 * Cached wrapper for LLMProvider.
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

export interface CacheStore {
  get(key: string): Promise<string | null>;
  set(key: string, value: string, ttlMs?: number): Promise<void>;
}

export interface CachedLLMConfig {
  defaultTtlMs?: number;
  cacheKeyPrefix?: string;
}

export class CachedLLMProvider implements LLMProvider {
  private readonly defaultTtlMs: number;
  private readonly cacheKeyPrefix: string;

  constructor(
    private readonly provider: LLMProvider,
    private readonly cache: CacheStore,
    config?: CachedLLMConfig
  ) {
    this.defaultTtlMs = config?.defaultTtlMs ?? 24 * 60 * 60 * 1000; // 24 hours
    this.cacheKeyPrefix = config?.cacheKeyPrefix ?? 'llm:';
  }

  async chat(messages: readonly LLMMessage[], config?: LLMConfig): Promise<LLMResponse> {
    const cacheKey = this.generateCacheKey('chat', { messages, config });
    const cached = await this.cache.get(cacheKey);

    if (cached) {
      const response = JSON.parse(cached) as LLMResponse;
      return { ...response, cached: true };
    }

    const response = await this.provider.chat(messages, config);
    await this.cache.set(cacheKey, JSON.stringify(response), this.defaultTtlMs);

    return response;
  }

  async reviewCode(request: CodeReviewRequest): Promise<CodeReviewResponse> {
    const cacheKey = this.generateCacheKey('review', request);
    const cached = await this.cache.get(cacheKey);

    if (cached) {
      return JSON.parse(cached) as CodeReviewResponse;
    }

    const response = await this.provider.reviewCode(request);
    await this.cache.set(cacheKey, JSON.stringify(response), this.defaultTtlMs);

    return response;
  }

  async generateHint(request: HintRequest): Promise<string> {
    // Don't cache hints to ensure variety
    return this.provider.generateHint(request);
  }

  async explainConcept(concept: string, context?: string): Promise<string> {
    const cacheKey = this.generateCacheKey('explain', { concept, context });
    const cached = await this.cache.get(cacheKey);

    if (cached) {
      return cached;
    }

    const response = await this.provider.explainConcept(concept, context);
    await this.cache.set(cacheKey, response, this.defaultTtlMs);

    return response;
  }

  private generateCacheKey(operation: string, data: unknown): string {
    const hash = this.simpleHash(JSON.stringify(data));
    return `${this.cacheKeyPrefix}${operation}:${hash}`;
  }

  private simpleHash(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(36);
  }
}

/**
 * In-memory cache implementation.
 */
export class InMemoryCacheStore implements CacheStore {
  private readonly store = new Map<string, { value: string; expiresAt: number }>();

  async get(key: string): Promise<string | null> {
    const entry = this.store.get(key);
    if (!entry) return null;

    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return null;
    }

    return entry.value;
  }

  async set(key: string, value: string, ttlMs = 3600000): Promise<void> {
    this.store.set(key, {
      value,
      expiresAt: Date.now() + ttlMs,
    });
  }

  clear(): void {
    this.store.clear();
  }
}
