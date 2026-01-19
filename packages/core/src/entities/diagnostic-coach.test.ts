/**
 * Tests for Diagnostic Coach entities
 */

import { describe, it, expect } from 'vitest';
import {
  DIAGNOSTIC_STAGES,
  STAGE_TRANSITIONS,
  canTransitionTo,
  isStageComplete,
  getRecommendedNextStage,
  createDiagnosticSession,
  transitionStage,
  addEvidence,
  addGuidanceEntry,
  type DiagnosticEvidence,
} from './diagnostic-coach.js';

describe('Diagnostic Coach Entities', () => {
  describe('DIAGNOSTIC_STAGES', () => {
    it('should have 7 stages in correct order', () => {
      expect(DIAGNOSTIC_STAGES).toEqual([
        'TRIAGE',
        'REPRODUCE',
        'LOCALIZE',
        'HYPOTHESIZE',
        'FIX',
        'VERIFY',
        'POSTMORTEM',
      ]);
    });
  });

  describe('STAGE_TRANSITIONS', () => {
    it('should allow forward progression from TRIAGE', () => {
      expect(STAGE_TRANSITIONS.TRIAGE).toContain('REPRODUCE');
    });

    it('should allow backward regression for re-evaluation', () => {
      expect(STAGE_TRANSITIONS.REPRODUCE).toContain('TRIAGE');
      expect(STAGE_TRANSITIONS.LOCALIZE).toContain('REPRODUCE');
      expect(STAGE_TRANSITIONS.HYPOTHESIZE).toContain('LOCALIZE');
      expect(STAGE_TRANSITIONS.FIX).toContain('HYPOTHESIZE');
      expect(STAGE_TRANSITIONS.VERIFY).toContain('FIX');
    });

    it('should have POSTMORTEM as terminal state', () => {
      expect(STAGE_TRANSITIONS.POSTMORTEM).toEqual([]);
    });
  });

  describe('canTransitionTo', () => {
    it('should return true for valid transitions', () => {
      expect(canTransitionTo('TRIAGE', 'REPRODUCE')).toBe(true);
      expect(canTransitionTo('REPRODUCE', 'LOCALIZE')).toBe(true);
      expect(canTransitionTo('VERIFY', 'POSTMORTEM')).toBe(true);
    });

    it('should return false for invalid transitions', () => {
      expect(canTransitionTo('TRIAGE', 'LOCALIZE')).toBe(false);
      expect(canTransitionTo('TRIAGE', 'POSTMORTEM')).toBe(false);
      expect(canTransitionTo('POSTMORTEM', 'TRIAGE')).toBe(false);
    });

    it('should allow going backward', () => {
      expect(canTransitionTo('FIX', 'HYPOTHESIZE')).toBe(true);
      expect(canTransitionTo('VERIFY', 'FIX')).toBe(true);
    });
  });

  describe('isStageComplete', () => {
    const emptyEvidence: DiagnosticEvidence = {};

    it('TRIAGE is complete when category, severity, and priority are set', () => {
      expect(isStageComplete('TRIAGE', emptyEvidence)).toBe(false);

      const completeTriageEvidence: DiagnosticEvidence = {
        triage: {
          defectCategory: 'functional',
          severity: 'high',
          priority: 'urgent',
          observations: 'Test failure',
          timestamp: new Date(),
        },
      };
      expect(isStageComplete('TRIAGE', completeTriageEvidence)).toBe(true);
    });

    it('REPRODUCE is complete when steps exist and determinism is known', () => {
      expect(isStageComplete('REPRODUCE', emptyEvidence)).toBe(false);

      const reproEvidence: DiagnosticEvidence = {
        reproduction: {
          steps: ['Run test', 'Observe failure'],
          isDeterministic: true,
          timestamp: new Date(),
        },
      };
      expect(isStageComplete('REPRODUCE', reproEvidence)).toBe(true);
    });

    it('LOCALIZE is complete when suspected files or functions exist', () => {
      expect(isStageComplete('LOCALIZE', emptyEvidence)).toBe(false);

      const localizeEvidence: DiagnosticEvidence = {
        localization: {
          suspectedFiles: ['src/module.ts'],
          suspectedFunctions: [],
          timestamp: new Date(),
        },
      };
      expect(isStageComplete('LOCALIZE', localizeEvidence)).toBe(true);
    });

    it('HYPOTHESIZE is complete when there is a non-rejected hypothesis', () => {
      expect(isStageComplete('HYPOTHESIZE', emptyEvidence)).toBe(false);

      const hypothesisEvidence: DiagnosticEvidence = {
        hypotheses: [
          { id: '1', hypothesis: 'Off-by-one error', testMethod: 'Log values', status: 'confirmed', timestamp: new Date() },
        ],
      };
      expect(isStageComplete('HYPOTHESIZE', hypothesisEvidence)).toBe(true);

      const allRejectedEvidence: DiagnosticEvidence = {
        hypotheses: [
          { id: '1', hypothesis: 'Off-by-one', testMethod: 'Log', status: 'rejected', timestamp: new Date() },
        ],
      };
      expect(isStageComplete('HYPOTHESIZE', allRejectedEvidence)).toBe(false);
    });

    it('FIX is complete when a fix attempt passed tests', () => {
      expect(isStageComplete('FIX', emptyEvidence)).toBe(false);

      const fixPassedEvidence: DiagnosticEvidence = {
        fixAttempts: [
          { id: '1', hypothesisId: '1', approach: 'Fix bounds', filesModified: ['src/mod.ts'], testsPassed: true, timestamp: new Date() },
        ],
      };
      expect(isStageComplete('FIX', fixPassedEvidence)).toBe(true);

      const fixFailedEvidence: DiagnosticEvidence = {
        fixAttempts: [
          { id: '1', hypothesisId: '1', approach: 'Fix bounds', filesModified: ['src/mod.ts'], testsPassed: false, timestamp: new Date() },
        ],
      };
      expect(isStageComplete('FIX', fixFailedEvidence)).toBe(false);
    });

    it('VERIFY is complete when visible and regression tests pass', () => {
      expect(isStageComplete('VERIFY', emptyEvidence)).toBe(false);

      const verifyEvidence: DiagnosticEvidence = {
        verification: {
          visibleTestsPassed: true,
          edgeCasesChecked: ['empty input'],
          regressionTestsPassed: true,
          timestamp: new Date(),
        },
      };
      expect(isStageComplete('VERIFY', verifyEvidence)).toBe(true);
    });

    it('POSTMORTEM is always complete', () => {
      expect(isStageComplete('POSTMORTEM', emptyEvidence)).toBe(true);
    });
  });

  describe('getRecommendedNextStage', () => {
    it('should recommend forward progress when stage is complete', () => {
      const completeTriageEvidence: DiagnosticEvidence = {
        triage: {
          defectCategory: 'functional',
          severity: 'high',
          priority: 'urgent',
          observations: 'Test failure',
          timestamp: new Date(),
        },
      };
      expect(getRecommendedNextStage('TRIAGE', completeTriageEvidence)).toBe('REPRODUCE');
    });

    it('should return null when stage is not complete', () => {
      expect(getRecommendedNextStage('TRIAGE', {})).toBeNull();
    });

    it('should return null for terminal stage', () => {
      expect(getRecommendedNextStage('POSTMORTEM', {})).toBeNull();
    });
  });

  describe('createDiagnosticSession', () => {
    it('should create a session in TRIAGE stage', () => {
      const session = createDiagnosticSession(
        'session-1',
        'attempt-1',
        'tenant-1',
        'user-1',
        true
      );

      expect(session.id).toBe('session-1');
      expect(session.attemptId).toBe('attempt-1');
      expect(session.tenantId).toBe('tenant-1');
      expect(session.userId).toBe('user-1');
      expect(session.currentStage).toBe('TRIAGE');
      expect(session.aiEnabled).toBe(true);
      expect(session.stageHistory).toHaveLength(1);
      expect(session.stageHistory[0].from).toBeNull();
      expect(session.stageHistory[0].to).toBe('TRIAGE');
      expect(session.evidence).toEqual({});
      expect(session.aiGuidance).toEqual([]);
    });

    it('should create session with AI disabled', () => {
      const session = createDiagnosticSession(
        'session-2',
        'attempt-2',
        'tenant-1',
        'user-1',
        false
      );

      expect(session.aiEnabled).toBe(false);
    });
  });

  describe('transitionStage', () => {
    it('should transition to valid next stage', () => {
      const session = createDiagnosticSession('s1', 'a1', 't1', 'u1', true);
      const newSession = transitionStage(session, 'REPRODUCE', 'Triage complete');

      expect(newSession.currentStage).toBe('REPRODUCE');
      expect(newSession.stageHistory).toHaveLength(2);
      expect(newSession.stageHistory[1].from).toBe('TRIAGE');
      expect(newSession.stageHistory[1].to).toBe('REPRODUCE');
      expect(newSession.stageHistory[1].reason).toBe('Triage complete');
    });

    it('should throw on invalid transition', () => {
      const session = createDiagnosticSession('s1', 'a1', 't1', 'u1', true);

      expect(() => transitionStage(session, 'POSTMORTEM'))
        .toThrow('Invalid transition from TRIAGE to POSTMORTEM');
    });

    it('should allow backward transition', () => {
      let session = createDiagnosticSession('s1', 'a1', 't1', 'u1', true);
      session = transitionStage(session, 'REPRODUCE');
      session = transitionStage(session, 'TRIAGE', 'Need to reclassify');

      expect(session.currentStage).toBe('TRIAGE');
      expect(session.stageHistory).toHaveLength(3);
    });
  });

  describe('addEvidence', () => {
    it('should add triage evidence', () => {
      const session = createDiagnosticSession('s1', 'a1', 't1', 'u1', true);
      const triageEvidence = {
        defectCategory: 'functional',
        severity: 'high',
        priority: 'urgent',
        observations: 'Test failure',
        timestamp: new Date(),
      };

      const updated = addEvidence(session, 'triage', triageEvidence);

      expect(updated.evidence.triage).toEqual(triageEvidence);
      expect(updated.updatedAt.getTime()).toBeGreaterThanOrEqual(session.updatedAt.getTime());
    });

    it('should add multiple evidence types', () => {
      let session = createDiagnosticSession('s1', 'a1', 't1', 'u1', true);

      session = addEvidence(session, 'triage', {
        defectCategory: 'functional',
        severity: 'high',
        priority: 'urgent',
        observations: 'Test failure',
        timestamp: new Date(),
      });

      session = addEvidence(session, 'reproduction', {
        steps: ['Run test'],
        isDeterministic: true,
        timestamp: new Date(),
      });

      expect(session.evidence.triage).toBeDefined();
      expect(session.evidence.reproduction).toBeDefined();
    });
  });

  describe('addGuidanceEntry', () => {
    it('should add guidance with auto-generated id and timestamp', () => {
      const session = createDiagnosticSession('s1', 'a1', 't1', 'u1', true);

      const updated = addGuidanceEntry(session, {
        stage: 'TRIAGE',
        type: 'socratic_question',
        content: 'What type of bug is this?',
      });

      expect(updated.aiGuidance).toHaveLength(1);
      expect(updated.aiGuidance[0].id).toMatch(/^guidance-\d+-[a-z0-9]+$/);
      expect(updated.aiGuidance[0].stage).toBe('TRIAGE');
      expect(updated.aiGuidance[0].type).toBe('socratic_question');
      expect(updated.aiGuidance[0].content).toBe('What type of bug is this?');
      expect(updated.aiGuidance[0].timestamp).toBeInstanceOf(Date);
    });
  });
});
