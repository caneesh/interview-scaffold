import { NextRequest, NextResponse } from 'next/server';
import { debugLabRepo } from '@/lib/debug-lab-repo';
import { DEMO_TENANT_ID, DEMO_USER_ID } from '@/lib/constants';

/**
 * GET /api/debug-lab/next
 *
 * Get the next recommended debug lab item for the user
 */
export async function GET(request: NextRequest) {
  try {
    const tenantId = request.headers.get('x-tenant-id') ?? DEMO_TENANT_ID;
    const userId = request.headers.get('x-user-id') ?? DEMO_USER_ID;

    const item = await debugLabRepo.getNextItem(tenantId, userId);

    if (!item) {
      return NextResponse.json({
        item: null,
        reason: 'All debug lab challenges completed! Check back later for new challenges.',
      });
    }

    // Return client-safe item
    const safeItem = {
      id: item.id,
      tenantId: item.tenantId,
      title: item.title,
      description: item.description,
      difficulty: item.difficulty,
      language: item.language,
      files: item.files,
      testCommand: item.testCommand,
      defectCategory: item.defectCategory,
      severity: item.severity,
      priority: item.priority,
      signals: item.signals,
      toolsExpected: item.toolsExpected,
      requiredTriage: item.requiredTriage,
      observabilitySnapshot: item.observabilitySnapshot,
      createdAt: item.createdAt,
      // Don't include: hiddenTests, triageRubric, solutionExplanation, solutionFiles
    };

    return NextResponse.json({
      item: safeItem,
      reason: `Recommended based on difficulty progression (${item.difficulty})`,
    });
  } catch (error) {
    console.error('Error getting next debug lab item:', error);
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Failed to get next item' } },
      { status: 500 }
    );
  }
}
