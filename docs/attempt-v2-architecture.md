# Attempt V2 Flow Architecture

## Overview

This document defines the architecture for the new 5-step attempt flow, replacing the previous 3-step (Approach → Code → Test) flow.

## New Flow Steps

```
┌─────────────┐    ┌─────────┐    ┌────────────┐    ┌─────────┐    ┌──────────┐    ┌──────────┐
│  UNDERSTAND │ -> │  PLAN   │ -> │ IMPLEMENT  │ -> │ VERIFY  │ -> │ REFLECT  │ -> │ COMPLETE │
│  (Feynman)  │    │(Pattern)│    │  (Code)    │    │ (Test)  │    │(Generalize)   │          │
└─────────────┘    └─────────┘    └────────────┘    └─────────┘    └──────────┘    └──────────┘
```

### Step Descriptions

1. **UNDERSTAND** (Feynman Gate)
   - User explains the problem "like I'm 12"
   - Structured fields: inputs/outputs, constraints, example walkthrough, one wrong approach
   - AI evaluates and may ask follow-up questions
   - Passes when AI confirms understanding (no solution leakage)

2. **PLAN** (Pattern + Invariant)
   - AI suggests 2-3 candidate patterns based on user's explanation
   - User selects pattern with confidence rating
   - Invariant Builder (for rung 1-2 in beginner mode) or free-text
   - Low confidence in beginner mode triggers Pattern Discovery

3. **IMPLEMENT** (Coding)
   - User writes code with hint budget visible
   - Progressive hints (Socratic style)
   - Same editor experience as before

4. **VERIFY** (Test + Debug)
   - Run tests, see results
   - On failure: "Explain why" flow with AI assistance (no solution code)
   - Trace visualization for debugging

5. **REFLECT** (Generalize)
   - Cues for next time
   - Invariant summary
   - Micro-lesson link
   - Optional adversary challenge

---

## State Machine

| Current State | Trigger | Next State | Conditions |
|---------------|---------|------------|------------|
| UNDERSTAND | submit explanation | UNDERSTAND | AI returns NEEDS_WORK |
| UNDERSTAND | submit explanation | PLAN | AI returns PASS |
| UNDERSTAND | skip (expert only) | PLAN | mode = EXPERT |
| PLAN | suggest patterns | PLAN | wait for selection |
| PLAN | choose pattern | PLAN | low confidence + beginner → discovery |
| PLAN | choose pattern | IMPLEMENT | pattern validated |
| PLAN | skip (expert only) | IMPLEMENT | mode = EXPERT |
| IMPLEMENT | submit code | VERIFY | code submitted |
| IMPLEMENT | request hint | IMPLEMENT | hints remaining > 0 |
| VERIFY | tests run | VERIFY | tests failed, explain flow |
| VERIFY | tests pass | REFLECT | all tests pass |
| VERIFY | retry | IMPLEMENT | user wants to fix code |
| REFLECT | submit reflection | COMPLETE | reflection captured |
| REFLECT | skip | COMPLETE | user skips reflection |

### Mode Behavior

| Mode | UNDERSTAND | PLAN | Skip Rules |
|------|------------|------|------------|
| BEGINNER | Required, structured | Required, auto-discovery on low confidence | No skipping |
| EXPERT | Required but less strict | Can skip invariant builder | Can skip to next step |

---

## Data Model Contract

### AttemptV2 Fields (additions to existing Attempt)

```typescript
interface AttemptV2 extends Attempt {
  // Mode: beginner gets more scaffolding
  mode: 'BEGINNER' | 'EXPERT';

  // V2 step tracking (coexists with existing state)
  v2Step: 'UNDERSTAND' | 'PLAN' | 'IMPLEMENT' | 'VERIFY' | 'REFLECT' | 'COMPLETE';

  // Step payloads (JSON columns)
  understandPayload: UnderstandPayload | null;
  planPayload: PlanPayload | null;
  verifyPayload: VerifyPayload | null;
  reflectPayload: ReflectPayload | null;

  // Hint tracking
  hintBudget: number;  // Max hints for this rung
  hintsUsedCount: number;  // Current count
}

interface UnderstandPayload {
  explanation: string;
  inputOutputDescription: string;
  constraintsDescription: string;
  exampleWalkthrough: string;
  wrongApproach: string;
  aiAssessment: {
    status: 'PASS' | 'NEEDS_WORK';
    strengths: string[];
    gaps: string[];
    followupQuestions: string[];
  } | null;
  followups: Array<{
    question: string;
    answer: string;
    timestamp: Date;
  }>;
}

interface PlanPayload {
  suggestedPatterns: Array<{
    patternId: string;
    name: string;
    reason: string;
    aiConfidence: number;
  }>;
  chosenPattern: string | null;
  userConfidence: number | null;  // 1-5
  invariant: {
    text: string;
    builderUsed: boolean;
    templateId?: string;
    templateChoices?: Record<string, number>;
  } | null;
  complexity: string | null;
  discoveryTriggered: boolean;
}

interface VerifyPayload {
  testResults: TestResultData[];
  failureExplanations: Array<{
    testIndex: number;
    userExplanation: string;
    aiGuidance: string;
    timestamp: Date;
  }>;
  traceNotes: string | null;
}

interface ReflectPayload {
  cuesNextTime: string[];
  invariantSummary: string;
  microLessonId: string | null;
  adversaryChallengeCompleted: boolean;
}
```

---

## API Endpoints

### New/Updated Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/attempts/{id}/mode` | POST | Set beginner/expert mode |
| `/api/attempts/{id}/understand/submit` | POST | Submit understanding explanation |
| `/api/attempts/{id}/understand/followup` | POST | Answer AI follow-up question |
| `/api/attempts/{id}/plan/suggest` | POST | Get AI pattern suggestions |
| `/api/attempts/{id}/plan/choose` | POST | Select pattern + invariant |
| `/api/attempts/{id}/verify/explain-failure` | POST | Get AI help explaining test failure |
| `/api/attempts/{id}/reflect/submit` | POST | Submit reflection summary |

### Endpoint Payloads

```typescript
// POST /api/attempts/{id}/mode
interface SetModeRequest {
  mode: 'BEGINNER' | 'EXPERT';
}

// POST /api/attempts/{id}/understand/submit
interface SubmitUnderstandRequest {
  explanation: string;
  inputOutputDescription: string;
  constraintsDescription: string;
  exampleWalkthrough: string;
  wrongApproach: string;
}
interface SubmitUnderstandResponse {
  status: 'PASS' | 'NEEDS_WORK';
  strengths: string[];
  gaps: string[];
  followupQuestions: string[];
  solutionLeakRisk: 'low' | 'medium' | 'high';
}

// POST /api/attempts/{id}/plan/suggest
interface SuggestPatternsRequest {
  explanation: string;  // user's understanding summary
}
interface SuggestPatternsResponse {
  candidates: Array<{
    patternId: string;
    name: string;
    reason: string;
    confidence: number;
  }>;
  recommendedNextAction: string;
}

// POST /api/attempts/{id}/plan/choose
interface ChoosePatternRequest {
  patternId: string;
  confidence: number;
  invariantText?: string;
  invariantBuilder?: {
    templateId: string;
    choices: Record<string, number>;
  };
  complexity?: string;
}
interface ChoosePatternResponse {
  accepted: boolean;
  match: 'GOOD' | 'MAYBE' | 'MISMATCH';
  rationale: string;
  discoveryRecommended: boolean;
  invariantFeedback?: string;
}

// POST /api/attempts/{id}/verify/explain-failure
interface ExplainFailureRequest {
  testIndex: number;
  testInput: string;
  expected: string;
  actual: string;
  userExplanation: string;
}
interface ExplainFailureResponse {
  likelyBugType: string;
  failingCaseExplanation: string;
  suggestedNextDebugStep: string;
  // Note: never contains solution code
}

// POST /api/attempts/{id}/reflect/submit
interface SubmitReflectRequest {
  cuesNextTime: string[];
  invariantSummary: string;
}
```

---

## UI Workbench Layout

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ [Stepper: Understand - Plan - Implement - Verify - Reflect] [Beginner Mode] │
├──────────────────────┬───────────────────────┬──────────────────────────────┤
│                      │                       │                              │
│  LEFT PANEL          │  CENTER               │  RIGHT PANEL (Coach)         │
│  ─────────────       │  ──────               │  ───────────────────         │
│                      │                       │                              │
│  Problem Statement   │  Current Step Content │  AI Feedback                 │
│                      │                       │                              │
│  User Artifacts:     │  - Understand: Form   │  - Follow-up questions       │
│  - Explanation       │  - Plan: Pattern List │  - Pattern suggestions       │
│  - Chosen Pattern    │  - Implement: Editor  │  - Hint budget               │
│  - Invariant         │  - Verify: Tests      │  - Test failure help         │
│                      │  - Reflect: Summary   │  - Reflection prompts        │
│                      │                       │                              │
└──────────────────────┴───────────────────────┴──────────────────────────────┘
```

---

## Migration Plan

### Phase 1: Schema (Minimal, Additive)

1. Add columns to `attempts` table:
   - `mode` (text, default 'BEGINNER')
   - `v2_step` (text, default 'UNDERSTAND')
   - `understand_payload` (jsonb)
   - `plan_payload` (jsonb)
   - `verify_payload` (jsonb)
   - `reflect_payload` (jsonb)
   - `hint_budget` (integer)
   - `hints_used_count` (integer, default 0)

2. Backwards compatibility:
   - Old attempts: `v2_step = null` means legacy flow
   - New attempts: always set `v2_step`
   - Both flows can coexist

### Phase 2: Feature Flags

- `attempt_v2_flow`: Enable V2 flow for new attempts
- `beginner_mode_default`: Default new users to beginner mode

---

## File Changes Summary

### New Files
- `apps/web/src/components/attempt-v2/UnderstandStep.tsx`
- `apps/web/src/components/attempt-v2/PlanStep.tsx`
- `apps/web/src/components/attempt-v2/ImplementStep.tsx`
- `apps/web/src/components/attempt-v2/VerifyStep.tsx`
- `apps/web/src/components/attempt-v2/ReflectStep.tsx`
- `apps/web/src/components/attempt-v2/V2Stepper.tsx`
- `apps/web/src/components/attempt-v2/InvariantBuilder.tsx`
- `apps/web/src/app/api/attempts/[attemptId]/understand/route.ts`
- `apps/web/src/app/api/attempts/[attemptId]/plan/route.ts`
- `apps/web/src/app/api/attempts/[attemptId]/verify/route.ts`
- `apps/web/src/app/api/attempts/[attemptId]/reflect/route.ts`
- `packages/core/src/prompts/attempt-v2-prompts.ts`
- `packages/core/src/validation/attempt-v2-state-machine.ts`
- `packages/core/src/entities/attempt-v2.ts`

### Modified Files
- `packages/adapter-db/src/schema.ts` (add columns)
- `packages/core/src/entities/attempt.ts` (extend types)
- `apps/web/src/app/practice/[attemptId]/page.tsx` (V2 workbench)
- `apps/web/src/lib/deps.ts` (wire new use-cases)
