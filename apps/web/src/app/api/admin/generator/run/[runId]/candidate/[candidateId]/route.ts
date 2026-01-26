/**
 * GET/PATCH /api/admin/generator/run/[runId]/candidate/[candidateId]
 *
 * Get or update a specific candidate.
 * Requires admin access.
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { generatorRepo, isAdmin } from '@/lib/generator-deps';

export const dynamic = 'force-dynamic';

interface RouteParams {
  params: Promise<{
    runId: string;
    candidateId: string;
  }>;
}

/**
 * GET /api/admin/generator/run/[runId]/candidate/[candidateId]
 *
 * Get full candidate details.
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    // Check admin access
    const adminEmail = request.headers.get('x-admin-email');
    if (!isAdmin(adminEmail)) {
      return NextResponse.json(
        { error: { code: 'UNAUTHORIZED', message: 'Admin access required' } },
        { status: 403 }
      );
    }

    const { candidateId } = await params;

    const candidate = await generatorRepo.getCandidate(candidateId);
    if (!candidate) {
      return NextResponse.json(
        { error: { code: 'NOT_FOUND', message: 'Candidate not found' } },
        { status: 404 }
      );
    }

    return NextResponse.json({
      candidate: {
        id: candidate.id,
        runId: candidate.runId,
        level: candidate.level,
        status: candidate.status,
        validation: candidate.validation,
        createdAt: candidate.createdAt,
        spec: candidate.candidate,
      },
    });
  } catch (error) {
    console.error('Error getting candidate:', error);
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Failed to get candidate' } },
      { status: 500 }
    );
  }
}

const UpdateCandidateRequestSchema = z.object({
  status: z.enum(['approved', 'rejected']),
});

/**
 * PATCH /api/admin/generator/run/[runId]/candidate/[candidateId]
 *
 * Update candidate status (approve/reject).
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    // Check admin access
    const adminEmail = request.headers.get('x-admin-email');
    if (!isAdmin(adminEmail)) {
      return NextResponse.json(
        { error: { code: 'UNAUTHORIZED', message: 'Admin access required' } },
        { status: 403 }
      );
    }

    const { candidateId } = await params;
    const body = await request.json();

    const parsed = UpdateCandidateRequestSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: parsed.error.message } },
        { status: 400 }
      );
    }

    const candidate = await generatorRepo.getCandidate(candidateId);
    if (!candidate) {
      return NextResponse.json(
        { error: { code: 'NOT_FOUND', message: 'Candidate not found' } },
        { status: 404 }
      );
    }

    // Check if status transition is valid
    if (candidate.status === 'published') {
      return NextResponse.json(
        { error: { code: 'INVALID_STATE', message: 'Cannot modify published candidate' } },
        { status: 400 }
      );
    }

    const updated = await generatorRepo.updateCandidateStatus(candidateId, parsed.data.status);

    return NextResponse.json({
      candidate: {
        id: updated.id,
        level: updated.level,
        title: updated.candidate.title,
        status: updated.status,
        validation: updated.validation,
      },
    });
  } catch (error) {
    console.error('Error updating candidate:', error);
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Failed to update candidate' } },
      { status: 500 }
    );
  }
}
