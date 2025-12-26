/**
 * Type definitions for StepZero Socratic Wizard
 * Using JSDoc for type hints in JavaScript
 */

/**
 * @typedef {Object} WizardOption
 * @property {string} id - Unique option identifier
 * @property {string} label - Display label
 * @property {string} [description] - Optional description
 * @property {string[]} signals - Strategy IDs this option points to
 */

/**
 * @typedef {Object} WizardQuestion
 * @property {string} id - Unique question identifier
 * @property {string} prompt - The question text
 * @property {string} coachingIntro - Friendly intro text
 * @property {WizardOption[]} options - Available options
 */

/**
 * @typedef {Object} Strategy
 * @property {string} id - Unique strategy identifier
 * @property {string} name - Display name
 * @property {string} icon - Emoji or icon identifier
 * @property {string} oneLiner - Brief description
 * @property {string[]} whenToUse - List of use cases
 * @property {string[]} commonTraps - Common mistakes
 * @property {string} example - Quick example
 * @property {string} timeComplexity - Big O time
 * @property {string} spaceComplexity - Big O space
 * @property {string} keyInsight - Key takeaway
 */

/**
 * @typedef {'low' | 'medium' | 'high'} ConfidenceLevel
 */

/**
 * @typedef {'questions' | 'shortlist' | 'explanation' | 'feedback'} WizardPhase
 */

/**
 * @typedef {Object} StepZeroResult
 * @property {string} strategyId - Selected strategy
 * @property {string} explanation - User's explanation
 * @property {ConfidenceLevel} confidence - Confidence level
 * @property {number} hintsUsed - Number of hints revealed
 */

export const WIZARD_PHASES = {
  QUESTIONS: 'questions',
  SHORTLIST: 'shortlist',
  EXPLANATION: 'explanation',
  FEEDBACK: 'feedback',
};

export const CONFIDENCE_LEVELS = {
  low: { label: 'Still learning', emoji: '🤔', color: 'amber' },
  medium: { label: 'Fairly sure', emoji: '💭', color: 'blue' },
  high: { label: 'Confident', emoji: '💪', color: 'green' },
};

export const COACHING_FEEDBACK = {
  optimal: {
    title: "Strong choice!",
    tone: 'encouraging',
    color: 'emerald',
  },
  suboptimal: {
    title: "This can work, but...",
    tone: 'coaching',
    color: 'amber',
  },
  mismatch: {
    title: "Let's think about this differently",
    tone: 'redirecting',
    color: 'blue',
  },
};
