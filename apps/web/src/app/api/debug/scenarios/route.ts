import { NextRequest, NextResponse } from 'next/server';
import { ListDebugScenariosQuerySchema } from '@scaffold/contracts';
import { inMemoryDebugScenarioRepo } from '@/lib/debug-track-repos';

/**
 * GET /api/debug/scenarios
 *
 * Lists available debug scenarios with optional filtering.
 * Does NOT expose expectedFindings, fixStrategies, or hintLadder.
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query = {
      category: searchParams.get('category') ?? undefined,
      difficulty: searchParams.get('difficulty') ?? undefined,
      limit: searchParams.get('limit') ?? undefined,
      offset: searchParams.get('offset') ?? undefined,
    };

    const parsed = ListDebugScenariosQuerySchema.safeParse(query);

    if (!parsed.success) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: parsed.error.message } },
        { status: 400 }
      );
    }

    const filter = {
      category: parsed.data.category,
      difficulty: parsed.data.difficulty,
      limit: parsed.data.limit ?? 20,
      offset: parsed.data.offset ?? 0,
    };

    const total = await inMemoryDebugScenarioRepo.count({
      category: filter.category,
      difficulty: filter.difficulty,
    });

    const allScenarios = await inMemoryDebugScenarioRepo.findAll(filter);

    // Map to list item format (exclude sensitive fields)
    const scenarios = allScenarios.map((s) => ({
      id: s.id,
      category: s.category,
      patternKey: s.patternKey,
      difficulty: s.difficulty,
      symptomDescription: s.symptomDescription,
      tags: s.tags,
    }));

    const hasMore = filter.offset + scenarios.length < total;

    return NextResponse.json({
      scenarios,
      total,
      hasMore,
    });
  } catch (error) {
    console.error('Error listing debug scenarios:', error);
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'An unexpected error occurred' } },
      { status: 500 }
    );
  }
}
