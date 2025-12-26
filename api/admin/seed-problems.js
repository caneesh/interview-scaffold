/**
 * Vercel Serverless Function - Seed Problems API
 *
 * Admin endpoint to seed initial problems into the database.
 * Protected by ADMIN_SECRET environment variable.
 *
 * Endpoints:
 *   POST /api/admin/seed-problems - Seed problems from sample data
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
const adminSecret = process.env.ADMIN_SECRET;

let supabase = null;

function getSupabase() {
  if (!supabase && supabaseUrl && supabaseKey) {
    supabase = createClient(supabaseUrl, supabaseKey);
  }
  return supabase;
}

// Sample problem data (simplified version of sampleProblem.js)
// In production, you'd import this from your data files
const sampleProblems = [
  {
    id: 'two-sum',
    title: 'Two Sum',
    difficulty: 'Easy',
    description: 'Given an array of integers nums and an integer target, return indices of the two numbers such that they add up to target. You may assume that each input would have exactly one solution, and you may not use the same element twice.',
    pattern: 'two-pointers',
    sub_pattern: 'opposite-ends',
    estimated_time_minutes: 15,
    supported_languages: ['python', 'javascript', 'java'],
    default_language: 'python',
    concepts: ['Two Pointers', 'Sorted Arrays', 'Linear Search'],
    key_takeaways: [
      'Two pointers moving inward is ideal for sorted array problems',
      'Always consider the time-space tradeoff',
      'Pattern recognition is key to interview success'
    ],
    pattern_selection: {
      prompt: 'Which algorithmic strategy would be most efficient for this problem?',
      instruction: 'Think about the constraints and what approach would give you the best time complexity.',
      options: [
        {
          id: 'brute-force',
          label: 'Brute Force',
          icon: '🔨',
          description: 'Check all pairs using nested loops'
        },
        {
          id: 'hash-map',
          label: 'Hash Map',
          icon: '🗺️',
          description: 'Store complements in a hash map'
        },
        {
          id: 'two-pointers',
          label: 'Two Pointers',
          icon: '👆👆',
          description: 'Use two pointers moving inward on sorted array'
        },
        {
          id: 'binary-search',
          label: 'Binary Search',
          icon: '🔍',
          description: 'For each element, binary search for complement'
        }
      ],
      correctAnswer: 'two-pointers',
      feedback: {
        correct: {
          title: 'Excellent!',
          explanation: 'Two pointers is the optimal approach for this problem when the array is sorted.',
          insight: 'This pattern works because sorting preserves the relative order needed to find pairs.'
        },
        incorrect: {
          'brute-force': {
            title: 'Not optimal',
            explanation: 'Brute force would work but has O(n²) time complexity.',
            hint: 'Think about how you can use the sorted property of the array.'
          },
          'hash-map': {
            title: 'Good thinking!',
            explanation: 'Hash map works for unsorted arrays, but two pointers is more efficient for sorted arrays.',
            hint: 'Since the array is sorted, you can use that property.'
          },
          'binary-search': {
            title: 'Close!',
            explanation: 'Binary search would give O(n log n), but two pointers gives O(n).',
            hint: 'You can do better by moving both pointers together.'
          }
        }
      }
    },
    interview_question: {
      prompt: 'You\'re in an interview. The interviewer asks: "How would you approach this problem?"',
      hint: 'Think about what approach you would explain first.',
      options: [
        {
          id: 'start-coding',
          label: 'Start coding immediately',
          description: 'Jump right into the implementation',
          icon: '💻',
          isCorrect: false,
          feedback: {
            title: 'Slow down!',
            explanation: 'Interviewers want to see your thought process before you code.',
            whyNot: 'Jumping to code without explaining your approach is a red flag.'
          }
        },
        {
          id: 'ask-questions',
          label: 'Ask clarifying questions',
          description: 'Clarify constraints and edge cases',
          icon: '❓',
          isCorrect: false,
          isPartiallyCorrect: true,
          feedback: {
            title: 'Good start!',
            explanation: 'Asking questions is important, but you should also explain your approach.',
            partialCredit: 'This shows good communication skills.'
          }
        },
        {
          id: 'explain-approach',
          label: 'Explain your approach first',
          description: 'Walk through your thinking before coding',
          icon: '🎯',
          isCorrect: true,
          feedback: {
            title: 'Perfect!',
            explanation: 'Explaining your approach shows clear thinking and communication skills.',
            whyYes: 'This is exactly what interviewers want to see.',
            interviewTip: 'Always verbalize your thought process.'
          }
        }
      ],
      correctAnswer: 'explain-approach',
      interviewContext: {
        whatInterviewerWants: 'To understand your problem-solving process',
        commonMistakes: ['Coding without explaining', 'Not considering edge cases'],
        followUpQuestions: ['What\'s the time complexity?', 'Can you optimize this?']
      }
    },
    strategy_step: {
      title: 'Reasoning Out Loud',
      instruction: 'Explain your strategy for solving this problem. Think about the algorithm step by step.',
      placeholder: 'I will use two pointers starting from opposite ends of the sorted array...',
      requiredConcepts: [
        { id: 'pointers', keywords: ['pointer', 'pointers', 'left', 'right', 'index', 'indices'], description: 'Mention using pointers', weight: 2 },
        { id: 'movement', keywords: ['move', 'increment', 'decrement', 'advance', 'shift'], description: 'Describe pointer movement', weight: 2 },
        { id: 'comparison', keywords: ['compare', 'sum', 'add', 'target', 'check', 'equal'], description: 'Explain comparison logic', weight: 2 },
        { id: 'termination', keywords: ['until', 'while', 'stop', 'meet', 'cross', 'end'], description: 'Describe when to stop', weight: 1 }
      ],
      minScore: 5,
      hints: [
        'Start by mentioning where your pointers will be positioned',
        'Explain how you decide which pointer to move',
        'Describe the condition that ends the loop',
        'Think about what happens when you find the target'
      ],
      feedback: {
        excellent: { title: 'Excellent explanation!', message: 'You covered all the key concepts clearly.' },
        good: { title: 'Good explanation!', message: 'You covered the main ideas.' },
        needsWork: { title: 'Keep going!', message: 'Try to include more details about your approach.' }
      }
    },
    steps: [
      {
        stepId: 1,
        instruction: 'Initialize two pointers: left at the start, right at the end of the array.',
        placeholderCode: {
          python: '# Initialize your pointers here\nleft = \nright = ',
          javascript: '// Initialize your pointers here\nlet left = \nlet right = ',
          java: '// Initialize your pointers here\nint left = \nint right = '
        },
        validationType: 'regex',
        validationRule: {
          python: 'left\\s*=\\s*0.*right\\s*=\\s*(len|n\\s*-\\s*1)',
          javascript: 'let\\s+left\\s*=\\s*0.*let\\s+right\\s*=',
          java: 'int\\s+left\\s*=\\s*0.*int\\s+right\\s*='
        },
        hints: [
          'The left pointer should start at index 0',
          'The right pointer should start at the last index (length - 1)',
          'In Python, you can use len(nums) - 1 for the right pointer'
        ]
      },
      {
        stepId: 2,
        instruction: 'Create a while loop that continues while left is less than right.',
        placeholderCode: {
          python: 'left = 0\nright = len(nums) - 1\n\n# Add your loop here\n',
          javascript: 'let left = 0;\nlet right = nums.length - 1;\n\n// Add your loop here\n',
          java: 'int left = 0;\nint right = nums.length - 1;\n\n// Add your loop here\n'
        },
        validationType: 'regex',
        validationRule: {
          python: 'while\\s+left\\s*<\\s*right',
          javascript: 'while\\s*\\(\\s*left\\s*<\\s*right\\s*\\)',
          java: 'while\\s*\\(\\s*left\\s*<\\s*right\\s*\\)'
        },
        hints: [
          'Use a while loop with a comparison between left and right',
          'The loop should continue while left < right',
          'When left >= right, the pointers have crossed and we should stop'
        ]
      },
      {
        stepId: 3,
        instruction: 'Calculate the sum of elements at both pointers and compare with target.',
        placeholderCode: {
          python: 'left = 0\nright = len(nums) - 1\n\nwhile left < right:\n    # Calculate sum and compare\n    ',
          javascript: 'let left = 0;\nlet right = nums.length - 1;\n\nwhile (left < right) {\n    // Calculate sum and compare\n    \n}',
          java: 'int left = 0;\nint right = nums.length - 1;\n\nwhile (left < right) {\n    // Calculate sum and compare\n    \n}'
        },
        validationType: 'regex',
        validationRule: {
          python: 'sum\\s*=\\s*nums\\[left\\]\\s*\\+\\s*nums\\[right\\]|nums\\[left\\]\\s*\\+\\s*nums\\[right\\]\\s*==\\s*target',
          javascript: '(const|let|var)?\\s*(sum|total)?\\s*=?\\s*nums\\[left\\]\\s*\\+\\s*nums\\[right\\]',
          java: '(int\\s+)?(sum|total)?\\s*=?\\s*nums\\[left\\]\\s*\\+\\s*nums\\[right\\]'
        },
        hints: [
          'Add the elements at nums[left] and nums[right]',
          'You can store this in a variable called sum',
          'Compare this sum with the target value'
        ]
      },
      {
        stepId: 4,
        instruction: 'If sum equals target, return the indices. If sum is less than target, move left pointer. If sum is greater, move right pointer.',
        placeholderCode: {
          python: 'left = 0\nright = len(nums) - 1\n\nwhile left < right:\n    current_sum = nums[left] + nums[right]\n    # Add your comparison logic here\n    ',
          javascript: 'let left = 0;\nlet right = nums.length - 1;\n\nwhile (left < right) {\n    const sum = nums[left] + nums[right];\n    // Add your comparison logic here\n    \n}',
          java: 'int left = 0;\nint right = nums.length - 1;\n\nwhile (left < right) {\n    int sum = nums[left] + nums[right];\n    // Add your comparison logic here\n    \n}'
        },
        validationType: 'regex',
        validationRule: {
          python: '(if|elif).*==.*target.*return.*\\[left.*right\\]|(left\\s*\\+\\+|left\\s*\\+=\\s*1|left\\s*=\\s*left\\s*\\+\\s*1).*(right\\s*--|right\\s*-=\\s*1|right\\s*=\\s*right\\s*-\\s*1)',
          javascript: 'if.*===?.*target.*return.*\\[left.*right\\]|(left\\+\\+|left\\s*\\+=\\s*1).*(right--|right\\s*-=\\s*1)',
          java: 'if.*==.*target.*return.*(left.*right|new int)|(left\\+\\+|left\\s*\\+=\\s*1).*(right--|right\\s*-=\\s*1)'
        },
        hints: [
          'Use if/elif/else (or if/else if/else) to handle three cases',
          'If sum == target: return [left, right]',
          'If sum < target: increment left to get a larger sum',
          'If sum > target: decrement right to get a smaller sum'
        ]
      },
      {
        stepId: 5,
        instruction: 'Handle the case where no solution is found by returning an empty array or appropriate value.',
        placeholderCode: {
          python: 'def two_sum(nums, target):\n    left = 0\n    right = len(nums) - 1\n    \n    while left < right:\n        current_sum = nums[left] + nums[right]\n        if current_sum == target:\n            return [left, right]\n        elif current_sum < target:\n            left += 1\n        else:\n            right -= 1\n    \n    # What to return if no solution found?\n    ',
          javascript: 'function twoSum(nums, target) {\n    let left = 0;\n    let right = nums.length - 1;\n    \n    while (left < right) {\n        const sum = nums[left] + nums[right];\n        if (sum === target) {\n            return [left, right];\n        } else if (sum < target) {\n            left++;\n        } else {\n            right--;\n        }\n    }\n    \n    // What to return if no solution found?\n    \n}',
          java: 'public int[] twoSum(int[] nums, int target) {\n    int left = 0;\n    int right = nums.length - 1;\n    \n    while (left < right) {\n        int sum = nums[left] + nums[right];\n        if (sum == target) {\n            return new int[]{left, right};\n        } else if (sum < target) {\n            left++;\n        } else {\n            right--;\n        }\n    }\n    \n    // What to return if no solution found?\n    \n}'
        },
        validationType: 'regex',
        validationRule: {
          python: 'return\\s*\\[\\s*\\]|return\\s*None|return\\s*\\[-1.*-1\\]',
          javascript: 'return\\s*\\[\\s*\\]|return\\s*null|return\\s*\\[-1.*-1\\]',
          java: 'return\\s*(new\\s+int\\[\\s*\\]\\{\\s*\\}|new\\s+int\\[0\\]|null|new\\s+int\\[\\]\\{-1.*-1\\})'
        },
        hints: [
          'After the loop ends without finding a solution, we need to return something',
          'Common options: empty array [], null/None, or [-1, -1]',
          'The problem states there\'s always a solution, but it\'s good practice to handle this'
        ]
      }
    ],
    is_published: true
  }
];

export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Check admin authorization
  const authHeader = req.headers.authorization;
  if (!adminSecret || authHeader !== `Bearer ${adminSecret}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const db = getSupabase();

  if (!db) {
    return res.status(500).json({ error: 'Database not configured' });
  }

  try {
    const results = [];

    for (const problem of sampleProblems) {
      const { error } = await db
        .from('problems')
        .upsert(problem, { onConflict: 'id' });

      if (error) {
        results.push({ id: problem.id, success: false, error: error.message });
      } else {
        results.push({ id: problem.id, success: true });
      }
    }

    const successCount = results.filter(r => r.success).length;
    const failCount = results.filter(r => !r.success).length;

    return res.status(200).json({
      success: failCount === 0,
      message: `Seeded ${successCount} problems, ${failCount} failed`,
      results
    });

  } catch (error) {
    console.error('Seed error:', error);
    return res.status(500).json({ error: 'Failed to seed problems' });
  }
}
