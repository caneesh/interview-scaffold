/**
 * Attempt V2 Components
 *
 * New 5-step attempt flow UI components.
 */

export { V2Stepper } from './V2Stepper';
export { UnderstandStep } from './UnderstandStep';
export { PlanStep } from './PlanStep';
export { ImplementStep } from './ImplementStep';
export { VerifyStep } from './VerifyStep';
export { ReflectStep } from './ReflectStep';
export { InvariantBuilderV2 } from './InvariantBuilderV2';
export { BeginnerModeToggle } from './BeginnerModeToggle';
export { V2Workbench } from './V2Workbench';

// Types
export type {
  V2Step,
  AttemptMode,
  AttemptV2,
  Problem,
  UnderstandPayload,
  PlanPayload,
  VerifyPayload,
  ReflectPayload,
  TestResultData,
  SuggestedPattern,
  AIAssessment,
  SubmitUnderstandRequest,
  SubmitUnderstandResponse,
  SubmitFollowupRequest,
  SuggestPatternsResponse,
  ChoosePatternRequest,
  ChoosePatternResponse,
  ExplainFailureRequest,
  ExplainFailureResponse,
  SubmitReflectRequest,
} from './types';

export { V2_STEPS, COMPLEXITY_OPTIONS } from './types';
