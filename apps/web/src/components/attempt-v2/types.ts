/**
 * Attempt V2 Types
 *
 * TypeScript types for the 5-step attempt flow UI components.
 */

// ============ Step Types ============

export type V2Step = 'UNDERSTAND' | 'PLAN' | 'IMPLEMENT' | 'VERIFY' | 'REFLECT' | 'COMPLETE';

export type AttemptMode = 'BEGINNER' | 'EXPERT';

// ============ Payload Types ============

export interface AIAssessment {
  status: 'PASS' | 'NEEDS_WORK';
  strengths: string[];
  gaps: string[];
  followupQuestions: string[];
}

export interface FollowupExchange {
  question: string;
  answer: string;
  timestamp: Date;
}

export interface UnderstandPayload {
  explanation: string;
  inputOutputDescription: string;
  constraintsDescription: string;
  exampleWalkthrough: string;
  wrongApproach: string;
  aiAssessment: AIAssessment | null;
  followups: FollowupExchange[];
}

export interface SuggestedPattern {
  patternId: string;
  name: string;
  reason: string;
  aiConfidence: number;
}

export interface InvariantData {
  text: string;
  builderUsed: boolean;
  templateId?: string;
  templateChoices?: Record<string, number>;
}

export interface PlanPayload {
  suggestedPatterns: SuggestedPattern[];
  chosenPattern: string | null;
  userConfidence: number | null;
  invariant: InvariantData | null;
  complexity: string | null;
  discoveryTriggered: boolean;
}

export interface TestResultData {
  input: string;
  expected: string;
  actual: string;
  passed: boolean;
  error: string | null;
}

export interface FailureExplanation {
  testIndex: number;
  userExplanation: string;
  aiGuidance: string;
  timestamp: Date;
}

export interface VerifyPayload {
  testResults: TestResultData[];
  failureExplanations: FailureExplanation[];
  traceNotes: string | null;
}

export interface ReflectPayload {
  cuesNextTime: string[];
  invariantSummary: string;
  microLessonId: string | null;
  adversaryChallengeCompleted: boolean;
}

// ============ Attempt V2 Interface ============

export interface AttemptV2 {
  id: string;
  mode: AttemptMode;
  v2Step: V2Step;
  understandPayload: UnderstandPayload | null;
  planPayload: PlanPayload | null;
  verifyPayload: VerifyPayload | null;
  reflectPayload: ReflectPayload | null;
  hintBudget: number;
  hintsUsedCount: number;
  // Legacy fields that still exist
  state: string;
  pattern: string;
  rung: number;
  hintsUsed: string[];
  codeSubmissions: number;
  score: {
    overall: number;
    patternRecognition: number;
    implementation: number;
    edgeCases: number;
    efficiency: number;
  } | null;
}

// ============ Problem Interface ============

export interface Problem {
  id: string;
  title: string;
  statement: string;
  pattern: string;
  rung: number;
  targetComplexity?: string;
  hints?: string[];
}

// ============ API Request/Response Types ============

export interface SubmitUnderstandRequest {
  explanation: string;
  inputOutputDescription: string;
  constraintsDescription: string;
  exampleWalkthrough: string;
  wrongApproach: string;
}

export interface SubmitUnderstandResponse {
  status: 'PASS' | 'NEEDS_WORK';
  strengths: string[];
  gaps: string[];
  followupQuestions: string[];
  solutionLeakRisk: 'low' | 'medium' | 'high';
}

export interface SubmitFollowupRequest {
  questionIndex: number;
  answer: string;
}

export interface SuggestPatternsResponse {
  candidates: SuggestedPattern[];
  recommendedNextAction: string;
}

export interface ChoosePatternRequest {
  patternId: string;
  confidence: number;
  invariantText?: string;
  invariantBuilder?: {
    templateId: string;
    choices: Record<string, number>;
  };
  complexity?: string;
}

export interface ChoosePatternResponse {
  accepted: boolean;
  match: 'GOOD' | 'MAYBE' | 'MISMATCH';
  rationale: string;
  discoveryRecommended: boolean;
  invariantFeedback?: string;
}

export interface ExplainFailureRequest {
  testIndex: number;
  testInput: string;
  expected: string;
  actual: string;
  userExplanation: string;
}

export interface ExplainFailureResponse {
  likelyBugType: string;
  failingCaseExplanation: string;
  suggestedNextDebugStep: string;
}

export interface SubmitReflectRequest {
  cuesNextTime: string[];
  invariantSummary: string;
}

// ============ Component Props Types ============

export interface V2StepperProps {
  currentStep: V2Step;
  completedSteps: V2Step[];
  onStepClick: (step: V2Step) => void;
  mode?: AttemptMode;
}

export interface UnderstandStepProps {
  attempt: AttemptV2;
  problem: Problem;
  onSubmit: (data: SubmitUnderstandRequest) => Promise<SubmitUnderstandResponse>;
  onFollowupAnswer: (data: SubmitFollowupRequest) => Promise<void>;
  onContinue: () => void;
  loading?: boolean;
}

export interface PlanStepProps {
  attempt: AttemptV2;
  problem: Problem;
  onSuggestPatterns: () => Promise<SuggestPatternsResponse>;
  onChoosePattern: (data: ChoosePatternRequest) => Promise<ChoosePatternResponse>;
  onContinue: () => void;
  loading?: boolean;
}

export interface ImplementStepProps {
  attempt: AttemptV2;
  problem: Problem;
  onSubmitCode: (data: { code: string; language: string }) => Promise<void>;
  onRequestHint: () => Promise<void>;
  loading?: boolean;
  hintLoading?: boolean;
}

export interface VerifyStepProps {
  attempt: AttemptV2;
  problem: Problem;
  testResults: TestResultData[];
  onExplainFailure: (data: ExplainFailureRequest) => Promise<ExplainFailureResponse>;
  onRetry: () => void;
  onGiveUp: () => void;
  onContinue: () => void;
  loading?: boolean;
}

export interface ReflectStepProps {
  attempt: AttemptV2;
  problem: Problem;
  onSubmit: (data: SubmitReflectRequest) => Promise<void>;
  onComplete: () => void;
  loading?: boolean;
  microLessonUrl?: string;
  adversaryPrompt?: string;
}

// ============ Invariant Builder V2 Types ============

export type InvariantTemplateType = 'loop' | 'window' | 'stack' | 'dp';

export interface InvariantSlotOption {
  id: string;
  text: string;
}

export interface InvariantSlot {
  id: string;
  label: string;
  options: InvariantSlotOption[];
}

export interface InvariantTemplateV2 {
  id: string;
  type: InvariantTemplateType;
  name: string;
  template: string;
  slots: InvariantSlot[];
  example: string;
}

export interface InvariantBuilderV2Props {
  templates: InvariantTemplateV2[];
  onComplete: (result: {
    templateId: string;
    templateType: InvariantTemplateType;
    choices: Record<string, string>;
    renderedText: string;
  }) => void;
  initialTemplateType?: InvariantTemplateType;
  showFreeTextFallback?: boolean;
  onFreeTextChange?: (text: string) => void;
}

// ============ Complexity Options ============

export const COMPLEXITY_OPTIONS = [
  { value: 'O(1)', label: 'O(1) - Constant' },
  { value: 'O(log n)', label: 'O(log n) - Logarithmic' },
  { value: 'O(n)', label: 'O(n) - Linear' },
  { value: 'O(n log n)', label: 'O(n log n) - Linearithmic' },
  { value: 'O(n^2)', label: 'O(n^2) - Quadratic' },
  { value: 'O(2^n)', label: 'O(2^n) - Exponential' },
] as const;

// ============ Step Metadata ============

export const V2_STEPS: Array<{ id: V2Step; label: string; description: string }> = [
  { id: 'UNDERSTAND', label: 'Understand', description: 'Explain the problem in your own words' },
  { id: 'PLAN', label: 'Plan', description: 'Choose a pattern and state your invariant' },
  { id: 'IMPLEMENT', label: 'Implement', description: 'Write your solution code' },
  { id: 'VERIFY', label: 'Verify', description: 'Test and debug your solution' },
  { id: 'REFLECT', label: 'Reflect', description: 'Capture learnings for next time' },
];
