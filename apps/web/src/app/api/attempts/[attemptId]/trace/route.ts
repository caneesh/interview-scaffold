import { NextRequest, NextResponse } from 'next/server';
import { TraceExecutionRequestSchema } from '@scaffold/contracts';
import { createTraceExecutor } from '@scaffold/adapter-piston';
import { pistonClient } from '@/lib/deps';
import { DEMO_TENANT_ID, DEMO_USER_ID } from '@/lib/constants';

/**
 * POST /api/attempts/[attemptId]/trace
 *
 * Execute code with trace capture for visualization.
 * This is an optional enhancement that runs alongside normal execution.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { attemptId: string } }
) {
  try {
    const tenantId = request.headers.get('x-tenant-id') ?? DEMO_TENANT_ID;
    const userId = request.headers.get('x-user-id') ?? DEMO_USER_ID;

    const body = await request.json();
    const parsed = TraceExecutionRequestSchema.safeParse({
      ...body,
      attemptId: params.attemptId,
    });

    if (!parsed.success) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: parsed.error.message } },
        { status: 400 }
      );
    }

    const { code, language, testInput, autoInsert } = parsed.data;

    // Create trace executor
    const traceExecutor = createTraceExecutor({
      client: pistonClient,
      runTimeout: 10000,
      compileTimeout: 15000,
    });

    // Execute with trace
    const result = await traceExecutor.executeWithTrace(
      code,
      language,
      testInput,
      autoInsert ?? true
    );

    return NextResponse.json({
      trace: result.trace,
      insertionHint: result.insertionHint,
      instrumentedCode: result.instrumentedCode,
    });
  } catch (error) {
    console.error('Trace execution error:', error);

    if (error instanceof Error && 'code' in error) {
      return NextResponse.json(
        { error: { code: (error as { code: string }).code, message: error.message } },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'An unexpected error occurred' } },
      { status: 500 }
    );
  }
}
