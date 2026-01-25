export * from './tenant.js';
export * from './pattern.js';
export * from './rung.js';
export * from './problem.js';
export * from './step.js';
export * from './attempt.js';
export * from './skill-state.js';
export * from './content-pack.js';
export * from './trace.js';
export * from './invariant-template.js';
export * from './bug-hunt.js';
export * from './debug-lab.js';
export * from './diagnostic-coach.js';
export * from './enhanced-problem.js';
export * from './debug-track.js';

// New unified content bank entities
export * from './track.js';
export * from './content-item.js';
export * from './submission.js';
export * from './evaluation-run.js';

// Export AI feedback and Socratic turn entities with explicit names to avoid conflicts
// with existing types in ports/socratic-coach.ts and ports/ai-artifacts-repo.ts
export {
  type AIFeedback as UnifiedAIFeedback,
  type AIFeedbackId,
  type AIFeedbackType as UnifiedAIFeedbackType,
  type AIFeedbackOutput,
  AI_FEEDBACK_TYPES,
  createAIFeedback,
} from './ai-feedback.js';

export {
  type SocraticTurn as UnifiedSocraticTurn,
  type SocraticTurnId,
  type SocraticRole,
  type SocraticQuestion as UnifiedSocraticQuestion,
  type SocraticValidation,
  SOCRATIC_ROLES,
  createSocraticTurn,
  getNextTurnIndex,
} from './socratic-turn.js';

// User progress entities (TrackE)
export * from './user-progress.js';
