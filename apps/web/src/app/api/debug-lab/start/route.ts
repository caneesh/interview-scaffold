import { NextRequest, NextResponse } from 'next/server';
import { debugLabRepo } from '@/lib/debug-lab-repo';
import { idGenerator, clock } from '@/lib/deps';
import { DEMO_TENANT_ID, DEMO_USER_ID } from '@/lib/constants';
import { StartDebugLabRequestSchema } from '@scaffold/contracts';
import type { DebugLabAttempt } from '@scaffold/core';

/**
 * POST /api/debug-lab/start
 *
 * Start a new debug lab attempt
 */
export async function POST(request: NextRequest) {
  try {
    const tenantId = request.headers.get('x-tenant-id') ?? DEMO_TENANT_ID;
    const userId = request.headers.get('x-user-id') ?? DEMO_USER_ID;

    const body = await request.json();
    const parsed = StartDebugLabRequestSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: parsed.error.message } },
        { status: 400 }
      );
    }

    const { itemId } = parsed.data;

    // Verify item exists
    const item = await debugLabRepo.findItemById(tenantId, itemId);
    if (!item) {
      return NextResponse.json(
        { error: { code: 'NOT_FOUND', message: 'Debug lab item not found' } },
        { status: 404 }
      );
    }

    // Count existing attempts
    const attemptCount = await debugLabRepo.countUserAttemptsForItem(tenantId, userId, itemId);

    // Create new attempt
    const attempt: DebugLabAttempt = {
      id: idGenerator.generate(),
      tenantId,
      userId,
      itemId,
      status: 'STARTED',
      triageAnswers: null,
      triageScore: null,
      submission: null,
      executionResult: null,
      testRunCount: 0,
      submissionCount: attemptCount + 1,
      startedAt: clock.now(),
      completedAt: null,
    };

    await debugLabRepo.createAttempt(attempt);

    // Return attempt with safe item (no solution)
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
    };

    return NextResponse.json({ attempt, item: safeItem });
  } catch (error) {
    console.error('Error starting debug lab attempt:', error);
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Failed to start attempt' } },
      { status: 500 }
    );
  }
}
