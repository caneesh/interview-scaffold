/**
 * Dependency injection - wires adapters to core ports
 * This is the only place where adapters are instantiated
 */

import { createDbClient } from '@scaffold/adapter-db';
import { createAttemptRepo, createSkillRepo, createContentRepo } from '@scaffold/adapter-db';
import { createDemoAuthProvider } from '@scaffold/adapter-auth';
import { createConsoleEventSink } from '@scaffold/adapter-analytics';
import { SystemClock, SimpleIdGenerator } from '@scaffold/core/ports';
import type { AttemptRepo, SkillRepo, ContentRepo, EventSink, Clock, IdGenerator } from '@scaffold/core/ports';

// Database client (singleton)
const db = createDbClient(process.env.DATABASE_URL!);

// Repositories
export const attemptRepo: AttemptRepo = createAttemptRepo(db);
export const skillRepo: SkillRepo = createSkillRepo(db);
export const contentRepo: ContentRepo = createContentRepo(db);

// Event sink
export const eventSink: EventSink = createConsoleEventSink();

// Clock
export const clock: Clock = SystemClock;

// ID Generator
export const idGenerator: IdGenerator = SimpleIdGenerator;

// Auth provider factory
export function getAuthProvider(tenantId: string, userId: string) {
  return createDemoAuthProvider(tenantId, userId);
}
