/**
 * Generator Dependencies
 *
 * Wires up dependencies for the Pattern Ladder Generator.
 * Uses in-memory repos when database is not configured.
 */

import { randomUUID } from 'crypto';
import type { GeneratorRepoPort, IdGenerator } from '@scaffold/core/ports';
import { createInMemoryGeneratorRepo } from './in-memory-generator-repos';

// ============ Database Mode Detection ============

export const isDatabaseMode = Boolean(process.env.DATABASE_URL);

// ============ Repository Initialization ============

let _generatorRepo: GeneratorRepoPort | null = null;

function initializeGeneratorRepo(): GeneratorRepoPort {
  if (_generatorRepo) {
    return _generatorRepo;
  }

  if (isDatabaseMode) {
    // TODO: Implement database-backed generator repo when ready
    // For now, use in-memory even in DB mode
    console.log('[generator-deps] Database mode detected but using in-memory repo (DB adapter not yet implemented)');
    _generatorRepo = createInMemoryGeneratorRepo();
  } else {
    console.log('[generator-deps] Using in-memory generator repository');
    _generatorRepo = createInMemoryGeneratorRepo();
  }

  return _generatorRepo;
}

// ============ Exported Dependencies ============

export const generatorRepo: GeneratorRepoPort = initializeGeneratorRepo();

export const idGenerator: IdGenerator = {
  generate: () => randomUUID(),
};

// ============ Admin Access Control ============

/**
 * List of admin emails allowed to use the generator.
 * Set via ADMIN_EMAILS env var (comma-separated).
 */
const ADMIN_EMAILS: Set<string> = new Set(
  (process.env.ADMIN_EMAILS ?? '')
    .split(',')
    .map(e => e.trim().toLowerCase())
    .filter(e => e.length > 0)
);

/**
 * Check if an email is an admin
 */
export function isAdmin(email: string | null | undefined): boolean {
  if (!email) return false;

  // In development, allow any email if no ADMIN_EMAILS configured
  if (ADMIN_EMAILS.size === 0 && process.env.NODE_ENV === 'development') {
    return true;
  }

  return ADMIN_EMAILS.has(email.toLowerCase());
}

// Log admin configuration
if (ADMIN_EMAILS.size > 0) {
  console.log(`[generator-deps] Admin access restricted to ${ADMIN_EMAILS.size} email(s)`);
} else if (process.env.NODE_ENV === 'development') {
  console.log('[generator-deps] Development mode: Admin access open (set ADMIN_EMAILS to restrict)');
} else {
  console.log('[generator-deps] Warning: No ADMIN_EMAILS configured - admin API will be inaccessible');
}
