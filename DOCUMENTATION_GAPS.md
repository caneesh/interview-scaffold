# Documentation Gaps & Risks

This section lists discrepancies between UI, documentation, and actual implementation, as well as code paths that may cause issues.

---

## Features Referenced in UI but Missing Backend Support

| UI Element | Location | Current State | Risk |
|------------|----------|---------------|------|
| Daily Session MEP selection | `/daily` Block B | **Connected** | Full practice flow with MEP problem selection |
| Daily Session spaced review | `/daily` Block A | Hardcoded question | No spaced repetition logic; same question always |
| Daily Session persistence | `/daily` complete | Session not persisted | Attempts are saved, but session-level data is not |
| Interview Mode | `/interview` | **Connected** | Full 6-step interview flow with backend integration |
| Pattern Explorer | `/explorer` | Minimal placeholder | Route exists but shows little content |
| Skills Dashboard | `/skills` | API works, UI minimal | Data available but not well visualized |

---

## Code Paths with No Documentation Coverage

### 1. Error Recovery in Code Execution

**Location**: `packages/adapter-piston/src/index.ts`

**Issue**: If Piston API returns malformed response or network error, the behavior is unclear. Error may bubble up as generic 500.

**Impact**: User sees cryptic error message.

### 2. Concurrent Attempt Handling

**Location**: `packages/core/src/use-cases/start-attempt.ts:47-56`

**Issue**: The "user already has active attempt" check is not atomic with attempt creation. Race condition possible if user clicks "Start" twice quickly.

**Impact**: User may end up with multiple active attempts.

### 3. LLM Response Parsing

**Location**: `packages/adapter-llm/src/index.ts:209-214`

**Issue**: JSON extraction uses regex `text.match(/\{[\s\S]*\}/)`; may fail on nested JSON or malformed responses.

**Impact**: LLM validation silently fails; graceful degradation but no feedback to user.

### 4. Skill State Creation

**Location**: `packages/adapter-db/src/skill-repo.ts`

**Issue**: Skill state is created on first update, not on user registration. If user queries skills before any attempt, behavior may vary.

**Impact**: Empty skill matrix shown.

### 5. Hint Level Progression

**Location**: `apps/web/src/app/api/attempts/[attemptId]/hint/route.ts`

**Issue**: Hint levels are tracked by string array `hintsUsed`. No validation that hints are requested in order.

**Impact**: User may skip hint levels (though UI enforces order).

---

## Ambiguous Logic Requiring Clarification

### 1. Thinking Gate Pass Criteria

**Question**: What exactly makes a thinking gate "pass"?

**Current Behavior** (from `packages/core/src/use-cases/submit-step.ts`):
- Pattern selection is compared to expected pattern (case-insensitive)
- Invariant is accepted if not empty

**Ambiguity**: Is partial pattern match acceptable? (e.g., "SLIDING WINDOW" vs "SLIDING_WINDOW")

### 2. Rung Unlock Threshold

**Question**: Does score of exactly 70 unlock the next rung?

**Current Behavior** (from `packages/core/src/entities/skill-state.ts:31-47`):
- `score >= RUNG_UNLOCK_THRESHOLD` where `RUNG_UNLOCK_THRESHOLD = 70`

**Answer**: Yes, exactly 70 does unlock.

### 3. Gating Override Hierarchy

**Question**: When LLM and heuristics disagree, which wins?

**Current Behavior** (from `packages/core/src/use-cases/submit-code.ts:157-194`):
- LLM result with confidence >= 0.8 can override heuristics
- But only for FAIL decisions, not for adding new errors

**Ambiguity**: Edge cases where LLM says PASS but heuristics found forbidden concept.

### 4. Exponential Moving Average Initialization

**Question**: What happens on first attempt when there's no previous score?

**Current Behavior** (from `packages/core/src/entities/skill-state.ts`):
- Initial score is 0
- First attempt: `newScore = 0 * (1 - 0.5) + attemptScore * 0.5 = attemptScore * 0.5`

**Issue**: First attempt score is halved. May feel discouraging.

### 5. Sibling Selection Determinism

**Question**: How are siblings selected when multiple are available?

**Current Behavior** (from `packages/core/src/use-cases/select-sibling.ts`):
- Hash of `${userId}-${pattern}-${rung}-${attemptCount}`
- Modulo number of siblings

**Clarification Needed**: What happens when problem pool changes? Determinism may shift.

---

## TODOs and Commented-Out Logic

### In Source Code

| File | Line | Content | Impact |
|------|------|---------|--------|
| `apps/web/src/app/practice/[attemptId]/page.tsx` | 138-141 | Comment: "In a real app, we'd fetch hint texts from the steps" | Hints not restored on page refresh |
| `packages/core/src/validation/heuristics.ts` | - | DFS heuristics skip for TREE_TRAVERSAL problems | Tree traversal not fully supported |

### Not Found in Code (Despite Documentation References)

| Referenced Feature | Where Referenced | Status |
|--------------------|------------------|--------|
| Micro drills | FEATURES.md mentions "micro-drills" | Not implemented |
| Spaced repetition decay | Old docs mention skill decay over time | Not implemented |
| Socratic pattern discovery | Mentioned in design docs | Not implemented |
| Transfer success rate | Mentioned in analytics | EventSink only logs |
| Error recurrence tracking | Mentioned in gating | Basic repeat detection only |

---

## Configuration Gaps

### Environment Variables

| Variable | Required | Default | Documentation |
|----------|----------|---------|---------------|
| `DATABASE_URL` | Yes | None | Documented in README |
| `ANTHROPIC_API_KEY` | No | None | Documented; graceful degradation |
| `PISTON_API_URL` | No | `https://emkc.org/api/v2/piston` | Undocumented default |

### Missing Configuration

1. **Connection pool size**: No config for Drizzle connection pooling
2. **LLM timeout**: Hardcoded in Anthropic SDK defaults
3. **Piston timeout**: Hardcoded as 5000ms run, 15000ms compile
4. **Rate limiting**: None configured

---

## Security Considerations

### Not Implemented

1. **Authentication**: Demo auth only; no real user verification
2. **Authorization**: Tenant scoping relies on header; easily spoofed
3. **Input Sanitization**: Code submitted directly to Piston
4. **Rate Limiting**: No protection against abuse
5. **CORS**: Next.js defaults; not explicitly configured

### Present but Inactive

1. **Tenant Isolation**: Schema supports multi-tenancy but single demo tenant in use

---

## Testing Gaps

### No Test Coverage Found For

1. Gating decision edge cases
2. LLM response parsing errors
3. Concurrent attempt creation
4. Skill state boundary conditions
5. Piston API failure scenarios

### Test Infrastructure Present

- Vitest configured in `vitest.config.js`
- JSdom environment for component tests
- No test files found in current state

---

## Recommendations for Engineering

1. **Add integration tests for critical paths** - Code submission flow especially
2. **Implement proper error boundaries** - Currently errors may crash components
3. **Add request validation middleware** - Zod schemas exist but could be centralized
4. **Document API response formats** - OpenAPI spec would help
5. **Add health checks** - For Piston and DB connectivity
6. **Consider async LLM validation** - Current sync call adds latency
7. **Connect spaced review in Daily Session** - Block A still uses hardcoded content

---

## Summary

| Category | Count | Severity |
|----------|-------|----------|
| UI features without backend | 4 | Medium |
| Undocumented code paths | 5 | Medium |
| Ambiguous logic | 5 | Medium |
| Missing TODOs | 2 | Low |
| Referenced but not implemented | 5 | Medium |
| Configuration gaps | 4 | Low |
| Security gaps | 5 | High |
| Testing gaps | 5 | Medium |
