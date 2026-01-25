/**
 * GET /api/health/db
 *
 * Database health check endpoint.
 * Returns database connectivity status and response time.
 *
 * Security: This endpoint is disabled in production to prevent
 * information leakage about database infrastructure.
 */

import { NextResponse } from 'next/server';
import { runDbSmokeTest } from '@/lib/db/smoke';

export const dynamic = 'force-dynamic';

// Helper to check if running in production (avoids TypeScript narrowing issues)
const isProduction = (): boolean => {
  return (process.env.NODE_ENV as string) === 'production';
};

export async function GET() {
  // Guard: Disable in production
  if (isProduction()) {
    return NextResponse.json(
      {
        error: {
          code: 'ENDPOINT_DISABLED',
          message: 'Health check endpoint is disabled in production',
        },
      },
      { status: 403 }
    );
  }

  try {
    const result = await runDbSmokeTest();

    // Return appropriate status code based on health
    const status = result.ok ? 200 : 503;

    return NextResponse.json(
      {
        ok: result.ok,
        mode: result.mode,
        message: result.message,
        responseTimeMs: result.responseTimeMs,
        // Only include error in non-production (extra safety)
        ...(result.error && !isProduction() ? { error: result.error } : {}),
      },
      { status }
    );
  } catch (error) {
    // Unexpected error in the health check itself
    console.error('[health/db] Unexpected error:', error);

    return NextResponse.json(
      {
        ok: false,
        mode: 'unknown',
        message: 'Health check failed unexpectedly',
        error: !isProduction()
          ? error instanceof Error
            ? error.message
            : String(error)
          : undefined,
      },
      { status: 500 }
    );
  }
}
