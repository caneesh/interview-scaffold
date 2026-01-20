/**
 * Problem Framing Module
 *
 * Socratic questions to ensure problem understanding:
 * - No code allowed, no patterns mentioned yet
 * - Ask at most 3 questions at a time
 * - Probe deeper on shallow answers
 */

import type { Problem } from '../entities/problem.js';
import type {
  ProblemFramingData,
  ProblemFramingQuestion,
  ProblemFramingCategory,
  AnswerQuality,
  CoachResponse,
} from './types.js';
import { selectRandom, randomIndex } from './random-utils.js';

// ============ Constants ============

/**
 * Maximum questions per batch
 */
export const MAX_QUESTIONS_PER_BATCH = 3;

/**
 * Minimum answer length for adequate quality
 */
export const MIN_ADEQUATE_ANSWER_LENGTH = 30;

/**
 * Minimum answer length for deep quality
 */
export const MIN_DEEP_ANSWER_LENGTH = 80;

/**
 * Maximum total questions before considering framing complete
 */
export const MAX_TOTAL_QUESTIONS = 9;

/**
 * Understanding score threshold to pass framing
 */
export const UNDERSTANDING_THRESHOLD = 0.6;

// ============ Question Templates ============

interface QuestionTemplate {
  readonly category: ProblemFramingCategory;
  readonly templates: readonly string[];
  readonly followUps: readonly string[];
}

const QUESTION_TEMPLATES: readonly QuestionTemplate[] = [
  {
    category: 'INPUT_OUTPUT',
    templates: [
      'What exactly are you given as input?',
      'What format is the output expected in?',
      'How would you describe the relationship between input and output?',
    ],
    followUps: [
      'Can you be more specific about the data types?',
      'Are there any implicit constraints on the input format?',
      'What if the input has unexpected structure?',
    ],
  },
  {
    category: 'CONSTRAINTS',
    templates: [
      'What are the size constraints on the input?',
      'What performance requirements are implied?',
      'Are there any constraints on the values themselves?',
    ],
    followUps: [
      'How do these constraints affect your approach?',
      'What does this constraint tell you about acceptable time complexity?',
      'Why do you think this constraint was given?',
    ],
  },
  {
    category: 'EDGE_CASES',
    templates: [
      'What happens when the input is empty?',
      'What about single-element inputs?',
      'Are there any boundary conditions to consider?',
    ],
    followUps: [
      'How would your solution handle that case?',
      'Can you think of any other unusual inputs?',
      'What is the expected output for that edge case?',
    ],
  },
  {
    category: 'EXAMPLES',
    templates: [
      'Can you walk through the first example step by step?',
      'Why does the example produce that specific output?',
      'Can you create your own small example?',
    ],
    followUps: [
      'What made you choose those steps?',
      'Can you explain why that intermediate step is necessary?',
      'How would this change with different input?',
    ],
  },
  {
    category: 'CLARIFICATION',
    templates: [
      'Is there anything in the problem statement that is unclear?',
      'What assumptions are you making about the problem?',
      'Are there multiple valid interpretations of the problem?',
    ],
    followUps: [
      'Why do you think that assumption is safe?',
      'What if that assumption is wrong?',
      'How would you verify your interpretation?',
    ],
  },
  {
    category: 'RESTATEMENT',
    templates: [
      'In your own words, what is the core task?',
      'Can you summarize what makes this problem challenging?',
      'What is the fundamental question being asked?',
    ],
    followUps: [
      'What did you leave out of that summary?',
      'Is there a simpler way to state the problem?',
      'What is the key insight needed to solve this?',
    ],
  },
];

// ============ Answer Quality Assessment ============

/**
 * Filler phrases that indicate shallow understanding
 */
const FILLER_PHRASES = [
  'i think',
  'maybe',
  'probably',
  'i guess',
  'not sure',
  'something like',
  'idk',
  'dont know',
  "don't know",
  'whatever',
  'etc',
  'stuff',
  'things',
];

/**
 * Keywords that indicate engagement with the problem
 */
const ENGAGEMENT_KEYWORDS = [
  'because',
  'therefore',
  'since',
  'given',
  'means',
  'implies',
  'ensures',
  'guarantees',
  'requires',
  'constraint',
  'boundary',
  'edge case',
  'example',
  'when',
  'if',
];

/**
 * Assess the quality of an answer
 */
export function assessAnswerQuality(
  answer: string,
  question: string,
  _category: ProblemFramingCategory
): AnswerQuality {
  const trimmed = answer.trim();
  const normalized = trimmed.toLowerCase();

  // Check for filler content
  const fillerCount = FILLER_PHRASES.filter(phrase =>
    normalized.includes(phrase)
  ).length;

  // Check for engagement keywords
  const engagementCount = ENGAGEMENT_KEYWORDS.filter(keyword =>
    normalized.includes(keyword)
  ).length;

  // Length-based initial assessment
  if (trimmed.length < MIN_ADEQUATE_ANSWER_LENGTH) {
    return 'SHALLOW';
  }

  // High filler ratio indicates shallow understanding
  if (fillerCount >= 3) {
    return 'SHALLOW';
  }

  // Good engagement with substance indicates deep understanding
  if (trimmed.length >= MIN_DEEP_ANSWER_LENGTH && engagementCount >= 2) {
    return 'DEEP';
  }

  // Moderate length with some engagement is adequate
  if (engagementCount >= 1) {
    return 'ADEQUATE';
  }

  return 'SHALLOW';
}

// ============ Question Generation ============

/**
 * Generate initial framing questions for a problem
 */
export function generateInitialQuestions(
  problem: Problem,
  askedCategories: readonly ProblemFramingCategory[] = []
): readonly ProblemFramingQuestion[] {
  const questions: ProblemFramingQuestion[] = [];
  const usedCategories = new Set(askedCategories);

  // Prioritize categories that haven't been asked
  const prioritizedTemplates = QUESTION_TEMPLATES.filter(
    t => !usedCategories.has(t.category)
  );

  // Select questions from different categories
  const categoriesToUse = prioritizedTemplates.slice(0, MAX_QUESTIONS_PER_BATCH);

  for (const template of categoriesToUse) {
    // Select a question from the template
    const questionText = selectQuestion(template.templates, problem);
    questions.push({
      id: `framing-${Date.now()}-${questions.length}`,
      question: questionText,
      category: template.category,
      userAnswer: null,
      answerQuality: null,
      followUpQuestion: null,
      timestamp: new Date(),
    });
  }

  return questions;
}

/**
 * Generate follow-up questions based on shallow answers
 */
export function generateFollowUpQuestions(
  shallowAnswers: readonly ProblemFramingQuestion[],
  _problem: Problem
): readonly string[] {
  const followUps: string[] = [];

  for (const answered of shallowAnswers) {
    if (answered.answerQuality !== 'SHALLOW') continue;

    const template = QUESTION_TEMPLATES.find(t => t.category === answered.category);
    if (template && template.followUps.length > 0) {
      // Select a follow-up question using seeded random
      const followUp = selectRandom(template.followUps);
      if (followUp) {
        followUps.push(followUp);
      }
    }
  }

  return followUps.slice(0, MAX_QUESTIONS_PER_BATCH);
}

/**
 * Select an appropriate question from templates
 */
function selectQuestion(templates: readonly string[], _problem: Problem): string {
  // Use seeded random for deterministic behavior in tests
  // In LLM mode, this would be context-aware
  return selectRandom(templates) ?? templates[0] ?? '';
}

// ============ Framing Validation ============

/**
 * Calculate understanding score from answered questions
 */
export function calculateUnderstandingScore(
  questions: readonly ProblemFramingQuestion[]
): number {
  const answered = questions.filter(q => q.answerQuality !== null);
  if (answered.length === 0) return 0;

  const qualityScores: Record<AnswerQuality, number> = {
    SHALLOW: 0.2,
    ADEQUATE: 0.6,
    DEEP: 1.0,
  };

  const total = answered.reduce((sum, q) => {
    return sum + (qualityScores[q.answerQuality!] ?? 0);
  }, 0);

  return total / answered.length;
}

/**
 * Check if framing is complete
 */
export function isFramingComplete(data: ProblemFramingData): boolean {
  // Complete if understanding score meets threshold
  if (data.understandingScore >= UNDERSTANDING_THRESHOLD) {
    return true;
  }

  // Complete if max questions reached
  if (data.questions.length >= MAX_TOTAL_QUESTIONS) {
    return true;
  }

  // Check if all categories have been adequately covered
  const coveredCategories = new Set<ProblemFramingCategory>();
  for (const q of data.questions) {
    if (q.answerQuality === 'ADEQUATE' || q.answerQuality === 'DEEP') {
      coveredCategories.add(q.category);
    }
  }

  // Need at least 3 categories covered adequately
  return coveredCategories.size >= 3;
}

// ============ Problem Framing Validator ============

export interface ProblemFramingInput {
  readonly problem: Problem;
  readonly questionId: string;
  readonly answer: string;
}

export interface ProblemFramingResult {
  readonly question: ProblemFramingQuestion;
  readonly quality: AnswerQuality;
  readonly followUp: string | null;
  readonly understandingScore: number;
  readonly isComplete: boolean;
  readonly nextQuestions: readonly string[];
}

/**
 * Process a user's answer to a framing question
 */
export function processFramingAnswer(
  input: ProblemFramingInput,
  currentData: ProblemFramingData
): ProblemFramingResult {
  // Find the question being answered
  const questionIndex = currentData.questions.findIndex(q => q.id === input.questionId);
  if (questionIndex === -1) {
    throw new Error(`Question not found: ${input.questionId}`);
  }

  const question = currentData.questions[questionIndex]!;
  const quality = assessAnswerQuality(input.answer, question.question, question.category);

  // Generate follow-up if answer is shallow
  let followUp: string | null = null;
  if (quality === 'SHALLOW') {
    const template = QUESTION_TEMPLATES.find(t => t.category === question.category);
    if (template && template.followUps.length > 0) {
      followUp = selectRandom(template.followUps) ?? null;
    }
  }

  // Update the question with the answer
  const updatedQuestion: ProblemFramingQuestion = {
    ...question,
    userAnswer: input.answer,
    answerQuality: quality,
    followUpQuestion: followUp,
  };

  // Calculate new understanding score
  const updatedQuestions = [
    ...currentData.questions.slice(0, questionIndex),
    updatedQuestion,
    ...currentData.questions.slice(questionIndex + 1),
  ];
  const understandingScore = calculateUnderstandingScore(updatedQuestions);

  // Determine if complete
  const updatedData: ProblemFramingData = {
    ...currentData,
    questions: updatedQuestions,
    understandingScore,
    isComplete: false, // Will be set properly below
  };

  const isComplete = isFramingComplete(updatedData);

  // Generate next questions if not complete
  let nextQuestions: readonly string[] = [];
  if (!isComplete) {
    // If there are shallow answers, generate follow-ups
    const shallowQuestions = updatedQuestions.filter(q => q.answerQuality === 'SHALLOW');
    if (shallowQuestions.length > 0) {
      nextQuestions = generateFollowUpQuestions(shallowQuestions, input.problem);
    }

    // If no follow-ups, generate new questions
    if (nextQuestions.length === 0) {
      const askedCategories = updatedQuestions.map(q => q.category);
      const newQuestions = generateInitialQuestions(input.problem, askedCategories);
      nextQuestions = newQuestions.map(q => q.question);
    }
  }

  return {
    question: updatedQuestion,
    quality,
    followUp,
    understandingScore,
    isComplete,
    nextQuestions,
  };
}

// ============ Coach Response Generation ============

/**
 * Generate a coach response for problem framing
 */
export function generateFramingResponse(
  result: ProblemFramingResult,
  totalQuestions: number
): CoachResponse {
  if (result.isComplete) {
    return {
      type: 'NEXT_STAGE',
      content: result.understandingScore >= UNDERSTANDING_THRESHOLD
        ? 'Good understanding demonstrated. Ready to discuss approach.'
        : 'Let us move forward. You can always revisit the problem statement.',
      questions: [],
      helpLevel: null,
      nextAction: 'ADVANCE',
      metadata: {
        stage: 'PROBLEM_FRAMING',
        attemptCount: totalQuestions,
        helpUsed: 0,
        timeElapsed: 0,
      },
    };
  }

  // Provide feedback based on answer quality
  let feedbackContent: string;
  switch (result.quality) {
    case 'DEEP':
      feedbackContent = 'Excellent thinking! That shows strong understanding.';
      break;
    case 'ADEQUATE':
      feedbackContent = 'Good. Let us continue exploring the problem.';
      break;
    case 'SHALLOW':
      feedbackContent = 'Let us dig deeper here.';
      break;
  }

  return {
    type: result.followUp ? 'QUESTION' : 'FEEDBACK',
    content: feedbackContent,
    questions: result.followUp
      ? [result.followUp]
      : result.nextQuestions.slice(0, MAX_QUESTIONS_PER_BATCH),
    helpLevel: null,
    nextAction: 'CONTINUE',
    metadata: {
      stage: 'PROBLEM_FRAMING',
      attemptCount: totalQuestions,
      helpUsed: 0,
      timeElapsed: 0,
    },
  };
}

// ============ Initial Data Factory ============

/**
 * Create initial problem framing data
 */
export function createInitialFramingData(problem: Problem): ProblemFramingData {
  const initialQuestions = generateInitialQuestions(problem);
  return {
    questions: initialQuestions,
    currentQuestionBatch: initialQuestions.map(q => q.question),
    isComplete: false,
    understandingScore: 0,
  };
}
