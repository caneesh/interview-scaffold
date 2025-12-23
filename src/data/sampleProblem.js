/**
 * Sample problem data following the Scaffolded Learning data model.
 * Each problem is split into multiple steps (a Directed Acyclic Graph).
 * Users must solve Step 1 before seeing Step 2.
 */
export const sampleProblem = {
  id: "problem_101",
  title: "Detect Cycle in Linked List",
  difficulty: "Medium",
  description: "Given a linked list, determine if it has a cycle in it. A cycle occurs when a node's next pointer points back to a previous node, creating a loop.",

  // Interview Simulation - "What Would You Try First?"
  interviewQuestion: {
    prompt: "You are in an interview. The interviewer just gave you this problem. What is your first approach?",
    hint: "Think about the constraints: O(1) space is ideal, and we need to detect if we've seen a node before.",
    options: [
      {
        id: 'brute-force',
        label: 'Brute Force',
        description: 'Check every node against every other node',
        icon: 'brute',
        isCorrect: false,
        feedback: {
          title: "Not optimal for this problem",
          explanation: "Brute force would mean for each node, checking if we've seen it before by traversing from the head again. This gives O(n²) time complexity.",
          whyNot: "While it works, interviewers expect you to recognize this is inefficient. It doesn't leverage the structure of the problem.",
          betterApproach: "Think about what makes a cycle special - if you keep walking, you'll eventually return to where you started..."
        }
      },
      {
        id: 'hash-set',
        label: 'Hash Set',
        description: 'Store visited nodes in a set',
        icon: 'hash',
        isCorrect: false,
        isPartiallyCorrect: true,
        feedback: {
          title: "Good thinking, but not optimal!",
          explanation: "Using a hash set to track visited nodes is a valid O(n) time solution. You'd store each node's reference and check if you've seen it before.",
          whyNot: "This works and many interviewers would accept it as a first answer. However, it uses O(n) extra space.",
          betterApproach: "The follow-up question will be: 'Can you do it in O(1) space?' That's where Two Pointers shines.",
          partialCredit: "You'd likely get partial credit for this - it shows good problem-solving instinct!"
        }
      },
      {
        id: 'two-pointers',
        label: 'Two Pointers',
        description: 'Use slow and fast pointers',
        icon: 'pointers',
        isCorrect: true,
        feedback: {
          title: "Excellent choice! This is optimal.",
          explanation: "Floyd's Cycle Detection (Tortoise and Hare) uses two pointers moving at different speeds. If there's a cycle, the fast pointer will eventually 'lap' the slow pointer.",
          whyYes: "This achieves O(n) time AND O(1) space - the best possible complexity for this problem.",
          interviewTip: "In an interview, you might first mention the hash set approach, then optimize to two pointers. This shows your thought process!"
        }
      },
      {
        id: 'sorting',
        label: 'Sorting',
        description: 'Sort the nodes somehow',
        icon: 'sort',
        isCorrect: false,
        feedback: {
          title: "This won't work here",
          explanation: "Sorting requires either values to compare or the ability to rearrange elements. In a linked list cycle problem, we can't meaningfully sort nodes.",
          whyNot: "Linked list nodes don't have a natural ordering for cycle detection. We're looking for structural repetition, not value-based patterns.",
          betterApproach: "Ask yourself: 'What property of a cycle can I exploit?' Hint: In a cycle, you keep visiting the same nodes..."
        }
      },
      {
        id: 'recursion',
        label: 'Recursion / DFS',
        description: 'Recursively traverse the list',
        icon: 'recursion',
        isCorrect: false,
        feedback: {
          title: "Risky for this problem",
          explanation: "While you could use recursion to traverse, it doesn't inherently solve cycle detection. You'd still need a way to track visited nodes.",
          whyNot: "Recursion on a linked list with a cycle would cause infinite recursion (stack overflow) unless you track visited nodes - which brings you back to O(n) space.",
          betterApproach: "Recursion is powerful for trees and graphs with clear termination. For cycles, think about what property lets you detect repetition without storing history."
        }
      },
      {
        id: 'dp',
        label: 'Dynamic Programming',
        description: 'Build up a solution from subproblems',
        icon: 'dp',
        isCorrect: false,
        feedback: {
          title: "Not applicable here",
          explanation: "DP is for optimization problems with overlapping subproblems and optimal substructure. Cycle detection is a yes/no decision problem.",
          whyNot: "There's no 'optimal' solution to build up - we just need to detect presence/absence of a cycle. No subproblem structure exists.",
          betterApproach: "When you see 'detect' or 'find if exists', think traversal patterns rather than DP. What happens if you walk through a cycle?"
        }
      }
    ],
    correctAnswer: 'two-pointers',
    acceptableAnswers: ['two-pointers', 'hash-set'], // Hash set gets partial credit
    interviewContext: {
      whatInterviewerWants: "The interviewer wants to see if you can identify the optimal pattern quickly. Mentioning hash set first, then optimizing to two pointers, shows strong problem-solving.",
      commonMistakes: [
        "Jumping straight to code without discussing approach",
        "Not considering space complexity",
        "Missing the 'different speeds' insight for two pointers"
      ],
      followUpQuestions: [
        "Can you do it in O(1) space?",
        "What if you needed to find WHERE the cycle starts?",
        "How would you prove the two pointers will meet?"
      ]
    }
  },

  // Concept tagging for pattern recognition training
  concepts: [
    {
      name: "Two Pointers",
      icon: "pointers",
      color: "blue",
      description: "Using two references that traverse the data structure at different speeds or from different positions."
    },
    {
      name: "Floyd's Algorithm",
      icon: "cycle",
      color: "purple",
      description: "The Tortoise and Hare algorithm - a pointer algorithm that uses two pointers moving at different speeds."
    },
    {
      name: "Cycle Detection",
      icon: "loop",
      color: "green",
      description: "Identifying whether a sequence or structure contains a repeating pattern or loop."
    },
    {
      name: "Constant Space",
      icon: "memory",
      color: "amber",
      description: "O(1) space complexity - solving without additional data structures proportional to input size."
    }
  ],

  // Pattern recognition explanations - teaching WHY this approach works
  patternExplanations: [
    {
      pattern: "Two Pointers",
      reason: "We need to detect if paths converge → two pointers moving at different speeds will eventually meet if there's a cycle.",
      insight: "If the fast pointer 'laps' the slow pointer, they must be in a cycle. Like two runners on a circular track."
    },
    {
      pattern: "Different Speeds",
      reason: "Fast pointer moves 2x speed → guarantees meeting in a cycle because the gap closes by 1 each iteration.",
      insight: "The relative speed difference of 1 ensures they'll collide rather than pass each other."
    },
    {
      pattern: "No Extra Memory",
      reason: "We only track two pointers → O(1) space vs O(n) for hash set approach.",
      insight: "Trading off simplicity (hash set is easier to understand) for space efficiency."
    },
    {
      pattern: "Termination Guarantee",
      reason: "Fast pointer reaches end OR meets slow → always terminates in O(n) time.",
      insight: "The algorithm is guaranteed to finish because either the list ends or pointers meet within n iterations."
    }
  ],

  // Key takeaways for learning reinforcement
  keyTakeaways: [
    "When detecting cycles, consider: Can two things moving at different speeds help?",
    "Two pointers are powerful when you need to find convergence or intersection.",
    "O(1) space solutions often involve clever pointer manipulation instead of auxiliary data structures."
  ],

  // Pattern Recognition Quiz - Transfer Learning
  patternQuiz: {
    question: "Which of these problems use the same core idea (cycle detection with two pointers at different speeds)?",
    problems: [
      {
        id: 1,
        title: "Happy Number",
        difficulty: "Easy",
        description: "Determine if a number is 'happy' by repeatedly summing squares of digits until you get 1 or loop forever.",
        usesSamePattern: true,
        explanation: "The sequence of digit-square sums either reaches 1 or cycles. Using slow/fast pointers on this sequence detects if we're in a cycle - identical to linked list cycle detection!"
      },
      {
        id: 2,
        title: "Find the Duplicate Number",
        difficulty: "Medium",
        description: "Given an array of n+1 integers where each integer is between 1 and n, find the duplicate.",
        usesSamePattern: true,
        explanation: "Treating array indices as 'next pointers' creates an implicit linked list. The duplicate creates a cycle! Floyd's algorithm finds exactly where the cycle begins."
      },
      {
        id: 3,
        title: "Merge Two Sorted Lists",
        difficulty: "Easy",
        description: "Merge two sorted linked lists into one sorted linked list.",
        usesSamePattern: false,
        explanation: "This uses two pointers, but they move through DIFFERENT lists at the SAME speed. There's no cycle detection - it's a linear merge operation."
      },
      {
        id: 4,
        title: "Linked List Cycle II",
        difficulty: "Medium",
        description: "Given a linked list, return the node where the cycle begins. If there is no cycle, return null.",
        usesSamePattern: true,
        explanation: "This is a direct extension! After detecting the cycle with Floyd's algorithm, reset one pointer to head and move both at same speed - they'll meet at cycle start."
      },
      {
        id: 5,
        title: "Reverse Linked List",
        difficulty: "Easy",
        description: "Reverse a singly linked list and return the new head.",
        usesSamePattern: false,
        explanation: "This uses pointer manipulation but NO cycle detection. It's about rewiring next pointers, not finding convergence of fast/slow pointers."
      }
    ]
  },

  // Pattern Graph - Global DAG for structured learning
  // Shows where this problem fits in the pattern landscape
  patternGraph: {
    // The path this problem follows in the pattern tree
    currentPath: ['two-pointers', 'fast-slow', 'cycle-detection'],

    // Full pattern tree structure
    nodes: {
      'root': {
        id: 'root',
        name: 'Algorithm Patterns',
        description: 'Master these core patterns to solve any coding interview',
        children: ['two-pointers', 'sliding-window', 'binary-search', 'dfs-bfs', 'dynamic-programming', 'monotonic-stack'],
        isUnlocked: true,
        icon: 'tree'
      },
      'two-pointers': {
        id: 'two-pointers',
        name: 'Two Pointers',
        description: 'Use two references to traverse data structures efficiently',
        children: ['fast-slow', 'left-right', 'multiple-arrays'],
        isUnlocked: true,
        icon: 'pointers',
        color: 'blue'
      },
      'fast-slow': {
        id: 'fast-slow',
        name: 'Fast & Slow Pointers',
        description: 'Pointers moving at different speeds to detect patterns',
        children: ['cycle-detection', 'middle-finding', 'happy-number'],
        isUnlocked: true,
        icon: 'speed',
        color: 'blue'
      },
      'cycle-detection': {
        id: 'cycle-detection',
        name: 'Cycle Detection',
        description: "Floyd's algorithm - detect if a sequence loops back",
        children: ['cycle-start', 'cycle-length'],
        isUnlocked: true,
        isCurrent: true,
        icon: 'cycle',
        color: 'purple'
      },
      'cycle-start': {
        id: 'cycle-start',
        name: 'Find Cycle Start',
        description: 'After detecting cycle, find where it begins',
        children: [],
        isUnlocked: false,
        icon: 'target',
        color: 'purple'
      },
      'cycle-length': {
        id: 'cycle-length',
        name: 'Cycle Length',
        description: 'Count the number of nodes in the cycle',
        children: [],
        isUnlocked: false,
        icon: 'ruler',
        color: 'purple'
      },
      'middle-finding': {
        id: 'middle-finding',
        name: 'Find Middle',
        description: 'Find middle element in one pass using fast/slow',
        children: [],
        isUnlocked: false,
        icon: 'center',
        color: 'blue'
      },
      'happy-number': {
        id: 'happy-number',
        name: 'Sequence Cycles',
        description: 'Detect cycles in number sequences',
        children: [],
        isUnlocked: false,
        icon: 'number',
        color: 'blue'
      },
      'left-right': {
        id: 'left-right',
        name: 'Left & Right Pointers',
        description: 'Pointers converging from both ends',
        children: ['two-sum-sorted', 'container-water', 'palindrome'],
        isUnlocked: false,
        icon: 'arrows',
        color: 'green'
      },
      'two-sum-sorted': {
        id: 'two-sum-sorted',
        name: 'Two Sum (Sorted)',
        description: 'Find pair summing to target in sorted array',
        children: [],
        isUnlocked: false,
        icon: 'plus',
        color: 'green'
      },
      'container-water': {
        id: 'container-water',
        name: 'Container Problems',
        description: 'Maximize area between vertical lines',
        children: [],
        isUnlocked: false,
        icon: 'container',
        color: 'green'
      },
      'palindrome': {
        id: 'palindrome',
        name: 'Palindrome Check',
        description: 'Verify symmetry from both ends',
        children: [],
        isUnlocked: false,
        icon: 'mirror',
        color: 'green'
      },
      'multiple-arrays': {
        id: 'multiple-arrays',
        name: 'Multiple Arrays',
        description: 'Traverse multiple sorted structures',
        children: ['merge-sorted', 'intersection'],
        isUnlocked: false,
        icon: 'layers',
        color: 'amber'
      },
      'merge-sorted': {
        id: 'merge-sorted',
        name: 'Merge Sorted',
        description: 'Combine sorted arrays/lists efficiently',
        children: [],
        isUnlocked: false,
        icon: 'merge',
        color: 'amber'
      },
      'intersection': {
        id: 'intersection',
        name: 'Find Intersection',
        description: 'Find common elements or meeting points',
        children: [],
        isUnlocked: false,
        icon: 'intersect',
        color: 'amber'
      },
      'sliding-window': {
        id: 'sliding-window',
        name: 'Sliding Window',
        description: 'Maintain a window over sequential data',
        children: ['fixed-window', 'variable-window'],
        isUnlocked: false,
        icon: 'window',
        color: 'teal'
      },
      'fixed-window': {
        id: 'fixed-window',
        name: 'Fixed Window',
        description: 'Window of constant size k',
        children: [],
        isUnlocked: false,
        icon: 'fixed',
        color: 'teal'
      },
      'variable-window': {
        id: 'variable-window',
        name: 'Variable Window',
        description: 'Window that grows and shrinks',
        children: ['max-length', 'min-length'],
        isUnlocked: false,
        icon: 'expand',
        color: 'teal'
      },
      'max-length': {
        id: 'max-length',
        name: 'Max Length',
        description: 'Find longest valid window',
        children: [],
        isUnlocked: false,
        icon: 'maximize',
        color: 'teal'
      },
      'min-length': {
        id: 'min-length',
        name: 'Min Length',
        description: 'Find shortest valid window',
        children: [],
        isUnlocked: false,
        icon: 'minimize',
        color: 'teal'
      },
      'binary-search': {
        id: 'binary-search',
        name: 'Binary Search',
        description: 'Divide and conquer on sorted/monotonic data',
        children: ['search-sorted', 'search-answer'],
        isUnlocked: false,
        icon: 'search',
        color: 'orange'
      },
      'search-sorted': {
        id: 'search-sorted',
        name: 'Search in Sorted',
        description: 'Find element in sorted array',
        children: [],
        isUnlocked: false,
        icon: 'sort',
        color: 'orange'
      },
      'search-answer': {
        id: 'search-answer',
        name: 'Binary Search on Answer',
        description: 'Search the solution space directly',
        children: [],
        isUnlocked: false,
        icon: 'target',
        color: 'orange'
      },
      'dfs-bfs': {
        id: 'dfs-bfs',
        name: 'DFS / BFS',
        description: 'Graph and tree traversal patterns',
        children: ['dfs-state', 'bfs-shortest'],
        isUnlocked: false,
        icon: 'graph',
        color: 'pink'
      },
      'dfs-state': {
        id: 'dfs-state',
        name: 'DFS with State',
        description: 'Track state during depth-first exploration',
        children: [],
        isUnlocked: false,
        icon: 'depth',
        color: 'pink'
      },
      'bfs-shortest': {
        id: 'bfs-shortest',
        name: 'BFS Shortest Path',
        description: 'Find shortest path in unweighted graphs',
        children: [],
        isUnlocked: false,
        icon: 'path',
        color: 'pink'
      },
      'dynamic-programming': {
        id: 'dynamic-programming',
        name: 'Dynamic Programming',
        description: 'Break problems into overlapping subproblems',
        children: ['dp-subsequence', 'dp-grid'],
        isUnlocked: false,
        icon: 'table',
        color: 'red'
      },
      'dp-subsequence': {
        id: 'dp-subsequence',
        name: 'DP on Subsequences',
        description: 'LIS, LCS, and substring problems',
        children: [],
        isUnlocked: false,
        icon: 'sequence',
        color: 'red'
      },
      'dp-grid': {
        id: 'dp-grid',
        name: 'DP on Grids',
        description: 'Path counting and optimization on 2D grids',
        children: [],
        isUnlocked: false,
        icon: 'grid',
        color: 'red'
      },
      'monotonic-stack': {
        id: 'monotonic-stack',
        name: 'Monotonic Stack',
        description: 'Stack maintaining sorted order for range queries',
        children: ['next-greater', 'histogram'],
        isUnlocked: false,
        icon: 'stack',
        color: 'indigo'
      },
      'next-greater': {
        id: 'next-greater',
        name: 'Next Greater Element',
        description: 'Find next larger element for each position',
        children: [],
        isUnlocked: false,
        icon: 'arrow-up',
        color: 'indigo'
      },
      'histogram': {
        id: 'histogram',
        name: 'Histogram Problems',
        description: 'Max rectangle, trapping water variants',
        children: [],
        isUnlocked: false,
        icon: 'chart',
        color: 'indigo'
      }
    },

    // Diagnostic messages when user struggles with specific sub-patterns
    diagnostics: {
      'cycle-detection': {
        stepMapping: {
          1: "Pointer initialization is the foundation - both must start at the same point",
          2: "The loop condition prevents null pointer errors - always check fast AND fast.next",
          3: "Different speeds are KEY - fast moves 2x, closing the gap by 1 each iteration",
          4: "The meeting point check - if they're equal, you've found a cycle",
          5: "No cycle means fast reached the end - return False"
        },
        failureMessage: "Cycle Detection requires understanding that two pointers at different speeds will eventually meet in a cycle.",
        prerequisiteGaps: ["fast-slow"]
      },
      'fast-slow': {
        failureMessage: "Fast & Slow pointer technique wasn't fully recalled. Remember: different speeds create predictable convergence.",
        prerequisiteGaps: ["two-pointers"]
      }
    },

    // Problems that unlock after completing this one
    unlocks: ['cycle-start', 'cycle-length', 'happy-number']
  },

  // Mistake-Centered Learning - Critique buggy solutions and wrong approaches
  mistakeAnalysis: {
    challenges: [
      {
        id: 'buggy-1',
        type: 'buggy-code',
        title: "Candidate A's Solution",
        scenario: "Here is a solution from another candidate. Can you identify the flaw?",
        code: `def hasCycle(head):
    slow = head
    fast = head

    while fast.next:  # Bug: should check fast AND fast.next
        slow = slow.next
        fast = fast.next.next
        if slow == fast:
            return True

    return False`,
        language: 'python',
        options: [
          {
            id: 'a',
            text: "The pointers are initialized incorrectly",
            isCorrect: false,
            feedback: "Actually, both pointers starting at head is correct for Floyd's algorithm."
          },
          {
            id: 'b',
            text: "The while loop condition will cause a NullPointerError",
            isCorrect: true,
            feedback: "Correct! The loop only checks `fast.next`, but `fast` itself could be None after moving. If the list has no cycle and odd length, `fast` becomes None, then `fast.next` crashes."
          },
          {
            id: 'c',
            text: "The slow pointer should move two steps",
            isCorrect: false,
            feedback: "No, slow moving one step and fast moving two steps is the correct approach for cycle detection."
          },
          {
            id: 'd',
            text: "The comparison should use 'is' instead of '=='",
            isCorrect: false,
            feedback: "While 'is' checks identity and '==' checks equality, both work for node comparison in Python. This isn't the critical bug."
          }
        ],
        correctAnswer: 'b',
        detailedExplanation: {
          whatWentWrong: "The loop condition only checks `fast.next` but not `fast` itself. When `fast` moves two steps and the list has no cycle, `fast` can become None.",
          testCase: "Consider list: 1 → 2 → 3 → None. After first iteration: slow=2, fast=3. After second iteration: slow=3, fast=None. Now `fast.next` crashes!",
          correctFix: "Change `while fast.next:` to `while fast and fast.next:`",
          lesson: "Always think about edge cases: What happens when the list ends? What happens with odd vs even length lists?"
        }
      },
      {
        id: 'buggy-2',
        type: 'buggy-code',
        title: "Candidate B's Solution",
        scenario: "This solution passes most test cases but fails on one edge case. What's wrong?",
        code: `def hasCycle(head):
    if not head:
        return False

    slow = head
    fast = head.next  # Bug: Different starting positions

    while fast and fast.next:
        if slow == fast:
            return True
        slow = slow.next
        fast = fast.next.next

    return False`,
        language: 'python',
        options: [
          {
            id: 'a',
            text: "Missing null check for head",
            isCorrect: false,
            feedback: "The code does check `if not head` at the start, so this isn't the issue."
          },
          {
            id: 'b',
            text: "Fast and slow should start at the same position",
            isCorrect: true,
            feedback: "Correct! Starting fast at head.next means they compare BEFORE moving on first iteration. This works but is error-prone and fails for single-node cycles!"
          },
          {
            id: 'c',
            text: "The return False should be inside the loop",
            isCorrect: false,
            feedback: "No, returning False after the loop exits is correct - it means we reached the end without finding a cycle."
          },
          {
            id: 'd',
            text: "The loop should use 'or' instead of 'and'",
            isCorrect: false,
            feedback: "Using 'or' would be wrong - we need BOTH conditions to be true to safely access fast.next.next."
          }
        ],
        correctAnswer: 'b',
        detailedExplanation: {
          whatWentWrong: "By starting fast at head.next, the algorithm compares pointers BEFORE moving them. This changes the logic and can fail for a single node pointing to itself.",
          testCase: "Consider: head → head (single node cycle). With standard algorithm: slow=head, fast=head. After moving: slow=head, fast=head. They meet! But with this code: slow=head, fast=head. They're equal immediately before the check inside the loop runs, so comparison happens correctly. However, the code is fragile and confusing.",
          correctFix: "Start both at head: `fast = head`. The comparison should happen AFTER moving, not before.",
          lesson: "Consistency matters. The standard Floyd's algorithm has both pointers start together and compare after moving. Deviating creates subtle bugs."
        }
      },
      {
        id: 'wrong-approach-1',
        type: 'wrong-approach',
        title: "Tempting but Inefficient",
        scenario: "A candidate proposes this approach. Why might the interviewer push back?",
        code: `def hasCycle(head):
    visited = set()
    current = head

    while current:
        if current in visited:
            return True
        visited.add(current)
        current = current.next

    return False`,
        language: 'python',
        options: [
          {
            id: 'a',
            text: "The logic is incorrect - it won't detect cycles",
            isCorrect: false,
            feedback: "The logic is actually correct! It properly detects cycles by tracking visited nodes."
          },
          {
            id: 'b',
            text: "It uses O(n) extra space instead of O(1)",
            isCorrect: true,
            feedback: "Correct! While this solution works, it uses O(n) space for the hash set. The interviewer will likely ask: 'Can you do it in O(1) space?' - which leads to the two-pointer approach."
          },
          {
            id: 'c',
            text: "The time complexity is O(n²)",
            isCorrect: false,
            feedback: "Actually, the time complexity is O(n) because hash set operations are O(1) average. Space is the issue here."
          },
          {
            id: 'd',
            text: "It will infinite loop on cyclic lists",
            isCorrect: false,
            feedback: "No, it correctly returns True when it encounters a visited node, preventing infinite loops."
          }
        ],
        correctAnswer: 'b',
        detailedExplanation: {
          whatWentWrong: "Nothing is 'wrong' per se - this is a valid O(n) time solution. The issue is space complexity.",
          whyNotOptimal: "Using a hash set requires O(n) extra memory to store all visited nodes. In an interview, this is often the first answer candidates give, but there's a follow-up.",
          optimalAlternative: "Floyd's Cycle Detection achieves O(n) time with O(1) space by using two pointers at different speeds instead of storing history.",
          lesson: "In interviews, always consider space complexity. 'Can you do it without extra memory?' is a common follow-up. Two pointers often eliminate the need for auxiliary data structures."
        }
      },
      {
        id: 'subtle-bug-1',
        type: 'subtle-bug',
        title: "Off-By-One Error",
        scenario: "This solution has a subtle bug that causes incorrect results. Can you spot it?",
        code: `def hasCycle(head):
    slow = head
    fast = head

    while fast and fast.next:
        if slow == fast:  # Bug: Checking BEFORE moving
            return True
        slow = slow.next
        fast = fast.next.next

    return False`,
        language: 'python',
        options: [
          {
            id: 'a',
            text: "The comparison happens before moving the pointers",
            isCorrect: true,
            feedback: "Correct! Since both start at head, `slow == fast` is True on the first check, causing false positives. The comparison should happen AFTER moving the pointers."
          },
          {
            id: 'b',
            text: "The fast pointer should move three steps",
            isCorrect: false,
            feedback: "No, two steps is correct. The speed difference of 1 ensures they'll meet in a cycle."
          },
          {
            id: 'c',
            text: "The loop condition is wrong",
            isCorrect: false,
            feedback: "The loop condition `fast and fast.next` is correct - it ensures safe access to fast.next.next."
          },
          {
            id: 'd',
            text: "Missing base case for empty list",
            isCorrect: false,
            feedback: "The code handles empty lists fine - the while condition will be false immediately."
          }
        ],
        correctAnswer: 'a',
        detailedExplanation: {
          whatWentWrong: "The check `slow == fast` happens at the start of each iteration, including the first one. Since both start at head, they're equal before any movement, causing every list to be reported as cyclic!",
          testCase: "For list 1 → 2 → 3 → None: slow=head, fast=head. First check: slow == fast is True! Returns True incorrectly.",
          correctFix: "Move pointers FIRST, then compare:\n```python\nwhile fast and fast.next:\n    slow = slow.next\n    fast = fast.next.next\n    if slow == fast:\n        return True\n```",
          lesson: "Order of operations matters! In Floyd's algorithm, you move then compare, not compare then move."
        }
      }
    ],
    // Summary statistics and learning outcomes
    learningOutcomes: [
      "Recognize the importance of null checks in pointer algorithms",
      "Understand why pointer initialization order matters",
      "Distinguish between correct-but-suboptimal and incorrect solutions",
      "Identify off-by-one errors in iterative algorithms"
    ]
  },

  steps: [
    {
      stepId: 1,
      instruction: "First, we need to initialize our pointers. Create a 'slow' pointer and a 'fast' pointer, both pointing to the head. This is the foundation of Floyd's Tortoise and Hare algorithm.",
      placeholderCode: "# Initialize your pointers here\nslow = \nfast = ",
      validationType: "regex",
      validationRule: "(slow\\s*=\\s*head).*(fast\\s*=\\s*head)|(fast\\s*=\\s*head).*(slow\\s*=\\s*head)",
      hints: [
        "Think about the Tortoise and Hare algorithm.",
        "Both pointers should start at the same position - the head of the linked list.",
        "Example: slow = head"
      ]
    },
    {
      stepId: 2,
      instruction: "Now, create a while loop. It should run as long as 'fast' and 'fast.next' are not None. This ensures we don't get a null pointer error when moving the fast pointer.",
      placeholderCode: "while ... :\n    # Loop body will go here",
      validationType: "regex",
      validationRule: "while\\s+fast\\s+(and|&&)\\s+fast\\.next",
      hints: [
        "We need to make sure the fast pointer doesn't run off the end of the list.",
        "Check both 'fast' and 'fast.next' are not None.",
        "Use 'and' to combine the two conditions."
      ]
    },
    {
      stepId: 3,
      instruction: "Inside the loop, move the slow pointer by one step and the fast pointer by two steps. This is the key to detecting cycles - if there's a cycle, the fast pointer will eventually catch up to the slow pointer.",
      placeholderCode: "# Move the pointers\nslow = \nfast = ",
      validationType: "regex",
      validationRule: "(slow\\s*=\\s*slow\\.next).*(fast\\s*=\\s*fast\\.next\\.next)|(fast\\s*=\\s*fast\\.next\\.next).*(slow\\s*=\\s*slow\\.next)",
      hints: [
        "The slow pointer moves one node at a time: slow = slow.next",
        "The fast pointer moves two nodes at a time: fast = fast.next.next",
        "Think of it like two runners on a circular track - the faster one will lap the slower one if it's circular."
      ]
    },
    {
      stepId: 4,
      instruction: "After moving the pointers, check if they meet. If slow equals fast, we've detected a cycle! Return True in this case.",
      placeholderCode: "# Check for cycle\nif ...:\n    return True",
      validationType: "regex",
      validationRule: "if\\s+slow\\s*(==|is)\\s*fast",
      hints: [
        "Compare the two pointers using '==' or 'is'.",
        "If they point to the same node, we found a cycle.",
        "This check should be inside the while loop."
      ]
    },
    {
      stepId: 5,
      instruction: "Finally, if the loop completes without finding a cycle (fast reaches the end), return False. This means the linked list has no cycle.",
      placeholderCode: "# No cycle found\nreturn ...",
      validationType: "regex",
      validationRule: "return\\s+False",
      hints: [
        "If we exit the while loop, it means fast reached the end.",
        "A list that ends (has a None) cannot have a cycle.",
        "Simply return False."
      ]
    }
  ]
};

export default sampleProblem;
