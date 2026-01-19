/**
 * Tests for Diagnostic Coaching Use Cases
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  startDiagnosticSession,
  getCoachingGuidance,
  submitTriage,
  submitReproduction,
  submitLocalization,
  submitHypothesis,
  updateHypothesis,
  submitFixAttempt,
  submitVerification,
  transitionDiagnosticStage,
} from './diagnostic-coaching.js';
import { createInMemoryDiagnosticSessionRepo } from '../ports/diagnostic-session-repo.js';
import { createNullAICoach } from '../ports/ai-coach.js';
import type { ProblemContext, DiagnosticSession } from '../entities/diagnostic-coach.js';

describe('Diagnostic Coaching Use Cases', () => {
  let sessionRepo: ReturnType<typeof createInMemoryDiagnosticSessionRepo>;
  let aiCoach: ReturnType<typeof createNullAICoach>;
  let idGenerator: { generate: () => string };
  let idCounter: number;

  const problemContext: ProblemContext = {
    problemId: 'p1',
    problemTitle: 'Binary Search Bug',
    problemStatement: 'Fix the binary search implementation',
    visibleTestCases: ['test([1,2,3], 2) === 1'],
  };

  beforeEach(() => {
    sessionRepo = createInMemoryDiagnosticSessionRepo();
    aiCoach = createNullAICoach();
    idCounter = 0;
    idGenerator = { generate: () => `id-${++idCounter}` };
  });

  describe('startDiagnosticSession', () => {
    it('should create a new session in TRIAGE stage', async () => {
      const session = await startDiagnosticSession(
        {
          attemptId: 'a1',
          tenantId: 't1',
          userId: 'u1',
          problemContext,
          aiEnabled: true,
        },
        { sessionRepo, idGenerator }
      );

      expect(session.id).toBe('id-1');
      expect(session.attemptId).toBe('a1');
      expect(session.currentStage).toBe('TRIAGE');
      expect(session.aiEnabled).toBe(true);
    });

    it('should return existing session for same attempt', async () => {
      const session1 = await startDiagnosticSession(
        { attemptId: 'a1', tenantId: 't1', userId: 'u1', problemContext, aiEnabled: true },
        { sessionRepo, idGenerator }
      );

      const session2 = await startDiagnosticSession(
        { attemptId: 'a1', tenantId: 't1', userId: 'u1', problemContext, aiEnabled: false },
        { sessionRepo, idGenerator }
      );

      expect(session2.id).toBe(session1.id);
      expect(session2.aiEnabled).toBe(true); // Original value preserved
    });
  });

  describe('getCoachingGuidance', () => {
    let session: DiagnosticSession;

    beforeEach(async () => {
      session = await startDiagnosticSession(
        { attemptId: 'a1', tenantId: 't1', userId: 'u1', problemContext, aiEnabled: false },
        { sessionRepo, idGenerator }
      );
    });

    it('should return deterministic guidance when AI disabled', async () => {
      const result = await getCoachingGuidance(
        { sessionId: session.id, problemContext },
        { sessionRepo, aiCoach }
      );

      expect(result.success).toBe(true);
      expect(result.guidance).toBeDefined();
      expect(result.guidance?.source).toBe('deterministic');
      expect(result.guidance?.type).toBeDefined();
      expect(result.guidance?.questions.length).toBeGreaterThan(0);
    });

    it('should return error for non-existent session', async () => {
      const result = await getCoachingGuidance(
        { sessionId: 'nonexistent', problemContext },
        { sessionRepo, aiCoach }
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe('Session not found');
    });

    it('should record guidance in session', async () => {
      await getCoachingGuidance(
        { sessionId: session.id, problemContext },
        { sessionRepo, aiCoach }
      );

      const updated = await sessionRepo.getById(session.id);
      expect(updated?.aiGuidance.length).toBe(1);
    });
  });

  describe('submitTriage', () => {
    let session: DiagnosticSession;

    beforeEach(async () => {
      session = await startDiagnosticSession(
        { attemptId: 'a1', tenantId: 't1', userId: 'u1', problemContext, aiEnabled: false },
        { sessionRepo, idGenerator }
      );
    });

    it('should record triage evidence', async () => {
      const result = await submitTriage(
        {
          sessionId: session.id,
          defectCategory: 'functional',
          severity: 'high',
          priority: 'urgent',
          observations: 'Off-by-one error suspected',
        },
        { sessionRepo }
      );

      expect(result.success).toBe(true);
      expect(result.session.evidence.triage).toBeDefined();
      expect(result.session.evidence.triage?.defectCategory).toBe('functional');
      expect(result.session.evidence.triage?.severity).toBe('high');
    });

    it('should reject triage in wrong stage', async () => {
      // Transition to next stage
      await submitTriage(
        {
          sessionId: session.id,
          defectCategory: 'functional',
          severity: 'high',
          priority: 'urgent',
          observations: 'Test',
        },
        { sessionRepo }
      );

      await transitionDiagnosticStage(
        { sessionId: session.id, targetStage: 'REPRODUCE' },
        { sessionRepo }
      );

      // Try to submit triage again
      const result = await submitTriage(
        {
          sessionId: session.id,
          defectCategory: 'concurrency',
          severity: 'low',
          priority: 'low',
          observations: 'Different',
        },
        { sessionRepo }
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('REPRODUCE');
    });
  });

  describe('submitReproduction', () => {
    let session: DiagnosticSession;

    beforeEach(async () => {
      session = await startDiagnosticSession(
        { attemptId: 'a1', tenantId: 't1', userId: 'u1', problemContext, aiEnabled: false },
        { sessionRepo, idGenerator }
      );

      await submitTriage(
        {
          sessionId: session.id,
          defectCategory: 'functional',
          severity: 'high',
          priority: 'urgent',
          observations: 'Test',
        },
        { sessionRepo }
      );

      await transitionDiagnosticStage(
        { sessionId: session.id, targetStage: 'REPRODUCE' },
        { sessionRepo }
      );
    });

    it('should record reproduction evidence', async () => {
      const result = await submitReproduction(
        {
          sessionId: session.id,
          steps: ['Run npm test', 'Observe failure on case 3'],
          isDeterministic: true,
          reproCommand: 'npm test -- --testNamePattern="binary"',
        },
        { sessionRepo }
      );

      expect(result.success).toBe(true);
      expect(result.session.evidence.reproduction).toBeDefined();
      expect(result.session.evidence.reproduction?.steps).toHaveLength(2);
      expect(result.session.evidence.reproduction?.isDeterministic).toBe(true);
    });

    it('should support intermittent bugs', async () => {
      const result = await submitReproduction(
        {
          sessionId: session.id,
          steps: ['Run test multiple times'],
          isDeterministic: false,
          successRate: 0.3,
        },
        { sessionRepo }
      );

      expect(result.success).toBe(true);
      expect(result.session.evidence.reproduction?.isDeterministic).toBe(false);
      expect(result.session.evidence.reproduction?.successRate).toBe(0.3);
    });
  });

  describe('submitLocalization', () => {
    let session: DiagnosticSession;

    beforeEach(async () => {
      session = await startDiagnosticSession(
        { attemptId: 'a1', tenantId: 't1', userId: 'u1', problemContext, aiEnabled: false },
        { sessionRepo, idGenerator }
      );

      // Progress through stages
      await submitTriage(
        {
          sessionId: session.id,
          defectCategory: 'functional',
          severity: 'high',
          priority: 'urgent',
          observations: 'Test',
        },
        { sessionRepo }
      );
      await transitionDiagnosticStage({ sessionId: session.id, targetStage: 'REPRODUCE' }, { sessionRepo });
      await submitReproduction(
        { sessionId: session.id, steps: ['test'], isDeterministic: true },
        { sessionRepo }
      );
      await transitionDiagnosticStage({ sessionId: session.id, targetStage: 'LOCALIZE' }, { sessionRepo });
    });

    it('should record localization evidence', async () => {
      const result = await submitLocalization(
        {
          sessionId: session.id,
          suspectedFiles: ['src/search.ts'],
          suspectedFunctions: ['binarySearch', 'compare'],
          stackTrace: 'Error at search.ts:42',
        },
        { sessionRepo }
      );

      expect(result.success).toBe(true);
      expect(result.session.evidence.localization?.suspectedFiles).toContain('src/search.ts');
      expect(result.session.evidence.localization?.suspectedFunctions).toHaveLength(2);
    });
  });

  describe('submitHypothesis and updateHypothesis', () => {
    let session: DiagnosticSession;

    beforeEach(async () => {
      session = await startDiagnosticSession(
        { attemptId: 'a1', tenantId: 't1', userId: 'u1', problemContext, aiEnabled: false },
        { sessionRepo, idGenerator }
      );

      // Progress to HYPOTHESIZE
      await submitTriage(
        { sessionId: session.id, defectCategory: 'functional', severity: 'high', priority: 'urgent', observations: 'Test' },
        { sessionRepo }
      );
      await transitionDiagnosticStage({ sessionId: session.id, targetStage: 'REPRODUCE' }, { sessionRepo });
      await submitReproduction({ sessionId: session.id, steps: ['test'], isDeterministic: true }, { sessionRepo });
      await transitionDiagnosticStage({ sessionId: session.id, targetStage: 'LOCALIZE' }, { sessionRepo });
      await submitLocalization({ sessionId: session.id, suspectedFiles: ['a.ts'], suspectedFunctions: [] }, { sessionRepo });
      await transitionDiagnosticStage({ sessionId: session.id, targetStage: 'HYPOTHESIZE' }, { sessionRepo });
    });

    it('should add hypothesis with untested status', async () => {
      const result = await submitHypothesis(
        {
          sessionId: session.id,
          hypothesis: 'Off-by-one error in loop boundary',
          testMethod: 'Log loop indices',
        },
        { sessionRepo, idGenerator }
      );

      expect(result.success).toBe(true);
      expect(result.session.evidence.hypotheses).toHaveLength(1);
      expect(result.session.evidence.hypotheses?.[0].status).toBe('untested');
    });

    it('should add multiple hypotheses', async () => {
      await submitHypothesis(
        { sessionId: session.id, hypothesis: 'Hypothesis 1', testMethod: 'Test 1' },
        { sessionRepo, idGenerator }
      );
      const result = await submitHypothesis(
        { sessionId: session.id, hypothesis: 'Hypothesis 2', testMethod: 'Test 2' },
        { sessionRepo, idGenerator }
      );

      expect(result.session.evidence.hypotheses).toHaveLength(2);
    });

    it('should update hypothesis status', async () => {
      const addResult = await submitHypothesis(
        { sessionId: session.id, hypothesis: 'Test hypothesis', testMethod: 'Test' },
        { sessionRepo, idGenerator }
      );

      const hypothesisId = addResult.session.evidence.hypotheses?.[0].id;

      const updateResult = await updateHypothesis(
        {
          sessionId: session.id,
          hypothesisId: hypothesisId!,
          status: 'confirmed',
          evidence: 'Logs showed the issue',
        },
        { sessionRepo }
      );

      expect(updateResult.success).toBe(true);
      expect(updateResult.session.evidence.hypotheses?.[0].status).toBe('confirmed');
      expect(updateResult.session.evidence.hypotheses?.[0].evidence).toBe('Logs showed the issue');
    });
  });

  describe('submitFixAttempt', () => {
    let session: DiagnosticSession;

    beforeEach(async () => {
      session = await startDiagnosticSession(
        { attemptId: 'a1', tenantId: 't1', userId: 'u1', problemContext, aiEnabled: false },
        { sessionRepo, idGenerator }
      );

      // Progress to FIX
      await submitTriage(
        { sessionId: session.id, defectCategory: 'functional', severity: 'high', priority: 'urgent', observations: 'Test' },
        { sessionRepo }
      );
      await transitionDiagnosticStage({ sessionId: session.id, targetStage: 'REPRODUCE' }, { sessionRepo });
      await submitReproduction({ sessionId: session.id, steps: ['test'], isDeterministic: true }, { sessionRepo });
      await transitionDiagnosticStage({ sessionId: session.id, targetStage: 'LOCALIZE' }, { sessionRepo });
      await submitLocalization({ sessionId: session.id, suspectedFiles: ['a.ts'], suspectedFunctions: [] }, { sessionRepo });
      await transitionDiagnosticStage({ sessionId: session.id, targetStage: 'HYPOTHESIZE' }, { sessionRepo });
      await submitHypothesis({ sessionId: session.id, hypothesis: 'Test', testMethod: 'Test' }, { sessionRepo, idGenerator });
      await transitionDiagnosticStage({ sessionId: session.id, targetStage: 'FIX' }, { sessionRepo });
    });

    it('should record fix attempt', async () => {
      const result = await submitFixAttempt(
        {
          sessionId: session.id,
          hypothesisId: 'h1',
          approach: 'Changed loop condition from < to <=',
          filesModified: ['src/search.ts'],
          testsPassed: true,
        },
        { sessionRepo, idGenerator }
      );

      expect(result.success).toBe(true);
      expect(result.session.evidence.fixAttempts).toHaveLength(1);
      expect(result.session.evidence.fixAttempts?.[0].testsPassed).toBe(true);
    });

    it('should track failed fix attempts', async () => {
      await submitFixAttempt(
        {
          sessionId: session.id,
          hypothesisId: 'h1',
          approach: 'Wrong fix',
          filesModified: ['a.ts'],
          testsPassed: false,
          testOutput: 'Test still failing',
        },
        { sessionRepo, idGenerator }
      );

      const result = await submitFixAttempt(
        {
          sessionId: session.id,
          hypothesisId: 'h1',
          approach: 'Correct fix',
          filesModified: ['a.ts'],
          testsPassed: true,
        },
        { sessionRepo, idGenerator }
      );

      expect(result.session.evidence.fixAttempts).toHaveLength(2);
      expect(result.session.evidence.fixAttempts?.[0].testsPassed).toBe(false);
      expect(result.session.evidence.fixAttempts?.[1].testsPassed).toBe(true);
    });
  });

  describe('submitVerification', () => {
    let session: DiagnosticSession;

    beforeEach(async () => {
      session = await startDiagnosticSession(
        { attemptId: 'a1', tenantId: 't1', userId: 'u1', problemContext, aiEnabled: false },
        { sessionRepo, idGenerator }
      );

      // Progress to VERIFY
      await submitTriage({ sessionId: session.id, defectCategory: 'functional', severity: 'high', priority: 'urgent', observations: 'Test' }, { sessionRepo });
      await transitionDiagnosticStage({ sessionId: session.id, targetStage: 'REPRODUCE' }, { sessionRepo });
      await submitReproduction({ sessionId: session.id, steps: ['test'], isDeterministic: true }, { sessionRepo });
      await transitionDiagnosticStage({ sessionId: session.id, targetStage: 'LOCALIZE' }, { sessionRepo });
      await submitLocalization({ sessionId: session.id, suspectedFiles: ['a.ts'], suspectedFunctions: [] }, { sessionRepo });
      await transitionDiagnosticStage({ sessionId: session.id, targetStage: 'HYPOTHESIZE' }, { sessionRepo });
      await submitHypothesis({ sessionId: session.id, hypothesis: 'Test', testMethod: 'Test' }, { sessionRepo, idGenerator });
      await transitionDiagnosticStage({ sessionId: session.id, targetStage: 'FIX' }, { sessionRepo });
      await submitFixAttempt({ sessionId: session.id, hypothesisId: 'h1', approach: 'Fix', filesModified: ['a.ts'], testsPassed: true }, { sessionRepo, idGenerator });
      await transitionDiagnosticStage({ sessionId: session.id, targetStage: 'VERIFY' }, { sessionRepo });
    });

    it('should record verification evidence', async () => {
      const result = await submitVerification(
        {
          sessionId: session.id,
          visibleTestsPassed: true,
          hiddenTestsPassed: true,
          edgeCasesChecked: ['empty array', 'single element', 'duplicate values'],
          regressionTestsPassed: true,
        },
        { sessionRepo }
      );

      expect(result.success).toBe(true);
      expect(result.session.evidence.verification?.visibleTestsPassed).toBe(true);
      expect(result.session.evidence.verification?.edgeCasesChecked).toHaveLength(3);
    });
  });

  describe('transitionDiagnosticStage', () => {
    let session: DiagnosticSession;

    beforeEach(async () => {
      session = await startDiagnosticSession(
        { attemptId: 'a1', tenantId: 't1', userId: 'u1', problemContext, aiEnabled: false },
        { sessionRepo, idGenerator }
      );
    });

    it('should allow valid forward transition', async () => {
      const result = await transitionDiagnosticStage(
        { sessionId: session.id, targetStage: 'REPRODUCE', reason: 'Triage complete' },
        { sessionRepo }
      );

      expect(result.success).toBe(true);
      expect(result.session.currentStage).toBe('REPRODUCE');
    });

    it('should reject invalid transition', async () => {
      const result = await transitionDiagnosticStage(
        { sessionId: session.id, targetStage: 'POSTMORTEM' },
        { sessionRepo }
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('Cannot transition');
    });

    it('should allow backward transition for re-evaluation', async () => {
      // Go forward
      await transitionDiagnosticStage(
        { sessionId: session.id, targetStage: 'REPRODUCE' },
        { sessionRepo }
      );

      // Go back
      const result = await transitionDiagnosticStage(
        { sessionId: session.id, targetStage: 'TRIAGE', reason: 'Need to reclassify' },
        { sessionRepo }
      );

      expect(result.success).toBe(true);
      expect(result.session.currentStage).toBe('TRIAGE');
      expect(result.session.stageHistory).toHaveLength(3);
    });
  });
});
