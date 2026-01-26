/**
 * POST /api/admin/generator/bulk-run
 *
 * Bulk generate problems for multiple patterns.
 * Requires admin access.
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { bulkGeneratePatterns } from '@scaffold/core/use-cases';
import { createMockLLMGenerator } from '@scaffold/core/adapters/mock-llm-generator';
import {
  generatorRepo,
  contentBankRepo,
  idGenerator,
  isAdmin,
} from '@/lib/generator-deps';

export const dynamic = 'force-dynamic';

const BulkRunRequestSchema = z.object({
  track: z.literal('coding_interview'),
  patternIds: z.array(z.string().min(1)).min(1).max(20),
  targetCountPerPattern: z.number().int().min(1).max(50).default(10),
  promptVersion: z.string().default('v1'),
  seedStrategy: z.enum(['fixed', 'increment', 'timeboxed']).default('increment'),
  concurrency: z.number().int().min(1).max(10).default(3),
  autoApprove: z.boolean().default(false),
  publishAfterApprove: z.boolean().default(false),
  dryRun: z.boolean().default(false),
  force: z.boolean().default(false),
});

/**
 * POST /api/admin/generator/bulk-run
 *
 * Bulk generate problems for multiple patterns with options for:
 * - Concurrency control
 * - Auto-approval based on quality policy
 * - Automatic publishing
 * - Dry run mode
 */
export async function POST(request: NextRequest) {
  try {
    // Check admin access
    const adminEmail = request.headers.get('x-admin-email');
    if (!isAdmin(adminEmail)) {
      return NextResponse.json(
        { error: { code: 'UNAUTHORIZED', message: 'Admin access required' } },
        { status: 403 }
      );
    }

    const body = await request.json();
    const parsed = BulkRunRequestSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid request body',
            details: parsed.error.issues,
          },
        },
        { status: 400 }
      );
    }

    const {
      track,
      patternIds,
      targetCountPerPattern,
      promptVersion,
      seedStrategy,
      concurrency,
      autoApprove,
      publishAfterApprove,
      dryRun,
      force,
    } = parsed.data;

    // Create the LLM generator (mock for now)
    const llmGenerator = createMockLLMGenerator();

    // Run bulk generation
    const result = await bulkGeneratePatterns(
      {
        track,
        patternIds,
        targetCountPerPattern,
        promptVersion,
        seedStrategy,
        concurrency,
        autoApprove,
        publishAfterApprove,
        dryRun,
        force,
        createdBy: adminEmail ?? undefined,
      },
      {
        generatorRepo,
        contentBankRepo,
        llmGenerator,
        idGenerator,
      }
    );

    return NextResponse.json({
      success: true,
      summary: result.summary,
      perPattern: result.perPattern.map((p) => ({
        patternId: p.patternId,
        runId: p.runId,
        status: p.status,
        proposed: p.proposed,
        approved: p.approved,
        published: p.published,
        error: p.error,
        durationMs: p.durationMs,
      })),
    });
  } catch (error) {
    console.error('Error in bulk generation:', error);
    return NextResponse.json(
      {
        error: {
          code: 'INTERNAL_ERROR',
          message:
            error instanceof Error ? error.message : 'Bulk generation failed',
        },
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/admin/generator/bulk-run
 *
 * Get available patterns and bulk run options
 */
export async function GET(request: NextRequest) {
  try {
    // Check admin access
    const adminEmail = request.headers.get('x-admin-email');
    if (!isAdmin(adminEmail)) {
      return NextResponse.json(
        { error: { code: 'UNAUTHORIZED', message: 'Admin access required' } },
        { status: 403 }
      );
    }

    // Return available patterns and configuration options
    const patterns = [
      'SLIDING_WINDOW',
      'TWO_POINTERS',
      'FAST_SLOW_POINTERS',
      'MERGE_INTERVALS',
      'CYCLIC_SORT',
      'IN_PLACE_REVERSAL',
      'BFS',
      'DFS',
      'TWO_HEAPS',
      'SUBSETS',
      'MODIFIED_BINARY_SEARCH',
      'BITWISE_XOR',
      'TOP_K',
      'K_WAY_MERGE',
      'DYNAMIC_PROGRAMMING',
      'TOPOLOGICAL_SORT',
    ];

    return NextResponse.json({
      patterns: patterns.map((id) => ({
        id,
        name: id.replace(/_/g, ' '),
      })),
      seedStrategies: [
        {
          value: 'fixed',
          label: 'Fixed',
          description: 'Same seed for all patterns (most deterministic)',
        },
        {
          value: 'increment',
          label: 'Increment',
          description: 'Unique seed per pattern index',
        },
        {
          value: 'timeboxed',
          label: 'Timeboxed',
          description: 'Seed changes hourly (stable within same hour)',
        },
      ],
      defaults: {
        targetCountPerPattern: 10,
        concurrency: 3,
        seedStrategy: 'increment',
      },
    });
  } catch (error) {
    console.error('Error getting bulk run options:', error);
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Failed to get options' } },
      { status: 500 }
    );
  }
}
