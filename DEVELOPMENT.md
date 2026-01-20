# Developer Setup Guide

This guide provides step-by-step instructions for setting up and developing the Scaffolded Learning Platform locally.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Installation](#installation)
3. [Running the Application](#running-the-application)
4. [Running Tests](#running-tests)
5. [Project Structure](#project-structure)
6. [Common Development Tasks](#common-development-tasks)
7. [Troubleshooting](#troubleshooting)

---

## Prerequisites

### Required

- **Node.js**: Version 18 or higher
  - Check version: `node --version`
  - Current development environment uses: v22.8.0
  - Install from: https://nodejs.org/

- **pnpm**: Version 9.0.0 or higher (package manager)
  - Check version: `pnpm --version`
  - Install globally: `npm install -g pnpm@9.0.0`
  - Current project uses: pnpm 9.0.0 (enforced by `packageManager` field)

### Optional

- **PostgreSQL**: Version 16+ (for database persistence)
  - Not required for development - the app runs in-memory mode by default
  - When needed: Install PostgreSQL 16 or use Docker (see below)

- **Docker & Docker Compose** (for easy PostgreSQL setup)
  - Install from: https://docs.docker.com/get-docker/
  - Used to run PostgreSQL without local installation

- **Anthropic API Key** (for LLM-powered validation features)
  - Optional - heuristic validation works without it
  - Get from: https://console.anthropic.com/

- **Piston API** (for code execution)
  - Optional - defaults to public Piston instance
  - Public endpoint: https://emkc.org/api/v2/piston
  - Or run locally: https://github.com/engineer-man/piston

---

## Installation

### 1. Clone the Repository

```bash
git clone <repository-url>
cd interview-scaffold
```

### 2. Install Dependencies

The project uses pnpm workspaces with Turborepo for monorepo management.

```bash
# Install all dependencies for all packages
pnpm install
```

This will install dependencies for:
- Root workspace
- `/apps/web` (Next.js application)
- `/packages/core` (domain logic)
- `/packages/contracts` (DTOs and schemas)
- `/packages/adapter-*` (database, auth, LLM, Piston, analytics adapters)

### 3. Environment Configuration

The application is designed to work **without any environment setup** for local development. It uses in-memory repositories with 18 seed problems.

#### Option A: In-Memory Mode (Recommended for Quick Start)

**No configuration needed.** Just run `pnpm dev` and start developing.

The application will automatically:
- Use in-memory repositories with seed data
- Skip LLM validation (deterministic heuristics still work)
- Use the public Piston API for code execution

#### Option B: Full Setup with PostgreSQL

If you need database persistence, create `.env.local` in `apps/web/`:

```bash
# Required for database mode
DATABASE_URL=postgresql://scaffold:scaffold@localhost:5432/scaffold

# Optional: Enable LLM validation
ANTHROPIC_API_KEY=sk-ant-your-api-key-here

# Optional: Custom Piston endpoint
PISTON_API_URL=https://emkc.org/api/v2/piston
```

**Reference file**: See `apps/web/.env.example` for the template.

### 4. Database Setup (Optional - Only for PostgreSQL Mode)

#### Using Docker Compose (Easiest)

```bash
# Start PostgreSQL container
docker-compose up -d

# Verify it's running
docker ps | grep scaffold-db
```

The `docker-compose.yml` file creates:
- Container name: `scaffold-db`
- User: `scaffold`
- Password: `scaffold`
- Database: `scaffold`
- Port: `5432`

#### Using Local PostgreSQL

```bash
# Create database and user
psql -U postgres -c "CREATE USER scaffold WITH PASSWORD 'scaffold';"
psql -U postgres -c "CREATE DATABASE scaffold OWNER scaffold;"
```

#### Run Database Migrations

```bash
# Generate migration files (if schema changed)
cd packages/adapter-db
pnpm db:generate

# Apply migrations to database
pnpm db:migrate

# Or push schema directly (dev mode)
pnpm db:push
```

#### Seed the Database

```bash
# Seed problems and initial data
cd apps/web
pnpm db:seed
```

This script (`apps/web/scripts/seed.ts`) creates:
- Demo tenant
- 18 seed problems (BACKTRACKING and INTERVAL_MERGING patterns across 3 rungs)
- Initial skill states

### 5. Build All Packages

Before running the application, build all packages:

```bash
# Build from root
pnpm build
```

This uses Turborepo to build packages in dependency order:
1. `packages/core` (TypeScript compilation)
2. `packages/contracts` (TypeScript compilation)
3. `packages/adapter-*` (TypeScript compilation)
4. `apps/web` (Next.js build)

---

## Running the Application

### Development Mode

#### Start All Packages (Recommended)

```bash
# From root directory
pnpm dev
```

This starts:
- Next.js dev server on http://localhost:3000 (default)
- All package builds in watch mode

#### Start Web App Only

```bash
# From root
pnpm --filter @scaffold/web dev

# Or from apps/web directory
cd apps/web
pnpm dev
```

Access the application at: **http://localhost:3000**

### Development Workflow

The application will run in **in-memory mode by default** (as of current implementation):
- 18 seed problems loaded from `/packages/core/src/data/seed-problems.ts`
- Attempts and skills stored in memory (lost on restart)
- Demo user context: `tenantId: "demo-tenant"`, `userId: "demo-user"`

**Evidence from code**: `/apps/web/src/lib/deps.ts` line 29:
```typescript
console.log('[deps] Using in-memory repositories with seed data (18 problems available)');
```

### Production Build

```bash
# Build optimized production bundle
pnpm build

# Start production server
cd apps/web
pnpm start
```

### Additional Commands

```bash
# Lint all packages
pnpm lint

# Type check all packages
pnpm typecheck

# Clean build artifacts
pnpm clean

# Open Drizzle Studio (database GUI)
cd packages/adapter-db
pnpm db:studio
```

---

## Running Tests

The project uses **Vitest** for unit testing.

### Run All Tests

```bash
# From root - runs tests in all packages
pnpm test
```

### Run Tests for Specific Package

```bash
# Test core domain logic only
pnpm --filter @scaffold/core test

# Test Piston adapter
pnpm --filter @scaffold/adapter-piston test
```

### Run Tests in Watch Mode

```bash
# Navigate to package directory
cd packages/core

# Run tests in watch mode
pnpm test --watch
```

### Test Coverage

Evidence of test coverage exists for:

**Core Domain Tests** (`packages/core/src`):
- `/use-cases/submit-code.test.ts` - Code submission flow
- `/use-cases/compute-attempt-score.test.ts` - Scoring algorithm
- `/use-cases/decide-progression-action.test.ts` - MEP progression logic
- `/use-cases/select-sibling.test.ts` - Sibling problem selection
- `/validation/heuristics.test.ts` - Pattern-specific heuristics
- `/validation/gating.test.ts` - Gating decision engine
- `/validation/rubric.test.ts` - Grading rubric
- `/validation/thinking-gate.test.ts` - Pre-coding gate validation
- `/entities/bug-hunt.test.ts` - Bug hunt mode
- `/entities/debug-lab.test.ts` - Debug lab entity
- `/adversary/adversary.test.ts` - Adversarial test generation
- Additional tests for coaching, features, and data validation

**Test Structure** (inferred from `/packages/core/src/use-cases/submit-code.test.ts`):
- Uses Vitest test framework (`describe`, `it`, `expect`, `vi`, `beforeEach`)
- Mock repositories and ports for isolated unit testing
- Test helpers for creating mock entities (attempts, problems, skills)

### Running Specific Test Files

```bash
cd packages/core
pnpm test src/validation/gating.test.ts
```

---

## Project Structure

The project uses a **monorepo architecture** with Turborepo and pnpm workspaces.

### Directory Layout

```
interview-scaffold/
├── apps/
│   └── web/                          # Next.js 14 application (App Router)
│       ├── src/
│       │   ├── app/                  # App Router pages and layouts
│       │   │   ├── page.tsx          # Home page
│       │   │   ├── practice/         # Practice mode pages
│       │   │   ├── daily/            # Daily session page (UI only)
│       │   │   ├── interview/        # Interview simulator (UI only)
│       │   │   ├── bug-hunt/         # Bug hunt mode
│       │   │   ├── debug-lab/        # Debug lab mode
│       │   │   ├── features/         # Feature showcase
│       │   │   ├── skills/           # Skill matrix page
│       │   │   ├── explorer/         # Problem explorer
│       │   │   └── api/              # API route handlers
│       │   │       ├── attempts/     # Attempt management
│       │   │       ├── problems/     # Problem queries
│       │   │       └── debug-lab/    # Debug lab API
│       │   ├── components/           # React components (UI only, no business logic)
│       │   └── lib/
│       │       ├── deps.ts           # Dependency injection container
│       │       ├── in-memory-repos.ts # In-memory repository implementations
│       │       └── constants.ts      # App-level constants
│       ├── scripts/
│       │   └── seed.ts               # Database seeding script
│       └── package.json
│
├── packages/
│   ├── core/                         # Pure domain logic (NO framework dependencies)
│   │   ├── src/
│   │   │   ├── entities/             # Domain entities
│   │   │   │   ├── attempt.ts        # Attempt state machine
│   │   │   │   ├── problem.ts        # Problem definition
│   │   │   │   ├── skill-state.ts    # Skill tracking (EMA scoring)
│   │   │   │   ├── step.ts           # Attempt step types
│   │   │   │   ├── pattern.ts        # Pattern brand types
│   │   │   │   ├── rung.ts           # Difficulty rung levels
│   │   │   │   ├── bug-hunt.ts       # Bug hunt mode entity
│   │   │   │   └── debug-lab.ts      # Debug lab entity
│   │   │   ├── ports/                # Port interfaces (dependency inversion)
│   │   │   │   ├── attempt-repo.ts   # Attempt repository interface
│   │   │   │   ├── content-repo.ts   # Problem repository interface
│   │   │   │   ├── skill-repo.ts     # Skill repository interface
│   │   │   │   ├── event-sink.ts     # Analytics event interface
│   │   │   │   ├── clock.ts          # Time abstraction (testability)
│   │   │   │   └── id-generator.ts   # ID generation interface
│   │   │   ├── use-cases/            # Application use cases
│   │   │   │   ├── start-attempt.ts  # Start a new attempt
│   │   │   │   ├── submit-code.ts    # Submit and execute code
│   │   │   │   ├── submit-step.ts    # Submit thinking gate/reflection
│   │   │   │   ├── get-next-problem.ts # MEP engine integration
│   │   │   │   ├── compute-attempt-score.ts # Scoring algorithm
│   │   │   │   ├── decide-progression-action.ts # Gating decisions
│   │   │   │   └── select-sibling.ts # Sibling selection
│   │   │   ├── validation/           # Code validation and gating
│   │   │   │   ├── heuristics.ts     # Pattern-specific heuristics
│   │   │   │   ├── gating.ts         # Gating decision logic
│   │   │   │   ├── rubric.ts         # Grading rubric
│   │   │   │   ├── thinking-gate.ts  # Pre-coding validation
│   │   │   │   └── types.ts          # Validation result types
│   │   │   ├── data/                 # Seed data
│   │   │   │   ├── seed-problems.ts  # 18 seed problems
│   │   │   │   └── invariant-templates.ts # Template library
│   │   │   ├── adversary/            # Adversarial test generation
│   │   │   ├── coaching/             # Deterministic coaching rules
│   │   │   ├── features/             # Feature registry and cognitive load governor
│   │   │   └── hints/                # Hint progression system
│   │   └── package.json
│   │
│   ├── contracts/                    # DTOs and Zod schemas (shared types)
│   │   ├── src/
│   │   │   └── schemas.ts            # API request/response schemas
│   │   └── package.json
│   │
│   ├── adapter-db/                   # Drizzle ORM + PostgreSQL
│   │   ├── src/
│   │   │   ├── schema.ts             # Database schema definition
│   │   │   ├── client.ts             # Drizzle client factory
│   │   │   └── repositories/         # Repository implementations
│   │   ├── drizzle/                  # Generated migrations
│   │   ├── drizzle.config.ts         # Drizzle Kit config
│   │   └── package.json
│   │
│   ├── adapter-auth/                 # Authentication context provider
│   │   ├── src/
│   │   │   └── demo-auth.ts          # Demo auth for local dev
│   │   └── package.json
│   │
│   ├── adapter-llm/                  # Anthropic Claude integration
│   │   ├── src/
│   │   │   ├── client.ts             # LLM client wrapper
│   │   │   └── validation-adapter.ts # LLM validation port implementation
│   │   └── package.json
│   │
│   ├── adapter-piston/               # Code execution via Piston API
│   │   ├── src/
│   │   │   ├── piston-client.ts      # HTTP client for Piston
│   │   │   └── piston-executor.ts    # CodeExecutor implementation
│   │   └── package.json
│   │
│   └── adapter-analytics/            # Event tracking
│       ├── src/
│       │   └── console-sink.ts       # Console logging event sink
│       └── package.json
│
├── turbo.json                        # Turborepo build configuration
├── pnpm-workspace.yaml               # pnpm workspace definition
├── tsconfig.base.json                # Shared TypeScript config
├── docker-compose.yml                # PostgreSQL container setup
└── package.json                      # Root package with workspace scripts
```

### Key Package Purposes

| Package | Purpose | Dependencies |
|---------|---------|--------------|
| `@scaffold/core` | Pure domain logic, entities, use cases, validation | **ZERO external dependencies** (only TypeScript + Vitest for tests) |
| `@scaffold/contracts` | DTOs and Zod schemas for API contracts | Zod |
| `@scaffold/adapter-db` | PostgreSQL persistence via Drizzle ORM | drizzle-orm, postgres, @scaffold/core |
| `@scaffold/adapter-auth` | Authentication context (demo mode) | @scaffold/core |
| `@scaffold/adapter-llm` | Claude API integration for LLM validation | @anthropic-ai/sdk, @scaffold/core |
| `@scaffold/adapter-piston` | Code execution sandbox via Piston API | @scaffold/core |
| `@scaffold/adapter-analytics` | Event logging (console sink) | @scaffold/core |
| `@scaffold/web` | Next.js frontend and API routes | All adapters, Next.js, React |

### Architecture Pattern: Hexagonal (Ports & Adapters)

The codebase enforces **strict dependency inversion**:
- **Core domain** (`packages/core`) defines **ports** (interfaces)
- **Adapters** (`packages/adapter-*`) implement ports
- **Web app** (`apps/web`) wires adapters to ports via dependency injection (`lib/deps.ts`)

This design enables:
- **Testability**: Core logic can be tested without databases, APIs, or LLMs
- **Flexibility**: Swap implementations (e.g., in-memory vs. PostgreSQL repos)
- **Framework independence**: Core logic is pure TypeScript, not tied to Next.js

---

## Common Development Tasks

### Adding a New API Endpoint

**Location**: `apps/web/src/app/api/`

**Example**: Add a new endpoint `/api/hints/[attemptId]/next`

1. **Create route directory structure**:
   ```bash
   mkdir -p apps/web/src/app/api/hints/[attemptId]/next
   ```

2. **Create route handler** (`apps/web/src/app/api/hints/[attemptId]/next/route.ts`):
   ```typescript
   import { NextRequest, NextResponse } from 'next/server';
   import { getAuthProvider, attemptRepo, clock } from '@/lib/deps';
   import { getNextHint } from '@scaffold/core/use-cases';

   export async function POST(
     request: NextRequest,
     { params }: { params: { attemptId: string } }
   ) {
     // 1. Get auth context
     const authProvider = getAuthProvider('demo-tenant', 'demo-user');
     const authContext = authProvider.getContext();

     // 2. Fetch dependencies
     const attempt = await attemptRepo.getById(
       authContext.tenantId,
       params.attemptId
     );

     if (!attempt) {
       return NextResponse.json({ error: 'Not found' }, { status: 404 });
     }

     // 3. Call use case
     const result = getNextHint({
       attempt,
       clock,
       attemptRepo,
     });

     // 4. Return response
     return NextResponse.json(result);
   }
   ```

3. **Wire dependencies** in the route handler (already done via `@/lib/deps`)

4. **Test the endpoint**:
   ```bash
   curl -X POST http://localhost:3000/api/hints/attempt-123/next
   ```

### Adding a New Problem

Problems are defined in `packages/core/src/data/seed-problems.ts`.

**Steps**:

1. **Define the problem** in `seed-problems.ts`:
   ```typescript
   const MY_NEW_PROBLEM: SeedProblem = {
     id: 'backtracking-r1-my-problem',
     title: 'My Problem Title',
     statement: `Problem description with examples...`,
     pattern: 'BACKTRACKING',
     rung: 1,
     targetComplexity: 'O(n * 2^n)',
     isCanonical: true,
     testCases: [
       {
         input: '["a","b","c"]',
         expectedOutput: '[["a","b","c"],["a","c","b"],["b","a","c"],["b","c","a"],["c","a","b"],["c","b","a"]]',
         isHidden: false,
       },
       // Add more test cases...
     ],
     hints: [
       'Consider using backtracking with recursion',
       'Track visited elements to avoid duplicates',
     ],
   };
   ```

2. **Add to problem array**:
   ```typescript
   export const SEED_PROBLEMS: SeedProblem[] = [
     // Existing problems...
     MY_NEW_PROBLEM,
   ];
   ```

3. **Reseed the database** (if using PostgreSQL mode):
   ```bash
   cd apps/web
   pnpm db:seed
   ```

4. **Or restart dev server** (if using in-memory mode) - the new problem will be loaded automatically

**Pattern options**: `BACKTRACKING`, `INTERVAL_MERGING` (as of current implementation)

**Rung levels**: `1`, `2`, `3` (Rung 1 = easiest, Rung 3 = hardest)

### Adding a New Feature

The codebase uses a **feature registry** for progressive disclosure of advanced features.

**Example**: Add a new "Code Replay" feature

1. **Register the feature** in `packages/core/src/features/feature-registry.ts`:
   ```typescript
   export const FEATURE_REGISTRY = {
     // Existing features...
     CODE_REPLAY: {
       id: 'CODE_REPLAY',
       name: 'Code Replay',
       description: 'Watch your solution execute step-by-step',
       requiredRungLevel: 2, // Unlocked at Rung 2
       cognitiveLoadWeight: 3, // Medium complexity
     },
   } as const;
   ```

2. **Implement feature logic** in appropriate domain module:
   ```typescript
   // packages/core/src/replay/code-replay.ts
   export function generateReplaySteps(code: string) {
     // Implementation...
   }
   ```

3. **Create API endpoint** (`apps/web/src/app/api/attempts/[attemptId]/replay/route.ts`):
   ```typescript
   import { generateReplaySteps } from '@scaffold/core/replay';
   // ...implementation
   ```

4. **Build UI component** (`apps/web/src/components/CodeReplay.tsx`):
   ```typescript
   'use client';
   import { useState } from 'react';
   export function CodeReplay({ attemptId }: { attemptId: string }) {
     // UI implementation...
   }
   ```

5. **Integrate in practice page** (`apps/web/src/app/practice/[attemptId]/page.tsx`)

### Building Packages

The monorepo uses Turborepo for intelligent caching and parallel builds.

**Build all packages**:
```bash
pnpm build
```

**Build specific package**:
```bash
pnpm --filter @scaffold/core build
```

**Build with dependencies**:
```bash
# Build web app and all its dependencies
pnpm --filter @scaffold/web build
```

**Clean build artifacts**:
```bash
# Clean all packages
pnpm clean

# Clean specific package
cd packages/core
pnpm clean
```

**Turborepo build configuration** (`turbo.json`):
- Builds run in topological order (dependencies first)
- Outputs cached for faster rebuilds
- `dependsOn: ["^build"]` ensures dependencies build first

---

## Troubleshooting

### Common Errors and Solutions

#### 1. `pnpm: command not found`

**Cause**: pnpm is not installed globally.

**Solution**:
```bash
npm install -g pnpm@9.0.0
```

Verify installation:
```bash
pnpm --version  # Should show 9.0.0 or higher
```

---

#### 2. `Error: Cannot find module '@scaffold/core'`

**Cause**: Packages not built or workspace links broken.

**Solution**:
```bash
# Reinstall dependencies and rebuild
pnpm install
pnpm build
```

If still failing:
```bash
# Clean and rebuild from scratch
pnpm clean
rm -rf node_modules
rm pnpm-lock.yaml
pnpm install
pnpm build
```

---

#### 3. `Database connection error: ECONNREFUSED`

**Cause**: PostgreSQL is not running or `DATABASE_URL` is incorrect.

**Solution**:

**If using Docker**:
```bash
# Check if container is running
docker ps | grep scaffold-db

# If not running, start it
docker-compose up -d

# Check logs
docker logs scaffold-db
```

**If using local PostgreSQL**:
```bash
# Check if PostgreSQL is running
pg_isready -U scaffold

# Start PostgreSQL (Ubuntu/Debian)
sudo systemctl start postgresql

# Start PostgreSQL (macOS with Homebrew)
brew services start postgresql@16
```

**Verify `DATABASE_URL`** in `apps/web/.env.local`:
```bash
DATABASE_URL=postgresql://scaffold:scaffold@localhost:5432/scaffold
```

**Alternative**: Use in-memory mode by removing `DATABASE_URL` from `.env.local`.

---

#### 4. `Error: ANTHROPIC_API_KEY not found` (during LLM validation)

**Cause**: LLM validation is enabled but API key is not configured.

**Solution**:

This is **expected behavior** - LLM validation is optional. The application will:
- Skip LLM validation and use deterministic heuristics only
- Log a warning: `[LLM] API key not set - using null validation`

To enable LLM validation, add to `apps/web/.env.local`:
```bash
ANTHROPIC_API_KEY=sk-ant-your-api-key-here
```

Get an API key from: https://console.anthropic.com/

---

#### 5. `Piston API unavailable` (code execution fails)

**Cause**: Piston API is unreachable or rate-limited.

**Solution**:

**Option 1**: Use default public endpoint (already configured):
```bash
# No action needed - this is the default
PISTON_API_URL=https://emkc.org/api/v2/piston
```

**Option 2**: Run local Piston instance:
```bash
# Clone Piston
git clone https://github.com/engineer-man/piston
cd piston

# Start Piston with Docker
docker-compose up -d

# Update .env.local
PISTON_API_URL=http://localhost:2000/api/v2/piston
```

**Option 3**: Check network connectivity:
```bash
curl https://emkc.org/api/v2/piston/runtimes
# Should return list of available runtimes
```

---

#### 6. `Type errors in packages/core`

**Cause**: TypeScript strict mode enabled (`noUncheckedIndexedAccess: true`).

**Solution**:

This is intentional - the codebase enforces strict type safety. Add proper null checks:

**Before**:
```typescript
const attempt = await attemptRepo.getById(tenantId, attemptId);
attempt.state = 'CODING'; // Error: attempt possibly undefined
```

**After**:
```typescript
const attempt = await attemptRepo.getById(tenantId, attemptId);
if (!attempt) {
  throw new Error('Attempt not found');
}
attempt.state = 'CODING'; // OK - attempt is guaranteed to exist
```

Check TypeScript config in `tsconfig.base.json`:
```json
{
  "compilerOptions": {
    "strict": true,
    "noUncheckedIndexedAccess": true
  }
}
```

---

#### 7. `Port 3000 already in use`

**Cause**: Another process is using port 3000.

**Solution**:

**Option 1**: Use a different port:
```bash
PORT=3001 pnpm dev
```

**Option 2**: Find and kill the process:
```bash
# Find process using port 3000
lsof -i :3000

# Kill the process
kill -9 <PID>
```

---

#### 8. `Tests failing after code changes`

**Cause**: Test data or mocks are out of sync with code changes.

**Solution**:

1. **Run tests in watch mode** to see specific failures:
   ```bash
   cd packages/core
   pnpm test --watch
   ```

2. **Update test mocks** to match new entity structure (see `packages/core/src/use-cases/submit-code.test.ts` for examples)

3. **Check for breaking changes** in entity types:
   - `Attempt`, `Problem`, `SkillState`, `Step`
   - Update test helpers: `createMockAttempt()`, `createMockProblem()`, etc.

---

#### 9. `In-memory data lost on restart`

**Cause**: Using in-memory repositories (default mode).

**Explanation**: This is **expected behavior**. In-memory mode is designed for quick development without database setup.

**Solution**:

To persist data, enable PostgreSQL mode:
1. Set up PostgreSQL (see [Database Setup](#4-database-setup-optional---only-for-postgresql-mode))
2. Configure `DATABASE_URL` in `apps/web/.env.local`
3. Modify `apps/web/src/lib/deps.ts` to use database repositories (code already exists but commented out)
4. Restart dev server

---

#### 10. `Turborepo cache stale errors`

**Cause**: Turborepo cache is out of sync with code changes.

**Solution**:
```bash
# Clear Turborepo cache
rm -rf .turbo

# Rebuild all packages
pnpm build
```

---

### Getting Help

**Check existing documentation**:
- `README.md` - Overview and quick start
- `ARCHITECTURE.md` - System architecture and design principles
- `FEATURE_LIST.md` - Comprehensive feature documentation
- `USER_GUIDE.md` - End-user instructions

**Search codebase for examples**:
```bash
# Find similar API routes
find apps/web/src/app/api -name "route.ts"

# Find test examples
find packages/core/src -name "*.test.ts"

# Find entity definitions
ls packages/core/src/entities/
```

**Common file locations**:
- Use case implementations: `packages/core/src/use-cases/`
- Validation logic: `packages/core/src/validation/`
- Seed problems: `packages/core/src/data/seed-problems.ts`
- API routes: `apps/web/src/app/api/`
- Dependency injection: `apps/web/src/lib/deps.ts`

---

## Scope and Limitations

### What This Guide Covers

- Local development setup (in-memory and PostgreSQL modes)
- Running tests and development workflows
- Common development tasks (adding endpoints, problems, features)
- Troubleshooting local development issues

### What This Guide Does NOT Cover

- Production deployment (see `DEPLOYMENT.md`)
- Cloud infrastructure setup
- CI/CD pipeline configuration
- Authentication implementation beyond demo mode
- Performance optimization and scaling
- Contributing guidelines (no CONTRIBUTING.md exists yet)

### Known Limitations (As of Code Analysis)

1. **In-Memory Mode by Default**: Current implementation (`apps/web/src/lib/deps.ts`) uses in-memory repositories even when `DATABASE_URL` is set. Database adapter code exists but is commented out.

2. **Demo Auth Only**: No real authentication system implemented (`packages/adapter-auth` provides demo context only).

3. **Limited Pattern Coverage**: Only BACKTRACKING and INTERVAL_MERGING patterns have seed problems (6 problems each across 3 rungs).

4. **Console-Only Analytics**: Event sink logs to console; no persistent analytics pipeline.

5. **External Piston Dependency**: Code execution requires external Piston API; no fallback executor.

---

## Appendix: Environment Variables Reference

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `DATABASE_URL` | No | (in-memory) | PostgreSQL connection string |
| `ANTHROPIC_API_KEY` | No | (none) | Anthropic API key for LLM validation |
| `PISTON_API_URL` | No | `https://emkc.org/api/v2/piston` | Piston code execution endpoint |
| `PORT` | No | `3000` | Next.js dev server port |
| `NODE_ENV` | No | `development` | Environment mode (`development`, `production`) |

**Example `.env.local`** (full setup):
```bash
# Database
DATABASE_URL=postgresql://scaffold:scaffold@localhost:5432/scaffold

# LLM (optional)
ANTHROPIC_API_KEY=sk-ant-api-key-here

# Code Execution (optional)
PISTON_API_URL=https://emkc.org/api/v2/piston

# Server (optional)
PORT=3000
```

---

**Document Status**: Based on code analysis as of 2026-01-18

**Last Updated**: 2026-01-18

**Assumptions**:
- Node.js version inferred from `package.json` (`"typescript": "^5.4.0"` suggests Node 18+, confirmed by environment check showing v22.8.0)
- In-memory mode behavior confirmed from `apps/web/src/lib/deps.ts` line 29
- Test framework and patterns inferred from `packages/core/src/use-cases/submit-code.test.ts`
- API endpoint structure inferred from directory listing of `apps/web/src/app/api/`
- 18 seed problems confirmed from SEED_PROBLEMS array in `packages/core/src/data/seed-problems.ts` (6 BACKTRACKING + 6 INTERVAL_MERGING across 3 rungs each)
