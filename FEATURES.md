# Feature Guides Documentation

Comprehensive documentation of all major features in the Scaffolded Learning Platform.

---

## Table of Contents

1. [Practice Mode](#1-practice-mode)
2. [Debug Lab](#2-debug-lab)
3. [Bug Hunt Mode](#3-bug-hunt-mode)
4. [Skill Progression](#4-skill-progression)
5. [AI Coaching](#5-ai-coaching)
6. [Adversary Challenges](#6-adversary-challenges)

---

## 1. Practice Mode

Practice Mode is the core learning experience with pattern-based scaffolding and validation gates.

### 1.1 Thinking Gate Validation

**Purpose**: Ensures users identify the correct pattern and state a meaningful invariant before coding.

**Location**: `/packages/core/src/validation/thinking-gate.ts`

**Validation Steps**:

1. **Pattern Selection Validation**
   - Checks if selected pattern matches problem's intended pattern
   - Detects related patterns (e.g., Two Pointers vs Sliding Window) and provides specific hints
   - Uses `RELATED_PATTERNS` map to give nuanced feedback

2. **Invariant Quality Validation**
   - Minimum length requirement: 20 characters
   - Detects filler content (e.g., "asdf", "test", "i think")
   - Checks for pattern-specific keywords using `PATTERN_INVARIANT_KEYWORDS`
   - Validates constraint language (e.g., "at most", "always", "maintain")

3. **Complexity Validation** (optional)
   - Warns if Big-O notation is malformed
   - Compares to problem's target complexity

**Key Constants**:
```typescript
MIN_INVARIANT_LENGTH = 20
PATTERN_INVARIANT_KEYWORDS = {
  SLIDING_WINDOW: ['window', 'left', 'right', 'expand', 'shrink', ...],
  TWO_POINTERS: ['left', 'right', 'converge', 'sorted', ...],
  // ... for all patterns
}
```

**Output**:
```typescript
interface ThinkingGateValidationResult {
  passed: boolean;
  errors: ThinkingGateError[];
  warnings: ThinkingGateWarning[];
  llmAugmented: boolean;  // If LLM was used for additional validation
}
```

### 1.2 Pattern Discovery (Socratic Flow)

**Purpose**: Helps users discover the correct pattern through guided questioning.

**Location**: `/packages/core/src/validation/pattern-discovery.ts`

**Two Modes**:

1. **HEURISTIC Mode** (default, no LLM required)
   - Decision tree with keyword-based matching
   - Questions organized hierarchically:
     - Q1: Data structure identification (array, tree, graph, intervals)
     - Q2: Operation type (contiguous subarray, pair finding, traversal)
     - Q3: Constraint analysis (window type, sorted property, optimization)
   - Scores pattern candidates based on user answers
   - Completes when confidence score >= 3 with clear winner

2. **SOCRATIC Mode** (requires LLM)
   - LLM generates contextual questions
   - More adaptive to user's thought process
   - Falls back to HEURISTIC if LLM unavailable

**Decision Tree Example**:
```
q1_data_structure → "array" → q2_array_operation
                            → "contiguous" → q3_window_type
```

**Scoring System**:
- Each keyword match adds 1 point to pattern
- Related patterns get bonus 0.5 points
- Pattern suggested when score >= 3 and 1.5 points ahead of runner-up

**Q&A Log Structure**:
```typescript
interface PatternDiscoveryQA {
  questionId: string;
  question: string;
  answer: string;
  timestamp: Date;
}
```

### 1.3 Pattern Challenge (Advocate's Trap)

**Purpose**: Challenges questionable pattern selections with Socratic questions and counterexamples.

**Location**: `/packages/core/src/validation/pattern-challenge.ts`

**Trigger Conditions**:
- Confidence score < 0.45 based on problem characteristics
- Hard disqualifier detected (e.g., binary search on unsorted data)

**Disqualifier Rules** (examples):
```typescript
TWO_POINTERS on unsorted + pairs → counterexample: [3,1,4,2] sum=5
SLIDING_WINDOW on all combinations → "How would window generate all subsets?"
BINARY_SEARCH on unsorted → "If mid=8 and target=2, which half?"
HEAP without k-th/min-max → "What property would heap maintain?"
```

**Confidence Scoring**:
```typescript
PATTERN_AFFINITY = {
  SLIDING_WINDOW: (chars) => {
    score = 0.5;
    if (chars.mentionsSubarray) score += 0.3;
    if (chars.mentionsContiguous) score += 0.2;
    if (chars.mentionsAllCombinations) score -= 0.4;
    return clamp(score, 0, 1);
  }
  // ... for all patterns
}
```

**Challenge Modes**:
1. **COUNTEREXAMPLE**: Provides specific input that breaks the pattern
2. **SOCRATIC**: Asks probing questions about pattern applicability

**User Response Flow**:
- User can keep original pattern or change
- If changed, new pattern is validated
- Decision tracked in `PatternChallengeData`

### 1.4 Code Submission and Validation

**Location**: `/packages/core/src/use-cases/submit-code.ts`, `/packages/core/src/validation/gating.ts`

**Validation Pipeline**:

1. **Code Execution** (via Piston API)
   - Runs against visible test cases
   - Captures stdout, stderr, exit code
   - Optionally runs hidden large test cases for time budget validation

2. **Heuristic Analysis**
   - Pattern-specific checks (e.g., nested loops in sliding window)
   - Forbidden concept detection (e.g., sorting in linear time problem)
   - Complexity violations (time budget exceeded)

3. **LLM Validation** (optional)
   - Code quality assessment (PASS/PARTIAL/FAIL)
   - Constructive feedback generation
   - Confidence scoring

4. **Gating Decision**
   - Uses rule-based engine with priority-ordered rules
   - Actions: PROCEED, REQUIRE_REFLECTION, SHOW_MICRO_LESSON, BLOCK_SUBMISSION

**Gating Rules** (priority order):

```typescript
Priority 1:  Block forbidden concepts
Priority 3:  Require reflection on repeated time budget failures
Priority 8:  Show micro-lesson on time budget exceeded
Priority 10: Show micro-lesson on pattern-specific errors (nested loops, wrong shrink)
Priority 20: Require reflection on repeated errors
Priority 25: Require reflection on FAIL grade
Priority 95-97: Suggest success reflection (first attempt, high rung, persistence)
Priority 100: Proceed on PASS
```

**Micro-Lesson Content**:
- Pattern fundamentals (e.g., "sliding_window_intro")
- Common mistakes (e.g., "sliding_window_shrink" - while vs if)
- Complexity optimization (e.g., "sliding_window_complexity")

### 1.5 Reflection Loops

**Location**: `/packages/core/src/entities/step.ts`

**Two Types**:

1. **Required Reflection** (REFLECTION step)
   - Triggered by: FAIL grade, repeated errors, time budget issues
   - User must select from multiple-choice options
   - Correct answer required to proceed
   - Example: "Why did your solution exceed time budget?"

2. **Success Reflection** (SUCCESS_REFLECTION step)
   - Triggered after passing all tests
   - Conditions:
     - First successful attempt
     - High rung problems (>= 3)
     - Success after multiple attempts (>= 3)
   - Optional, can be skipped
   - Captures:
     - Confidence rating (1-5)
     - Key learned insight
     - Improvement notes

**Data Structure**:
```typescript
interface SuccessReflectionData {
  confidenceRating: 1 | 2 | 3 | 4 | 5;
  learnedInsight: string;
  improvementNote?: string;
  skipped: boolean;
}
```

### 1.6 Hint System (5 Levels)

**Purpose**: Progressive hints that reveal more information as budget is spent.

**Location**: `/packages/core/src/hints/generator.ts`

**Hint Levels** (from least to most revealing):

1. **DIRECTIONAL_QUESTION** (cost: 1)
   - Example: "What data structure would help track elements in your window?"
   - Nudges thinking without giving away solution

2. **HEURISTIC_HINT** (cost: 2)
   - Example: "Use two pointers (left and right) to define window boundaries"
   - Describes the approach

3. **CONCEPT_INJECTION** (cost: 2)
   - Example: "Sliding window maintains [left, right] over contiguous subarray"
   - Explains the core concept

4. **MICRO_EXAMPLE** (cost: 3)
   - Example: Shows step-by-step for a small input
   - Demonstrates mechanics

5. **PATCH_SNIPPET** (cost: 4)
   - Example: Provides code template with comments
   - Nearly complete solution structure

**Budget System**:
- Total budget: 10 points per attempt
- Each hint deducts its cost from budget
- Hints exhausted when next hint would exceed budget

**Pattern-Specific Hints**:
- Each pattern has custom hint templates
- Falls back to generic hints if pattern not defined
- Problem-specific hints (from Problem.hints array) used for levels 4-5 if available

**Budget Tracking**:
```typescript
interface HintBudgetState {
  totalBudget: 10;
  usedBudget: sum(hintsUsed.map(level => HINT_COSTS[level]));
  remainingBudget: totalBudget - usedBudget;
  hintsUsed: number;
  maxHints: 5;
  isExhausted: boolean;
}
```

---

## 2. Debug Lab

Debug Lab provides taxonomy-aware debugging practice with mini-repositories.

**Location**: `/packages/core/src/entities/debug-lab.ts`

### 2.1 Triage Phase

**Purpose**: Assess user's ability to classify defects before debugging.

**Taxonomy Dimensions**:

1. **Defect Category** (9 types):
   - Functional, Concurrency, Resource, Distributed
   - Heisenbug, Environment, Container
   - Performance, Observability

2. **Severity** (4 levels):
   - Critical, Major, Minor, Low
   - Based on blast radius and impact

3. **Priority** (3 levels):
   - High, Medium, Low
   - Based on urgency and user impact

4. **Observable Signals** (12 types):
   - failing_tests, timeout, crash, inconsistent_repro
   - metrics_red, metrics_use, memory_growth, cpu_spike
   - connection_errors, data_corruption, log_errors, silent_failure

5. **Debug Tools Expected** (12 types):
   - unit_tests, logging, profiling, tracing
   - seed_freeze, debugger, binary_search, metrics_analysis
   - code_review, reproduction, isolation, rollback

**Triage Scoring**:
```typescript
calculateTriageScore(answers, rubric) = {
  overall: weighted average of:
    - categoryScore * 0.4   // Most important
    - severityScore * 0.2
    - priorityScore * 0.15
    - actionsScore * 0.25   // Keyword matching
}
```

**Scoring Rules**:
- **Exact match**: 1.0
- **Adjacent category/severity/priority**: 0.5
- **Wrong**: 0.0

Adjacent categories:
```
Functional ↔ Performance
Concurrency ↔ Heisenbug, Distributed
Resource ↔ Performance, Container
```

**First Actions Scoring**:
- Keyword matching with variations (hyphens, underscores, spaces)
- Score = matched_keywords / expected_keywords
- Example expected: ["unit_tests", "logging", "stack_trace"]

### 2.2 File Editing

**Workspace Structure**:
```typescript
interface DebugLabFile {
  path: string;           // e.g., "src/utils.js"
  content: string;
  editable: boolean;      // False for test files, config
}
```

**File Categories**:
- **Editable**: Source files user can modify
- **Read-only**: Test files, configuration, package.json
- **Hidden**: Server-side test files for final validation

**Typical Workspace** (3-6 files):
```
src/
  index.js         (editable)
  utils.js         (editable)
  config.js        (editable)
test/
  index.test.js    (read-only, visible)
package.json       (read-only)
```

### 2.3 Test Execution

**Execution Flow**:

1. **Test Command**: User-defined (e.g., "npm test", "pytest")
2. **Sandbox Execution**: Via Piston API or custom runner
3. **Result Capture**:
   - stdout, stderr
   - Exit code
   - Execution time
4. **Signal Detection**: Classify result into ExecutionSignalType

**Signal Types**:
```typescript
type ExecutionSignalType =
  | 'test_failure'    // Assertions failed
  | 'timeout'         // Exceeded time limit
  | 'crash'           // Process crashed
  | 'compile_error'   // Syntax/compilation error
  | 'runtime_error'   // Exception thrown
  | 'success'         // All tests passed
```

**Signal Detection Heuristics**:
```
timeout      → timedOut flag
compile_error → "SyntaxError", "compilation failed" in stderr
crash        → "segmentation fault", "panic", "killed" in stderr
test_failure → "fail", "assert", "expected" in stdout
runtime_error → "error", "exception", "traceback" in stderr
success      → exitCode === 0
```

**Hidden Tests**:
- Optional additional test suite run server-side only
- Summary shown (pass/fail count), but not output
- Used to prevent gaming visible tests

### 2.4 Signal Interpretation

**Observability Snapshots**:

Debug Lab items can include metrics and logs to simulate production debugging.

**RED Metrics** (Request-centric):
```typescript
interface REDMetrics {
  rate: number;          // Requests per second
  errorRate: number;     // 0-1
  duration: {
    p50: number;         // Median latency (ms)
    p95: number;
    p99: number;
  };
  label?: string;
}
```

**USE Metrics** (Resource-centric):
```typescript
interface USEMetrics {
  utilization: number;   // 0-1 (CPU, memory usage)
  saturation: number;    // Queue depth
  errors: number;        // Error count
  resource: string;      // "cpu", "memory", "disk", "network"
  label?: string;
}
```

**Log Analysis**:
- Raw log lines provided in UI
- User must correlate logs with code behavior
- Example: Timestamp showing request lifecycle

**Example Observability Snapshot**:
```typescript
{
  red: [
    { rate: 150, errorRate: 0.05, duration: { p50: 120, p95: 350, p99: 800 } }
  ],
  use: [
    { utilization: 0.85, saturation: 12, errors: 3, resource: "memory" }
  ],
  logs: [
    "2026-01-18 10:23:15 ERROR: Connection pool exhausted",
    "2026-01-18 10:23:16 WARN: Retrying connection (attempt 3/3)"
  ],
  timestamp: "Production 2026-01-18 10:23:00"
}
```

---

## 3. Bug Hunt Mode

Find and explain invariant violations in code snippets.

**Location**: `/packages/core/src/entities/bug-hunt.ts`

### 3.1 Code Inspection

**Item Structure**:
```typescript
interface BugHuntItem {
  id: string;
  pattern: PatternId;           // Pattern the code should implement
  difficulty: 'EASY' | 'MEDIUM' | 'HARD';
  language: 'python' | 'javascript' | 'typescript';
  code: string;                 // Buggy code snippet
  prompt: string;               // What the code should do
  expectedBugLines: number[];   // 1-indexed line numbers
  expectedConcepts: string[];   // Keywords explanation should mention
  hint?: string;
  explanation: string;          // Shown after success
}
```

**Example**:
```typescript
{
  pattern: 'SLIDING_WINDOW',
  code: `
    def maxSum(arr, k):
        maxSum = 0
        for i in range(len(arr) - k + 1):
            windowSum = sum(arr[i:i+k])  # Bug: O(n*k)
            if windowSum > maxSum:       # Bug: Wrong logic
                maxSum = i               # Bug: Storing index not sum
        return maxSum
  `,
  expectedBugLines: [3, 5],
  expectedConcepts: ['O(n*k)', 'nested iteration', 'index instead of sum']
}
```

### 3.2 Invariant Identification

**User Actions**:
1. **Select Buggy Lines**: Click line numbers in code viewer
2. **Explain Bug**: Free-text explanation

**Validation**:

1. **Line Overlap Check**:
   - At least one selected line must be in expectedBugLines
   - Partial credit if some but not all bugs found

2. **Concept Matching**:
   - Case-insensitive keyword search in explanation
   - Variations handled (hyphens, underscores, spaces)
   - Minimum 1 concept required for PARTIAL

**Scoring Logic**:
```typescript
if (lineOverlap && conceptsMatched) → CORRECT
else if (lineOverlap || conceptsMatched) → PARTIAL
else → INCORRECT
```

### 3.3 Validation

**Result Structure**:
```typescript
interface BugHuntValidation {
  result: 'CORRECT' | 'PARTIAL' | 'INCORRECT';
  lineSelectionCorrect: boolean;
  linesFound: number;
  totalBugLines: number;
  conceptsMatched: boolean;
  matchedConcepts: string[];
  totalConcepts: number;
  llmFeedback?: string;        // Optional LLM enhancement
  llmConfidence?: number;
}
```

**LLM Enhancement** (optional):
- Can provide additional feedback on explanation quality
- Does not override deterministic validation
- Used for educational feedback, not scoring

**Feedback Flow**:
```
CORRECT  → Show full explanation + matched concepts
PARTIAL  → Show hint + what was missed
INCORRECT → Show hint only
```

---

## 4. Skill Progression

Ladder-based mastery system with exponential scoring.

**Location**: `/packages/core/src/entities/skill-state.ts`, `/packages/core/src/use-cases/decide-progression-action.ts`

### 4.1 Rungs 1-4

**Rung Definitions** (from `/packages/core/src/entities/rung.ts`):

| Rung | Name | Description | Unlock Threshold |
|------|------|-------------|------------------|
| 1 | Foundation | Basic pattern application | Always unlocked |
| 2 | Intermediate | Moderate complexity | 70/100 on Rung 1 |
| 3 | Advanced | Multi-step reasoning | 70/100 on Rung 2 |
| 4 | Expert | Complex edge cases | 70/100 on Rung 3 |
| 5 | Mastery | Production-level mastery | 70/100 on Rung 4 |

**Unlock Mechanism**:
```typescript
isRungUnlocked(skills, pattern, rung) = {
  if (rung === 1) return true;

  previousRung = rung - 1;
  previousSkill = skills.find(s => s.pattern === pattern && s.rung === previousRung);

  return previousSkill && previousSkill.score >= 70;
}
```

### 4.2 Pattern Mastery Calculation

**SkillState Structure**:
```typescript
interface SkillState {
  pattern: PatternId;
  rung: RungLevel;
  score: number;                    // 0-100, exponential moving average
  attemptsCount: number;
  lastAttemptAt: Date | null;
  unlockedAt: Date | null;
  lastAppliedAttemptId: string | null;  // Idempotency
}
```

**Score Update Formula** (Exponential Moving Average):
```typescript
computeNewScore(currentScore, attemptsCount, newAttemptScore) = {
  alpha = min(0.3, 1 / (attemptsCount + 1));
  return currentScore * (1 - alpha) + newAttemptScore * alpha;
}
```

**Alpha Behavior**:
- 1st attempt: alpha = 0.5 (heavy weight on first score)
- 2nd attempt: alpha = 0.33
- 3rd attempt: alpha = 0.3 (capped)
- 5+ attempts: alpha = 0.166 (gradual adjustment)

**Effect**: Recent performance heavily weighted, but smoothed to prevent wild swings.

### 4.3 Unlocking Progression

**Progression Actions** (after completing attempt):

1. **RETRY_SAME**: Not completed or no score
2. **MICRO_LESSON_GATE**: 2+ consecutive scores < 50
3. **SERVE_SIBLING**: Practice with different problem at same rung
4. **PROMOTE_RUNG**: Advance to next rung (if eligible)
5. **COMPLETE_RUNG**: Max rung mastered

**Promotion Eligibility Rules**:
```typescript
MASTERY_MIN_ATTEMPTS = 3;
MASTERY_WINDOW = 5;  // Last 5 attempts considered

isEligibleForPromotion = {
  attempts >= 3 AND
  averageScore(last 5) >= rung.unlockThreshold AND
  allScores(last 5) >= rung.unlockThreshold  // All recent above threshold
}
```

**Sibling Selection**:
- Deterministic, not random
- Hash of problemId + attemptCount
- Ensures varied practice without repetition

**Mastery Metrics**:
```typescript
interface MasteryMetrics {
  averageScore: number;
  threshold: number;              // From RUNG_DEFINITIONS
  attemptCount: number;
  isEligibleForPromotion: boolean;
}
```

**Example Progression Path**:
```
User starts SLIDING_WINDOW Rung 1
→ Attempt 1: score 65 → SERVE_SIBLING
→ Attempt 2: score 40 → SERVE_SIBLING
→ Attempt 3: score 35 → MICRO_LESSON_GATE (2 consecutive < 50)
→ Reviews micro-lesson on sliding window fundamentals
→ Attempt 4: score 75 → SERVE_SIBLING (only 1 recent > 70)
→ Attempt 5: score 80 → PROMOTE_RUNG (3 attempts, avg > 70, all > 70)
→ User unlocks SLIDING_WINDOW Rung 2
```

---

## 5. AI Coaching

LLM-powered guidance with deterministic fallback.

**Location**: `/packages/core/src/coaching/deterministic-rules.ts`, `/packages/core/src/ports/ai-coach.ts`

### 5.1 Deterministic Rules

**Purpose**: Rule-based coaching that works without AI (fallback or standalone).

**Diagnostic Stages**:
1. TRIAGE
2. REPRODUCE
3. LOCALIZE
4. HYPOTHESIZE
5. FIX
6. VERIFY
7. POSTMORTEM

**Rule Structure**:
```typescript
interface DeterministicRule {
  id: string;
  stage: DiagnosticStage;
  priority: number;           // Higher = checked first
  condition: (evidence) => boolean;
  guidance: string;
  guidanceType: 'next_step' | 'socratic_question' | 'checklist';
  questions: string[];
}
```

**Example Rules**:

**TRIAGE Stage**:
```typescript
{
  id: 'triage-no-evidence',
  priority: 100,
  condition: (e) => !e.triage,
  guidance: 'Start by classifying the defect...',
  guidanceType: 'next_step',
  questions: [
    'What type of failure are you seeing?',
    'How severe is this bug?',
    'How urgent is the fix?'
  ]
}
```

**REPRODUCE Stage**:
```typescript
{
  id: 'reproduce-intermittent',
  priority: 90,
  condition: (e) => e.reproduction && !e.reproduction.isDeterministic,
  guidance: 'Intermittent bugs are tricky. Identify the varying factor.',
  guidanceType: 'socratic_question',
  questions: [
    'Is timing a factor?',
    'Is there randomness involved?',
    'Does it depend on system state?'
  ]
}
```

**LOCALIZE Stage**:
```typescript
{
  id: 'localize-too-broad',
  priority: 90,
  condition: (e) => e.localization && e.localization.suspectedFiles.length > 5,
  guidance: 'You\'ve identified many locations. Narrow down further.',
  guidanceType: 'socratic_question',
  questions: [
    'Can you use logging to trace execution?',
    'Which file is closest to where error manifests?',
    'Can you comment out code sections to isolate?'
  ]
}
```

**Rule Execution**:
```typescript
getDeterministicGuidance(stage, evidence) = {
  rules = ALL_RULES.filter(r => r.stage === stage)
                   .sort((a, b) => b.priority - a.priority);

  for (rule of rules) {
    if (rule.condition(evidence)) {
      return {
        guidance: rule.guidance,
        guidanceType: rule.guidanceType,
        questions: rule.questions,
        ruleId: rule.id
      };
    }
  }

  return fallback;
}
```

### 5.2 AI Diagnostic Coach

**Purpose**: LLM-powered coaching that adapts to user's specific debugging session.

**Port Interface** (`/packages/core/src/ports/ai-coach.ts`):
```typescript
interface AICoachPort {
  isEnabled(): boolean;

  generateGuidance(
    stage: DiagnosticStage,
    evidence: DiagnosticEvidence,
    sessionHistory: DiagnosticSessionHistory
  ): Promise<CoachingGuidance>;

  evaluateHypothesis(
    hypothesis: string,
    evidence: DiagnosticEvidence
  ): Promise<HypothesisEvaluation>;

  suggestNextStep(
    stage: DiagnosticStage,
    evidence: DiagnosticEvidence
  ): Promise<NextStepSuggestion>;
}
```

**Diagnostic Evidence Structure**:
```typescript
interface DiagnosticEvidence {
  triage?: {
    defectCategory?: DefectCategory;
    severity?: SeverityLevel;
    priority?: PriorityLevel;
    firstActions?: string;
  };
  reproduction?: {
    steps: string[];
    isDeterministic: boolean;
    reproCommand?: string;
  };
  localization?: {
    suspectedFiles: string[];
    suspectedFunctions?: string[];
    stackTrace?: string;
  };
  hypotheses?: Array<{
    hypothesis: string;
    status: 'untested' | 'confirmed' | 'rejected';
    evidence?: string;
  }>;
  fixAttempts?: Array<{
    description: string;
    testsPassed: boolean;
    newFailures?: string[];
  }>;
  verification?: {
    visibleTestsPassed: boolean;
    regressionTestsPassed: boolean;
    edgeCasesChecked: string[];
  };
}
```

**Guidance Types**:
```typescript
type GuidanceType =
  | 'next_step'          // What to do next
  | 'socratic_question'  // Probing question to guide thinking
  | 'checklist'          // List of items to verify
  | 'warning'            // Caution about common mistake
  | 'encouragement';     // Positive reinforcement
```

**AI vs Deterministic Fallback**:
```typescript
async function provideGuidance(stage, evidence) {
  // Try AI first
  if (aiCoach.isEnabled()) {
    try {
      return await aiCoach.generateGuidance(stage, evidence, history);
    } catch (error) {
      console.warn('AI coach failed, using deterministic fallback');
    }
  }

  // Fall back to deterministic rules
  return getDeterministicGuidance(stage, evidence);
}
```

**LLM Prompt Strategy** (inferred from adapter structure):
- Context: Stage, evidence collected, session history
- Constraints: Must fit one of GuidanceType categories
- Tone: Socratic, not directive
- Output: Structured JSON with guidance and questions

**Example AI Guidance**:
```json
{
  "guidance": "You've identified the bug is in the cache layer. Let's verify your hypothesis about stale data.",
  "guidanceType": "socratic_question",
  "questions": [
    "What would happen if the cache TTL was set to 0?",
    "Can you add logging to see cache hit/miss rates?",
    "What does the timestamp on the cached data show?"
  ],
  "nextStageRecommendation": "HYPOTHESIZE"
}
```

---

## 6. Adversary Challenges

Post-completion constraint mutations to deepen understanding.

**Location**: `/packages/core/src/adversary/index.ts`, `/packages/core/src/entities/step.ts`

### 6.1 Constraint Mutation Types

**8 Adversary Prompt Types**:

1. **INFINITE_STREAM**
   - Prompt: "What if the input was an infinite stream instead of a fixed array?"
   - Hint: "Can you maintain a fixed-size window? What state do you need?"
   - Relevant for: SLIDING_WINDOW, DFS, HEAP

2. **MEMORY_O1**
   - Prompt: "What if you could only use O(1) extra space?"
   - Hint: "Can you use the input array itself? Are there in-place techniques?"
   - Relevant for: SLIDING_WINDOW, TWO_POINTERS, BFS, DFS, DP, BACKTRACKING, TRIE

3. **INPUT_UNSORTED**
   - Prompt: "What if the input is no longer sorted?"
   - Hint: "Would sorting help? Is there a different approach for unsorted data?"
   - Relevant for: TWO_POINTERS, BINARY_SEARCH, GREEDY

4. **MULTIPLE_QUERIES**
   - Prompt: "What if you need to answer many queries on the same dataset?"
   - Hint: "Can you precompute something? What data structures enable fast repeated queries?"
   - Relevant for: PREFIX_SUM, BINARY_SEARCH, DP, HEAP, UNION_FIND, INTERVAL_MERGING

5. **NEGATIVE_NUMBERS**
   - Prompt: "What if the input could contain negative numbers?"
   - Hint: "Do your assumptions about sums/products still hold? What edge cases arise?"
   - Relevant for: SLIDING_WINDOW, PREFIX_SUM, GREEDY

6. **DUPLICATE_VALUES**
   - Prompt: "What if there are many duplicate values?"
   - Hint: "Does your solution count duplicates correctly? Are there optimization opportunities?"
   - Relevant for: TWO_POINTERS, BINARY_SEARCH, BACKTRACKING, INTERVAL_MERGING

7. **ONLINE_UPDATES**
   - Prompt: "What if elements can be added or removed dynamically?"
   - Hint: "What data structures support efficient insertions/deletions? Can you maintain your invariant?"
   - Relevant for: PREFIX_SUM, BINARY_SEARCH, BFS, DP, GREEDY, HEAP, TRIE, UNION_FIND, INTERVAL_MERGING

8. **DISTRIBUTED**
   - Prompt: "What if the data is too large to fit in memory and is distributed across machines?"
   - Hint: "How would you partition the work? What needs to be communicated between nodes?"
   - Relevant for: BFS, DFS, BACKTRACKING, TRIE, UNION_FIND

### 6.2 Pattern-Specific Recommendations

**Mapping** (top 3 per pattern):
```typescript
PATTERN_ADVERSARY_PROMPTS = {
  SLIDING_WINDOW: ['INFINITE_STREAM', 'MEMORY_O1', 'NEGATIVE_NUMBERS'],
  TWO_POINTERS: ['INPUT_UNSORTED', 'DUPLICATE_VALUES', 'MEMORY_O1'],
  PREFIX_SUM: ['MULTIPLE_QUERIES', 'ONLINE_UPDATES', 'NEGATIVE_NUMBERS'],
  BINARY_SEARCH: ['INPUT_UNSORTED', 'DUPLICATE_VALUES', 'ONLINE_UPDATES'],
  BFS: ['DISTRIBUTED', 'MEMORY_O1', 'ONLINE_UPDATES'],
  DFS: ['MEMORY_O1', 'INFINITE_STREAM', 'DISTRIBUTED'],
  DYNAMIC_PROGRAMMING: ['MEMORY_O1', 'MULTIPLE_QUERIES', 'ONLINE_UPDATES'],
  BACKTRACKING: ['MEMORY_O1', 'DUPLICATE_VALUES', 'DISTRIBUTED'],
  GREEDY: ['ONLINE_UPDATES', 'NEGATIVE_NUMBERS', 'INPUT_UNSORTED'],
  HEAP: ['INFINITE_STREAM', 'MULTIPLE_QUERIES', 'ONLINE_UPDATES'],
  TRIE: ['MEMORY_O1', 'ONLINE_UPDATES', 'DISTRIBUTED'],
  UNION_FIND: ['ONLINE_UPDATES', 'MULTIPLE_QUERIES', 'DISTRIBUTED'],
  INTERVAL_MERGING: ['ONLINE_UPDATES', 'MULTIPLE_QUERIES', 'DUPLICATE_VALUES'],
}
```

### 6.3 Challenge Flow

**When Triggered**:
- After user successfully completes a problem (all tests pass)
- Optional step, can be skipped
- Randomly selects one of top 3 recommended prompts for the pattern

**User Response Options**:

1. **Free-Text Refactor Plan**
   - User describes how they would adapt their solution
   - No validation, purely educational

2. **Code Attempt** (optional)
   - User can write actual code for the adversary challenge
   - Not validated against tests (no test cases for mutations)
   - Used for self-assessment

3. **Skip**
   - User can opt out of challenge

**Data Captured**:
```typescript
interface AdversaryChallengeData {
  type: 'ADVERSARY_CHALLENGE';
  prompt: AdversaryPrompt;
  userResponse: string | null;
  codeAttempt?: {
    code: string;
    language: string;
  };
  skipped: boolean;
  respondedAt: Date | null;
}
```

**Example Interaction**:

```
Problem: Max sum of subarray of size k (SLIDING_WINDOW)
User solves with O(n) time, O(1) space.

→ ADVERSARY_CHALLENGE triggered
→ Prompt: INFINITE_STREAM
   "What if the input was an infinite stream instead of a fixed array?
    How would you adapt your solution?"

User response:
   "I would maintain a deque of size k to store the current window.
    As each element streams in, I would add it to the back and remove
    from the front if size > k. I'd track the sum incrementally."

→ Captured in AdversaryChallengeData.userResponse
→ User proceeds to next problem
```

**Educational Value**:
- Forces deep thinking about constraints
- Reveals hidden assumptions in original solution
- Bridges gap to real-world problem-solving where constraints often shift
- Prepares for follow-up interview questions ("What if...")

---

## Implementation Notes

### Code Validation is Multi-Layered

All validation follows this hierarchy:
1. **Deterministic first** - Regex, keyword matching, structural checks
2. **LLM augmentation** - Optional enhancement, never overrides deterministic failures
3. **Graceful degradation** - System works without LLM

### Idempotency is Critical

SkillState updates use `lastAppliedAttemptId` to prevent duplicate scoring if API is called multiple times.

### Test Cases Segregation

- **Visible tests**: Shown in UI, user can debug against them
- **Hidden tests**: Server-only, prevent gaming, used for final scoring
- **Large hidden tests**: Time budget validation (optional)

### Pattern-Specificity

Most features have pattern-specific logic:
- Hints are customized per pattern
- Heuristics detect pattern-specific anti-patterns
- Micro-lessons target pattern fundamentals
- Adversary prompts match pattern constraints

---

## Document Scope

**Covered**:
- All 6 major features with implementation details
- Code locations and file paths
- Validation logic and scoring formulas
- Data structures and interfaces
- Constants and thresholds

**Not Covered**:
- UI/UX implementation details
- Database schema specifics (see ARCHITECTURE.md)
- API route handlers (see README.md)
- Deployment configuration (see DEPLOYMENT.md)

**Ambiguities Surfaced**:
- LLM prompt templates are not explicitly defined in code (inferred from port interfaces)
- Micro-lesson content is hardcoded in gating.ts (only 6 lessons defined)
- Adversary challenge validation is not implemented (responses are captured but not scored)

---

## Based on Code Analysis

This document is based on analysis of the following source files as of 2026-01-18:

**Core Entities**:
- `/packages/core/src/entities/step.ts`
- `/packages/core/src/entities/skill-state.ts`
- `/packages/core/src/entities/debug-lab.ts`
- `/packages/core/src/entities/bug-hunt.ts`

**Validation**:
- `/packages/core/src/validation/thinking-gate.ts`
- `/packages/core/src/validation/pattern-discovery.ts`
- `/packages/core/src/validation/pattern-challenge.ts`
- `/packages/core/src/validation/gating.ts`

**Use Cases**:
- `/packages/core/src/use-cases/submit-code.ts`
- `/packages/core/src/use-cases/decide-progression-action.ts`

**Supporting**:
- `/packages/core/src/hints/generator.ts`
- `/packages/core/src/adversary/index.ts`
- `/packages/core/src/coaching/deterministic-rules.ts`
