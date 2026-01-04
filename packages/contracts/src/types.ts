import { z } from 'zod';
import * as schemas from './schemas.js';

// ============ Enum Types ============

export type PatternId = z.infer<typeof schemas.PatternIdSchema>;
export type RungLevel = z.infer<typeof schemas.RungLevelSchema>;
export type AttemptState = z.infer<typeof schemas.AttemptStateSchema>;
export type StepType = z.infer<typeof schemas.StepTypeSchema>;
export type StepResult = z.infer<typeof schemas.StepResultSchema>;
export type HintLevel = z.infer<typeof schemas.HintLevelSchema>;

// ============ Entity Types ============

export type TestCase = z.infer<typeof schemas.TestCaseSchema>;
export type Problem = z.infer<typeof schemas.ProblemSchema>;
export type TestResultData = z.infer<typeof schemas.TestResultDataSchema>;
export type AttemptScore = z.infer<typeof schemas.AttemptScoreSchema>;
export type Attempt = z.infer<typeof schemas.AttemptSchema>;
export type SkillState = z.infer<typeof schemas.SkillStateSchema>;

// ============ API Types ============

export type StartAttemptRequest = z.infer<typeof schemas.StartAttemptRequestSchema>;
export type StartAttemptResponse = z.infer<typeof schemas.StartAttemptResponseSchema>;

export type SubmitThinkingGateRequest = z.infer<typeof schemas.SubmitThinkingGateRequestSchema>;
export type SubmitThinkingGateResponse = z.infer<typeof schemas.SubmitThinkingGateResponseSchema>;

export type SubmitCodeRequest = z.infer<typeof schemas.SubmitCodeRequestSchema>;
export type SubmitCodeResponse = z.infer<typeof schemas.SubmitCodeResponseSchema>;

export type SubmitReflectionRequest = z.infer<typeof schemas.SubmitReflectionRequestSchema>;
export type SubmitReflectionResponse = z.infer<typeof schemas.SubmitReflectionResponseSchema>;

export type RequestHintRequest = z.infer<typeof schemas.RequestHintRequestSchema>;
export type RequestHintResponse = z.infer<typeof schemas.RequestHintResponseSchema>;

export type GetSkillMatrixResponse = z.infer<typeof schemas.GetSkillMatrixResponseSchema>;

export type GetNextProblemRequest = z.infer<typeof schemas.GetNextProblemRequestSchema>;
export type GetNextProblemResponse = z.infer<typeof schemas.GetNextProblemResponseSchema>;

export type ErrorResponse = z.infer<typeof schemas.ErrorResponseSchema>;
