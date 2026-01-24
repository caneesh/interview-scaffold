'use client';

import type { DebugPatternCategory, Difficulty } from './types';
import { getCategoryDisplayName, getDifficultyDisplayName, getDifficultyColor } from './types';

interface DebugScenarioCardProps {
  scenario: {
    id: string;
    category: DebugPatternCategory;
    difficulty: Difficulty;
    symptomDescription: string;
    tags: readonly string[];
  };
  onStart: (id: string) => void;
}

export function DebugScenarioCard({ scenario, onStart }: DebugScenarioCardProps) {
  return (
    <div className="debug-scenario-card">
      <div className="debug-scenario-header">
        <span className="debug-scenario-category">
          {getCategoryDisplayName(scenario.category)}
        </span>
        <span
          className="debug-scenario-difficulty"
          style={{ color: getDifficultyColor(scenario.difficulty) }}
        >
          {getDifficultyDisplayName(scenario.difficulty)}
        </span>
      </div>

      <p className="debug-scenario-symptom">{scenario.symptomDescription}</p>

      {scenario.tags.length > 0 && (
        <div className="debug-scenario-tags">
          {scenario.tags.map((tag) => (
            <span key={tag} className="debug-scenario-tag">
              {tag}
            </span>
          ))}
        </div>
      )}

      <button
        className="btn btn-primary debug-scenario-cta"
        onClick={() => onStart(scenario.id)}
      >
        Start Debug Session
      </button>
    </div>
  );
}
