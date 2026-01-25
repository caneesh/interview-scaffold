/**
 * Database Smoke Test Helper
 *
 * Provides a lightweight health check for database connectivity.
 * Used by /api/health/db endpoint and can be called programmatically.
 */

import { getDbClientIfAvailable, isDatabaseMode } from '../deps';

export interface DbSmokeTestResult {
  /** Whether the database is configured and reachable */
  readonly ok: boolean;
  /** Mode: 'database' when DATABASE_URL is set, 'memory' otherwise */
  readonly mode: 'database' | 'memory';
  /** Human-readable status message */
  readonly message: string;
  /** Response time in milliseconds (only set for database mode) */
  readonly responseTimeMs?: number;
  /** Error details if check failed (only set on failure) */
  readonly error?: string;
}

/**
 * Performs a smoke test of database connectivity.
 *
 * When in database mode:
 * - Executes a trivial SELECT 1 query
 * - Returns ok: true if the query succeeds, false otherwise
 *
 * When in memory mode:
 * - Always returns ok: true with mode: 'memory'
 *
 * This function never throws - errors are captured in the result.
 */
export async function runDbSmokeTest(): Promise<DbSmokeTestResult> {
  // Check if we're in memory mode
  if (!isDatabaseMode) {
    return {
      ok: true,
      mode: 'memory',
      message: 'Running in memory mode (DATABASE_URL not set)',
    };
  }

  // We're in database mode - attempt to connect and run a trivial query
  const startTime = Date.now();

  try {
    const db = getDbClientIfAvailable();
    if (!db) {
      return {
        ok: false,
        mode: 'database',
        message: 'Database client not available',
        error: 'Failed to obtain database client despite DATABASE_URL being set',
      };
    }

    // Execute a trivial query to verify connectivity
    // Using raw SQL to avoid any schema dependencies
    const result = await db.execute<{ result: number }>(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      'SELECT 1 as result' as any
    );

    const responseTimeMs = Date.now() - startTime;

    // Verify we got a result
    if (!result || !Array.isArray(result) || result.length === 0) {
      return {
        ok: false,
        mode: 'database',
        message: 'Database query returned unexpected result',
        responseTimeMs,
        error: 'SELECT 1 did not return expected result',
      };
    }

    return {
      ok: true,
      mode: 'database',
      message: 'Database connection healthy',
      responseTimeMs,
    };
  } catch (error) {
    const responseTimeMs = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : String(error);

    // Sanitize error message to avoid leaking connection string details
    const sanitizedError = sanitizeErrorMessage(errorMessage);

    return {
      ok: false,
      mode: 'database',
      message: 'Database connection failed',
      responseTimeMs,
      error: sanitizedError,
    };
  }
}

/**
 * Sanitizes error messages to avoid leaking sensitive connection information.
 * Removes any URL-like patterns that might contain credentials.
 */
function sanitizeErrorMessage(message: string): string {
  // Remove anything that looks like a connection string
  // Pattern matches: postgresql://user:password@host:port/database
  const sanitized = message.replace(
    /postgres(ql)?:\/\/[^\s]+/gi,
    'postgresql://***'
  );

  // Also remove any raw IP:port patterns that might be in error messages
  return sanitized.replace(
    /\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}:\d+\b/g,
    '***:***'
  );
}
