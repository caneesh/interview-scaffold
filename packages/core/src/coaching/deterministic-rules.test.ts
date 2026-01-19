/**
 * Tests for Deterministic Guidance Rules
 */

import { describe, it, expect } from 'vitest';
import {
  getDeterministicGuidance,
  ALL_DETERMINISTIC_RULES,
} from './deterministic-rules.js';
import type { DiagnosticEvidence } from '../entities/diagnostic-coach.js';

describe('Deterministic Guidance Rules', () => {
  describe('ALL_DETERMINISTIC_RULES', () => {
    it('should have rules for all stages', () => {
      const stages = new Set(ALL_DETERMINISTIC_RULES.map(r => r.stage));
      expect(stages).toContain('TRIAGE');
      expect(stages).toContain('REPRODUCE');
      expect(stages).toContain('LOCALIZE');
      expect(stages).toContain('HYPOTHESIZE');
      expect(stages).toContain('FIX');
      expect(stages).toContain('VERIFY');
      expect(stages).toContain('POSTMORTEM');
    });

    it('should have unique IDs', () => {
      const ids = ALL_DETERMINISTIC_RULES.map(r => r.id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(ids.length);
    });

    it('all rules should have non-empty questions', () => {
      for (const rule of ALL_DETERMINISTIC_RULES) {
        expect(rule.questions.length).toBeGreaterThan(0);
      }
    });
  });

  describe('getDeterministicGuidance', () => {
    describe('TRIAGE stage', () => {
      it('should return triage-no-evidence when no evidence', () => {
        const result = getDeterministicGuidance('TRIAGE', {});
        expect(result.ruleId).toBe('triage-no-evidence');
        expect(result.guidance).toContain('classifying the defect');
      });

      it('should return triage-complete when fully triaged', () => {
        const evidence: DiagnosticEvidence = {
          triage: {
            defectCategory: 'functional',
            severity: 'high',
            priority: 'urgent',
            observations: 'Test failure',
            timestamp: new Date(),
          },
        };
        const result = getDeterministicGuidance('TRIAGE', evidence);
        expect(result.ruleId).toBe('triage-complete');
        expect(result.guidance).toContain('complete');
      });
    });

    describe('REPRODUCE stage', () => {
      it('should return reproduce-no-evidence when no reproduction', () => {
        const result = getDeterministicGuidance('REPRODUCE', {});
        expect(result.ruleId).toBe('reproduce-no-evidence');
        expect(result.guidance).toContain('deterministic way to reproduce');
      });

      it('should return reproduce-intermittent for intermittent bugs', () => {
        const evidence: DiagnosticEvidence = {
          reproduction: {
            steps: ['Run test'],
            isDeterministic: false,
            timestamp: new Date(),
          },
        };
        const result = getDeterministicGuidance('REPRODUCE', evidence);
        expect(result.ruleId).toBe('reproduce-intermittent');
        expect(result.guidance).toContain('Intermittent');
      });

      it('should return reproduce-complete when deterministic with command', () => {
        const evidence: DiagnosticEvidence = {
          reproduction: {
            steps: ['Run test', 'Observe failure'],
            isDeterministic: true,
            reproCommand: 'npm test',
            timestamp: new Date(),
          },
        };
        const result = getDeterministicGuidance('REPRODUCE', evidence);
        expect(result.ruleId).toBe('reproduce-complete');
      });

      it('should suggest adding command when steps exist but no command', () => {
        const evidence: DiagnosticEvidence = {
          reproduction: {
            steps: ['Run test', 'Observe failure'],
            isDeterministic: true,
            timestamp: new Date(),
          },
        };
        const result = getDeterministicGuidance('REPRODUCE', evidence);
        expect(result.ruleId).toBe('reproduce-no-command');
        expect(result.guidance).toContain('automate');
      });
    });

    describe('LOCALIZE stage', () => {
      it('should suggest narrowing when too many files', () => {
        const evidence: DiagnosticEvidence = {
          localization: {
            suspectedFiles: ['a.ts', 'b.ts', 'c.ts', 'd.ts', 'e.ts', 'f.ts'],
            suspectedFunctions: [],
            timestamp: new Date(),
          },
        };
        const result = getDeterministicGuidance('LOCALIZE', evidence);
        expect(result.ruleId).toBe('localize-too-broad');
        expect(result.guidance).toContain('narrow down');
      });

      it('should leverage stack trace when available', () => {
        const evidence: DiagnosticEvidence = {
          localization: {
            suspectedFiles: ['a.ts'],
            suspectedFunctions: [],
            stackTrace: 'Error at line 10',
            timestamp: new Date(),
          },
        };
        const result = getDeterministicGuidance('LOCALIZE', evidence);
        expect(result.ruleId).toBe('localize-has-stack-trace');
        expect(result.guidance).toContain('stack trace');
      });
    });

    describe('HYPOTHESIZE stage', () => {
      it('should prompt to test untested hypotheses', () => {
        const evidence: DiagnosticEvidence = {
          hypotheses: [
            { id: '1', hypothesis: 'Off-by-one', testMethod: 'Log', status: 'untested', timestamp: new Date() },
          ],
        };
        const result = getDeterministicGuidance('HYPOTHESIZE', evidence);
        expect(result.ruleId).toBe('hypothesize-untested');
      });

      it('should suggest re-thinking when all rejected', () => {
        const evidence: DiagnosticEvidence = {
          hypotheses: [
            { id: '1', hypothesis: 'Off-by-one', testMethod: 'Log', status: 'rejected', timestamp: new Date() },
          ],
        };
        const result = getDeterministicGuidance('HYPOTHESIZE', evidence);
        expect(result.ruleId).toBe('hypothesize-all-rejected');
        expect(result.guidance).toContain('think differently');
      });

      it('should prompt fix when hypothesis confirmed', () => {
        const evidence: DiagnosticEvidence = {
          hypotheses: [
            { id: '1', hypothesis: 'Off-by-one', testMethod: 'Log', status: 'confirmed', timestamp: new Date() },
          ],
        };
        const result = getDeterministicGuidance('HYPOTHESIZE', evidence);
        expect(result.ruleId).toBe('hypothesize-confirmed');
        expect(result.guidance).toContain('implement the fix');
      });
    });

    describe('FIX stage', () => {
      it('should analyze failed fix attempts', () => {
        const evidence: DiagnosticEvidence = {
          fixAttempts: [
            { id: '1', hypothesisId: '1', approach: 'Fix bounds', filesModified: ['a.ts'], testsPassed: false, timestamp: new Date() },
          ],
        };
        const result = getDeterministicGuidance('FIX', evidence);
        expect(result.ruleId).toBe('fix-failed-attempt');
        expect(result.guidance).toContain("didn't work");
      });

      it('should move to verify when tests pass', () => {
        const evidence: DiagnosticEvidence = {
          fixAttempts: [
            { id: '1', hypothesisId: '1', approach: 'Fix bounds', filesModified: ['a.ts'], testsPassed: true, timestamp: new Date() },
          ],
        };
        const result = getDeterministicGuidance('FIX', evidence);
        expect(result.ruleId).toBe('fix-tests-pass');
        expect(result.guidance).toContain('verify');
      });
    });

    describe('VERIFY stage', () => {
      it('should prompt edge case verification', () => {
        const evidence: DiagnosticEvidence = {
          verification: {
            visibleTestsPassed: true,
            edgeCasesChecked: [],
            regressionTestsPassed: true,
            timestamp: new Date(),
          },
        };
        const result = getDeterministicGuidance('VERIFY', evidence);
        expect(result.ruleId).toBe('verify-no-edge-cases');
        expect(result.questions).toContain('What happens with empty input?');
      });

      it('should send back to fix when visible tests fail', () => {
        const evidence: DiagnosticEvidence = {
          verification: {
            visibleTestsPassed: false,
            edgeCasesChecked: [],
            regressionTestsPassed: false,
            timestamp: new Date(),
          },
        };
        const result = getDeterministicGuidance('VERIFY', evidence);
        expect(result.ruleId).toBe('verify-visible-fail');
        expect(result.guidance).toContain('failing');
      });
    });

    describe('POSTMORTEM stage', () => {
      it('should always return postmortem-start', () => {
        const result = getDeterministicGuidance('POSTMORTEM', {});
        expect(result.ruleId).toBe('postmortem-start');
        expect(result.guidance).toContain('Reflect');
        expect(result.questions).toContain('What was the root cause of the bug?');
      });
    });
  });
});
