/**
 * Recommendation Service
 *
 * Intelligently recommends the next problem based on:
 * - Current problem's pattern
 * - User's performance (hints used, time taken)
 * - Learning progression
 */

// Problem catalog with metadata for recommendations
export const problemCatalog = [
  // Two Pointers Problems
  {
    id: 'problem_101',
    title: 'Detect Cycle in Linked List',
    difficulty: 'Medium',
    pattern: 'two-pointers',
    subPattern: 'fast-slow',
    estimatedTime: 15,
    concepts: ['linked-list', 'cycle-detection', 'floyd-algorithm'],
  },
  {
    id: 'problem_102',
    title: 'Find the Middle of Linked List',
    difficulty: 'Easy',
    pattern: 'two-pointers',
    subPattern: 'fast-slow',
    estimatedTime: 10,
    concepts: ['linked-list', 'fast-slow-pointer'],
  },
  {
    id: 'problem_103',
    title: 'Remove Nth Node From End',
    difficulty: 'Medium',
    pattern: 'two-pointers',
    subPattern: 'fast-slow',
    estimatedTime: 20,
    concepts: ['linked-list', 'two-pass-optimization'],
  },
  {
    id: 'problem_104',
    title: 'Linked List Cycle II',
    difficulty: 'Hard',
    pattern: 'two-pointers',
    subPattern: 'fast-slow',
    estimatedTime: 25,
    concepts: ['linked-list', 'cycle-detection', 'math'],
  },
  {
    id: 'problem_105',
    title: 'Two Sum II - Sorted Array',
    difficulty: 'Medium',
    pattern: 'two-pointers',
    subPattern: 'opposite-direction',
    estimatedTime: 15,
    concepts: ['array', 'sorted-array', 'sum-problems'],
  },
  {
    id: 'problem_106',
    title: 'Container With Most Water',
    difficulty: 'Medium',
    pattern: 'two-pointers',
    subPattern: 'opposite-direction',
    estimatedTime: 20,
    concepts: ['array', 'greedy', 'optimization'],
  },

  // Sliding Window Problems
  {
    id: 'problem_201',
    title: 'Maximum Sum Subarray of Size K',
    difficulty: 'Easy',
    pattern: 'sliding-window',
    subPattern: 'fixed-window',
    estimatedTime: 12,
    concepts: ['array', 'sum', 'fixed-window'],
  },
  {
    id: 'problem_202',
    title: 'Longest Substring Without Repeating Characters',
    difficulty: 'Medium',
    pattern: 'sliding-window',
    subPattern: 'variable-window',
    estimatedTime: 20,
    concepts: ['string', 'hash-map', 'variable-window'],
  },
  {
    id: 'problem_203',
    title: 'Minimum Window Substring',
    difficulty: 'Hard',
    pattern: 'sliding-window',
    subPattern: 'variable-window',
    estimatedTime: 30,
    concepts: ['string', 'hash-map', 'optimization'],
  },

  // Binary Search Problems
  {
    id: 'problem_301',
    title: 'Binary Search',
    difficulty: 'Easy',
    pattern: 'binary-search',
    subPattern: 'classic',
    estimatedTime: 10,
    concepts: ['array', 'sorted-array', 'divide-conquer'],
  },
  {
    id: 'problem_302',
    title: 'Search in Rotated Sorted Array',
    difficulty: 'Medium',
    pattern: 'binary-search',
    subPattern: 'modified',
    estimatedTime: 20,
    concepts: ['array', 'rotated-array', 'edge-cases'],
  },

  // DFS/BFS Problems
  {
    id: 'problem_401',
    title: 'Number of Islands',
    difficulty: 'Medium',
    pattern: 'dfs-bfs',
    subPattern: 'grid-dfs',
    estimatedTime: 20,
    concepts: ['matrix', 'connected-components', 'recursion'],
  },
  {
    id: 'problem_402',
    title: 'Binary Tree Level Order Traversal',
    difficulty: 'Medium',
    pattern: 'dfs-bfs',
    subPattern: 'bfs',
    estimatedTime: 15,
    concepts: ['tree', 'queue', 'level-order'],
  },

  // Dynamic Programming Problems
  {
    id: 'problem_501',
    title: 'Climbing Stairs',
    difficulty: 'Easy',
    pattern: 'dynamic-programming',
    subPattern: '1d-dp',
    estimatedTime: 15,
    concepts: ['dp', 'fibonacci', 'memoization'],
  },
  {
    id: 'problem_502',
    title: 'House Robber',
    difficulty: 'Medium',
    pattern: 'dynamic-programming',
    subPattern: '1d-dp',
    estimatedTime: 20,
    concepts: ['dp', 'state-transition', 'optimization'],
  },
];

// Recommendation types with their metadata
export const recommendationTypes = {
  variation: {
    type: 'variation',
    emoji: '⚔️',
    label: 'Challenge Mode',
    color: 'purple',
    description: 'Same pattern, harder constraints',
  },
  newTopic: {
    type: 'newTopic',
    emoji: '🆕',
    label: 'New Concept',
    color: 'blue',
    description: 'Expand your skills with a new pattern',
  },
  reinforcement: {
    type: 'reinforcement',
    emoji: '↺',
    label: 'Reinforcement',
    color: 'green',
    description: "Let's solidify this concept",
  },
  easyWin: {
    type: 'easyWin',
    emoji: '🎯',
    label: 'Quick Win',
    color: 'teal',
    description: 'Build momentum with a quick solve',
  },
  stretch: {
    type: 'stretch',
    emoji: '🚀',
    label: 'Stretch Goal',
    color: 'orange',
    description: 'Ready for something challenging?',
  },
};

/**
 * Analyze user performance to determine recommendation strategy
 */
function analyzePerformance(completedProblem, hintsUsed, timeSpent) {
  const expectedTime = completedProblem.estimatedTime || 15;
  const maxHints = 5; // Assume 5 hints per problem

  const hintRatio = hintsUsed / maxHints;
  const timeRatio = timeSpent / expectedTime;

  // Performance score: 0-100
  // Lower hints and faster time = higher score
  const hintScore = Math.max(0, 100 - (hintRatio * 50));
  const timeScore = timeRatio <= 1 ? 100 : Math.max(0, 100 - ((timeRatio - 1) * 25));

  const overallScore = (hintScore * 0.6) + (timeScore * 0.4);

  return {
    score: overallScore,
    isStruggling: overallScore < 40,
    isExcelling: overallScore > 75,
    isAverage: overallScore >= 40 && overallScore <= 75,
  };
}

/**
 * Get problems in the same pattern family
 */
function getSamePatternProblems(currentProblem, catalog) {
  return catalog.filter(p =>
    p.pattern === currentProblem.pattern &&
    p.id !== currentProblem.id
  );
}

/**
 * Get problems in a new pattern
 */
function getNewPatternProblems(currentProblem, catalog) {
  return catalog.filter(p => p.pattern !== currentProblem.pattern);
}

/**
 * Calculate difficulty delta
 */
function getDifficultyValue(difficulty) {
  const map = { 'Easy': 1, 'Medium': 2, 'Hard': 3 };
  return map[difficulty] || 2;
}

/**
 * Recommend the next problem based on context
 *
 * @param {Object} options
 * @param {string} options.currentProblemId - ID of completed problem
 * @param {number} options.hintsUsed - Number of hints used
 * @param {number} options.timeSpentMinutes - Time spent in minutes
 * @param {string[]} options.completedProblemIds - Previously completed problems
 * @returns {Object} Recommendation with problem and reasoning
 */
export function recommendNextProblem({
  currentProblemId,
  hintsUsed = 0,
  timeSpentMinutes = 15,
  completedProblemIds = [],
}) {
  const currentProblem = problemCatalog.find(p => p.id === currentProblemId);

  if (!currentProblem) {
    // Fallback: recommend first available problem
    const available = problemCatalog.filter(p => !completedProblemIds.includes(p.id));
    return {
      problem: available[0] || problemCatalog[0],
      type: recommendationTypes.newTopic,
      reason: "Start your learning journey",
      confidence: 0.5,
    };
  }

  const performance = analyzePerformance(currentProblem, hintsUsed, timeSpentMinutes);
  const currentDifficulty = getDifficultyValue(currentProblem.difficulty);

  // Filter out completed problems
  const availableProblems = problemCatalog.filter(
    p => !completedProblemIds.includes(p.id) && p.id !== currentProblemId
  );

  const samePatternProblems = getSamePatternProblems(currentProblem, availableProblems);
  const newPatternProblems = getNewPatternProblems(currentProblem, availableProblems);

  let recommendation;

  if (performance.isStruggling) {
    // User struggled: recommend reinforcement (same pattern, same or easier difficulty)
    const reinforcementProblems = samePatternProblems.filter(
      p => getDifficultyValue(p.difficulty) <= currentDifficulty
    );

    if (reinforcementProblems.length > 0) {
      recommendation = {
        problem: reinforcementProblems[0],
        type: recommendationTypes.reinforcement,
        reason: `Practice makes perfect! This problem uses the same ${currentProblem.pattern.replace('-', ' ')} pattern.`,
        confidence: 0.85,
      };
    }
  } else if (performance.isExcelling) {
    // User excelled: recommend challenge (same pattern, harder) or stretch (new pattern)
    const harderProblems = samePatternProblems.filter(
      p => getDifficultyValue(p.difficulty) > currentDifficulty
    );

    if (harderProblems.length > 0 && Math.random() > 0.3) {
      recommendation = {
        problem: harderProblems[0],
        type: recommendationTypes.variation,
        reason: `You crushed it! Ready for a harder ${currentProblem.pattern.replace('-', ' ')} challenge?`,
        confidence: 0.9,
      };
    } else if (newPatternProblems.length > 0) {
      // Recommend a new pattern
      const easyNewPattern = newPatternProblems.filter(
        p => getDifficultyValue(p.difficulty) <= 2
      );
      recommendation = {
        problem: easyNewPattern[0] || newPatternProblems[0],
        type: recommendationTypes.newTopic,
        reason: `Great mastery! Time to learn a new pattern.`,
        confidence: 0.8,
      };
    }
  }

  // Default: balanced recommendation
  if (!recommendation) {
    // Try same pattern, same difficulty first
    const sameDifficultyProblems = samePatternProblems.filter(
      p => getDifficultyValue(p.difficulty) === currentDifficulty
    );

    if (sameDifficultyProblems.length > 0) {
      recommendation = {
        problem: sameDifficultyProblems[0],
        type: recommendationTypes.reinforcement,
        reason: `Keep the momentum! Another ${currentProblem.pattern.replace('-', ' ')} problem.`,
        confidence: 0.75,
      };
    } else if (samePatternProblems.length > 0) {
      recommendation = {
        problem: samePatternProblems[0],
        type: recommendationTypes.variation,
        reason: `Level up your ${currentProblem.pattern.replace('-', ' ')} skills!`,
        confidence: 0.7,
      };
    } else if (newPatternProblems.length > 0) {
      recommendation = {
        problem: newPatternProblems[0],
        type: recommendationTypes.newTopic,
        reason: "Explore a new algorithmic pattern!",
        confidence: 0.65,
      };
    }
  }

  // Ultimate fallback
  if (!recommendation) {
    recommendation = {
      problem: availableProblems[0] || problemCatalog[0],
      type: recommendationTypes.easyWin,
      reason: "Keep practicing to build your skills!",
      confidence: 0.5,
    };
  }

  return recommendation;
}

/**
 * Get a motivational message based on performance
 */
export function getMotivationalMessage(hintsUsed, totalSteps) {
  const hintRatio = hintsUsed / (totalSteps * 3); // Assume 3 hints per step

  if (hintsUsed === 0) {
    return {
      emoji: '🏆',
      title: 'Flawless Victory!',
      message: "You solved it without any hints. You're a natural!",
    };
  } else if (hintRatio < 0.3) {
    return {
      emoji: '🌟',
      title: 'Excellent Work!',
      message: "Minimal hints used. Your problem-solving skills are sharp!",
    };
  } else if (hintRatio < 0.6) {
    return {
      emoji: '💪',
      title: 'Great Job!',
      message: "You used hints wisely to guide your solution.",
    };
  } else {
    return {
      emoji: '📈',
      title: 'Keep Growing!',
      message: "Every problem you solve makes you stronger.",
    };
  }
}

export default recommendNextProblem;
