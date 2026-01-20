# Component Documentation

**Interview Scaffold System Components**

This document provides comprehensive type-level documentation for all components in the interview-scaffold codebase, organized by architectural layer (Core Entities, Ports, Use Cases, Validation, Adapters, and Web App).

**Generated:** 2026-01-18
**Based on code analysis as of:** 2026-01-18

---

## Table of Contents

1. [Core Entities](#1-core-entities)
2. [Ports (Interfaces)](#2-ports-interfaces)
3. [Use Cases](#3-use-cases)
4. [Validation System](#4-validation-system)
5. [Adapters](#5-adapters)
6. [Web App Components](#6-web-app-components)
7. [Limitations & Constraints](#7-limitations--constraints)

---

## 1. Core Entities

### 1.1 Problem

**Location:** `/home/aneesh/projects/interview-scaffold/packages/core/src/entities/problem.ts`

**Description:** Represents a coding problem with associated pattern, difficulty level (rung), test cases, and adversary prompts for post-completion challenges.

**Type Signature:**

```typescript
interface Problem {
  readonly id: string;
  readonly tenantId: TenantId;
  readonly title: string;
  readonly statement: string;
  readonly pattern: PatternId;
  readonly rung: RungLevel;
  readonly targetComplexity: string;
  readonly testCases: readonly TestCase[];
  readonly hints: readonly string[];
  readonly adversaryPrompts?: readonly AdversaryPrompt[];
  readonly timeoutBudgetMs?: number;
  readonly largeHiddenTests?: readonly TestCase[];
  readonly createdAt: Date;
}

interface TestCase {
  readonly input: string;
  readonly expectedOutput: string;
  readonly isHidden: boolean;
  readonly explanation?: string;
}

type ProblemId = string;
```

**Usage Example:**

```typescript
const problem: Problem = {
  id: 'prob-123',
  tenantId: 'tenant-1',
  title: 'Maximum Subarray Sum',
  statement: 'Find the contiguous subarray with maximum sum.',
  pattern: 'SLIDING_WINDOW',
  rung: 2,
  targetComplexity: 'O(n)',
  testCases: [
    { input: '[1, -3, 2, 1, -1]', expectedOutput: '3', isHidden: false },
    { input: '[-2, -3, -1]', expectedOutput: '-1', isHidden: true }
  ],
  hints: ['Consider maintaining a window...'],
  timeoutBudgetMs: 500,
  createdAt: new Date()
};
```

---

### 1.2 Attempt

**Location:** `/home/aneesh/projects/interview-scaffold/packages/core/src/entities/attempt.ts`

**Description:** Represents a user's attempt at solving a problem, tracking state progression through thinking gate, coding, reflection, and completion phases.

**Type Signature:**

```typescript
type AttemptState =
  | 'THINKING_GATE'
  | 'CODING'
  | 'REFLECTION'
  | 'SUCCESS_REFLECTION'
  | 'HINT'
  | 'COMPLETED'
  | 'ABANDONED';

interface Attempt {
  readonly id: string;
  readonly tenantId: TenantId;
  readonly userId: string;
  readonly problemId: ProblemId;
  readonly pattern: PatternId;
  readonly rung: RungLevel;
  readonly state: AttemptState;
  readonly steps: readonly Step[];
  readonly hintsUsed: readonly HintLevel[];
  readonly codeSubmissions: number;
  readonly score: AttemptScore | null;
  readonly startedAt: Date;
  readonly completedAt: Date | null;
}

interface AttemptScore {
  readonly overall: number; // 0-100
  readonly patternRecognition: number; // 0-100
  readonly implementation: number; // 0-100
  readonly edgeCases: number; // 0-100
  readonly efficiency: number; // 0-100
  readonly bonus: number; // 0-100 (added points)
}

// Helper functions
function canSubmitCode(attempt: Attempt): boolean;
function hasPassedThinkingGate(attempt: Attempt): boolean;
function hasPassedReflection(attempt: Attempt): boolean;
function needsReflection(attempt: Attempt): boolean;
```

**Usage Example:**

```typescript
const attempt: Attempt = {
  id: 'attempt-456',
  tenantId: 'tenant-1',
  userId: 'user-789',
  problemId: 'prob-123',
  pattern: 'SLIDING_WINDOW',
  rung: 2,
  state: 'CODING',
  steps: [],
  hintsUsed: [],
  codeSubmissions: 0,
  score: null,
  startedAt: new Date(),
  completedAt: null
};

// Check if user can submit code
if (canSubmitCode(attempt)) {
  // Proceed with code submission
}
```

---

### 1.3 Step

**Location:** `/home/aneesh/projects/interview-scaffold/packages/core/src/entities/step.ts`

**Description:** Represents a phase within an attempt (thinking gate, coding, reflection, pattern discovery, etc.). Each step has a type, result, and associated data payload.

**Type Signature:**

```typescript
type StepType =
  | 'THINKING_GATE'
  | 'PATTERN_DISCOVERY'
  | 'PATTERN_CHALLENGE'
  | 'CODING'
  | 'REFLECTION'
  | 'SUCCESS_REFLECTION'
  | 'ADVERSARY_CHALLENGE'
  | 'HINT';

type StepResult = 'PASS' | 'FAIL' | 'SKIP';

interface Step {
  readonly id: string;
  readonly attemptId: string;
  readonly type: StepType;
  readonly result: StepResult | null;
  readonly data: StepData;
  readonly startedAt: Date;
  readonly completedAt: Date | null;
}

// Data payloads for each step type
interface ThinkingGateData {
  readonly type: 'THINKING_GATE';
  readonly selectedPattern: string | null;
  readonly statedInvariant: string | null;
  readonly statedComplexity: string | null;
  readonly invariantTemplate?: {
    readonly templateId: string;
    readonly choices: Record<string, number>;
    readonly allCorrect: boolean;
  } | null;
}

interface CodingData {
  readonly type: 'CODING';
  readonly code: string;
  readonly language: string;
  readonly testResults: readonly TestResultData[];
  readonly validation?: CodingValidationData;
}

interface CodingValidationData {
  readonly rubricGrade: 'PASS' | 'PARTIAL' | 'FAIL';
  readonly rubricScore: number;
  readonly heuristicErrors: readonly string[];
  readonly forbiddenConcepts: readonly string[];
  readonly gatingAction: GatingAction;
  readonly gatingReason: string;
  readonly microLessonId?: string;
  readonly llmFeedback?: string;
  readonly llmConfidence?: number;
  readonly successReflectionPrompt?: string;
  readonly timeBudgetResult?: {
    readonly exceeded: boolean;
    readonly budgetMs: number;
    readonly testsRun: number;
    readonly testsFailed: number;
  };
  readonly complexitySuggestion?: string;
}

interface TestResultData {
  readonly input: string;
  readonly expected: string;
  readonly actual: string;
  readonly passed: boolean;
  readonly error: string | null;
}

// Pattern Discovery sub-flow
interface PatternDiscoveryData {
  readonly type: 'PATTERN_DISCOVERY';
  readonly mode: 'HEURISTIC' | 'SOCRATIC';
  readonly qaLog: readonly PatternDiscoveryQA[];
  readonly discoveredPattern: string | null;
  readonly completed: boolean;
}

// Pattern Challenge (Advocate's Trap)
interface PatternChallengeData {
  readonly type: 'PATTERN_CHALLENGE';
  readonly challengedPattern: string;
  readonly mode: 'COUNTEREXAMPLE' | 'SOCRATIC';
  readonly challengePrompt: string;
  readonly counterexample?: string;
  readonly userResponse: string | null;
  readonly decision: 'KEPT_PATTERN' | 'CHANGED_PATTERN' | null;
  readonly newPattern: string | null;
  readonly confidenceScore: number;
  readonly challengeReasons: readonly string[];
  readonly suggestedAlternatives: readonly string[];
}

// Adversary Challenge (post-completion constraint mutation)
type AdversaryPromptType =
  | 'INFINITE_STREAM'
  | 'MEMORY_O1'
  | 'INPUT_UNSORTED'
  | 'MULTIPLE_QUERIES'
  | 'NEGATIVE_NUMBERS'
  | 'DUPLICATE_VALUES'
  | 'ONLINE_UPDATES'
  | 'DISTRIBUTED';

interface AdversaryChallengeData {
  readonly type: 'ADVERSARY_CHALLENGE';
  readonly prompt: AdversaryPrompt;
  readonly userResponse: string | null;
  readonly codeAttempt?: {
    readonly code: string;
    readonly language: string;
  };
  readonly skipped: boolean;
  readonly respondedAt: Date | null;
}
```

**Usage Example:**

```typescript
const codingStep: Step = {
  id: 'step-001',
  attemptId: 'attempt-456',
  type: 'CODING',
  result: 'PASS',
  data: {
    type: 'CODING',
    code: 'function maxSum(arr) { ... }',
    language: 'javascript',
    testResults: [
      { input: '[1, 2, 3]', expected: '6', actual: '6', passed: true, error: null }
    ],
    validation: {
      rubricGrade: 'PASS',
      rubricScore: 0.9,
      heuristicErrors: [],
      forbiddenConcepts: [],
      gatingAction: 'PROCEED',
      gatingReason: 'All tests passed'
    }
  },
  startedAt: new Date(),
  completedAt: new Date()
};
```

---

### 1.4 SkillState

**Location:** `/home/aneesh/projects/interview-scaffold/packages/core/src/entities/skill-state.ts`

**Description:** Tracks user's mastery level for a specific pattern-rung combination using exponential moving average scoring.

**Type Signature:**

```typescript
interface SkillState {
  readonly id: string;
  readonly tenantId: TenantId;
  readonly userId: string;
  readonly pattern: PatternId;
  readonly rung: RungLevel;
  readonly score: number; // 0-100, rolling average
  readonly attemptsCount: number;
  readonly lastAttemptAt: Date | null;
  readonly unlockedAt: Date | null;
  readonly updatedAt: Date;
  readonly lastAppliedAttemptId: string | null; // Idempotency tracking
}

interface SkillMatrix {
  readonly userId: string;
  readonly skills: readonly SkillState[];
}

// Constants
const RUNG_UNLOCK_THRESHOLD = 70; // Score needed to unlock next rung

// Helper functions
function isRungUnlockedForUser(
  skills: readonly SkillState[],
  pattern: PatternId,
  rung: RungLevel
): boolean;

function computeNewScore(
  currentScore: number,
  attemptsCount: number,
  newAttemptScore: number
): number;
```

**Usage Example:**

```typescript
const skill: SkillState = {
  id: 'skill-001',
  tenantId: 'tenant-1',
  userId: 'user-789',
  pattern: 'SLIDING_WINDOW',
  rung: 2,
  score: 75.5,
  attemptsCount: 5,
  lastAttemptAt: new Date(),
  unlockedAt: new Date(),
  updatedAt: new Date(),
  lastAppliedAttemptId: 'attempt-456'
};

// Compute updated score after new attempt
const newScore = computeNewScore(skill.score, skill.attemptsCount, 85.0);
// Result: 76.0 (exponential moving average)
```

---

### 1.5 Pattern & Rung

**Location:** `/home/aneesh/projects/interview-scaffold/packages/core/src/entities/pattern.ts`, `rung.ts`

**Description:** Defines algorithmic patterns and difficulty levels (rungs) within each pattern.

**Type Signature:**

```typescript
type PatternId =
  | 'SLIDING_WINDOW'
  | 'TWO_POINTERS'
  | 'PREFIX_SUM'
  | 'BINARY_SEARCH'
  | 'BFS'
  | 'DFS'
  | 'DYNAMIC_PROGRAMMING'
  | 'BACKTRACKING'
  | 'GREEDY'
  | 'HEAP'
  | 'TRIE'
  | 'UNION_FIND'
  | 'INTERVAL_MERGING';

interface Pattern {
  readonly id: PatternId;
  readonly name: string;
  readonly description: string;
  readonly prerequisites: readonly PatternId[];
}

type RungLevel = 1 | 2 | 3 | 4 | 5;

interface Rung {
  readonly level: RungLevel;
  readonly name: string;
  readonly description: string;
  readonly unlockThreshold: number; // Score needed to unlock next rung
}

// Rung definitions
const RUNG_DEFINITIONS: Record<RungLevel, Rung> = {
  1: { level: 1, name: 'Foundation', description: 'Single pattern, minimal edge cases', unlockThreshold: 70 },
  2: { level: 2, name: 'Reinforcement', description: 'Pattern recognition with common variations', unlockThreshold: 75 },
  3: { level: 3, name: 'Application', description: 'Real-world constraints and edge cases', unlockThreshold: 80 },
  4: { level: 4, name: 'Integration', description: 'Combine with other patterns', unlockThreshold: 85 },
  5: { level: 5, name: 'Mastery', description: 'Interview-level complexity', unlockThreshold: 90 }
};
```

---

### 1.6 Bug Hunt Entities

**Location:** `/home/aneesh/projects/interview-scaffold/packages/core/src/entities/bug-hunt.ts`

**Description:** Bug Hunt Mode entities for finding bugs in code snippets with deterministic validation.

**Type Signature:**

```typescript
type BugHuntDifficulty = 'EASY' | 'MEDIUM' | 'HARD';
type BugHuntLanguage = 'python' | 'javascript' | 'typescript';

interface BugHuntItem {
  readonly id: string;
  readonly tenantId: string;
  readonly pattern: PatternId;
  readonly difficulty: BugHuntDifficulty;
  readonly language: BugHuntLanguage;
  readonly code: string;
  readonly prompt: string;
  readonly title: string;
  readonly expectedBugLines: readonly number[]; // 1-indexed
  readonly expectedConcepts: readonly string[];
  readonly hint?: string;
  readonly explanation: string;
  readonly createdAt: Date;
}

interface BugHuntSubmission {
  readonly selectedLines: readonly number[];
  readonly explanation: string;
}

type BugHuntResult = 'CORRECT' | 'PARTIAL' | 'INCORRECT';

interface BugHuntValidation {
  readonly result: BugHuntResult;
  readonly lineSelectionCorrect: boolean;
  readonly linesFound: number;
  readonly totalBugLines: number;
  readonly conceptsMatched: boolean;
  readonly matchedConcepts: readonly string[];
  readonly totalConcepts: number;
  readonly llmFeedback?: string;
  readonly llmConfidence?: number;
}

interface BugHuntAttempt {
  readonly id: string;
  readonly tenantId: string;
  readonly userId: string;
  readonly itemId: string;
  readonly submission: BugHuntSubmission | null;
  readonly validation: BugHuntValidation | null;
  readonly startedAt: Date;
  readonly completedAt: Date | null;
  readonly attemptNumber: number;
}

// Validation functions
function validateBugHuntSubmission(
  submission: BugHuntSubmission,
  item: BugHuntItem
): BugHuntValidation;
```

---

### 1.7 Debug Lab Entities

**Location:** `/home/aneesh/projects/interview-scaffold/packages/core/src/entities/debug-lab.ts`

**Description:** Debug Lab Mode entities for taxonomy-aware debugging practice with mini-repos.

**Type Signature:**

```typescript
// Taxonomy
type DefectCategory =
  | 'Functional'
  | 'Concurrency'
  | 'Resource'
  | 'Distributed'
  | 'Heisenbug'
  | 'Environment'
  | 'Container'
  | 'Performance'
  | 'Observability';

type SeverityLevel = 'Critical' | 'Major' | 'Minor' | 'Low';
type PriorityLevel = 'High' | 'Medium' | 'Low';
type DebugLabDifficulty = 'EASY' | 'MEDIUM' | 'HARD' | 'EXPERT';
type DebugLabLanguage = 'javascript' | 'typescript' | 'python';
type DebugLabStatus =
  | 'STARTED'
  | 'TRIAGE_COMPLETED'
  | 'SUBMITTED'
  | 'PASSED'
  | 'FAILED';

interface DebugLabFile {
  readonly path: string;
  readonly content: string;
  readonly editable: boolean;
}

interface REDMetrics {
  readonly rate: number;
  readonly errorRate: number;
  readonly duration: { p50: number; p95: number; p99: number };
  readonly label?: string;
}

interface USEMetrics {
  readonly utilization: number;
  readonly saturation: number;
  readonly errors: number;
  readonly resource: string;
  readonly label?: string;
}

interface ObservabilitySnapshot {
  readonly red?: readonly REDMetrics[];
  readonly use?: readonly USEMetrics[];
  readonly logs?: readonly string[];
  readonly timestamp?: string;
}

interface TriageRubric {
  readonly expectedCategory: DefectCategory;
  readonly expectedSeverity: SeverityLevel;
  readonly expectedPriority: PriorityLevel;
  readonly expectedFirstActions: readonly string[];
  readonly explanation?: string;
}

interface DebugLabItem {
  readonly id: string;
  readonly tenantId: string;
  readonly title: string;
  readonly description: string;
  readonly difficulty: DebugLabDifficulty;
  readonly language: DebugLabLanguage;
  readonly files: readonly DebugLabFile[];
  readonly testCommand: string;
  readonly runnerScript?: string;
  readonly hiddenTests?: readonly DebugLabFile[];
  readonly defectCategory: DefectCategory;
  readonly severity: SeverityLevel;
  readonly priority: PriorityLevel;
  readonly signals: readonly DebugSignal[];
  readonly toolsExpected: readonly DebugTool[];
  readonly requiredTriage: boolean;
  readonly triageRubric?: TriageRubric;
  readonly observabilitySnapshot?: ObservabilitySnapshot;
  readonly solutionExplanation?: string;
  readonly solutionFiles?: readonly DebugLabFile[];
  readonly createdAt: Date;
}

interface TriageAnswers {
  readonly category: DefectCategory;
  readonly severity: SeverityLevel;
  readonly priority: PriorityLevel;
  readonly firstActions: string;
}

interface TriageScore {
  readonly overall: number;
  readonly categoryScore: number;
  readonly severityScore: number;
  readonly priorityScore: number;
  readonly actionsScore: number;
  readonly matchedActions: readonly string[];
  readonly llmFeedback?: string;
}

interface ExecutionResult {
  readonly passed: boolean;
  readonly signalType: ExecutionSignalType;
  readonly testsPassed: number;
  readonly testsTotal: number;
  readonly stdout: string;
  readonly stderr: string;
  readonly exitCode: number;
  readonly executionTimeMs: number;
  readonly hiddenTestsResult?: {
    readonly passed: boolean;
    readonly testsPassed: number;
    readonly testsTotal: number;
  };
}

interface DebugLabAttempt {
  readonly id: string;
  readonly tenantId: string;
  readonly userId: string;
  readonly itemId: string;
  readonly status: DebugLabStatus;
  readonly triageAnswers: TriageAnswers | null;
  readonly triageScore: TriageScore | null;
  readonly submission: DebugLabSubmission | null;
  readonly executionResult: ExecutionResult | null;
  readonly testRunCount: number;
  readonly submissionCount: number;
  readonly startedAt: Date;
  readonly completedAt: Date | null;
}

// Helper functions
function calculateTriageScore(
  answers: TriageAnswers,
  rubric: TriageRubric
): TriageScore;

function determineSignalType(
  exitCode: number,
  stdout: string,
  stderr: string,
  timedOut: boolean
): ExecutionSignalType;
```

---

## 2. Ports (Interfaces)

### 2.1 Repository Ports

**Location:** `/home/aneesh/projects/interview-scaffold/packages/core/src/ports/`

#### AttemptRepo

```typescript
interface AttemptRepo {
  findById(tenantId: TenantId, id: AttemptId): Promise<Attempt | null>;

  findByUser(
    tenantId: TenantId,
    userId: string,
    options?: {
      pattern?: PatternId;
      rung?: RungLevel;
      limit?: number;
    }
  ): Promise<readonly Attempt[]>;

  findCompletedByPatternRung(
    tenantId: TenantId,
    userId: string,
    pattern: PatternId,
    rung: RungLevel,
    limit: number
  ): Promise<readonly Attempt[]>;

  findActive(tenantId: TenantId, userId: string): Promise<Attempt | null>;

  save(attempt: Attempt): Promise<Attempt>;
  update(attempt: Attempt): Promise<Attempt>;
}
```

#### SkillRepo

```typescript
interface IdempotentUpdateResult {
  readonly skill: SkillState;
  readonly wasApplied: boolean; // true if update was applied, false if already applied
}

interface SkillRepo {
  findByUserAndPattern(
    tenantId: TenantId,
    userId: string,
    pattern: PatternId,
    rung: RungLevel
  ): Promise<SkillState | null>;

  findAllByUser(tenantId: TenantId, userId: string): Promise<readonly SkillState[]>;

  getSkillMatrix(tenantId: TenantId, userId: string): Promise<SkillMatrix>;

  save(skill: SkillState): Promise<SkillState>;
  update(skill: SkillState): Promise<SkillState>;
  upsert(skill: SkillState): Promise<SkillState>;

  // Idempotent update to prevent double-counting attempts
  updateIfNotApplied(
    skill: SkillState,
    attemptId: string
  ): Promise<IdempotentUpdateResult>;
}
```

#### ContentRepo

```typescript
interface ContentRepo {
  findById(tenantId: TenantId, id: ProblemId): Promise<Problem | null>;

  findByPatternAndRung(
    tenantId: TenantId,
    pattern: PatternId,
    rung: RungLevel
  ): Promise<readonly Problem[]>;

  findAll(
    tenantId: TenantId,
    options?: {
      pattern?: PatternId;
      rung?: RungLevel;
      limit?: number;
      offset?: number;
    }
  ): Promise<readonly Problem[]>;

  countByPatternAndRung(
    tenantId: TenantId,
    pattern: PatternId,
    rung: RungLevel
  ): Promise<number>;
}
```

#### BugHuntRepo

```typescript
interface BugHuntRepo {
  listItems(tenantId: TenantId): Promise<BugHuntItem[]>;
  findItemById(tenantId: TenantId, itemId: string): Promise<BugHuntItem | null>;
  listItemsByPattern(tenantId: TenantId, pattern: string): Promise<BugHuntItem[]>;

  createAttempt(attempt: BugHuntAttempt): Promise<BugHuntAttempt>;
  findAttemptById(tenantId: TenantId, attemptId: string): Promise<BugHuntAttempt | null>;
  updateAttempt(attempt: BugHuntAttempt): Promise<BugHuntAttempt>;
  listAttemptsByUser(tenantId: TenantId, userId: string): Promise<BugHuntAttempt[]>;
  countUserAttemptsForItem(tenantId: TenantId, userId: string, itemId: string): Promise<number>;
}
```

#### DebugLabRepo

```typescript
interface DebugLabRepo {
  listItems(tenantId: TenantId): Promise<DebugLabItem[]>;
  findItemById(tenantId: TenantId, itemId: string): Promise<DebugLabItem | null>;
  listItemsByCategory(tenantId: TenantId, category: DefectCategory): Promise<DebugLabItem[]>;
  listItemsByDifficulty(tenantId: TenantId, difficulty: DebugLabDifficulty): Promise<DebugLabItem[]>;

  createAttempt(attempt: DebugLabAttempt): Promise<DebugLabAttempt>;
  findAttemptById(tenantId: TenantId, attemptId: string): Promise<DebugLabAttempt | null>;
  updateAttempt(attempt: DebugLabAttempt): Promise<DebugLabAttempt>;
  listAttemptsByUser(tenantId: TenantId, userId: string): Promise<DebugLabAttempt[]>;
  countUserAttemptsForItem(tenantId: TenantId, userId: string, itemId: string): Promise<number>;
  getNextItem(tenantId: TenantId, userId: string): Promise<DebugLabItem | null>;
}
```

---

### 2.2 Service Ports

#### EventSink

**Location:** `/home/aneesh/projects/interview-scaffold/packages/core/src/ports/event-sink.ts`

```typescript
interface EventSink {
  emit(event: DomainEvent): Promise<void>;
}

type DomainEvent =
  | AttemptStartedEvent
  | StepCompletedEvent
  | AttemptCompletedEvent
  | SkillUpdatedEvent
  | HintRequestedEvent;

interface AttemptStartedEvent {
  readonly type: 'ATTEMPT_STARTED';
  readonly tenantId: TenantId;
  readonly userId: string;
  readonly attemptId: AttemptId;
  readonly pattern: PatternId;
  readonly rung: RungLevel;
  readonly timestamp: Date;
}

interface StepCompletedEvent {
  readonly type: 'STEP_COMPLETED';
  readonly tenantId: TenantId;
  readonly userId: string;
  readonly attemptId: AttemptId;
  readonly stepType: StepType;
  readonly result: 'PASS' | 'FAIL' | 'SKIP';
  readonly durationMs: number;
  readonly timestamp: Date;
}

interface AttemptCompletedEvent {
  readonly type: 'ATTEMPT_COMPLETED';
  readonly tenantId: TenantId;
  readonly userId: string;
  readonly attemptId: AttemptId;
  readonly pattern: PatternId;
  readonly rung: RungLevel;
  readonly score: number;
  readonly hintsUsed: number;
  readonly codeSubmissions: number;
  readonly durationMs: number;
  readonly timestamp: Date;
}
```

#### Clock & IdGenerator

```typescript
interface Clock {
  now(): Date;
}

const SystemClock: Clock = {
  now: () => new Date()
};

interface IdGenerator {
  generate(): string;
}

const SimpleIdGenerator: IdGenerator = {
  generate: () => {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).slice(2, 10);
    return `${timestamp}-${random}`;
  }
};
```

#### AuthContext

```typescript
interface AuthContext {
  readonly tenantId: TenantId;
  readonly userId: string;
  readonly roles: readonly string[];
}

interface AuthContextProvider {
  getContext(): Promise<AuthContext>;
  requireContext(): Promise<AuthContext>;
}
```

---

## 3. Use Cases

### 3.1 StartAttempt

**Location:** `/home/aneesh/projects/interview-scaffold/packages/core/src/use-cases/start-attempt.ts`

**Description:** Creates a new attempt for a problem, validates rung unlock, and initializes attempt state.

**Type Signature:**

```typescript
interface StartAttemptInput {
  readonly tenantId: TenantId;
  readonly userId: string;
  readonly problemId: ProblemId;
}

interface StartAttemptOutput {
  readonly attempt: Attempt;
  readonly problem: Problem;
}

interface StartAttemptDeps {
  readonly attemptRepo: AttemptRepo;
  readonly contentRepo: ContentRepo;
  readonly skillRepo: SkillRepo;
  readonly eventSink: EventSink;
  readonly clock: Clock;
  readonly idGenerator: IdGenerator;
}

class AttemptError extends Error {
  constructor(message: string, public readonly code: string);
}

async function startAttempt(
  input: StartAttemptInput,
  deps: StartAttemptDeps
): Promise<StartAttemptOutput>;
```

**Usage Example:**

```typescript
const output = await startAttempt(
  {
    tenantId: 'tenant-1',
    userId: 'user-789',
    problemId: 'prob-123'
  },
  {
    attemptRepo,
    contentRepo,
    skillRepo,
    eventSink,
    clock: SystemClock,
    idGenerator: SimpleIdGenerator
  }
);

console.log(`Attempt started: ${output.attempt.id}`);
```

**Error Codes:**
- `ACTIVE_ATTEMPT_EXISTS`: User already has an active attempt
- `PROBLEM_NOT_FOUND`: Problem ID not found
- `RUNG_LOCKED`: User hasn't unlocked this rung yet

---

### 3.2 SubmitCode

**Location:** `/home/aneesh/projects/interview-scaffold/packages/core/src/use-cases/submit-code.ts`

**Description:** Core use case for code submission. Executes tests, validates code, applies gating rules, computes scores, and updates skill state.

**Type Signature:**

```typescript
interface SubmitCodeInput {
  readonly tenantId: TenantId;
  readonly userId: string;
  readonly attemptId: AttemptId;
  readonly code: string;
  readonly language: string;
}

interface SubmitCodeOutput {
  readonly attempt: Attempt;
  readonly testResults: readonly TestResultData[];
  readonly passed: boolean;
  readonly validation: CodingValidationData;
  readonly gatingDecision: GatingDecision;
  readonly score?: AttemptScore; // Only present when COMPLETED
}

interface SubmitCodeDeps {
  readonly attemptRepo: AttemptRepo;
  readonly contentRepo: ContentRepo;
  readonly skillRepo: SkillRepo;
  readonly eventSink: EventSink;
  readonly clock: Clock;
  readonly idGenerator: IdGenerator;
  readonly codeExecutor: CodeExecutor;
  readonly llmValidation?: LLMValidationPort; // Optional
}

interface CodeExecutor {
  execute(
    code: string,
    language: string,
    testCases: readonly { input: string; expectedOutput: string }[]
  ): Promise<readonly TestResultData[]>;

  executeWithTimeout?(
    code: string,
    language: string,
    testCases: readonly { input: string; expectedOutput: string }[],
    timeoutMs: number
  ): Promise<readonly TestResultData[]>;
}

async function submitCode(
  input: SubmitCodeInput,
  deps: SubmitCodeDeps
): Promise<SubmitCodeOutput>;
```

**Usage Example:**

```typescript
const result = await submitCode(
  {
    tenantId: 'tenant-1',
    userId: 'user-789',
    attemptId: 'attempt-456',
    code: 'function solve(arr) { return arr.reduce((a,b) => a+b); }',
    language: 'javascript'
  },
  {
    attemptRepo,
    contentRepo,
    skillRepo,
    eventSink,
    clock: SystemClock,
    idGenerator: SimpleIdGenerator,
    codeExecutor: pistonExecutor,
    llmValidation: llmValidationAdapter
  }
);

if (result.passed) {
  console.log('Success! Score:', result.score?.overall);
} else {
  console.log('Gating action:', result.gatingDecision.action);
}
```

**Validation Pipeline:**
1. Rubric grading (test pass rate, pattern correctness)
2. Pattern-specific heuristics (e.g., nested loops in sliding window)
3. Forbidden concept detection
4. Optional LLM validation
5. Time budget validation (large hidden tests)
6. Gating decision (PROCEED, REQUIRE_REFLECTION, SHOW_MICRO_LESSON, BLOCK_SUBMISSION)

**Error Codes:**
- `ATTEMPT_NOT_FOUND`: Attempt ID not found
- `UNAUTHORIZED`: User does not own this attempt
- `THINKING_GATE_REQUIRED`: Must pass thinking gate first
- `REFLECTION_REQUIRED`: Must pass reflection before resubmitting
- `INVALID_STATE`: Cannot submit in current state

---

### 3.3 ComputeAttemptScore

**Location:** `/home/aneesh/projects/interview-scaffold/packages/core/src/use-cases/compute-attempt-score.ts`

**Description:** Pure function to compute attempt score from attempt data. No side effects, fully deterministic.

**Type Signature:**

```typescript
interface ComputeAttemptScoreInput {
  readonly attempt: Attempt;
}

interface ComputeAttemptScoreOutput {
  readonly score: AttemptScore;
}

function computeAttemptScore(
  input: ComputeAttemptScoreInput
): ComputeAttemptScoreOutput;

// Scoring constants (0-100 scale)
const SCORING_CONSTANTS = {
  HINT_PENALTIES: {
    DIRECTIONAL_QUESTION: 2,
    HEURISTIC_HINT: 5,
    CONCEPT_INJECTION: 10,
    MICRO_EXAMPLE: 15,
    PATCH_SNIPPET: 25
  },
  MAX_SUBMISSIONS_BEFORE_PENALTY: 2,
  SUBMISSION_PENALTY: 5,
  THINKING_GATE_FAIL_PENALTY: 10,
  REFLECTION_FAIL_PENALTY: 3,
  FAILED_TEST_PENALTY: 2,
  BONUS_FIRST_TRY_PASS: 10,
  BONUS_NO_HINTS: 5,
  BONUS_PERFECT_THINKING: 5,
  BONUS_FAST_COMPLETION: 5,
  WEIGHT_PATTERN_RECOGNITION: 0.25,
  WEIGHT_IMPLEMENTATION: 0.35,
  WEIGHT_EDGE_CASES: 0.25,
  WEIGHT_EFFICIENCY: 0.15
} as const;
```

**Usage Example:**

```typescript
const scoreResult = computeAttemptScore({ attempt });
console.log('Overall score:', scoreResult.score.overall); // 0-100
console.log('Pattern recognition:', scoreResult.score.patternRecognition);
console.log('Implementation:', scoreResult.score.implementation);
console.log('Edge cases:', scoreResult.score.edgeCases);
console.log('Efficiency:', scoreResult.score.efficiency);
console.log('Bonus:', scoreResult.score.bonus);
```

---

### 3.4 DecideProgressionAction

**Location:** `/home/aneesh/projects/interview-scaffold/packages/core/src/use-cases/decide-progression-action.ts`

**Description:** Pure function to determine post-attempt progression (serve sibling, promote rung, show micro-lesson).

**Type Signature:**

```typescript
type ProgressionAction =
  | 'SERVE_SIBLING'
  | 'RETRY_SAME'
  | 'MICRO_LESSON_GATE'
  | 'PROMOTE_RUNG'
  | 'COMPLETE_RUNG';

interface ProgressionDecision {
  readonly action: ProgressionAction;
  readonly reason: string;
  readonly nextProblemId?: string;
  readonly nextRung?: RungLevel;
  readonly microLessonTopic?: string;
}

interface DecideProgressionInput {
  readonly attempt: Attempt;
  readonly recentAttempts: readonly Attempt[];
  readonly availableSiblings: readonly Problem[];
}

function decideProgressionAction(
  input: DecideProgressionInput
): ProgressionDecision;

// Progression constants
const PROGRESSION_CONSTANTS = {
  MASTERY_WINDOW: 5,
  MASTERY_MIN_ATTEMPTS: 3,
  LOW_SCORE_THRESHOLD: 50,
  CONSECUTIVE_FAILURES_FOR_MICRO_LESSON: 2
} as const;
```

**Usage Example:**

```typescript
const decision = decideProgressionAction({
  attempt: completedAttempt,
  recentAttempts: [completedAttempt, ...previousAttempts],
  availableSiblings: siblingProblems
});

switch (decision.action) {
  case 'PROMOTE_RUNG':
    console.log('Unlocked rung', decision.nextRung);
    break;
  case 'SERVE_SIBLING':
    console.log('Next problem:', decision.nextProblemId);
    break;
  case 'MICRO_LESSON_GATE':
    console.log('Show lesson:', decision.microLessonTopic);
    break;
}
```

---

## 4. Validation System

### 4.1 Thinking Gate Validation

**Location:** `/home/aneesh/projects/interview-scaffold/packages/core/src/validation/thinking-gate.ts`

**Description:** Deterministic validation of pattern selection and invariant quality. No LLM calls in base validation.

**Type Signature:**

```typescript
interface ThinkingGateInput {
  readonly selectedPattern: string;
  readonly statedInvariant: string;
  readonly statedComplexity?: string | null;
}

interface ThinkingGateValidationResult {
  readonly passed: boolean;
  readonly errors: readonly ThinkingGateError[];
  readonly warnings: readonly ThinkingGateWarning[];
  readonly llmAugmented: boolean;
}

interface ThinkingGateError {
  readonly field: 'pattern' | 'invariant' | 'complexity';
  readonly code: string;
  readonly message: string;
  readonly hint?: string;
}

interface ThinkingGateContext {
  readonly problem: Problem;
  readonly allowedPatterns: readonly PatternId[];
}

// Deterministic validation
function validateThinkingGate(
  input: ThinkingGateInput,
  context: ThinkingGateContext
): ThinkingGateValidationResult;

// Optional LLM augmentation (can only add warnings, not override errors)
interface ThinkingGateLLMPort {
  isEnabled(): boolean;
  augmentValidation(
    input: ThinkingGateInput,
    context: ThinkingGateContext,
    deterministicResult: ThinkingGateValidationResult
  ): Promise<ThinkingGateValidationResult>;
}

async function validateThinkingGateWithLLM(
  input: ThinkingGateInput,
  context: ThinkingGateContext,
  llmPort: ThinkingGateLLMPort
): Promise<ThinkingGateValidationResult>;

// Constants
const MIN_INVARIANT_LENGTH = 20;

const PATTERN_INVARIANT_KEYWORDS: Record<PatternId, readonly string[]> = {
  SLIDING_WINDOW: ['window', 'left', 'right', 'expand', 'shrink', ...],
  TWO_POINTERS: ['left', 'right', 'pointer', 'converge', ...],
  // ... (all patterns have keywords)
};
```

**Usage Example:**

```typescript
const result = validateThinkingGate(
  {
    selectedPattern: 'SLIDING_WINDOW',
    statedInvariant: 'The window always contains at most k distinct elements',
    statedComplexity: 'O(n)'
  },
  {
    problem,
    allowedPatterns: PATTERNS
  }
);

if (!result.passed) {
  for (const error of result.errors) {
    console.error(`${error.field}: ${error.message}`);
    if (error.hint) console.log(`Hint: ${error.hint}`);
  }
}
```

---

### 4.2 Code Gating

**Location:** `/home/aneesh/projects/interview-scaffold/packages/core/src/validation/gating.ts`

**Description:** Rule-based gating system that determines whether to proceed, require reflection, or show micro-lesson.

**Type Signature:**

```typescript
type GatingAction =
  | 'PROCEED'
  | 'PROCEED_WITH_REFLECTION'
  | 'SHOW_MICRO_LESSON'
  | 'REQUIRE_REFLECTION'
  | 'BLOCK_SUBMISSION';

interface GatingDecision {
  readonly action: GatingAction;
  readonly reason: string;
  readonly microLessonId?: string;
  readonly requiredReflectionType?: string;
  readonly successReflectionPrompt?: string;
}

interface GatingContext {
  readonly pattern: PatternId;
  readonly rung: number;
  readonly rubric: RubricResult;
  readonly errors: readonly ErrorEvent[];
  readonly attemptCount: number;
  readonly hintsUsed: number;
  readonly previousFailures: readonly ErrorType[];
}

function makeGatingDecision(context: GatingContext): GatingDecision;

// Rule definitions
interface GatingRule {
  readonly id: string;
  readonly priority: number;
  readonly condition: (context: GatingContext) => boolean;
  readonly action: GatingAction;
  readonly reason: string;
  readonly microLessonId?: string;
}

// Example rules (sorted by priority)
const GATING_RULES: GatingRule[] = [
  {
    id: 'block_forbidden',
    priority: 1,
    condition: (ctx) => ctx.errors.some(e => e.type === 'FORBIDDEN_CONCEPT'),
    action: 'BLOCK_SUBMISSION',
    reason: 'Forbidden concept detected'
  },
  {
    id: 'microlesson_nested_loops',
    priority: 10,
    condition: (ctx) =>
      ctx.pattern === 'SLIDING_WINDOW' &&
      ctx.errors.some(e => e.type === 'NESTED_LOOPS_DETECTED'),
    action: 'SHOW_MICRO_LESSON',
    reason: 'Detected O(n²) approach',
    microLessonId: 'sliding_window_intro'
  },
  // ... more rules
];
```

**Usage Example:**

```typescript
const decision = makeGatingDecision({
  pattern: 'SLIDING_WINDOW',
  rung: 2,
  rubric: { grade: 'PARTIAL', score: 0.6, criteria: [] },
  errors: [{ type: 'NESTED_LOOPS_DETECTED', severity: 'ERROR', message: '...' }],
  attemptCount: 2,
  hintsUsed: 1,
  previousFailures: []
});

console.log('Action:', decision.action); // 'SHOW_MICRO_LESSON'
console.log('Lesson:', decision.microLessonId); // 'sliding_window_intro'
```

---

### 4.3 Rubric Scoring

**Location:** `/home/aneesh/projects/interview-scaffold/packages/core/src/validation/rubric.ts`

**Description:** Deterministic rubric-based grading system with weighted criteria.

**Type Signature:**

```typescript
type RubricGrade = 'PASS' | 'PARTIAL' | 'FAIL';

interface RubricResult {
  readonly grade: RubricGrade;
  readonly score: number; // 0-1
  readonly criteria: readonly CriterionResult[];
}

interface CriterionResult {
  readonly id: string;
  readonly name: string;
  readonly passed: boolean;
  readonly weight: number;
  readonly feedback?: string;
}

interface RubricDefinition {
  readonly id: string;
  readonly pattern: PatternId;
  readonly rung: number;
  readonly criteria: readonly CriterionDefinition[];
  readonly passThreshold: number; // 0-1
  readonly partialThreshold: number; // 0-1
}

interface CriterionDefinition {
  readonly id: string;
  readonly name: string;
  readonly weight: number;
  readonly evaluate: (context: EvaluationContext) => boolean;
  readonly feedback: { pass: string; fail: string };
}

interface EvaluationContext {
  readonly code: string;
  readonly language: string;
  readonly testsPassed: number;
  readonly testsTotal: number;
  readonly executionTimeMs?: number;
  readonly memoryUsageMb?: number;
  readonly patternDetected?: PatternId;
  readonly invariantStated?: string;
}

function gradeRubric(
  rubric: RubricDefinition,
  context: EvaluationContext
): RubricResult;

function gradeSubmission(config: {
  pattern: PatternId;
  rung: number;
  context: EvaluationContext;
}): RubricResult;

// Standard criteria factories
const StandardCriteria = {
  allTestsPass(weight: number = 0.4): CriterionDefinition;
  majorityTestsPass(weight: number = 0.3): CriterionDefinition;
  correctPattern(expectedPattern: PatternId, weight: number = 0.2): CriterionDefinition;
  invariantStated(weight: number = 0.1): CriterionDefinition;
  timeLimit(limitMs: number, weight: number = 0.15): CriterionDefinition;
  memoryLimit(limitMb: number, weight: number = 0.1): CriterionDefinition;
};
```

**Usage Example:**

```typescript
const result = gradeSubmission({
  pattern: 'SLIDING_WINDOW',
  rung: 2,
  context: {
    code: '...',
    language: 'javascript',
    testsPassed: 8,
    testsTotal: 10,
    patternDetected: 'SLIDING_WINDOW'
  }
});

console.log('Grade:', result.grade); // 'PASS' | 'PARTIAL' | 'FAIL'
console.log('Score:', result.score); // 0.8
for (const criterion of result.criteria) {
  console.log(`${criterion.name}: ${criterion.passed ? 'PASS' : 'FAIL'}`);
}
```

---

### 4.4 Validation Types

**Location:** `/home/aneesh/projects/interview-scaffold/packages/core/src/validation/types.ts`

**Description:** Type definitions for validation engine.

**Type Signature:**

```typescript
type ErrorType =
  | 'WRONG_PATTERN'
  | 'PATTERN_NOT_STATED'
  | 'FORBIDDEN_CONCEPT'
  | 'NESTED_LOOPS_DETECTED'
  | 'WRONG_SHRINK_MECHANISM'
  | 'MISSING_VISITED_CHECK'
  | 'MISSING_BACKTRACK'
  | 'MISSING_BASE_CASE'
  | 'INCOMPLETE_TRAVERSAL'
  | 'USING_BFS_FOR_DFS'
  | 'VISIT_ORDER_ERROR'
  | 'OFF_BY_ONE'
  | 'BOUNDARY_ERROR'
  | 'IMPLEMENTATION_BUG'
  | 'COMPLEXITY_TOO_HIGH'
  | 'SUBOPTIMAL_SOLUTION'
  | 'TIME_BUDGET_EXCEEDED'
  | 'WRONG_OUTPUT'
  | 'RUNTIME_ERROR'
  | 'TIMEOUT'
  | 'UNKNOWN';

interface ErrorEvent {
  readonly type: ErrorType;
  readonly severity: 'ERROR' | 'WARNING' | 'INFO';
  readonly message: string;
  readonly location?: CodeLocation;
  readonly evidence?: string[];
  readonly suggestion?: string;
}

interface CodeLocation {
  readonly line: number;
  readonly column?: number;
  readonly snippet?: string;
}
```

---

## 5. Adapters

### 5.1 Piston Code Executor

**Location:** `/home/aneesh/projects/interview-scaffold/packages/adapter-piston/src/piston-executor.ts`

**Description:** Adapter for executing code via Piston API with language-specific wrappers.

**Type Signature:**

```typescript
interface PistonExecutorConfig {
  readonly pistonUrl?: string; // Default: 'https://emkc.org/api/v2/piston'
  readonly compileTimeout?: number; // milliseconds
  readonly runTimeout?: number; // milliseconds
  readonly memoryLimit?: number; // bytes (-1 for unlimited)
}

function createPistonExecutor(
  config?: PistonExecutorConfig
): CodeExecutor;

function createPistonExecutorWithFallback(
  config?: PistonExecutorConfig
): CodeExecutor; // Gracefully handles service unavailability

// Supported languages
type SupportedLanguage = 'javascript' | 'python' | 'java' | 'cpp';

// Language configs (internal)
const LANGUAGE_CONFIGS = {
  javascript: {
    pistonLanguage: 'javascript',
    pistonVersion: '18.15.0',
    fileName: 'main.js',
    compileTimeout: 10000,
    runTimeout: 3000
  },
  python: {
    pistonLanguage: 'python',
    pistonVersion: '3.10.0',
    fileName: 'main.py',
    compileTimeout: 10000,
    runTimeout: 3000
  },
  // ... more languages
};
```

**Usage Example:**

```typescript
const executor = createPistonExecutor({
  runTimeout: 5000,
  memoryLimit: 100 * 1024 * 1024 // 100MB
});

const results = await executor.execute(
  'function solve(arr) { return arr.reduce((a,b) => a+b); }',
  'javascript',
  [
    { input: '[1, 2, 3]', expectedOutput: '6' },
    { input: '[10, 20]', expectedOutput: '30' }
  ]
);

for (const result of results) {
  console.log(`Test: ${result.input} => ${result.actual} (${result.passed ? 'PASS' : 'FAIL'})`);
  if (result.error) console.error('Error:', result.error);
}
```

**Status Codes:**
- `TO`: Time Limit Exceeded
- `RE`: Runtime Error
- `SG`: Process killed by signal
- `OL`: Output Limit Exceeded
- `XX`: Internal execution error

---

### 5.2 LLM Validation Adapter

**Location:** `/home/aneesh/projects/interview-scaffold/packages/adapter-llm/src/index.ts`

**Description:** Adapter for LLM-based code validation using Anthropic Claude.

**Type Signature:**

```typescript
interface LLMClient {
  generateHint(params: GenerateHintParams): Promise<GenerateHintResult>;
  generateReflection(params: GenerateReflectionParams): Promise<GenerateReflectionResult>;
  evaluateThinkingGate(params: EvaluateThinkingGateParams): Promise<EvaluateThinkingGateResult>;
  evaluateCode(params: EvaluateCodeParams): Promise<EvaluateCodeResult>;
}

function createLLMClient(apiKey: string): LLMClient;

interface LLMValidationPort {
  validateCode(request: LLMValidationRequest): Promise<LLMValidationResponse | null>;
  isEnabled(): boolean;
}

function createLLMValidationAdapter(
  client: LLMClient,
  problemStatement: string
): LLMValidationPort;

function createNullLLMValidation(): LLMValidationPort; // Always disabled

interface EvaluateCodeResult {
  readonly grade: 'PASS' | 'PARTIAL' | 'FAIL';
  readonly confidence: number; // 0-1
  readonly patternRecognized: string | null;
  readonly errors: {
    type: string;
    severity: 'ERROR' | 'WARNING';
    message: string;
    lineNumber?: number;
  }[];
  readonly feedback: string;
  readonly suggestedMicroLesson: string | null;
}
```

**Usage Example:**

```typescript
const llmClient = createLLMClient(process.env.ANTHROPIC_API_KEY!);
const llmValidation = createLLMValidationAdapter(llmClient, problemStatement);

// Used internally by submitCode use case
const llmResult = await llmValidation.validateCode({
  code: userCode,
  language: 'javascript',
  expectedPattern: 'SLIDING_WINDOW',
  testResults,
  heuristicErrors
});

if (llmResult && llmResult.confidence >= 0.8) {
  console.log('LLM feedback:', llmResult.feedback);
}
```

---

### 5.3 Database Adapter

**Location:** `/home/aneesh/projects/interview-scaffold/packages/adapter-db/src/repositories/`

**Description:** Drizzle ORM-based repository implementations for PostgreSQL.

**Type Signature:**

```typescript
import { drizzle, type PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';

type DbClient = PostgresJsDatabase<typeof schema>;

function createDbClient(connectionString: string): DbClient;

// Repository factories
function createAttemptRepo(db: DbClient): AttemptRepo;
function createSkillRepo(db: DbClient): SkillRepo;
function createContentRepo(db: DbClient): ContentRepo;
```

**Usage Example:**

```typescript
import { createDbClient } from '@scaffold/adapter-db';
import { createAttemptRepo } from '@scaffold/adapter-db/repositories';

const db = createDbClient(process.env.DATABASE_URL!);
const attemptRepo = createAttemptRepo(db);

const attempt = await attemptRepo.findById('tenant-1', 'attempt-456');
```

**Schema Tables:**
- `attempts`: Attempt records
- `steps`: Step records (joined with attempts)
- `skills`: Skill state records
- `problems`: Problem content (seed data)
- `bug_hunt_items`, `bug_hunt_attempts`: Bug Hunt mode
- `debug_lab_items`, `debug_lab_attempts`: Debug Lab mode

---

### 5.4 Auth Adapter

**Location:** `/home/aneesh/projects/interview-scaffold/packages/adapter-auth/src/index.ts`

**Description:** Supabase-based authentication context provider.

**Type Signature:**

```typescript
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

interface SupabaseAuthContext {
  createAuthContextProvider(supabase: SupabaseClient): AuthContextProvider;
}
```

**Usage Example:**

```typescript
import { createClient } from '@supabase/supabase-js';
import { createAuthContextProvider } from '@scaffold/adapter-auth';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const authProvider = createAuthContextProvider(supabase);
const context = await authProvider.requireContext();
console.log('User ID:', context.userId);
```

---

## 6. Web App Components

### 6.1 API Route Handlers

**Location:** `/home/aneesh/projects/interview-scaffold/apps/web/src/app/api/`

**Structure:**

```
api/
├── attempts/
│   ├── start/route.ts                    # POST /api/attempts/start
│   └── [attemptId]/
│       ├── route.ts                      # GET /api/attempts/:attemptId
│       ├── submit/route.ts               # POST /api/attempts/:attemptId/submit
│       ├── hint/route.ts                 # POST /api/attempts/:attemptId/hint
│       ├── step/route.ts                 # POST /api/attempts/:attemptId/step
│       ├── trace/route.ts                # POST /api/attempts/:attemptId/trace
│       ├── adversary/route.ts            # POST /api/attempts/:attemptId/adversary
│       ├── pattern-discovery/
│       │   ├── start/route.ts            # POST /api/attempts/:attemptId/pattern-discovery/start
│       │   ├── answer/route.ts           # POST /api/attempts/:attemptId/pattern-discovery/answer
│       │   └── abandon/route.ts          # POST /api/attempts/:attemptId/pattern-discovery/abandon
│       └── pattern-challenge/
│           ├── check/route.ts            # POST /api/attempts/:attemptId/pattern-challenge/check
│           ├── respond/route.ts          # POST /api/attempts/:attemptId/pattern-challenge/respond
│           └── skip/route.ts             # POST /api/attempts/:attemptId/pattern-challenge/skip
├── problems/
│   └── next/route.ts                     # GET /api/problems/next
├── skills/
│   └── route.ts                          # GET /api/skills
├── bug-hunt/
│   ├── items/
│   │   ├── route.ts                      # GET /api/bug-hunt/items
│   │   └── [itemId]/route.ts            # GET /api/bug-hunt/items/:itemId
│   └── attempts/
│       ├── route.ts                      # POST /api/bug-hunt/attempts
│       └── [attemptId]/
│           └── submit/route.ts           # POST /api/bug-hunt/attempts/:attemptId/submit
└── debug-lab/
    ├── items/route.ts                    # GET /api/debug-lab/items
    ├── next/route.ts                     # GET /api/debug-lab/next
    ├── start/route.ts                    # POST /api/debug-lab/start
    └── [attemptId]/
        ├── triage/route.ts               # POST /api/debug-lab/:attemptId/triage
        ├── run-tests/route.ts            # POST /api/debug-lab/:attemptId/run-tests
        └── submit/route.ts               # POST /api/debug-lab/:attemptId/submit
```

**Example Handler Pattern:**

```typescript
// apps/web/src/app/api/attempts/[attemptId]/submit/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { submitCode } from '@scaffold/core/use-cases';
import { deps } from '@/lib/deps'; // Dependency injection

export async function POST(
  request: NextRequest,
  { params }: { params: { attemptId: string } }
) {
  try {
    const body = await request.json();
    const { code, language } = body;
    const authContext = await deps.authProvider.requireContext();

    const result = await submitCode(
      {
        tenantId: authContext.tenantId,
        userId: authContext.userId,
        attemptId: params.attemptId,
        code,
        language
      },
      {
        attemptRepo: deps.attemptRepo,
        contentRepo: deps.contentRepo,
        skillRepo: deps.skillRepo,
        eventSink: deps.eventSink,
        clock: deps.clock,
        idGenerator: deps.idGenerator,
        codeExecutor: deps.codeExecutor,
        llmValidation: deps.llmValidation
      }
    );

    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: error.message },
      { status: error.code === 'UNAUTHORIZED' ? 403 : 500 }
    );
  }
}
```

---

### 6.2 Page Components

**Location:** `/home/aneesh/projects/interview-scaffold/apps/web/src/app/`

**Key Pages:**

```typescript
// apps/web/src/app/practice/[attemptId]/page.tsx
// Main practice page with code editor, test results, and feedback
export default async function PracticePage({
  params
}: {
  params: { attemptId: string };
}) {
  const attempt = await fetchAttempt(params.attemptId);
  const problem = await fetchProblem(attempt.problemId);

  return (
    <div>
      <ProblemStatement problem={problem} />
      <CodeEditor attemptId={params.attemptId} />
      <TestResults attemptId={params.attemptId} />
      <ThinkingGate attemptId={params.attemptId} />
      <ReflectionForm attemptId={params.attemptId} />
    </div>
  );
}

// apps/web/src/app/bug-hunt/page.tsx
// Bug hunt mode UI
export default function BugHuntPage() {
  return (
    <div>
      <BugHuntItemList />
      <BugHuntEditor />
    </div>
  );
}

// apps/web/src/app/debug-lab/page.tsx
// Debug lab mode UI with multi-file editor and observability panel
export default function DebugLabPage() {
  return (
    <div>
      <MultiFileEditor />
      <ObservabilityPanel />
      <TriageForm />
    </div>
  );
}
```

---

### 6.3 Shared Components

**Location:** `/home/aneesh/projects/interview-scaffold/apps/web/src/components/`

**Key Components:**

```typescript
// CodeEditor.tsx
interface CodeEditorProps {
  attemptId: string;
  initialCode?: string;
  language?: string;
  onSubmit?: (code: string) => void;
}
export function CodeEditor(props: CodeEditorProps): JSX.Element;

// TestResults.tsx
interface TestResultsProps {
  results: TestResultData[];
  validation?: CodingValidationData;
}
export function TestResults(props: TestResultsProps): JSX.Element;

// ThinkingGate.tsx
interface ThinkingGateProps {
  attemptId: string;
  problem: Problem;
  onSubmit?: (data: ThinkingGateData) => void;
}
export function ThinkingGate(props: ThinkingGateProps): JSX.Element;

// ReflectionForm.tsx
interface ReflectionFormProps {
  attemptId: string;
  question: string;
  options: { id: string; text: string }[];
  onSubmit?: (selectedId: string) => void;
}
export function ReflectionForm(props: ReflectionFormProps): JSX.Element;

// PatternDiscovery.tsx
interface PatternDiscoveryProps {
  attemptId: string;
  mode: 'HEURISTIC' | 'SOCRATIC';
}
export function PatternDiscovery(props: PatternDiscoveryProps): JSX.Element;

// PatternChallenge.tsx (Advocate's Trap)
interface PatternChallengeProps {
  attemptId: string;
  challengeData: PatternChallengeData;
}
export function PatternChallenge(props: PatternChallengeProps): JSX.Element;

// AdversaryChallenge.tsx
interface AdversaryChallengeProps {
  attemptId: string;
  prompt: AdversaryPrompt;
}
export function AdversaryChallenge(props: AdversaryChallengeProps): JSX.Element;

// InvariantBuilder.tsx (fill-in-the-blanks template)
interface InvariantBuilderProps {
  templateId: string;
  onComplete?: (choices: Record<string, number>) => void;
}
export function InvariantBuilder(props: InvariantBuilderProps): JSX.Element;

// TraceVisualization.tsx
interface TraceVisualizationProps {
  traceData: TraceEvent[];
}
export function TraceVisualization(props: TraceVisualizationProps): JSX.Element;

// MultiFileEditor.tsx (Debug Lab)
interface MultiFileEditorProps {
  files: DebugLabFile[];
  onChange?: (path: string, content: string) => void;
}
export function MultiFileEditor(props: MultiFileEditorProps): JSX.Element;

// ObservabilityPanel.tsx (Debug Lab)
interface ObservabilityPanelProps {
  snapshot: ObservabilitySnapshot;
}
export function ObservabilityPanel(props: ObservabilityPanelProps): JSX.Element;

// TriageForm.tsx (Debug Lab)
interface TriageFormProps {
  onSubmit?: (answers: TriageAnswers) => void;
}
export function TriageForm(props: TriageFormProps): JSX.Element;
```

---

### 6.4 Shared Utilities

**Location:** `/home/aneesh/projects/interview-scaffold/apps/web/src/lib/`

```typescript
// deps.ts - Dependency injection container
export const deps = {
  attemptRepo: createAttemptRepo(db),
  contentRepo: createContentRepo(db),
  skillRepo: createSkillRepo(db),
  eventSink: createEventSink(),
  clock: SystemClock,
  idGenerator: SimpleIdGenerator,
  codeExecutor: createPistonExecutor(),
  llmValidation: createLLMValidationAdapter(llmClient, problemStatement),
  authProvider: createAuthContextProvider(supabase)
};

// in-memory-repos.ts - In-memory implementations for testing
export function createInMemoryAttemptRepo(): AttemptRepo;
export function createInMemorySkillRepo(): SkillRepo;
export function createInMemoryContentRepo(): ContentRepo;

// bug-hunt-repo.ts - In-memory Bug Hunt repository
export function createInMemoryBugHuntRepo(): BugHuntRepo;

// debug-lab-repo.ts - In-memory Debug Lab repository
export function createInMemoryDebugLabRepo(): DebugLabRepo;
```

---

## 7. Limitations & Constraints

### What is NOT Covered

1. **Distributed Tracing**: No integrated tracing for observability across services.
2. **Caching Layer**: No Redis or in-memory cache for frequently accessed data.
3. **Real-time Collaboration**: No WebSocket support for multi-user sessions.
4. **File Upload**: No support for uploading test data or custom problems.
5. **Video/Audio**: No video tutorials or audio explanations embedded.
6. **Mobile App**: Web-only, no native mobile application.
7. **Offline Mode**: Requires internet connection for all operations.

### Known Boundaries

1. **Piston API Rate Limits**: Public Piston API has rate limits (1 req per 200ms). Production should use self-hosted Piston or commercial service.
2. **LLM Validation**: Optional and degrades gracefully if API unavailable or disabled.
3. **Code Execution Security**: Relies on Piston sandboxing. Do not execute untrusted code outside Piston.
4. **Test Case Size**: Large test inputs may exceed Piston output limits (configurable).
5. **Language Support**: Limited to JavaScript, Python, Java, C++ (extendable via language configs).
6. **Pattern Coverage**: 13 patterns defined; adding new patterns requires updating validation heuristics.
7. **Multi-tenancy**: Tenant ID is required for all operations but not enforced at database level (application-level isolation).

### Open Questions & Ambiguities

1. **Skill Decay**: No time-based skill decay implemented. Scores are permanent unless overridden by new attempts.
2. **Pattern Prerequisites**: Pattern prerequisites defined but not enforced in problem selection.
3. **Reflection Questions**: Currently hard-coded or LLM-generated. No structured question bank.
4. **Micro-Lesson Delivery**: Micro-lessons defined in code, not stored in database or CMS.
5. **Event Replay**: Events emitted but no event replay or audit log persistence configured.
6. **Idempotency**: Skill updates use attempt ID for idempotency, but no global idempotency key system for API calls.

---

**Document Scope:**

This document covers:
- All core entities and their relationships
- Port interfaces for repositories and services
- Primary use cases (StartAttempt, SubmitCode, ComputeScore, DecideProgression)
- Validation system (Thinking Gate, Gating, Rubric, Types)
- Adapter implementations (Piston, LLM, Database, Auth)
- Web app structure (API routes, pages, components)

**Not Covered:**
- Deployment infrastructure (Docker, Kubernetes, CI/CD)
- Database migrations and seeding scripts
- Test suite structure and test utilities
- Environment variable configuration details
- Performance benchmarks and profiling results

---

**Based on code analysis as of:** 2026-01-18
**Repository:** `/home/aneesh/projects/interview-scaffold`
