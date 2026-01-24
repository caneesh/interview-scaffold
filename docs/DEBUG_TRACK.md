# Debugging Track

The Debugging Track teaches systematic debugging skills through real-world bug scenarios. Users work through a structured gate-based workflow that reinforces methodical debugging practices.

## Table of Contents

1. [Overview](#overview)
2. [Learning Objectives](#learning-objectives)
3. [Gate Workflow](#gate-workflow)
4. [Scoring System](#scoring-system)
5. [Bug Categories](#bug-categories)
6. [How to Run Locally](#how-to-run-locally)
7. [Interview Simulation Mode](#interview-simulation-mode)
8. [Architecture](#architecture)

---

## Overview

Traditional debugging education focuses on finding bugs quickly. The Debug Track takes a different approach: it teaches a **systematic methodology** that works consistently across all bug types.

Each scenario presents:
- Buggy code exhibiting a specific problem
- A symptom description (what users observe)
- A progressive hint system
- Gates that guide users through proper debugging steps

Users learn to:
1. Classify symptoms before diving into code
2. Form hypotheses based on patterns
3. Propose fixes with proper justification
4. Plan regression prevention

---

## Learning Objectives

After completing the Debug Track, users will be able to:

- **Classify bugs by symptom** - Recognize crash, wrong output, performance, and intermittent failure patterns
- **Identify determinism** - Distinguish reproducible bugs from race conditions and timing issues
- **Match patterns** - Recognize common bug patterns (off-by-one, race conditions, memory leaks)
- **Form hypotheses** - Develop testable theories about root causes
- **Design fixes** - Propose solutions that address root cause, not just symptoms
- **Prevent regression** - Plan appropriate tests and monitoring

---

## Gate Workflow

Each debug scenario has 7 gates that users must complete in order:

### Gate 1: SYMPTOM_CLASSIFICATION
**Prompt:** "Based on the symptom description, what type of bug symptom is this?"

Users classify the observed behavior:
- Crash/Exception
- Wrong Output
- Performance Degradation
- Intermittent Failure
- Resource Exhaustion
- Data Corruption

### Gate 2: DETERMINISM_ANALYSIS
**Prompt:** "Is this bug deterministic or non-deterministic? What factors might affect reproducibility?"

Users analyze:
- Whether the bug reproduces consistently
- Environmental factors (timing, load, data)
- Potential sources of non-determinism

### Gate 3: PATTERN_CLASSIFICATION
**Prompt:** "What debugging pattern does this bug likely match?"

Users identify the bug category and specific pattern:
- Category: FUNCTIONAL_LOGIC, ALGORITHMIC, PERFORMANCE, etc.
- Pattern: off_by_one, race_condition, memory_leak, etc.

### Gate 4: ROOT_CAUSE_HYPOTHESIS
**Prompt:** "What do you think is the root cause of this bug?"

Users form a hypothesis:
- Specific cause identification
- Evidence from code/symptoms
- Mechanism explanation

### Gate 5: FIX_STRATEGY
**Prompt:** "How would you fix this bug?"

Users propose a fix approach:
- Immediate fix
- Long-term solution
- Trade-offs considered

### Gate 6: REGRESSION_PREVENTION
**Prompt:** "How would you prevent this bug from recurring?"

Users plan prevention:
- Test cases to add
- Code review checklist
- Monitoring/alerting

### Gate 7: REFLECTION
**Prompt:** "What did you learn from debugging this issue?"

Users consolidate learning:
- Pattern recognition improvement
- Process improvement
- Knowledge gaps identified

---

## Scoring System

Each debug attempt is scored on multiple dimensions:

### Score Components

| Component | Weight | Description |
|-----------|--------|-------------|
| Symptom Classification | 15% | Correctly classifying the bug symptom |
| Root Cause Analysis | 35% | Quality of hypothesis (includes pattern + determinism) |
| Fix Quality | 30% | Appropriateness and completeness of fix |
| Regression Prevention | 20% | Quality of prevention strategy |

### Hint Deductions

Using hints reduces the final score:
- Each hint used: -5% (max -25%)
- Hints are progressive: later hints are more explicit

### Time Metrics (Recorded but not scored)

- **time_to_diagnosis**: Time from start to passing PATTERN_CLASSIFICATION
- **total_time**: Time from start to REFLECTION completion
- **hints_used**: Count of hints requested

### Score Calculation

```typescript
rawScore = (
  symptomClassification * 0.15 +
  rootCauseAnalysis * 0.35 +
  fixQuality * 0.30 +
  regressionPrevention * 0.20
);

finalScore = max(0, rawScore - hintsDeduction);
```

---

## Bug Categories

The Debug Track covers 8 categories of bugs:

### FUNCTIONAL_LOGIC
Logic errors in code correctness.

| Pattern | Description | Example |
|---------|-------------|---------|
| off_by_one | Loop bounds, indexing errors | `range(len(arr) - 1)` instead of `range(len(arr))` |
| missing_guard | No check for edge cases | Division without checking for zero |
| boundary_condition | Edge case handling | Binary search bounds incorrect |

### ALGORITHMIC
Algorithm design and correctness issues.

| Pattern | Description | Example |
|---------|-------------|---------|
| missing_memoization | Exponential from repeated work | Naive recursive Fibonacci |
| missing_visited_check | Infinite loops in traversal | DFS without visited set |

### PERFORMANCE
Inefficient implementations.

| Pattern | Description | Example |
|---------|-------------|---------|
| quadratic_string_ops | O(n) in O(n) loop | `s.count(char)` in a loop |
| nested_loop_optimization | O(n^2) when O(n) possible | Brute-force max profit |

### RESOURCE
Resource management issues.

| Pattern | Description | Example |
|---------|-------------|---------|
| memory_leak_cache | Unbounded growth | Cache without eviction |
| quadratic_string_concat | Inefficient string building | `str +=` in loop |

### CONCURRENCY
Thread safety and synchronization issues.

| Pattern | Description | Example |
|---------|-------------|---------|
| race_condition | Check-then-act without sync | Bank account withdrawal |
| non_atomic_operation | Assumed atomic operation | `counter += 1` |
| deadlock | Lock ordering issues | ABBA deadlock pattern |

### INTEGRATION
External system integration issues.

| Pattern | Description | Example |
|---------|-------------|---------|
| missing_error_handling | No status/error check | API call without try/except |
| thundering_herd | Synchronized retries | Fixed delay retry |

### DISTRIBUTED (Future)
Distributed system specific issues.

### PRODUCTION_REALITY (Future)
Environment and configuration issues.

---

## How to Run Locally

### Prerequisites

```bash
# Ensure dependencies are installed
pnpm install

# Build all packages
pnpm build
```

### Start Development Server

```bash
# Start the full application
pnpm dev

# Or start just the web app
pnpm dev:web
```

### Access Debug Track

1. Navigate to `http://localhost:3000`
2. Go to the Debug Track section
3. Select a scenario from the library
4. Work through the gates

### Run Tests

```bash
# Run all tests
pnpm test

# Run core package tests only
cd packages/core && pnpm test
```

---

## Interview Simulation Mode

For interview practice, the Debug Track supports a timed simulation mode:

### Time Limits

| Difficulty | Time Limit |
|------------|------------|
| EASY | 15 minutes |
| MEDIUM | 25 minutes |
| HARD | 40 minutes |
| EXPERT | 60 minutes |

### Simulation Features

- **Timer display**: Countdown visible during attempt
- **No hints in first 5 minutes**: Encourages independent thinking
- **Hint cooldown**: 2-minute wait between hints
- **Summary at end**: Performance breakdown with insights

### Enabling Simulation Mode

When starting a scenario, toggle "Interview Simulation" to enable timed mode.

---

## Architecture

### Core Entities

Located in `packages/core/src/entities/debug-track.ts`:

```typescript
// Main entities
DebugScenario      // The challenge definition
DebugAttempt       // User's attempt at a scenario
GateSubmission     // User's answer for a gate
GateEvaluationResult  // Evaluation of a submission

// Supporting types
DebugPatternCategory  // Bug category enum
DebugGate            // Gate type enum
DebugDifficulty      // Difficulty level enum
CodeArtifact         // Code file in scenario
```

### Seed Data

Located in `packages/core/src/data/seed-debug-scenarios.ts`:

```typescript
// Exports
ALL_DEBUG_SCENARIOS           // All 14 scenarios
DEBUG_SCENARIOS_BY_CATEGORY   // Organized by category

// Helper functions
getDebugScenariosByDifficulty(difficulty)
getDebugScenariosByCategory(category)
getDebugScenarioById(id)
getDebugScenariosByTag(tag)
```

### Data Flow

1. User selects scenario from `ALL_DEBUG_SCENARIOS`
2. System creates `DebugAttempt` with initial gate
3. User submits answer, system creates `GateSubmission`
4. Evaluator (heuristic + optional LLM) produces `GateEvaluationResult`
5. If passed, user advances to next gate
6. After final gate, system calculates `DebugAttemptScore`

### API Routes (Planned)

| Route | Method | Purpose |
|-------|--------|---------|
| `/api/debug/scenarios` | GET | List available scenarios |
| `/api/debug/scenarios/[id]` | GET | Get scenario details |
| `/api/debug/attempts/start` | POST | Start a new attempt |
| `/api/debug/attempts/[id]` | GET | Get attempt status |
| `/api/debug/attempts/[id]/submit` | POST | Submit gate answer |
| `/api/debug/attempts/[id]/hint` | POST | Request hint |

---

## Related Documentation

- [Debug Scenario Authoring Guide](./DEBUG_SCENARIO_AUTHORING.md) - How to create new scenarios
- [BAN.md](../BAN.md) - Architecture guidelines for debugging track
