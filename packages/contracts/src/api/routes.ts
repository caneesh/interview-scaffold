/**
 * API route definitions.
 */

export const API_ROUTES = {
  // Sessions
  SESSIONS: '/api/sessions',
  SESSION_BY_ID: '/api/sessions/:sessionId',
  SESSION_DAILY: '/api/sessions/daily',
  SESSION_PROGRESS: '/api/sessions/:sessionId/progress',
  SESSION_COMPLETE: '/api/sessions/:sessionId/complete',

  // Problems
  PROBLEMS: '/api/problems',
  PROBLEM_BY_ID: '/api/problems/:problemId',
  PROBLEM_BY_PATTERN: '/api/problems/pattern/:patternId',

  // Drills
  DRILLS: '/api/drills',
  DRILL_BY_ID: '/api/drills/:drillId',
  DRILL_NEXT: '/api/drills/next',
  DRILL_SUBMIT: '/api/drills/:drillId/submit',

  // Attempts
  ATTEMPTS: '/api/attempts',
  ATTEMPT_BY_ID: '/api/attempts/:attemptId',
  ATTEMPT_STEP: '/api/attempts/:attemptId/steps/:stepId',
  ATTEMPT_COMPLETE: '/api/attempts/:attemptId/complete',

  // Progress
  PROGRESS_USER: '/api/progress',
  PROGRESS_PROBLEM: '/api/progress/problems/:problemId',
  PROGRESS_PATTERN: '/api/progress/patterns/:patternId',
  PROGRESS_DASHBOARD: '/api/progress/dashboard',

  // Patterns
  PATTERNS: '/api/patterns',
  PATTERN_BY_ID: '/api/patterns/:patternId',

  // Lessons
  LESSONS: '/api/lessons',
  LESSON_BY_ID: '/api/lessons/:lessonId',

  // Auth (handled by adapter)
  AUTH_SIGNIN: '/api/auth/signin',
  AUTH_SIGNUP: '/api/auth/signup',
  AUTH_SIGNOUT: '/api/auth/signout',
  AUTH_SESSION: '/api/auth/session',
} as const;

export type ApiRoute = typeof API_ROUTES[keyof typeof API_ROUTES];
