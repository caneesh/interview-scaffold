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
