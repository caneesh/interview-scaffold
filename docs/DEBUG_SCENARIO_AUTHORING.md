# Debug Scenario Authoring Guide

This guide explains how to create new debugging scenarios for the Debug Track feature. Each scenario presents users with buggy code and guides them through a systematic debugging process.

## Table of Contents

1. [Overview](#overview)
2. [Scenario Structure](#scenario-structure)
3. [Writing Guidelines](#writing-guidelines)
4. [Example Template](#example-template)
5. [Testing Your Scenario](#testing-your-scenario)
6. [Common Patterns](#common-patterns)

---

## Overview

Debug scenarios are structured challenges that teach systematic debugging skills. Each scenario includes:

- Buggy code that exhibits a specific problem
- A symptom description (what the user observes)
- Expected findings (what a correct diagnosis should identify)
- Fix strategies (acceptable approaches to fix the bug)
- A hint ladder (progressive hints from subtle to explicit)

The goal is to help users develop pattern recognition for common bug types while practicing a methodical debugging workflow.

---

## Scenario Structure

Each scenario is defined by the `SeedDebugScenario` interface:

```typescript
interface SeedDebugScenario {
  // Unique identifier (kebab-case)
  id: string;

  // Bug category classification
  category: DebugPatternCategory;

  // Specific bug pattern key (e.g., "off_by_one", "race_condition")
  patternKey: string;

  // Difficulty level
  difficulty: DebugDifficulty;

  // What the user observes (no solution hints!)
  symptomDescription: string;

  // Code files in this scenario
  codeArtifacts: CodeArtifact[];

  // What a correct diagnosis should identify
  expectedFindings: string[];

  // Acceptable fix approaches
  fixStrategies: string[];

  // What tests/monitoring should be added
  regressionExpectation: string;

  // 4-6 progressive hints, increasingly specific
  hintLadder: string[];

  // Tags for filtering/search
  tags: string[];
}
```

### Field Details

#### `id`
- Format: `{category-prefix}-{short-name}`
- Examples: `func-off-by-one`, `conc-bank-race`, `perf-string-count`
- Category prefixes: `func`, `algo`, `perf`, `resource`, `conc`, `integ`, `dist`, `prod`

#### `category`
One of the following `DebugPatternCategory` values:
- `FUNCTIONAL_LOGIC` - Logic errors, off-by-one, boundary conditions
- `ALGORITHMIC` - Algorithm correctness, complexity issues
- `PERFORMANCE` - Slow queries, N+1, inefficient patterns
- `RESOURCE` - Memory leaks, connection exhaustion
- `CONCURRENCY` - Race conditions, deadlocks, thread safety
- `INTEGRATION` - API misuse, contract violations
- `DISTRIBUTED` - Network issues, consistency problems
- `PRODUCTION_REALITY` - Config issues, environment-specific bugs

#### `patternKey`
A snake_case identifier for the specific bug pattern:
- `off_by_one`, `missing_guard`, `boundary_condition`
- `missing_memoization`, `missing_visited_check`
- `quadratic_string_ops`, `nested_loop_optimization`
- `memory_leak_cache`, `quadratic_string_concat`
- `race_condition`, `non_atomic_operation`, `deadlock`
- `missing_error_handling`, `thundering_herd`

#### `difficulty`
One of: `EASY`, `MEDIUM`, `HARD`, `EXPERT`

| Level | Description |
|-------|-------------|
| EASY | Single obvious bug, clear symptoms, straightforward fix |
| MEDIUM | Bug requires understanding of concept, multiple valid fixes |
| HARD | Non-obvious bug, requires deep analysis, systemic fix needed |
| EXPERT | Multiple interacting bugs, production-like complexity |

#### `symptomDescription`
Describe what the user would observe in production:
- Include error messages, performance characteristics
- Mention reproducibility ("sometimes fails", "always crashes")
- Do NOT reveal the bug or its location

#### `codeArtifacts`
Array of code files:
```typescript
interface CodeArtifact {
  filename: string;      // e.g., "process_items.py"
  content: string;       // Full file content
  language: string;      // "python", "javascript", etc.
  isBuggy: boolean;      // Whether this file contains the bug
  bugLineNumbers?: number[];  // Server-only, line numbers with bugs
}
```

#### `expectedFindings`
What a correct diagnosis should identify (3-4 items):
- Root cause statement
- Mechanism of the bug
- Impact or consequence
- Pattern classification

#### `fixStrategies`
Valid approaches to fix the bug (2-4 items):
- List multiple valid approaches
- Include both quick fixes and proper solutions
- Mention trade-offs if applicable

#### `regressionExpectation`
What should be added to prevent recurrence:
- Specific test types (unit, integration, stress)
- Monitoring or alerting
- Code review checklist items

#### `hintLadder`
Progressive hints (4-6 items), ordered from subtle to explicit:
1. **First hint**: General direction, no specifics
2. **Middle hints**: Narrow the search incrementally
3. **Last hint**: Nearly gives away the answer

#### `tags`
For filtering and search:
- Include difficulty: `beginner`, `intermediate`, `advanced`
- Include language: `python`, `javascript`, `go`
- Include concepts: `loops`, `recursion`, `threading`
- Include pattern: `off-by-one`, `race-condition`

---

## Writing Guidelines

### Writing Good Symptoms

**DO:**
- Describe observable behavior, not the bug
- Include realistic context (timeouts, errors, environments)
- Mention when/how the issue manifests
- Include what works vs. what doesn't

**DON'T:**
- Reveal the bug location or nature
- Use technical terms that give away the answer
- Be vague to the point of uselessness

**Good Example:**
> "Function returns incorrect results for edge cases. Users report that the last element is sometimes skipped."

**Bad Example:**
> "The loop has an off-by-one error in the range function."

### Writing Good Hints

Structure your hints as a gradual revelation:

1. **Hint 1 (Direction)**: Point to the general area
   > "Look carefully at the loop bounds"

2. **Hint 2 (Narrowing)**: Ask a guiding question
   > "What is the maximum value of i in this loop?"

3. **Hint 3 (Comparison)**: Compare correct vs. incorrect
   > "Compare range(len(items)-1) vs range(len(items))"

4. **Hint 4 (Answer)**: Nearly explicit explanation
   > "The -1 causes the last element to be skipped"

### Writing Good Code Artifacts

- Keep code concise (20-50 lines typically)
- Include comments that a real codebase might have
- Add example usage that demonstrates the bug
- Make the bug realistic, not contrived
- Include just enough context to understand the code

---

## Example Template

```typescript
const MY_NEW_SCENARIO: SeedDebugScenario = {
  id: 'category-short-name',
  category: 'FUNCTIONAL_LOGIC',
  patternKey: 'pattern_key',
  difficulty: 'MEDIUM',
  symptomDescription: `Describe what users observe.
Include when it happens and what context matters.
Do not reveal the bug.`,
  codeArtifacts: [
    {
      filename: 'main.py',
      content: `def buggy_function(param):
    """Docstring explaining intended behavior."""
    # Bug is here somewhere
    result = do_something(param)
    return result

# Example usage showing the bug
print(buggy_function(good_input))   # Works
print(buggy_function(bad_input))    # Fails`,
      language: 'python',
      isBuggy: true,
      bugLineNumbers: [4],
    },
  ],
  expectedFindings: [
    'Root cause statement',
    'Mechanism explanation',
    'Impact description',
  ],
  fixStrategies: [
    'Primary fix approach',
    'Alternative fix approach',
    'Ideal long-term solution',
  ],
  regressionExpectation: 'Add unit tests for edge cases X, Y, Z',
  hintLadder: [
    'General direction hint',
    'Narrowing question',
    'Specific comparison',
    'Nearly explicit answer',
  ],
  tags: ['medium', 'python', 'concept1', 'concept2'],
};
```

---

## Testing Your Scenario

Before submitting a new scenario, verify:

### 1. Clarity Check
- [ ] Can someone unfamiliar understand the symptom?
- [ ] Is the code readable and realistic?
- [ ] Are all necessary imports/setup included?

### 2. Hint Quality Check
- [ ] Hint 1 doesn't give away the answer
- [ ] Each hint adds new information
- [ ] Final hint makes the answer clear

### 3. Difficulty Calibration
- [ ] Have 2-3 people attempt the scenario
- [ ] Measure time to solution with and without hints
- [ ] Adjust difficulty rating based on feedback

### 4. Technical Accuracy
- [ ] Code actually exhibits the described bug
- [ ] Expected findings are complete and accurate
- [ ] Fix strategies actually work
- [ ] Tags are appropriate and searchable

### 5. Pedagogical Value
- [ ] Scenario teaches a transferable pattern
- [ ] Bug is realistic (seen in production codebases)
- [ ] Multiple valid diagnostic approaches exist

---

## Common Patterns

### FUNCTIONAL_LOGIC Patterns
- **off_by_one**: Loop bounds, array indexing, fence-post errors
- **missing_guard**: No check for null, empty, or invalid input
- **boundary_condition**: Edge cases at limits (0, MAX_INT, empty)
- **incorrect_operator**: Using `<` instead of `<=`, `and` vs `or`

### ALGORITHMIC Patterns
- **missing_memoization**: Exponential time from repeated computation
- **missing_visited_check**: Infinite loops in graph/tree traversal
- **incorrect_base_case**: Wrong termination condition in recursion
- **wrong_data_structure**: O(n) lookup when O(1) is possible

### PERFORMANCE Patterns
- **quadratic_string_ops**: O(n) operation in O(n) loop
- **nested_loop_optimization**: O(n^2) when O(n) is possible
- **n_plus_one_query**: Database query in a loop
- **unnecessary_computation**: Recalculating invariant values

### RESOURCE Patterns
- **memory_leak_cache**: Unbounded cache/collection growth
- **quadratic_string_concat**: String += in loop
- **connection_exhaustion**: Not closing/returning connections
- **large_object_retention**: Holding references unnecessarily

### CONCURRENCY Patterns
- **race_condition**: Check-then-act without synchronization
- **non_atomic_operation**: Compound operation assumed atomic
- **deadlock**: Lock ordering inconsistency
- **thread_safety**: Shared mutable state without protection

### INTEGRATION Patterns
- **missing_error_handling**: No check for API/network errors
- **thundering_herd**: Synchronized retries overwhelming service
- **timeout_missing**: No timeout on external calls
- **contract_violation**: Assuming response format without validation

---

## Adding Your Scenario

1. Add your scenario constant to `packages/core/src/data/seed-debug-scenarios.ts`
2. Add it to the appropriate category in `DEBUG_SCENARIOS_BY_CATEGORY`
3. Add it to `ALL_DEBUG_SCENARIOS` in the correct section
4. Run the type checker: `pnpm typecheck`
5. Create a commit: `debug(content): add {scenario-name} scenario`

---

## Questions?

If you're unsure about any aspect of scenario design, consider:
- Looking at existing scenarios for patterns
- Testing with users before finalizing
- Starting with EASY difficulty and iterating
