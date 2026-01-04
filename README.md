# Scaffold

Pattern-first interview preparation platform.

## Architecture

```
scaffold/
├── apps/
│   └── web/                    # Next.js UI (renders DTOs, calls use-cases)
├── packages/
│   ├── core/                   # Pure domain logic (NO framework deps)
│   │   ├── entities/           # Pattern, Rung, Problem, Step, Attempt, SkillState, Tenant
│   │   ├── ports/              # Interfaces: AttemptRepo, SkillRepo, ContentRepo, EventSink, AuthContext, Clock
│   │   └── use-cases/          # GetNextProblem, StartAttempt, SubmitStep, SubmitCode, ComputeAttemptScore, DecideNextAction, GetSkillMatrix
│   ├── contracts/              # DTOs + Zod schemas (shared types)
│   ├── adapter-db/             # Drizzle + Postgres (implements repos)
│   ├── adapter-auth/           # Auth context provider
│   ├── adapter-llm/            # Claude API client (optional)
│   └── adapter-analytics/      # Event sink implementations
```

### Dependency Rules

```
apps/* → packages/*
packages/* → packages/core
packages/core → NOTHING
```

- **packages/core** is pure TypeScript - no framework, no HTTP, no DB, no ORM imports
- All side effects go through adapters
- apps/web MAY NOT contain business logic (no score computation, no sibling selection, no rung unlocking)
- Every use-case receives tenantId (multi-tenancy)

## Prerequisites

- Node.js 20+
- pnpm 9+
- PostgreSQL 15+

## Setup

```bash
# Install dependencies
pnpm install

# Set up environment
cp apps/web/.env.example apps/web/.env
# Edit apps/web/.env with your DATABASE_URL

# Generate Prisma client and run migrations
cd packages/adapter-db
pnpm db:push
cd ../..

# Build all packages
pnpm build
```

## Development

```bash
# Start development server
pnpm dev

# Run type checking
pnpm typecheck

# Run tests
pnpm test
```

## Environment Variables

Create `apps/web/.env`:

```env
DATABASE_URL=postgresql://user:password@localhost:5432/scaffold
```

## Package Scripts

### Root

- `pnpm build` - Build all packages
- `pnpm dev` - Start development servers
- `pnpm typecheck` - Type check all packages
- `pnpm test` - Run all tests
- `pnpm clean` - Clean all build outputs

### packages/core

- `pnpm build` - Compile TypeScript
- `pnpm test` - Run unit tests

### packages/adapter-db

- `pnpm db:generate` - Generate Drizzle migrations
- `pnpm db:push` - Push schema to database
- `pnpm db:studio` - Open Drizzle Studio

### apps/web

- `pnpm dev` - Start Next.js dev server
- `pnpm build` - Build for production

## Core Use-Cases

| Use-Case | Description |
|----------|-------------|
| `GetNextProblem` | Select next problem based on skill gaps |
| `StartAttempt` | Begin a new problem attempt |
| `SubmitStep` | Submit thinking gate, reflection, or hint request |
| `SubmitCode` | Submit code for evaluation |
| `ComputeAttemptScore` | Calculate score from attempt data |
| `DecideNextAction` | Determine valid next actions |
| `GetSkillMatrix` | Get user's skill state across patterns |

## API Routes

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/attempts/start` | Start new attempt |
| POST | `/api/attempts/[id]/submit` | Submit code |
| POST | `/api/attempts/[id]/step` | Submit step (thinking, reflection) |
| GET | `/api/skills` | Get skill matrix |
| GET | `/api/problems` | List problems |

## Multi-tenancy

Every use-case accepts `tenantId`. All entities are tenant-scoped:

```typescript
const result = await startAttempt({
  tenantId: 'acme-corp',
  userId: 'user-123',
  problemId: 'problem-456',
}, deps);
```
