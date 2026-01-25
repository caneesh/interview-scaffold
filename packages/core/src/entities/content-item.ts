/**
 * Content Item - unified content catalog entry
 *
 * Represents a piece of practice content (problem, debug scenario, design exercise)
 * that can have multiple versions (draft, published, archived).
 */

import type { Track } from './track.js';
import type { TenantId } from './tenant.js';

export type ContentItemId = string;
export type ContentVersionId = string;

export type ContentDifficulty = 'easy' | 'medium' | 'hard';

export type ContentVersionStatus = 'draft' | 'published' | 'archived';

export type ContentAuthorRole = 'author' | 'reviewer' | 'editor';

/**
 * Content Item - metadata for a piece of content
 */
export interface ContentItem {
  readonly id: ContentItemId;
  readonly tenantId: TenantId | null; // null for global content
  readonly track: Track;
  readonly slug: string;
  readonly title: string;
  readonly summary: string | null;
  readonly difficulty: ContentDifficulty;
  readonly pattern: string | null; // algorithm pattern or debug category
  readonly rung: number | null; // difficulty ladder level
  readonly tags: readonly string[];
  readonly estimatedTimeMinutes: number | null;
  readonly createdAt: Date;
}

/**
 * Content Version - a specific version of content with body
 */
export interface ContentVersion {
  readonly id: ContentVersionId;
  readonly contentItemId: ContentItemId;
  readonly version: number;
  readonly status: ContentVersionStatus;
  readonly body: ContentBody;
  readonly schemaVersion: number;
  readonly createdAt: Date;
  readonly publishedAt: Date | null;
}

/**
 * Content Body - the actual content payload (varies by track)
 *
 * For coding_interview track, this includes:
 * - statement: problem description
 * - testCases: array of test cases
 * - hints: array of hint strings
 * - targetComplexity: expected time/space complexity
 * - starterCode: optional starter code templates
 *
 * For debug_lab track, this includes:
 * - symptomDescription: description of the bug symptoms
 * - codeArtifacts: buggy code files
 * - expectedFindings: what the user should discover
 * - fixStrategies: valid approaches to fix
 *
 * For system_design track, this includes:
 * - requirements: functional and non-functional
 * - constraints: system constraints
 * - rubric: evaluation criteria
 */
export type ContentBody = Record<string, unknown>;

/**
 * Content Item Author - authorship record
 */
export interface ContentItemAuthor {
  readonly contentItemId: ContentItemId;
  readonly userId: string;
  readonly role: ContentAuthorRole;
  readonly createdAt: Date;
}

/**
 * Content Item with its published version
 */
export interface ContentItemWithVersion {
  readonly item: ContentItem;
  readonly version: ContentVersion;
}

/**
 * Filter options for content queries
 */
export interface ContentFilter {
  readonly tenantId?: TenantId | null;
  readonly track?: Track;
  readonly difficulty?: ContentDifficulty;
  readonly pattern?: string;
  readonly rung?: number;
  readonly tags?: readonly string[];
  readonly limit?: number;
  readonly offset?: number;
}
