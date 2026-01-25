/**
 * Content Bank Repository Port
 *
 * Port interface for content bank access (content items and versions).
 */

import type { TenantId } from '../entities/tenant.js';
import type { Track } from '../entities/track.js';
import type {
  ContentItem,
  ContentItemId,
  ContentVersion,
  ContentVersionId,
  ContentVersionStatus,
  ContentFilter,
  ContentItemWithVersion,
  ContentBody,
  ContentDifficulty,
} from '../entities/content-item.js';

/**
 * Content Bank Repository Port
 */
export interface ContentBankRepoPort {
  /**
   * List published content items with their versions
   */
  listPublishedContent(
    filter?: ContentFilter
  ): Promise<readonly ContentItemWithVersion[]>;

  /**
   * Get a specific content item by ID
   */
  getContentItem(id: ContentItemId): Promise<ContentItem | null>;

  /**
   * Get the published version of a content item
   */
  getPublishedContentVersion(
    contentItemId: ContentItemId
  ): Promise<ContentVersion | null>;

  /**
   * Get a specific content version by ID
   */
  getContentVersion(id: ContentVersionId): Promise<ContentVersion | null>;

  /**
   * Get content item by slug (within a track and tenant)
   */
  getContentBySlug(
    tenantId: TenantId | null,
    track: Track,
    slug: string
  ): Promise<ContentItemWithVersion | null>;

  /**
   * Create a new content item with an initial draft version
   */
  createContentItemDraft(params: {
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
  }): Promise<{ item: ContentItem; version: ContentVersion }>;

  /**
   * Create a new version of an existing content item
   */
  createContentVersion(params: {
    contentItemId: ContentItemId;
    body: ContentBody;
    schemaVersion?: number;
  }): Promise<ContentVersion>;

  /**
   * Publish a content version (archives previous published version if any)
   */
  publishContentVersion(
    versionId: ContentVersionId
  ): Promise<ContentVersion>;

  /**
   * Archive a content version
   */
  archiveContentVersion(
    versionId: ContentVersionId
  ): Promise<ContentVersion>;

  /**
   * Update content item metadata
   */
  updateContentItem(
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
  ): Promise<ContentItem>;

  /**
   * Count content items matching filter
   */
  countContent(filter?: ContentFilter): Promise<number>;
}
