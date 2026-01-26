/**
 * In-Memory Content Bank Repository Implementation
 *
 * Provides in-memory storage for content items and versions
 * when a database is not configured.
 */

import { randomUUID } from 'crypto';
import type { ContentBankRepoPort } from '@scaffold/core/ports';
import type {
  ContentItem,
  ContentItemId,
  ContentVersion,
  ContentVersionId,
  ContentFilter,
  ContentItemWithVersion,
  ContentBody,
  ContentDifficulty,
} from '@scaffold/core/entities';
import type { Track } from '@scaffold/core/entities';
import type { TenantId } from '@scaffold/core/entities';

// ============ Global State (persists across hot reloads) ============

declare global {
  // eslint-disable-next-line no-var
  var __contentItemsStore: Map<string, ContentItem> | undefined;
  // eslint-disable-next-line no-var
  var __contentVersionsStore: Map<string, ContentVersion> | undefined;
}

const contentItems = globalThis.__contentItemsStore ?? new Map<string, ContentItem>();
globalThis.__contentItemsStore = contentItems;

const contentVersions = globalThis.__contentVersionsStore ?? new Map<string, ContentVersion>();
globalThis.__contentVersionsStore = contentVersions;

// ============ Repository Implementation ============

export function createInMemoryContentBankRepo(): ContentBankRepoPort {
  return {
    async listPublishedContent(
      filter?: ContentFilter
    ): Promise<readonly ContentItemWithVersion[]> {
      const results: ContentItemWithVersion[] = [];

      for (const item of contentItems.values()) {
        // Apply filters
        if (filter?.track && item.track !== filter.track) continue;
        if (filter?.tenantId && item.tenantId !== filter.tenantId) continue;
        if (filter?.pattern && item.pattern !== filter.pattern) continue;
        if (filter?.difficulty && item.difficulty !== filter.difficulty) continue;

        // Find published version
        const publishedVersion = Array.from(contentVersions.values()).find(
          (v) => v.contentItemId === item.id && v.status === 'published'
        );

        if (publishedVersion) {
          results.push({ item, version: publishedVersion });
        }
      }

      return results;
    },

    async getContentItem(id: ContentItemId): Promise<ContentItem | null> {
      return contentItems.get(id) ?? null;
    },

    async getPublishedContentVersion(
      contentItemId: ContentItemId
    ): Promise<ContentVersion | null> {
      for (const version of contentVersions.values()) {
        if (version.contentItemId === contentItemId && version.status === 'published') {
          return version;
        }
      }
      return null;
    },

    async getContentVersion(id: ContentVersionId): Promise<ContentVersion | null> {
      return contentVersions.get(id) ?? null;
    },

    async getContentBySlug(
      tenantId: TenantId | null,
      track: Track,
      slug: string
    ): Promise<ContentItemWithVersion | null> {
      for (const item of contentItems.values()) {
        if (item.track === track && item.slug === slug && item.tenantId === tenantId) {
          const publishedVersion = Array.from(contentVersions.values()).find(
            (v) => v.contentItemId === item.id && v.status === 'published'
          );
          if (publishedVersion) {
            return { item, version: publishedVersion };
          }
        }
      }
      return null;
    },

    async createContentItemDraft(params: {
      tenantId: TenantId | null;
      track: Track;
      slug: string;
      title: string;
      summary?: string | null;
      difficulty: ContentDifficulty;
      pattern?: string | null;
      rung?: number | null;
      tags?: readonly string[];
      estimatedTimeMinutes?: number | null;
      body: ContentBody;
      schemaVersion?: number;
    }): Promise<{ item: ContentItem; version: ContentVersion }> {
      const itemId = randomUUID() as ContentItemId;
      const versionId = randomUUID() as ContentVersionId;
      const now = new Date();

      const item: ContentItem = {
        id: itemId,
        tenantId: params.tenantId,
        track: params.track,
        slug: params.slug,
        title: params.title,
        summary: params.summary ?? null,
        difficulty: params.difficulty,
        pattern: params.pattern ?? null,
        rung: params.rung ?? null,
        tags: params.tags ? [...params.tags] : [],
        estimatedTimeMinutes: params.estimatedTimeMinutes ?? null,
        createdAt: now,
      };

      const version: ContentVersion = {
        id: versionId,
        contentItemId: itemId,
        version: 1,
        status: 'draft',
        body: params.body,
        schemaVersion: params.schemaVersion ?? 1,
        createdAt: now,
        publishedAt: null,
      };

      contentItems.set(itemId, item);
      contentVersions.set(versionId, version);

      return { item, version };
    },

    async createContentVersion(params: {
      contentItemId: ContentItemId;
      body: ContentBody;
      schemaVersion?: number;
    }): Promise<ContentVersion> {
      const versionId = randomUUID() as ContentVersionId;
      const now = new Date();

      // Find the highest version number for this content item
      let maxVersionNumber = 0;
      for (const version of contentVersions.values()) {
        if (version.contentItemId === params.contentItemId) {
          maxVersionNumber = Math.max(maxVersionNumber, version.version);
        }
      }

      const version: ContentVersion = {
        id: versionId,
        contentItemId: params.contentItemId,
        version: maxVersionNumber + 1,
        status: 'draft',
        body: params.body,
        schemaVersion: params.schemaVersion ?? 1,
        createdAt: now,
        publishedAt: null,
      };

      contentVersions.set(versionId, version);

      return version;
    },

    async publishContentVersion(versionId: ContentVersionId): Promise<ContentVersion> {
      const version = contentVersions.get(versionId);
      if (!version) {
        throw new Error(`Content version not found: ${versionId}`);
      }

      // Archive any existing published version
      for (const [id, v] of contentVersions.entries()) {
        if (v.contentItemId === version.contentItemId && v.status === 'published') {
          const archived: ContentVersion = { ...v, status: 'archived' };
          contentVersions.set(id, archived);
        }
      }

      // Publish this version
      const published: ContentVersion = {
        ...version,
        status: 'published',
        publishedAt: new Date(),
      };
      contentVersions.set(versionId, published);

      return published;
    },

    async archiveContentVersion(versionId: ContentVersionId): Promise<ContentVersion> {
      const version = contentVersions.get(versionId);
      if (!version) {
        throw new Error(`Content version not found: ${versionId}`);
      }

      const archived: ContentVersion = { ...version, status: 'archived' };
      contentVersions.set(versionId, archived);

      return archived;
    },

    async updateContentItem(
      id: ContentItemId,
      updates: Partial<{
        title: string;
        summary: string | null;
        difficulty: ContentDifficulty;
        pattern: string | null;
        rung: number | null;
        tags: readonly string[];
        estimatedTimeMinutes: number | null;
      }>
    ): Promise<ContentItem> {
      const item = contentItems.get(id);
      if (!item) {
        throw new Error(`Content item not found: ${id}`);
      }

      const updated: ContentItem = {
        ...item,
        title: updates.title ?? item.title,
        summary: updates.summary !== undefined ? updates.summary : item.summary,
        difficulty: updates.difficulty ?? item.difficulty,
        pattern: updates.pattern !== undefined ? updates.pattern : item.pattern,
        rung: updates.rung !== undefined ? updates.rung : item.rung,
        tags: updates.tags ? [...updates.tags] : item.tags,
        estimatedTimeMinutes:
          updates.estimatedTimeMinutes !== undefined
            ? updates.estimatedTimeMinutes
            : item.estimatedTimeMinutes,
      };

      contentItems.set(id, updated);

      return updated;
    },

    async countContent(filter?: ContentFilter): Promise<number> {
      const published = await this.listPublishedContent(filter);
      return published.length;
    },
  };
}
