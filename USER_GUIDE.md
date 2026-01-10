# User Guide

Step-by-step guide for using the Scaffolded Learning Platform. This guide covers the happy path for each implemented mode.

---

## First-Time User Flow

### 1. Navigate to the Application

Open `http://localhost:3000` in your browser after starting the development server.

### 2. Home Page

You will see the home page with:

- **Title**: "Master Coding Patterns"
- **Description**: Pattern-first interview preparation
- **Two buttons**:
  - "Start Practice" - Main learning mode
  - "Explore Patterns" - Browse available content

### 3. How It Works Section

The home page displays a 3-step process:
1. **Approach** - Identify the pattern before writing code
2. **Implement** - Write your solution with the pattern in mind
3. **Reflect** - Learn from mistakes through guided reflection

---

## Practice Mode (Primary Learning Path)

This is the main learning interface with full backend integration.

### Step 1: Start Practice

1. Click **"Start Practice"** on the home page
2. You are taken to `/practice`
3. The system recommends a problem based on your skill level

### Step 2: Start an Attempt

1. Select a problem from the list (if available)
2. Click to start an attempt
3. The system checks if the rung is unlocked for you:
   - **Rung 1**: Always unlocked
   - **Rungs 2-5**: Require 70+ score on previous rung

### Step 3: Thinking Gate (Required)

Before you can write code, you must pass the thinking gate:

1. **Identify the Pattern**: Select which algorithmic pattern applies (e.g., BACKTRACKING, SLIDING_WINDOW)
2. **State the Invariant**: Describe what property your solution will maintain

The system evaluates your response:
- **Pass**: You may proceed to coding
- **Fail**: A micro-lesson modal appears with educational content

**What you see**:
- Problem statement at the top (collapsible)
- Stepper showing: Approach > Code > Test > (Reflection) > Complete
- Form fields for pattern selection and invariant

### Step 4: Write Code

After passing the thinking gate:

1. **Write your solution** in the code editor
   - Syntax highlighting enabled
   - Language selection available (Python, JavaScript, etc.)

2. **Request hints** (optional)
   - Click "Get Hint" to receive progressive hints
   - 5 hint levels available: Directional -> Heuristic -> Concept -> Example -> Code
   - Each hint usage is tracked and may affect your score

3. **Submit your code**
   - Click "Submit" to run your code against test cases

### Step 5: View Test Results

After submission, you see:

1. **Test Results Panel**:
   - Each test case showing: Input, Expected Output, Actual Output
   - Pass/Fail indicator per test
   - Error messages if execution failed

2. **Validation Feedback** (if LLM enabled):
   - Grade: PASS, PARTIAL, or FAIL
   - Confidence level
   - Specific feedback on your code
   - Suggested micro-lesson (if applicable)

### Step 6: Gating Decision

The system decides your next step based on your submission:

| Outcome | What Happens |
|---------|--------------|
| All tests pass + no critical errors | Proceed to completion |
| Pattern-specific error detected | Micro-lesson modal appears |
| Repeated same error | Reflection form required |
| Tests fail | Reflection form required |

### Step 7: Reflection (If Required)

If you failed tests or made critical errors:

1. **Multiple-choice question** appears asking about your mistake
2. **Select an answer** from the options
3. **Submit** to proceed
4. After reflection, you return to the coding step to retry

**Example reflection questions**:
- "I missed handling an edge case (empty input, single element, etc.)"
- "I had an off-by-one error in my loop bounds"
- "I used the wrong algorithmic approach for this problem"

### Step 8: Completion

When you successfully pass all tests:

1. **Completion Summary** appears showing:
   - Overall score (0-100)
   - Score breakdown: Pattern Recognition, Implementation, Edge Cases, Efficiency
   - Hints used count
   - Code submissions count

2. **Skill is updated**:
   - Your score is recorded for this pattern-rung combination
   - Exponential moving average applied
   - If score >= 70, next rung may be unlocked

3. **Next action**:
   - Return to practice to try another problem
   - System recommends next problem via MEP engine

---

## Daily Session Mode

Block B (MEP Practice) is fully connected to the backend. Block A (Spaced Review) uses placeholder content.

### Step 1: Start Daily Session

1. Navigate to `/daily`
2. See the 10-minute session overview:
   - Block A (2 min): Spaced Review
   - Block B (6 min): MEP Practice
   - Block C (2 min): Reflection
3. Click **"Start Session"**

### Step 2: Block A - Spaced Review (Placeholder)

1. **Timer starts** counting down from 2:00
2. **Multiple-choice question** appears about Sliding Window complexity
3. **Select an answer**
4. Click **"Continue to Practice"**

**Note**: The question is a placeholder. A "Coming soon: personalized review" indicator is shown.

### Step 3: Block B - MEP Practice (Backend Connected)

1. **Problem loads** from the MEP engine (personalized based on your skill level)
2. **Thinking Gate**: Identify the pattern and state an invariant
3. **Code Editor**: Write your solution
4. **Submit**: Code is executed against test cases
5. **Hints**: Request progressive hints if needed
6. **Test Results**: See pass/fail per test case
7. **LLM Feedback**: AI feedback if enabled
8. **Reflection** (if tests fail): Answer why you think it failed, then retry
9. **Completion**: See score breakdown when all tests pass
10. Click **"Continue to Session Reflection"** (or **"Skip to Reflection"** if not completed)

This block works exactly like Practice Mode but embedded in the daily session.

### Step 4: Block C - Reflection

1. If you completed the problem, **see your score breakdown** (Overall, Pattern, Code, Edge Cases)
2. **Confidence rating**: Select 1-5
3. **Notes field**: Write what you learned or struggled with
4. Click **"Complete Session"**

### Step 5: Session Complete

1. See summary with:
   - Total time
   - Review checkmark
   - Practice score (or "Skipped" if not completed)
   - Confidence rating
   - Problem practiced (title and pattern)
2. Click **"Back to Home"**

**Note**: The attempt is persisted and affects your skill state. Session-level data (confidence, notes) is not persisted.

---

## Interview Mode

Simulates real interview conditions with a 6-step structured flow. Connected to the backend for problem fetching, code execution, and scoring.

### Step 1: Start Interview

1. Navigate to `/interview`
2. See interview conditions:
   - Timer always running
   - Hints toggle available
   - Forced explanations before coding
3. Click **"Start Interview"**
4. A problem is fetched from the MEP engine and displayed

### Step 2: Pattern Selection (Locked After Submit)

1. **Timer starts**
2. **Read the problem** displayed at the top
3. **Write** which pattern you think applies and why
4. Click **"Lock & Continue"** (answer cannot be changed)

### Step 3: Approach

1. **Explain your approach** in the text area
2. Previous answer shown as locked reference
3. Click **"Continue"**

### Step 4: Loop Invariant

1. **Define the invariant** your solution maintains
2. Click **"Continue"**

### Step 5: Complexity Analysis

1. **Analyze time and space complexity**
2. Click **"Continue"**

### Step 6: Code Implementation

1. **Write your solution** in the code editor
2. **Toggle hints** if needed (shows problem hints from the database)
3. Click **"Submit Solution"**
4. Code is submitted to the backend:
   - Attempt is created
   - Thinking gate is submitted (pattern + invariant + complexity)
   - Code is executed against test cases

### Step 7: Results

1. **See all your answers** displayed (pattern, approach, invariant, complexity, code)
2. **Test results**: Pass/fail for each test case
3. **Score breakdown**: Overall, pattern recognition, implementation, edge cases
4. **LLM feedback**: AI analysis if Anthropic API is configured
5. **Total time** shown
6. Click **"Back to Home"**

**Backend Integration**: Problem is fetched at start, code is executed via Piston API, results are graded and persisted.

---

## Error Messages You May See

### During Attempt Start

| Error | Meaning |
|-------|---------|
| "User already has an active attempt" | Complete or abandon your current attempt first |
| "Problem not found" | The requested problem doesn't exist |
| "Rung X for PATTERN is not unlocked" | Score 70+ on the previous rung first |

### During Code Submission

| Error | Meaning |
|-------|---------|
| "Must pass thinking gate before submitting code" | Complete the approach step first |
| "Must pass reflection gate before resubmitting" | Answer the reflection question first |
| "Cannot submit code in current state" | Attempt state doesn't allow code submission |

### During Hint Request

| Error | Meaning |
|-------|---------|
| "NO_MORE_HINTS" | All 5 hint levels have been used |

---

## Validation Errors You May Trigger

These appear as micro-lessons or require reflection:

### Sliding Window Pattern

- **Nested loops detected**: "Sliding window should use O(n) time with a single pass. Remove the inner loop."
- **Wrong shrink mechanism**: "Use a while-loop to shrink the window, not an if-statement."

### DFS Pattern

- **Missing visited check**: "DFS on a grid requires tracking visited cells to avoid infinite loops."
- **Missing backtrack**: "When using DFS for path-finding, remember to undo modifications after recursive calls."
- **Missing base case**: "Grid DFS requires boundary checks: if row < 0 or row >= rows..."
- **Using BFS for DFS**: "This problem expects DFS. Use recursion or stack instead of queue."

### Binary Search Pattern

- **Infinite loop risk**: "`left = mid` without `+1` can cause infinite loop."

### Two Pointers Pattern

- **No pointer movement**: "Move pointers inward: left += 1 or right -= 1."

---

## What "Completion" Means

An attempt is considered **completed** when:

1. All test cases pass
2. No blocking gating decision (BLOCK_SUBMISSION)
3. State transitions to `COMPLETED`

After completion:
- Final score is computed
- Skill state is updated with exponential moving average
- If new score >= 70, next rung may be unlocked
- User can start a new attempt

---

## Keyboard Shortcuts (Code Editor)

| Shortcut | Action |
|----------|--------|
| `Ctrl/Cmd + Z` | Undo |
| `Ctrl/Cmd + Shift + Z` | Redo |
| `Tab` | Indent |
| `Shift + Tab` | Outdent |
