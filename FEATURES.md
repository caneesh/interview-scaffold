# Features

A comprehensive list of features in the Scaffolded Learning Platform.

## Table of Contents

- [Learning Modes](#learning-modes)
- [MEP Engine](#mep-engine-minimum-effective-practice)
- [Pattern System](#pattern-system)
- [Micro Drills](#micro-drills)
- [Code Editor](#code-editor)
- [Progress Tracking](#progress-tracking)
- [Analytics](#analytics)
- [AI Integration](#ai-integration)
- [Guardrails](#guardrails)
- [Authentication](#authentication)

---

## Learning Modes

### Daily Session (10 Minutes)

A time-boxed structured learning session designed for consistent daily practice.

| Block | Duration | Purpose |
|-------|----------|---------|
| Block A | 2 min | Spaced review drill - MCQ on previously learned patterns |
| Block B | 6 min | MEP-selected practice task - problem tailored to your level |
| Block C | 2 min | Reflection - confidence rating (1-5) and notes |

**Key Features:**
- Timer-based progression through blocks
- Automatic problem selection based on progress
- Spaced repetition for weak patterns
- Confidence self-assessment
- Session summary with metrics

### Interview Mode

Simulates real coding interview conditions for realistic practice.

**Phases:**
1. **Pattern Selection (Step 0)** - Identify the algorithmic pattern (Socratic questioning)
2. **Approach Explanation** - Describe your solution strategy
3. **Loop Invariants** - Define the invariants your solution maintains
4. **Complexity Analysis** - Analyze time and space complexity
5. **Code Solution** - Write your solution in the Monaco editor
6. **Results Review** - See complete feedback

**Interview Conditions:**
- Visible countdown timer
- Hints hidden by default
- Forced explanations before coding
- Answers lock after submission
- No ability to go back

### Practice Mode

Unstructured free practice environment.

- No time pressure
- Full hint access
- Choose any problem
- Guided step-by-step scaffolding
- Immediate feedback

---

## MEP Engine (Minimum Effective Practice)

An intelligent recommendation engine that determines the optimal next action based on user progress.

### Actions

| Action | Trigger Condition | Description |
|--------|-------------------|-------------|
| `SERVE_MICRO_DRILL` | Pattern weakness detected | Quick reinforcement exercise |
| `SERVE_SIBLING` | Score 50-74% | Try a similar problem at same difficulty |
| `RETRY_SAME` | Score < 50% | Retry the failed problem |
| `MICRO_LESSON_GATE` | 2+ failures on same error | Review lesson before continuing |
| `PROMOTE_RUNG` | 3 consecutive wins + 90%+ | Advance to next difficulty level |
| `SPACED_REVIEW` | Skill decay > 7 days | Review after time away |
| `COMPLETE_PATTERN` | Pattern mastery achieved | Move to next pattern |

### MEP Thresholds

- Minimum confidence for promotion: 4/5
- Sibling score range: 50-74%
- Mastery score threshold: 90%
- Clean wins for promotion: 3
- Skill decay period: 7 days

### Time Budgets

**By Difficulty:**
| Difficulty | Time Budget |
|------------|-------------|
| Easy | 15 minutes |
| Medium | 25 minutes |
| Hard | 45 minutes |

**Mode Multipliers:**
| Mode | Multiplier |
|------|------------|
| Guided | 1.5x |
| Explorer | 2.0x |
| Interview | 1.0x |
| Daily | 0.8x |

---

## Pattern System

### Supported Patterns

- **Two Pointers** - Array/string traversal with two indices
- **Sliding Window** - Fixed or variable window over contiguous elements
- **Binary Search** - Efficient search in sorted arrays
- **Dynamic Programming** - Optimization with overlapping subproblems
- **Depth-First Search (DFS)** - Tree/graph traversal going deep first
- **Breadth-First Search (BFS)** - Level-order traversal
- **Backtracking** - Systematic exploration with pruning
- **Greedy** - Local optimal choices for global optimum
- **Hash Map** - O(1) lookup for frequency/existence queries
- **Stack/Queue** - LIFO/FIFO data structures
- **Heap/Priority Queue** - Min/max element access
- **Union-Find** - Disjoint set operations
- **Trie** - Prefix-based string operations
- **Graph Algorithms** - Shortest path, MST, topological sort

### Pattern Components

Each pattern includes:

- **Description** - What the pattern is and when to use it
- **Language Templates** - Boilerplate code in Python, JavaScript, Java, TypeScript, Go, Rust
- **Variants** - Easy, Medium, Hard difficulty versions
- **Common Mistakes** - Typical errors to avoid
- **When to Use** - Problem indicators that suggest this pattern
- **Related Patterns** - Patterns often used together

### Pattern Discovery

Socratic questioning system to help identify patterns:

1. Analyzes problem characteristics
2. Asks guiding questions
3. Provides hints without giving away the answer
4. Builds pattern recognition intuition

---

## Micro Drills

Quick exercises for pattern reinforcement (1-3 minutes each).

### Drill Types

| Type | Duration | Description |
|------|----------|-------------|
| Pattern Recognition | 1 min | Identify which pattern applies to a problem |
| Code Completion | 2 min | Fill in missing parts of a solution |
| Bug Fix | 3 min | Find and fix a bug in given code |
| Complexity Analysis | 2 min | Determine time/space complexity |
| Edge Case Identification | 2 min | Identify edge cases for a problem |

### Drill Features

- Multiple choice format
- Immediate feedback
- Explanation of correct answer
- Progress tracking per drill type
- Spaced repetition scheduling

---

## Code Editor

Monaco Editor integration for writing code.

### Supported Languages

- Python
- JavaScript
- TypeScript
- Java
- Go
- Rust

### Editor Features

- Syntax highlighting
- Auto-completion
- Error highlighting
- Multi-file support
- Language-specific templates
- Keyboard shortcuts

---

## Progress Tracking

### Per-Problem Progress

- Pattern selection status
- Interview question completion
- Strategy step completion
- Current step index
- Code saved per step
- Hints used per step
- Total time spent
- Completion status

### Per-Pattern Progress

- Mastery score (0-100)
- Current rung (difficulty level)
- Problems completed
- Drills completed
- Error history
- Last practiced date

### User Statistics

- Problems completed / started
- Total hints used
- Total time spent
- Pattern completion map
- Current streak (days)
- Longest streak (days)
- Last activity date

---

## Analytics

### Learning Events Tracked

| Event | Data Captured |
|-------|---------------|
| `HINT_USED` | Problem, step, hint type |
| `ERROR_DETECTED` | Error type, context, frequency |
| `MICRO_DRILL_PASSED` | Drill type, pattern, time taken |
| `MICRO_DRILL_FAILED` | Drill type, pattern, wrong answer |
| `TRANSFER_SUCCESS` | Source pattern, target problem |
| `TRANSFER_FAIL` | Source pattern, target problem, error |
| `PROMOTED` | Pattern, from rung, to rung |
| `TIME_OVERRUN` | Problem, expected time, actual time |

### Computed Metrics

| Metric | Formula | Purpose |
|--------|---------|---------|
| Minutes per Mastered Rung | total_time / rungs_mastered | Learning efficiency |
| Error Recurrence Rate | recurring_errors / unique_errors | Pattern retention |
| Transfer Success Rate | transfers_passed / transfers_attempted | Generalization ability |
| Drill Pass Rate | drills_passed / drills_attempted | Foundational strength |

---

## AI Integration

Claude AI integration for intelligent assistance.

### AI Features

- **Code Review** - Analyze code for issues with severity levels
- **Hint Generation** - Context-aware hints without giving away solutions
- **Concept Explanations** - Clear explanations of patterns and techniques
- **Chat Completions** - Interactive Q&A about problems

### AI Safety

- Proxied through backend (API key never exposed)
- Response caching for efficiency
- Rate limiting
- Content filtering

---

## Guardrails

Automatic safeguards to prevent frustration and ensure progress.

### Protection Rules

| Condition | Action |
|-----------|--------|
| 2 sibling failures with same error | Route to micro-lesson |
| 3 consecutive clean wins | Auto-promote to next rung |
| Time overrun > 50% | Suggest discovery mode |
| Confidence < 3/5 after completion | Flag for review |
| Same error type 3+ times | Surface targeted drill |

### Benefits

- Prevents frustration loops
- Ensures consistent progress
- Adapts to learning pace
- Identifies knowledge gaps
- Maintains engagement

---

## Authentication

Supabase Auth integration for user management.

### Auth Features

- Email/password authentication
- Session management
- Row-level security (RLS)
- Profile management
- Multi-tenancy support

### Data Security

- User data isolated by tenant
- RLS policies on all tables
- Secure session tokens
- Password hashing (handled by Supabase)

---

## Technical Features

### Architecture

- **Clean Architecture** - Separation of concerns
- **Ports & Adapters** - Swappable implementations
- **Pure Domain Logic** - Framework-agnostic core
- **Type Safety** - Branded types, strict TypeScript

### Performance

- **Turborepo** - Fast monorepo builds
- **Response Caching** - LLM response caching
- **Event Buffering** - Batched analytics events
- **Optimized Queries** - Database indexes

### Developer Experience

- **Hot Reload** - Fast development iteration
- **Type Checking** - Catch errors early
- **Unit Tests** - Comprehensive test coverage
- **Linting** - Consistent code style
