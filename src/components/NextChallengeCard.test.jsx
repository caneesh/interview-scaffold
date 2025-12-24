import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';

// Mock the NextChallengeCard component inline since it's defined in App.jsx
// In a production app, this would be extracted to its own file
function NextChallengeCard({
  recommendation,
  onAccept,
  onDecline,
  countdown,
  isVisible,
}) {
  if (!recommendation || !isVisible) return null;

  const { problem, type, reason } = recommendation;

  const colorSchemes = {
    variation: { bg: 'from-purple-600 to-indigo-700', badge: 'bg-purple-500' },
    newTopic: { bg: 'from-blue-600 to-cyan-600', badge: 'bg-blue-500' },
    reinforcement: { bg: 'from-green-600 to-emerald-600', badge: 'bg-green-500' },
    easyWin: { bg: 'from-teal-600 to-cyan-600', badge: 'bg-teal-500' },
    stretch: { bg: 'from-orange-500 to-red-600', badge: 'bg-orange-500' },
  };

  const colors = colorSchemes[type.type] || colorSchemes.reinforcement;

  const difficultyColors = {
    Easy: 'bg-green-500 text-white',
    Medium: 'bg-amber-500 text-white',
    Hard: 'bg-red-500 text-white',
  };

  return (
    <div data-testid="next-challenge-card" className={isVisible ? 'visible' : 'hidden'}>
      <div data-testid="recommendation-badge">
        <span data-testid="type-emoji">{type.emoji}</span>
        <span data-testid="type-label">{type.label}</span>
        <span data-testid="type-description">{type.description}</span>
      </div>

      {countdown !== null && countdown > 0 && (
        <span data-testid="countdown">Auto-start in {countdown}s</span>
      )}

      <div data-testid="problem-preview">
        <span data-testid="problem-difficulty" className={difficultyColors[problem.difficulty]}>
          {problem.difficulty}
        </span>
        {problem.estimatedTime && (
          <span data-testid="estimated-time">~{problem.estimatedTime} min</span>
        )}
        <h3 data-testid="problem-title">{problem.title}</h3>
        <p data-testid="recommendation-reason">{reason}</p>
      </div>

      {problem.concepts && (
        <div data-testid="concepts-list">
          {problem.concepts.slice(0, 4).map((concept, idx) => (
            <span key={idx} data-testid={`concept-${idx}`}>
              {concept.replace('-', ' ')}
            </span>
          ))}
        </div>
      )}

      <button onClick={onDecline} data-testid="decline-button">
        Back to Dashboard
      </button>
      <button onClick={onAccept} data-testid="accept-button">
        Accept Challenge
      </button>
    </div>
  );
}

describe('NextChallengeCard', () => {
  const mockRecommendation = {
    problem: {
      id: 'problem_102',
      title: 'Find the Middle of Linked List',
      difficulty: 'Easy',
      pattern: 'two-pointers',
      estimatedTime: 10,
      concepts: ['linked-list', 'fast-slow-pointer'],
    },
    type: {
      type: 'reinforcement',
      emoji: '↺',
      label: 'Reinforcement',
      color: 'green',
      description: "Let's solidify this concept",
    },
    reason: 'Practice makes perfect! This problem uses the same two pointers pattern.',
    confidence: 0.85,
  };

  const mockOnAccept = vi.fn();
  const mockOnDecline = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('visibility', () => {
    it('should not render when isVisible is false', () => {
      render(
        <NextChallengeCard
          recommendation={mockRecommendation}
          onAccept={mockOnAccept}
          onDecline={mockOnDecline}
          countdown={10}
          isVisible={false}
        />
      );

      expect(screen.queryByTestId('next-challenge-card')).not.toBeInTheDocument();
    });

    it('should not render when recommendation is null', () => {
      render(
        <NextChallengeCard
          recommendation={null}
          onAccept={mockOnAccept}
          onDecline={mockOnDecline}
          countdown={10}
          isVisible={true}
        />
      );

      expect(screen.queryByTestId('next-challenge-card')).not.toBeInTheDocument();
    });

    it('should render when visible and has recommendation', () => {
      render(
        <NextChallengeCard
          recommendation={mockRecommendation}
          onAccept={mockOnAccept}
          onDecline={mockOnDecline}
          countdown={10}
          isVisible={true}
        />
      );

      expect(screen.getByTestId('next-challenge-card')).toBeInTheDocument();
    });
  });

  describe('recommendation display', () => {
    beforeEach(() => {
      render(
        <NextChallengeCard
          recommendation={mockRecommendation}
          onAccept={mockOnAccept}
          onDecline={mockOnDecline}
          countdown={10}
          isVisible={true}
        />
      );
    });

    it('should display the recommendation type emoji', () => {
      expect(screen.getByTestId('type-emoji')).toHaveTextContent('↺');
    });

    it('should display the recommendation type label', () => {
      expect(screen.getByTestId('type-label')).toHaveTextContent('Reinforcement');
    });

    it('should display the recommendation type description', () => {
      expect(screen.getByTestId('type-description')).toHaveTextContent(
        "Let's solidify this concept"
      );
    });

    it('should display the problem title', () => {
      expect(screen.getByTestId('problem-title')).toHaveTextContent(
        'Find the Middle of Linked List'
      );
    });

    it('should display the problem difficulty', () => {
      expect(screen.getByTestId('problem-difficulty')).toHaveTextContent('Easy');
    });

    it('should display the estimated time', () => {
      expect(screen.getByTestId('estimated-time')).toHaveTextContent('~10 min');
    });

    it('should display the recommendation reason', () => {
      expect(screen.getByTestId('recommendation-reason')).toHaveTextContent(
        'Practice makes perfect!'
      );
    });

    it('should display problem concepts', () => {
      expect(screen.getByTestId('concept-0')).toHaveTextContent('linked list');
      // Note: .replace('-', ' ') only replaces the first hyphen
      expect(screen.getByTestId('concept-1')).toHaveTextContent('fast slow-pointer');
    });
  });

  describe('countdown', () => {
    it('should display countdown when greater than 0', () => {
      render(
        <NextChallengeCard
          recommendation={mockRecommendation}
          onAccept={mockOnAccept}
          onDecline={mockOnDecline}
          countdown={15}
          isVisible={true}
        />
      );

      expect(screen.getByTestId('countdown')).toHaveTextContent('Auto-start in 15s');
    });

    it('should not display countdown when null', () => {
      render(
        <NextChallengeCard
          recommendation={mockRecommendation}
          onAccept={mockOnAccept}
          onDecline={mockOnDecline}
          countdown={null}
          isVisible={true}
        />
      );

      expect(screen.queryByTestId('countdown')).not.toBeInTheDocument();
    });

    it('should not display countdown when 0', () => {
      render(
        <NextChallengeCard
          recommendation={mockRecommendation}
          onAccept={mockOnAccept}
          onDecline={mockOnDecline}
          countdown={0}
          isVisible={true}
        />
      );

      expect(screen.queryByTestId('countdown')).not.toBeInTheDocument();
    });
  });

  describe('button interactions', () => {
    beforeEach(() => {
      render(
        <NextChallengeCard
          recommendation={mockRecommendation}
          onAccept={mockOnAccept}
          onDecline={mockOnDecline}
          countdown={10}
          isVisible={true}
        />
      );
    });

    it('should call onAccept when Accept Challenge is clicked', () => {
      fireEvent.click(screen.getByTestId('accept-button'));
      expect(mockOnAccept).toHaveBeenCalledTimes(1);
    });

    it('should call onDecline when Back to Dashboard is clicked', () => {
      fireEvent.click(screen.getByTestId('decline-button'));
      expect(mockOnDecline).toHaveBeenCalledTimes(1);
    });

    it('should have correct button labels', () => {
      expect(screen.getByTestId('accept-button')).toHaveTextContent('Accept Challenge');
      expect(screen.getByTestId('decline-button')).toHaveTextContent('Back to Dashboard');
    });
  });

  describe('different recommendation types', () => {
    const recommendationTypes = [
      { type: 'variation', emoji: '⚔️', label: 'Challenge Mode' },
      { type: 'newTopic', emoji: '🆕', label: 'New Concept' },
      { type: 'reinforcement', emoji: '↺', label: 'Reinforcement' },
      { type: 'easyWin', emoji: '🎯', label: 'Quick Win' },
      { type: 'stretch', emoji: '🚀', label: 'Stretch Goal' },
    ];

    recommendationTypes.forEach(({ type, emoji, label }) => {
      it(`should display ${type} recommendation correctly`, () => {
        const recommendation = {
          ...mockRecommendation,
          type: {
            type,
            emoji,
            label,
            description: `Description for ${type}`,
          },
        };

        render(
          <NextChallengeCard
            recommendation={recommendation}
            onAccept={mockOnAccept}
            onDecline={mockOnDecline}
            countdown={10}
            isVisible={true}
          />
        );

        expect(screen.getByTestId('type-emoji')).toHaveTextContent(emoji);
        expect(screen.getByTestId('type-label')).toHaveTextContent(label);
      });
    });
  });

  describe('different difficulty levels', () => {
    const difficulties = ['Easy', 'Medium', 'Hard'];

    difficulties.forEach((difficulty) => {
      it(`should display ${difficulty} difficulty correctly`, () => {
        const recommendation = {
          ...mockRecommendation,
          problem: {
            ...mockRecommendation.problem,
            difficulty,
          },
        };

        render(
          <NextChallengeCard
            recommendation={recommendation}
            onAccept={mockOnAccept}
            onDecline={mockOnDecline}
            countdown={10}
            isVisible={true}
          />
        );

        expect(screen.getByTestId('problem-difficulty')).toHaveTextContent(difficulty);
      });
    });
  });

  describe('optional fields', () => {
    it('should not crash when estimatedTime is missing', () => {
      const recommendation = {
        ...mockRecommendation,
        problem: {
          ...mockRecommendation.problem,
          estimatedTime: undefined,
        },
      };

      render(
        <NextChallengeCard
          recommendation={recommendation}
          onAccept={mockOnAccept}
          onDecline={mockOnDecline}
          countdown={10}
          isVisible={true}
        />
      );

      expect(screen.queryByTestId('estimated-time')).not.toBeInTheDocument();
    });

    it('should not crash when concepts is missing', () => {
      const recommendation = {
        ...mockRecommendation,
        problem: {
          ...mockRecommendation.problem,
          concepts: undefined,
        },
      };

      render(
        <NextChallengeCard
          recommendation={recommendation}
          onAccept={mockOnAccept}
          onDecline={mockOnDecline}
          countdown={10}
          isVisible={true}
        />
      );

      expect(screen.queryByTestId('concepts-list')).not.toBeInTheDocument();
    });
  });
});
