/**
 * API error definitions.
 */

export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

export const API_ERROR_CODES = {
  // General
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  NOT_FOUND: 'NOT_FOUND',
  BAD_REQUEST: 'BAD_REQUEST',
  VALIDATION_ERROR: 'VALIDATION_ERROR',

  // Auth
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  SESSION_EXPIRED: 'SESSION_EXPIRED',

  // Session
  SESSION_NOT_FOUND: 'SESSION_NOT_FOUND',
  SESSION_ALREADY_ACTIVE: 'SESSION_ALREADY_ACTIVE',
  SESSION_COMPLETED: 'SESSION_COMPLETED',

  // Problem
  PROBLEM_NOT_FOUND: 'PROBLEM_NOT_FOUND',
  PROBLEM_NOT_PUBLISHED: 'PROBLEM_NOT_PUBLISHED',

  // Drill
  DRILL_NOT_FOUND: 'DRILL_NOT_FOUND',
  NO_DRILLS_AVAILABLE: 'NO_DRILLS_AVAILABLE',

  // Attempt
  ATTEMPT_NOT_FOUND: 'ATTEMPT_NOT_FOUND',
  ATTEMPT_ALREADY_COMPLETED: 'ATTEMPT_ALREADY_COMPLETED',
  STEP_NOT_FOUND: 'STEP_NOT_FOUND',

  // Progress
  PROGRESS_NOT_FOUND: 'PROGRESS_NOT_FOUND',

  // Rate limiting
  RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',
} as const;

export type ApiErrorCode = typeof API_ERROR_CODES[keyof typeof API_ERROR_CODES];

export function createApiError(
  code: ApiErrorCode,
  message: string,
  details?: Record<string, unknown>
): ApiError {
  return { code, message, details };
}

export const API_ERRORS = {
  notFound: (resource: string) =>
    createApiError(API_ERROR_CODES.NOT_FOUND, `${resource} not found`),

  unauthorized: () =>
    createApiError(API_ERROR_CODES.UNAUTHORIZED, 'Authentication required'),

  forbidden: () =>
    createApiError(API_ERROR_CODES.FORBIDDEN, 'Access denied'),

  badRequest: (message: string) =>
    createApiError(API_ERROR_CODES.BAD_REQUEST, message),

  validationError: (details: Record<string, string>) =>
    createApiError(API_ERROR_CODES.VALIDATION_ERROR, 'Validation failed', details),

  internalError: () =>
    createApiError(API_ERROR_CODES.INTERNAL_ERROR, 'Internal server error'),
} as const;
