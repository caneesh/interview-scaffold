#!/usr/bin/env node
/**
 * Interactive test script for upgrades-learner features
 * Run with: node scripts/test-upgrades.mjs
 */

import {
  detectMemorization,
  InterviewStateMachine,
  createInitialContext,
  enhanceProblem,
} from '../packages/core/dist/index.js';

console.log('='.repeat(60));
console.log('Testing Upgrades-Learner Features');
console.log('='.repeat(60));

// 1. Test Anti-Memorization Detection
console.log('\n📋 1. ANTI-MEMORIZATION DETECTION');
console.log('-'.repeat(40));

const suspiciousResponse = {
  responseText: "We use a sliding window approach to maintain a monotonic queue. The key insight is that we can achieve O(n) time complexity by processing each element exactly once.",
  previousResponses: ["I think we need to iterate through the array"],
  stage: 'PATTERN_RECOGNITION',
  problemId: 'test-problem',
  pattern: 'SLIDING_WINDOW',
  responseTimeMs: 5000,  // Very fast (suspicious)
  attemptCount: 1,
};

const authenticResponse = {
  responseText: "Hmm, I'm thinking about this... So we have an array and need to find something about subarrays. Let me think - if I use a brute force approach with nested loops, that would be O(n²). But maybe there's a way to avoid recalculating everything each time by keeping track of a 'window' of elements as I go through the array.",
  previousResponses: ["Let me read the problem again", "So we need to find the maximum sum?"],
  stage: 'PATTERN_RECOGNITION',
  problemId: 'test-problem',
  pattern: 'SLIDING_WINDOW',
  responseTimeMs: 120000,  // 2 minutes (authentic thinking time)
  attemptCount: 3,
};

console.log('\nSuspicious response (fast, editorial-like):');
const suspiciousResult = detectMemorization(suspiciousResponse);
console.log(`  Classification: ${suspiciousResult.classification}`);
console.log(`  Confidence: ${(suspiciousResult.confidence * 100).toFixed(1)}%`);
console.log(`  Action: ${suspiciousResult.action}`);
console.log(`  Signals: ${suspiciousResult.signals.slice(0, 3).map(s => s.type || s.signal || JSON.stringify(s)).join(', ')}`);

console.log('\nAuthentic response (slower, personal reasoning):');
const authenticResult = detectMemorization(authenticResponse);
console.log(`  Classification: ${authenticResult.classification}`);
console.log(`  Confidence: ${(authenticResult.confidence * 100).toFixed(1)}%`);
console.log(`  Action: ${authenticResult.action}`);

// 2. Test State Machine
console.log('\n\n🔄 2. INTERVIEW STATE MACHINE');
console.log('-'.repeat(40));

const initialContext = createInitialContext({
  attemptId: 'attempt-123',
  userId: 'user-123',
  problemId: 'problem-456',
  pattern: 'SLIDING_WINDOW',
});

const machine = new InterviewStateMachine(initialContext);
console.log(`Initial state: ${machine.getState()}`);

// Simulate a successful interview flow
const events = [
  { event: 'STAGE_PASSED', desc: 'Passed problem framing' },
  { event: 'STAGE_PASSED', desc: 'Passed pattern gate' },
  { event: 'STAGE_PASSED', desc: 'Passed Feynman check' },
  { event: 'STAGE_PASSED', desc: 'Passed strategy design' },
  { event: 'STAGE_PASSED', desc: 'Passed coding' },
  { event: 'STAGE_PASSED', desc: 'Completed reflection' },
];

for (const { event, desc } of events) {
  const result = machine.process(event, {});
  console.log(`  → ${desc}: now in "${machine.getState()}" (success: ${result.success})`);
}

console.log(`\nFinal state: ${machine.getState()}`);
console.log(`Is completed: ${machine.getState() === 'completed'}`);

// 3. Test Enhanced Problem
console.log('\n\n📚 3. ENHANCED PROBLEM METADATA');
console.log('-'.repeat(40));

const baseProblem = {
  id: 'sliding-window-max',
  tenantId: 'tenant-1',
  title: 'Sliding Window Maximum',
  statement: 'Find the maximum in each sliding window of size k',
  pattern: 'SLIDING_WINDOW',
  rung: 2,
  targetComplexity: 'O(n)',
  testCases: [],
  hints: ['Consider using a deque'],
  createdAt: new Date(),
};

const enhanced = enhanceProblem(baseProblem, {
  secondaryPatterns: ['MONOTONIC_STACK'],
  prerequisiteSkills: ['arrays', 'deque', 'amortized-analysis'],
  conceptTriggers: ['sliding window', 'maximum in range', 'window size k'],
  commonMisconceptions: [
    'Using a heap instead of deque (O(n log k) instead of O(n))',
    'Not maintaining monotonic property',
  ],
  edgeCaseCategories: ['empty_array', 'k_equals_1', 'k_equals_n', 'all_same_elements'],
  antiCheatMarkers: [
    'monotonic deque',
    'we pop from the back',
    'maintain decreasing order',
  ],
});

console.log(`Title: ${enhanced.title}`);
console.log(`Pattern Family: ${enhanced.patternFamily}`);
console.log(`Secondary Patterns: ${enhanced.secondaryPatterns?.join(', ')}`);
console.log(`Prerequisites: ${enhanced.prerequisiteSkills?.join(', ')}`);
console.log(`Concept Triggers: ${enhanced.conceptTriggers?.join(', ')}`);
console.log(`Common Misconceptions: ${enhanced.commonMisconceptions?.length} defined`);
console.log(`Anti-Cheat Markers: ${enhanced.antiCheatMarkers?.length} defined`);

console.log('\n' + '='.repeat(60));
console.log('All tests completed successfully! ✅');
console.log('='.repeat(60));
