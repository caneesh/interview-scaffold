# Feature List

Features derived from implemented code. Status reflects actual implementation state.

---

## 1. Attempt State Machine

**Description**: Each user attempt follows a strict state machine with hardened transitions. Invalid transitions are rejected with explicit error messages.

**Trigger**: User starts an attempt via `POST /api/attempts/start`

**Data Involved**:
- `Attempt` entity with `state`, `steps`, `hintsUsed`, `codeSubmissions`
- State values: `THINKING_GATE`, `CODING`, `REFLECTION`, `HINT`, `COMPLETED`, `ABANDONED`

**Valid State Transitions**:

| From State | To State | Trigger |
|------------|----------|---------|
| THINKING_GATE | CODING | Thinking gate passes (pattern + invariant validated) |
| CODING | HINT | User requests hint |
| CODING | REFLECTION | Gating decision requires reflection |
| CODING | COMPLETED | All tests pass + gating allows proceed |
| HINT | CODING | User continues after viewing hint |
| HINT | REFLECTION | Gating decision requires reflection |
| HINT | COMPLETED | All tests pass + gating allows proceed |
| REFLECTION | CODING | User submits reflection |

**Transition Enforcement**:
- `submitStep()` validates current state before processing step type
- Invalid transitions return explicit error: "Invalid state transition: cannot submit {stepType} in state {currentState}"
- Each step type has documented valid source states

**Status**: Implemented

**Entry Points**:
- `packages/core/src/entities/attempt.ts`
- `packages/core/src/use-cases/start-attempt.ts`
- `packages/core/src/use-cases/submit-code.ts`
- `packages/core/src/use-cases/submit-step.ts`

---

## 2. Thinking Gate Enforcement

**Description**: Users must identify the pattern and state a loop invariant before writing code. The thinking gate uses semantic validation to check both pattern correctness and invariant quality.

**Trigger**: User submits thinking gate via `POST /api/attempts/[id]/step` with `stepType: 'THINKING_GATE'`

**Data Involved**:
- `selectedPattern`: User's pattern choice
- `statedInvariant`: User's invariant description
- `Step` entity with `type: 'THINKING_GATE'` and `result: 'PASS' | 'FAIL'`

**Semantic Validation**:

| Check | Description |
|-------|-------------|
| Pattern Correctness | Selected pattern must match problem's expected pattern |
| Invariant Quality | Invariant must contain relevant keywords for the pattern |
| Minimum Length | Invariant must be at least 10 characters |

**Pattern-Specific Invariant Keywords**:

| Pattern | Expected Keywords |
|---------|-------------------|
| SLIDING_WINDOW | window, left, right, shrink, expand, valid |
| TWO_POINTERS | pointer, left, right, converge, meet, swap |
| BINARY_SEARCH | mid, left, right, half, sorted, target |
| DFS | visited, explore, backtrack, recurse, path |
| BFS | queue, level, visited, neighbor, layer |
| BACKTRACKING | choose, explore, unchoose, valid, constraint |

**Validation Results**:
- `errors`: Hard failures (wrong pattern)
- `warnings`: Soft issues (weak invariant) - allow proceeding

**Status**: Implemented

**Entry Points**:
- `packages/core/src/validation/thinking-gate.ts`
- `packages/core/src/use-cases/submit-step.ts`
- `apps/web/src/components/ThinkingGate.tsx`
- `apps/web/src/components/ThinkingGateValidation.tsx`

---

## 3. Code Execution via Piston API

**Description**: Submitted code is executed in a sandboxed environment against test cases. Returns pass/fail per test with actual vs expected output.

**Trigger**: User submits code via `POST /api/attempts/[id]/submit`

**Data Involved**:
- `code`: User's solution
- `language`: Programming language (js, python, etc.)
- `TestResultData`: `{ input, expected, actual, passed, error }`

**Status**: Implemented

**Entry Points**:
- `packages/adapter-piston/src/index.ts`
- `packages/core/src/use-cases/submit-code.ts:112`

---

## 4. Pattern-Specific Heuristics

**Description**: Code is analyzed for pattern-specific errors before/after test execution. Each pattern has registered heuristics that detect common mistakes.

**Trigger**: Automatically runs during code submission

**Data Involved**:
- Heuristic registry keyed by `PatternId`
- `HeuristicResult`: `{ passed, errorType, evidence, suggestion }`

**Implemented Heuristics**:

| Pattern | Heuristic ID | Detects |
|---------|--------------|---------|
| SLIDING_WINDOW | `sw_nested_loops` | O(n^2) nested loop instead of O(n) |
| SLIDING_WINDOW | `sw_shrink_mechanism` | Using `if` instead of `while` for shrinking |
| DFS | `dfs_missing_visited` | No visited tracking (grid/graph only) |
| DFS | `dfs_missing_backtrack` | No backtrack after recursive call |
| DFS | `dfs_missing_base_case` | Missing boundary checks |
| DFS | `dfs_using_bfs` | Using queue instead of stack/recursion |
| DFS | `dfs_incomplete_traversal` | Not exploring all 4 directions |
| DFS | `dfs_visit_order` | Marking visited after recursive call |
| BINARY_SEARCH | `bs_infinite_loop` | `left = mid` without `+1` |
| TWO_POINTERS | `tp_pointer_movement` | No pointer movement in loop |

**Status**: Implemented

**Entry Points**:
- `packages/core/src/validation/heuristics.ts`

---

## 5. Forbidden Concept Detection

**Description**: Detects when user uses a forbidden approach for a problem (e.g., using BFS when DFS is required, using built-in sort when manual implementation is expected).

**Trigger**: Automatically runs during code submission

**Data Involved**:
- `ForbiddenConcept`: `{ id, pattern, regex, reason }`
- Returns list of detected forbidden concepts

**Status**: Implemented

**Entry Points**:
- `packages/core/src/validation/forbidden.ts`

---

## 6. Gating Decision Engine

**Description**: After code submission, the system decides the next action based on rubric score, detected errors, and attempt history.

**Trigger**: Automatically after code execution and validation

**Data Involved**:
- `GatingContext`: pattern, rung, rubric result, errors, attempt count, hints used
- `GatingDecision`: `{ action, reason, microLessonId, requiredReflectionType }`

**Gating Actions**:

| Action | When Triggered |
|--------|----------------|
| `BLOCK_SUBMISSION` | Forbidden concept with ERROR severity |
| `SHOW_MICRO_LESSON` | Pattern-specific error (nested loops, missing visited, etc.) |
| `REQUIRE_REFLECTION` | Repeated same error, or FAIL grade |
| `PROCEED` | PASS grade, or PARTIAL with <=2 hints |

**Status**: Implemented

**Entry Points**:
- `packages/core/src/validation/gating.ts`
- `packages/core/src/use-cases/submit-code.ts:207-246`

---

## 7. Micro-Lessons

**Description**: Short educational content shown when specific errors are detected. Contains pattern explanation, before/after code examples.

**Trigger**: `SHOW_MICRO_LESSON` gating decision

**Data Involved**:
- `GatingMicroLesson`: `{ id, pattern, title, content, examples, duration }`

**Available Micro-Lessons**:
- `sliding_window_intro`: Sliding window fundamentals
- `sliding_window_shrink`: While-loop shrinking
- `dfs_visited_tracking`: Visited node tracking
- `dfs_backtracking`: Backtracking after exploration

**Status**: Implemented (hardcoded in gating.ts)

**Entry Points**:
- `packages/core/src/validation/gating.ts:211-353`
- `apps/web/src/components/MicroLessonModal.tsx`

---

## 8. Reflection Gate

**Description**: After a failed code submission, users must reflect on their mistake before retrying. Presented as multiple-choice questions.

**Trigger**: `REQUIRE_REFLECTION` gating decision, or state transitions to `REFLECTION`

**Data Involved**:
- Reflection question and options
- User's selected answer
- `Step` entity with `type: 'REFLECTION'`

**Status**: Implemented

**Entry Points**:
- `apps/web/src/components/ReflectionForm.tsx`
- `packages/core/src/use-cases/submit-step.ts`

---

## 9. LLM Validation (Optional)

**Description**: If Anthropic API key is configured, Claude evaluates code quality, pattern usage, and provides feedback. High-confidence LLM failures can override heuristic decisions.

**Trigger**: Automatically during code submission if `ANTHROPIC_API_KEY` is set

**Data Involved**:
- `LLMValidationRequest`: code, language, pattern, test results, heuristic errors
- `LLMValidationResponse`: grade, confidence, errors, feedback, suggested micro-lesson

**LLM Confidence Threshold**: 0.8 (80%)

**Status**: Implemented with graceful degradation

**Entry Points**:
- `packages/adapter-llm/src/index.ts`
- `packages/core/src/use-cases/submit-code.ts:157-194`

---

## 10. Rubric-Based Scoring

**Description**: Code submissions are graded on a 0-100 scale across multiple dimensions.

**Trigger**: On successful attempt completion

**Data Involved**:
- `AttemptScore`: `{ overall, patternRecognition, implementation, edgeCases, efficiency, bonus }`

**Status**: Implemented

**Entry Points**:
- `packages/core/src/use-cases/compute-attempt-score.ts`

---

## 11. Skill State Tracking

**Description**: User's mastery for each pattern-rung combination is tracked using exponential moving average scoring. Updates are idempotent to prevent duplicate scoring.

**Trigger**: On attempt completion

**Data Involved**:
- `SkillState`: `{ userId, pattern, rung, score, attemptsCount, lastAttemptAt, unlockedAt, lastAppliedAttemptId }`
- Score formula: `newScore = oldScore * (1 - alpha) + attemptScore * alpha` where `alpha = min(0.3, 1/(attempts+1))`

**Idempotency**:

Skill updates use `lastAppliedAttemptId` to ensure each attempt is only applied once:
- `updateIfNotApplied()` checks if attempt was already applied
- Returns `{ skill, wasApplied: boolean }` to indicate whether update occurred
- Prevents duplicate scoring from retries or race conditions

**Database Constraint**:
- Unique index on `(tenantId, userId, pattern, rung)` prevents duplicate skill records

**Status**: Implemented

**Entry Points**:
- `packages/core/src/entities/skill-state.ts`
- `packages/core/src/ports/skill-repo.ts` (IdempotentUpdateResult type)
- `packages/core/src/use-cases/submit-code.ts:311-361`
- `packages/adapter-db/src/repositories/skill-repo.ts`
- `packages/adapter-db/src/schema.ts:119-149`

---

## 12. Rung Unlock System

**Description**: Users must achieve 70+ score on a rung to unlock the next rung. Rung 1 is always unlocked.

**Trigger**: Attempt to start a problem on a locked rung

**Data Involved**:
- `RUNG_UNLOCK_THRESHOLD = 70`
- `isRungUnlockedForUser()` function

**Status**: Implemented

**Entry Points**:
- `packages/core/src/entities/skill-state.ts:31-47`
- `packages/core/src/use-cases/start-attempt.ts:66-71`

---

## 13. Progression Decision Engine (MEP)

**Description**: After completing an attempt, the MEP engine decides the next action: retry same problem, serve sibling, show micro-lesson, or promote to next rung.

**Trigger**: After attempt completion

**Data Involved**:
- `ProgressionDecision`: `{ action, reason, nextProblemId, nextRung, microLessonTopic }`
- Actions: `SERVE_SIBLING`, `RETRY_SAME`, `MICRO_LESSON_GATE`, `PROMOTE_RUNG`, `COMPLETE_RUNG`

**Thresholds**:
- Mastery window: 5 attempts
- Minimum attempts for promotion: 3
- Low score threshold: 50
- Consecutive failures for micro-lesson: 2

**Status**: Implemented

**Entry Points**:
- `packages/core/src/use-cases/decide-progression-action.ts`

---

## 14. Deterministic Sibling Selection

**Description**: When serving a sibling problem, selection is deterministic (not random) based on hash of user ID, pattern, rung, and attempt count.

**Trigger**: `SERVE_SIBLING` progression action, or `getNextProblem` use-case

**Data Involved**:
- `selectSiblingIndex()` function using hash-based selection

**Status**: Implemented

**Entry Points**:
- `packages/core/src/use-cases/select-sibling.ts`
- `packages/core/src/use-cases/decide-progression-action.ts:184-202`

---

## 15. Hint System

**Description**: Users can request progressive hints with budget enforcement. Each hint level has a cost, and users have a limited budget per attempt.

**Trigger**: User clicks "Get Hint" via `POST /api/attempts/[id]/hint`

**Data Involved**:
- `HintLevel`: `DIRECTIONAL_QUESTION`, `HEURISTIC_HINT`, `CONCEPT_INJECTION`, `MICRO_EXAMPLE`, `PATCH_SNIPPET`
- `hintsUsed` array on Attempt entity
- Problem `hints` array (5 strings)
- Budget tracking via `HintBudgetState`

**Budget System**:

| Hint Level | Cost | Description |
|------------|------|-------------|
| DIRECTIONAL_QUESTION | 1 | Socratic question to guide thinking |
| HEURISTIC_HINT | 2 | Pattern-specific heuristic |
| CONCEPT_INJECTION | 2 | Key concept explanation |
| MICRO_EXAMPLE | 3 | Small worked example |
| PATCH_SNIPPET | 4 | Code snippet showing technique |

**Budget**: 10 points total per attempt
- `getHintBudgetState()`: Returns `{ totalBudget, spent, remaining, canAfford }`
- `isHintBudgetExhausted()`: Returns true when no hints affordable
- `getNextHintLevel()`: Returns next available level user can afford

**Pattern-Specific Hints**:

Hints are generated based on the problem's pattern using `generateHint()`:
- Each pattern has a bank of 5 progressive hints
- Hints progress from conceptual (directional) to concrete (patch)
- Returns `null` when budget exhausted

**Status**: Implemented

**Entry Points**:
- `packages/core/src/hints/generator.ts`
- `packages/core/src/hints/index.ts`
- `apps/web/src/components/HintPanel.tsx`
- `apps/web/src/app/api/attempts/[attemptId]/hint/route.ts`

---

## 16. Test Results Display

**Description**: After code submission, test results are displayed showing input, expected output, actual output, and pass/fail status.

**Trigger**: After code submission

**Data Involved**:
- `TestResult[]`: `{ input, expected, actual, passed, error }`

**Status**: Implemented

**Entry Points**:
- `apps/web/src/components/TestResults.tsx`

---

## 17. Completion Summary

**Description**: After completing an attempt, a summary shows the final score breakdown and statistics.

**Trigger**: Attempt state becomes `COMPLETED`

**Data Involved**:
- `AttemptScore` with all dimensions
- Hints used count, code submissions count

**Status**: Implemented

**Entry Points**:
- `apps/web/src/components/CompletionSummary.tsx`

---

## 18. Seed Problem Content

**Description**: Pre-defined problems organized into pattern packs with canonical problems and isomorphic siblings.

**Trigger**: Database seeding

**Data Involved**:
- `SeedProblem`: title, statement, pattern, rung, test cases, hints
- Pattern packs with canonical + siblings structure

**Available Patterns**:
- BACKTRACKING: Rungs 1-3 (Word Search, Path Counting, Generate Parentheses)
- INTERVAL_MERGING: Rungs 1-3 (Merge Intervals, Insert Interval, Interval Intersections)

**Total Problems**: 18 (6 per pattern across 3 rungs)

**Status**: Implemented

**Entry Points**:
- `packages/core/src/data/seed-problems.ts`

---

## 19. Daily Session Mode

**Description**: 10-minute structured learning session with 3 blocks: spaced review (2 min), MEP practice (6 min), reflection (2 min).

**Trigger**: User clicks "Start Daily Session" on `/daily`

**Data Involved**:
- Block durations (2 min / 6 min / 2 min)
- Block A: Spaced review question (placeholder)
- Block B: MEP-selected problem, full practice flow (thinking gate, code editor, test execution, hints)
- Block C: Confidence rating (1-5), reflection notes

**Status**: Partially Implemented

**Block A (Spaced Review)**: Placeholder with static content. Shows a hardcoded multiple-choice question with "Coming soon: personalized review" indicator.

**Block B (MEP Practice)**: Fully connected to backend:
- Fetches recommended problem via `GET /api/problems/next`
- Starts attempt via `POST /api/attempts/start`
- Full practice flow: ThinkingGate → CodeEditor → TestResults → HintPanel → LLMFeedback
- Submits code via `POST /api/attempts/[id]/submit`
- Requests hints via `POST /api/attempts/[id]/hint`
- Handles reflection after failed tests via `POST /api/attempts/[id]/step`
- Displays attempt score on completion

**Block C (Session Reflection)**: UI-only confidence rating and notes. If attempt was completed, displays the score breakdown.

**Entry Points**:
- `apps/web/src/app/daily/page.tsx`

---

## 20. Interview Mode

**Description**: Simulates real interview conditions with visible timer, optional hints, forced explanations (pattern, approach, invariant, complexity). Preserves 6-step interview flow while connecting to backend for problem fetching, code execution, and scoring.

**Trigger**: User clicks "Start Interview" on `/interview`

**Data Involved**:
- 6-step interview flow: pattern-selection → approach → invariant → complexity → code → results
- Problem fetched from MEP engine
- Timer (informational)
- Locked previous answers
- Test results and score on completion

**Status**: Implemented

**Backend Integration**:
- Fetches recommended problem via `GET /api/problems/next` when interview starts
- Displays problem statement throughout all steps
- On "Submit Solution": creates attempt, submits thinking gate, submits code
- Shows test results and score in results step
- LLM feedback displayed if available

**Interview Flow**:
1. **Pattern Selection**: User identifies which pattern applies (locked after submit)
2. **Approach**: User explains their approach
3. **Invariant**: User states the loop/recursion invariant
4. **Complexity**: User analyzes time and space complexity
5. **Code**: User writes solution, clicks "Submit Solution"
6. **Results**: Shows all answers, test results, score breakdown

**Entry Points**:
- `apps/web/src/app/interview/page.tsx`

---

## 21. Event Sink (Analytics)

**Description**: Domain events are emitted for tracking learning analytics.

**Trigger**: Various use-case completions

**Event Types**:
- `ATTEMPT_STARTED`
- `STEP_COMPLETED`

**Status**: Implemented (console logging only)

**Code-defined behavior**: Events are emitted via `EventSink` port, but the adapter implementation (`createConsoleEventSink`) only logs to console. No persistent storage or analytics pipeline.

**Entry Points**:
- `packages/core/src/ports/event-sink.ts`
- `packages/adapter-analytics/src/index.ts`

---

## 22. Multi-Tenancy

**Description**: All entities and operations are scoped to a `tenantId`. Every repository query includes tenant filter.

**Trigger**: All API requests

**Data Involved**:
- `tenantId` on all entities
- `x-tenant-id` header (or demo default)

**Status**: Implemented

**Entry Points**:
- `packages/core/src/entities/tenant.ts`
- All repository implementations in `packages/adapter-db/`

---

## 23. Practice Mode

**Description**: Main learning interface with scaffolded problem-solving flow (thinking gate -> coding -> reflection).

**Trigger**: User starts an attempt via `/practice`

**Status**: Implemented

**Entry Points**:
- `apps/web/src/app/practice/page.tsx`
- `apps/web/src/app/practice/[attemptId]/page.tsx`

---

## 24. Pattern Explorer

**Description**: Browse available patterns and problems.

**Trigger**: User navigates to `/explorer`

**Status**: Present but inactive

**Code-defined behavior**: Route exists but page content is minimal placeholder.

**Entry Points**:
- `apps/web/src/app/explorer/page.tsx`

---

## 25. Skills Dashboard

**Description**: View user's skill matrix across all patterns and rungs.

**Trigger**: User navigates to `/skills`

**Status**: Present but inactive

**Code-defined behavior**: Route exists and API endpoint works, but page has minimal UI.

**Entry Points**:
- `apps/web/src/app/skills/page.tsx`
- `apps/web/src/app/api/skills/route.ts`

---

## Features Referenced in UI but Missing Backend Support

| UI Element | Location | Backend Status |
|------------|----------|----------------|
| Daily session MEP selection | `/daily` Block B | **Connected** |
| Daily session persistence | `/daily` | Session not persisted (attempts are) |
| Interview mode | `/interview` | **Connected** |
| Spaced review drills | `/daily` Block A | Hardcoded placeholder |
| Pattern discovery (Socratic) | Docs only | Not implemented |
| Micro drills | Docs only | Not implemented |
| Skill decay / spaced repetition | Docs only | Not implemented |
