/**
 * @learning/core
 *
 * Pure TypeScript domain logic for the scaffolded learning platform.
 * NO framework dependencies - only domain entities, use-cases, policies, and ports.
 */

// Entities
export * from './entities/index.js';

// Ports (interfaces)
export * from './ports/index.js';

// Policies (constants and rules)
export * from './policies/index.js';

// Use-cases
export * from './use-cases/index.js';

// Validation engine
export * from './validation/index.js';

// MEP (Minimum Effective Practice) engine
export * from './mep/index.js';

// Micro-drills and Pattern Discovery
export * from './drills/index.js';

// Sample content for testing/seeding
export * from './sample-content/index.js';

// Analytics
export * from './analytics/index.js';
