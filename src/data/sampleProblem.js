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
