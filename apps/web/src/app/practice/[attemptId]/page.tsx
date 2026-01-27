'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { Stepper, type StepConfig } from '@/components/Stepper';
import { ProblemStatement } from '@/components/ProblemStatement';
import { ThinkingGate } from '@/components/ThinkingGate';
import { PatternDiscovery } from '@/components/PatternDiscovery';
import { PatternChallenge } from '@/components/PatternChallenge';
import { CodeEditor } from '@/components/CodeEditor';
import { TestResults } from '@/components/TestResults';
import { PerformancePanel } from '@/components/PerformancePanel';
import { ReflectionForm } from '@/components/ReflectionForm';
import { SuccessReflectionForm } from '@/components/SuccessReflectionForm';
import { MicroLessonModal } from '@/components/MicroLessonModal';
import { ReviewSummary } from '@/components/ReviewSummary';
import { LLMFeedback } from '@/components/LLMFeedback';
import { CoachDrawer, CoachButton } from '@/components/CoachDrawer';
import { CommittedPlanBadge } from '@/components/CommittedPlanBadge';
import { TraceVisualization } from '@/components/TraceVisualization';

// V2 Flow Components
import {
  V2Workbench,
  type V2Step,
  type AttemptMode,
  type AttemptV2,
  type TestResultData,
  type SubmitUnderstandRequest,
  type SubmitUnderstandResponse,
  type SubmitFollowupRequest,
  type SuggestPatternsResponse,
  type ChoosePatternRequest,
  type ChoosePatternResponse,
  type ExplainFailureRequest,
  type ExplainFailureResponse,
  type SubmitReflectRequest,
} from '@/components/attempt-v2';

interface Problem {
  id: string;
  title: string;
  statement: string;
  pattern: string;
  rung: number;
  targetComplexity: string;
  hints: string[];
}

interface TestResult {
  input: string;
  expected: string;
  actual: string;
  passed: boolean;
  error: string | null;
}

interface Hint {
  level: string;
  text: string;
}

interface ValidationData {
  rubricGrade: 'PASS' | 'PARTIAL' | 'FAIL';
  llmFeedback?: string;
  llmConfidence?: number;
  microLessonId?: string;
  successReflectionPrompt?: string;
  gatingAction?: 'PROCEED' | 'PROCEED_WITH_REFLECTION' | 'SHOW_MICRO_LESSON' | 'REQUIRE_REFLECTION' | 'BLOCK_SUBMISSION';
  gatingReason?: string;
  timeBudgetResult?: {
    exceeded: boolean;
    budgetMs: number;
    testsRun: number;
    testsFailed: number;
  };
  complexitySuggestion?: string;
}

interface Attempt {
  id: string;
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
  // V2 fields (optional for backwards compatibility)
  v2Step?: V2Step | null;
  mode?: AttemptMode;
  understandPayload?: AttemptV2['understandPayload'];
  planPayload?: AttemptV2['planPayload'];
  verifyPayload?: AttemptV2['verifyPayload'];
  reflectPayload?: AttemptV2['reflectPayload'];
  hintBudget?: number;
  hintsUsedCount?: number;
}

const DEMO_REFLECTION_OPTIONS = [
  { id: 'edge_case', text: 'I missed handling an edge case (empty input, single element, etc.)', isCorrect: true },
  { id: 'off_by_one', text: 'I had an off-by-one error in my loop bounds', isCorrect: true },
  { id: 'wrong_pattern', text: 'I used the wrong algorithmic approach for this problem', isCorrect: false },
  { id: 'syntax', text: 'I had a syntax or compilation error', isCorrect: false },
];

const DEMO_MICRO_LESSONS: Record<string, { title: string; content: string }> = {
  SLIDING_WINDOW: {
    title: 'Sliding Window Best Practices',
    content: `When implementing sliding window:

1. Initialize your window boundaries (left, right pointers)
2. Expand the right boundary to grow the window
3. Contract the left boundary when constraints are violated
4. Track your answer at each valid window state

Common pitfalls:
- Using nested loops (O(n²)) instead of the two-pointer approach (O(n))
- Forgetting to update the answer when shrinking the window
- Off-by-one errors when the window includes/excludes boundaries`
  },
  DEFAULT: {
    title: 'Problem-Solving Tips',
    content: `Before writing code:

1. Understand the problem completely - read it twice
2. Identify the pattern that applies
3. State your invariant - what property will your solution maintain?
4. Consider edge cases: empty input, single element, negative numbers

During implementation:
- Start with the simplest case
- Build up complexity gradually
- Test each piece before moving on`
  }
};

export default function AttemptPage() {
  const params = useParams();
  const attemptId = params.attemptId as string;

  const [attempt, setAttempt] = useState<Attempt | null>(null);
  const [problem, setProblem] = useState<Problem | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Step states
  const [stepLoading, setStepLoading] = useState(false);
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [validation, setValidation] = useState<ValidationData | null>(null);
  const [hints, setHints] = useState<Hint[]>([]);
  const [hintLoading, setHintLoading] = useState(false);

  // Micro-lesson modal
  const [microLesson, setMicroLesson] = useState<{ title: string; content: string } | null>(null);

  // Problem statement collapse
  const [problemCollapsed, setProblemCollapsed] = useState(false);

  // Coach drawer
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Committed plan (from thinking gate)
  const [committedPlan, setCommittedPlan] = useState<{
    pattern: string;
    invariant: string;
  } | null>(null);

  // Pattern discovery state
  const [isDiscovering, setIsDiscovering] = useState(false);
  const [discoveryStep, setDiscoveryStep] = useState<{
    stepId: string;
    mode: 'HEURISTIC' | 'SOCRATIC';
    question: string;
    questionId: string;
  } | null>(null);
  const [discoveredPattern, setDiscoveredPattern] = useState<string | null>(null);

  // Pattern challenge (Advocate's Trap) state
  const [isChallenging, setIsChallenging] = useState(false);
  const [challengeData, setChallengeData] = useState<{
    stepId: string;
    mode: 'COUNTEREXAMPLE' | 'SOCRATIC';
    prompt: string;
    counterexample?: string;
    confidenceScore: number;
    reasons: string[];
    suggestedAlternatives: string[];
    pendingPattern: string;
    pendingInvariant: string;
    pendingComplexity?: string;
  } | null>(null);

  // Trace visualization state
  const [traceEnabled, setTraceEnabled] = useState(false);
  const [traceData, setTraceData] = useState<{
    success: boolean;
    frames: Array<{ iter: number; vars: Record<string, unknown>; label?: string }>;
    error?: string;
    array?: unknown[];
    arrayName?: string;
    pointerVars?: string[];
  } | null>(null);
  const [traceLoading, setTraceLoading] = useState(false);
  const [traceHint, setTraceHint] = useState<string | undefined>();
  const [currentCode, setCurrentCode] = useState<string>('');

  // Adversary challenge state (Level Up Challenge)
  const [adversaryChallenge, setAdversaryChallenge] = useState<{
    stepId: string;
    prompt: { id: string; type: string; prompt: string; hint?: string };
    userResponse: string | null;
    skipped: boolean;
    completed: boolean;
  } | null>(null);
  const [adversaryLoading, setAdversaryLoading] = useState(false);

  // V2 Flow state
  const [v2TestResults, setV2TestResults] = useState<TestResultData[]>([]);
  const [v2Hints, setV2Hints] = useState<Array<{ level: string; text: string }>>([]);

  useEffect(() => {
    fetchAttempt();
  }, [attemptId]);

  async function fetchAttempt() {
    try {
      const res = await fetch(`/api/attempts/${attemptId}`);
      const data = await res.json();

      if (data.error) {
        setError(data.error.message);
      } else {
        setAttempt(data.attempt);
        setProblem(data.problem);

        // Restore hints from attempt
        if (data.attempt.hintsUsed?.length > 0) {
          // In a real app, we'd fetch hint texts from the steps
          // For demo, we'll rebuild them
        }
      }
    } catch (err) {
      setError('Failed to load attempt');
    } finally {
      setLoading(false);
    }
  }

  const getStepConfig = useCallback((): StepConfig[] => {
    if (!attempt) return [];

    const state = attempt.state;
    const hasFailureReflection = state === 'REFLECTION' || testResults.some(r => !r.passed);
    const hasSuccessReflection = state === 'SUCCESS_REFLECTION';

    const steps: StepConfig[] = [
      {
        id: 'approach',
        label: 'Approach',
        status: state === 'THINKING_GATE' ? 'active' : 'completed'
      },
      {
        id: 'code',
        label: 'Code',
        status: state === 'THINKING_GATE' ? 'pending' :
                state === 'CODING' || state === 'HINT' ? 'active' :
                'completed'
      },
      {
        id: 'test',
        label: 'Test',
        status: testResults.length === 0 ? 'pending' :
                testResults.every(r => r.passed) ? 'completed' :
                'active'
      },
    ];

    // Failure reflection (after failed tests)
    if (hasFailureReflection) {
      steps.push({
        id: 'reflection',
        label: 'Reflection',
        status: state === 'REFLECTION' ? 'active' :
                state === 'COMPLETED' ? 'completed' : 'pending'
      });
    }

    // Success reflection (optional, after passing tests)
    if (hasSuccessReflection) {
      steps.push({
        id: 'success-reflection',
        label: 'Reflect',
        status: 'active'
      });
    }

    if (state === 'COMPLETED' || state === 'SUCCESS_REFLECTION') {
      steps.push({
        id: 'complete',
        label: 'Complete',
        status: state === 'COMPLETED' ? 'completed' : 'pending'
      });
    }

    return steps;
  }, [attempt, testResults]);

  async function handleThinkingGateSubmit(data: {
    selectedPattern: string;
    statedInvariant: string;
    statedComplexity?: string;
  }) {
    setStepLoading(true);
    try {
      // First, check if pattern challenge should trigger (Advocate's Trap)
      const checkRes = await fetch(`/api/attempts/${attemptId}/pattern-challenge/check`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          selectedPattern: data.selectedPattern,
          statedInvariant: data.statedInvariant,
        }),
      });

      const checkResult = await checkRes.json();

      if (checkResult.error) {
        // If check fails, proceed with normal submission
        console.warn('Challenge check failed:', checkResult.error);
      } else if (checkResult.shouldChallenge && checkResult.challenge) {
        // Challenge triggered - show the challenge UI instead of submitting
        setChallengeData({
          stepId: checkResult.challenge.stepId,
          mode: checkResult.challenge.mode,
          prompt: checkResult.challenge.prompt,
          counterexample: checkResult.challenge.counterexample,
          confidenceScore: checkResult.challenge.confidenceScore,
          reasons: checkResult.challenge.reasons,
          suggestedAlternatives: checkResult.challenge.suggestedAlternatives,
          pendingPattern: data.selectedPattern,
          pendingInvariant: data.statedInvariant,
          pendingComplexity: data.statedComplexity,
        });
        setIsChallenging(true);
        setStepLoading(false);
        return; // Don't proceed with thinking gate submission yet
      }

      // No challenge - proceed with normal thinking gate submission
      await submitThinkingGate(data);
    } catch (err) {
      setError('Failed to submit thinking gate');
      setStepLoading(false);
    }
  }

  async function submitThinkingGate(data: {
    selectedPattern: string;
    statedInvariant: string;
    statedComplexity?: string;
  }) {
    try {
      const res = await fetch(`/api/attempts/${attemptId}/step`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          stepType: 'THINKING_GATE',
          ...data
        }),
      });

      const result = await res.json();

      if (result.error) {
        setError(result.error.message);
      } else {
        setAttempt(result.attempt);

        // Save the committed plan for display during coding
        setCommittedPlan({
          pattern: data.selectedPattern,
          invariant: data.statedInvariant,
        });

        // Collapse problem statement when entering coding phase
        setProblemCollapsed(true);

        // Show micro-lesson if pattern doesn't match
        if (!result.passed && problem) {
          const lesson = DEMO_MICRO_LESSONS[problem.pattern] ?? DEMO_MICRO_LESSONS['DEFAULT'];
          if (lesson) {
            setMicroLesson(lesson);
          }
        }
      }
    } catch (err) {
      setError('Failed to submit thinking gate');
    } finally {
      setStepLoading(false);
    }
  }

  async function handleCodeSubmit(data: { code: string; language: string }) {
    setStepLoading(true);
    try {
      const res = await fetch(`/api/attempts/${attemptId}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      const result = await res.json();

      if (result.error) {
        setError(result.error.message);
      } else {
        setAttempt(result.attempt);
        setTestResults(result.testResults);
        setValidation(result.validation ?? null);
        setProblemCollapsed(true);
      }
    } catch (err) {
      setError('Failed to submit code');
    } finally {
      setStepLoading(false);
    }
  }

  async function handleRequestHint() {
    setHintLoading(true);
    try {
      const res = await fetch(`/api/attempts/${attemptId}/hint`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      const result = await res.json();

      if (result.error) {
        if (result.error.code === 'NO_MORE_HINTS') {
          // No more hints available
        } else {
          setError(result.error.message);
        }
      } else {
        setAttempt(result.attempt);
        setHints(prev => [...prev, result.hint]);
      }
    } catch (err) {
      setError('Failed to get hint');
    } finally {
      setHintLoading(false);
    }
  }

  async function handleReflectionSubmit(selectedId: string, isCorrect: boolean) {
    setStepLoading(true);
    try {
      const res = await fetch(`/api/attempts/${attemptId}/step`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          stepType: 'REFLECTION',
          selectedOptionId: selectedId,
          correct: isCorrect
        }),
      });

      const result = await res.json();

      if (result.error) {
        setError(result.error.message);
      } else {
        setAttempt(result.attempt);
        setTestResults([]); // Clear results to allow retry
        setValidation(null); // Clear LLM feedback for retry
      }
    } catch (err) {
      setError('Failed to submit reflection');
    } finally {
      setStepLoading(false);
    }
  }

  async function handleSuccessReflectionSubmit(data: {
    confidenceRating: 1 | 2 | 3 | 4 | 5;
    learnedInsight: string;
    improvementNote?: string;
    skipped: boolean;
  }) {
    setStepLoading(true);
    try {
      const res = await fetch(`/api/attempts/${attemptId}/step`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          stepType: 'SUCCESS_REFLECTION',
          ...data
        }),
      });

      const result = await res.json();

      if (result.error) {
        setError(result.error.message);
      } else {
        setAttempt(result.attempt);
      }
    } catch (err) {
      setError('Failed to submit reflection');
    } finally {
      setStepLoading(false);
    }
  }

  async function handleSuccessReflectionSkip() {
    setStepLoading(true);
    try {
      const res = await fetch(`/api/attempts/${attemptId}/step`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          stepType: 'SUCCESS_REFLECTION',
          confidenceRating: 3, // Default middle value
          learnedInsight: '',
          skipped: true
        }),
      });

      const result = await res.json();

      if (result.error) {
        setError(result.error.message);
      } else {
        setAttempt(result.attempt);
      }
    } catch (err) {
      setError('Failed to skip reflection');
    } finally {
      setStepLoading(false);
    }
  }

  // ============ Pattern Discovery Handlers ============

  async function handleStartDiscovery() {
    setStepLoading(true);
    try {
      const res = await fetch(`/api/attempts/${attemptId}/pattern-discovery/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });

      const result = await res.json();

      if (result.error) {
        setError(result.error.message);
      } else {
        setDiscoveryStep({
          stepId: result.stepId,
          mode: result.mode,
          question: result.question,
          questionId: result.questionId,
        });
        setIsDiscovering(true);
      }
    } catch (err) {
      setError('Failed to start pattern discovery');
    } finally {
      setStepLoading(false);
    }
  }

  async function handleDiscoveryAnswer(data: { stepId: string; questionId: string; answer: string }) {
    const res = await fetch(`/api/attempts/${attemptId}/pattern-discovery/answer`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });

    const result = await res.json();

    if (result.error) {
      throw new Error(result.error.message);
    }

    return result;
  }

  function handlePatternDiscovered(pattern: string) {
    setDiscoveredPattern(pattern);
    setIsDiscovering(false);
    setDiscoveryStep(null);
  }

  async function handleAbandonDiscovery(stepId: string) {
    try {
      await fetch(`/api/attempts/${attemptId}/pattern-discovery/abandon`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stepId }),
      });
    } catch (err) {
      // Ignore errors on abandon
    }
    setIsDiscovering(false);
    setDiscoveryStep(null);
  }

  // ============ Pattern Challenge Handlers (Advocate's Trap) ============

  async function handleChallengeRespond(data: {
    stepId: string;
    response: string;
    decision: 'KEEP_PATTERN' | 'CHANGE_PATTERN';
    newPattern?: string;
  }) {
    setStepLoading(true);
    try {
      const res = await fetch(`/api/attempts/${attemptId}/pattern-challenge/respond`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      const result = await res.json();

      if (result.error) {
        setError(result.error.message);
        setStepLoading(false);
        return;
      }

      // Challenge resolved - now submit the thinking gate with final pattern
      const finalPattern = result.finalPattern;
      setIsChallenging(false);
      setChallengeData(null);

      // If pattern was changed, update the discovered pattern
      if (data.decision === 'CHANGE_PATTERN' && data.newPattern) {
        setDiscoveredPattern(data.newPattern);
      }

      // Submit thinking gate with the final pattern
      await submitThinkingGate({
        selectedPattern: finalPattern,
        statedInvariant: challengeData?.pendingInvariant ?? '',
        statedComplexity: challengeData?.pendingComplexity,
      });
    } catch (err) {
      setError('Failed to respond to challenge');
      setStepLoading(false);
    }
  }

  async function handleChallengeSkip(stepId: string) {
    setStepLoading(true);
    try {
      const res = await fetch(`/api/attempts/${attemptId}/pattern-challenge/skip`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stepId }),
      });

      const result = await res.json();

      if (result.error) {
        setError(result.error.message);
        setStepLoading(false);
        return;
      }

      // Challenge skipped - proceed with original pattern
      setIsChallenging(false);
      setChallengeData(null);

      // Submit thinking gate with original pattern
      await submitThinkingGate({
        selectedPattern: result.finalPattern,
        statedInvariant: challengeData?.pendingInvariant ?? '',
        statedComplexity: challengeData?.pendingComplexity,
      });
    } catch (err) {
      setError('Failed to skip challenge');
      setStepLoading(false);
    }
  }

  // ============ Trace Visualization Handlers ============

  const [currentLanguage, setCurrentLanguage] = useState<string>('javascript');

  function handleCodeChange(code: string, language: string) {
    setCurrentCode(code);
    setCurrentLanguage(language);
  }

  async function handleTraceExecution() {
    if (!currentCode.trim()) return;

    setTraceLoading(true);
    setTraceHint(undefined);

    try {
      const res = await fetch(`/api/attempts/${attemptId}/trace`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: currentCode,
          language: currentLanguage,
          testInput: '[]', // Default test input - could be expanded
          autoInsert: true,
        }),
      });

      const result = await res.json();

      if (result.error) {
        setTraceData({
          success: false,
          frames: [],
          error: result.error.message,
        });
        setTraceHint(result.hint);
      } else {
        setTraceData(result.trace);
        setTraceHint(result.hint);
      }
    } catch (err) {
      setTraceData({
        success: false,
        frames: [],
        error: 'Failed to execute trace',
      });
    } finally {
      setTraceLoading(false);
    }
  }

  // ============ Adversary Challenge Handlers (Level Up Challenge) ============

  async function handleStartAdversaryChallenge() {
    setAdversaryLoading(true);
    try {
      const res = await fetch(`/api/attempts/${attemptId}/adversary`);
      const result = await res.json();

      if (result.error) {
        console.error('Failed to get adversary challenge:', result.error);
        return;
      }

      if (result.challenge) {
        setAdversaryChallenge(result.challenge);
      }
    } catch (err) {
      console.error('Failed to start adversary challenge:', err);
    } finally {
      setAdversaryLoading(false);
    }
  }

  async function handleSubmitAdversaryResponse(data: { stepId: string; response: string }) {
    setAdversaryLoading(true);
    try {
      const res = await fetch(`/api/attempts/${attemptId}/adversary`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      const result = await res.json();

      if (result.error) {
        console.error('Failed to submit adversary response:', result.error);
        return;
      }

      if (result.challenge) {
        setAdversaryChallenge(result.challenge);
      }
    } catch (err) {
      console.error('Failed to submit adversary response:', err);
    } finally {
      setAdversaryLoading(false);
    }
  }

  async function handleSkipAdversaryChallenge(stepId: string) {
    setAdversaryLoading(true);
    try {
      const res = await fetch(`/api/attempts/${attemptId}/adversary`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stepId, skip: true }),
      });

      const result = await res.json();

      if (result.error) {
        console.error('Failed to skip adversary challenge:', result.error);
        return;
      }

      if (result.challenge) {
        setAdversaryChallenge(result.challenge);
      }
    } catch (err) {
      console.error('Failed to skip adversary challenge:', err);
    } finally {
      setAdversaryLoading(false);
    }
  }

  // ============ V2 Flow Handlers ============

  async function handleV2ModeChange(mode: AttemptMode) {
    try {
      const res = await fetch(`/api/attempts/${attemptId}/mode`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode }),
      });
      const result = await res.json();
      if (!result.error && result.attempt) {
        setAttempt(result.attempt);
      }
    } catch (err) {
      console.error('Failed to change mode:', err);
    }
  }

  function handleV2StepChange(step: V2Step) {
    if (attempt) {
      setAttempt({ ...attempt, v2Step: step });
    }
  }

  async function handleV2SubmitUnderstand(
    data: SubmitUnderstandRequest
  ): Promise<SubmitUnderstandResponse> {
    const res = await fetch(`/api/attempts/${attemptId}/understand/submit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    const result = await res.json();
    if (result.error) throw new Error(result.error.message);
    if (result.attempt) setAttempt(result.attempt);
    return result;
  }

  async function handleV2FollowupAnswer(data: SubmitFollowupRequest): Promise<void> {
    const res = await fetch(`/api/attempts/${attemptId}/understand/followup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    const result = await res.json();
    if (result.error) throw new Error(result.error.message);
    if (result.attempt) setAttempt(result.attempt);
  }

  async function handleV2SuggestPatterns(): Promise<SuggestPatternsResponse> {
    const res = await fetch(`/api/attempts/${attemptId}/plan/suggest`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        explanation: attempt?.understandPayload?.explanation ?? '',
      }),
    });
    const result = await res.json();
    if (result.error) throw new Error(result.error.message);
    if (result.attempt) setAttempt(result.attempt);
    return result;
  }

  async function handleV2ChoosePattern(
    data: ChoosePatternRequest
  ): Promise<ChoosePatternResponse> {
    const res = await fetch(`/api/attempts/${attemptId}/plan/choose`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    const result = await res.json();
    if (result.error) throw new Error(result.error.message);
    if (result.attempt) setAttempt(result.attempt);
    return result;
  }

  async function handleV2SubmitCode(data: { code: string; language: string }): Promise<void> {
    setStepLoading(true);
    try {
      const res = await fetch(`/api/attempts/${attemptId}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const result = await res.json();
      if (result.error) throw new Error(result.error.message);
      if (result.attempt) setAttempt(result.attempt);
      if (result.testResults) {
        setV2TestResults(result.testResults);
        // If tests submitted, move to VERIFY step
        if (attempt?.v2Step === 'IMPLEMENT') {
          setAttempt((prev) => prev ? { ...prev, v2Step: 'VERIFY' } : null);
        }
      }
    } finally {
      setStepLoading(false);
    }
  }

  async function handleV2RequestHint(): Promise<void> {
    setHintLoading(true);
    try {
      const res = await fetch(`/api/attempts/${attemptId}/hint`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      const result = await res.json();
      if (result.error) {
        if (result.error.code !== 'NO_MORE_HINTS') {
          throw new Error(result.error.message);
        }
      } else {
        if (result.attempt) setAttempt(result.attempt);
        if (result.hint) {
          setV2Hints((prev) => [...prev, result.hint]);
        }
      }
    } finally {
      setHintLoading(false);
    }
  }

  async function handleV2ExplainFailure(
    data: ExplainFailureRequest
  ): Promise<ExplainFailureResponse> {
    const res = await fetch(`/api/attempts/${attemptId}/verify/explain-failure`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    const result = await res.json();
    if (result.error) throw new Error(result.error.message);
    return result;
  }

  function handleV2Retry() {
    // Go back to implement step
    if (attempt) {
      setAttempt({ ...attempt, v2Step: 'IMPLEMENT' });
    }
  }

  function handleV2GiveUp() {
    // Mark attempt as incomplete and go to reflect
    if (attempt) {
      setAttempt({ ...attempt, v2Step: 'REFLECT' });
    }
  }

  async function handleV2SubmitReflect(data: SubmitReflectRequest): Promise<void> {
    setStepLoading(true);
    try {
      const res = await fetch(`/api/attempts/${attemptId}/reflect/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const result = await res.json();
      if (result.error) throw new Error(result.error.message);
      if (result.attempt) setAttempt(result.attempt);
    } finally {
      setStepLoading(false);
    }
  }

  function handleV2Complete() {
    // Navigate to complete state
    if (attempt) {
      setAttempt({ ...attempt, v2Step: 'COMPLETE' });
    }
  }

  // Helper to check if this is a V2 attempt
  const isV2Attempt = attempt?.v2Step !== null && attempt?.v2Step !== undefined;

  if (loading) {
    return (
      <div className="loading-state">
        <div className="spinner"></div>
        <p style={{ marginTop: '1rem' }}>Loading problem...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="empty-state">
        <h3>Something went wrong</h3>
        <p>{error}</p>
        <button
          className="btn btn-primary"
          style={{ marginTop: '1rem' }}
          onClick={() => { setError(null); setLoading(true); fetchAttempt(); }}
        >
          Try Again
        </button>
      </div>
    );
  }

  if (!attempt || !problem) {
    return (
      <div className="empty-state">
        <h3>Attempt not found</h3>
        <a href="/practice" className="btn btn-primary" style={{ marginTop: '1rem' }}>
          Back to Practice
        </a>
      </div>
    );
  }

  // Completed state - show Review Summary
  if (attempt.state === 'COMPLETED' && attempt.score) {
    return (
      <ReviewSummary
        problemTitle={problem.title}
        pattern={attempt.pattern}
        rung={attempt.rung}
        score={attempt.score}
        codeSubmissions={attempt.codeSubmissions}
        hintsUsed={attempt.hintsUsed.length}
        statedInvariant={committedPlan?.invariant}
        allTestsPassed={true}
        adversaryChallenge={adversaryChallenge}
        onStartAdversaryChallenge={handleStartAdversaryChallenge}
        onSubmitAdversaryResponse={handleSubmitAdversaryResponse}
        onSkipAdversaryChallenge={handleSkipAdversaryChallenge}
        adversaryLoading={adversaryLoading}
      />
    );
  }

  // ============ V2 FLOW ============
  // If this is a V2 attempt (v2Step is set), render the V2 workbench
  if (isV2Attempt && attempt.v2Step) {
    // Convert legacy attempt to V2 attempt format
    const v2Attempt: AttemptV2 = {
      id: attempt.id,
      mode: attempt.mode ?? 'BEGINNER',
      v2Step: attempt.v2Step,
      understandPayload: attempt.understandPayload ?? null,
      planPayload: attempt.planPayload ?? null,
      verifyPayload: attempt.verifyPayload ?? null,
      reflectPayload: attempt.reflectPayload ?? null,
      hintBudget: attempt.hintBudget ?? 5,
      hintsUsedCount: attempt.hintsUsedCount ?? 0,
      state: attempt.state,
      pattern: attempt.pattern,
      rung: attempt.rung,
      hintsUsed: attempt.hintsUsed,
      codeSubmissions: attempt.codeSubmissions,
      score: attempt.score,
    };

    return (
      <V2Workbench
        attempt={v2Attempt}
        problem={problem}
        onModeChange={handleV2ModeChange}
        onStepChange={handleV2StepChange}
        onSubmitUnderstand={handleV2SubmitUnderstand}
        onFollowupAnswer={handleV2FollowupAnswer}
        onSuggestPatterns={handleV2SuggestPatterns}
        onChoosePattern={handleV2ChoosePattern}
        onSubmitCode={handleV2SubmitCode}
        onRequestHint={handleV2RequestHint}
        testResults={v2TestResults}
        onExplainFailure={handleV2ExplainFailure}
        onRetry={handleV2Retry}
        onGiveUp={handleV2GiveUp}
        onSubmitReflect={handleV2SubmitReflect}
        onComplete={handleV2Complete}
        loading={stepLoading}
        hintLoading={hintLoading}
        hints={v2Hints}
      />
    );
  }

  // ============ LEGACY FLOW ============
  // Determine if we're in coding phase (editor should be primary)
  const isCodingPhase = attempt.state === 'CODING' || attempt.state === 'HINT';
  const isThinkingPhase = attempt.state === 'THINKING_GATE';
  const isReflectionPhase = attempt.state === 'REFLECTION' || attempt.state === 'SUCCESS_REFLECTION';

  return (
    <div className={`solve-layout ${isCodingPhase ? 'solve-layout--coding' : ''}`}>
      {/* Stepper - always visible */}
      <Stepper steps={getStepConfig()} />

      {/* ============ THINKING GATE PHASE ============ */}
      {isThinkingPhase && (
        <div className="solve-thinking-phase">
          <ProblemStatement
            problem={problem}
            collapsed={problemCollapsed}
            onToggle={() => setProblemCollapsed(!problemCollapsed)}
          />

          {/* Pattern Challenge Flow (Advocate's Trap) */}
          {isChallenging && challengeData ? (
            <PatternChallenge
              stepId={challengeData.stepId}
              challengedPattern={challengeData.pendingPattern}
              mode={challengeData.mode}
              prompt={challengeData.prompt}
              counterexample={challengeData.counterexample}
              confidenceScore={challengeData.confidenceScore}
              reasons={challengeData.reasons}
              suggestedAlternatives={challengeData.suggestedAlternatives}
              onRespond={handleChallengeRespond}
              onSkip={handleChallengeSkip}
              loading={stepLoading}
            />
          ) : isDiscovering && discoveryStep ? (
            /* Pattern Discovery Flow */
            <PatternDiscovery
              initialQuestion={discoveryStep.question}
              initialQuestionId={discoveryStep.questionId}
              stepId={discoveryStep.stepId}
              mode={discoveryStep.mode}
              onSubmitAnswer={handleDiscoveryAnswer}
              onPatternDiscovered={handlePatternDiscovered}
              onAbandon={handleAbandonDiscovery}
              loading={stepLoading}
            />
          ) : (
            <ThinkingGate
              onSubmit={handleThinkingGateSubmit}
              onStartDiscovery={handleStartDiscovery}
              discoveredPattern={discoveredPattern}
              loading={stepLoading}
            />
          )}
        </div>
      )}

      {/* ============ CODING PHASE ============ */}
      {isCodingPhase && (
        <div className="workbench">
          {/* Workbench Header */}
          <div className="workbench-header">
            <div className="workbench-header-left">
              <h2 className="workbench-title">{problem.title}</h2>
              {committedPlan && (
                <CommittedPlanBadge
                  pattern={committedPlan.pattern}
                  invariant={committedPlan.invariant}
                  compact
                />
              )}
            </div>
            <div className="workbench-header-right">
              {/* Trace Mode Toggle */}
              <label className="trace-toggle">
                <input
                  type="checkbox"
                  checked={traceEnabled}
                  onChange={(e) => {
                    setTraceEnabled(e.target.checked);
                    if (!e.target.checked) {
                      setTraceData(null);
                      setTraceHint(undefined);
                    }
                  }}
                />
                <span className="trace-toggle-label">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M2 12h2m16 0h2M12 2v2m0 16v2M4.93 4.93l1.41 1.41m11.32 11.32l1.41 1.41M4.93 19.07l1.41-1.41m11.32-11.32l1.41-1.41" />
                  </svg>
                  Trace Mode
                </span>
              </label>
              {traceEnabled && (
                <button
                  className="btn btn-sm btn-ghost trace-run-btn"
                  onClick={handleTraceExecution}
                  disabled={traceLoading || !currentCode.trim()}
                  title="Run code with trace visualization"
                >
                  {traceLoading ? (
                    <span className="spinner" style={{ width: '14px', height: '14px' }} />
                  ) : (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                      <polygon points="5 3 19 12 5 21 5 3" />
                    </svg>
                  )}
                  Run Trace
                </button>
              )}
              <CoachButton onClick={() => setDrawerOpen(true)} hintsCount={hints.length} />
            </div>
          </div>

          {/* Split Pane Layout */}
          <div className={`workbench-split ${problemCollapsed ? 'workbench-split--collapsed' : ''}`}>
            {/* Left Panel - Problem Statement */}
            <aside className={`workbench-panel workbench-panel--problem ${problemCollapsed ? 'workbench-panel--collapsed' : ''}`}>
              <div className="workbench-panel-header">
                <span className="workbench-panel-title">Problem</span>
                <button
                  className="workbench-panel-toggle"
                  onClick={() => setProblemCollapsed(!problemCollapsed)}
                  aria-label={problemCollapsed ? 'Expand problem panel' : 'Collapse problem panel'}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    {problemCollapsed ? (
                      <path d="M9 18l6-6-6-6" />
                    ) : (
                      <path d="M15 18l-6-6 6-6" />
                    )}
                  </svg>
                </button>
              </div>
              {!problemCollapsed && (
                <div className="workbench-panel-content">
                  <ProblemStatement
                    problem={problem}
                    collapsed={false}
                    onToggle={() => setProblemCollapsed(true)}
                  />
                </div>
              )}
            </aside>

            {/* Right Panel - Code Editor & Results */}
            <main className="workbench-panel workbench-panel--editor">
              <div className="workbench-editor-area">
                <CodeEditor
                  onSubmit={handleCodeSubmit}
                  loading={stepLoading}
                  onCodeChange={handleCodeChange}
                />
              </div>

              {/* Results Panel */}
              <div className="workbench-results">
                {testResults.length > 0 && (
                  <>
                    <TestResults results={testResults} />
                    <PerformancePanel
                      correctness={{
                        passed: testResults.filter(r => r.passed).length,
                        total: testResults.length,
                        allPassed: testResults.every(r => r.passed),
                      }}
                      timeBudget={validation?.timeBudgetResult ? {
                        exceeded: validation.timeBudgetResult.exceeded,
                        budgetMs: validation.timeBudgetResult.budgetMs,
                        suggestion: validation.complexitySuggestion,
                      } : undefined}
                      nextAction={validation?.gatingAction ? {
                        type: validation.gatingAction,
                        message: validation.gatingReason ?? '',
                      } : undefined}
                    />
                  </>
                )}

                {validation?.llmFeedback && validation.llmConfidence !== undefined && (
                  <LLMFeedback
                    feedback={validation.llmFeedback}
                    confidence={validation.llmConfidence}
                    grade={validation.rubricGrade}
                    microLessonId={validation.microLessonId}
                  />
                )}

                {/* Trace Visualization Panel */}
                {traceEnabled && (
                  <TraceVisualization
                    trace={traceData}
                    loading={traceLoading}
                    insertionHint={traceHint}
                  />
                )}
              </div>
            </main>
          </div>
        </div>
      )}

      {/* ============ REFLECTION PHASE ============ */}
      {isReflectionPhase && (
        <div className="solve-reflection-phase">
          {/* Failure Reflection */}
          {attempt.state === 'REFLECTION' && (
            <ReflectionForm
              question="What do you think caused the test failures?"
              options={DEMO_REFLECTION_OPTIONS}
              onSubmit={handleReflectionSubmit}
              loading={stepLoading}
            />
          )}

          {/* Success Reflection */}
          {attempt.state === 'SUCCESS_REFLECTION' && attempt.score && (
            <SuccessReflectionForm
              prompt={validation?.successReflectionPrompt || 'What key insight helped you solve this problem?'}
              score={attempt.score}
              onSubmit={handleSuccessReflectionSubmit}
              onSkip={handleSuccessReflectionSkip}
              loading={stepLoading}
            />
          )}
        </div>
      )}

      {/* ============ COACH DRAWER ============ */}
      <CoachDrawer
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        hints={hints}
        onRequestHint={handleRequestHint}
        hintLoading={hintLoading}
        hintsRemaining={5 - attempt.hintsUsed.length}
        submissionCount={attempt.codeSubmissions}
      />

      {/* ============ MICRO-LESSON MODAL ============ */}
      <MicroLessonModal
        isOpen={microLesson !== null}
        title={microLesson?.title || ''}
        content={microLesson?.content || ''}
        onComplete={() => setMicroLesson(null)}
      />
    </div>
  );
}
