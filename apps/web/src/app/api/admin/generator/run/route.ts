/**
 * POST /api/admin/generator/run
 *
 * Create a new generation run for a pattern.
 * Requires admin access.
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createGenerationRun, generateCandidates } from '@scaffold/core/use-cases';
import { createMockLLMGenerator } from '@scaffold/core/adapters/mock-llm-generator';
import { generatorRepo, idGenerator, isAdmin } from '@/lib/generator-deps';

export const dynamic = 'force-dynamic';

const CreateRunRequestSchema = z.object({
  patternId: z.string().min(1),
  targetCount: z.number().int().min(1).max(50).default(10),
  promptVersion: z.string().default('v1'),
  seed: z.string().optional(),
});

/**
 * POST /api/admin/generator/run
 *
 * Create a new generation run and optionally start generation.
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
    const parsed = CreateRunRequestSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: parsed.error.message } },
        { status: 400 }
      );
    }

    const { patternId, targetCount, promptVersion, seed } = parsed.data;

    // Create the LLM generator (mock for now)
    const llmGenerator = createMockLLMGenerator();

    // Create the generation run
    const { run, isNew } = await createGenerationRun(
      {
        track: 'coding_interview',
        patternId,
        targetCount,
        promptVersion,
        model: llmGenerator.getModelId(),
        seed,
        createdBy: adminEmail ?? undefined,
      },
      { generatorRepo, idGenerator }
    );

    if (!isNew) {
      return NextResponse.json({
        run,
        isNew: false,
        message: 'Run with same inputs already exists',
      });
    }

    // Start generation immediately
    const result = await generateCandidates(
      { runId: run.id },
      { generatorRepo, llmGenerator, idGenerator }
    );

    return NextResponse.json({
      run: result.run,
      isNew: true,
      candidates: result.candidates.map(c => ({
        id: c.id,
        level: c.level,
        title: c.candidate.title,
        status: c.status,
        validation: c.validation,
      })),
      metrics: {
        totalGenerated: result.totalGenerated,
        validCount: result.validCount,
        duplicatesRemoved: result.duplicatesRemoved,
      },
    });
  } catch (error) {
    console.error('Error creating generation run:', error);
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Failed to create generation run' } },
      { status: 500 }
    );
  }
}

/**
 * GET /api/admin/generator/run
 *
 * List generation runs.
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

    const { searchParams } = new URL(request.url);
    const patternId = searchParams.get('patternId') ?? undefined;
    const status = searchParams.get('status') as 'queued' | 'running' | 'succeeded' | 'failed' | undefined;
    const limitParam = searchParams.get('limit');
    const limit = limitParam ? parseInt(limitParam, 10) : 20;

    const runs = await generatorRepo.listRuns({
      track: 'coding_interview',
      patternId,
      status,
      limit,
    });

    return NextResponse.json({
      runs: runs.map(r => ({
        id: r.id,
        patternId: r.patternId,
        targetCount: r.targetCount,
        promptVersion: r.promptVersion,
        model: r.model,
        status: r.status,
        metrics: r.metrics,
        createdBy: r.createdBy,
        createdAt: r.createdAt,
        completedAt: r.completedAt,
      })),
    });
  } catch (error) {
    console.error('Error listing generation runs:', error);
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Failed to list generation runs' } },
      { status: 500 }
    );
  }
}
