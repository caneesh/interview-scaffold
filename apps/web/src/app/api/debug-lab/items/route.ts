import { NextRequest, NextResponse } from 'next/server';
import { debugLabRepo } from '@/lib/debug-lab-repo';
import { DEMO_TENANT_ID } from '@/lib/constants';
import type { DefectCategory, DebugLabDifficulty } from '@scaffold/core';

/**
 * GET /api/debug-lab/items
 *
 * List all debug lab items (client-safe, omits solutions)
 * Query params: category, difficulty
 */
export async function GET(request: NextRequest) {
  try {
    const tenantId = request.headers.get('x-tenant-id') ?? DEMO_TENANT_ID;
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category') as DefectCategory | null;
    const difficulty = searchParams.get('difficulty') as DebugLabDifficulty | null;

    let items = await debugLabRepo.listItems(tenantId);

    // Filter by category if provided
    if (category) {
      items = items.filter(item => item.defectCategory === category);
    }

    // Filter by difficulty if provided
    if (difficulty) {
      items = items.filter(item => item.difficulty === difficulty);
    }

    // Return client-safe items (omit solutions and hidden tests)
    const safeItems = items.map(item => ({
      id: item.id,
      title: item.title,
      description: item.description,
      difficulty: item.difficulty,
      language: item.language,
      defectCategory: item.defectCategory,
      severity: item.severity,
      priority: item.priority,
      signals: item.signals,
      requiredTriage: item.requiredTriage,
      // Don't include: files, hiddenTests, triageRubric, solutionExplanation, solutionFiles
    }));

    return NextResponse.json({ items: safeItems });
  } catch (error) {
    console.error('Error listing debug lab items:', error);
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Failed to list items' } },
      { status: 500 }
    );
  }
}
