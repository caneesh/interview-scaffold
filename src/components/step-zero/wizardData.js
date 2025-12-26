/**
 * Wizard Questions and Strategy Data for Socratic Step Zero
 */

// Strategy definitions with full inline help
export const STRATEGIES = {
  'two-pointers': {
    id: 'two-pointers',
    name: 'Two Pointers',
    icon: '👆👆',
    oneLiner: 'Use two indices moving toward each other on sorted data',
    whenToUse: [
      'Array is sorted or you can sort it first',
      'Need to find pairs that meet a condition',
      'Want O(1) space complexity',
      'Looking for elements from both ends',
    ],
    commonTraps: [
      'Forgetting the array must be sorted',
      'Off-by-one errors with pointer movement',
      'Not handling duplicates properly',
    ],
    example: 'Finding two numbers in a sorted array that sum to a target — start pointers at both ends, move inward based on sum comparison.',
    timeComplexity: 'O(n)',
    spaceComplexity: 'O(1)',
    keyInsight: 'By starting at opposite ends of a sorted array, each comparison eliminates half the remaining possibilities.',
  },
  'hash-map': {
    id: 'hash-map',
    name: 'Hash Map',
    icon: '🗺️',
    oneLiner: 'Trade space for time by storing seen values',
    whenToUse: [
      'Need O(1) lookup for previously seen elements',
      'Counting occurrences or frequencies',
      'Finding complements or pairs',
      'Array is NOT sorted',
    ],
    commonTraps: [
      'Hash collisions (rare but possible)',
      'Extra O(n) space usage',
      'Forgetting to handle duplicates',
    ],
    example: 'Two Sum on unsorted array — store each number\'s index in a hash map, check if complement exists.',
    timeComplexity: 'O(n)',
    spaceComplexity: 'O(n)',
    keyInsight: 'Hash maps give O(1) average lookup, turning O(n²) brute force into O(n) single pass.',
  },
  'sliding-window': {
    id: 'sliding-window',
    name: 'Sliding Window',
    icon: '🪟',
    oneLiner: 'Maintain a window that slides through the array',
    whenToUse: [
      'Finding subarrays with specific properties',
      'Maximum/minimum of contiguous elements',
      'Problems involving "k consecutive elements"',
      'Substring problems with constraints',
    ],
    commonTraps: [
      'Not properly shrinking the window',
      'Off-by-one when calculating window size',
      'Forgetting to update state when window changes',
    ],
    example: 'Maximum sum of k consecutive elements — slide a window of size k, updating sum as you go.',
    timeComplexity: 'O(n)',
    spaceComplexity: 'O(1)',
    keyInsight: 'Instead of recalculating for each position, incrementally update as the window slides.',
  },
  'binary-search': {
    id: 'binary-search',
    name: 'Binary Search',
    icon: '🔍',
    oneLiner: 'Repeatedly divide search space in half',
    whenToUse: [
      'Sorted array or search space',
      'Finding specific value or boundary',
      'Minimizing/maximizing with monotonic property',
      'Need O(log n) time',
    ],
    commonTraps: [
      'Integer overflow with mid calculation',
      'Infinite loops from wrong boundary updates',
      'Off-by-one with left/right boundaries',
    ],
    example: 'Find insertion position in sorted array — binary search until left meets right.',
    timeComplexity: 'O(log n)',
    spaceComplexity: 'O(1)',
    keyInsight: 'Each comparison eliminates half the remaining elements — powerful for large inputs.',
  },
  'dfs': {
    id: 'dfs',
    name: 'DFS / Backtracking',
    icon: '🌲',
    oneLiner: 'Explore deeply before backtracking',
    whenToUse: [
      'Tree/graph traversal',
      'Finding all paths or combinations',
      'Problems requiring exhaustive search',
      'Maze or connectivity problems',
    ],
    commonTraps: [
      'Forgetting to mark visited nodes',
      'Stack overflow on deep recursion',
      'Not backtracking state properly',
    ],
    example: 'Find all paths in a maze — recursively explore each direction, backtrack when stuck.',
    timeComplexity: 'O(V + E) for graphs',
    spaceComplexity: 'O(V) for recursion stack',
    keyInsight: 'Go as deep as possible first, then backtrack — natural for recursive problems.',
  },
  'dp': {
    id: 'dp',
    name: 'Dynamic Programming',
    icon: '📊',
    oneLiner: 'Break into subproblems, store results',
    whenToUse: [
      'Optimal substructure (solution from subsolutions)',
      'Overlapping subproblems',
      'Counting ways or combinations',
      'Optimization (min/max) problems',
    ],
    commonTraps: [
      'Wrong recurrence relation',
      'Incorrect base cases',
      'Not identifying state variables correctly',
    ],
    example: 'Fibonacci — store F(n-1) and F(n-2) to avoid recomputation.',
    timeComplexity: 'Varies (often O(n) or O(n²))',
    spaceComplexity: 'Varies (O(n) typical)',
    keyInsight: 'If you can define the answer in terms of smaller answers, DP probably applies.',
  },
  'greedy': {
    id: 'greedy',
    name: 'Greedy',
    icon: '🎯',
    oneLiner: 'Make locally optimal choice at each step',
    whenToUse: [
      'Local optimum leads to global optimum',
      'Interval scheduling problems',
      'Huffman coding, minimum spanning tree',
      'Problems with greedy choice property',
    ],
    commonTraps: [
      'Greedy doesn\'t always give optimal solution',
      'Need to prove greedy works for the problem',
      'Missing edge cases',
    ],
    example: 'Activity selection — always pick the activity that ends earliest.',
    timeComplexity: 'Usually O(n log n) with sorting',
    spaceComplexity: 'O(1) to O(n)',
    keyInsight: 'If making the best local choice never hurts globally, greedy works.',
  },
};

// Wizard questions with signal mapping
export const WIZARD_QUESTIONS = [
  {
    id: 'goal',
    prompt: 'What does the problem ask you to do?',
    coachingIntro: "Let's start by understanding the goal...",
    options: [
      {
        id: 'find-pair',
        label: 'Find specific elements or pairs',
        description: 'Like finding two numbers that sum to a target',
        signals: ['two-pointers', 'hash-map', 'binary-search'],
      },
      {
        id: 'optimize',
        label: 'Find optimal value (min/max)',
        description: 'Like maximum profit or minimum cost',
        signals: ['sliding-window', 'dp', 'greedy'],
      },
      {
        id: 'count',
        label: 'Count possibilities or ways',
        description: 'Like number of paths or combinations',
        signals: ['dp', 'dfs'],
      },
      {
        id: 'explore',
        label: 'Explore all options or paths',
        description: 'Like finding all valid arrangements',
        signals: ['dfs', 'backtracking'],
      },
    ],
  },
  {
    id: 'data',
    prompt: 'What\'s special about the input data?',
    coachingIntro: "Now let's look at the input signals...",
    options: [
      {
        id: 'sorted',
        label: 'Array is sorted (or can be sorted)',
        description: 'Order matters and is maintained',
        signals: ['two-pointers', 'binary-search'],
      },
      {
        id: 'unsorted',
        label: 'Array is unsorted, order doesn\'t help',
        description: 'Elements could be in any order',
        signals: ['hash-map', 'sliding-window'],
      },
      {
        id: 'sequence',
        label: 'Need to process contiguous elements',
        description: 'Subarrays or substrings matter',
        signals: ['sliding-window', 'two-pointers'],
      },
      {
        id: 'subproblems',
        label: 'Smaller problems help solve bigger ones',
        description: 'Answer builds on sub-answers',
        signals: ['dp', 'dfs'],
      },
    ],
  },
  {
    id: 'constraints',
    prompt: 'What constraints matter most?',
    coachingIntro: "Finally, let's consider efficiency...",
    options: [
      {
        id: 'space',
        label: 'Must use O(1) extra space',
        description: 'Can\'t use additional data structures',
        signals: ['two-pointers', 'sliding-window', 'binary-search'],
      },
      {
        id: 'time',
        label: 'Must be faster than O(n²)',
        description: 'Need O(n) or O(n log n)',
        signals: ['two-pointers', 'hash-map', 'sliding-window', 'binary-search'],
      },
      {
        id: 'all-solutions',
        label: 'Need to find ALL valid solutions',
        description: 'Not just one answer',
        signals: ['dfs', 'backtracking'],
      },
      {
        id: 'one-optimal',
        label: 'Need ONE optimal solution',
        description: 'Best answer, not all answers',
        signals: ['greedy', 'dp', 'two-pointers'],
      },
    ],
  },
];

// Problem-specific hints
export const PROBLEM_HINTS = {
  'two-sum': [
    'The array is sorted — can you use that property?',
    'What if you started from both ends?',
    'If the sum is too large, which pointer should move?',
  ],
};

/**
 * Compute strategy shortlist based on wizard answers
 */
export function computeShortlist(answers, questions = WIZARD_QUESTIONS, maxResults = 3) {
  const scores = new Map();

  // Score each strategy based on answer signals
  questions.forEach(question => {
    const answerId = answers[question.id];
    if (!answerId) return;

    const option = question.options.find(o => o.id === answerId);
    if (!option) return;

    option.signals.forEach(strategyId => {
      scores.set(strategyId, (scores.get(strategyId) || 0) + 1);
    });
  });

  // Sort by score and return top strategies
  const sorted = [...scores.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, maxResults)
    .map(([id]) => STRATEGIES[id])
    .filter(Boolean);

  // Always return at least 2 strategies
  if (sorted.length < 2) {
    const remaining = Object.values(STRATEGIES)
      .filter(s => !sorted.find(x => x.id === s.id))
      .slice(0, 2 - sorted.length);
    sorted.push(...remaining);
  }

  return sorted;
}

/**
 * Generate reasoning text based on answers
 */
export function generateReasoning(answers, questions = WIZARD_QUESTIONS) {
  const parts = [];

  if (answers.goal === 'find-pair') {
    parts.push("You're looking for specific elements");
  } else if (answers.goal === 'optimize') {
    parts.push("You need to find an optimal value");
  }

  if (answers.data === 'sorted') {
    parts.push("the input is sorted");
  } else if (answers.data === 'sequence') {
    parts.push("you need contiguous elements");
  }

  if (answers.constraints === 'space') {
    parts.push("with O(1) space constraint");
  } else if (answers.constraints === 'time') {
    parts.push("and need better than O(n²) time");
  }

  if (parts.length === 0) {
    return "Based on your analysis, these strategies are good candidates.";
  }

  return `Since ${parts.join(", ")}, these strategies fit well:`;
}
