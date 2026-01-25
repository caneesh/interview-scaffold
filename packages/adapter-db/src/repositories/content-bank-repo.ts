/**
 * Content Bank Repository Adapter
 *
 * Implements ContentBankRepoPort using Drizzle ORM.
 */

import { eq, and, desc, sql, isNull } from 'drizzle-orm';
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
import type { TenantId } from '@scaffold/core/entities';
import type { Track } from '@scaffold/core/entities';
import type { DbClient } from '../client.js';
import { contentItems, contentVersions } from '../schema.js';

export function createContentBankRepo(db: DbClient): ContentBankRepoPort {
  return {
    async listPublishedContent(
      filter?: ContentFilter
    ): Promise<readonly ContentItemWithVersion[]> {
      // Build conditions for content items
      const conditions = buildFilterConditions(filter);

      // Find content items matching filter
      const items = await db.query.contentItems.findMany({
        where: conditions.length > 0 ? and(...conditions) : undefined,
        orderBy: [desc(contentItems.createdAt)],
        limit: filter?.limit ?? 100,
        offset: filter?.offset ?? 0,
      });

      // Get published versions for each item
      const results: ContentItemWithVersion[] = [];
      for (const item of items) {
        const version = await db.query.contentVersions.findFirst({
          where: and(
            eq(contentVersions.contentItemId, item.id),
            eq(contentVersions.status, 'published')
          ),
        });

        if (version) {
          results.push({
            item: mapToContentItem(item),
            version: mapToContentVersion(version),
          });
        }
      }

      return results;
    },

    async getContentItem(id: ContentItemId): Promise<ContentItem | null> {
      const result = await db.query.contentItems.findFirst({
        where: eq(contentItems.id, id),
      });

      return result ? mapToContentItem(result) : null;
    },

    async getPublishedContentVersion(
      contentItemId: ContentItemId
    ): Promise<ContentVersion | null> {
      const result = await db.query.contentVersions.findFirst({
        where: and(
          eq(contentVersions.contentItemId, contentItemId),
          eq(contentVersions.status, 'published')
        ),
      });

      return result ? mapToContentVersion(result) : null;
    },

    async getContentVersion(id: ContentVersionId): Promise<ContentVersion | null> {
      const result = await db.query.contentVersions.findFirst({
        where: eq(contentVersions.id, id),
      });

      return result ? mapToContentVersion(result) : null;
    },

    async getContentBySlug(
      tenantId: TenantId | null,
      track: Track,
      slug: string
    ): Promise<ContentItemWithVersion | null> {
      const conditions = [
        eq(contentItems.track, track),
        eq(contentItems.slug, slug),
      ];

      if (tenantId === null) {
        conditions.push(isNull(contentItems.tenantId));
      } else {
        conditions.push(eq(contentItems.tenantId, tenantId));
      }

      const item = await db.query.contentItems.findFirst({
        where: and(...conditions),
      });

      if (!item) return null;

      const version = await db.query.contentVersions.findFirst({
        where: and(
          eq(contentVersions.contentItemId, item.id),
          eq(contentVersions.status, 'published')
        ),
      });

      if (!version) return null;

      return {
        item: mapToContentItem(item),
        version: mapToContentVersion(version),
      };
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
      // Insert content item
      const [insertedItem] = await db
        .insert(contentItems)
        .values({
          tenantId: params.tenantId,
          track: params.track,
          slug: params.slug,
          title: params.title,
          summary: params.summary ?? null,
          difficulty: params.difficulty,
          pattern: params.pattern ?? null,
          rung: params.rung ?? null,
          tags: (params.tags ?? []) as string[],
          estimatedTimeMinutes: params.estimatedTimeMinutes ?? null,
        })
        .returning();

      if (!insertedItem) {
        throw new Error('Failed to insert content item');
      }

      // Insert initial draft version
      const [insertedVersion] = await db
        .insert(contentVersions)
        .values({
          contentItemId: insertedItem.id,
          version: 1,
          status: 'draft',
          body: params.body as Record<string, unknown>,
          schemaVersion: params.schemaVersion ?? 1,
        })
        .returning();

      if (!insertedVersion) {
        throw new Error('Failed to insert content version');
      }

      return {
        item: mapToContentItem(insertedItem),
        version: mapToContentVersion(insertedVersion),
      };
    },

    async createContentVersion(params: {
      contentItemId: ContentItemId;
      body: ContentBody;
      schemaVersion?: number;
    }): Promise<ContentVersion> {
      // Get the latest version number
      const latestVersion = await db.query.contentVersions.findFirst({
        where: eq(contentVersions.contentItemId, params.contentItemId),
        orderBy: [desc(contentVersions.version)],
      });

      const nextVersion = (latestVersion?.version ?? 0) + 1;

      const [insertedVersion] = await db
        .insert(contentVersions)
        .values({
          contentItemId: params.contentItemId,
          version: nextVersion,
          status: 'draft',
          body: params.body as Record<string, unknown>,
          schemaVersion: params.schemaVersion ?? 1,
        })
        .returning();

      if (!insertedVersion) {
        throw new Error('Failed to insert content version');
      }

      return mapToContentVersion(insertedVersion);
    },

    async publishContentVersion(
      versionId: ContentVersionId
    ): Promise<ContentVersion> {
      // Get the version to publish
      const version = await db.query.contentVersions.findFirst({
        where: eq(contentVersions.id, versionId),
      });

      if (!version) {
        throw new Error(`Content version not found: ${versionId}`);
      }

      // Archive any existing published version
      await db
        .update(contentVersions)
        .set({ status: 'archived' })
        .where(
          and(
            eq(contentVersions.contentItemId, version.contentItemId),
            eq(contentVersions.status, 'published')
          )
        );

      // Publish the new version
      const [publishedVersion] = await db
        .update(contentVersions)
        .set({
          status: 'published',
          publishedAt: new Date(),
        })
        .where(eq(contentVersions.id, versionId))
        .returning();

      if (!publishedVersion) {
        throw new Error(`Failed to publish content version: ${versionId}`);
      }

      return mapToContentVersion(publishedVersion);
    },

    async archiveContentVersion(
      versionId: ContentVersionId
    ): Promise<ContentVersion> {
      const [archivedVersion] = await db
        .update(contentVersions)
        .set({ status: 'archived' })
        .where(eq(contentVersions.id, versionId))
        .returning();

      if (!archivedVersion) {
        throw new Error(`Content version not found: ${versionId}`);
      }

      return mapToContentVersion(archivedVersion);
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
      const updateValues: Record<string, unknown> = {};

      if (updates.title !== undefined) updateValues.title = updates.title;
      if (updates.summary !== undefined) updateValues.summary = updates.summary;
      if (updates.difficulty !== undefined) updateValues.difficulty = updates.difficulty;
      if (updates.pattern !== undefined) updateValues.pattern = updates.pattern;
      if (updates.rung !== undefined) updateValues.rung = updates.rung;
      if (updates.tags !== undefined) updateValues.tags = updates.tags as string[];
      if (updates.estimatedTimeMinutes !== undefined) {
        updateValues.estimatedTimeMinutes = updates.estimatedTimeMinutes;
      }

      const [updatedItem] = await db
        .update(contentItems)
        .set(updateValues)
        .where(eq(contentItems.id, id))
        .returning();

      if (!updatedItem) {
        throw new Error(`Content item not found: ${id}`);
      }

      return mapToContentItem(updatedItem);
    },

    async countContent(filter?: ContentFilter): Promise<number> {
      const conditions = buildFilterConditions(filter);

      const result = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(contentItems)
        .where(conditions.length > 0 ? and(...conditions) : undefined);

      return result[0]?.count ?? 0;
    },
  };
}

function buildFilterConditions(filter?: ContentFilter) {
  const conditions = [];

  if (filter?.tenantId !== undefined) {
    if (filter.tenantId === null) {
      conditions.push(isNull(contentItems.tenantId));
    } else {
      conditions.push(eq(contentItems.tenantId, filter.tenantId));
    }
  }
  if (filter?.track) {
    conditions.push(eq(contentItems.track, filter.track));
  }
  if (filter?.difficulty) {
    conditions.push(eq(contentItems.difficulty, filter.difficulty));
  }
  if (filter?.pattern) {
    conditions.push(eq(contentItems.pattern, filter.pattern));
  }
  if (filter?.rung !== undefined) {
    conditions.push(eq(contentItems.rung, filter.rung));
  }

  return conditions;
}

function mapToContentItem(
  row: typeof contentItems.$inferSelect
): ContentItem {
  return {
    id: row.id,
    tenantId: row.tenantId,
    track: row.track as Track,
    slug: row.slug,
    title: row.title,
    summary: row.summary,
    difficulty: row.difficulty as ContentDifficulty,
    pattern: row.pattern,
    rung: row.rung,
    tags: (row.tags ?? []) as string[],
    estimatedTimeMinutes: row.estimatedTimeMinutes,
    createdAt: row.createdAt,
  };
}

function mapToContentVersion(
  row: typeof contentVersions.$inferSelect
): ContentVersion {
  return {
    id: row.id,
    contentItemId: row.contentItemId,
    version: row.version,
    status: row.status as ContentVersion['status'],
    body: row.body as ContentBody,
    schemaVersion: row.schemaVersion,
    createdAt: row.createdAt,
    publishedAt: row.publishedAt,
  };
}
