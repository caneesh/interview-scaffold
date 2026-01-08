# User Guide

A complete guide to using the Scaffolded Learning Platform for coding interview preparation.

## Table of Contents

1. [Getting Started](#getting-started)
2. [Home Page](#home-page)
3. [Daily Session](#daily-session)
4. [Interview Mode](#interview-mode)
5. [Practice Mode](#practice-mode)
6. [Understanding Patterns](#understanding-patterns)
7. [Progress and Statistics](#progress-and-statistics)
8. [Tips for Success](#tips-for-success)
9. [Troubleshooting](#troubleshooting)

---

## Getting Started

### Creating an Account

1. Navigate to the application URL
2. Click "Sign Up" if you're a new user
3. Enter your email and create a password
4. Verify your email if required
5. Complete your profile setup

### First Login

After logging in, you'll see the home page with three main learning modes:
- **Daily Session** - Structured 10-minute practice
- **Interview Mode** - Realistic interview simulation
- **Practice Problems** - Free-form practice

We recommend starting with Daily Sessions to build consistent habits.

---

## Home Page

The home page serves as your learning hub with quick access to all features.

### Main Navigation

| Button | Description |
|--------|-------------|
| Start Daily Session | Begin a 10-minute structured learning session |
| Interview Mode | Practice under real interview conditions |
| Practice Problems | Free-form problem practice |

### Quick Stats

The home page displays your current statistics:
- Problems completed
- Current streak
- Patterns mastered

---

## Daily Session

The Daily Session is a 10-minute structured learning experience designed for consistent daily practice.

### Session Structure

#### Block A: Spaced Review (2 minutes)

**Purpose:** Reinforce previously learned patterns through quick recall.

**How it works:**
1. You'll see a multiple-choice question about a pattern you've studied
2. Read the question carefully
3. Select the answer you believe is correct
4. Submit your answer
5. Review the explanation (whether correct or incorrect)
6. Click "Continue to Practice" when ready

**Tips:**
- Don't spend too long on any single question
- If unsure, make your best guess - the explanation will help you learn
- Pay attention to the explanation even if you got it right

#### Block B: MEP Practice (6 minutes)

**Purpose:** Work on a problem specifically selected for your current skill level.

**How it works:**
1. The MEP engine selects an optimal problem based on your progress
2. Read the problem description carefully
3. Work through the scaffolded steps:
   - Pattern identification
   - Approach planning
   - Code implementation
4. Use hints if needed (but try without first)
5. Click "Continue to Reflection" when done or time runs out

**The scaffolded approach:**
- **Step 1:** Identify the pattern (e.g., Two Pointers, Sliding Window)
- **Step 2:** Plan your approach before coding
- **Step 3:** Implement step-by-step with guidance
- **Step 4:** Review and test your solution

#### Block C: Reflection (2 minutes)

**Purpose:** Self-assess your understanding and identify areas for improvement.

**How it works:**
1. Rate your confidence on a scale of 1-5:
   - **1** - Not confident at all, need more practice
   - **2** - Somewhat uncertain, had significant struggles
   - **3** - Neutral, could do it but with difficulty
   - **4** - Fairly confident, minor struggles
   - **5** - Very confident, could explain to others
2. Add reflection notes (optional but recommended)
3. Click "Complete Session"

**Reflection prompts to consider:**
- What pattern did I practice today?
- What was the hardest part?
- What would I do differently next time?
- What concept do I need to review?

### After the Session

You'll see a session summary with:
- Time spent in each block
- Your confidence rating
- MEP recommendations for next session
- Progress updates

---

## Interview Mode

Interview Mode simulates real coding interview conditions to prepare you for the real thing.

### Interview Conditions

- **Timer visible** - See exactly how much time remains
- **Hints hidden** - No hints available (like a real interview)
- **Forced explanations** - Must explain your approach before coding
- **Locked answers** - Cannot change answers after submitting

### Interview Phases

#### Phase 1: Pattern Selection

**What you do:**
1. Read the problem statement carefully
2. Analyze the problem characteristics
3. Identify which algorithmic pattern applies
4. Select your answer from the options
5. **Note:** Your answer locks after submission

**Tips:**
- Look for keywords that suggest patterns (e.g., "sorted array" → Binary Search)
- Consider time/space complexity requirements
- Think about what data structures would help

#### Phase 2: Approach Explanation

**What you do:**
1. Describe your solution strategy in words
2. Explain why you chose this approach
3. Outline the steps you'll take
4. Submit your explanation

**Tips:**
- Be specific about your approach
- Mention any edge cases you're aware of
- Explain your thought process, not just the steps

#### Phase 3: Loop Invariants

**What you do:**
1. Define what conditions your solution maintains
2. Explain the invariant(s) your algorithm preserves
3. Describe what's true at each iteration

**Example:**
For a two-pointer problem: "At any point, all elements before the left pointer have been processed, and all elements after the right pointer will be processed next."

#### Phase 4: Complexity Analysis

**What you do:**
1. Analyze time complexity (e.g., O(n), O(n log n))
2. Analyze space complexity (e.g., O(1), O(n))
3. Explain your reasoning

**Tips:**
- Count nested loops
- Consider recursive call stacks
- Don't forget auxiliary space usage

#### Phase 5: Code Solution

**What you do:**
1. Write your solution in the code editor
2. Choose your preferred language
3. Implement the approach you described
4. Test with example inputs mentally

**Code Editor Features:**
- Syntax highlighting
- Auto-completion
- Language templates available

#### Phase 6: Results Review

**What you see:**
- All your answers displayed
- Correct answers revealed
- Feedback on each phase
- Overall performance assessment

---

## Practice Mode

Practice Mode offers unstructured, pressure-free problem solving.

### How to Use Practice Mode

1. Browse available problems
2. Filter by:
   - Difficulty (Easy, Medium, Hard)
   - Pattern (Two Pointers, DP, etc.)
   - Status (Completed, In Progress, New)
3. Select a problem to work on
4. Work through scaffolded steps at your own pace
5. Use hints when needed
6. No time pressure

### Scaffolded Problem Structure

Each problem is broken into manageable steps:

1. **Pattern Selection** - Identify the pattern
2. **Strategy Planning** - Plan your approach
3. **Implementation Steps** - Code incrementally
4. **Review** - Check and test your solution

### Using Hints

Hints are available at each step:
- Click "Show Hint" to reveal
- Hints progress from general to specific
- Each hint usage is tracked
- Try to solve without hints first

---

## Understanding Patterns

Patterns are algorithmic templates that apply to multiple problems.

### Common Patterns

#### Two Pointers
- **When to use:** Sorted arrays, finding pairs, comparing elements
- **Key indicator:** "Find two elements that sum to X"
- **Complexity:** Usually O(n) time, O(1) space

#### Sliding Window
- **When to use:** Contiguous subarrays/substrings
- **Key indicator:** "Maximum/minimum in subarray of size k"
- **Complexity:** Usually O(n) time, O(1) space

#### Binary Search
- **When to use:** Sorted arrays, finding boundaries
- **Key indicator:** "Find position in sorted array"
- **Complexity:** O(log n) time, O(1) space

#### Dynamic Programming
- **When to use:** Optimization, counting, overlapping subproblems
- **Key indicator:** "Find minimum/maximum/count of ways"
- **Complexity:** Varies, often O(n²) or O(n*m)

#### DFS (Depth-First Search)
- **When to use:** Trees, graphs, path finding
- **Key indicator:** "Find all paths", "explore all possibilities"
- **Complexity:** O(V + E) for graphs

#### BFS (Breadth-First Search)
- **When to use:** Shortest path in unweighted graphs, level-order
- **Key indicator:** "Minimum steps", "level by level"
- **Complexity:** O(V + E) for graphs

### Pattern Mastery

Progress through patterns by:
1. Recognizing the pattern
2. Applying the template
3. Handling variations
4. Transferring to new problems

---

## Progress and Statistics

### Viewing Your Progress

Access your progress dashboard to see:
- **Problems Completed** - Total problems solved
- **Patterns Mastered** - Patterns at mastery level
- **Current Streak** - Consecutive days of practice
- **Time Invested** - Total learning time

### Understanding Metrics

#### Mastery Score (0-100)
- Below 50: Learning phase
- 50-74: Developing proficiency
- 75-89: Near mastery
- 90+: Mastered

#### Rung Level
Your current difficulty level for each pattern:
- Rung 1: Easy problems
- Rung 2: Medium problems
- Rung 3: Hard problems

#### Streak
Days of consecutive practice:
- Builds with daily sessions
- Resets if you miss a day
- Higher streaks = better retention

---

## Tips for Success

### Daily Practice

1. **Be consistent** - 10 minutes daily beats 2 hours weekly
2. **Complete all three blocks** - Each serves a purpose
3. **Be honest in reflection** - Accurate confidence ratings improve recommendations
4. **Review explanations** - Learn from both correct and incorrect answers

### During Problem Solving

1. **Read carefully** - Understand the problem fully before coding
2. **Identify the pattern first** - Don't jump to code immediately
3. **Plan before implementing** - Write pseudocode or outline steps
4. **Test with examples** - Verify your solution mentally
5. **Consider edge cases** - Empty input, single element, duplicates

### Pattern Recognition

1. **Look for keywords** - "Sorted" → Binary Search, "Subarray" → Sliding Window
2. **Consider constraints** - Array size hints at expected complexity
3. **Draw examples** - Visualize the problem
4. **Connect to known problems** - "This is like Two Sum but..."

### Interview Preparation

1. **Practice under time pressure** - Use Interview Mode regularly
2. **Explain out loud** - Practice verbalizing your thought process
3. **Review mistakes** - Learn from errors, don't just move on
4. **Build pattern intuition** - The more patterns you master, the easier new problems become

---

## Troubleshooting

### Common Issues

#### "I can't identify the pattern"

1. Re-read the problem slowly
2. Look for keywords (sorted, subarray, path, etc.)
3. Consider what data structures might help
4. Think about the expected time complexity
5. Start with brute force, then optimize

#### "I know the pattern but can't implement it"

1. Review the pattern template
2. Break the problem into smaller steps
3. Write pseudocode first
4. Use hints if truly stuck
5. After solving, study the solution carefully

#### "I keep making the same mistakes"

1. Track your error patterns
2. Do targeted micro-drills
3. Review the related micro-lesson
4. Practice similar problems
5. The guardrails will automatically help by routing you to lessons

#### "I'm not making progress"

1. Ensure daily consistency
2. Focus on one pattern at a time
3. Don't skip the reflection phase
4. Be honest about confidence levels
5. Review your analytics for insights

### Technical Issues

#### Code editor not loading
- Refresh the page
- Clear browser cache
- Try a different browser
- Check internet connection

#### Session not saving
- Check internet connection
- Don't close the tab during saving
- Contact support if persists

#### Timer issues
- Refresh the page
- Check system clock
- Report the bug if consistent

---

## Keyboard Shortcuts

### Code Editor

| Shortcut | Action |
|----------|--------|
| `Ctrl/Cmd + S` | Save code |
| `Ctrl/Cmd + Z` | Undo |
| `Ctrl/Cmd + Shift + Z` | Redo |
| `Ctrl/Cmd + /` | Toggle comment |
| `Ctrl/Cmd + D` | Select next occurrence |
| `Tab` | Indent |
| `Shift + Tab` | Outdent |

### Navigation

| Shortcut | Action |
|----------|--------|
| `Enter` | Submit/Continue |
| `Escape` | Cancel/Close |

---

## Getting Help

### In-App Help
- Look for hint buttons on each step
- Explanations are provided after each answer

### Support
- Report issues on GitHub
- Check the FAQ section
- Contact support for account issues

---

## Best Practices Summary

1. **Practice daily** - Consistency is key
2. **Follow the scaffolding** - Trust the learning process
3. **Reflect honestly** - Better data = better recommendations
4. **Master patterns** - They're the foundation of interview success
5. **Simulate interviews** - Regular Interview Mode practice
6. **Learn from mistakes** - Every error is a learning opportunity
7. **Track progress** - Celebrate improvements, identify gaps
8. **Stay patient** - Mastery takes time

Happy learning! 🎯
