import { NextRequest, NextResponse } from 'next/server';
import { getSkillMatrix } from '@scaffold/core/use-cases';
import { skillRepo } from '@/lib/deps';
import { DEMO_TENANT_ID, DEMO_USER_ID } from '@/lib/constants';

export const dynamic = 'force-dynamic';

/**
 * GET /api/skills
 *
 * Returns the user's skill matrix
 */
export async function GET(request: NextRequest) {
  try {
    const tenantId = request.headers.get('x-tenant-id') ?? DEMO_TENANT_ID;
    const userId = request.headers.get('x-user-id') ?? DEMO_USER_ID;

    const result = await getSkillMatrix(
      { tenantId, userId },
      { skillRepo }
    );

    return NextResponse.json({
      skills: result.matrix.skills,
      unlockedRungs: result.unlockedRungs,
      recommendedNext: result.recommendedNext,
    });
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'An unexpected error occurred' } },
      { status: 500 }
    );
  }
}
