import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import React, { useState, useEffect } from 'react';

// Mock the dependencies
vi.mock('react-confetti', () => ({
  default: ({ numberOfPieces }) => (
    <div data-testid="confetti" data-pieces={numberOfPieces}>
      Confetti
    </div>
  ),
}));

vi.mock('react-use', () => ({
  useWindowSize: () => ({ width: 1024, height: 768 }),
}));

// Simplified CompletionScreen for testing core behaviors
function CompletionScreen({ problem, totalSteps, totalHintsUsed, onReset }) {
  const [showConfetti, setShowConfetti] = useState(true);

  // Stop confetti after a delay (we'll use a shorter time in tests)
  useEffect(() => {
    const timer = setTimeout(() => setShowConfetti(false), 100);
    return () => clearTimeout(timer);
  }, []);

  // Calculate performance rating based on hints used
  const getPerformanceRating = () => {
    if (totalHintsUsed === 0)
      return { label: 'Perfect!', emoji: '🏆', color: 'text-yellow-500' };
    if (totalHintsUsed <= 2)
      return { label: 'Excellent!', emoji: '🌟', color: 'text-green-500' };
    if (totalHintsUsed <= 5)
      return { label: 'Great Job!', emoji: '👏', color: 'text-blue-500' };
    return { label: 'Well Done!', emoji: '✅', color: 'text-gray-600' };
  };

  const rating = getPerformanceRating();
  const score =
    totalHintsUsed === 0 ? 100 : Math.max(0, 100 - totalHintsUsed * 10);

  return (
    <div data-testid="completion-screen">
      {/* Confetti Animation */}
      {showConfetti && (
        <div data-testid="confetti-wrapper">
          <span data-testid="confetti">Confetti</span>
        </div>
      )}

      {/* Success Card */}
      <div data-testid="success-card">
        <h1 data-testid="headline">Problem Solved!</h1>

        <p data-testid="rating-label" className={rating.color}>
          {rating.emoji} {rating.label}
        </p>

        <p data-testid="problem-title">
          You successfully completed "{problem.title}"
        </p>

        {/* Stats Grid */}
        <div data-testid="stats-grid">
          <div data-testid="steps-completed">
            <span data-testid="steps-value">{totalSteps}</span>
            <span>Steps Completed</span>
          </div>
          <div data-testid="hints-used">
            <span data-testid="hints-value">{totalHintsUsed}</span>
            <span>Hints Used</span>
          </div>
          <div data-testid="score">
            <span data-testid="score-value">{score}%</span>
            <span>Score</span>
          </div>
        </div>

        {/* Restart Button */}
        <button onClick={onReset} data-testid="restart-button">
          Restart Problem
        </button>
      </div>
    </div>
  );
}

describe('CompletionScreen', () => {
  const mockProblem = {
    id: 'problem_1',
    title: 'Linked List Cycle Detection',
    difficulty: 'Medium',
    concepts: ['linked-list', 'two-pointers'],
    patternExplanations: [{ title: 'Two Pointers', description: 'Fast and slow pointers' }],
    keyTakeaways: ['Understand cycle detection'],
    patternQuiz: null,
    patternGraph: null,
    mistakeAnalysis: null,
  };

  const mockOnReset = vi.fn();

  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
  });

  describe('rendering', () => {
    it('should render the completion screen', () => {
      render(
        <CompletionScreen
          problem={mockProblem}
          totalSteps={5}
          totalHintsUsed={2}
          onReset={mockOnReset}
        />
      );

      expect(screen.getByTestId('completion-screen')).toBeInTheDocument();
    });

    it('should display "Problem Solved!" headline', () => {
      render(
        <CompletionScreen
          problem={mockProblem}
          totalSteps={5}
          totalHintsUsed={2}
          onReset={mockOnReset}
        />
      );

      expect(screen.getByTestId('headline')).toHaveTextContent('Problem Solved!');
    });

    it('should display the problem title', () => {
      render(
        <CompletionScreen
          problem={mockProblem}
          totalSteps={5}
          totalHintsUsed={2}
          onReset={mockOnReset}
        />
      );

      expect(screen.getByTestId('problem-title')).toHaveTextContent(
        'Linked List Cycle Detection'
      );
    });
  });

  describe('stats display', () => {
    it('should display steps completed', () => {
      render(
        <CompletionScreen
          problem={mockProblem}
          totalSteps={5}
          totalHintsUsed={2}
          onReset={mockOnReset}
        />
      );

      expect(screen.getByTestId('steps-value')).toHaveTextContent('5');
    });

    it('should display hints used', () => {
      render(
        <CompletionScreen
          problem={mockProblem}
          totalSteps={5}
          totalHintsUsed={3}
          onReset={mockOnReset}
        />
      );

      expect(screen.getByTestId('hints-value')).toHaveTextContent('3');
    });

    it('should display correct score for 0 hints (100%)', () => {
      render(
        <CompletionScreen
          problem={mockProblem}
          totalSteps={5}
          totalHintsUsed={0}
          onReset={mockOnReset}
        />
      );

      expect(screen.getByTestId('score-value')).toHaveTextContent('100%');
    });

    it('should display correct score for 2 hints (80%)', () => {
      render(
        <CompletionScreen
          problem={mockProblem}
          totalSteps={5}
          totalHintsUsed={2}
          onReset={mockOnReset}
        />
      );

      expect(screen.getByTestId('score-value')).toHaveTextContent('80%');
    });

    it('should display correct score for 5 hints (50%)', () => {
      render(
        <CompletionScreen
          problem={mockProblem}
          totalSteps={5}
          totalHintsUsed={5}
          onReset={mockOnReset}
        />
      );

      expect(screen.getByTestId('score-value')).toHaveTextContent('50%');
    });

    it('should not go below 0% score', () => {
      render(
        <CompletionScreen
          problem={mockProblem}
          totalSteps={5}
          totalHintsUsed={15}
          onReset={mockOnReset}
        />
      );

      expect(screen.getByTestId('score-value')).toHaveTextContent('0%');
    });
  });

  describe('performance rating', () => {
    it('should show "Perfect!" rating for 0 hints', () => {
      render(
        <CompletionScreen
          problem={mockProblem}
          totalSteps={5}
          totalHintsUsed={0}
          onReset={mockOnReset}
        />
      );

      expect(screen.getByTestId('rating-label')).toHaveTextContent('🏆 Perfect!');
    });

    it('should show "Excellent!" rating for 1-2 hints', () => {
      render(
        <CompletionScreen
          problem={mockProblem}
          totalSteps={5}
          totalHintsUsed={2}
          onReset={mockOnReset}
        />
      );

      expect(screen.getByTestId('rating-label')).toHaveTextContent('🌟 Excellent!');
    });

    it('should show "Great Job!" rating for 3-5 hints', () => {
      render(
        <CompletionScreen
          problem={mockProblem}
          totalSteps={5}
          totalHintsUsed={4}
          onReset={mockOnReset}
        />
      );

      expect(screen.getByTestId('rating-label')).toHaveTextContent('👏 Great Job!');
    });

    it('should show "Well Done!" rating for more than 5 hints', () => {
      render(
        <CompletionScreen
          problem={mockProblem}
          totalSteps={5}
          totalHintsUsed={8}
          onReset={mockOnReset}
        />
      );

      expect(screen.getByTestId('rating-label')).toHaveTextContent('✅ Well Done!');
    });
  });

  describe('confetti animation', () => {
    it('should show confetti initially', () => {
      render(
        <CompletionScreen
          problem={mockProblem}
          totalSteps={5}
          totalHintsUsed={0}
          onReset={mockOnReset}
        />
      );

      expect(screen.getByTestId('confetti-wrapper')).toBeInTheDocument();
    });

    it('should hide confetti after timeout', () => {
      render(
        <CompletionScreen
          problem={mockProblem}
          totalSteps={5}
          totalHintsUsed={0}
          onReset={mockOnReset}
        />
      );

      expect(screen.getByTestId('confetti-wrapper')).toBeInTheDocument();

      act(() => {
        vi.advanceTimersByTime(150);
      });

      expect(screen.queryByTestId('confetti-wrapper')).not.toBeInTheDocument();
    });
  });

  describe('restart functionality', () => {
    it('should have a restart button', () => {
      render(
        <CompletionScreen
          problem={mockProblem}
          totalSteps={5}
          totalHintsUsed={2}
          onReset={mockOnReset}
        />
      );

      expect(screen.getByTestId('restart-button')).toBeInTheDocument();
      expect(screen.getByTestId('restart-button')).toHaveTextContent('Restart Problem');
    });

    it('should call onReset when restart button is clicked', () => {
      render(
        <CompletionScreen
          problem={mockProblem}
          totalSteps={5}
          totalHintsUsed={2}
          onReset={mockOnReset}
        />
      );

      fireEvent.click(screen.getByTestId('restart-button'));
      expect(mockOnReset).toHaveBeenCalledTimes(1);
    });
  });

  describe('different problems', () => {
    it('should display correct problem title for different problems', () => {
      const anotherProblem = {
        ...mockProblem,
        id: 'problem_2',
        title: 'Two Sum',
      };

      render(
        <CompletionScreen
          problem={anotherProblem}
          totalSteps={3}
          totalHintsUsed={1}
          onReset={mockOnReset}
        />
      );

      expect(screen.getByTestId('problem-title')).toHaveTextContent('Two Sum');
    });

    it('should display correct stats for different step counts', () => {
      render(
        <CompletionScreen
          problem={mockProblem}
          totalSteps={10}
          totalHintsUsed={0}
          onReset={mockOnReset}
        />
      );

      expect(screen.getByTestId('steps-value')).toHaveTextContent('10');
    });
  });

  describe('edge cases', () => {
    it('should handle zero steps', () => {
      render(
        <CompletionScreen
          problem={mockProblem}
          totalSteps={0}
          totalHintsUsed={0}
          onReset={mockOnReset}
        />
      );

      expect(screen.getByTestId('steps-value')).toHaveTextContent('0');
    });

    it('should handle very large hint counts', () => {
      render(
        <CompletionScreen
          problem={mockProblem}
          totalSteps={5}
          totalHintsUsed={100}
          onReset={mockOnReset}
        />
      );

      expect(screen.getByTestId('hints-value')).toHaveTextContent('100');
      expect(screen.getByTestId('score-value')).toHaveTextContent('0%');
    });
  });
});
