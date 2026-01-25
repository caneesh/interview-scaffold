import { NextRequest, NextResponse } from 'next/server';
import {
  CreateSubmissionRequestSchema,
  ListSubmissionsRequestSchema,
} from '@scaffold/contracts';
import { submissionsRepo, attemptRepo, idGenerator, clock } from '@/lib/deps';
import { DEMO_TENANT_ID, DEMO_USER_ID } from '@/lib/constants';

/**
 * POST /api/attempts/[attemptId]/submissions
 *
 * Creates a new submission for an attempt.
 * Submissions can be code, text, diagrams, gate answers, etc.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { attemptId: string } }
) {
  try {
    const tenantId = request.headers.get('x-tenant-id') ?? DEMO_TENANT_ID;
    const userId = request.headers.get('x-user-id') ?? DEMO_USER_ID;
    const { attemptId } = params;

    // Verify the attempt exists and belongs to the user
    const attempt = await attemptRepo.findById(tenantId, attemptId);
    if (!attempt) {
      return NextResponse.json(
        { error: { code: 'ATTEMPT_NOT_FOUND', message: 'Attempt not found' } },
        { status: 404 }
      );
    }

    if (attempt.userId !== userId) {
      return NextResponse.json(
        { error: { code: 'FORBIDDEN', message: 'Attempt does not belong to user' } },
        { status: 403 }
      );
    }

    // Parse and validate request body
    const body = await request.json();
    const parsed = CreateSubmissionRequestSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: parsed.error.message } },
        { status: 400 }
      );
    }

    const { type, language, contentText, contentJson, isFinal } = parsed.data;

    // Create the submission
    const submission = await submissionsRepo.createSubmission({
      id: idGenerator.generate(),
      attemptId,
      userId,
      type,
      language: language ?? null,
      contentText: contentText ?? null,
      contentJson: contentJson ?? {},
      isFinal: isFinal ?? false,
    });

    return NextResponse.json({ submission }, { status: 201 });
  } catch (error) {
    console.error('Error creating submission:', error);
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Failed to create submission' } },
      { status: 500 }
    );
  }
}

/**
 * GET /api/attempts/[attemptId]/submissions
 *
 * Lists submissions for an attempt.
 *
 * Query params:
 * - type: filter by submission type
 * - limit: max number of results (default: 50)
 * - offset: pagination offset (default: 0)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { attemptId: string } }
) {
  try {
    const tenantId = request.headers.get('x-tenant-id') ?? DEMO_TENANT_ID;
    const userId = request.headers.get('x-user-id') ?? DEMO_USER_ID;
    const { attemptId } = params;

    // Verify the attempt exists and belongs to the user
    const attempt = await attemptRepo.findById(tenantId, attemptId);
    if (!attempt) {
      return NextResponse.json(
        { error: { code: 'ATTEMPT_NOT_FOUND', message: 'Attempt not found' } },
        { status: 404 }
      );
    }

    if (attempt.userId !== userId) {
      return NextResponse.json(
        { error: { code: 'FORBIDDEN', message: 'Attempt does not belong to user' } },
        { status: 403 }
      );
    }

    // Parse query params
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') ?? undefined;
    const limitParam = searchParams.get('limit');
    const offsetParam = searchParams.get('offset');
    const limit = limitParam ? parseInt(limitParam, 10) : 50;
    const offset = offsetParam ? parseInt(offsetParam, 10) : 0;

    // Validate with Zod
    const parsed = ListSubmissionsRequestSchema.safeParse({
      type,
      limit,
      offset,
    });

    if (!parsed.success) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: parsed.error.message } },
        { status: 400 }
      );
    }

    // Get submissions
    const submissions = await submissionsRepo.listSubmissionsForAttempt(attemptId, {
      type: parsed.data.type,
      limit: parsed.data.limit,
      offset: parsed.data.offset,
    });

    // Get total count
    const total = await submissionsRepo.countSubmissionsForAttempt(
      attemptId,
      parsed.data.type
    );

    return NextResponse.json({
      submissions,
      total,
    });
  } catch (error) {
    console.error('Error listing submissions:', error);
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Failed to list submissions' } },
      { status: 500 }
    );
  }
}
