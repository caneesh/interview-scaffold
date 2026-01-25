/**
 * Problem <-> Content Bridge
 *
 * Provides mapping functions between the legacy Problem entity and the new
 * ContentItem/ContentVersion entities. This allows existing code to work
 * with the new content bank system while maintaining backwards compatibility.
 *
 * ## Current Status
 *
 * This module provides the MAPPING FUNCTIONS only. The actual repository
 * implementation that reads from both content bank and legacy tables is
 * planned as a follow-up.
 *
 * ## TODO: Follow-up PR needed for ContentRepoWithFallback
 *
 * The architecture plan (TRACKF_ARCHITECTURE_PLAN.md) describes a
 * `createContentRepoWithFallback` that should:
 *
 * 1. Check `USE_CONTENT_BANK` feature flag
 * 2. When enabled: Read from content_items/content_versions first, fall back to problems
 * 3. When disabled: Read from problems table only (current behavior)
 * 4. Support gradual migration with feature flags
 *
 * Implementation location: packages/adapter-db/src/repositories/content-repo-bridge.ts
 *
 * Migration path:
 * 1. Implement ContentRepoWithFallback in follow-up PR
 * 2. Add USE_CONTENT_BANK feature flag to .env
 * 3. Update deps.ts to use bridge repo when flag is enabled
 * 4. ETL existing problems to content bank
 * 5. Enable feature flag gradually (10% → 50% → 100%)
 *
 * @see TRACKF_ARCHITECTURE_PLAN.md section 2.3 for full design
 */

import type { Problem, TestCase, ProblemId } from '../entities/problem.js';
import type { TenantId } from '../entities/tenant.js';
import type { PatternId } from '../entities/pattern.js';
import type { RungLevel } from '../entities/rung.js';
import type { AdversaryPrompt } from '../entities/step.js';
import type {
  ContentItem,
  ContentVersion,
  ContentBody,
  ContentDifficulty,
  ContentItemWithVersion,
} from '../entities/content-item.js';
import type { Track } from '../entities/track.js';

/**
 * Body structure for coding_interview track content
 */
export interface CodingInterviewBody {
  readonly statement: string;
  readonly testCases: readonly TestCase[];
  readonly hints: readonly string[];
  readonly targetComplexity: string;
  readonly starterCode?: Record<string, string>; // language -> code
  readonly adversaryPrompts?: readonly AdversaryPrompt[];
  readonly timeoutBudgetMs?: number;
  readonly largeHiddenTests?: readonly TestCase[];
  // Allow additional properties for forward compatibility
  readonly [key: string]: unknown;
}

/**
 * Map rung level (1-4) to difficulty string
 */
export function rungToDifficulty(rung: RungLevel): ContentDifficulty {
  if (rung <= 1) return 'easy';
  if (rung <= 2) return 'medium';
  return 'hard';
}

/**
 * Map difficulty string to approximate rung level
 */
export function difficultyToRung(difficulty: ContentDifficulty): RungLevel {
  switch (difficulty) {
    case 'easy':
      return 1 as RungLevel;
    case 'medium':
      return 2 as RungLevel;
    case 'hard':
      return 3 as RungLevel;
    default:
      return 2 as RungLevel;
  }
}

/**
 * Convert a Problem entity to ContentItem + ContentVersion
 */
export function problemToContent(problem: Problem): ContentItemWithVersion {
  const item: ContentItem = {
    id: problem.id,
    tenantId: problem.tenantId,
    track: 'coding_interview' as Track,
    slug: generateSlug(problem.title),
    title: problem.title,
    summary: extractSummary(problem.statement),
    difficulty: rungToDifficulty(problem.rung),
    pattern: problem.pattern,
    rung: problem.rung,
    tags: [problem.pattern, `rung-${problem.rung}`],
    estimatedTimeMinutes: estimateTime(problem.rung),
    createdAt: problem.createdAt,
  };

  const body: CodingInterviewBody = {
    statement: problem.statement,
    testCases: problem.testCases,
    hints: problem.hints,
    targetComplexity: problem.targetComplexity,
    adversaryPrompts: problem.adversaryPrompts,
    timeoutBudgetMs: problem.timeoutBudgetMs,
    largeHiddenTests: problem.largeHiddenTests,
  };

  const version: ContentVersion = {
    id: `${problem.id}-v1`, // Synthetic version ID
    contentItemId: problem.id,
    version: 1,
    status: 'published',
    body: body as ContentBody,
    schemaVersion: 1,
    createdAt: problem.createdAt,
    publishedAt: problem.createdAt,
  };

  return { item, version };
}

/**
 * Convert ContentItem + ContentVersion back to Problem entity
 */
export function contentToProblem(
  item: ContentItem,
  version: ContentVersion
): Problem {
  if (item.track !== 'coding_interview') {
    throw new Error(
      `Cannot convert ${item.track} content to Problem - only coding_interview track is supported`
    );
  }

  const body = version.body as CodingInterviewBody;

  return {
    id: item.id as ProblemId,
    tenantId: item.tenantId as TenantId,
    title: item.title,
    statement: body.statement,
    pattern: (item.pattern ?? 'unknown') as PatternId,
    rung: (item.rung ?? difficultyToRung(item.difficulty)) as RungLevel,
    targetComplexity: body.targetComplexity,
    testCases: body.testCases,
    hints: body.hints,
    adversaryPrompts: body.adversaryPrompts,
    timeoutBudgetMs: body.timeoutBudgetMs,
    largeHiddenTests: body.largeHiddenTests,
    createdAt: item.createdAt,
  };
}

/**
 * Generate a URL-safe slug from a title
 */
function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .substring(0, 100);
}

/**
 * Extract a summary from the problem statement (first 200 chars)
 */
function extractSummary(statement: string): string {
  const cleaned = statement.replace(/\s+/g, ' ').trim();
  if (cleaned.length <= 200) return cleaned;
  return cleaned.substring(0, 197) + '...';
}

/**
 * Estimate time based on rung level
 */
function estimateTime(rung: RungLevel): number {
  switch (rung) {
    case 1:
      return 15;
    case 2:
      return 25;
    case 3:
      return 35;
    case 4:
      return 45;
    default:
      return 30;
  }
}

/**
 * Type guard to check if content body is a CodingInterviewBody
 */
export function isCodingInterviewBody(
  body: unknown
): body is CodingInterviewBody {
  return (
    typeof body === 'object' &&
    body !== null &&
    'statement' in body &&
    'testCases' in body &&
    Array.isArray((body as { testCases: unknown }).testCases)
  );
}
