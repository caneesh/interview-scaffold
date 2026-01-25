# Interview Scaffold API Documentation

**Version:** 1.0
**Base URL:** `/api`
**Last Updated:** 2026-01-18

## Table of Contents

1. [Overview](#overview)
2. [Authentication](#authentication)
3. [Common Error Codes](#common-error-codes)
4. [Practice/Attempts API](#practiceatttempts-api)
5. [Problems API](#problems-api)
6. [Skills API](#skills-api)
7. [Bug Hunt API](#bug-hunt-api)
8. [Debug Lab API](#debug-lab-api)
9. [Data Models](#data-models)

---

## Overview

The Interview Scaffold API provides endpoints for managing coding interview practice sessions, including:

- **Practice Sessions**: Full problem-solving workflow with thinking gates, coding, and reflection
- **Bug Hunt Mode**: Debug broken code to find and explain bugs
- **Debug Lab Mode**: Real-world debugging scenarios with triage and fixes
- **Skills Tracking**: Pattern-based skill matrix and progression
- **Pattern Discovery**: Socratic guided pattern recognition
- **Trace Visualization**: Step-by-step code execution visualization

All endpoints accept and return JSON unless otherwise specified.

---

## Authentication

The API uses header-based tenant and user identification:

```http
x-tenant-id: <tenant-identifier>
x-user-id: <user-identifier>
```

**Note**: In the current implementation, if headers are not provided, demo values are used:
- Default `x-tenant-id`: `demo-tenant`
- Default `x-user-id`: `demo-user`

---

## Common Error Codes

All error responses follow this schema:

```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable error message"
  }
}
```

### Standard Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `VALIDATION_ERROR` | 400 | Request body or parameters failed validation |
| `NOT_FOUND` | 404 | Requested resource does not exist |
| `ATTEMPT_NOT_FOUND` | 404 | Attempt ID is invalid |
| `PROBLEM_NOT_FOUND` | 404 | Problem ID is invalid |
| `UNAUTHORIZED` | 403 | User does not have access to this resource |
| `FORBIDDEN` | 403 | Action is not allowed |
| `INVALID_STATE` | 400 | Operation not allowed in current state |
| `ALREADY_COMPLETED` | 400 | Resource has already been completed |
| `INTERNAL_ERROR` | 500 | Unexpected server error |

---

## Practice/Attempts API

Manages problem-solving practice sessions with multi-stage gating.

### Start Attempt

**POST** `/api/attempts/start`

Creates a new practice attempt or returns an existing active attempt.

**Headers:**
```http
x-tenant-id: string (optional)
x-user-id: string (optional)
```

**Request Body:**
```json
{
  "problemId": "string"
}
```

**Response (200):**
```json
{
  "attempt": {
    "id": "string",
    "tenantId": "string",
    "userId": "string",
    "problemId": "string",
    "pattern": "SLIDING_WINDOW" | "TWO_POINTERS" | ...,
    "rung": 1 | 2 | 3 | 4 | 5,
    "state": "THINKING_GATE" | "CODING" | "REFLECTION" | ...,
    "hintsUsed": [],
    "codeSubmissions": 0,
    "score": null,
    "startedAt": "2026-01-18T10:00:00.000Z",
    "completedAt": null
  },
  "problem": {
    "id": "string",
    "tenantId": "string",
    "title": "string",
    "statement": "string",
    "pattern": "SLIDING_WINDOW",
    "rung": 1,
    "targetComplexity": "O(n)",
    "testCases": [
      {
        "input": "string",
        "expectedOutput": "string",
        "isHidden": false,
        "explanation": "string (optional)"
      }
    ],
    "hints": ["string"],
    "timeoutBudgetMs": 1000,
    "createdAt": "2026-01-18T10:00:00.000Z"
  },
  "resumed": false
}
```

**Error Codes:**
- `VALIDATION_ERROR` (400): Invalid request body
- `PROBLEM_NOT_FOUND` (404): Problem ID does not exist

---

### Get Attempt

**GET** `/api/attempts/{attemptId}`

Retrieves an attempt with its associated problem.

**Path Parameters:**
- `attemptId` (string): Attempt identifier

**Response (200):**
```json
{
  "attempt": { /* Attempt object */ },
  "problem": { /* Problem object */ }
}
```

**Error Codes:**
- `ATTEMPT_NOT_FOUND` (404): Attempt does not exist

---

### Submit Step (Thinking Gate / Reflection)

**POST** `/api/attempts/{attemptId}/step`

Submits a thinking gate, reflection, or success reflection step.

**Path Parameters:**
- `attemptId` (string): Attempt identifier

**Request Body (Thinking Gate):**
```json
{
  "stepType": "THINKING_GATE",
  "selectedPattern": "SLIDING_WINDOW",
  "statedInvariant": "string",
  "statedComplexity": "O(n) (optional)",
  "invariantTemplate": {
    "templateId": "string",
    "choices": { "0": 1, "1": 2 },
    "allCorrect": true
  }
}
```

**Request Body (Reflection):**
```json
{
  "stepType": "REFLECTION",
  "selectedOptionId": "string",
  "correct": false
}
```

**Request Body (Success Reflection):**
```json
{
  "stepType": "SUCCESS_REFLECTION",
  "confidenceRating": 1 | 2 | 3 | 4 | 5,
  "learnedInsight": "string",
  "improvementNote": "string (optional)",
  "skipped": false
}
```

**Response (200):**
```json
{
  "attempt": { /* Updated attempt */ },
  "step": {
    "id": "string",
    "type": "THINKING_GATE",
    "result": "PASS" | "FAIL" | "SKIP",
    "data": { /* Step-specific data */ }
  },
  "passed": true,
  "validation": {
    "passed": true,
    "errors": [],
    "warnings": [],
    "llmAugmented": false
  }
}
```

**Error Codes:**
- `VALIDATION_ERROR` (400): Invalid step type or data
- `ATTEMPT_NOT_FOUND` (404): Attempt does not exist

---

### Submit Code

**POST** `/api/attempts/{attemptId}/submit`

Submits code for test execution and validation.

**Path Parameters:**
- `attemptId` (string): Attempt identifier

**Request Body:**
```json
{
  "code": "string",
  "language": "python" | "javascript" | "typescript"
}
```

**Response (200):**
```json
{
  "attempt": { /* Updated attempt */ },
  "testResults": [
    {
      "input": "string",
      "expected": "string",
      "actual": "string",
      "passed": true,
      "error": null
    }
  ],
  "passed": true,
  "validation": {
    "syntaxValid": true,
    "semanticValid": true,
    "complexityValid": true
  },
  "gatingDecision": {
    "shouldGate": false,
    "reason": "string"
  },
  "score": {
    "overall": 0.95,
    "patternRecognition": 1.0,
    "implementation": 0.9,
    "edgeCases": 1.0,
    "efficiency": 0.9
  }
}
```

**Error Codes:**
- `VALIDATION_ERROR` (400): Invalid code or language
- `ATTEMPT_NOT_FOUND` (404): Attempt does not exist

---

### Request Hint

**POST** `/api/attempts/{attemptId}/hint`

Requests the next hint for an attempt using a tiered hint system.

**Path Parameters:**
- `attemptId` (string): Attempt identifier

**Response (200):**
```json
{
  "attempt": { /* Updated attempt */ },
  "hint": {
    "level": "DIRECTIONAL_QUESTION" | "HEURISTIC_HINT" | "CONCEPT_INJECTION" | "MICRO_EXAMPLE" | "PATCH_SNIPPET",
    "text": "string",
    "cost": 10
  },
  "budget": {
    "spent": 10,
    "remaining": 90,
    "total": 100,
    "exhausted": false
  },
  "isLastHint": false
}
```

**Error Codes:**
- `ATTEMPT_NOT_FOUND` (404): Attempt does not exist
- `HINT_BUDGET_EXHAUSTED` (400): No hints remaining
- `NO_MORE_HINTS` (400): All hints have been consumed

---

### Pattern Discovery: Start

**POST** `/api/attempts/{attemptId}/pattern-discovery/start`

Starts a Socratic pattern discovery session to help identify the correct pattern.

**Path Parameters:**
- `attemptId` (string): Attempt identifier

**Request Body:**
```json
{
  "mode": "HEURISTIC" | "SOCRATIC" (optional)
}
```

**Response (200):**
```json
{
  "stepId": "string",
  "mode": "SOCRATIC",
  "question": "string",
  "questionId": "string"
}
```

**Error Codes:**
- `VALIDATION_ERROR` (400): Invalid mode
- `ATTEMPT_NOT_FOUND` (404): Attempt does not exist

---

### Pattern Discovery: Answer

**POST** `/api/attempts/{attemptId}/pattern-discovery/answer`

Submits an answer to a pattern discovery question.

**Path Parameters:**
- `attemptId` (string): Attempt identifier

**Request Body:**
```json
{
  "stepId": "string",
  "questionId": "string",
  "answer": "string"
}
```

**Response (200):**
```json
{
  "nextQuestion": "string (optional)",
  "nextQuestionId": "string (optional)",
  "discoveredPattern": "SLIDING_WINDOW (optional)",
  "completed": false,
  "qaLog": [
    {
      "questionId": "string",
      "question": "string",
      "answer": "string",
      "timestamp": "2026-01-18T10:00:00.000Z"
    }
  ]
}
```

**Error Codes:**
- `VALIDATION_ERROR` (400): Invalid request data
- `ATTEMPT_NOT_FOUND` (404): Attempt does not exist

---

### Pattern Discovery: Abandon

**POST** `/api/attempts/{attemptId}/pattern-discovery/abandon`

Abandons an in-progress pattern discovery session.

**Path Parameters:**
- `attemptId` (string): Attempt identifier

**Request Body:**
```json
{
  "stepId": "string"
}
```

**Response (200):**
```json
{
  "success": true
}
```

---

### Pattern Challenge: Check

**POST** `/api/attempts/{attemptId}/pattern-challenge/check`

Checks if the selected pattern should trigger an Advocate's Trap challenge (intentional challenge to test pattern confidence).

**Path Parameters:**
- `attemptId` (string): Attempt identifier

**Request Body:**
```json
{
  "selectedPattern": "SLIDING_WINDOW",
  "statedInvariant": "string"
}
```

**Response (200):**
```json
{
  "shouldChallenge": true,
  "challenge": {
    "stepId": "string",
    "mode": "COUNTEREXAMPLE" | "SOCRATIC",
    "prompt": "string",
    "counterexample": "string (optional)",
    "confidenceScore": 0.85,
    "reasons": ["string"],
    "suggestedAlternatives": ["TWO_POINTERS"]
  }
}
```

**Error Codes:**
- `VALIDATION_ERROR` (400): Invalid request data
- `ATTEMPT_NOT_FOUND` (404): Attempt does not exist

---

### Pattern Challenge: Respond

**POST** `/api/attempts/{attemptId}/pattern-challenge/respond`

Submits user's response to the pattern challenge.

**Path Parameters:**
- `attemptId` (string): Attempt identifier

**Request Body:**
```json
{
  "stepId": "string",
  "response": "string",
  "decision": "KEEP_PATTERN" | "CHANGE_PATTERN",
  "newPattern": "TWO_POINTERS (optional)"
}
```

**Response (200):**
```json
{
  "attempt": { /* Updated attempt */ },
  "step": {
    "id": "string",
    "type": "PATTERN_CHALLENGE",
    "result": "PASS" | "SKIP",
    "data": { /* Challenge data */ }
  },
  "finalPattern": "SLIDING_WINDOW"
}
```

---

### Pattern Challenge: Skip

**POST** `/api/attempts/{attemptId}/pattern-challenge/skip`

Skips the pattern challenge, proceeding with the original pattern.

**Path Parameters:**
- `attemptId` (string): Attempt identifier

**Request Body:**
```json
{
  "stepId": "string"
}
```

**Response (200):**
```json
{
  "attempt": { /* Updated attempt */ },
  "finalPattern": "SLIDING_WINDOW"
}
```

---

### Trace Execution

**POST** `/api/attempts/{attemptId}/trace`

Executes code with step-by-step variable tracking for visualization.

**Path Parameters:**
- `attemptId` (string): Attempt identifier

**Request Body:**
```json
{
  "code": "string",
  "language": "python" | "javascript" | "typescript",
  "testInput": "string",
  "autoInsert": true
}
```

**Response (200):**
```json
{
  "trace": {
    "success": true,
    "frames": [
      {
        "iter": 0,
        "vars": {
          "left": 0,
          "right": 1,
          "sum": 5
        },
        "label": "string (optional)",
        "line": 10
      }
    ],
    "error": "string (optional)",
    "array": [1, 2, 3],
    "arrayName": "nums",
    "pointerVars": ["left", "right"]
  },
  "insertionHint": "string (optional)",
  "instrumentedCode": "string (optional)"
}
```

**Error Codes:**
- `VALIDATION_ERROR` (400): Invalid request data

---

### Adversary Challenge: Get

**GET** `/api/attempts/{attemptId}/adversary`

Retrieves or creates an adversary challenge (constraint mutation prompt) for a completed attempt.

**Path Parameters:**
- `attemptId` (string): Attempt identifier

**Response (200):**
```json
{
  "challenge": {
    "stepId": "string",
    "prompt": "string",
    "userResponse": null,
    "skipped": false,
    "completed": false
  }
}
```

**Error Codes:**
- `NOT_FOUND` (404): Attempt not found
- `FORBIDDEN` (403): Not your attempt
- `INVALID_STATE` (400): Attempt is not completed

---

### Adversary Challenge: Submit

**POST** `/api/attempts/{attemptId}/adversary`

Submits a response to the adversary challenge or skips it.

**Path Parameters:**
- `attemptId` (string): Attempt identifier

**Request Body (Submit):**
```json
{
  "stepId": "string",
  "response": "string"
}
```

**Request Body (Skip):**
```json
{
  "stepId": "string",
  "skip": true
}
```

**Response (200):**
```json
{
  "success": true,
  "challenge": {
    "stepId": "string",
    "prompt": "string",
    "userResponse": "string",
    "skipped": false,
    "completed": true
  }
}
```

**Error Codes:**
- `VALIDATION_ERROR` (400): Missing required fields
- `NOT_FOUND` (404): Attempt or step not found
- `FORBIDDEN` (403): Not your attempt
- `ALREADY_COMPLETED` (400): Challenge already completed

---

## Problems API

Manages problem retrieval and recommendation.

### Get Next Problem

**GET** `/api/problems/next`

Returns the next recommended problem based on user's skill progression.

**Headers:**
```http
x-tenant-id: string (optional)
x-user-id: string (optional)
```

**Query Parameters:**
- `pattern` (optional): Filter by specific pattern (e.g., `SLIDING_WINDOW`)
- `rung` (optional): Filter by difficulty rung (1-5)

**Response (200):**
```json
{
  "problem": {
    "id": "string",
    "tenantId": "string",
    "title": "string",
    "statement": "string",
    "pattern": "SLIDING_WINDOW",
    "rung": 1,
    "targetComplexity": "O(n)",
    "testCases": [ /* Test case objects */ ],
    "hints": ["string"],
    "timeoutBudgetMs": 1000,
    "createdAt": "2026-01-18T10:00:00.000Z"
  },
  "reason": "Next problem in SLIDING_WINDOW pattern progression"
}
```

**Error Codes:**
- `INTERNAL_ERROR` (500): Failed to retrieve problem

---

## Skills API

Manages user skill matrix and progression tracking.

### Get Skill Matrix

**GET** `/api/skills`

Returns the user's skill matrix showing mastery across patterns and rungs.

**Headers:**
```http
x-tenant-id: string (optional)
x-user-id: string (optional)
```

**Response (200):**
```json
{
  "skills": [
    {
      "id": "string",
      "tenantId": "string",
      "userId": "string",
      "pattern": "SLIDING_WINDOW",
      "rung": 1,
      "score": 0.85,
      "attemptsCount": 3,
      "lastAttemptAt": "2026-01-18T10:00:00.000Z",
      "unlockedAt": "2026-01-15T10:00:00.000Z",
      "updatedAt": "2026-01-18T10:00:00.000Z"
    }
  ],
  "unlockedRungs": [
    {
      "pattern": "SLIDING_WINDOW",
      "rung": 2,
      "score": 0.9
    }
  ],
  "recommendedNext": {
    "pattern": "TWO_POINTERS",
    "rung": 1,
    "reason": "Expand your pattern repertoire"
  }
}
```

**Error Codes:**
- `INTERNAL_ERROR` (500): Failed to retrieve skills

---

## Bug Hunt API

Manages debugging practice sessions where users identify bugs in provided code.

### List Bug Hunt Items

**GET** `/api/bug-hunt/items`

Lists all available bug hunt items (without solutions).

**Headers:**
```http
x-tenant-id: string (optional)
```

**Query Parameters:**
- `pattern` (optional): Filter by pattern (e.g., `SLIDING_WINDOW`)

**Response (200):**
```json
{
  "items": [
    {
      "id": "string",
      "tenantId": "string",
      "pattern": "SLIDING_WINDOW",
      "difficulty": "EASY" | "MEDIUM" | "HARD",
      "language": "python" | "javascript" | "typescript",
      "code": "string",
      "prompt": "string",
      "title": "string",
      "createdAt": "2026-01-18T10:00:00.000Z"
    }
  ]
}
```

**Error Codes:**
- `INTERNAL_ERROR` (500): Failed to list items

---

### Get Bug Hunt Item

**GET** `/api/bug-hunt/items/{itemId}`

Retrieves a specific bug hunt item (without solution).

**Path Parameters:**
- `itemId` (string): Item identifier

**Response (200):**
```json
{
  "item": {
    "id": "string",
    "tenantId": "string",
    "pattern": "SLIDING_WINDOW",
    "difficulty": "MEDIUM",
    "language": "javascript",
    "code": "string",
    "prompt": "string",
    "title": "string",
    "createdAt": "2026-01-18T10:00:00.000Z"
  }
}
```

**Error Codes:**
- `NOT_FOUND` (404): Item not found

---

### List Bug Hunt Attempts

**GET** `/api/bug-hunt/attempts`

Lists user's bug hunt attempts.

**Headers:**
```http
x-tenant-id: string (optional)
x-user-id: string (optional)
```

**Response (200):**
```json
{
  "attempts": [
    {
      "id": "string",
      "tenantId": "string",
      "userId": "string",
      "itemId": "string",
      "submission": {
        "selectedLines": [10, 15],
        "explanation": "string"
      },
      "validation": {
        "result": "CORRECT" | "PARTIAL" | "INCORRECT",
        "lineSelectionCorrect": true,
        "linesFound": 2,
        "totalBugLines": 2,
        "conceptsMatched": true,
        "matchedConcepts": ["off-by-one"],
        "totalConcepts": 1
      },
      "startedAt": "2026-01-18T10:00:00.000Z",
      "completedAt": "2026-01-18T10:05:00.000Z",
      "attemptNumber": 1
    }
  ]
}
```

---

### Start Bug Hunt Attempt

**POST** `/api/bug-hunt/attempts`

Starts a new bug hunt attempt.

**Headers:**
```http
x-tenant-id: string (optional)
x-user-id: string (optional)
```

**Request Body:**
```json
{
  "itemId": "string"
}
```

**Response (200):**
```json
{
  "attempt": {
    "id": "string",
    "tenantId": "string",
    "userId": "string",
    "itemId": "string",
    "submission": null,
    "validation": null,
    "startedAt": "2026-01-18T10:00:00.000Z",
    "completedAt": null,
    "attemptNumber": 1
  },
  "item": { /* Bug hunt item without solution */ }
}
```

**Error Codes:**
- `VALIDATION_ERROR` (400): Invalid request body
- `NOT_FOUND` (404): Item not found

---

### Submit Bug Hunt Attempt

**POST** `/api/bug-hunt/attempts/{attemptId}/submit`

Submits bug identification and explanation.

**Path Parameters:**
- `attemptId` (string): Attempt identifier

**Request Body:**
```json
{
  "submission": {
    "selectedLines": [10, 15, 20],
    "explanation": "The bug is an off-by-one error in the loop condition..."
  }
}
```

**Response (200):**
```json
{
  "attempt": { /* Updated attempt */ },
  "validation": {
    "result": "CORRECT",
    "lineSelectionCorrect": true,
    "linesFound": 2,
    "totalBugLines": 2,
    "conceptsMatched": true,
    "matchedConcepts": ["off-by-one", "boundary-condition"],
    "totalConcepts": 2,
    "llmFeedback": "string (optional)",
    "llmConfidence": 0.92
  },
  "explanation": "string (shown on correct/partial)",
  "hint": "string (shown on incorrect, first attempt only)"
}
```

**Error Codes:**
- `VALIDATION_ERROR` (400): Invalid submission format
- `NOT_FOUND` (404): Attempt not found
- `UNAUTHORIZED` (403): Not your attempt
- `ALREADY_SUBMITTED` (400): Attempt already completed

---

## Debug Lab API

Manages production-grade debugging scenarios with triage and test execution.

### List Debug Lab Items

**GET** `/api/debug-lab/items`

Lists available debug lab items (client-safe, omits solutions).

**Headers:**
```http
x-tenant-id: string (optional)
```

**Query Parameters:**
- `category` (optional): Filter by defect category (e.g., `Functional`, `Concurrency`)
- `difficulty` (optional): Filter by difficulty (`EASY`, `MEDIUM`, `HARD`, `EXPERT`)

**Response (200):**
```json
{
  "items": [
    {
      "id": "string",
      "title": "string",
      "description": "string",
      "difficulty": "MEDIUM",
      "language": "javascript",
      "defectCategory": "Functional",
      "severity": "Major",
      "priority": "High",
      "signals": ["failing_tests", "timeout"],
      "requiredTriage": true
    }
  ]
}
```

---

### Get Next Debug Lab Item

**GET** `/api/debug-lab/next`

Gets the next recommended debug lab item.

**Headers:**
```http
x-tenant-id: string (optional)
x-user-id: string (optional)
```

**Response (200):**
```json
{
  "item": {
    "id": "string",
    "tenantId": "string",
    "title": "string",
    "description": "string",
    "difficulty": "MEDIUM",
    "language": "javascript",
    "files": [
      {
        "path": "string",
        "content": "string",
        "editable": true
      }
    ],
    "testCommand": "node test.js",
    "defectCategory": "Functional",
    "severity": "Major",
    "priority": "High",
    "signals": ["failing_tests"],
    "toolsExpected": ["unit_tests", "debugging"],
    "requiredTriage": true,
    "observabilitySnapshot": {
      "red": [
        {
          "rate": 100,
          "errorRate": 0.15,
          "duration": { "p50": 50, "p95": 200, "p99": 500 }
        }
      ],
      "use": [],
      "logs": ["ERROR: Connection timeout"]
    },
    "createdAt": "2026-01-18T10:00:00.000Z"
  },
  "reason": "Recommended based on difficulty progression (MEDIUM)"
}
```

---

### Start Debug Lab Attempt

**POST** `/api/debug-lab/start`

Starts a new debug lab attempt.

**Headers:**
```http
x-tenant-id: string (optional)
x-user-id: string (optional)
```

**Request Body:**
```json
{
  "itemId": "string"
}
```

**Response (200):**
```json
{
  "attempt": {
    "id": "string",
    "tenantId": "string",
    "userId": "string",
    "itemId": "string",
    "status": "STARTED",
    "triageAnswers": null,
    "triageScore": null,
    "submission": null,
    "executionResult": null,
    "testRunCount": 0,
    "submissionCount": 1,
    "startedAt": "2026-01-18T10:00:00.000Z",
    "completedAt": null
  },
  "item": { /* Debug lab item */ }
}
```

**Error Codes:**
- `VALIDATION_ERROR` (400): Invalid request body
- `NOT_FOUND` (404): Item not found

---

### Submit Triage

**POST** `/api/debug-lab/{attemptId}/triage`

Submits triage classification for the bug.

**Path Parameters:**
- `attemptId` (string): Attempt identifier

**Request Body:**
```json
{
  "triageAnswers": {
    "category": "Functional" | "Concurrency" | "Resource" | ...,
    "severity": "Critical" | "Major" | "Minor" | "Low",
    "priority": "High" | "Medium" | "Low",
    "firstActions": "string (min 10 chars)"
  }
}
```

**Response (200):**
```json
{
  "attempt": { /* Updated attempt */ },
  "triageScore": {
    "overall": 0.85,
    "categoryScore": 1.0,
    "severityScore": 0.75,
    "priorityScore": 1.0,
    "actionsScore": 0.8,
    "matchedActions": ["run unit tests", "check logs"],
    "llmFeedback": "string (optional)"
  },
  "rubricExplanation": "string (optional)"
}
```

**Error Codes:**
- `VALIDATION_ERROR` (400): Invalid triage data
- `NOT_FOUND` (404): Attempt not found
- `FORBIDDEN` (403): Not your attempt
- `INVALID_STATE` (400): Triage already submitted

---

### Run Tests

**POST** `/api/debug-lab/{attemptId}/run-tests`

Runs tests on modified files before final submission.

**Path Parameters:**
- `attemptId` (string): Attempt identifier

**Request Body:**
```json
{
  "files": {
    "src/index.js": "modified code content",
    "test.js": "test file content"
  }
}
```

**Response (200):**
```json
{
  "attempt": { /* Updated attempt */ },
  "executionResult": {
    "passed": false,
    "signalType": "test_failure" | "timeout" | "crash" | "success",
    "testsPassed": 2,
    "testsTotal": 5,
    "stdout": "string",
    "stderr": "string",
    "exitCode": 1,
    "executionTimeMs": 1234
  }
}
```

**Error Codes:**
- `VALIDATION_ERROR` (400): Missing files
- `NOT_FOUND` (404): Attempt not found
- `FORBIDDEN` (403): Not your attempt
- `TRIAGE_REQUIRED` (400): Must complete triage first

---

### Submit Debug Lab Solution

**POST** `/api/debug-lab/{attemptId}/submit`

Submits final code fix and explanation.

**Path Parameters:**
- `attemptId` (string): Attempt identifier

**Request Body:**
```json
{
  "files": {
    "src/index.js": "fixed code content"
  },
  "explanation": "The bug was caused by... (min 10 chars)"
}
```

**Response (200):**
```json
{
  "attempt": { /* Updated attempt */ },
  "executionResult": {
    "passed": true,
    "signalType": "success",
    "testsPassed": 5,
    "testsTotal": 5,
    "stdout": "string",
    "stderr": "",
    "exitCode": 0,
    "executionTimeMs": 987,
    "hiddenTestsResult": {
      "passed": true,
      "testsPassed": 3,
      "testsTotal": 3
    }
  },
  "passed": true,
  "taxonomy": {
    "defectCategory": "Functional",
    "severity": "Major",
    "priority": "High",
    "signals": ["failing_tests"]
  },
  "solutionExplanation": "string (shown on pass or after 3 attempts)"
}
```

**Error Codes:**
- `VALIDATION_ERROR` (400): Invalid submission
- `NOT_FOUND` (404): Attempt not found
- `FORBIDDEN` (403): Not your attempt
- `TRIAGE_REQUIRED` (400): Must complete triage first

---

## Data Models

### Pattern Types

```typescript
type PatternId =
  | "SLIDING_WINDOW"
  | "TWO_POINTERS"
  | "PREFIX_SUM"
  | "BINARY_SEARCH"
  | "BFS"
  | "DFS"
  | "DYNAMIC_PROGRAMMING"
  | "BACKTRACKING"
  | "GREEDY"
  | "HEAP"
  | "TRIE"
  | "UNION_FIND"
  | "INTERVAL_MERGING";
```

### Rung Levels

```typescript
type RungLevel = 1 | 2 | 3 | 4 | 5;
```

### Attempt States

```typescript
type AttemptState =
  | "THINKING_GATE"
  | "CODING"
  | "REFLECTION"
  | "SUCCESS_REFLECTION"
  | "HINT"
  | "COMPLETED"
  | "ABANDONED";
```

### Step Types

```typescript
type StepType =
  | "THINKING_GATE"
  | "PATTERN_DISCOVERY"
  | "CODING"
  | "REFLECTION"
  | "SUCCESS_REFLECTION"
  | "HINT";
```

### Hint Levels

```typescript
type HintLevel =
  | "DIRECTIONAL_QUESTION"    // 10 points
  | "HEURISTIC_HINT"          // 20 points
  | "CONCEPT_INJECTION"       // 30 points
  | "MICRO_EXAMPLE"           // 40 points
  | "PATCH_SNIPPET";          // 50 points
```

### Bug Hunt Difficulty

```typescript
type BugHuntDifficulty = "EASY" | "MEDIUM" | "HARD";
```

### Debug Lab Defect Categories

```typescript
type DefectCategory =
  | "Functional"
  | "Concurrency"
  | "Resource"
  | "Distributed"
  | "Heisenbug"
  | "Environment"
  | "Container"
  | "Performance"
  | "Observability";
```

### Debug Lab Severity

```typescript
type SeverityLevel = "Critical" | "Major" | "Minor" | "Low";
```

### Debug Lab Priority

```typescript
type PriorityLevel = "High" | "Medium" | "Low";
```

### Debug Lab Status

```typescript
type DebugLabStatus =
  | "STARTED"
  | "TRIAGE_COMPLETED"
  | "SUBMITTED"
  | "PASSED"
  | "FAILED";
```

### Execution Signal Types

```typescript
type ExecutionSignalType =
  | "test_failure"
  | "timeout"
  | "crash"
  | "compile_error"
  | "runtime_error"
  | "success";
```

---

## Scope and Limitations

### Covered in this Document
- All REST API endpoints in `/api/attempts/*`, `/api/problems/*`, `/api/skills/*`, `/api/bug-hunt/*`, and `/api/debug-lab/*`
- Request/response schemas with example payloads
- Authentication header requirements
- Error code definitions
- Core data type enumerations

### Not Covered
- WebSocket/real-time endpoints (none exist in current implementation)
- Admin/management APIs (not implemented)
- Batch operations (not implemented)
- Rate limiting policies (not implemented)
- Diagnostic Coach AI endpoints (schemas defined but routes not found in `/api/diagnostic-coach/*`)

### Known Gaps
- LLM-based validation endpoints are environment-gated and may not be available in all deployments
- Some validation logic (e.g., thinking gate validation) is inferred from code analysis and may have additional runtime behaviors not documented
- Hidden test execution details are implementation-specific to Piston executor

### Timestamp Note
Based on code analysis as of 2026-01-18. API implementation is located in `/apps/web/src/app/api/` with contracts defined in `/packages/contracts/src/schemas.ts`.

---

## Example Usage

### Complete Practice Flow

```bash
# 1. Get next recommended problem
curl -X GET http://localhost:3000/api/problems/next \
  -H "x-tenant-id: demo-tenant" \
  -H "x-user-id: demo-user"

# 2. Start attempt
curl -X POST http://localhost:3000/api/attempts/start \
  -H "Content-Type: application/json" \
  -H "x-tenant-id: demo-tenant" \
  -H "x-user-id: demo-user" \
  -d '{"problemId": "prob-001"}'

# 3. Submit thinking gate
curl -X POST http://localhost:3000/api/attempts/{attemptId}/step \
  -H "Content-Type: application/json" \
  -d '{
    "stepType": "THINKING_GATE",
    "selectedPattern": "SLIDING_WINDOW",
    "statedInvariant": "Maintain a window that satisfies the constraint",
    "statedComplexity": "O(n)"
  }'

# 4. Submit code
curl -X POST http://localhost:3000/api/attempts/{attemptId}/submit \
  -H "Content-Type: application/json" \
  -d '{
    "code": "def solution(arr):\n    ...",
    "language": "python"
  }'

# 5. Request hint (if needed)
curl -X POST http://localhost:3000/api/attempts/{attemptId}/hint

# 6. Submit success reflection
curl -X POST http://localhost:3000/api/attempts/{attemptId}/step \
  -H "Content-Type: application/json" \
  -d '{
    "stepType": "SUCCESS_REFLECTION",
    "confidenceRating": 4,
    "learnedInsight": "I learned that sliding window can optimize this pattern",
    "skipped": false
  }'
```

### Bug Hunt Flow

```bash
# 1. List available bug hunt items
curl -X GET http://localhost:3000/api/bug-hunt/items?pattern=SLIDING_WINDOW

# 2. Start bug hunt attempt
curl -X POST http://localhost:3000/api/bug-hunt/attempts \
  -H "Content-Type: application/json" \
  -d '{"itemId": "bug-001"}'

# 3. Submit bug identification
curl -X POST http://localhost:3000/api/bug-hunt/attempts/{attemptId}/submit \
  -H "Content-Type: application/json" \
  -d '{
    "submission": {
      "selectedLines": [10, 15],
      "explanation": "The bug is an off-by-one error in the loop condition causing array out of bounds"
    }
  }'
```

### Debug Lab Flow

```bash
# 1. Get next debug lab challenge
curl -X GET http://localhost:3000/api/debug-lab/next

# 2. Start debug lab attempt
curl -X POST http://localhost:3000/api/debug-lab/start \
  -H "Content-Type: application/json" \
  -d '{"itemId": "debug-001"}'

# 3. Submit triage
curl -X POST http://localhost:3000/api/debug-lab/{attemptId}/triage \
  -H "Content-Type: application/json" \
  -d '{
    "triageAnswers": {
      "category": "Functional",
      "severity": "Major",
      "priority": "High",
      "firstActions": "Run unit tests to identify failing test cases and review error messages"
    }
  }'

# 4. Run tests (optional, iterative)
curl -X POST http://localhost:3000/api/debug-lab/{attemptId}/run-tests \
  -H "Content-Type: application/json" \
  -d '{
    "files": {
      "src/index.js": "// modified code"
    }
  }'

# 5. Submit final solution
curl -X POST http://localhost:3000/api/debug-lab/{attemptId}/submit \
  -H "Content-Type: application/json" \
  -d '{
    "files": {
      "src/index.js": "// fixed code"
    },
    "explanation": "The bug was caused by incorrect boundary handling in the array iteration"
  }'
```

---

## Evaluation API (TrackC Unified System)

### Trigger Evaluation

**POST** `/api/attempts/{attemptId}/evaluate`

Triggers an asynchronous evaluation run for an attempt. Creates a queued evaluation that will be processed (in a real system, by a worker; currently simulated inline).

**Headers:**
```http
x-tenant-id: string (optional)
x-user-id: string (optional)
```

**Path Parameters:**
- `attemptId` (string): Attempt identifier (supports both legacy and track-based attempts)

**Request Body:**
```json
{
  "submissionId": "string (optional)",
  "type": "coding_tests | debug_gate | rubric | ai_review (optional)"
}
```

**Field Descriptions:**
- `submissionId`: Specific submission to evaluate. If omitted, uses latest submission for the attempt.
- `type`: Evaluation type. If omitted, inferred from track:
  - `coding_interview` → `coding_tests`
  - `debug_lab` → `debug_gate`
  - `system_design` → `rubric`

**Response (202 Accepted):**
```json
{
  "evaluationRun": {
    "id": "eval-run-123",
    "attemptId": "attempt-456",
    "submissionId": "sub-789 | null",
    "userId": "user-001",
    "track": "coding_interview | debug_lab | system_design",
    "type": "coding_tests",
    "status": "queued | running | succeeded | failed | canceled",
    "startedAt": "2026-01-24T10:00:00Z | null",
    "completedAt": "2026-01-24T10:00:05Z | null",
    "summary": {
      "passed": true,
      "testsPassed": 5,
      "testsTotal": 5
    } | null,
    "details": {
      "testResults": [...]
    } | null,
    "createdAt": "2026-01-24T10:00:00Z"
  }
}
```

**Summary Field (varies by evaluation type):**

- **coding_tests**:
  ```json
  {
    "passed": true,
    "testsPassed": 5,
    "testsTotal": 5
  }
  ```

- **debug_gate**:
  ```json
  {
    "passed": true,
    "diagnosticsPassed": 3,
    "diagnosticsTotal": 3
  }
  ```

- **rubric**:
  ```json
  {
    "overallScore": 85,
    "maxScore": 100,
    "criteriaScores": {
      "pattern_recognition": 20,
      "implementation_quality": 25,
      "edge_cases": 20,
      "efficiency": 20
    }
  }
  ```

- **ai_review**:
  ```json
  {
    "grade": "PASS | PARTIAL | FAIL",
    "confidence": 0.95,
    "feedback": "Excellent use of sliding window pattern..."
  }
  ```

**Error Codes:**
- `VALIDATION_ERROR` (400): Invalid request body
- `ATTEMPT_NOT_FOUND` (404): Attempt does not exist
- `SUBMISSION_NOT_FOUND` (404): Specified submission does not exist
- `FORBIDDEN` (403): Attempt does not belong to user
- `INTERNAL_ERROR` (500): Evaluation failed

**Current Implementation Note:**

**[Stub behavior as of 2026-01-24]**

The evaluation endpoint currently includes a stub implementation that:
- Returns fake test results with hardcoded values
- Simulates pass/fail based on whether code exists (not actual execution)
- Does NOT execute code against real test cases

**Expected real implementation**:
1. Fetch test cases from problem/content item
2. Execute code via Piston API for each test case
3. Compare actual outputs with expected outputs
4. Record real execution results in `coding_test_results` table

**[Evidence: apps/web/src/app/api/attempts/[attemptId]/evaluate/route.ts lines 221-281]**

---

### Get Evaluation Status

**GET** `/api/attempts/{attemptId}/evaluate`

Retrieves the latest evaluation run status and results for an attempt.

**Headers:**
```http
x-tenant-id: string (optional)
x-user-id: string (optional)
```

**Path Parameters:**
- `attemptId` (string): Attempt identifier

**Response (200):**
```json
{
  "evaluationRun": {
    "id": "eval-run-123",
    "attemptId": "attempt-456",
    "submissionId": "sub-789",
    "userId": "user-001",
    "track": "coding_interview",
    "type": "coding_tests",
    "status": "succeeded",
    "startedAt": "2026-01-24T10:00:00Z",
    "completedAt": "2026-01-24T10:00:05Z",
    "summary": {
      "passed": true,
      "testsPassed": 5,
      "testsTotal": 5
    },
    "details": {
      "testResults": [...]
    },
    "createdAt": "2026-01-24T10:00:00Z"
  },
  "testResults": [
    {
      "testIndex": 0,
      "passed": true,
      "isHidden": false,
      "expected": "3",
      "actual": "3",
      "stdout": "",
      "stderr": "",
      "durationMs": 15,
      "error": null
    }
  ] | null
}
```

**Response (200) - No Evaluation:**
```json
{
  "evaluationRun": null
}
```

**Error Codes:**
- `ATTEMPT_NOT_FOUND` (404): Attempt does not exist
- `FORBIDDEN` (403): Attempt does not belong to user
- `INTERNAL_ERROR` (500): Failed to retrieve evaluation

---

## Submissions API (TrackC Unified System)

### Create Submission

**POST** `/api/submissions`

Creates a new submission for an attempt. Submissions are stored separately from attempts and can be evaluated asynchronously.

**Headers:**
```http
x-tenant-id: string (optional)
x-user-id: string (optional)
```

**Request Body:**
```json
{
  "attemptId": "attempt-456",
  "type": "code | text | diagram | gate | triage | reflection | files",
  "language": "javascript (optional, for code submissions)",
  "contentText": "plain text content (optional)",
  "contentJson": {
    "code": "function solution() { ... }",
    "additional": "metadata"
  } | {},
  "isFinal": false
}
```

**Field Descriptions:**
- `type`: Submission type determines structure and validation
  - `code`: Programming code submission
  - `text`: Free-form text response
  - `diagram`: System design diagram or flowchart
  - `gate`: Thinking gate or pattern gate answer
  - `triage`: Debug triage classification
  - `reflection`: Post-attempt reflection
  - `files`: Multi-file submission (Debug Lab)
- `language`: Programming language for code submissions (javascript, python, java, etc.)
- `contentText`: Plain text content (code, explanation, etc.)
- `contentJson`: Structured content (flexible schema based on type)
- `isFinal`: Mark as final submission for attempt (default: false)

**Response (201 Created):**
```json
{
  "submission": {
    "id": "sub-789",
    "attemptId": "attempt-456",
    "userId": "user-001",
    "type": "code",
    "language": "javascript",
    "contentText": "function solution() { ... }",
    "contentJson": {},
    "isFinal": false,
    "createdAt": "2026-01-24T10:00:00Z"
  }
}
```

**Error Codes:**
- `VALIDATION_ERROR` (400): Invalid request body
- `ATTEMPT_NOT_FOUND` (404): Attempt does not exist
- `FORBIDDEN` (403): Attempt does not belong to user

---

### List Submissions for Attempt

**GET** `/api/attempts/{attemptId}/submissions`

Retrieves all submissions for an attempt, ordered by creation time (newest first).

**Headers:**
```http
x-tenant-id: string (optional)
x-user-id: string (optional)
```

**Path Parameters:**
- `attemptId` (string): Attempt identifier

**Query Parameters:**
- `type` (string, optional): Filter by submission type
- `limit` (number, optional): Max submissions to return (default: all)
- `offset` (number, optional): Skip first N submissions (default: 0)

**Response (200):**
```json
{
  "submissions": [
    {
      "id": "sub-789",
      "attemptId": "attempt-456",
      "userId": "user-001",
      "type": "code",
      "language": "javascript",
      "contentText": "function solution() { ... }",
      "contentJson": {},
      "isFinal": false,
      "createdAt": "2026-01-24T10:00:00Z"
    }
  ]
}
```

**Error Codes:**
- `ATTEMPT_NOT_FOUND` (404): Attempt does not exist
- `FORBIDDEN` (403): Attempt does not belong to user

---

## AI Feedback API

### Get AI Feedback for Attempt

**GET** `/api/attempts/{attemptId}/ai-feedback`

Retrieves AI-generated feedback for an attempt (hints, explanations, reviews, Socratic questions).

**Headers:**
```http
x-tenant-id: string (optional)
x-user-id: string (optional)
```

**Path Parameters:**
- `attemptId` (string): Attempt identifier

**Query Parameters:**
- `type` (string, optional): Filter by feedback type (hint | explanation | review | guidance)
- `limit` (number, optional): Max items to return (default: 10)

**Response (200):**
```json
{
  "feedback": [
    {
      "id": "ai-feedback-123",
      "userId": "user-001",
      "attemptId": "attempt-456",
      "submissionId": "sub-789 | null",
      "type": "hint",
      "model": "claude-sonnet-4-20250514",
      "promptVersion": "v2.1",
      "inputHash": "sha256-...",
      "output": {
        "hint": "Consider using a sliding window approach...",
        "nextAction": "Try implementing with two pointers"
      },
      "evidence": {
        "testsFailed": ["test-0", "test-2"],
        "heuristicErrors": ["loop-missing-increment"]
      },
      "createdAt": "2026-01-24T10:00:00Z"
    }
  ]
}
```

**Error Codes:**
- `ATTEMPT_NOT_FOUND` (404): Attempt does not exist
- `FORBIDDEN` (403): Attempt does not belong to user

---

### Get Socratic Turns

**GET** `/api/attempts/{attemptId}/socratic`

Retrieves the Socratic coaching dialogue history for an attempt.

**Headers:**
```http
x-tenant-id: string (optional)
x-user-id: string (optional)
```

**Path Parameters:**
- `attemptId` (string): Attempt identifier

**Query Parameters:**
- `limit` (number, optional): Max turns to return (default: all)
- `offset` (number, optional): Skip first N turns (default: 0)

**Response (200):**
```json
{
  "turns": [
    {
      "id": "turn-001",
      "attemptId": "attempt-456",
      "userId": "user-001",
      "turnIndex": 0,
      "role": "assistant",
      "message": "I noticed your solution has some edge case issues. What happens when the array has duplicate values?",
      "question": {
        "id": "q-001",
        "question": "What happens when the array has duplicate values?",
        "targetConcept": "duplicate handling",
        "difficulty": "probe",
        "evidenceRefs": [
          {
            "source": "test_result",
            "sourceId": "test-2",
            "description": "Test with duplicates failed: expected [1, 2] but got [1, 1]"
          }
        ]
      },
      "validation": null,
      "createdAt": "2026-01-24T10:00:00Z"
    },
    {
      "id": "turn-002",
      "attemptId": "attempt-456",
      "userId": "user-001",
      "turnIndex": 1,
      "role": "user",
      "message": "I think duplicates would break my hash map assumption",
      "question": null,
      "validation": {
        "isCorrect": true,
        "feedback": "Good insight! Let's explore how to handle this...",
        "nextAction": "continue",
        "confidence": 0.85
      },
      "createdAt": "2026-01-24T10:00:01Z"
    }
  ]
}
```

**Error Codes:**
- `ATTEMPT_NOT_FOUND` (404): Attempt does not exist
- `FORBIDDEN` (403): Attempt does not belong to user

---

## Evaluation Flow Example

```bash
# 1. Start an attempt (returns attemptId)
curl -X POST http://localhost:3000/api/attempts/start \
  -H "Content-Type: application/json" \
  -d '{"problemId": "prob-001"}'

# 2. Create a code submission
curl -X POST http://localhost:3000/api/submissions \
  -H "Content-Type: application/json" \
  -d '{
    "attemptId": "attempt-456",
    "type": "code",
    "language": "javascript",
    "contentText": "function twoSum(nums, target) { ... }",
    "isFinal": true
  }'

# 3. Trigger evaluation (returns evaluation run ID)
curl -X POST http://localhost:3000/api/attempts/attempt-456/evaluate \
  -H "Content-Type: application/json" \
  -d '{
    "type": "coding_tests"
  }'

# Response:
# {
#   "evaluationRun": {
#     "id": "eval-run-123",
#     "status": "queued",
#     ...
#   }
# }

# 4. Poll for evaluation results (or wait for webhook in production)
curl -X GET http://localhost:3000/api/attempts/attempt-456/evaluate

# Response when complete:
# {
#   "evaluationRun": {
#     "id": "eval-run-123",
#     "status": "succeeded",
#     "summary": {
#       "passed": true,
#       "testsPassed": 5,
#       "testsTotal": 5
#     },
#     ...
#   },
#   "testResults": [
#     {
#       "testIndex": 0,
#       "passed": true,
#       "expected": "3",
#       "actual": "3",
#       ...
#     }
#   ]
# }

# 5. Get AI feedback if available
curl -X GET http://localhost:3000/api/attempts/attempt-456/ai-feedback

# 6. Get Socratic coaching dialogue
curl -X GET http://localhost:3000/api/attempts/attempt-456/socratic
```

---

## Implementation Status Notes

**[As of 2026-01-24]**

### Fully Implemented
- Legacy practice flow (`/api/attempts/start`, `/api/attempts/[id]/submit`)
- Bug Hunt mode (`/api/bug-hunt/*`)
- Debug Lab mode (`/api/debug-lab/*`)
- Pattern Discovery (`/api/attempts/[id]/pattern-discovery/*`)
- Pattern Challenge (`/api/attempts/[id]/pattern-challenge/*`)
- Trace Visualization (`/api/trace/execute`)

### Partially Implemented
- **Evaluation API**: Endpoints exist but use stub execution (see `evaluate` endpoint note above)
- **Submissions API**: Schema defined, in-memory implementation active, DB not wired
- **AI Feedback API**: Schema defined, not yet exposed as API endpoints

### Not Yet Implemented
- **Socratic Coach**: Adapter exists but not wired (deps.ts line 123 hardcoded to null)
- **Database Integration**: Schema exists, adapters not wired (see MIGRATION.md)
- **Webhooks**: No webhook support for async evaluation completion
- **Batch Operations**: No bulk submission or evaluation endpoints

---

## Data Models Reference

For complete data model schemas, see:
- **Database Schema**: `packages/adapter-db/src/schema.ts`
- **Entity Types**: `packages/core/src/entities/`
- **Port Interfaces**: `packages/core/src/ports/`
- **Migration Guide**: `MIGRATION.md`

---

**Last Updated**: 2026-01-24
**Reflects Code State**: Commit `8d790fc` with verified findings from code analysis
