/**
 * Submissions Repository Port
 *
 * Port interface for submission storage and retrieval.
 */

import type { AttemptId } from '../entities/attempt.js';
import type {
  Submission,
  SubmissionId,
  SubmissionType,
  SubmissionContent,
} from '../entities/submission.js';

/**
 * Submissions Repository Port
 */
export interface SubmissionsRepoPort {
  /**
   * Create a new submission
   */
  createSubmission(params: {
    id: SubmissionId;
    attemptId: AttemptId;
    userId: string;
    type: SubmissionType;
    language?: string | null;
    contentText?: string | null;
    contentJson?: SubmissionContent;
    isFinal?: boolean;
  }): Promise<Submission>;

  /**
   * Get a submission by ID
   */
  getSubmission(id: SubmissionId): Promise<Submission | null>;

  /**
   * List submissions for an attempt
   */
  listSubmissionsForAttempt(
    attemptId: AttemptId,
    options?: {
      type?: SubmissionType;
      limit?: number;
      offset?: number;
    }
  ): Promise<readonly Submission[]>;

  /**
   * Get the latest submission for an attempt (optionally by type)
   */
  getLatestSubmission(
    attemptId: AttemptId,
    type?: SubmissionType
  ): Promise<Submission | null>;

  /**
   * Mark a submission as final
   */
  markSubmissionFinal(id: SubmissionId): Promise<Submission>;

  /**
   * Count submissions for an attempt
   */
  countSubmissionsForAttempt(
    attemptId: AttemptId,
    type?: SubmissionType
  ): Promise<number>;
}
